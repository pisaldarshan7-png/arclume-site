"use strict";

/* =========================================================
   ARCLUME — WEB VERIFICATION SETTINGS
========================================================= */

/* =========================================================
   ELEMENTS
========================================================= */

const loadingCover = document.getElementById("loadingCover");

const activeServerName = document.getElementById("activeServerName");

const verificationEnabled = document.getElementById("verificationEnabled");

const verifiedRole = document.getElementById("verifiedRole");

const unverifiedRole = document.getElementById("unverifiedRole");

const logChannel = document.getElementById("logChannel");

const pageTitle = document.getElementById("pageTitle");

const pageMessage = document.getElementById("pageMessage");

const successMessage = document.getElementById("successMessage");

const verificationURL = document.getElementById("verificationURL");

const copyURL = document.getElementById("copyURL");

const openURL = document.getElementById("openURL");

const saveVerification = document.getElementById("saveVerification");

const saveStatus = document.getElementById("saveStatus");

const botStatus = document.getElementById("botStatus");

const verificationStatus = document.getElementById("verificationStatus");

const verifiedRoleStatus = document.getElementById("verifiedRoleStatus");

const logStatus = document.getElementById("logStatus");

const previewTitle = document.getElementById("previewTitle");

const previewMessage = document.getElementById("previewMessage");

const toast = document.getElementById("toast");

/* =========================================================
   STATE
========================================================= */

let currentGuildID = "";

let currentGuildName = "";

let guildRoles = [];

let guildChannels = [];

let currentVerificationURL = "";

/* =========================================================
   HELPERS
========================================================= */

function cleanText(value) {
  return String(value || "").trim();
}

function hideLoading() {
  if (!loadingCover) {
    return;
  }

  loadingCover.classList.add("hidden");
}

function showToast(message) {
  if (!toast) {
    return;
  }

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

function setSaveStatus(message) {
  if (saveStatus) {
    saveStatus.textContent = message;
  }
}

function findRole(roleID) {
  return guildRoles.find((role) => String(role.id) === String(roleID));
}

function findChannel(channelID) {
  return guildChannels.find(
    (channel) => String(channel.id) === String(channelID),
  );
}

/* =========================================================
   API
========================================================= */

async function apiJSON(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",

    cache: "no-store",

    ...options,
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(
      data.error || `Request failed (${response.status})`,
    );

    error.status = response.status;

    throw error;
  }

  return data;
}

/* =========================================================
   ACCOUNT / SERVER
========================================================= */

async function loadAccount() {
  const data = await apiJSON("/api/me");

  if (!data.loggedIn) {
    window.location.href = "/auth/discord";

    return false;
  }

  const guilds = Array.isArray(data.guilds) ? data.guilds : [];

  if (!guilds.length) {
    throw new Error("No manageable Discord servers were found.");
  }

  const selectedGuildID = localStorage.getItem("arclume-selected-guild");

  const guild = guilds.find((item) => item.id === selectedGuildID) || guilds[0];

  currentGuildID = guild.id;

  currentGuildName = guild.name;

  localStorage.setItem("arclume-selected-guild", guild.id);

  if (activeServerName) {
    activeServerName.textContent = guild.name;
  }

  return true;
}

/* =========================================================
   BOT STATUS
========================================================= */

async function loadBotStatus() {
  try {
    const data = await apiJSON("/api/status");

    if (!botStatus) {
      return;
    }

    if (data.botOnline) {
      botStatus.textContent = "ONLINE";

      botStatus.classList.add("good");

      botStatus.classList.remove("bad");
    } else {
      botStatus.textContent = "OFFLINE";

      botStatus.classList.add("bad");

      botStatus.classList.remove("good");
    }
  } catch {
    if (botStatus) {
      botStatus.textContent = "UNKNOWN";

      botStatus.classList.add("bad");
    }
  }
}

/* =========================================================
   OPTIONS
========================================================= */

function populateRoles(roles) {
  guildRoles = Array.isArray(roles) ? roles : [];

  verifiedRole.innerHTML = `
      <option value="">
        Select Verified Role
      </option>
    `;

  unverifiedRole.innerHTML = `
      <option value="">
        None
      </option>
    `;

  for (const role of guildRoles) {
    const optionOne = document.createElement("option");

    optionOne.value = role.id;

    optionOne.textContent = role.assignable
      ? role.name
      : `${role.name} — unavailable`;

    optionOne.disabled = !role.assignable;

    verifiedRole.appendChild(optionOne);

    const optionTwo = document.createElement("option");

    optionTwo.value = role.id;

    optionTwo.textContent = role.assignable
      ? role.name
      : `${role.name} — unavailable`;

    optionTwo.disabled = !role.assignable;

    unverifiedRole.appendChild(optionTwo);
  }
}

function populateChannels(channels) {
  guildChannels = Array.isArray(channels) ? channels : [];

  logChannel.innerHTML = `
      <option value="">
        No Log Channel
      </option>
    `;

  for (const channel of guildChannels) {
    const option = document.createElement("option");

    option.value = channel.id;

    option.textContent = `#${channel.name}`;

    logChannel.appendChild(option);
  }
}

async function loadOptions() {
  const data = await apiJSON(
    `/api/guild/${currentGuildID}/web-verification/options`,
  );

  populateRoles(data.roles);

  populateChannels(data.channels);

  if (data.guild?.name) {
    currentGuildName = data.guild.name;

    activeServerName.textContent = data.guild.name;
  }

  currentVerificationURL = data.verificationURL || "";

  verificationURL.value = currentVerificationURL;
}

/* =========================================================
   SETTINGS
========================================================= */

async function loadSettings() {
  const data = await apiJSON(`/api/guild/${currentGuildID}/web-verification`);

  const settings = data.settings || {};

  verificationEnabled.checked = Boolean(settings.enabled);

  verifiedRole.value = settings.verifiedRole || "";

  unverifiedRole.value = settings.unverifiedRole || "";

  logChannel.value = settings.logChannel || "";

  pageTitle.value = settings.pageTitle || "Verify your Discord account";

  pageMessage.value =
    settings.pageMessage ||
    "Sign in with Discord to verify your membership and unlock access to the server.";

  successMessage.value =
    settings.successMessage ||
    "Verification complete. You can return to Discord.";

  currentVerificationURL = data.verificationURL || currentVerificationURL;

  verificationURL.value = currentVerificationURL;

  updatePreview();

  updateStatus();
}

/* =========================================================
   PREVIEW
========================================================= */

function updatePreview() {
  const title = cleanText(pageTitle.value) || "Verify your Discord account";

  const message =
    cleanText(pageMessage.value) ||
    "Sign in with Discord to verify your membership and unlock access to the server.";

  previewTitle.textContent = title;

  previewMessage.textContent = message;
}

/* =========================================================
   STATUS
========================================================= */

function updateStatus() {
  if (verificationEnabled.checked) {
    verificationStatus.textContent = "ENABLED";

    verificationStatus.classList.add("good");

    verificationStatus.classList.remove("bad");
  } else {
    verificationStatus.textContent = "DISABLED";

    verificationStatus.classList.remove("good");

    verificationStatus.classList.add("bad");
  }

  const selectedRole = findRole(verifiedRole.value);

  verifiedRoleStatus.textContent = selectedRole ? selectedRole.name : "NONE";

  if (selectedRole) {
    verifiedRoleStatus.classList.add("good");
  } else {
    verifiedRoleStatus.classList.remove("good");
  }

  const selectedLog = findChannel(logChannel.value);

  logStatus.textContent = selectedLog ? `#${selectedLog.name}` : "OFF";

  if (selectedLog) {
    logStatus.classList.add("good");
  } else {
    logStatus.classList.remove("good");
  }
}

/* =========================================================
   CURRENT SETTINGS
========================================================= */

function getCurrentSettings() {
  return {
    enabled: Boolean(verificationEnabled.checked),

    verifiedRole: verifiedRole.value || "",

    unverifiedRole: unverifiedRole.value || "",

    logChannel: logChannel.value || "",

    pageTitle: cleanText(pageTitle.value),

    pageMessage: cleanText(pageMessage.value),

    successMessage: cleanText(successMessage.value),
  };
}

/* =========================================================
   SAVE
========================================================= */

async function saveSettings() {
  if (!currentGuildID) {
    return;
  }

  const settings = getCurrentSettings();

  if (settings.enabled && !settings.verifiedRole) {
    setSaveStatus("SELECT VERIFIED ROLE");

    showToast("Select a Verified Role first.");

    return;
  }

  if (
    settings.verifiedRole &&
    settings.unverifiedRole &&
    settings.verifiedRole === settings.unverifiedRole
  ) {
    setSaveStatus("ROLE CONFLICT");

    showToast("Verified and Unverified roles cannot be the same.");

    return;
  }

  const originalText = saveVerification.innerHTML;

  saveVerification.disabled = true;

  saveVerification.innerHTML = `
      <span>SAVING...</span>
      <span>•••</span>
    `;

  setSaveStatus("SAVING");

  try {
    const data = await apiJSON(
      `/api/guild/${currentGuildID}/web-verification`,
      {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(settings),
      },
    );

    const saved = data.settings || settings;

    verificationEnabled.checked = Boolean(saved.enabled);

    verifiedRole.value = saved.verifiedRole || "";

    unverifiedRole.value = saved.unverifiedRole || "";

    logChannel.value = saved.logChannel || "";

    pageTitle.value = saved.pageTitle || pageTitle.value;

    pageMessage.value = saved.pageMessage || pageMessage.value;

    successMessage.value = saved.successMessage || successMessage.value;

    currentVerificationURL = data.verificationURL || currentVerificationURL;

    verificationURL.value = currentVerificationURL;

    updatePreview();

    updateStatus();

    setSaveStatus("SAVED");

    showToast("Web Verification settings saved.");

    saveVerification.innerHTML = `
        <span>SAVED</span>
        <span>✓</span>
      `;
  } catch (error) {
    console.error("Web Verification save error:", error);

    setSaveStatus("SAVE FAILED");

    showToast(error.message || "Could not save settings.");

    saveVerification.innerHTML = `
        <span>FAILED</span>
        <span>!</span>
      `;
  }

  setTimeout(() => {
    saveVerification.disabled = false;

    saveVerification.innerHTML = originalText;
  }, 1500);
}

/* =========================================================
   COPY URL
========================================================= */

async function copyVerificationURL() {
  const url = cleanText(verificationURL.value);

  if (!url) {
    showToast("Verification URL is not available.");

    return;
  }

  try {
    await navigator.clipboard.writeText(url);

    copyURL.textContent = "COPIED ✓";

    showToast("Verification URL copied.");
  } catch {
    verificationURL.select();

    document.execCommand("copy");

    copyURL.textContent = "COPIED ✓";

    showToast("Verification URL copied.");
  }

  setTimeout(() => {
    copyURL.textContent = "COPY";
  }, 1500);
}

/* =========================================================
   OPEN URL
========================================================= */

function openVerificationURL() {
  const url = cleanText(verificationURL.value);

  if (!url) {
    showToast("Verification URL is not available.");

    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

/* =========================================================
   EVENTS
========================================================= */

verificationEnabled.addEventListener("change", updateStatus);

verifiedRole.addEventListener("change", updateStatus);

unverifiedRole.addEventListener("change", updateStatus);

logChannel.addEventListener("change", updateStatus);

pageTitle.addEventListener("input", updatePreview);

pageMessage.addEventListener("input", updatePreview);

successMessage.addEventListener("input", updateStatus);

saveVerification.addEventListener("click", saveSettings);

copyURL.addEventListener("click", copyVerificationURL);

openURL.addEventListener("click", openVerificationURL);

/* =========================================================
   START
========================================================= */

async function start() {
  try {
    setSaveStatus("LOADING");

    const accountLoaded = await loadAccount();

    if (!accountLoaded) {
      return;
    }

    await Promise.all([loadBotStatus(), loadOptions()]);

    await loadSettings();

    setSaveStatus("READY");
  } catch (error) {
    console.error("Web Verification settings startup error:", error);

    setSaveStatus("LOAD FAILED");

    showToast(error.message || "Could not load Web Verification.");

    if (error.status === 401) {
      window.location.href = "/auth/discord";
    }
  } finally {
    hideLoading();
  }
}

start();
