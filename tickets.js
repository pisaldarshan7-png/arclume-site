/* =========================================================
   ARCLUME — TICKET RELAY DASHBOARD
========================================================= */
let guilds = [];
let currentGuild = null;
let ticketSettings = defaultTicketSettings();
let channels = [];
let categories = [];
let roles = [];
let saving = false;
let publishing = false;
/* =========================================================
   DEFAULT SETTINGS
========================================================= */
function defaultTicketSettings() {
  return {
    enabled: false,
    categoryID: "",
    panelChannel: "",
    panelMessageID: "",
    logChannel: "",
    supportRoles: [],
    panelTitle:
      "Support Tickets",
    panelMessage:
      "Need help? Open a private ticket and our staff will assist you.",
    buttonLabel:
      "Open Ticket",
    ticketPrefix:
      "ticket",
  };
}
/* =========================================================
   ELEMENTS
========================================================= */
const loadingState =
  document.getElementById(
    "loadingState",
  );
const loginState =
  document.getElementById(
    "loginState",
  );
const ticketsApp =
  document.getElementById(
    "ticketsApp",
  );
const serverButton =
  document.getElementById(
    "serverButton",
  );
const serverIcon =
  document.getElementById(
    "serverIcon",
  );
const serverName =
  document.getElementById(
    "serverName",
  );
const serverOverlay =
  document.getElementById(
    "serverOverlay",
  );
const closeServerOverlay =
  document.getElementById(
    "closeServerOverlay",
  );
const serverList =
  document.getElementById(
    "serverList",
  );
const relayStateStat =
  document.getElementById(
    "relayStateStat",
  );
const supportRoleCountStat =
  document.getElementById(
    "supportRoleCountStat",
  );
const panelChannelStat =
  document.getElementById(
    "panelChannelStat",
  );
const panelStateStat =
  document.getElementById(
    "panelStateStat",
  );
const ticketsEnabled =
  document.getElementById(
    "ticketsEnabled",
  );
const categorySelect =
  document.getElementById(
    "categorySelect",
  );
const panelChannelSelect =
  document.getElementById(
    "panelChannelSelect",
  );
const logChannelSelect =
  document.getElementById(
    "logChannelSelect",
  );
const ticketPrefix =
  document.getElementById(
    "ticketPrefix",
  );
const supportRoleList =
  document.getElementById(
    "supportRoleList",
  );
const panelTitle =
  document.getElementById(
    "panelTitle",
  );
const panelMessage =
  document.getElementById(
    "panelMessage",
  );
const buttonLabel =
  document.getElementById(
    "buttonLabel",
  );
const previewTitle =
  document.getElementById(
    "previewTitle",
  );
const previewMessage =
  document.getElementById(
    "previewMessage",
  );
const previewButton =
  document.getElementById(
    "previewButton",
  );
const ticketSettingsStatus =
  document.getElementById(
    "ticketSettingsStatus",
  );
const saveTicketSettingsButton =
  document.getElementById(
    "saveTicketSettingsButton",
  );
const publishPanelButton =
  document.getElementById(
    "publishPanelButton",
  );
const toastElement =
  document.getElementById(
    "toast",
  );
/* =========================================================
   HELPERS
========================================================= */
function firstLetter(value) {
  return String(
    value || "A",
  )
    .trim()
    .charAt(0)
    .toUpperCase();
}
function guildIconURL(guild) {
  if (
    !guild?.id ||
    !guild?.icon
  ) {
    return null;
  }
  return (
    `https://cdn.discordapp.com/icons/` +
    `${guild.id}/${guild.icon}.png?size=128`
  );
}
function renderImage(
  element,
  url,
  fallback,
) {
  if (!element) {
    return;
  }
  element.replaceChildren();
  if (!url) {
    element.textContent =
      firstLetter(
        fallback,
      );
    return;
  }
  const image =
    document.createElement(
      "img",
    );
  image.src =
    url;
  image.alt =
    fallback ||
    "Discord";
  image.addEventListener(
    "error",
    () => {
      element.replaceChildren();
      element.textContent =
        firstLetter(
          fallback,
        );
    },
  );
  element.appendChild(
    image,
  );
}
/* =========================================================
   FETCH
========================================================= */
async function fetchJSON(
  url,
  options = {},
) {
  const response =
    await fetch(
      url,
      {
        credentials:
          "same-origin",
        ...options,
      },
    );
  let data = {};
  try {
    data =
      await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    throw new Error(
      data.error ||
      "Something went wrong.",
    );
  }
  return data;
}
/* =========================================================
   TOAST
========================================================= */
let toastTimer = null;
function toast(
  message,
  error = false,
) {
  if (!toastElement) {
    return;
  }
  toastElement.textContent =
    message;
  toastElement.classList.toggle(
    "error",
    Boolean(error),
  );
  toastElement.classList.add(
    "show",
  );
  clearTimeout(
    toastTimer,
  );
  toastTimer =
    setTimeout(
      () => {
        toastElement
          .classList
          .remove(
            "show",
          );
      },
      2600,
    );
}
/* =========================================================
   SERVER IDENTITY
========================================================= */
function renderServerIdentity() {
  if (!currentGuild) {
    return;
  }
  serverName.textContent =
    currentGuild.name ||
    "Discord Server";
  renderImage(
    serverIcon,
    guildIconURL(
      currentGuild,
    ),
    currentGuild.name,
  );
}
/* =========================================================
   SERVER OVERLAY
========================================================= */
function openServerOverlay() {
  serverOverlay
    .classList
    .remove(
      "hidden",
    );
  document.body
    .style
    .overflow =
    "hidden";
}
function closeServerSelector() {
  serverOverlay
    .classList
    .add(
      "hidden",
    );
  document.body
    .style
    .overflow =
    "";
}
/* =========================================================
   SERVER LIST
========================================================= */
function renderServerList() {
  serverList.replaceChildren();
  guilds.forEach(
    (guild) => {
      const button =
        document.createElement(
          "button",
        );
      button.type =
        "button";
      button.className =
        "server-choice" +
        (
          guild.id ===
          currentGuild?.id
            ? " active"
            : ""
        );
      const icon =
        document.createElement(
          "span",
        );
      icon.className =
        "server-choice-icon";
      renderImage(
        icon,
        guildIconURL(
          guild,
        ),
        guild.name,
      );
      const copy =
        document.createElement(
          "span",
        );
      const small =
        document.createElement(
          "small",
        );
      small.textContent =
        "DISCORD COMMUNITY";
      const strong =
        document.createElement(
          "strong",
        );
      strong.textContent =
        guild.name ||
        "Discord Server";
      copy.appendChild(
        small,
      );
      copy.appendChild(
        strong,
      );
      const state =
        document.createElement(
          "span",
        );
      state.textContent =
        guild.id ===
        currentGuild?.id
          ? "ACTIVE"
          : "SELECT";
      button.appendChild(
        icon,
      );
      button.appendChild(
        copy,
      );
      button.appendChild(
        state,
      );
      button.addEventListener(
        "click",
        async () => {
          await selectGuild(
            guild.id,
          );
        },
      );
      serverList.appendChild(
        button,
      );
    },
  );
}
/* =========================================================
   SELECT GUILD
========================================================= */
async function selectGuild(
  guildID,
) {
  const guild =
    guilds.find(
      (item) =>
        item.id ===
        guildID,
    );
  if (!guild) {
    return;
  }
  if (
    currentGuild?.id ===
    guild.id
  ) {
    closeServerSelector();
    return;
  }
  currentGuild =
    guild;
  localStorage.setItem(
    "arclume-selected-guild",
    guild.id,
  );
  ticketSettings =
    defaultTicketSettings();
  channels = [];
  categories = [];
  roles = [];
  renderServerIdentity();
  renderServerList();
  closeServerSelector();
  await loadTicketSystem();
  toast(
    `SERVER → ${guild.name}`,
  );
}
/* =========================================================
   LOAD SETTINGS
========================================================= */
async function loadSettings() {
  const data =
    await fetchJSON(
      `/api/guild/${currentGuild.id}/tickets/settings`,
    );
  ticketSettings = {
    ...defaultTicketSettings(),
    ...(data.settings || {}),
  };
}
/* =========================================================
   LOAD OPTIONS
========================================================= */
async function loadOptions() {
  const data =
    await fetchJSON(
      `/api/guild/${currentGuild.id}/tickets/options`,
    );
  channels =
    Array.isArray(
      data.channels,
    )
      ? data.channels
      : [];
  categories =
    Array.isArray(
      data.categories,
    )
      ? data.categories
      : [];
  roles =
    Array.isArray(
      data.roles,
    )
      ? data.roles
      : [];
}
/* =========================================================
   OPTION HELPERS
========================================================= */
function createOption(
  value,
  label,
) {
  const option =
    document.createElement(
      "option",
    );
  option.value =
    value;
  option.textContent =
    label;
  return option;
}
/* =========================================================
   CATEGORY SELECT
========================================================= */
function renderCategories() {
  categorySelect
    .replaceChildren();
  categorySelect.appendChild(
    createOption(
      "",
      "No category",
    ),
  );
  categories.forEach(
    (category) => {
      categorySelect.appendChild(
        createOption(
          category.id,
          category.name,
        ),
      );
    },
  );
  const valid =
    categories.some(
      (category) =>
        category.id ===
        ticketSettings.categoryID,
    );
  categorySelect.value =
    valid
      ? ticketSettings.categoryID
      : "";
}
/* =========================================================
   CHANNEL SELECTS
========================================================= */
function renderChannels() {
  panelChannelSelect
    .replaceChildren();
  logChannelSelect
    .replaceChildren();
  panelChannelSelect.appendChild(
    createOption(
      "",
      "Select channel",
    ),
  );
  logChannelSelect.appendChild(
    createOption(
      "",
      "No log channel",
    ),
  );
  channels.forEach(
    (channel) => {
      panelChannelSelect.appendChild(
        createOption(
          channel.id,
          `# ${channel.name}`,
        ),
      );
      logChannelSelect.appendChild(
        createOption(
          channel.id,
          `# ${channel.name}`,
        ),
      );
    },
  );
  const panelExists =
    channels.some(
      (channel) =>
        channel.id ===
        ticketSettings.panelChannel,
    );
  const logExists =
    channels.some(
      (channel) =>
        channel.id ===
        ticketSettings.logChannel,
    );
  panelChannelSelect.value =
    panelExists
      ? ticketSettings.panelChannel
      : "";
  logChannelSelect.value =
    logExists
      ? ticketSettings.logChannel
      : "";
}
/* =========================================================
   SUPPORT ROLES
========================================================= */
function renderSupportRoles() {
  supportRoleList
    .replaceChildren();
  if (!roles.length) {
    const empty =
      document.createElement(
        "div",
      );
    empty.className =
      "empty";
    empty.textContent =
      "No usable roles found.";
    supportRoleList
      .appendChild(
        empty,
      );
    return;
  }
  const selected =
    new Set(
      Array.isArray(
        ticketSettings.supportRoles,
      )
        ? ticketSettings.supportRoles
        : [],
    );
  roles.forEach(
    (role) => {
      const row =
        document.createElement(
          "label",
        );
      row.className =
        "role-item";
      const info =
        document.createElement(
          "span",
        );
      info.className =
        "role-info";
      const dot =
        document.createElement(
          "span",
        );
      dot.className =
        "role-dot";
      if (
        role.color &&
        role.color !==
        "#000000"
      ) {
        dot.style.background =
          role.color;
      }
      const name =
        document.createElement(
          "strong",
        );
      name.textContent =
        role.name ||
        "Role";
      info.appendChild(
        dot,
      );
      info.appendChild(
        name,
      );
      const checkbox =
        document.createElement(
          "input",
        );
      checkbox.type =
        "checkbox";
      checkbox.value =
        role.id;
      checkbox.checked =
        selected.has(
          role.id,
        );
      checkbox.dataset.roleId =
        role.id;
      checkbox.addEventListener(
        "change",
        () => {
          updateStatistics();
        },
      );
      row.appendChild(
        info,
      );
      row.appendChild(
        checkbox,
      );
      supportRoleList
        .appendChild(
          row,
        );
    },
  );
}
/* =========================================================
   SELECTED SUPPORT ROLES
========================================================= */
function selectedSupportRoles() {
  return Array.from(
    supportRoleList.querySelectorAll(
      'input[type="checkbox"]:checked',
    ),
  )
    .map(
      (checkbox) =>
        checkbox.dataset.roleId,
    )
    .filter(Boolean);
}
/* =========================================================
   PREVIEW
========================================================= */
function updatePreview() {
  const title =
    panelTitle.value
      .trim();
  const message =
    panelMessage.value
      .trim();
  const label =
    buttonLabel.value
      .trim();
  previewTitle.textContent =
    title ||
    "Support Tickets";
  previewMessage.textContent =
    message ||
    "Need help? Open a private ticket and our staff will assist you.";
  previewButton.textContent =
    label ||
    "Open Ticket";
}
/* =========================================================
   STATISTICS
========================================================= */
function channelName(
  channelID,
) {
  const channel =
    channels.find(
      (item) =>
        item.id ===
        channelID,
    );
  return channel
    ? `#${channel.name}`
    : "NOT SET";
}
function updateStatistics() {
  relayStateStat.textContent =
    ticketsEnabled.checked
      ? "ENABLED"
      : "DISABLED";
  relayStateStat.classList.toggle(
    "good",
    ticketsEnabled.checked,
  );
  supportRoleCountStat.textContent =
    selectedSupportRoles()
      .length;
  panelChannelStat.textContent =
    panelChannelSelect.value
      ? channelName(
          panelChannelSelect.value,
        )
      : "NOT SET";
  panelStateStat.textContent =
    ticketSettings.panelMessageID
      ? "PUBLISHED"
      : "NOT PUBLISHED";
}
/* =========================================================
   RENDER SETTINGS
========================================================= */
function renderSettings() {
  ticketsEnabled.checked =
    ticketSettings.enabled ===
    true;
  ticketPrefix.value =
    ticketSettings.ticketPrefix ||
    "ticket";
  panelTitle.value =
    ticketSettings.panelTitle ||
    "Support Tickets";
  panelMessage.value =
    ticketSettings.panelMessage ||
    "Need help? Open a private ticket and our staff will assist you.";
  buttonLabel.value =
    ticketSettings.buttonLabel ||
    "Open Ticket";
  renderCategories();
  renderChannels();
  renderSupportRoles();
  updatePreview();
  updateStatistics();
  ticketSettingsStatus.textContent =
    "TICKET SETTINGS LOADED";
}
/* =========================================================
   BUILD SETTINGS PAYLOAD
========================================================= */
function buildSettingsPayload() {
  return {
    enabled:
      ticketsEnabled.checked,
    categoryID:
      categorySelect.value,
    panelChannel:
      panelChannelSelect.value,
    logChannel:
      logChannelSelect.value,
    supportRoles:
      selectedSupportRoles(),
    panelTitle:
      panelTitle.value
        .trim() ||
      "Support Tickets",
    panelMessage:
      panelMessage.value
        .trim() ||
      "Need help? Open a private ticket and our staff will assist you.",
    buttonLabel:
      buttonLabel.value
        .trim() ||
      "Open Ticket",
    ticketPrefix:
      ticketPrefix.value
        .trim() ||
      "ticket",
  };
}
/* =========================================================
   SAVE SETTINGS
========================================================= */
async function saveSettings(
  showToast = true,
) {
  if (
    !currentGuild ||
    saving
  ) {
    return false;
  }
  saving = true;
  saveTicketSettingsButton.disabled =
    true;
  saveTicketSettingsButton.textContent =
    "SAVING…";
  ticketSettingsStatus.textContent =
    "SAVING TICKET SETTINGS…";
  try {
    const data =
      await fetchJSON(
        `/api/guild/${currentGuild.id}/tickets/settings`,
        {
          method:
            "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify(
              buildSettingsPayload(),
            ),
        },
      );
    ticketSettings = {
      ...defaultTicketSettings(),
      ...(data.settings || {}),
    };
    renderSettings();
    ticketSettingsStatus.textContent =
      "TICKET SETTINGS SAVED";
    if (showToast) {
      toast(
        "TICKET SETTINGS SAVED",
      );
    }
    return true;
  } catch (error) {
    console.error(
      "Ticket settings save error:",
      error,
    );
    ticketSettingsStatus.textContent =
      error.message ||
      "COULD NOT SAVE SETTINGS";
    toast(
      error.message ||
      "Could not save Ticket settings.",
      true,
    );
    return false;
  } finally {
    saving = false;
    saveTicketSettingsButton.disabled =
      false;
    saveTicketSettingsButton.textContent =
      "SAVE SETTINGS";
  }
}
/* =========================================================
   PUBLISH PANEL
========================================================= */
async function publishPanel() {
  if (
    !currentGuild ||
    publishing
  ) {
    return;
  }
  if (
    !ticketsEnabled.checked
  ) {
    toast(
      "Enable Ticket Relay first.",
      true,
    );
    return;
  }
  if (
    !panelChannelSelect.value
  ) {
    toast(
      "Select a panel channel first.",
      true,
    );
    return;
  }
  publishing = true;
  publishPanelButton.disabled =
    true;
  publishPanelButton.textContent =
    "PUBLISHING…";
  ticketSettingsStatus.textContent =
    "PREPARING TICKET PANEL…";
  try {
    /*
      Save current form first so the
      published panel always uses
      the newest configuration.
    */
    const saved =
      await saveSettings(
        false,
      );
    if (!saved) {
      return;
    }
    ticketSettingsStatus.textContent =
      "PUBLISHING TICKET PANEL…";
    const data =
      await fetchJSON(
        `/api/guild/${currentGuild.id}/tickets/publish`,
        {
          method:
            "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
        },
      );
    ticketSettings = {
      ...ticketSettings,
      ...(data.settings || {}),
    };
    updateStatistics();
    ticketSettingsStatus.textContent =
      "TICKET PANEL PUBLISHED";
    toast(
      "TICKET PANEL PUBLISHED",
    );
  } catch (error) {
    console.error(
      "Ticket publish error:",
      error,
    );
    ticketSettingsStatus.textContent =
      error.message ||
      "PANEL PUBLISH FAILED";
    toast(
      error.message ||
      "Could not publish Ticket panel.",
      true,
    );
  } finally {
    publishing = false;
    publishPanelButton.disabled =
      false;
    publishPanelButton.textContent =
      "PUBLISH PANEL";
  }
}
/* =========================================================
   LOAD TICKET SYSTEM
========================================================= */
async function loadTicketSystem() {
  if (!currentGuild) {
    return;
  }
  ticketSettingsStatus.textContent =
    "LOADING TICKET RELAY…";
  try {
    const results =
      await Promise.allSettled([
        loadSettings(),
        loadOptions(),
      ]);
    const settingsResult =
      results[0];
    const optionsResult =
      results[1];
    if (
      settingsResult.status ===
      "rejected"
    ) {
      console.error(
        "Ticket settings load error:",
        settingsResult.reason,
      );
      ticketSettings =
        defaultTicketSettings();
      toast(
        settingsResult.reason?.message ||
        "Could not load Ticket settings.",
        true,
      );
    }
    if (
      optionsResult.status ===
      "rejected"
    ) {
      console.error(
        "Ticket options load error:",
        optionsResult.reason,
      );
      channels = [];
      categories = [];
      roles = [];
      toast(
        optionsResult.reason?.message ||
        "Could not load server options.",
        true,
      );
    }
    renderSettings();
  } catch (error) {
    console.error(
      "Ticket system load error:",
      error,
    );
    ticketSettingsStatus.textContent =
      "TICKET RELAY UNAVAILABLE";
    toast(
      error.message ||
      "Could not load Ticket Relay.",
      true,
    );
  }
}
/* =========================================================
   LIVE FORM EVENTS
========================================================= */
panelTitle.addEventListener(
  "input",
  updatePreview,
);
panelMessage.addEventListener(
  "input",
  updatePreview,
);
buttonLabel.addEventListener(
  "input",
  updatePreview,
);
ticketsEnabled.addEventListener(
  "change",
  updateStatistics,
);
panelChannelSelect.addEventListener(
  "change",
  updateStatistics,
);
/* =========================================================
   BUTTON EVENTS
========================================================= */
saveTicketSettingsButton
  .addEventListener(
    "click",
    async () => {
      await saveSettings();
    },
  );
publishPanelButton
  .addEventListener(
    "click",
    publishPanel,
  );
serverButton.addEventListener(
  "click",
  openServerOverlay,
);
closeServerOverlay.addEventListener(
  "click",
  closeServerSelector,
);
serverOverlay.addEventListener(
  "click",
  (event) => {
    if (
      event.target ===
      serverOverlay
    ) {
      closeServerSelector();
    }
  },
);
document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key ===
      "Escape"
    ) {
      closeServerSelector();
    }
  },
);
/* =========================================================
   BOOT
========================================================= */
async function boot() {
  try {
    const data =
      await fetchJSON(
        "/api/me",
      );
    if (
      !data.loggedIn
    ) {
      loadingState
        .classList
        .add(
          "hidden",
        );
      loginState
        .classList
        .remove(
          "hidden",
        );
      return;
    }
    guilds =
      Array.isArray(
        data.guilds,
      )
        ? data.guilds
        : [];
    if (!guilds.length) {
      loadingState
        .classList
        .add(
          "hidden",
        );
      loginState
        .classList
        .remove(
          "hidden",
        );
      const title =
        loginState.querySelector(
          "h1",
        );
      const copy =
        loginState.querySelector(
          "p",
        );
      if (title) {
        title.textContent =
          "No manageable server.";
      }
      if (copy) {
        copy.textContent =
          "Arclume could not find a Discord server this account can manage.";
      }
      return;
    }
    const savedGuildID =
      localStorage.getItem(
        "arclume-selected-guild",
      );
    currentGuild =
      guilds.find(
        (guild) =>
          guild.id ===
          savedGuildID,
      ) ||
      guilds[0];
    localStorage.setItem(
      "arclume-selected-guild",
      currentGuild.id,
    );
    renderServerIdentity();
    renderServerList();
    /*
      Show the dashboard immediately.
      Backend requests load afterward.
    */
    loadingState
      .classList
      .add(
        "hidden",
      );
    loginState
      .classList
      .add(
        "hidden",
      );
    ticketsApp
      .classList
      .remove(
        "hidden",
      );
    await loadTicketSystem();
  } catch (error) {
    console.error(
      "Ticket Relay boot error:",
      error,
    );
    loadingState
      .classList
      .add(
        "hidden",
      );
    loginState
      .classList
      .remove(
        "hidden",
      );
    toast(
      error.message ||
      "Could not start Ticket Relay.",
      true,
    );
  }
}
/* =========================================================
   START
========================================================= */
boot();
