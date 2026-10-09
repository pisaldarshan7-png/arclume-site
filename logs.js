/* =========================================================
   ARCLUME — SIGNAL LOG
========================================================= */

let currentUser = null;
let guilds = [];
let currentGuild = null;

let logs = [];
let channels = [];

let logSettings = defaultLogSettings();

let logsLoading = false;
let settingsSaving = false;

/* =========================================================
   DEFAULT SETTINGS
========================================================= */

function defaultLogSettings() {
  return {
    enabled: true,

    logChannel: "",

    memberEvents: true,

    roleEvents: true,

    messageEvents: true,

    moderationEvents: true,
  };
}

/* =========================================================
   ELEMENTS
========================================================= */

const loadingState = document.getElementById("loadingState");

const loginState = document.getElementById("loginState");

const logsApp = document.getElementById("logsApp");

const serverButton = document.getElementById("serverButton");

const serverIcon = document.getElementById("serverIcon");

const serverName = document.getElementById("serverName");

const serverOverlay = document.getElementById("serverOverlay");

const closeServerOverlay = document.getElementById("closeServerOverlay");

const serverList = document.getElementById("serverList");

const totalEventsStat = document.getElementById("totalEventsStat");

const memberEventsStat = document.getElementById("memberEventsStat");

const roleEventsStat = document.getElementById("roleEventsStat");

const moderationEventsStat = document.getElementById("moderationEventsStat");

const eventCountLabel = document.getElementById("eventCountLabel");

const logSearch = document.getElementById("logSearch");

const logFilter = document.getElementById("logFilter");

const refreshLogsButton = document.getElementById("refreshLogsButton");

const clearLogsButton = document.getElementById("clearLogsButton");

const logList = document.getElementById("logList");

const loggingEnabled = document.getElementById("loggingEnabled");

const logChannelSelect = document.getElementById("logChannelSelect");

const memberEventsToggle = document.getElementById("memberEventsToggle");

const roleEventsToggle = document.getElementById("roleEventsToggle");

const messageEventsToggle = document.getElementById("messageEventsToggle");

const moderationEventsToggle = document.getElementById(
  "moderationEventsToggle",
);

const logSettingsStatus = document.getElementById("logSettingsStatus");

const saveLogSettingsButton = document.getElementById("saveLogSettingsButton");

const toastElement = document.getElementById("toast");

/* =========================================================
   BASIC HELPERS
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

  element.replaceChildren();

  if (!url) {
    element.textContent = firstLetter(fallback);

    return;
  }

  const image = document.createElement("img");

  image.src = url;

  image.alt = fallback || "Discord";

  image.addEventListener(
    "error",

    () => {
      element.replaceChildren();

      element.textContent = firstLetter(fallback);
    },
  );

  element.appendChild(image);
}

/* =========================================================
   FETCH
========================================================= */

async function fetchJSON(url, options = {}) {
  const response = await fetch(
    url,

    {
      credentials: "same-origin",

      ...options,
    },
  );

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong.");
  }

  return data;
}

/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;

function toast(message, error = false) {
  if (!toastElement) {
    return;
  }

  toastElement.textContent = message;

  toastElement.classList.toggle("error", Boolean(error));

  toastElement.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(
    () => {
      toastElement.classList.remove("show");
    },

    2600,
  );
}

/* =========================================================
   EVENT CATEGORY
========================================================= */

function eventCategory(type) {
  if (type === "member_join" || type === "member_leave") {
    return "member";
  }

  if (type === "role_add" || type === "role_remove") {
    return "role";
  }

  if (type === "message_delete" || type === "message_edit") {
    return "message";
  }

  return "moderation";
}

/* =========================================================
   EVENT ICON
========================================================= */

function eventIcon(type) {
  const icons = {
    member_join: "IN",

    member_leave: "OUT",

    role_add: "+R",

    role_remove: "-R",

    message_delete: "DEL",

    message_edit: "EDIT",

    member_ban: "BAN",

    member_unban: "UN",

    timeout_add: "TO",

    timeout_update: "TO",

    timeout_remove: "OK",
  };

  return icons[type] || "LOG";
}

/* =========================================================
   EVENT LABEL
========================================================= */

function eventLabel(type) {
  const labels = {
    member_join: "MEMBER JOIN",

    member_leave: "MEMBER LEAVE",

    role_add: "ROLE ADDED",

    role_remove: "ROLE REMOVED",

    message_delete: "MESSAGE DELETE",

    message_edit: "MESSAGE EDIT",

    member_ban: "MEMBER BAN",

    member_unban: "MEMBER UNBAN",

    timeout_add: "TIMEOUT",

    timeout_update: "TIMEOUT UPDATE",

    timeout_remove: "TIMEOUT REMOVED",
  };

  return (
    labels[type] ||
    String(type || "EVENT")
      .replaceAll("_", " ")
      .toUpperCase()
  );
}

/* =========================================================
   TIME FORMAT
========================================================= */

function formatTime(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString([], {
    year: "numeric",

    month: "short",

    day: "2-digit",

    hour: "2-digit",

    minute: "2-digit",
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

  renderImage(
    serverIcon,

    guildIconURL(currentGuild),

    currentGuild.name,
  );
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

/* =========================================================
   SERVER LIST
========================================================= */

function renderServerList() {
  serverList.replaceChildren();

  guilds.forEach((guild) => {
    const button = document.createElement("button");

    button.type = "button";

    button.className =
      "server-choice" + (guild.id === currentGuild?.id ? " active" : "");

    const icon = document.createElement("span");

    icon.className = "server-choice-icon";

    renderImage(
      icon,

      guildIconURL(guild),

      guild.name,
    );

    const copy = document.createElement("span");

    const small = document.createElement("small");

    small.textContent = "DISCORD COMMUNITY";

    const strong = document.createElement("strong");

    strong.textContent = guild.name || "Discord Server";

    copy.appendChild(small);

    copy.appendChild(strong);

    const state = document.createElement("span");

    state.textContent = guild.id === currentGuild?.id ? "ACTIVE" : "SELECT";

    button.appendChild(icon);

    button.appendChild(copy);

    button.appendChild(state);

    button.addEventListener(
      "click",

      async () => {
        await selectGuild(guild.id);
      },
    );

    serverList.appendChild(button);
  });
}

/* =========================================================
   SELECT GUILD
========================================================= */

async function selectGuild(guildID) {
  const guild = guilds.find((item) => item.id === guildID);

  if (!guild) {
    return;
  }

  if (currentGuild?.id === guild.id) {
    closeServerSelector();

    return;
  }

  currentGuild = guild;

  localStorage.setItem(
    "arclume-selected-guild",

    guild.id,
  );

  logs = [];

  channels = [];

  logSettings = defaultLogSettings();

  logSearch.value = "";

  logFilter.value = "";

  renderServerIdentity();

  renderServerList();

  closeServerSelector();

  await loadSignalLog();

  toast(`SERVER → ${guild.name}`);
}

/* =========================================================
   LOAD LOG HISTORY
========================================================= */

async function loadLogs() {
  const data = await fetchJSON(
    `/api/guild/${currentGuild.id}/logs-manager/logs?limit=250`,
  );

  logs = Array.isArray(data.logs) ? data.logs : [];
}

/* =========================================================
   LOAD SETTINGS
========================================================= */

async function loadLogSettings() {
  const data = await fetchJSON(
    `/api/guild/${currentGuild.id}/logs-manager/settings`,
  );

  logSettings = {
    ...defaultLogSettings(),

    ...(data.settings || {}),
  };
}

/* =========================================================
   LOAD CHANNEL OPTIONS
========================================================= */

async function loadChannels() {
  const data = await fetchJSON(
    `/api/guild/${currentGuild.id}/logs-manager/options`,
  );

  channels = Array.isArray(data.channels) ? data.channels : [];
}

/* =========================================================
   STATISTICS
========================================================= */

function renderStats() {
  const memberCount = logs.filter(
    (log) => eventCategory(log.type) === "member",
  ).length;

  const roleCount = logs.filter(
    (log) => eventCategory(log.type) === "role",
  ).length;

  const moderationCount = logs.filter(
    (log) => eventCategory(log.type) === "moderation",
  ).length;

  totalEventsStat.textContent = logs.length;

  memberEventsStat.textContent = memberCount;

  roleEventsStat.textContent = roleCount;

  moderationEventsStat.textContent = moderationCount;
}

/* =========================================================
   FILTERED LOGS
========================================================= */

function getFilteredLogs() {
  const query = logSearch.value.trim().toLowerCase();

  const category = logFilter.value;

  return logs.filter((log) => {
    if (category && eventCategory(log.type) !== category) {
      return false;
    }

    if (!query) {
      return true;
    }

    const metadata =
      log.metadata && typeof log.metadata === "object"
        ? Object.values(log.metadata).join(" ")
        : "";

    const searchable = [
      log.title,
      log.details,
      log.type,
      log.targetID,
      log.actorID,
      log.channelID,
      log.roleID,
      metadata,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(query);
  });
}

/* =========================================================
   LOG META
========================================================= */

function appendMeta(container, text) {
  if (!text) {
    return;
  }

  const item = document.createElement("span");

  item.textContent = text;

  container.appendChild(item);
}

/* =========================================================
   RENDER LOGS
========================================================= */

function renderLogs() {
  logList.replaceChildren();

  const visibleLogs = getFilteredLogs();

  eventCountLabel.textContent = `${visibleLogs.length} of ${logs.length} recent signal${
    logs.length === 1 ? "" : "s"
  } shown`;

  if (!visibleLogs.length) {
    const empty = document.createElement("div");

    empty.className = "log-empty";

    empty.textContent = logs.length
      ? "No signals match this filter."
      : "No Signal Log activity has been recorded yet.";

    logList.appendChild(empty);

    return;
  }

  visibleLogs.forEach((log) => {
    const row = document.createElement("article");

    row.className = "log-row";

    const icon = document.createElement("div");

    icon.className = "log-icon";

    icon.textContent = eventIcon(log.type);

    const main = document.createElement("div");

    main.className = "log-main";

    const titleLine = document.createElement("div");

    titleLine.className = "log-title-line";

    const title = document.createElement("span");

    title.className = "log-title";

    title.textContent = log.title || eventLabel(log.type);

    const type = document.createElement("span");

    type.className = "log-type";

    type.textContent = eventLabel(log.type);

    titleLine.appendChild(title);

    titleLine.appendChild(type);

    const details = document.createElement("p");

    details.className = "log-details";

    details.textContent = log.details || "Server activity recorded.";

    const meta = document.createElement("div");

    meta.className = "log-meta";

    if (log.metadata?.username) {
      appendMeta(
        meta,

        `USER / ${log.metadata.username}`,
      );
    }

    if (log.metadata?.roleName) {
      appendMeta(
        meta,

        `ROLE / ${log.metadata.roleName}`,
      );
    }

    if (log.channelID) {
      appendMeta(
        meta,

        `CHANNEL / ${log.channelID}`,
      );
    }

    if (log.targetID) {
      appendMeta(
        meta,

        `TARGET / ${log.targetID}`,
      );
    }

    main.appendChild(titleLine);

    main.appendChild(details);

    main.appendChild(meta);

    const time = document.createElement("time");

    time.className = "log-time";

    time.textContent = formatTime(log.createdAt);

    row.appendChild(icon);

    row.appendChild(main);

    row.appendChild(time);

    logList.appendChild(row);
  });
}

/* =========================================================
   CHANNEL SELECT
========================================================= */

function renderChannelOptions() {
  logChannelSelect.replaceChildren();

  const none = document.createElement("option");

  none.value = "";

  none.textContent = "Dashboard only";

  logChannelSelect.appendChild(none);

  channels.forEach((channel) => {
    const option = document.createElement("option");

    option.value = channel.id;

    if (channel.type === "announcement") {
      option.textContent = `📢 ${channel.name}`;
    } else {
      option.textContent = `# ${channel.name}`;
    }

    logChannelSelect.appendChild(option);
  });

  const exists = channels.some(
    (channel) => channel.id === logSettings.logChannel,
  );

  logChannelSelect.value = exists ? logSettings.logChannel : "";
}

/* =========================================================
   RENDER SETTINGS
========================================================= */

function renderSettings() {
  loggingEnabled.checked = logSettings.enabled !== false;

  memberEventsToggle.checked = logSettings.memberEvents !== false;

  roleEventsToggle.checked = logSettings.roleEvents !== false;

  messageEventsToggle.checked = logSettings.messageEvents !== false;

  moderationEventsToggle.checked = logSettings.moderationEvents !== false;

  renderChannelOptions();

  logSettingsStatus.textContent = "SIGNAL SETTINGS LOADED";
}

/* =========================================================
   SAVE SETTINGS
========================================================= */

async function saveSettings() {
  if (!currentGuild || settingsSaving) {
    return;
  }

  settingsSaving = true;

  saveLogSettingsButton.disabled = true;

  saveLogSettingsButton.textContent = "SAVING…";

  logSettingsStatus.textContent = "SAVING SIGNAL SETTINGS…";

  try {
    const data = await fetchJSON(
      `/api/guild/${currentGuild.id}/logs-manager/settings`,

      {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          enabled: loggingEnabled.checked,

          logChannel: logChannelSelect.value,

          memberEvents: memberEventsToggle.checked,

          roleEvents: roleEventsToggle.checked,

          messageEvents: messageEventsToggle.checked,

          moderationEvents: moderationEventsToggle.checked,
        }),
      },
    );

    logSettings = {
      ...defaultLogSettings(),

      ...(data.settings || {}),
    };

    renderSettings();

    logSettingsStatus.textContent = "SIGNAL SETTINGS SAVED";

    toast("SIGNAL SETTINGS SAVED");
  } catch (error) {
    console.error("Signal settings save error:", error);

    logSettingsStatus.textContent = error.message || "COULD NOT SAVE SETTINGS";

    toast(error.message || "Could not save Signal settings.", true);
  } finally {
    settingsSaving = false;

    saveLogSettingsButton.disabled = false;

    saveLogSettingsButton.textContent = "SAVE SIGNAL SETTINGS";
  }
}

/* =========================================================
   CLEAR HISTORY
========================================================= */

async function clearHistory() {
  if (!currentGuild) {
    return;
  }

  const confirmed = window.confirm(
    "Clear the Signal Log history for this server?",
  );

  if (!confirmed) {
    return;
  }

  clearLogsButton.disabled = true;

  clearLogsButton.textContent = "CLEARING…";

  try {
    const data = await fetchJSON(
      `/api/guild/${currentGuild.id}/logs-manager/logs`,

      {
        method: "DELETE",
      },
    );

    logs = [];

    renderStats();

    renderLogs();

    toast(`${data.deleted || 0} SIGNALS CLEARED`);
  } catch (error) {
    console.error("Signal history clear error:", error);

    toast(error.message || "Could not clear Signal history.", true);
  } finally {
    clearLogsButton.disabled = false;

    clearLogsButton.textContent = "CLEAR HISTORY";
  }
}

/* =========================================================
   LOAD SIGNAL LOG
========================================================= */

async function loadSignalLog() {
  if (!currentGuild || logsLoading) {
    return;
  }

  logsLoading = true;

  refreshLogsButton.disabled = true;

  refreshLogsButton.textContent = "LOADING…";

  eventCountLabel.textContent = "Loading activity history…";

  logSettingsStatus.textContent = "LOADING SIGNAL SETTINGS…";

  /*
    Logs load first.

    Settings/channels cannot stop
    the timeline from opening.
  */

  try {
    await loadLogs();

    renderStats();

    renderLogs();
  } catch (error) {
    console.error("Signal history load error:", error);

    logs = [];

    renderStats();

    renderLogs();

    eventCountLabel.textContent =
      error.message || "Could not load activity history.";

    toast(error.message || "Could not load Signal Log history.", true);
  }

  /*
    Settings are independent.
  */

  const extraResults = await Promise.allSettled([
    loadLogSettings(),
    loadChannels(),
  ]);

  const settingsResult = extraResults[0];

  const channelResult = extraResults[1];

  if (settingsResult.status === "rejected") {
    console.error("Signal settings error:", settingsResult.reason);

    logSettings = defaultLogSettings();

    logSettingsStatus.textContent = "SIGNAL SETTINGS UNAVAILABLE";
  }

  if (channelResult.status === "rejected") {
    console.error("Signal channel error:", channelResult.reason);

    channels = [];
  }

  renderSettings();

  if (settingsResult.status === "fulfilled") {
    logSettingsStatus.textContent = "SIGNAL SETTINGS LOADED";
  }

  logsLoading = false;

  refreshLogsButton.disabled = false;

  refreshLogsButton.textContent = "REFRESH";
}

/* =========================================================
   EVENTS
========================================================= */

serverButton.addEventListener(
  "click",

  openServerSelector,
);

closeServerOverlay.addEventListener(
  "click",

  closeServerSelector,
);

serverOverlay.addEventListener(
  "click",

  (event) => {
    if (event.target === serverOverlay) {
      closeServerSelector();
    }
  },
);

logSearch.addEventListener(
  "input",

  renderLogs,
);

logFilter.addEventListener(
  "change",

  renderLogs,
);

refreshLogsButton.addEventListener(
  "click",

  async () => {
    await loadSignalLog();

    toast("SIGNAL LOG REFRESHED");
  },
);

clearLogsButton.addEventListener(
  "click",

  clearHistory,
);

saveLogSettingsButton.addEventListener(
  "click",

  saveSettings,
);

document.addEventListener(
  "keydown",

  (event) => {
    if (event.key === "Escape") {
      closeServerSelector();
    }
  },
);

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

      const title = loginState.querySelector("h1");

      const copy = loginState.querySelector("p");

      if (title) {
        title.textContent = "No manageable server.";
      }

      if (copy) {
        copy.textContent =
          "Arclume could not find a Discord server this account can manage.";
      }

      return;
    }

    const savedGuildID = localStorage.getItem("arclume-selected-guild");

    currentGuild =
      guilds.find((guild) => guild.id === savedGuildID) || guilds[0];

    localStorage.setItem(
      "arclume-selected-guild",

      currentGuild.id,
    );

    renderServerIdentity();

    renderServerList();

    /*
      Show dashboard before requests.

      This prevents the page from
      getting stuck on boot.
    */

    loadingState.classList.add("hidden");

    loginState.classList.add("hidden");

    logsApp.classList.remove("hidden");

    await loadSignalLog();
  } catch (error) {
    console.error("Signal Log boot error:", error);

    loadingState.classList.add("hidden");

    loginState.classList.remove("hidden");

    toast(error.message || "Could not start Signal Log.", true);
  }
}

/* =========================================================
   START
========================================================= */

boot();
