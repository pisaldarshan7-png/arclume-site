"use strict";

/* =========================================================
   ARCLUME CLOUD
   BOT RUNNER
========================================================= */

const { spawn } = require("child_process");

const path = require("path");

const fs = require("fs");

const EventEmitter = require("events");

/* =========================================================
   CONFIGURATION
========================================================= */

/*
  Arclume-Cloud currently sits inside Arclume-Bot.

  Arclume-Bot/
    bot.js
    Arclume-Cloud/
      bot-runner.js

  So ".." = Arclume-Bot.
*/

const BOT_DIRECTORY = process.env.ARCLUME_BOT_DIRECTORY
  ? path.resolve(process.env.ARCLUME_BOT_DIRECTORY)
  : path.resolve(__dirname, "..");

const BOT_ENTRY = process.env.ARCLUME_BOT_ENTRY || "bot.js";

const BOT_FILE = path.join(BOT_DIRECTORY, BOT_ENTRY);

const NODE_BINARY = process.execPath;

const MAX_LOGS = 1000;

const AUTO_RESTART = process.env.ARCLUME_AUTO_RESTART !== "false";

const AUTO_START = process.env.ARCLUME_AUTO_START !== "false";

const RESTART_DELAY = Math.max(
  1000,
  Number(process.env.ARCLUME_RESTART_DELAY || 5000),
);

/* =========================================================
   RUNNER
========================================================= */

class ArclumeBotRunner extends EventEmitter {
  constructor() {
    super();

    this.process = null;

    this.state = "offline";

    this.startedAt = null;

    this.stoppedByUser = false;

    this.restartTimer = null;

    this.restartCount = 0;

    this.logs = [];

    this.lastExit = {
      code: null,

      signal: null,

      at: null,
    };

    this.addLog("system", "Arclume Bot Runner initialized.");

    this.addLog("system", `Bot directory: ${BOT_DIRECTORY}`);

    this.addLog("system", `Bot entry: ${BOT_ENTRY}`);
  }

  /* =======================================================
     LOGGING
  ======================================================= */

  addLog(type, message) {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,

      timestamp: new Date().toISOString(),

      type,

      message: String(message ?? ""),
    };

    this.logs.push(entry);

    if (this.logs.length > MAX_LOGS) {
      this.logs.splice(0, this.logs.length - MAX_LOGS);
    }

    this.emit("log", entry);

    const prefix = type === "stderr" ? "🔴" : type === "system" ? "☁️" : "🤖";

    console.log(`${prefix} [BOT] ${entry.message}`);

    return entry;
  }

  addProcessOutput(type, chunk) {
    const text = String(chunk ?? "");

    const lines = text.replace(/\r/g, "").split("\n");

    for (const line of lines) {
      const clean = line.trimEnd();

      if (!clean) {
        continue;
      }

      this.addLog(type, clean);
    }
  }

  getLogs(limit = 250) {
    const safeLimit = Math.min(1000, Math.max(1, Number(limit || 250)));

    return this.logs.slice(-safeLimit);
  }

  clearLogs() {
    this.logs = [];

    this.addLog("system", "Console cleared.");

    return true;
  }

  /* =======================================================
     VALIDATION
  ======================================================= */

  validateBot() {
    if (!fs.existsSync(BOT_DIRECTORY)) {
      throw new Error(`Bot directory does not exist: ${BOT_DIRECTORY}`);
    }

    if (!fs.existsSync(BOT_FILE)) {
      throw new Error(`Bot entry file does not exist: ${BOT_FILE}`);
    }

    return true;
  }

  /* =======================================================
     START
  ======================================================= */

  async start(options = {}) {
    const manual = options.manual === true;

    if (this.process && !this.process.killed) {
      return {
        success: false,

        message: "Arclume is already running.",

        status: this.getStatus(),
      };
    }

    if (this.restartTimer) {
      clearTimeout(this.restartTimer);

      this.restartTimer = null;
    }

    try {
      this.validateBot();
    } catch (error) {
      this.state = "error";

      this.addLog("stderr", error.message);

      return {
        success: false,

        message: error.message,

        status: this.getStatus(),
      };
    }

    this.stoppedByUser = false;

    this.state = "starting";

    this.addLog(
      "system",
      manual ? "Manual bot start requested." : "Automatic bot start requested.",
    );

    try {
      const child = spawn(
        NODE_BINARY,

        [BOT_FILE],

        {
          cwd: BOT_DIRECTORY,

          env: {
            ...process.env,

            ARCLUME_CLOUD_RUNNER: "1",
          },

          stdio: ["ignore", "pipe", "pipe"],

          windowsHide: true,
        },
      );

      this.process = child;

      this.startedAt = Date.now();

      this.state = "online";

      this.addLog("system", `Arclume started with PID ${child.pid}.`);

      if (child.stdout) {
        child.stdout.on("data", (chunk) => {
          this.addProcessOutput("stdout", chunk);
        });
      }

      if (child.stderr) {
        child.stderr.on("data", (chunk) => {
          this.addProcessOutput("stderr", chunk);
        });
      }

      child.on("error", (error) => {
        this.state = "error";

        this.addLog("stderr", `Bot process error: ${error.message}`);
      });

      child.on("exit", (code, signal) => {
        const wasStopped = this.stoppedByUser;

        this.process = null;

        this.startedAt = null;

        this.lastExit = {
          code: code ?? null,

          signal: signal ?? null,

          at: new Date().toISOString(),
        };

        if (wasStopped) {
          this.state = "offline";

          this.addLog(
            "system",
            `Arclume stopped${code !== null ? ` with code ${code}` : ""}.`,
          );

          return;
        }

        this.state = "crashed";

        this.addLog(
          "stderr",
          `Arclume exited unexpectedly. Code: ${code ?? "none"}, signal: ${
            signal ?? "none"
          }.`,
        );

        if (AUTO_RESTART) {
          this.scheduleRestart();
        }
      });

      return {
        success: true,

        message: "Arclume started.",

        status: this.getStatus(),
      };
    } catch (error) {
      this.process = null;

      this.startedAt = null;

      this.state = "error";

      this.addLog("stderr", `Failed to start Arclume: ${error.message}`);

      return {
        success: false,

        message: error.message,

        status: this.getStatus(),
      };
    }
  }

  /* =======================================================
     AUTO RESTART
  ======================================================= */

  scheduleRestart() {
    if (this.stoppedByUser) {
      return;
    }

    if (this.restartTimer) {
      return;
    }

    this.state = "restarting";

    this.addLog(
      "system",
      `Automatic restart scheduled in ${RESTART_DELAY / 1000} seconds.`,
    );

    this.restartTimer = setTimeout(
      async () => {
        this.restartTimer = null;

        this.restartCount += 1;

        this.addLog("system", `Automatic restart #${this.restartCount}.`);

        await this.start({
          manual: false,
        });
      },

      RESTART_DELAY,
    );

    this.restartTimer.unref?.();
  }

  /* =======================================================
     STOP
  ======================================================= */

  async stop() {
    this.stoppedByUser = true;

    if (this.restartTimer) {
      clearTimeout(this.restartTimer);

      this.restartTimer = null;
    }

    if (!this.process) {
      this.state = "offline";

      return {
        success: true,

        message: "Arclume is already stopped.",

        status: this.getStatus(),
      };
    }

    const child = this.process;

    this.state = "stopping";

    this.addLog("system", "Stopping Arclume...");

    return new Promise((resolve) => {
      let finished = false;

      const finish = (success, message) => {
        if (finished) {
          return;
        }

        finished = true;

        resolve({
          success,

          message,

          status: this.getStatus(),
        });
      };

      const forceTimer = setTimeout(
        () => {
          if (!this.process) {
            finish(true, "Arclume stopped.");

            return;
          }

          this.addLog(
            "system",
            "Arclume did not stop normally. Forcing shutdown...",
          );

          try {
            if (process.platform === "win32") {
              const killer = spawn(
                "taskkill",

                ["/pid", String(child.pid), "/T", "/F"],

                {
                  windowsHide: true,

                  stdio: "ignore",
                },
              );

              killer.on("exit", () => {
                finish(true, "Arclume force-stopped.");
              });
            } else {
              child.kill("SIGKILL");

              finish(true, "Arclume force-stopped.");
            }
          } catch (error) {
            finish(false, error.message);
          }
        },

        10000,
      );

      child.once("exit", () => {
        clearTimeout(forceTimer);

        finish(true, "Arclume stopped.");
      });

      try {
        child.kill("SIGTERM");
      } catch (error) {
        clearTimeout(forceTimer);

        finish(false, error.message);
      }
    });
  }

  /* =======================================================
     RESTART
  ======================================================= */

  async restart() {
    this.addLog("system", "Manual restart requested.");

    await this.stop();

    await new Promise((resolve) => setTimeout(resolve, 1500));

    return this.start({
      manual: true,
    });
  }

  /* =======================================================
     STATUS
  ======================================================= */

  getStatus() {
    let uptimeSeconds = 0;

    if (this.startedAt && this.process) {
      uptimeSeconds = Math.max(
        0,

        Math.floor((Date.now() - this.startedAt) / 1000),
      );
    }

    return {
      state: this.state,

      running: Boolean(this.process),

      pid: this.process?.pid ?? null,

      startedAt: this.startedAt ? new Date(this.startedAt).toISOString() : null,

      uptimeSeconds,

      restartCount: this.restartCount,

      autoStart: AUTO_START,

      autoRestart: AUTO_RESTART,

      botDirectory: BOT_DIRECTORY,

      botEntry: BOT_ENTRY,

      lastExit: this.lastExit,
    };
  }

  /* =======================================================
     CLOUD STARTUP
  ======================================================= */

  async initialize() {
    if (!AUTO_START) {
      this.addLog("system", "Automatic bot startup is disabled.");

      return;
    }

    this.addLog("system", "Arclume Cloud startup detected.");

    this.addLog("system", "Automatically starting Arclume...");

    await this.start({
      manual: false,
    });
  }

  /* =======================================================
     CLOUD SHUTDOWN
  ======================================================= */

  async shutdown() {
    this.addLog("system", "Cloud shutdown requested.");

    if (this.process) {
      await this.stop();
    }
  }
}

/* =========================================================
   EXPORT SINGLE RUNNER
========================================================= */

const botRunner = new ArclumeBotRunner();

module.exports = botRunner;
