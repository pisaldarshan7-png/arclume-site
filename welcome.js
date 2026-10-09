/* =====================================================
   ARCLUME — WELCOME SYSTEM
===================================================== */

/* =====================================================
   ELEMENTS
===================================================== */

const connectionText = document.getElementById("connectionText");

const serverName = document.getElementById("serverName");

const serverIcon = document.getElementById("serverIcon");

const systemStatus = document.getElementById("systemStatus");

const welcomeEnabled = document.getElementById("welcomeEnabled");

const welcomeStatusText = document.getElementById("welcomeStatusText");

const welcomeChannel = document.getElementById("welcomeChannel");

const autoRole = document.getElementById("autoRole");

const refreshDiscordData = document.getElementById("refreshDiscordData");

const welcomeTitle = document.getElementById("welcomeTitle");

const welcomeMessage = document.getElementById("welcomeMessage");

const showAvatar = document.getElementById("showAvatar");

const previewTitle = document.getElementById("previewTitle");

const previewMessage = document.getElementById("previewMessage");

const previewMemberAvatar = document.getElementById("previewMemberAvatar");

const goodbyeEnabled = document.getElementById("goodbyeEnabled");

const goodbyeChannel = document.getElementById("goodbyeChannel");

const goodbyeTitle = document.getElementById("goodbyeTitle");

const goodbyeMessage = document.getElementById("goodbyeMessage");

const saveWelcome = document.getElementById("saveWelcome");

const testWelcome = document.getElementById("testWelcome");

const saveStatus = document.getElementById("saveStatus");

/* =====================================================
   STATE
===================================================== */

let currentGuildID = null;

let currentGuildName = "Your Server";

let currentUser = null;

let savedState = null;

let loading = false;

/* =====================================================
   DEFAULT SETTINGS
===================================================== */

function defaultSettings() {
  return {
    enabled: false,

    welcomeChannel: "",

    title: "Welcome to {server}!",

    message: "Welcome {user} to **{server}**! You are member #{membercount}.",

    showAvatar: true,

    autoRole: "",

    goodbyeEnabled: false,

    goodbyeChannel: "",

    goodbyeTitle: "Member Left",

    goodbyeMessage: "**{username}** has left **{server}**.",
  };
}

/* =====================================================
   HELPERS
===================================================== */

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function cleanText(value) {
  return String(value || "").trim();
}

function avatarURL(user) {
  if (!user || !user.id || !user.avatar) {
    return "";
  }

  return (
    `https://cdn.discordapp.com/avatars/` +
    `${user.id}/${user.avatar}.png?size=128`
  );
}

/* =====================================================
   PREVIEW VARIABLES
===================================================== */

function replaceVariables(value) {
  let text = String(value || "");

  const username =
    currentUser?.global_name || currentUser?.username || "Member";

  const replacements = {
    "{user}": `@${username}`,

    "{username}": username,

    "{server}": currentGuildName || "Your Server",

    "{membercount}": "100",
  };

  for (const [variable, replacement] of Object.entries(replacements)) {
    text = text.split(variable).join(replacement);
  }

  return text;
}

/* =====================================================
   CURRENT SETTINGS
===================================================== */

function getCurrentSettings() {
  return {
    enabled: Boolean(welcomeEnabled?.checked),

    welcomeChannel: welcomeChannel?.value || "",

    title: cleanText(welcomeTitle?.value) || "Welcome to {server}!",

    message:
      cleanText(welcomeMessage?.value) ||
      "Welcome {user} to **{server}**! You are member #{membercount}.",

    showAvatar: Boolean(showAvatar?.checked),

    autoRole: autoRole?.value || "",

    goodbyeEnabled: Boolean(goodbyeEnabled?.checked),

    goodbyeChannel: goodbyeChannel?.value || "",

    goodbyeTitle: cleanText(goodbyeTitle?.value) || "Member Left",

    goodbyeMessage:
      cleanText(goodbyeMessage?.value) ||
      "**{username}** has left **{server}**.",
  };
}

/* =====================================================
   APPLY SETTINGS
===================================================== */

function applySettings(settings) {
  const defaults = defaultSettings();

  const config = {
    ...defaults,
    ...(settings || {}),
  };

  if (welcomeEnabled) {
    welcomeEnabled.checked = Boolean(config.enabled);
  }

  if (welcomeChannel) {
    welcomeChannel.value = config.welcomeChannel || "";
  }

  if (welcomeTitle) {
    welcomeTitle.value = config.title || defaults.title;
  }

  if (welcomeMessage) {
    welcomeMessage.value = config.message || defaults.message;
  }

  if (showAvatar) {
    showAvatar.checked = config.showAvatar !== false;
  }

  if (autoRole) {
    autoRole.value = config.autoRole || "";
  }

  if (goodbyeEnabled) {
    goodbyeEnabled.checked = Boolean(config.goodbyeEnabled);
  }

  if (goodbyeChannel) {
    goodbyeChannel.value = config.goodbyeChannel || "";
  }

  if (goodbyeTitle) {
    goodbyeTitle.value = config.goodbyeTitle || defaults.goodbyeTitle;
  }

  if (goodbyeMessage) {
    goodbyeMessage.value = config.goodbyeMessage || defaults.goodbyeMessage;
  }

  updateInterface();

  updatePreview();

  savedState = clone(getCurrentSettings());

  showSavedState();
}

/* =====================================================
   STATUS
===================================================== */

function updateInterface() {
  const enabled = Boolean(welcomeEnabled?.checked);

  if (welcomeStatusText) {
    welcomeStatusText.textContent = enabled ? "ACTIVE" : "DISABLED";
  }

  if (systemStatus) {
    systemStatus.textContent = enabled ? "ACTIVE" : "STANDBY";
  }
}

/* =====================================================
   PREVIEW
===================================================== */

function updatePreview() {
  if (previewTitle) {
    previewTitle.textContent = replaceVariables(
      welcomeTitle?.value || "Welcome to {server}!",
    );
  }

  if (previewMessage) {
    previewMessage.textContent = replaceVariables(
      welcomeMessage?.value ||
        "Welcome {user} to **{server}**! You are member #{membercount}.",
    );
  }

  if (previewMemberAvatar) {
    const shouldShow = Boolean(showAvatar?.checked);

    previewMemberAvatar.classList.toggle("visible", shouldShow);

    const imageURL = avatarURL(currentUser);

    if (shouldShow && imageURL) {
      previewMemberAvatar.innerHTML = `
        <img
          src="${imageURL}"
          alt=""
          style="
            width:100%;
            height:100%;
            object-fit:cover;
          "
        >
      `;
    } else if (shouldShow) {
      previewMemberAvatar.innerHTML = "";

      previewMemberAvatar.textContent = String(currentUser?.username || "M")
        .charAt(0)
        .toUpperCase();
    } else {
      previewMemberAvatar.innerHTML = "";
    }
  }
}

/* =====================================================
   SAVE STATE
===================================================== */

function showSavedState() {
  if (!saveStatus) {
    return;
  }

  saveStatus.textContent = "No unsaved changes";
}

function updateSaveState() {
  if (loading || !savedState || !saveStatus) {
    return;
  }

  const changed =
    JSON.stringify(getCurrentSettings()) !== JSON.stringify(savedState);

  saveStatus.textContent = changed ? "Unsaved changes" : "No unsaved changes";
}

/* =====================================================
   GUILD DISPLAY
===================================================== */

function updateGuild(guild) {
  if (serverName) {
    serverName.textContent = guild.name;
  }

  if (!serverIcon) {
    return;
  }

  if (guild.icon) {
    serverIcon.innerHTML = `
      <img
        src="https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128"
        alt=""
      >
    `;
  } else {
    serverIcon.textContent = String(guild.name || "A")
      .charAt(0)
      .toUpperCase();
  }
}

/* =====================================================
   LOAD ACCOUNT
===================================================== */

async function loadAccount() {
  const response = await fetch("/api/me", {
    credentials: "same-origin",
  });

  const data = await response.json();

  if (!response.ok || !data.loggedIn) {
    window.location.href = "/auth/discord";

    return false;
  }

  currentUser = data.user;

  const guilds = Array.isArray(data.guilds) ? data.guilds : [];

  if (!guilds.length) {
    if (saveStatus) {
      saveStatus.textContent = "No manageable Discord server";
    }

    return false;
  }

  const guild = guilds[0];

  currentGuildID = guild.id;

  currentGuildName = guild.name;

  updateGuild(guild);

  updatePreview();

  return true;
}

/* =====================================================
   BOT STATUS
===================================================== */

async function loadStatus() {
  try {
    const response = await fetch("/api/status", {
      credentials: "same-origin",
    });

    const data = await response.json();

    if (connectionText) {
      connectionText.textContent = data.botOnline
        ? "SYSTEM ONLINE"
        : "SYSTEM OFFLINE";
    }
  } catch {
    if (connectionText) {
      connectionText.textContent = "CONNECTION ERROR";
    }
  }
}

/* =====================================================
   CHANNEL DROPDOWNS
===================================================== */

function fillChannels(channels, selectedWelcome = "", selectedGoodbye = "") {
  if (!welcomeChannel || !goodbyeChannel) {
    return;
  }

  welcomeChannel.innerHTML = `
    <option value="">
      Select a channel
    </option>
  `;

  goodbyeChannel.innerHTML = `
    <option value="">
      Same as welcome channel
    </option>
  `;

  for (const channel of channels) {
    const welcomeOption = document.createElement("option");

    welcomeOption.value = channel.id;

    welcomeOption.textContent = `# ${channel.name}`;

    welcomeChannel.appendChild(welcomeOption);

    const goodbyeOption = document.createElement("option");

    goodbyeOption.value = channel.id;

    goodbyeOption.textContent = `# ${channel.name}`;

    goodbyeChannel.appendChild(goodbyeOption);
  }

  welcomeChannel.value = selectedWelcome || "";

  goodbyeChannel.value = selectedGoodbye || "";
}

/* =====================================================
   ROLE DROPDOWN
===================================================== */

function fillRoles(roles, selectedRole = "") {
  if (!autoRole) {
    return;
  }

  autoRole.innerHTML = `
    <option value="">
      No automatic role
    </option>
  `;

  for (const role of roles) {
    if (!role.assignable) {
      continue;
    }

    const option = document.createElement("option");

    option.value = role.id;

    option.textContent = `@${role.name}`;

    autoRole.appendChild(option);
  }

  autoRole.value = selectedRole || "";
}

/* =====================================================
   LOAD DISCORD CHANNELS + ROLES
===================================================== */

async function loadDiscordOptions(preserveSelections = true) {
  if (!currentGuildID) {
    return;
  }

  const selectedWelcome = preserveSelections ? welcomeChannel?.value || "" : "";

  const selectedGoodbye = preserveSelections ? goodbyeChannel?.value || "" : "";

  const selectedRole = preserveSelections ? autoRole?.value || "" : "";

  if (refreshDiscordData) {
    refreshDiscordData.disabled = true;

    refreshDiscordData.textContent = "REFRESHING...";
  }

  try {
    const response = await fetch(
      `/api/guild/${currentGuildID}/welcome-options`,
      {
        credentials: "same-origin",
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not load Discord data.");
    }

    if (data.guild?.name) {
      currentGuildName = data.guild.name;

      updateGuild(data.guild);
    }

    fillChannels(
      Array.isArray(data.channels) ? data.channels : [],
      selectedWelcome,
      selectedGoodbye,
    );

    fillRoles(Array.isArray(data.roles) ? data.roles : [], selectedRole);

    updatePreview();
  } catch (error) {
    console.error("Welcome Discord options error:", error);

    if (saveStatus) {
      saveStatus.textContent =
        error.message || "Could not load Discord channels and roles";
    }
  } finally {
    if (refreshDiscordData) {
      refreshDiscordData.disabled = false;

      refreshDiscordData.textContent = "REFRESH";
    }
  }
}

/* =====================================================
   LOAD SETTINGS
===================================================== */

async function loadWelcomeSettings() {
  if (!currentGuildID) {
    return;
  }

  loading = true;

  try {
    const response = await fetch(`/api/guild/${currentGuildID}/welcome`, {
      credentials: "same-origin",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not load Welcome settings.");
    }

    const settings = data.settings || defaultSettings();

    await loadDiscordOptions(false);

    applySettings(settings);
  } catch (error) {
    console.error("Welcome load error:", error);

    applySettings(defaultSettings());

    if (saveStatus) {
      saveStatus.textContent =
        error.message || "Could not load Welcome settings";
    }
  } finally {
    loading = false;
  }
}

/* =====================================================
   SAVE SETTINGS
===================================================== */

async function saveWelcomeSettings() {
  if (!currentGuildID || !saveWelcome) {
    return;
  }

  const settings = getCurrentSettings();

  if (settings.enabled && !settings.welcomeChannel) {
    saveStatus.textContent = "Select a Welcome Channel first";

    welcomeChannel?.focus();

    return;
  }

  const original = saveWelcome.innerHTML;

  saveWelcome.disabled = true;

  saveWelcome.innerHTML = `
    <span>Saving...</span>
    <span>···</span>
  `;

  try {
    const response = await fetch(`/api/guild/${currentGuildID}/welcome`, {
      method: "PUT",

      credentials: "same-origin",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(settings),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Save failed.");
    }

    applySettings(data.settings || settings);

    saveWelcome.innerHTML = `
      <span>Saved</span>
      <span>✓</span>
    `;

    saveStatus.textContent = "Saved to Arclume database";

    setTimeout(() => {
      saveWelcome.innerHTML = original;

      saveWelcome.disabled = false;

      showSavedState();
    }, 1200);
  } catch (error) {
    console.error("Welcome save error:", error);

    saveWelcome.innerHTML = `
      <span>Save failed</span>
      <span>!</span>
    `;

    saveStatus.textContent = error.message || "Save failed";

    setTimeout(() => {
      saveWelcome.innerHTML = original;

      saveWelcome.disabled = false;
    }, 1600);
  }
}

/* =====================================================
   SEND TEST WELCOME
===================================================== */

async function sendTestWelcome() {
  if (!currentGuildID || !testWelcome) {
    return;
  }

  if (!welcomeChannel?.value) {
    saveStatus.textContent = "Select a Welcome Channel first";

    welcomeChannel?.focus();

    return;
  }

  const originalText = testWelcome.textContent;

  testWelcome.disabled = true;

  testWelcome.textContent = "Sending...";

  try {
    const response = await fetch(`/api/guild/${currentGuildID}/welcome/test`, {
      method: "POST",

      credentials: "same-origin",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(getCurrentSettings()),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not send test message.");
    }

    testWelcome.textContent = "Test Sent ✓";

    saveStatus.textContent = "Test welcome sent to Discord";
  } catch (error) {
    console.error("Test Welcome error:", error);

    testWelcome.textContent = "Test Failed";

    saveStatus.textContent = error.message || "Test welcome failed";
  }

  setTimeout(() => {
    testWelcome.textContent = originalText;

    testWelcome.disabled = false;
  }, 1500);
}

/* =====================================================
   EVENTS
===================================================== */

function setupEvents() {
  welcomeEnabled?.addEventListener("change", () => {
    updateInterface();
    updateSaveState();
  });

  showAvatar?.addEventListener("change", () => {
    updatePreview();
    updateSaveState();
  });

  goodbyeEnabled?.addEventListener("change", updateSaveState);

  [welcomeChannel, autoRole, goodbyeChannel].forEach((element) => {
    element?.addEventListener("change", updateSaveState);
  });

  [welcomeTitle, welcomeMessage].forEach((element) => {
    element?.addEventListener("input", () => {
      updatePreview();
      updateSaveState();
    });
  });

  [goodbyeTitle, goodbyeMessage].forEach((element) => {
    element?.addEventListener("input", updateSaveState);
  });

  refreshDiscordData?.addEventListener("click", async () => {
    await loadDiscordOptions(true);

    updateSaveState();
  });

  saveWelcome?.addEventListener("click", saveWelcomeSettings);

  testWelcome?.addEventListener("click", sendTestWelcome);
}

/* =====================================================
   START
===================================================== */

async function startWelcomeSystem() {
  setupEvents();

  updateInterface();

  updatePreview();

  try {
    const accountReady = await loadAccount();

    await loadStatus();

    if (accountReady) {
      await loadWelcomeSettings();
    }

    console.log("✅ Arclume Welcome System ready");
  } catch (error) {
    console.error("Welcome startup error:", error);

    if (saveStatus) {
      saveStatus.textContent = "Welcome System startup failed";
    }
  }
}

startWelcomeSystem();
