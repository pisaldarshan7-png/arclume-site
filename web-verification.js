"use strict";

/* =========================================================
   ARCLUME — WEB VERIFICATION FRONTEND
========================================================= */

/* =========================================================
   ELEMENTS
========================================================= */

const loadingState = document.getElementById("loadingState");

const verificationState = document.getElementById("verificationState");

const resultState = document.getElementById("resultState");

const disabledState = document.getElementById("disabledState");

const disabledMessage = document.getElementById("disabledMessage");

const serverIcon = document.getElementById("serverIcon");

const serverName = document.getElementById("serverName");

const memberCount = document.getElementById("memberCount");

const pageTitle = document.getElementById("pageTitle");

const pageMessage = document.getElementById("pageMessage");

const discordLoginButton = document.getElementById("discordLoginButton");

const resultSymbol = document.getElementById("resultSymbol");

const resultTitle = document.getElementById("resultTitle");

const resultMessage = document.getElementById("resultMessage");

const retryButton = document.getElementById("retryButton");

/* =========================================================
   QUERY PARAMS
========================================================= */

const params = new URLSearchParams(window.location.search);

const guildID = String(params.get("guild") || "").trim();

const verificationStatus = String(params.get("status") || "").trim();

/* =========================================================
   STATE
========================================================= */

let currentConfig = null;

/* =========================================================
   HELPERS
========================================================= */

function hideAllStates() {
  loadingState?.classList.add("hidden");

  verificationState?.classList.add("hidden");

  resultState?.classList.add("hidden");

  disabledState?.classList.add("hidden");
}

function showLoading() {
  hideAllStates();

  loadingState?.classList.remove("hidden");
}

function showVerification() {
  hideAllStates();

  verificationState?.classList.remove("hidden");
}

function showDisabled(message) {
  hideAllStates();

  disabledState?.classList.remove("hidden");

  if (disabledMessage) {
    disabledMessage.textContent =
      message || "Web Verification is not currently available for this server.";
  }
}

function serverIconURL(guild) {
  if (!guild?.id || !guild?.icon) {
    return "";
  }

  return (
    `https://cdn.discordapp.com/icons/` +
    `${guild.id}/${guild.icon}.png?size=128`
  );
}

function updateServerIdentity(guild) {
  if (!guild) {
    return;
  }

  if (serverName) {
    serverName.textContent = guild.name || "Discord Server";
  }

  if (memberCount) {
    const count = Number(guild.memberCount || 0);

    memberCount.textContent =
      count > 0 ? `${count.toLocaleString()} MEMBERS` : "SERVER CONNECTED";
  }

  if (!serverIcon) {
    return;
  }

  serverIcon.innerHTML = "";

  const icon = serverIconURL(guild);

  if (icon) {
    const image = document.createElement("img");

    image.src = icon;

    image.alt = guild.name || "Discord Server";

    image.addEventListener("error", () => {
      serverIcon.innerHTML = "";

      serverIcon.textContent = String(guild.name || "A")
        .charAt(0)
        .toUpperCase();
    });

    serverIcon.appendChild(image);

    return;
  }

  serverIcon.textContent = String(guild.name || "A")
    .charAt(0)
    .toUpperCase();
}

/* =========================================================
   RESULT CONFIG
========================================================= */

function getResultConfig(status) {
  const successMessage =
    currentConfig?.successMessage ||
    "Verification complete. You can return to Discord.";

  const results = {
    success: {
      type: "success",

      symbol: "✓",

      title: "Verification complete.",

      message: successMessage,

      retry: false,
    },

    already_verified: {
      type: "success",

      symbol: "✓",

      title: "Already verified.",

      message:
        "Your Discord account already has the Verified role for this server.",

      retry: false,
    },

    not_member: {
      type: "error",

      symbol: "×",

      title: "Server membership required.",

      message:
        "The Discord account you signed in with is not a member of this server. Join the server first, then try again.",

      retry: true,
    },

    disabled: {
      type: "warning",

      symbol: "!",

      title: "Verification disabled.",

      message: "Web Verification is currently disabled for this server.",

      retry: false,
    },

    not_configured: {
      type: "warning",

      symbol: "!",

      title: "Verification not configured.",

      message:
        "The server owner has not finished setting up Web Verification yet.",

      retry: false,
    },

    bot_missing: {
      type: "error",

      symbol: "×",

      title: "Arclume is unavailable.",

      message: "Arclume is not currently connected to this Discord server.",

      retry: false,
    },

    role_error: {
      type: "error",

      symbol: "×",

      title: "Role could not be assigned.",

      message:
        "Arclume could not assign the Verified role. The server owner may need to move the Arclume bot role higher in Discord.",

      retry: true,
    },

    expired: {
      type: "warning",

      symbol: "!",

      title: "Verification expired.",

      message:
        "Your verification session expired before it was completed. Start again to continue.",

      retry: true,
    },

    invalid_request: {
      type: "error",

      symbol: "×",

      title: "Invalid verification request.",

      message:
        "The verification session could not be validated. Please start again.",

      retry: true,
    },

    oauth_error: {
      type: "error",

      symbol: "×",

      title: "Discord login failed.",

      message:
        "Arclume could not complete Discord authentication. Please try again.",

      retry: true,
    },

    cooldown: {
      type: "warning",

      symbol: "!",

      title: "Please wait a moment.",

      message:
        "A verification attempt was just processed for this account. Wait a few seconds before trying again.",

      retry: true,
    },

    invalid_server: {
      type: "error",

      symbol: "×",

      title: "Invalid server.",

      message:
        "This verification link does not contain a valid Discord server.",

      retry: false,
    },

    server_error: {
      type: "error",

      symbol: "×",

      title: "Verification unavailable.",

      message:
        "Arclume encountered a server error while processing verification. Please try again shortly.",

      retry: true,
    },
  };

  return (
    results[status] || {
      type: "error",

      symbol: "×",

      title: "Verification failed.",

      message: "Arclume could not complete verification. Please try again.",

      retry: true,
    }
  );
}

/* =========================================================
   SHOW RESULT
========================================================= */

function showResult(status) {
  hideAllStates();

  resultState?.classList.remove("hidden");

  const config = getResultConfig(status);

  if (resultSymbol) {
    resultSymbol.className = `result-symbol ${config.type}`;

    resultSymbol.textContent = config.symbol;
  }

  if (resultTitle) {
    resultTitle.textContent = config.title;
  }

  if (resultMessage) {
    resultMessage.textContent = config.message;
  }

  if (retryButton) {
    if (config.retry && guildID) {
      retryButton.classList.remove("hidden");

      retryButton.href = `/web-verification/start/${encodeURIComponent(guildID)}`;
    } else {
      retryButton.classList.add("hidden");

      retryButton.href = "#";
    }
  }
}

/* =========================================================
   LOAD PUBLIC CONFIG
========================================================= */

async function loadVerificationConfig() {
  if (!guildID) {
    showResult("invalid_server");

    return false;
  }

  try {
    const response = await fetch(
      `/api/web-verification/${encodeURIComponent(guildID)}`,
      {
        credentials: "same-origin",

        cache: "no-store",
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Web Verification config error:", data);

      if (response.status === 404) {
        showResult("bot_missing");

        return false;
      }

      showResult("server_error");

      return false;
    }

    currentConfig = data;

    updateServerIdentity(data.guild);

    if (pageTitle) {
      pageTitle.textContent = data.pageTitle || "Verify your Discord account";
    }

    if (pageMessage) {
      pageMessage.textContent =
        data.pageMessage ||
        "Sign in with Discord to verify your membership and unlock access to the server.";
    }

    if (discordLoginButton) {
      discordLoginButton.href =
        data.loginURL ||
        `/web-verification/start/${encodeURIComponent(guildID)}`;
    }

    if (!data.enabled && !verificationStatus) {
      showDisabled("Web Verification is currently disabled for this server.");

      return true;
    }

    return true;
  } catch (error) {
    console.error("Web Verification startup error:", error);

    showResult("server_error");

    return false;
  }
}

/* =========================================================
   LOGIN BUTTON
========================================================= */

function setupLoginButton() {
  if (!discordLoginButton) {
    return;
  }

  discordLoginButton.addEventListener("click", (event) => {
    const href = discordLoginButton.getAttribute("href");

    if (!href || href === "#") {
      event.preventDefault();

      return;
    }

    discordLoginButton.style.pointerEvents = "none";

    discordLoginButton.style.opacity = "0.75";

    const label = discordLoginButton.querySelector("span");

    if (label) {
      label.textContent = "Opening Discord...";
    }
  });
}

/* =========================================================
   START
========================================================= */

async function startWebVerification() {
  showLoading();

  setupLoginButton();

  const configLoaded = await loadVerificationConfig();

  if (!configLoaded) {
    return;
  }

  /*
    Discord redirected back with a result.
  */

  if (verificationStatus) {
    showResult(verificationStatus);

    return;
  }

  /*
    Normal verification page.
  */

  if (currentConfig?.enabled) {
    showVerification();

    return;
  }

  showDisabled("Web Verification is currently disabled for this server.");
}

startWebVerification();
