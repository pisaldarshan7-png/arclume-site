"use strict";

/* =========================================================
   ARCLUME CLOUD
   CLOUD SERVER
========================================================= */

require("dotenv").config();

const express = require("express");

const path = require("path");

const os = require("os");

const fs = require("fs");

const botRunner = require("./bot-runner");

/* =========================================================
   SETTINGS
========================================================= */

const app = express();

/*
  Keep it local-only while we are building.

  When we move to the VPS we'll add authentication + HTTPS
  before exposing these controls publicly.
*/

const HOST = process.env.HOST || "127.0.0.1";

const PORT = Number(process.env.PORT || 4000);

const PUBLIC_DIRECTORY = path.join(__dirname, "public");

const STARTED_AT = Date.now();

/* =========================================================
   EXPRESS
========================================================= */

app.disable("x-powered-by");

app.use(
  express.json({
    limit: "2mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,

    limit: "2mb",
  }),
);

/* =========================================================
   STATIC WEBSITE
========================================================= */

if (!fs.existsSync(PUBLIC_DIRECTORY)) {
  fs.mkdirSync(
    PUBLIC_DIRECTORY,

    {
      recursive: true,
    },
  );
}

app.use(express.static(PUBLIC_DIRECTORY));

/* =========================================================
   HELPERS
========================================================= */

function formatBytes(bytes) {
  const number = Number(bytes || 0);

  if (number === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];

  const index = Math.min(
    units.length - 1,

    Math.floor(Math.log(number) / Math.log(1024)),
  );

  return `${(number / Math.pow(1024, index)).toFixed(
    index === 0 ? 0 : 2,
  )} ${units[index]}`;
}

function formatUptime(seconds) {
  const total = Math.max(
    0,

    Math.floor(Number(seconds || 0)),
  );

  const days = Math.floor(total / 86400);

  const hours = Math.floor((total % 86400) / 3600);

  const minutes = Math.floor((total % 3600) / 60);

  const secs = total % 60;

  const parts = [];

  if (days) {
    parts.push(`${days}d`);
  }

  if (hours || days) {
    parts.push(`${hours}h`);
  }

  if (minutes || hours || days) {
    parts.push(`${minutes}m`);
  }

  parts.push(`${secs}s`);

  return parts.join(" ");
}

function getMemory() {
  const total = os.totalmem();

  const free = os.freemem();

  const used = total - free;

  return {
    total,

    free,

    used,

    totalText: formatBytes(total),

    freeText: formatBytes(free),

    usedText: formatBytes(used),

    percent: total > 0 ? Number(((used / total) * 100).toFixed(1)) : 0,
  };
}

function getCPU() {
  const cpus = os.cpus() || [];

  return {
    model: cpus[0]?.model || "Unknown CPU",

    cores: cpus.length,

    speedMHz: cpus[0]?.speed || 0,

    loadAverage: os.loadavg(),
  };
}

/* =========================================================
   CLOUD HEALTH
========================================================= */

app.get(
  "/api/health",

  (req, res) => {
    const uptimeSeconds = Math.floor((Date.now() - STARTED_AT) / 1000);

    res.json({
      success: true,

      service: "Arclume Cloud",

      status: "online",

      version: "1.1.0",

      startedAt: new Date(STARTED_AT).toISOString(),

      uptimeSeconds,

      uptime: formatUptime(uptimeSeconds),
    });
  },
);

/* =========================================================
   SYSTEM
========================================================= */

app.get(
  "/api/system",

  (req, res) => {
    const processMemory = process.memoryUsage();

    res.json({
      success: true,

      cloud: {
        name: "Arclume Cloud",

        version: "1.1.0",

        status: "online",
      },

      machine: {
        hostname: os.hostname(),

        platform: os.platform(),

        architecture: os.arch(),

        release: os.release(),
      },

      cpu: getCPU(),

      memory: getMemory(),

      process: {
        pid: process.pid,

        node: process.version,

        uptimeSeconds: Math.floor(process.uptime()),

        uptime: formatUptime(process.uptime()),

        memory: {
          rss: processMemory.rss,

          rssText: formatBytes(processMemory.rss),

          heapUsed: processMemory.heapUsed,

          heapUsedText: formatBytes(processMemory.heapUsed),

          heapTotal: processMemory.heapTotal,

          heapTotalText: formatBytes(processMemory.heapTotal),
        },
      },

      time: {
        now: new Date().toISOString(),

        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });
  },
);

/* =========================================================
   BOT STATUS
========================================================= */

app.get(
  "/api/bot/status",

  (req, res) => {
    const status = botRunner.getStatus();

    res.json({
      success: true,

      bot: {
        ...status,

        uptime: formatUptime(status.uptimeSeconds),
      },
    });
  },
);

/* =========================================================
   BOT START
========================================================= */

app.post(
  "/api/bot/start",

  async (req, res) => {
    try {
      const result = await botRunner.start({
        manual: true,
      });

      res.status(result.success ? 200 : 409).json(result);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,

        message: "Failed to start Arclume.",
      });
    }
  },
);

/* =========================================================
   BOT STOP
========================================================= */

app.post(
  "/api/bot/stop",

  async (req, res) => {
    try {
      const result = await botRunner.stop();

      res.json(result);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,

        message: "Failed to stop Arclume.",
      });
    }
  },
);

/* =========================================================
   BOT RESTART
========================================================= */

app.post(
  "/api/bot/restart",

  async (req, res) => {
    try {
      const result = await botRunner.restart();

      res.json(result);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,

        message: "Failed to restart Arclume.",
      });
    }
  },
);

/* =========================================================
   BOT LOGS
========================================================= */

app.get(
  "/api/bot/logs",

  (req, res) => {
    const limit = Number(req.query.limit || 250);

    res.json({
      success: true,

      logs: botRunner.getLogs(limit),
    });
  },
);

/* =========================================================
   CLEAR BOT LOGS
========================================================= */

app.post(
  "/api/bot/logs/clear",

  (req, res) => {
    botRunner.clearLogs();

    res.json({
      success: true,

      message: "Bot console cleared.",
    });
  },
);

/* =========================================================
   FRONTEND FALLBACK
========================================================= */

app.get(
  "/",

  (req, res) => {
    const indexFile = path.join(PUBLIC_DIRECTORY, "index.html");

    if (fs.existsSync(indexFile)) {
      return res.sendFile(indexFile);
    }

    return res.send("Arclume Cloud");
  },
);

/* =========================================================
   API 404
========================================================= */

app.use(
  "/api",

  (req, res) => {
    res.status(404).json({
      success: false,

      message: "Arclume Cloud API route not found.",
    });
  },
);

/* =========================================================
   ERRORS
========================================================= */

app.use((error, req, res, next) => {
  console.error("❌ Arclume Cloud error:", error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    success: false,

    message: "Internal Arclume Cloud error.",
  });
});

/* =========================================================
   START CLOUD
========================================================= */

const server = app.listen(
  PORT,
  HOST,

  async () => {
    console.log("");
    console.log("╔══════════════════════════════════════╗");

    console.log("║          ☁️  ARCLUME CLOUD          ║");

    console.log("╚══════════════════════════════════════╝");

    console.log("");

    console.log("✅ Arclume Cloud backend online");

    console.log(`🌐 http://localhost:${PORT}`);

    console.log(`🤖 Bot status: http://localhost:${PORT}/api/bot/status`);

    console.log("");

    /*
        Automatically start Arclume whenever
        Arclume Cloud starts.
      */

    await botRunner.initialize();
  },
);

/* =========================================================
   SAFE SHUTDOWN
========================================================= */

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(`\n🛑 ${signal} received`);

  console.log("☁️ Stopping Arclume Cloud...");

  try {
    await botRunner.shutdown();
  } catch (error) {
    console.error("Bot shutdown error:", error);
  }

  server.close(() => {
    console.log("✅ Arclume Cloud stopped safely.");

    process.exit(0);
  });

  setTimeout(
    () => {
      process.exit(1);
    },

    15000,
  ).unref();
}

process.on(
  "SIGINT",

  () => shutdown("SIGINT"),
);

process.on(
  "SIGTERM",

  () => shutdown("SIGTERM"),
);
