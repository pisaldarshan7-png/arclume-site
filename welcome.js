/* =====================================================
   ARCLUME — WELCOME FLOW
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

const goodbyeEnabled = document.getElementById("goodbyeEnabled");

const goodbyeChannel = document.getElementById("goodbyeChannel");

const goodbyeTitle = document.getElementById("goodbyeTitle");

const goodbyeMessage = document.getElementById("goodbyeMessage");

const saveWelcome = document.getElementById("saveWelcome");

const testWelcome = document.getElementById("testWelcome");

const testGoodbye = document.getElementById("testGoodbye");

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
   DEFAULTS
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

function showSavedState() {
  if (saveStatus) {
    saveStatus.textContent = "No unsaved changes";
  }
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
   SERVER DISPLAY
===================================================== */

function updateGuild(guild) {
  if (serverName) {
    serverName.textContent = guild.name;
  }

  if (!serverIcon) {
    return;
  }

  serverIcon.innerHTML = "";

  if (guild.icon) {
    const image = document.createElement("img");

    image.src = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`;

    image.alt = guild.name || "";

    serverIcon.appendChild(image);
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
    saveStatus.textContent = "No manageable server";

    return false;
  }

  const selectedGuildID = localStorage.getItem("arclume-selected-guild");

  const guild = guilds.find((item) => item.id === selectedGuildID) || guilds[0];

  currentGuildID = guild.id;

  currentGuildName = guild.name;

  localStorage.setItem("arclume-selected-guild", guild.id);

  updateGuild(guild);

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

    connectionText.textContent = data.botOnline
      ? "SYSTEM ONLINE"
      : "SYSTEM OFFLINE";
  } catch {
    connectionText.textContent = "CONNECTION ERROR";
  }
}

/* =====================================================
   DROPDOWNS
===================================================== */

function fillChannels(channels, selectedWelcome = "", selectedGoodbye = "") {
  welcomeChannel.innerHTML = `
    <option value="">
      Select a channel
    </option>
  `;

  goodbyeChannel.innerHTML = `
    <option value="">
      Same as Welcome Channel
    </option>
  `;

  for (const channel of channels) {
    const option1 = document.createElement("option");

    option1.value = channel.id;

    option1.textContent = `# ${channel.name}`;

    welcomeChannel.appendChild(option1);

    const option2 = document.createElement("option");

    option2.value = channel.id;

    option2.textContent = `# ${channel.name}`;

    goodbyeChannel.appendChild(option2);
  }

  welcomeChannel.value = selectedWelcome || "";

  goodbyeChannel.value = selectedGoodbye || "";
}

function fillRoles(roles, selected = "") {
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

  autoRole.value = selected || "";
}

/* =====================================================
   LOAD DISCORD OPTIONS
===================================================== */

async function loadDiscordOptions(preserve = true) {
  if (!currentGuildID) {
    return;
  }

  const oldWelcome = preserve ? welcomeChannel.value : "";

  const oldGoodbye = preserve ? goodbyeChannel.value : "";

  const oldRole = preserve ? autoRole.value : "";

  refreshDiscordData.disabled = true;

  refreshDiscordData.textContent = "REFRESHING...";

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

    if (data.guild) {
      currentGuildName = data.guild.name;

      updateGuild(data.guild);
    }

    fillChannels(
      Array.isArray(data.channels) ? data.channels : [],
      oldWelcome,
      oldGoodbye,
    );

    fillRoles(Array.isArray(data.roles) ? data.roles : [], oldRole);
  } catch (error) {
    console.error("Welcome Discord data error:", error);

    saveStatus.textContent = error.message;
  } finally {
    refreshDiscordData.disabled = false;

    refreshDiscordData.textContent = "REFRESH";
  }
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

  welcomeEnabled.checked = Boolean(config.enabled);

  welcomeTitle.value = config.title;

  welcomeMessage.value = config.message;

  showAvatar.checked = config.showAvatar !== false;

  goodbyeEnabled.checked = Boolean(config.goodbyeEnabled);

  goodbyeTitle.value = config.goodbyeTitle;

  goodbyeMessage.value = config.goodbyeMessage;

  welcomeChannel.value = config.welcomeChannel || "";

  autoRole.value = config.autoRole || "";

  goodbyeChannel.value = config.goodbyeChannel || "";

  updateInterface();

  savedState = clone(getCurrentSettings());

  showSavedState();
}

/* =====================================================
   LOAD SETTINGS
===================================================== */

async function loadWelcomeSettings() {
  loading = true;

  try {
    const response = await fetch(`/api/guild/${currentGuildID}/welcome`, {
      credentials: "same-origin",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not load settings.");
    }

    const settings = data.settings || defaultSettings();

    await loadDiscordOptions(false);

    applySettings(settings);
  } catch (error) {
    console.error("Welcome load error:", error);

    saveStatus.textContent = error.message;
  } finally {
    loading = false;
  }
}

/* =====================================================
   SAVE
===================================================== */

async function saveWelcomeSettings() {
  if (!currentGuildID) {
    return;
  }

  const settings = getCurrentSettings();

  if (settings.enabled && !settings.welcomeChannel) {
    saveStatus.textContent = "Select a Welcome Channel first";

    return;
  }

  const old = saveWelcome.innerHTML;

  saveWelcome.disabled = true;

  saveWelcome.innerHTML = `
    <span>Saving...</span>
    <span>...</span>
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

    saveStatus.textContent = "Settings saved";
  } catch (error) {
    saveStatus.textContent = error.message;

    saveWelcome.innerHTML = `
      <span>Save Failed</span>
      <span>!</span>
    `;
  }

  setTimeout(() => {
    saveWelcome.innerHTML = old;

    saveWelcome.disabled = false;
  }, 1400);
}

/* =====================================================
   TEST WELCOME
===================================================== */

async function sendTestWelcome() {
  const channelID = welcomeChannel.value;

  if (!channelID) {
    saveStatus.textContent = "Select a Welcome Channel first";

    welcomeChannel.focus();

    return;
  }

  const original = testWelcome.textContent;

  testWelcome.disabled = true;

  testWelcome.textContent = "SENDING...";

  try {
    const payload = getCurrentSettings();

    const response = await fetch(`/api/guild/${currentGuildID}/welcome/test`, {
      method: "POST",

      credentials: "same-origin",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not send test welcome.");
    }

    testWelcome.textContent = "TEST SENT ✓";

    saveStatus.textContent = "Test welcome sent to Discord";
  } catch (error) {
    testWelcome.textContent = "TEST FAILED";

    saveStatus.textContent = error.message;
  }

  setTimeout(() => {
    testWelcome.disabled = false;

    testWelcome.textContent = original;
  }, 1600);
}

/* =====================================================
   TEST GOODBYE

   Uses the existing Welcome test endpoint.
   We simply send the Goodbye title/message as
   the temporary test embed.
===================================================== */

async function sendTestGoodbye() {
  const channelID = goodbyeChannel.value || welcomeChannel.value;

  if (!channelID) {
    saveStatus.textContent = "Select a Welcome or Goodbye Channel first";

    return;
  }

  const original = testGoodbye.textContent;

  testGoodbye.disabled = true;

  testGoodbye.textContent = "SENDING...";

  try {
    const current = getCurrentSettings();

    const testPayload = {
      ...current,

      /*
        Existing backend test route sends to
        welcomeChannel, so temporarily point it
        to the Goodbye Channel.
      */

      welcomeChannel: channelID,

      title: cleanText(goodbyeTitle.value) || "Member Left",

      message:
        cleanText(goodbyeMessage.value) ||
        "**{username}** has left **{server}**.",

      showAvatar: true,
    };

    const response = await fetch(`/api/guild/${currentGuildID}/welcome/test`, {
      method: "POST",

      credentials: "same-origin",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(testPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not send test goodbye.");
    }

    testGoodbye.textContent = "TEST SENT ✓";

    saveStatus.textContent = "Test goodbye sent to Discord";
  } catch (error) {
    console.error("Goodbye test error:", error);

    testGoodbye.textContent = "TEST FAILED";

    saveStatus.textContent = error.message;
  }

  setTimeout(() => {
    testGoodbye.disabled = false;

    testGoodbye.textContent = original;
  }, 1600);
}

/* =====================================================
   EVENTS
===================================================== */

welcomeEnabled.addEventListener("change", () => {
  updateInterface();

  updateSaveState();
});

goodbyeEnabled.addEventListener("change", updateSaveState);

showAvatar.addEventListener("change", updateSaveState);

[welcomeChannel, goodbyeChannel, autoRole].forEach((element) => {
  element.addEventListener("change", updateSaveState);
});

[welcomeTitle, welcomeMessage, goodbyeTitle, goodbyeMessage].forEach(
  (element) => {
    element.addEventListener("input", updateSaveState);
  },
);

refreshDiscordData.addEventListener("click", async () => {
  await loadDiscordOptions(true);

  updateSaveState();
});

saveWelcome.addEventListener("click", saveWelcomeSettings);

testWelcome.addEventListener("click", sendTestWelcome);

testGoodbye.addEventListener("click", sendTestGoodbye);

/* =====================================================
   START
===================================================== */

async function startWelcome() {
  try {
    updateInterface();

    const ready = await loadAccount();

    await loadStatus();

    if (ready) {
      await loadWelcomeSettings();
    }

    console.log("✅ Arclume Welcome Flow ready");
  } catch (error) {
    console.error("Welcome startup error:", error);

    saveStatus.textContent = "Welcome Flow startup failed";
  }
}

startWelcome();
