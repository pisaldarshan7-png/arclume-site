/* =====================================================
   ARCLUME — SYSTEM STATUS
===================================================== */

/* =====================================================
   ELEMENTS
===================================================== */

const connectionText = document.getElementById("connectionText");

const botStatus = document.getElementById("botStatus");

const botPing = document.getElementById("botPing");

const apiStatus = document.getElementById("apiStatus");

const databaseStatus = document.getElementById("databaseStatus");

const discordStatus = document.getElementById("discordStatus");

const uptime = document.getElementById("uptime");

const botIndicator = document.getElementById("botIndicator");

const pingIndicator = document.getElementById("pingIndicator");

const apiIndicator = document.getElementById("apiIndicator");

const databaseIndicator = document.getElementById("databaseIndicator");

const discordIndicator = document.getElementById("discordIndicator");

const overallStatus = document.getElementById("overallStatus");

const statusDescription = document.getElementById("statusDescription");

const refreshStatus = document.getElementById("refreshStatus");

/* =====================================================
   INDICATOR HELPERS
===================================================== */

function setIndicator(element, state = "green") {
  if (!element) {
    return;
  }

  element.classList.remove("yellow", "red");

  if (state === "yellow") {
    element.classList.add("yellow");
  }

  if (state === "red") {
    element.classList.add("red");
  }
}

/* =====================================================
   UPTIME FORMAT
===================================================== */

function formatUptime(seconds) {
  const totalSeconds = Math.max(0, Number(seconds) || 0);

  const days = Math.floor(totalSeconds / 86400);

  const hours = Math.floor((totalSeconds % 86400) / 3600);

  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const secs = Math.floor(totalSeconds % 60);

  const hourText = String(hours).padStart(2, "0");

  const minuteText = String(minutes).padStart(2, "0");

  const secondText = String(secs).padStart(2, "0");

  if (days > 0) {
    return `${days}d ` + `${hourText}:` + `${minuteText}:` + `${secondText}`;
  }

  return `${hourText}:` + `${minuteText}:` + `${secondText}`;
}

/* =====================================================
   PING STATUS
===================================================== */

function getPingState(ping) {
  if (ping < 0) {
    return "red";
  }

  if (ping <= 120) {
    return "green";
  }

  if (ping <= 250) {
    return "yellow";
  }

  return "red";
}

/* =====================================================
   APPLY STATUS
===================================================== */

function applyStatus(data) {
  const botOnline = Boolean(data.botOnline);

  const discordConnected = Boolean(data.discordConnected);

  const databaseConnected = Boolean(data.databaseConnected);

  const apiOnline = data.apiOnline !== false;

  const ping = Number(data.ping);

  /* BOT */

  if (botStatus) {
    botStatus.textContent = botOnline ? "Online" : "Offline";
  }

  setIndicator(botIndicator, botOnline ? "green" : "red");

  /* PING */

  if (botPing) {
    botPing.textContent =
      Number.isFinite(ping) && ping >= 0 ? `${Math.round(ping)} ms` : "-- ms";
  }

  setIndicator(
    pingIndicator,
    Number.isFinite(ping) ? getPingState(ping) : "red",
  );

  /* API */

  if (apiStatus) {
    apiStatus.textContent = apiOnline ? "Operational" : "Offline";
  }

  setIndicator(apiIndicator, apiOnline ? "green" : "red");

  /* DATABASE */

  if (databaseStatus) {
    databaseStatus.textContent = databaseConnected ? "Connected" : "Offline";
  }

  setIndicator(databaseIndicator, databaseConnected ? "green" : "red");

  /* DISCORD */

  if (discordStatus) {
    discordStatus.textContent = discordConnected ? "Connected" : "Disconnected";
  }

  setIndicator(discordIndicator, discordConnected ? "green" : "red");

  /* UPTIME */

  if (uptime) {
    uptime.textContent = formatUptime(data.uptime);
  }

  /* HEADER */

  if (connectionText) {
    connectionText.textContent = botOnline
      ? "SYSTEM ONLINE"
      : "SYSTEM DEGRADED";
  }

  /* OVERALL */

  const everythingOnline =
    botOnline && discordConnected && databaseConnected && apiOnline;

  if (overallStatus) {
    overallStatus.textContent = everythingOnline
      ? "ALL SYSTEMS OPERATIONAL"
      : "SYSTEM DEGRADED";
  }

  if (statusDescription) {
    statusDescription.textContent = everythingOnline
      ? "Arclume is online and all connected services are responding normally."
      : "One or more Arclume services are currently unavailable or degraded.";
  }
}

/* =====================================================
   ERROR STATE
===================================================== */

function applyErrorState() {
  if (connectionText) {
    connectionText.textContent = "CONNECTION ERROR";
  }

  if (botStatus) {
    botStatus.textContent = "Unknown";
  }

  if (botPing) {
    botPing.textContent = "-- ms";
  }

  if (apiStatus) {
    apiStatus.textContent = "Unavailable";
  }

  if (databaseStatus) {
    databaseStatus.textContent = "Unknown";
  }

  if (discordStatus) {
    discordStatus.textContent = "Unknown";
  }

  if (uptime) {
    uptime.textContent = "--:--:--";
  }

  setIndicator(botIndicator, "red");

  setIndicator(pingIndicator, "red");

  setIndicator(apiIndicator, "red");

  setIndicator(databaseIndicator, "red");

  setIndicator(discordIndicator, "red");

  if (overallStatus) {
    overallStatus.textContent = "STATUS UNAVAILABLE";
  }

  if (statusDescription) {
    statusDescription.textContent =
      "Arclume could not retrieve the current system status.";
  }
}

/* =====================================================
   LOAD STATUS
===================================================== */

async function loadSystemStatus() {
  if (refreshStatus) {
    refreshStatus.disabled = true;

    refreshStatus.textContent = "CHECKING...";
  }

  try {
    const response = await fetch("/api/system-status", {
      credentials: "same-origin",

      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Status request failed.");
    }

    applyStatus(data);
  } catch (error) {
    console.error("Arclume status error:", error);

    applyErrorState();
  } finally {
    if (refreshStatus) {
      refreshStatus.disabled = false;

      refreshStatus.textContent = "REFRESH STATUS";
    }
  }
}

/* =====================================================
   EVENTS
===================================================== */

refreshStatus?.addEventListener("click", loadSystemStatus);

/* =====================================================
   START
===================================================== */

loadSystemStatus();

setInterval(loadSystemStatus, 30000);
