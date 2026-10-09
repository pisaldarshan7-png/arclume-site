/* =========================================================
   ARCLUME — VERIFICATION
========================================================= */

let currentUser = null;
let guilds = [];
let currentGuild = null;

let availableRoles = [];
let availableChannels = [];

let currentSettings = null;

let saving = false;
let dirty = false;

/* =========================================================
   ELEMENTS
========================================================= */

const loadingState = document.getElementById("loadingState");

const loginState = document.getElementById("loginState");

const verificationApp = document.getElementById("verificationApp");

const serverButton = document.getElementById("serverButton");

const serverIcon = document.getElementById("serverIcon");

const serverName = document.getElementById("serverName");

const serverOverlay = document.getElementById("serverOverlay");

const closeServerOverlay = document.getElementById("closeServerOverlay");

const serverList = document.getElementById("serverList");

const masterToggle = document.getElementById("masterToggle");

const masterStatus = document.getElementById("masterStatus");

const verifiedRole = document.getElementById("verifiedRole");

const unverifiedRole = document.getElementById("unverifiedRole");

const verificationChannel = document.getElementById("verificationChannel");

const logChannel = document.getElementById("logChannel");

const panelTitle = document.getElementById("panelTitle");

const panelMessage = document.getElementById("panelMessage");

const buttonText = document.getElementById("buttonText");

const previewTitle = document.getElementById("previewTitle");

const previewMessage = document.getElementById("previewMessage");

const previewButton = document.getElementById("previewButton");

const saveStatus = document.getElementById("saveStatus");

const saveButton = document.getElementById("saveButton");

const reloadButton = document.getElementById("reloadButton");

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

  const image = document.createElement("img");

  image.src = url;

  image.alt = fallback || "Discord Server";

  image.addEventListener("error", () => {
    element.innerHTML = "";

    element.textContent = firstLetter(fallback);
  });

  element.appendChild(image);
}

function toggleState(element, enabled) {
  element.classList.toggle("on", Boolean(enabled));
}

function toggleEnabled(element) {
  return element.classList.contains("on");
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
   DIRTY / SAVED STATE
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
   MASTER VERIFICATION
========================================================= */

function updateMasterStatus() {
  const enabled = toggleEnabled(masterToggle);

  masterStatus.textContent = enabled ? "ACTIVE" : "DISABLED";

  masterStatus.style.color = enabled ? "var(--green)" : "var(--dim)";
}

masterToggle.addEventListener("click", () => {
  toggleState(masterToggle, !toggleEnabled(masterToggle));

  updateMasterStatus();

  markDirty();
});

/* =========================================================
   PREVIEW
========================================================= */

function updatePreview() {
  const title = panelTitle.value.trim() || "Verify Your Account";

  const message =
    panelMessage.value.trim() ||
    "Click the button below to verify yourself and gain access to the server.";

  const button = buttonText.value.trim() || "Verify";

  previewTitle.textContent = title;

  previewMessage.textContent = message;

  previewButton.textContent = button;
}

panelTitle.addEventListener("input", () => {
  updatePreview();
  markDirty();
});

panelMessage.addEventListener("input", () => {
  updatePreview();
  markDirty();
});

buttonText.addEventListener("input", () => {
  updatePreview();
  markDirty();
});

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

    const small = document.createElement("small");

    small.textContent = "DISCORD COMMUNITY";

    const strong = document.createElement("strong");

    strong.textContent = guild.name || "Unnamed Server";

    copy.appendChild(small);
    copy.appendChild(strong);

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
    !confirm("You have unsaved Verification changes. Switch server anyway?")
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
   ROLE OPTIONS
========================================================= */

function fillRoleSelect(select, placeholder, selectedValue = "") {
  select.innerHTML = "";

  const placeholderOption = document.createElement("option");

  placeholderOption.value = "";
  placeholderOption.textContent = placeholder;

  select.appendChild(placeholderOption);

  availableRoles.forEach((role) => {
    const option = document.createElement("option");

    option.value = role.id;

    /*
        Backend tells us whether the bot
        can manage this role.
      */

    if (role.assignable === false) {
      option.textContent = `${role.name} — Not assignable`;

      option.disabled = true;
    } else {
      option.textContent = role.name;
    }

    select.appendChild(option);
  });

  if (
    selectedValue &&
    [...select.options].some((option) => option.value === selectedValue)
  ) {
    select.value = selectedValue;
  } else {
    select.value = "";
  }
}

/* =========================================================
   CHANNEL OPTIONS
========================================================= */

function fillChannelSelect(select, placeholder, selectedValue = "") {
  select.innerHTML = "";

  const placeholderOption = document.createElement("option");

  placeholderOption.value = "";
  placeholderOption.textContent = placeholder;

  select.appendChild(placeholderOption);

  availableChannels.forEach((channel) => {
    const option = document.createElement("option");

    option.value = channel.id;

    option.textContent = `# ${channel.name}`;

    select.appendChild(option);
  });

  if (
    selectedValue &&
    [...select.options].some((option) => option.value === selectedValue)
  ) {
    select.value = selectedValue;
  } else {
    select.value = "";
  }
}

/* =========================================================
   RENDER OPTIONS
========================================================= */

function renderOptions() {
  fillRoleSelect(
    verifiedRole,
    "Select Verified Role",
    currentSettings?.verifiedRole || "",
  );

  fillRoleSelect(
    unverifiedRole,
    "No Unverified Role",
    currentSettings?.unverifiedRole || "",
  );

  fillChannelSelect(
    verificationChannel,
    "Select Verification Channel",
    currentSettings?.verificationChannel || "",
  );

  fillChannelSelect(
    logChannel,
    "No Log Channel",
    currentSettings?.logChannel || "",
  );
}

/* =========================================================
   LOAD SERVER ROLES / CHANNELS
========================================================= */

async function loadOptions() {
  if (!currentGuild) {
    return;
  }

  const response = await fetch(
    `/api/guild/${currentGuild.id}/verification-options`,
    {
      credentials: "same-origin",
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not load server roles and channels.");
  }

  availableRoles = Array.isArray(data.roles) ? data.roles : [];

  availableChannels = Array.isArray(data.channels) ? data.channels : [];
}

/* =========================================================
   LOAD SETTINGS
========================================================= */

async function loadSettings() {
  if (!currentGuild) {
    return;
  }

  const response = await fetch(`/api/guild/${currentGuild.id}/verification`, {
    credentials: "same-origin",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not load Verification settings.");
  }

  currentSettings = data.settings || {};
}

/* =========================================================
   APPLY SETTINGS
========================================================= */

function applySettings() {
  const settings = currentSettings || {};

  toggleState(masterToggle, Boolean(settings.enabled));

  updateMasterStatus();

  panelTitle.value = settings.title || "Verify Your Account";

  panelMessage.value =
    settings.message ||
    "Click the button below to verify yourself and gain access to the server.";

  buttonText.value = settings.buttonText || "Verify";

  renderOptions();

  updatePreview();

  markSaved();
}

/* =========================================================
   LOAD ALL GUILD DATA
========================================================= */

async function loadGuildData() {
  if (!currentGuild) {
    return;
  }

  saveStatus.textContent = "Loading Verification settings…";

  try {
    await Promise.all([loadSettings(), loadOptions()]);

    applySettings();
  } catch (error) {
    console.error("Verification load error:", error);

    saveStatus.textContent = "Verification could not be loaded.";

    toast(error.message || "Could not load Verification.", true);
  }
}

/* =========================================================
   FORM CHANGE EVENTS
========================================================= */

verifiedRole.addEventListener("change", markDirty);

unverifiedRole.addEventListener("change", markDirty);

verificationChannel.addEventListener("change", markDirty);

logChannel.addEventListener("change", markDirty);

/* =========================================================
   BUILD SAVE DATA
========================================================= */

function buildPayload() {
  return {
    enabled: toggleEnabled(masterToggle),

    verifiedRole: verifiedRole.value || "",

    unverifiedRole: unverifiedRole.value || "",

    verificationChannel: verificationChannel.value || "",

    logChannel: logChannel.value || "",

    title: panelTitle.value.trim().slice(0, 80) || "Verify Your Account",

    message:
      panelMessage.value.trim().slice(0, 500) ||
      "Click the button below to verify yourself and gain access to the server.",

    buttonText: buttonText.value.trim().slice(0, 40) || "Verify",

    method: "button",
  };
}

/* =========================================================
   CLIENT VALIDATION
========================================================= */

function validatePayload(payload) {
  /*
    These are also validated by
    the Arclume backend.
  */

  if (payload.enabled && !payload.verifiedRole) {
    throw new Error("Select a Verified Role before enabling Verification.");
  }

  if (payload.enabled && !payload.verificationChannel) {
    throw new Error(
      "Select a Verification Channel before enabling Verification.",
    );
  }

  const role = availableRoles.find((item) => item.id === payload.verifiedRole);

  if (payload.verifiedRole && role && role.assignable === false) {
    throw new Error("Arclume cannot assign the selected Verified Role.");
  }

  const unverified = availableRoles.find(
    (item) => item.id === payload.unverifiedRole,
  );

  if (payload.unverifiedRole && unverified && unverified.assignable === false) {
    throw new Error("Arclume cannot manage the selected Unverified Role.");
  }
}

/* =========================================================
   SAVE
========================================================= */

async function saveSettings() {
  if (saving || !currentGuild) {
    return;
  }

  saving = true;

  saveButton.disabled = true;

  saveButton.textContent = "SAVING…";

  saveStatus.textContent = "Saving Verification settings…";

  try {
    const payload = buildPayload();

    validatePayload(payload);

    const response = await fetch(`/api/guild/${currentGuild.id}/verification`, {
      method: "PUT",

      credentials: "same-origin",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not save Verification settings.");
    }

    currentSettings = data.settings || payload;

    applySettings();

    toast("VERIFICATION SETTINGS SAVED");
  } catch (error) {
    console.error("Verification save error:", error);

    saveStatus.textContent = "Save failed.";

    toast(error.message || "Could not save Verification settings.", true);
  } finally {
    saving = false;

    saveButton.disabled = false;

    saveButton.textContent = "SAVE CHANGES";
  }
}

saveButton.addEventListener("click", saveSettings);

/* =========================================================
   RELOAD
========================================================= */

reloadButton.addEventListener("click", async () => {
  if (dirty && !confirm("Discard unsaved Verification changes?")) {
    return;
  }

  await loadGuildData();

  toast("VERIFICATION RELOADED");
});

/* =========================================================
   UNSAVED CHANGES
========================================================= */

window.addEventListener("beforeunload", (event) => {
  if (!dirty) {
    return;
  }

  event.preventDefault();

  event.returnValue = "";
});

/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeServerSelector();
  }

  /*
      Ctrl + S saves settings instead
      of opening browser Save As.
    */

  if (event.ctrlKey && event.key.toLowerCase() === "s") {
    event.preventDefault();

    saveSettings();
  }
});

/* =========================================================
   BOOT
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
          "Arclume could not find a Discord server this account can manage.";
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

    verificationApp.classList.remove("hidden");
  } catch (error) {
    console.error("Verification boot error:", error);

    loadingState.classList.add("hidden");

    loginState.classList.remove("hidden");

    toast("Could not start Verification.", true);
  }
}

/* =========================================================
   START
========================================================= */

updatePreview();

boot();
