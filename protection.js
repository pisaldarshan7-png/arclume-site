/* =========================================================
   ARCLUME — PROTECTION
========================================================= */

let currentUser = null;
let guilds = [];
let currentGuild = null;

let availableChannels = [];
let availableRoles = [];

let selectedChannels = [];
let selectedRoles = [];

let currentSettings = null;
let saving = false;
let dirty = false;

/* =========================================================
   ELEMENTS
========================================================= */

const loadingState = document.getElementById("loadingState");
const loginState = document.getElementById("loginState");
const protectionApp = document.getElementById("protectionApp");

const serverButton = document.getElementById("serverButton");
const serverIcon = document.getElementById("serverIcon");
const serverName = document.getElementById("serverName");

const serverOverlay = document.getElementById("serverOverlay");
const closeServerOverlay = document.getElementById("closeServerOverlay");
const serverList = document.getElementById("serverList");

const masterToggle = document.getElementById("masterToggle");
const masterStatus = document.getElementById("masterStatus");

const ruleToggles = document.querySelectorAll(".rule-toggle");

const actionSelect = document.getElementById("actionSelect");
const timeoutMinutes = document.getElementById("timeoutMinutes");

const bannedWords = document.getElementById("bannedWords");

const channelSelectButton = document.getElementById("channelSelectButton");

const channelMenu = document.getElementById("channelMenu");

const channelChips = document.getElementById("channelChips");

const roleSelectButton = document.getElementById("roleSelectButton");

const roleMenu = document.getElementById("roleMenu");

const roleChips = document.getElementById("roleChips");

const logChannel = document.getElementById("logChannel");

const saveButton = document.getElementById("saveButton");

const reloadButton = document.getElementById("reloadButton");

const saveStatus = document.getElementById("saveStatus");

const toastElement = document.getElementById("toast");

/* =========================================================
   HELPERS
========================================================= */

function firstLetter(value) {
  return String(value || "A")
    .trim()
    .charAt(0)
    .toUpperCase();
}

function guildIconURL(guild) {
  if (!guild?.id || !guild?.icon) {
    return null;
  }

  return (
    `https://cdn.discordapp.com/icons/` +
    `${guild.id}/${guild.icon}.png?size=128`
  );
}

function renderImage(element, url, fallback) {
  if (!element) {
    return;
  }

  element.innerHTML = "";

  if (!url) {
    element.textContent = firstLetter(fallback);
    return;
  }

  const img = document.createElement("img");

  img.src = url;
  img.alt = fallback || "Discord Server";

  img.addEventListener("error", () => {
    element.innerHTML = "";
    element.textContent = firstLetter(fallback);
  });

  element.appendChild(img);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function unique(values) {
  return [...new Set(values)];
}

function cleanBannedWords() {
  return unique(
    bannedWords.value
      .split("\n")
      .map((word) => word.trim())
      .filter(Boolean),
  ).slice(0, 200);
}

/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;

function toast(message, error = false) {
  toastElement.textContent = message;

  toastElement.classList.toggle("error", Boolean(error));

  toastElement.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toastElement.classList.remove("show");
  }, 2600);
}

/* =========================================================
   DIRTY STATE
========================================================= */

function markDirty() {
  dirty = true;

  saveStatus.textContent = "Unsaved changes.";

  saveButton.textContent = "SAVE CHANGES";
}

function markSaved() {
  dirty = false;

  saveStatus.textContent = "Everything is saved.";

  saveButton.textContent = "SAVE CHANGES";
}

/* =========================================================
   MASTER TOGGLE
========================================================= */

function setToggle(button, enabled) {
  if (!button) {
    return;
  }

  button.classList.toggle("on", Boolean(enabled));
}

function toggleEnabled(button) {
  return button.classList.contains("on");
}

function updateMasterStatus() {
  const enabled = toggleEnabled(masterToggle);

  masterStatus.textContent = enabled ? "ACTIVE" : "PAUSED";

  masterStatus.style.color = enabled ? "var(--green)" : "var(--dim)";
}

masterToggle.addEventListener("click", () => {
  setToggle(masterToggle, !toggleEnabled(masterToggle));

  updateMasterStatus();
  markDirty();
});

/* =========================================================
   RULE TOGGLES
========================================================= */

ruleToggles.forEach((button) => {
  button.addEventListener("click", () => {
    setToggle(button, !toggleEnabled(button));

    markDirty();
  });
});

function getRulesFromPage() {
  const rules = {
    spam: false,
    duplicate: false,
    invites: false,
    links: false,
    caps: false,
    bannedWords: false,
  };

  ruleToggles.forEach((button) => {
    const rule = button.dataset.rule;

    if (rule in rules) {
      rules[rule] = toggleEnabled(button);
    }
  });

  return rules;
}

function applyRules(rules = {}) {
  ruleToggles.forEach((button) => {
    const rule = button.dataset.rule;

    setToggle(button, Boolean(rules[rule]));
  });
}

/* =========================================================
   SERVER IDENTITY
========================================================= */

function renderServerIdentity() {
  if (!currentGuild) {
    return;
  }

  serverName.textContent = currentGuild.name || "Discord Server";

  renderImage(serverIcon, guildIconURL(currentGuild), currentGuild.name);
}

/* =========================================================
   SERVER SELECTOR
========================================================= */

function openServerSelector() {
  serverOverlay.classList.remove("hidden");

  document.body.style.overflow = "hidden";
}

function closeServerSelector() {
  serverOverlay.classList.add("hidden");

  document.body.style.overflow = "";
}

serverButton.addEventListener("click", openServerSelector);

closeServerOverlay.addEventListener("click", closeServerSelector);

serverOverlay.addEventListener("click", (event) => {
  if (event.target === serverOverlay) {
    closeServerSelector();
  }
});

function renderServerList() {
  serverList.innerHTML = "";

  guilds.forEach((guild) => {
    const button = document.createElement("button");

    button.type = "button";

    button.className =
      "server-choice" + (guild.id === currentGuild?.id ? " active" : "");

    const icon = document.createElement("span");

    icon.className = "server-choice-icon";

    const copy = document.createElement("span");

    copy.innerHTML = `
      <small>DISCORD COMMUNITY</small>
      <strong>${escapeHTML(guild.name)}</strong>
    `;

    const state = document.createElement("span");

    state.textContent = guild.id === currentGuild?.id ? "ACTIVE" : "SELECT";

    renderImage(icon, guildIconURL(guild), guild.name);

    button.appendChild(icon);
    button.appendChild(copy);
    button.appendChild(state);

    button.addEventListener("click", async () => {
      await selectGuild(guild.id);
    });

    serverList.appendChild(button);
  });
}

async function selectGuild(guildID) {
  const guild = guilds.find((item) => item.id === guildID);

  if (!guild) {
    return;
  }

  if (
    dirty &&
    !confirm("You have unsaved Protection changes. Switch server anyway?")
  ) {
    return;
  }

  currentGuild = guild;

  localStorage.setItem("arclume-selected-guild", guild.id);

  renderServerIdentity();
  renderServerList();

  closeServerSelector();

  await loadGuildData();

  toast(`SERVER → ${guild.name}`);
}

/* =========================================================
   OPTIONS
========================================================= */

async function loadGuildOptions() {
  availableChannels = [];
  availableRoles = [];

  if (!currentGuild) {
    return;
  }

  /*
    Arclume already exposes the same
    server channel/role list for the
    Verification system.

    We reuse that list here instead of
    changing the backend.
  */

  try {
    const response = await fetch(
      `/api/guild/${currentGuild.id}/verification-options`,
      {
        credentials: "same-origin",
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not load server options.");
    }

    availableChannels = Array.isArray(data.channels) ? data.channels : [];

    availableRoles = Array.isArray(data.roles) ? data.roles : [];

    renderChannelMenu();
    renderRoleMenu();
    renderLogChannels();
  } catch (error) {
    console.error("Protection options error:", error);

    renderChannelMenu();
    renderRoleMenu();
    renderLogChannels();

    toast(error.message || "Could not load Discord channels and roles.", true);
  }
}

/* =========================================================
   CHANNEL MENU
========================================================= */

function renderChannelMenu() {
  channelMenu.innerHTML = "";

  if (!availableChannels.length) {
    const empty = document.createElement("div");

    empty.style.padding = "14px";
    empty.style.color = "var(--dim)";
    empty.style.fontSize = "9px";

    empty.textContent = "No channels available.";

    channelMenu.appendChild(empty);

    renderChannelChips();

    return;
  }

  availableChannels.forEach((channel) => {
    const button = document.createElement("button");

    button.type = "button";

    const selected = selectedChannels.includes(channel.id);

    button.className = "multi-option" + (selected ? " selected" : "");

    button.innerHTML = `
        <i></i>
        <span>
          # ${escapeHTML(channel.name)}
        </span>
      `;

    button.addEventListener("click", () => {
      if (selectedChannels.includes(channel.id)) {
        selectedChannels = selectedChannels.filter((id) => id !== channel.id);
      } else {
        selectedChannels.push(channel.id);
      }

      selectedChannels = unique(selectedChannels);

      renderChannelMenu();
      renderChannelChips();

      markDirty();
    });

    channelMenu.appendChild(button);
  });

  renderChannelChips();
}

function renderChannelChips() {
  channelChips.innerHTML = "";

  const selected = availableChannels.filter((channel) =>
    selectedChannels.includes(channel.id),
  );

  if (!selected.length) {
    channelSelectButton.querySelector("span:first-child").textContent =
      "Choose channels";

    return;
  }

  channelSelectButton.querySelector("span:first-child").textContent =
    `${selected.length} channel` +
    (selected.length === 1 ? "" : "s") +
    " ignored";

  selected.forEach((channel) => {
    const chip = document.createElement("span");

    chip.className = "chip";

    const name = document.createElement("span");

    name.textContent = `# ${channel.name}`;

    const remove = document.createElement("button");

    remove.type = "button";
    remove.textContent = "×";

    remove.addEventListener("click", () => {
      selectedChannels = selectedChannels.filter((id) => id !== channel.id);

      renderChannelMenu();
      renderChannelChips();

      markDirty();
    });

    chip.appendChild(name);
    chip.appendChild(remove);

    channelChips.appendChild(chip);
  });
}

/* =========================================================
   ROLE MENU
========================================================= */

function renderRoleMenu() {
  roleMenu.innerHTML = "";

  if (!availableRoles.length) {
    const empty = document.createElement("div");

    empty.style.padding = "14px";
    empty.style.color = "var(--dim)";
    empty.style.fontSize = "9px";

    empty.textContent = "No roles available.";

    roleMenu.appendChild(empty);

    renderRoleChips();

    return;
  }

  availableRoles.forEach((role) => {
    const button = document.createElement("button");

    button.type = "button";

    const selected = selectedRoles.includes(role.id);

    button.className = "multi-option" + (selected ? " selected" : "");

    button.innerHTML = `
      <i></i>
      <span>
        @ ${escapeHTML(role.name)}
      </span>
    `;

    button.addEventListener("click", () => {
      if (selectedRoles.includes(role.id)) {
        selectedRoles = selectedRoles.filter((id) => id !== role.id);
      } else {
        selectedRoles.push(role.id);
      }

      selectedRoles = unique(selectedRoles);

      renderRoleMenu();
      renderRoleChips();

      markDirty();
    });

    roleMenu.appendChild(button);
  });

  renderRoleChips();
}

function renderRoleChips() {
  roleChips.innerHTML = "";

  const selected = availableRoles.filter((role) =>
    selectedRoles.includes(role.id),
  );

  if (!selected.length) {
    roleSelectButton.querySelector("span:first-child").textContent =
      "Choose roles";

    return;
  }

  roleSelectButton.querySelector("span:first-child").textContent =
    `${selected.length} role` + (selected.length === 1 ? "" : "s") + " ignored";

  selected.forEach((role) => {
    const chip = document.createElement("span");

    chip.className = "chip";

    const name = document.createElement("span");

    name.textContent = `@ ${role.name}`;

    const remove = document.createElement("button");

    remove.type = "button";
    remove.textContent = "×";

    remove.addEventListener("click", () => {
      selectedRoles = selectedRoles.filter((id) => id !== role.id);

      renderRoleMenu();
      renderRoleChips();

      markDirty();
    });

    chip.appendChild(name);
    chip.appendChild(remove);

    roleChips.appendChild(chip);
  });
}

/* =========================================================
   MULTI SELECT OPEN / CLOSE
========================================================= */

channelSelectButton.addEventListener("click", (event) => {
  event.stopPropagation();

  roleMenu.classList.add("hidden");

  channelMenu.classList.toggle("hidden");
});

roleSelectButton.addEventListener("click", (event) => {
  event.stopPropagation();

  channelMenu.classList.add("hidden");

  roleMenu.classList.toggle("hidden");
});

channelMenu.addEventListener("click", (event) => {
  event.stopPropagation();
});

roleMenu.addEventListener("click", (event) => {
  event.stopPropagation();
});

document.addEventListener("click", () => {
  channelMenu.classList.add("hidden");

  roleMenu.classList.add("hidden");
});

/* =========================================================
   LOG CHANNEL
========================================================= */

function renderLogChannels() {
  const selected = currentSettings?.logChannel || "";

  logChannel.innerHTML = "";

  const none = document.createElement("option");

  none.value = "";
  none.textContent = "No log channel";

  logChannel.appendChild(none);

  availableChannels.forEach((channel) => {
    const option = document.createElement("option");

    option.value = channel.id;

    option.textContent = `# ${channel.name}`;

    logChannel.appendChild(option);
  });

  logChannel.value = selected;
}

/* =========================================================
   APPLY SETTINGS
========================================================= */

function applySettings(settings) {
  currentSettings = settings || {};

  const rules = currentSettings.rules || {};

  setToggle(masterToggle, Boolean(currentSettings.enabled));

  updateMasterStatus();

  applyRules(rules);

  actionSelect.value = ["delete", "warn", "timeout"].includes(
    currentSettings.action,
  )
    ? currentSettings.action
    : "delete";

  timeoutMinutes.value = Number(currentSettings.timeoutMinutes) || 10;

  bannedWords.value = Array.isArray(currentSettings.bannedWords)
    ? currentSettings.bannedWords.join("\n")
    : "";

  selectedChannels = Array.isArray(currentSettings.ignoredChannels)
    ? [...currentSettings.ignoredChannels]
    : [];

  selectedRoles = Array.isArray(currentSettings.ignoredRoles)
    ? [...currentSettings.ignoredRoles]
    : [];

  renderChannelMenu();
  renderRoleMenu();
  renderLogChannels();

  markSaved();
}

/* =========================================================
   LOAD PROTECTION SETTINGS
========================================================= */

async function loadProtectionSettings() {
  if (!currentGuild) {
    return;
  }

  saveStatus.textContent = "Loading Protection settings…";

  try {
    const response = await fetch(`/api/guild/${currentGuild.id}/protection`, {
      credentials: "same-origin",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not load Protection settings.");
    }

    applySettings(data.settings || {});
  } catch (error) {
    console.error("Protection load error:", error);

    saveStatus.textContent = "Protection could not be loaded.";

    toast(error.message || "Could not load Protection settings.", true);
  }
}

/* =========================================================
   LOAD SELECTED SERVER
========================================================= */

async function loadGuildData() {
  if (!currentGuild) {
    return;
  }

  saveStatus.textContent = "Loading server configuration…";

  await loadProtectionSettings();

  await loadGuildOptions();

  /*
    Apply settings again after options
    have loaded so saved channel/role
    selections render correctly.
  */

  if (currentSettings) {
    selectedChannels = Array.isArray(currentSettings.ignoredChannels)
      ? [...currentSettings.ignoredChannels]
      : [];

    selectedRoles = Array.isArray(currentSettings.ignoredRoles)
      ? [...currentSettings.ignoredRoles]
      : [];

    renderChannelMenu();
    renderRoleMenu();
    renderLogChannels();
  }

  markSaved();
}

/* =========================================================
   BUILD SAVE PAYLOAD
========================================================= */

function buildPayload() {
  const timeout = Math.min(
    10080,
    Math.max(1, Number(timeoutMinutes.value) || 10),
  );

  timeoutMinutes.value = timeout;

  return {
    enabled: toggleEnabled(masterToggle),

    rules: {
      ...getRulesFromPage(),

      /*
        Mass Mentions intentionally
        remains disabled in Arclume.
      */

      mentions: false,
    },

    bannedWords: cleanBannedWords(),

    action: actionSelect.value,

    timeoutMinutes: timeout,

    mentionLimit: 50,

    ignoredChannels: unique(selectedChannels),

    ignoredRoles: unique(selectedRoles),

    logChannel: logChannel.value || "",
  };
}

/* =========================================================
   SAVE
========================================================= */

async function saveProtectionSettings() {
  if (saving || !currentGuild) {
    return;
  }

  saving = true;

  saveButton.disabled = true;

  saveButton.textContent = "SAVING…";

  saveStatus.textContent = "Saving Protection settings…";

  try {
    const payload = buildPayload();

    const response = await fetch(`/api/guild/${currentGuild.id}/protection`, {
      method: "PUT",

      headers: {
        "Content-Type": "application/json",
      },

      credentials: "same-origin",

      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not save Protection settings.");
    }

    applySettings(data.settings || payload);

    toast("PROTECTION SETTINGS SAVED");
  } catch (error) {
    console.error("Protection save error:", error);

    saveStatus.textContent = "Save failed.";

    toast(error.message || "Could not save Protection settings.", true);
  } finally {
    saving = false;

    saveButton.disabled = false;

    saveButton.textContent = "SAVE CHANGES";
  }
}

saveButton.addEventListener("click", saveProtectionSettings);

/* =========================================================
   RELOAD
========================================================= */

reloadButton.addEventListener("click", async () => {
  if (dirty && !confirm("Discard unsaved Protection changes?")) {
    return;
  }

  await loadGuildData();

  toast("PROTECTION SETTINGS RELOADED");
});

/* =========================================================
   FORM CHANGE TRACKING
========================================================= */

actionSelect.addEventListener("change", markDirty);

timeoutMinutes.addEventListener("input", markDirty);

bannedWords.addEventListener("input", markDirty);

logChannel.addEventListener("change", markDirty);

/* =========================================================
   UNSAVED CHANGES WARNING
========================================================= */

window.addEventListener("beforeunload", (event) => {
  if (!dirty) {
    return;
  }

  event.preventDefault();
  event.returnValue = "";
});

/* =========================================================
   ESCAPE KEY
========================================================= */

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  closeServerSelector();

  channelMenu.classList.add("hidden");

  roleMenu.classList.add("hidden");
});

/* =========================================================
   AUTH / BOOT
========================================================= */

async function boot() {
  try {
    const data = await fetchJSON("/api/me");

    if (!data.loggedIn) {
      loadingState.classList.add("hidden");

      loginState.classList.remove("hidden");

      return;
    }

    currentUser = data.user;

    guilds = Array.isArray(data.guilds) ? data.guilds : [];

    if (!guilds.length) {
      loadingState.classList.add("hidden");

      loginState.classList.remove("hidden");

      return;
    }

    const storedGuild = localStorage.getItem("arclume-selected-guild");

    currentGuild =
      guilds.find((guild) => guild.id === storedGuild) || guilds[0];

    localStorage.setItem("arclume-selected-guild", currentGuild.id);

    renderServerIdentity();

    renderServerList();

    /*
      SHOW PAGE BEFORE LOADING DISCORD DATA
    */

    loadingState.classList.add("hidden");

    loginState.classList.add("hidden");

    rolesApp.classList.remove("hidden");

    /*
      NOW LOAD DATA
    */

    await loadGuildData();
  } catch (error) {
    console.error("Role Manager boot error:", error);

    loadingState.classList.add("hidden");

    loginState.classList.remove("hidden");

    toast(error.message || "Could not start Role Management.", true);
  }
}
{
  try {
    const response = await fetch("/api/me", {
      credentials: "same-origin",
    });

    const data = await response.json();

    if (!response.ok || !data.loggedIn) {
      loadingState.classList.add("hidden");

      loginState.classList.remove("hidden");

      return;
    }

    currentUser = data.user;

    guilds = Array.isArray(data.guilds) ? data.guilds : [];

    if (!guilds.length) {
      loadingState.classList.add("hidden");

      loginState.classList.remove("hidden");

      const heading = loginState.querySelector("h1");

      const paragraph = loginState.querySelector("p");

      if (heading) {
        heading.textContent = "No manageable server.";
      }

      if (paragraph) {
        paragraph.textContent =
          "Arclume could not find a Discord server that this account can manage.";
      }

      return;
    }

    const savedGuild = localStorage.getItem("arclume-selected-guild");

    currentGuild = guilds.find((guild) => guild.id === savedGuild) || guilds[0];

    localStorage.setItem("arclume-selected-guild", currentGuild.id);

    renderServerIdentity();
    renderServerList();

    await loadGuildData();

    loadingState.classList.add("hidden");

    loginState.classList.add("hidden");

    protectionApp.classList.remove("hidden");
  } catch (error) {
    console.error("Protection boot error:", error);

    loadingState.classList.add("hidden");

    loginState.classList.remove("hidden");

    toast("Could not start Protection.", true);
  }
}

/* =========================================================
   START
========================================================= */

boot();
