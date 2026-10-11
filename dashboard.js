let currentUser = null;
let guilds = [];
let currentGuild = null;
let editingRuleId = null;
let commandIndex = 0;

let levelAccessLoading = false;

/* =========================================================
   PROTECTION DEFAULTS
========================================================= */

const defaultRules = [
  {
    id: "spam",
    name: "Rapid Message Flood",
    type: "spam",
    action: "Delete + Timeout",
    threshold: 6,
    window: 8,
    description: "Detects members sending messages unusually quickly.",
    enabled: true,
  },

  {
    id: "duplicate",
    name: "Duplicate Signal",
    type: "duplicate",
    action: "Delete + Warn",
    threshold: 4,
    window: 15,
    description: "Stops repeated identical messages from flooding channels.",
    enabled: true,
  },

  {
    id: "mentions",
    name: "Mention Surge",
    type: "mentions",
    action: "Delete + Timeout",
    threshold: 5,
    window: 10,
    description: "Limits disruptive mass mentions of members or roles.",
    enabled: true,
  },

  {
    id: "invites",
    name: "Invite Gate",
    type: "invites",
    action: "Delete",
    threshold: 1,
    window: 1,
    description: "Intercepts unwanted Discord invite links.",
    enabled: true,
  },

  {
    id: "links",
    name: "External Link Gate",
    type: "links",
    action: "Delete",
    threshold: 1,
    window: 1,
    description: "Filters unwanted external links.",
    enabled: false,
  },

  {
    id: "caps",
    name: "Caps Saturation",
    type: "caps",
    action: "Delete + Warn",
    threshold: 70,
    window: 1,
    description: "Detects messages with excessive capital letters.",
    enabled: false,
  },
];

const defaultSettings = {
  enabled: true,
  action: "Delete",
  timeout: 10,
};

/* =========================================================
   DASHBOARD PAGES
========================================================= */

const pages = {
  overview: "00 / OVERVIEW",
  automod: "01 / PROTECTION",
  systems: "02 / SYSTEMS",
};

/* =========================================================
   COMMAND PALETTE
========================================================= */

const commands = [
  {
    symbol: "00",
    title: "Open Overview",
    subtitle: "Return to live server context",
    keywords: "overview home server",
    action: () => openPage("overview"),
  },

  {
    symbol: "01",
    title: "Open Protection Matrix",
    subtitle: "Manage AutoMod rules",
    keywords: "automod protection rules security",
    action: () => openPage("automod"),
  },

  {
    symbol: "02",
    title: "Open System Index",
    subtitle: "Browse Arclume modules",
    keywords: "systems modules features",
    action: () => openPage("systems"),
  },

  {
    symbol: "07",
    title: "Leveling Access",
    subtitle: "XP channels and staff roles",
    keywords: "level xp channels staff roles moderator",
    action: () => {
      document.getElementById("levelingNavButton")?.click();

      setTimeout(() => {
        document.getElementById("levelAccessPanel")?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 250);
    },
  },

  {
    symbol: "↗",
    title: "Switch Server",
    subtitle: "Open the server vault",
    keywords: "server guild switch",
    action: openServerOverlay,
  },

  {
    symbol: "+",
    title: "Create Protection Rule",
    subtitle: "Add a local AutoMod draft rule",
    keywords: "new create rule",
    action: () => openRuleDrawer(),
  },
];

/* =========================================================
   GENERIC HELPERS
========================================================= */

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function firstLetter(value) {
  return String(value || "A")
    .trim()
    .charAt(0)
    .toUpperCase();
}

function guildIcon(guild) {
  return guild?.id && guild?.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256`
    : null;
}

function userAvatar(user) {
  return user?.id && user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
    : null;
}

function renderAvatar(el, url, fallback) {
  if (!el) {
    return;
  }

  el.innerHTML = "";

  if (!url) {
    el.textContent = firstLetter(fallback);

    return;
  }

  const img = document.createElement("img");

  img.src = url;

  img.alt = fallback || "Discord";

  img.addEventListener("error", () => {
    el.innerHTML = "";

    el.textContent = firstLetter(fallback);
  });

  el.appendChild(img);
}

/* =========================================================
   PROTECTION STORAGE
========================================================= */

function rulesKey() {
  return `arclume-${currentGuild?.id || "none"}-rules-monolith-v1`;
}

function settingsKey() {
  return `arclume-${currentGuild?.id || "none"}-settings-monolith-v1`;
}

function loadRules() {
  try {
    const value = localStorage.getItem(rulesKey());

    return value ? JSON.parse(value) : clone(defaultRules);
  } catch {
    return clone(defaultRules);
  }
}

function saveRules(rules) {
  localStorage.setItem(rulesKey(), JSON.stringify(rules));
}

function loadSettings() {
  try {
    const value = localStorage.getItem(settingsKey());

    return value
      ? {
          ...defaultSettings,
          ...JSON.parse(value),
        }
      : {
          ...defaultSettings,
        };
  } catch {
    return {
      ...defaultSettings,
    };
  }
}

function saveSettings(settings) {
  localStorage.setItem(settingsKey(), JSON.stringify(settings));
}

/* =========================================================
   BOOT
========================================================= */

async function boot() {
  try {
    const response = await fetch("/api/me", {
      credentials: "same-origin",
    });

    const data = await response.json();

    if (!data.loggedIn) {
      return showState("login");
    }

    currentUser = data.user;

    guilds = Array.isArray(data.guilds) ? data.guilds : [];

    if (!guilds.length) {
      return showState("noServer");
    }

    const saved = localStorage.getItem("arclume-selected-guild");

    currentGuild = guilds.find((guild) => guild.id === saved) || guilds[0];

    renderServerList();

    renderIdentity();

    renderRules();

    ensureLevelAccessPanel();

    await loadBotStatus();

    document.getElementById("loadingState")?.classList.add("hidden");

    document.getElementById("controlApp")?.classList.remove("hidden");

    openPage("overview");

    renderCommands();

    loadLevelAccessPanel();
  } catch (error) {
    console.error(error);

    showState("login");
  }
}

/* =========================================================
   LOGIN STATES
========================================================= */

function showState(name) {
  ["loadingState", "loginState", "noServerState"].forEach((id) =>
    document.getElementById(id)?.classList.add("hidden"),
  );

  if (name === "login") {
    document.getElementById("loginState")?.classList.remove("hidden");
  }

  if (name === "noServer") {
    document.getElementById("noServerState")?.classList.remove("hidden");
  }
}

/* =========================================================
   SERVER IDENTITY
========================================================= */

function renderIdentity() {
  if (!currentGuild) {
    return;
  }

  const name = currentGuild.name || "Unnamed Server";

  const icon = guildIcon(currentGuild);

  ["headerServerIcon", "heroServerIcon"].forEach((id) =>
    renderAvatar(document.getElementById(id), icon, name),
  );

  const headerName = document.getElementById("headerServerName");

  if (headerName) {
    headerName.textContent = name;
  }

  const heroName = document.getElementById("heroServerName");

  if (heroName) {
    heroName.textContent = name;
  }

  const identityName = document.getElementById("identityServerName");

  if (identityName) {
    identityName.textContent = name;
  }

  const identityID = document.getElementById("identityServerId");

  if (identityID) {
    identityID.textContent = `ID ${currentGuild.id}`;
  }

  const identityUser = document.getElementById("identityUserName");

  if (identityUser) {
    identityUser.textContent =
      currentUser?.globalName || currentUser?.username || "Discord User";
  }

  updateOverview();
}

/* =========================================================
   BOT STATUS
========================================================= */

async function loadBotStatus() {
  const dot = document.getElementById("botStatusDot");

  const text = document.getElementById("botStatusText");

  try {
    const response = await fetch("/api/status");

    const data = await response.json();

    const online = Boolean(data.botOnline);

    if (text) {
      text.textContent = online ? "ONLINE" : "OFFLINE";
    }

    if (dot) {
      dot.className = online ? "online" : "offline";
    }
  } catch {
    if (text) {
      text.textContent = "UNKNOWN";
    }

    if (dot) {
      dot.className = "offline";
    }
  }
}

/* =========================================================
   OVERVIEW
========================================================= */

function updateOverview() {
  if (!currentGuild) {
    return;
  }

  const rules = loadRules();

  const settings = loadSettings();

  const count = document.getElementById("overviewRuleCount");

  if (count) {
    count.textContent = rules.length;
  }

  const state = document.getElementById("overviewProtectionState");

  if (state) {
    state.textContent = settings.enabled ? "ARMED" : "DORMANT";
  }
}

/* =========================================================
   PAGES
========================================================= */

function openPage(name) {
  if (!pages[name]) {
    return;
  }

  document
    .querySelectorAll(".dash-page")
    .forEach((page) => page.classList.remove("active"));

  document.getElementById(`page-${name}`)?.classList.add("active");

  document
    .querySelectorAll("[data-page]")
    .forEach((button) =>
      button.classList.toggle("active", button.dataset.page === name),
    );

  const code = document.getElementById("pageCode");

  if (code) {
    code.textContent = pages[name];
  }

  if (name === "automod") {
    renderRules();
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

document
  .querySelectorAll("[data-page]")
  .forEach((button) =>
    button.addEventListener("click", () => openPage(button.dataset.page)),
  );

document
  .querySelectorAll("[data-open-page]")
  .forEach((button) =>
    button.addEventListener("click", () => openPage(button.dataset.openPage)),
  );

/* =========================================================
   SERVER SELECTOR
========================================================= */

function renderServerList() {
  const list = document.getElementById("serverList");

  if (!list) {
    return;
  }

  list.innerHTML = "";

  guilds.forEach((guild) => {
    const button = document.createElement("button");

    button.className =
      "server-choice" + (guild.id === currentGuild?.id ? " active" : "");

    button.innerHTML = `
          <span class="server-choice-icon"></span>

          <span>
            <small>
              DISCORD COMMUNITY
            </small>

            <b>
              ${escapeHTML(guild.name)}
            </b>
          </span>

          <span>
            ${guild.id === currentGuild?.id ? "ACTIVE" : "SELECT"}
          </span>
        `;

    renderAvatar(
      button.querySelector(".server-choice-icon"),
      guildIcon(guild),
      guild.name,
    );

    button.addEventListener("click", () => selectGuild(guild.id));

    list.appendChild(button);
  });
}

function selectGuild(id) {
  const guild = guilds.find((item) => item.id === id);

  if (!guild) {
    return;
  }

  currentGuild = guild;

  localStorage.setItem("arclume-selected-guild", guild.id);

  renderServerList();

  renderIdentity();

  renderRules();

  closeOverlay("serverOverlay");

  toast(`SERVER CONTEXT → ${guild.name}`);

  loadLevelAccessPanel();
}

function openServerOverlay() {
  document.getElementById("serverOverlay")?.classList.remove("hidden");

  document.body.style.overflow = "hidden";
}

document
  .getElementById("serverButton")
  ?.addEventListener("click", openServerOverlay);

document
  .getElementById("overviewSwitchServer")
  ?.addEventListener("click", openServerOverlay);

function closeOverlay(id) {
  document.getElementById(id)?.classList.add("hidden");

  document.body.style.overflow = "";
}

document
  .querySelectorAll("[data-close]")
  .forEach((button) =>
    button.addEventListener("click", () => closeOverlay(button.dataset.close)),
  );

document.querySelectorAll(".overlay").forEach((overlay) =>
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeOverlay(overlay.id);
    }
  }),
);

/* =========================================================
   LEVELING ACCESS PANEL
========================================================= */

function injectLevelAccessStyles() {
  if (document.getElementById("arclumeLevelAccessStyles")) {
    return;
  }

  const style = document.createElement("style");

  style.id = "arclumeLevelAccessStyles";

  style.textContent = `
      #levelAccessPanel {
        margin-top: 18px;
        margin-bottom: 18px;
        border: 1px solid rgba(255,255,255,.10);
        background:
          radial-gradient(circle at 85% 0%, rgba(139,92,246,.10), transparent 35%),
          rgba(255,255,255,.012);
        overflow: hidden;
      }

      .lv-access-head {
        min-height: 88px;
        padding: 18px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        border-bottom: 1px solid rgba(255,255,255,.08);
      }

      .lv-access-head small {
        display: block;
        color: #9987ff;
        font: 500 7px/1 "IBM Plex Mono", monospace;
        letter-spacing: .12em;
      }

      .lv-access-head h3 {
        margin: 7px 0 0;
        font-size: 25px;
        letter-spacing: -.035em;
      }

      .lv-access-status {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #d9ff72;
        font: 600 7px/1 "IBM Plex Mono", monospace;
      }

      .lv-access-status i {
        width: 7px;
        height: 7px;
        display: block;
        border-radius: 50%;
        background: currentColor;
        box-shadow: 0 0 12px currentColor;
      }

      .lv-access-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
      }

      .lv-access-card {
        min-width: 0;
        padding: 20px;
      }

      .lv-access-card + .lv-access-card {
        border-left: 1px solid rgba(255,255,255,.08);
      }

      .lv-access-card-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 15px;
        margin-bottom: 15px;
      }

      .lv-access-card-head small {
        display: block;
        color: #777168;
        font: 500 6px/1 "IBM Plex Mono", monospace;
        letter-spacing: .1em;
      }

      .lv-access-card-head h4 {
        margin: 6px 0 0;
        font-size: 18px;
      }

      .lv-access-count {
        color: #a78bfa;
        font: 600 7px/1 "IBM Plex Mono", monospace;
        white-space: nowrap;
      }

      .lv-access-help {
        margin: 0 0 14px;
        color: rgba(245,242,255,.55);
        font-size: 9px;
        line-height: 1.6;
      }

      .lv-access-toolbar {
        display: flex;
        gap: 6px;
        margin-bottom: 10px;
      }

      .lv-mini-btn {
        min-height: 29px;
        padding: 0 9px;
        border: 1px solid rgba(255,255,255,.09);
        background: transparent;
        color: rgba(245,242,255,.62);
        font: 600 6px/1 "IBM Plex Mono", monospace;
      }

      .lv-mini-btn:hover {
        border-color: rgba(167,139,250,.45);
        color: #fff;
      }

      .lv-access-list {
        max-height: 290px;
        overflow-y: auto;
        border-top: 1px solid rgba(255,255,255,.07);
      }

      .lv-access-option {
        min-height: 47px;
        padding: 0 8px;
        display: flex;
        align-items: center;
        gap: 10px;
        border-bottom: 1px solid rgba(255,255,255,.055);
        cursor: pointer;
        transition: .15s;
      }

      .lv-access-option:hover {
        background: rgba(167,139,250,.045);
      }

      .lv-access-option.selected {
        background: linear-gradient(
          90deg,
          rgba(139,92,246,.10),
          transparent
        );
      }

      .lv-access-option input {
        width: 15px;
        height: 15px;
        margin: 0;
        accent-color: #a78bfa;
      }

      .lv-access-option-copy {
        min-width: 0;
        flex: 1;
      }

      .lv-access-option-copy b {
        display: block;
        overflow: hidden;
        color: rgba(255,255,255,.88);
        font-size: 10px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .lv-access-option-copy small {
        display: block;
        margin-top: 4px;
        color: rgba(255,255,255,.35);
        font: 500 6px/1 "IBM Plex Mono", monospace;
      }

      .lv-role-dot {
        width: 8px;
        height: 8px;
        flex: 0 0 8px;
        border-radius: 50%;
        background: #8f7cff;
      }

      .lv-access-empty {
        padding: 35px 10px;
        color: rgba(255,255,255,.38);
        text-align: center;
        font: 500 8px/1.6 "IBM Plex Mono", monospace;
      }

      .lv-access-command-row {
        padding: 15px 20px;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 7px;
        border-top: 1px solid rgba(255,255,255,.08);
        border-bottom: 1px solid rgba(255,255,255,.08);
      }

      .lv-access-command-row > span:first-child {
        margin-right: 6px;
        color: #777168;
        font: 500 6px/1 "IBM Plex Mono", monospace;
      }

      .lv-command-chip {
        padding: 7px 9px;
        border: 1px solid rgba(167,139,250,.18);
        background: rgba(167,139,250,.05);
        color: #c8bfff;
        font: 600 7px/1 "IBM Plex Mono", monospace;
      }

      .lv-access-footer {
        min-height: 72px;
        padding: 13px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
      }

      .lv-access-footer p {
        max-width: 700px;
        margin: 0;
        color: rgba(245,242,255,.42);
        font-size: 8px;
        line-height: 1.6;
      }

      .lv-access-actions {
        display: flex;
        gap: 8px;
      }

      .lv-access-action {
        min-height: 38px;
        padding: 0 13px;
        border: 1px solid rgba(255,255,255,.11);
        background: transparent;
        color: rgba(255,255,255,.72);
        font: 700 7px/1 "IBM Plex Mono", monospace;
      }

      .lv-access-action.primary {
        border-color: #a78bfa;
        background: #a78bfa;
        color: #0a0810;
      }

      .lv-access-action:disabled {
        opacity: .45;
        cursor: not-allowed;
      }

      @media (max-width: 850px) {
        .lv-access-grid {
          grid-template-columns: 1fr;
        }

        .lv-access-card + .lv-access-card {
          border-left: 0;
          border-top: 1px solid rgba(255,255,255,.08);
        }

        .lv-access-footer {
          align-items: stretch;
          flex-direction: column;
        }

        .lv-access-actions {
          width: 100%;
        }

        .lv-access-action {
          flex: 1;
        }
      }
    `;

  document.head.appendChild(style);
}

function ensureLevelAccessPanel() {
  injectLevelAccessStyles();

  if (document.getElementById("levelAccessPanel")) {
    return;
  }

  const levelingPage = document.getElementById("page-leveling");

  if (!levelingPage) {
    return;
  }

  const leaderboard = levelingPage.querySelector(".levelboard");

  const panel = document.createElement("section");

  panel.id = "levelAccessPanel";

  panel.innerHTML = `
      <header class="lv-access-head">
        <div>
          <small>
            07 / LEVELING CONTROL
          </small>

          <h3>
            XP Access Matrix
          </h3>
        </div>

        <div class="lv-access-status">
          <i></i>
          <span id="levelAccessState">
            READY
          </span>
        </div>
      </header>

      <div class="lv-access-grid">

        <section class="lv-access-card">
          <div class="lv-access-card-head">
            <div>
              <small>
                XP NETWORK
              </small>

              <h4>
                XP Channels
              </h4>
            </div>

            <span
              class="lv-access-count"
              id="levelXPChannelCount"
            >
              0 SELECTED
            </span>
          </div>

          <p class="lv-access-help">
            Select exactly where members can earn message XP.
            If none are selected, XP works in every text channel.
          </p>

          <div class="lv-access-toolbar">
            <button
              class="lv-mini-btn"
              id="levelSelectAllChannels"
              type="button"
            >
              SELECT ALL
            </button>

            <button
              class="lv-mini-btn"
              id="levelClearChannels"
              type="button"
            >
              CLEAR
            </button>
          </div>

          <div
            class="lv-access-list"
            id="levelXPChannelList"
          >
            <div class="lv-access-empty">
              Loading channels...
            </div>
          </div>
        </section>


        <section class="lv-access-card">
          <div class="lv-access-card-head">
            <div>
              <small>
                STAFF ACCESS
              </small>

              <h4>
                Leveling Staff Roles
              </h4>
            </div>

            <span
              class="lv-access-count"
              id="levelStaffRoleCount"
            >
              0 SELECTED
            </span>
          </div>

          <p class="lv-access-help">
            Members with these roles can manage XP without
            Administrator or Manage Server permission.
          </p>

          <div class="lv-access-toolbar">
            <button
              class="lv-mini-btn"
              id="levelClearRoles"
              type="button"
            >
              CLEAR ROLES
            </button>
          </div>

          <div
            class="lv-access-list"
            id="levelStaffRoleList"
          >
            <div class="lv-access-empty">
              Loading roles...
            </div>
          </div>
        </section>
      </div>


      <div class="lv-access-command-row">
        <span>
          STAFF COMMANDS
        </span>

        <span class="lv-command-chip">
          /xp add
        </span>

        <span class="lv-command-chip">
          /xp remove
        </span>

        <span class="lv-command-chip">
          /xp set
        </span>

        <span class="lv-command-chip">
          /xp check
        </span>

        <span class="lv-command-chip">
          /lvl on
        </span>

        <span class="lv-command-chip">
          /lvl stop
        </span>
      </div>


      <footer class="lv-access-footer">
        <p>
          Your BOT_OWNER_ID always keeps Leveling access.
          Selected staff roles can use XP-management commands
          without being server administrators.
        </p>

        <div class="lv-access-actions">
          <button
            class="lv-access-action"
            id="levelRefreshAccess"
            type="button"
          >
            REFRESH
          </button>

          <button
            class="lv-access-action primary"
            id="levelSaveAccess"
            type="button"
          >
            SAVE ACCESS
          </button>
        </div>
      </footer>
    `;

  if (leaderboard) {
    levelingPage.insertBefore(panel, leaderboard);
  } else {
    levelingPage.appendChild(panel);
  }

  document
    .getElementById("levelSaveAccess")
    ?.addEventListener("click", saveLevelAccessPanel);

  document
    .getElementById("levelRefreshAccess")
    ?.addEventListener("click", loadLevelAccessPanel);

  document
    .getElementById("levelSelectAllChannels")
    ?.addEventListener("click", () => {
      document.querySelectorAll("[data-level-xp-channel]").forEach((box) => {
        box.checked = true;

        box.closest(".lv-access-option")?.classList.add("selected");
      });

      updateLevelAccessCounts();
    });

  document
    .getElementById("levelClearChannels")
    ?.addEventListener("click", () => {
      document.querySelectorAll("[data-level-xp-channel]").forEach((box) => {
        box.checked = false;

        box.closest(".lv-access-option")?.classList.remove("selected");
      });

      updateLevelAccessCounts();
    });

  document.getElementById("levelClearRoles")?.addEventListener("click", () => {
    document.querySelectorAll("[data-level-staff-role]").forEach((box) => {
      box.checked = false;

      box.closest(".lv-access-option")?.classList.remove("selected");
    });

    updateLevelAccessCounts();
  });
}

function updateLevelAccessCounts() {
  const channels = document.querySelectorAll(
    "[data-level-xp-channel]:checked",
  ).length;

  const roles = document.querySelectorAll(
    "[data-level-staff-role]:checked",
  ).length;

  const channelCount = document.getElementById("levelXPChannelCount");

  if (channelCount) {
    channelCount.textContent = `${channels} SELECTED`;
  }

  const roleCount = document.getElementById("levelStaffRoleCount");

  if (roleCount) {
    roleCount.textContent = `${roles} SELECTED`;
  }
}

function attachLevelAccessCheckboxEvents() {
  document
    .querySelectorAll("[data-level-xp-channel], [data-level-staff-role]")
    .forEach((box) => {
      box.addEventListener("change", () => {
        box
          .closest(".lv-access-option")
          ?.classList.toggle("selected", box.checked);

        updateLevelAccessCounts();
      });
    });
}

function renderLevelXPChannels(channels, selected) {
  const list = document.getElementById("levelXPChannelList");

  if (!list) {
    return;
  }

  if (!Array.isArray(channels) || !channels.length) {
    list.innerHTML = `
        <div class="lv-access-empty">
          No text channels were found.
        </div>
      `;

    return;
  }

  const selectedSet = new Set(selected || []);

  list.innerHTML = channels
    .map((channel) => {
      const checked = selectedSet.has(channel.id);

      return `
            <label
              class="lv-access-option ${checked ? "selected" : ""}"
            >
              <input
                type="checkbox"
                data-level-xp-channel
                value="${escapeHTML(channel.id)}"
                ${checked ? "checked" : ""}
              />

              <div class="lv-access-option-copy">
                <b>
                  #${escapeHTML(channel.name)}
                </b>

                <small>
                  ${escapeHTML(channel.parentName || "NO CATEGORY")}
                </small>
              </div>
            </label>
          `;
    })
    .join("");
}

function renderLevelStaffRoles(roles, selected) {
  const list = document.getElementById("levelStaffRoleList");

  if (!list) {
    return;
  }

  if (!Array.isArray(roles) || !roles.length) {
    list.innerHTML = `
        <div class="lv-access-empty">
          No selectable roles were found.
        </div>
      `;

    return;
  }

  const selectedSet = new Set(selected || []);

  list.innerHTML = roles
    .map((role) => {
      const checked = selectedSet.has(role.id);

      const color =
        role.color && role.color !== "#000000" ? role.color : "#8f7cff";

      return `
            <label
              class="lv-access-option ${checked ? "selected" : ""}"
            >
              <input
                type="checkbox"
                data-level-staff-role
                value="${escapeHTML(role.id)}"
                ${checked ? "checked" : ""}
              />

              <span
                class="lv-role-dot"
                style="background:${escapeHTML(color)}"
              ></span>

              <div class="lv-access-option-copy">
                <b>
                  ${escapeHTML(role.name)}
                </b>

                <small>
                  LEVELING STAFF ACCESS
                </small>
              </div>
            </label>
          `;
    })
    .join("");
}

async function loadLevelAccessPanel() {
  if (!currentGuild || levelAccessLoading) {
    return;
  }

  ensureLevelAccessPanel();

  const state = document.getElementById("levelAccessState");

  const channelList = document.getElementById("levelXPChannelList");

  const roleList = document.getElementById("levelStaffRoleList");

  if (!channelList || !roleList) {
    return;
  }

  levelAccessLoading = true;

  if (state) {
    state.textContent = "SYNCING";
  }

  channelList.innerHTML = `
      <div class="lv-access-empty">
        Loading channels...
      </div>
    `;

  roleList.innerHTML = `
      <div class="lv-access-empty">
        Loading roles...
      </div>
    `;

  try {
    const response = await fetch(
      `/api/guild/${encodeURIComponent(currentGuild.id)}/leveling/access`,
      {
        credentials: "same-origin",

        headers: {
          Accept: "application/json",
        },
      },
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }

    renderLevelXPChannels(
      data.channels || [],
      data.xpChannels || data.access?.xpChannels || [],
    );

    renderLevelStaffRoles(
      data.roles || [],
      data.staffRoles || data.access?.staffRoles || [],
    );

    attachLevelAccessCheckboxEvents();

    updateLevelAccessCounts();

    if (state) {
      state.textContent = "LIVE";
    }
  } catch (error) {
    console.error("❌ Level access dashboard:", error);

    channelList.innerHTML = `
        <div class="lv-access-empty">
          ${escapeHTML(error.message || "Could not load channels.")}
        </div>
      `;

    roleList.innerHTML = `
        <div class="lv-access-empty">
          Could not load roles.
        </div>
      `;

    if (state) {
      state.textContent = "ERROR";
    }
  } finally {
    levelAccessLoading = false;
  }
}

async function saveLevelAccessPanel() {
  if (!currentGuild) {
    return;
  }

  const saveButton = document.getElementById("levelSaveAccess");

  const state = document.getElementById("levelAccessState");

  const xpChannels = [
    ...document.querySelectorAll("[data-level-xp-channel]:checked"),
  ].map((box) => box.value);

  const staffRoles = [
    ...document.querySelectorAll("[data-level-staff-role]:checked"),
  ].map((box) => box.value);

  if (saveButton) {
    saveButton.disabled = true;

    saveButton.textContent = "SAVING...";
  }

  if (state) {
    state.textContent = "SAVING";
  }

  try {
    const response = await fetch(
      `/api/guild/${encodeURIComponent(currentGuild.id)}/leveling/access`,
      {
        method: "PUT",

        credentials: "same-origin",

        headers: {
          "Content-Type": "application/json",

          Accept: "application/json",
        },

        body: JSON.stringify({
          xpChannels,
          staffRoles,
        }),
      },
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }

    if (state) {
      state.textContent = "SAVED";
    }

    toast("LEVELING ACCESS SAVED");

    updateLevelAccessCounts();
  } catch (error) {
    console.error("❌ Save Level access:", error);

    if (state) {
      state.textContent = "ERROR";
    }

    toast(error.message || "COULD NOT SAVE LEVELING ACCESS");
  } finally {
    if (saveButton) {
      saveButton.disabled = false;

      saveButton.textContent = "SAVE ACCESS";
    }
  }
}

/* =========================================================
   REFRESH LEVEL ACCESS WHEN LEVELING OPENS
========================================================= */

function hookLevelingAccessRefresh() {
  [
    "levelingNavButton",
    "overviewLevelingButton",
    "systemLevelingButton",
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener("click", () => {
      setTimeout(loadLevelAccessPanel, 100);
    });
  });
}

/* =========================================================
   PROTECTION MATRIX
========================================================= */

function typeLabel(type) {
  return (
    {
      spam: "Message Spam",
      duplicate: "Duplicate Messages",
      mentions: "Mass Mentions",
      invites: "Discord Invites",
      links: "External Links",
      caps: "Excessive Caps",
      words: "Word Filter",
    }[type] || type
  );
}

function renderRules() {
  if (!currentGuild) {
    return;
  }

  const rules = loadRules();

  const settings = loadSettings();

  const searchBox = document.getElementById("ruleSearch");

  const search = searchBox ? searchBox.value.trim().toLowerCase() : "";

  const visible = rules.filter((rule) =>
    [rule.name, rule.description, rule.type, rule.action]
      .join(" ")
      .toLowerCase()
      .includes(search),
  );

  const list = document.getElementById("rulesList");

  if (!list) {
    return;
  }

  list.innerHTML = "";

  visible.forEach((rule) => {
    const row = document.createElement("div");

    row.className = "rule-row";

    row.innerHTML = `
          <div class="rule-main">
            <b>
              ${escapeHTML(rule.name)}
            </b>

            <small>
              ${escapeHTML(rule.description)}
            </small>
          </div>

          <div class="rule-cell">
            <small class="mono">
              TRIGGER
            </small>

            <b>
              ${escapeHTML(typeLabel(rule.type))}
              ·
              ${rule.threshold}/${rule.window}s
            </b>
          </div>

          <div class="rule-cell">
            <small class="mono">
              RESPONSE
            </small>

            <b>
              ${escapeHTML(rule.action)}
            </b>
          </div>

          <div class="rule-state">
            <button
              class="toggle ${rule.enabled ? "on" : ""}"
              data-toggle-rule="${rule.id}"
            >
              <i></i>
            </button>

            <label class="${rule.enabled ? "" : "off"}">
              ${rule.enabled ? "ACTIVE" : "DORMANT"}
            </label>
          </div>

          <div class="rule-menu">
            <button
              data-edit-rule="${rule.id}"
              title="Edit"
            >
              ✎
            </button>

            <button
              class="delete"
              data-delete-rule="${rule.id}"
              title="Delete"
            >
              ×
            </button>
          </div>
        `;

    list.appendChild(row);
  });

  document
    .getElementById("rulesEmpty")
    ?.classList.toggle("hidden", visible.length > 0);

  const active = rules.filter((rule) => rule.enabled).length;

  const total = document.getElementById("summaryTotal");

  if (total) {
    total.textContent = rules.length;
  }

  const activeBox = document.getElementById("summaryActive");

  if (activeBox) {
    activeBox.textContent = active;
  }

  const dormant = document.getElementById("summaryDormant");

  if (dormant) {
    dormant.textContent = rules.length - active;
  }

  const masterLabel = document.getElementById("masterProtectionLabel");

  if (masterLabel) {
    masterLabel.textContent = settings.enabled ? "ARMED" : "DORMANT";
  }

  document
    .getElementById("masterProtectionToggle")
    ?.classList.toggle("on", settings.enabled);

  updateOverview();

  list
    .querySelectorAll("[data-toggle-rule]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        toggleRule(button.dataset.toggleRule),
      ),
    );

  list
    .querySelectorAll("[data-edit-rule]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        openRuleDrawer(button.dataset.editRule),
      ),
    );

  list
    .querySelectorAll("[data-delete-rule]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        deleteRule(button.dataset.deleteRule),
      ),
    );
}

document.getElementById("ruleSearch")?.addEventListener("input", renderRules);

function toggleRule(id) {
  const rules = loadRules();

  const rule = rules.find((item) => item.id === id);

  if (!rule) {
    return;
  }

  rule.enabled = !rule.enabled;

  saveRules(rules);

  renderRules();
}

function deleteRule(id) {
  const rules = loadRules();

  const rule = rules.find((item) => item.id === id);

  if (!rule) {
    return;
  }

  if (!confirm(`Delete “${rule.name}”?`)) {
    return;
  }

  saveRules(rules.filter((item) => item.id !== id));

  renderRules();

  toast("RULE DELETED");
}

document
  .getElementById("masterProtectionToggle")
  ?.addEventListener("click", () => {
    const settings = loadSettings();

    settings.enabled = !settings.enabled;

    saveSettings(settings);

    renderRules();

    toast(settings.enabled ? "PROTECTION ARMED" : "PROTECTION DORMANT");
  });

/* =========================================================
   RULE DRAWER
========================================================= */

function openRuleDrawer(id = null) {
  editingRuleId = id;

  const rule = id ? loadRules().find((item) => item.id === id) : null;

  const title = document.getElementById("ruleDrawerTitle");

  if (title) {
    title.textContent = rule ? "Edit rule" : "New rule";
  }

  const name = document.getElementById("ruleName");

  if (name) {
    name.value = rule?.name || "";
  }

  const description = document.getElementById("ruleDescription");

  if (description) {
    description.value = rule?.description || "";
  }

  const type = document.getElementById("ruleType");

  if (type) {
    type.value = rule?.type || "spam";
  }

  const threshold = document.getElementById("ruleThreshold");

  if (threshold) {
    threshold.value = rule?.threshold || 5;
  }

  const windowInput = document.getElementById("ruleWindow");

  if (windowInput) {
    windowInput.value = rule?.window || 10;
  }

  const action = document.getElementById("ruleAction");

  if (action) {
    action.value = rule?.action || "Delete";
  }

  document.getElementById("ruleDrawerBackdrop")?.classList.remove("hidden");

  document.body.style.overflow = "hidden";

  setTimeout(() => name?.focus(), 80);
}

function closeRuleDrawer() {
  document.getElementById("ruleDrawerBackdrop")?.classList.add("hidden");

  document.body.style.overflow = "";

  editingRuleId = null;
}

document
  .getElementById("newRuleButton")
  ?.addEventListener("click", () => openRuleDrawer());

document
  .getElementById("closeRuleDrawer")
  ?.addEventListener("click", closeRuleDrawer);

document
  .getElementById("cancelRuleDrawer")
  ?.addEventListener("click", closeRuleDrawer);

document.getElementById("saveRuleButton")?.addEventListener("click", () => {
  const name = document.getElementById("ruleName")?.value.trim();

  if (!name) {
    return toast("ENTER A RULE NAME");
  }

  const rules = loadRules();

  const data = {
    name,

    description:
      document.getElementById("ruleDescription")?.value.trim() ||
      "Custom Arclume protection rule.",

    type: document.getElementById("ruleType")?.value || "spam",

    threshold: Number(document.getElementById("ruleThreshold")?.value) || 1,

    window: Number(document.getElementById("ruleWindow")?.value) || 1,

    action: document.getElementById("ruleAction")?.value || "Delete",
  };

  const wasEditing = Boolean(editingRuleId);

  if (editingRuleId) {
    const rule = rules.find((item) => item.id === editingRuleId);

    if (rule) {
      Object.assign(rule, data);
    }
  } else {
    rules.unshift({
      id: `rule-${Date.now()}`,

      enabled: true,

      ...data,
    });
  }

  saveRules(rules);

  closeRuleDrawer();

  renderRules();

  toast(wasEditing ? "RULE UPDATED" : "RULE CREATED");
});

/* =========================================================
   DEFAULTS DRAWER
========================================================= */

function openDefaults() {
  const settings = loadSettings();

  const action = document.getElementById("defaultAction");

  if (action) {
    action.value = settings.action;
  }

  const timeout = document.getElementById("defaultTimeout");

  if (timeout) {
    timeout.value = settings.timeout;
  }

  document.getElementById("defaultsDrawerBackdrop")?.classList.remove("hidden");

  document.body.style.overflow = "hidden";
}

function closeDefaults() {
  document.getElementById("defaultsDrawerBackdrop")?.classList.add("hidden");

  document.body.style.overflow = "";
}

document
  .getElementById("matrixDefaultsButton")
  ?.addEventListener("click", openDefaults);

document
  .getElementById("closeDefaultsDrawer")
  ?.addEventListener("click", closeDefaults);

document
  .getElementById("cancelDefaultsDrawer")
  ?.addEventListener("click", closeDefaults);

document.getElementById("saveDefaultsButton")?.addEventListener("click", () => {
  const settings = loadSettings();

  settings.action = document.getElementById("defaultAction")?.value || "Delete";

  settings.timeout =
    Number(document.getElementById("defaultTimeout")?.value) || 10;

  saveSettings(settings);

  closeDefaults();

  toast("DEFAULTS SAVED");
});

/* =========================================================
   COMMAND PALETTE
========================================================= */

function filteredCommands() {
  const input = document.getElementById("commandInput");

  const query = input ? input.value.trim().toLowerCase() : "";

  return query
    ? commands.filter((command) =>
        [command.title, command.subtitle, command.keywords]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : commands;
}

function renderCommands() {
  const items = filteredCommands();

  if (commandIndex >= items.length) {
    commandIndex = 0;
  }

  const box = document.getElementById("commandResults");

  if (!box) {
    return;
  }

  box.innerHTML = "";

  items.forEach((command, index) => {
    const button = document.createElement("button");

    button.className =
      "command-result" + (index === commandIndex ? " selected" : "");

    button.innerHTML = `
          <span>
            ${escapeHTML(command.symbol)}
          </span>

          <span>
            <b>
              ${escapeHTML(command.title)}
            </b>

            <small>
              ${escapeHTML(command.subtitle)}
            </small>
          </span>
        `;

    button.addEventListener("click", () => runCommand(command));

    box.appendChild(button);
  });
}

function openCommand() {
  document.getElementById("commandOverlay")?.classList.remove("hidden");

  document.body.style.overflow = "hidden";

  const input = document.getElementById("commandInput");

  if (!input) {
    return;
  }

  input.value = "";

  commandIndex = 0;

  renderCommands();

  setTimeout(() => input.focus(), 60);
}

function closeCommand() {
  closeOverlay("commandOverlay");
}

function runCommand(command) {
  closeCommand();

  command.action();
}

document
  .getElementById("commandButton")
  ?.addEventListener("click", openCommand);

document.getElementById("commandInput")?.addEventListener("input", () => {
  commandIndex = 0;

  renderCommands();
});

/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.key.toLowerCase() === "k") {
    event.preventDefault();

    const overlay = document.getElementById("commandOverlay");

    if (overlay?.classList.contains("hidden")) {
      openCommand();
    } else {
      closeCommand();
    }

    return;
  }

  const commandOverlay = document.getElementById("commandOverlay");

  const commandOpen =
    commandOverlay && !commandOverlay.classList.contains("hidden");

  if (commandOpen) {
    const list = filteredCommands();

    if (event.key === "ArrowDown") {
      event.preventDefault();

      commandIndex = Math.min(list.length - 1, commandIndex + 1);

      renderCommands();
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      commandIndex = Math.max(0, commandIndex - 1);

      renderCommands();
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (list[commandIndex]) {
        runCommand(list[commandIndex]);
      }
    }
  }

  if (event.key === "Escape") {
    closeCommand();

    closeOverlay("serverOverlay");

    closeRuleDrawer();

    closeDefaults();
  }
});

/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;

function toast(message) {
  const element = document.getElementById("toast");

  if (!element) {
    return;
  }

  element.textContent = message;

  element.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => element.classList.remove("show"), 2200);
}

/* =========================================================
   FINAL INIT
========================================================= */

ensureLevelAccessPanel();

hookLevelingAccessRefresh();

boot();
