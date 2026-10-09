let currentUser = null;
let guilds = [];
let currentGuild = null;
let editingRuleId = null;
let commandIndex = 0;

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

const defaultSettings = { enabled: true, action: "Delete", timeout: 10 };

const pages = {
  overview: "00 / OVERVIEW",
  automod: "01 / PROTECTION",
  systems: "02 / SYSTEMS",
};

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
    symbol: "â†—",
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
  if (!el) return;
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

function rulesKey() {
  return `arclume-${currentGuild?.id || "none"}-rules-monolith-v1`;
}
function settingsKey() {
  return `arclume-${currentGuild?.id || "none"}-settings-monolith-v1`;
}
function loadRules() {
  try {
    const v = localStorage.getItem(rulesKey());
    return v ? JSON.parse(v) : clone(defaultRules);
  } catch {
    return clone(defaultRules);
  }
}
function saveRules(rules) {
  localStorage.setItem(rulesKey(), JSON.stringify(rules));
}
function loadSettings() {
  try {
    const v = localStorage.getItem(settingsKey());
    return v
      ? { ...defaultSettings, ...JSON.parse(v) }
      : { ...defaultSettings };
  } catch {
    return { ...defaultSettings };
  }
}
function saveSettings(settings) {
  localStorage.setItem(
    settingsKey(),
    JSON.stringify(settings)
  );
}
async function boot() {
  try {
    const response =
      await fetch(
        "/api/me",
        {
          credentials:
            "same-origin",
        },
      );
    if (!response.ok) {
      throw new Error(
        `Account request failed: ${response.status}`
      );
    }
    const data =
      await response.json();
    if (!data.loggedIn) {
      showState(
        "login"
      );
      return;
    }
    currentUser =
      data.user;
    guilds =
      Array.isArray(
        data.guilds
      )
        ? data.guilds
        : [];
    if (!guilds.length) {
      showState(
        "noServer"
      );
      return;
    }
    const saved =
      localStorage.getItem(
        "arclume-selected-guild"
      );
    currentGuild =
      guilds.find(
        (guild) =>
          guild.id === saved
      ) ||
      guilds[0];
    localStorage.setItem(
      "arclume-selected-guild",
      currentGuild.id
    );
    renderServerList();
    renderIdentity();
    renderRules();
    await loadBotStatus();
    const loadingState =
      document.getElementById(
        "loadingState"
      );
    const controlApp =
      document.getElementById(
        "controlApp"
      );
    if (loadingState) {
      loadingState.classList.add(
        "hidden"
      );
    }
    if (controlApp) {
      controlApp.classList.remove(
        "hidden"
      );
    }
    openPage(
      "overview"
    );
    renderCommands();
    console.log(
      "✅ Arclume dashboard loaded"
    );
  } catch (error) {
    console.error(
      "❌ Dashboard boot error:",
      error
    );
    showState(
      "login"
    );
  }
}function showState(name) {
  ["loadingState", "loginState", "noServerState"].forEach((id) =>
    document.getElementById(id).classList.add("hidden"),
  );
  if (name === "login")
    document.getElementById("loginState").classList.remove("hidden");
  if (name === "noServer")
    document.getElementById("noServerState").classList.remove("hidden");
}

function renderIdentity() {
  if (!currentGuild) return;
  const name = currentGuild.name || "Unnamed Server";
  const icon = guildIcon(currentGuild);
  ["headerServerIcon", "heroServerIcon"].forEach((id) =>
    renderAvatar(document.getElementById(id), icon, name),
  );
  document.getElementById("headerServerName").textContent = name;
  document.getElementById("heroServerName").textContent = name;
  document.getElementById("identityServerName").textContent = name;
  document.getElementById("identityServerId").textContent =
    `ID ${currentGuild.id}`;
  document.getElementById("identityUserName").textContent =
    currentUser?.globalName || currentUser?.username || "Discord User";
  updateOverview();
}

async function loadBotStatus() {
  const dot = document.getElementById("botStatusDot");
  const text = document.getElementById("botStatusText");
  try {
    const response = await fetch("/api/status");
    const data = await response.json();
    const online = Boolean(data.botOnline);
    text.textContent = online ? "ONLINE" : "OFFLINE";
    dot.className = online ? "online" : "offline";
  } catch {
    text.textContent = "UNKNOWN";
    dot.className = "offline";
  }
}

function updateOverview() {
  if (!currentGuild) return;
  const rules = loadRules();
  const settings = loadSettings();
  document.getElementById("overviewRuleCount").textContent = rules.length;
  document.getElementById("overviewProtectionState").textContent =
    settings.enabled ? "ARMED" : "DORMANT";
}

function openPage(name) {
  if (!pages[name]) return;
  document
    .querySelectorAll(".dash-page")
    .forEach((page) => page.classList.remove("active"));
  document.getElementById(`page-${name}`)?.classList.add("active");
  document
    .querySelectorAll("[data-page]")
    .forEach((btn) =>
      btn.classList.toggle("active", btn.dataset.page === name),
    );
  document.getElementById("pageCode").textContent = pages[name];
  if (name === "automod") renderRules();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document
  .querySelectorAll("[data-page]")
  .forEach((btn) =>
    btn.addEventListener("click", () => openPage(btn.dataset.page)),
  );
document
  .querySelectorAll("[data-open-page]")
  .forEach((btn) =>
    btn.addEventListener("click", () => openPage(btn.dataset.openPage)),
  );

function renderServerList() {
  const list = document.getElementById("serverList");
  list.innerHTML = "";
  guilds.forEach((guild) => {
    const button = document.createElement("button");
    button.className =
      "server-choice" + (guild.id === currentGuild?.id ? " active" : "");
    button.innerHTML = `<span class="server-choice-icon"></span><span><small>DISCORD COMMUNITY</small><b>${escapeHTML(guild.name)}</b></span><span>${guild.id === currentGuild?.id ? "ACTIVE" : "SELECT"}</span>`;
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
  const guild = guilds.find((g) => g.id === id);
  if (!guild) return;
  currentGuild = guild;
  localStorage.setItem("arclume-selected-guild", guild.id);
  renderServerList();
  renderIdentity();
  renderRules();
  closeOverlay("serverOverlay");
  toast(`SERVER CONTEXT â†’ ${guild.name}`);
}

function openServerOverlay() {
  document.getElementById("serverOverlay").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}
document
  .getElementById("serverButton")
  .addEventListener("click", openServerOverlay);
document
  .getElementById("overviewSwitchServer")
  .addEventListener("click", openServerOverlay);

function closeOverlay(id) {
  document.getElementById(id)?.classList.add("hidden");
  document.body.style.overflow = "";
}
document
  .querySelectorAll("[data-close]")
  .forEach((btn) =>
    btn.addEventListener("click", () => closeOverlay(btn.dataset.close)),
  );
document.querySelectorAll(".overlay").forEach((overlay) =>
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeOverlay(overlay.id);
  }),
);

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
  if (!currentGuild) return;
  const rules = loadRules();
  const settings = loadSettings();
  const search = document
    .getElementById("ruleSearch")
    .value.trim()
    .toLowerCase();
  const visible = rules.filter((r) =>
    [r.name, r.description, r.type, r.action]
      .join(" ")
      .toLowerCase()
      .includes(search),
  );
  const list = document.getElementById("rulesList");
  list.innerHTML = "";
  visible.forEach((rule) => {
    const row = document.createElement("div");
    row.className = "rule-row";
    row.innerHTML = `
      <div class="rule-main"><b>${escapeHTML(rule.name)}</b><small>${escapeHTML(rule.description)}</small></div>
      <div class="rule-cell"><small class="mono">TRIGGER</small><b>${escapeHTML(typeLabel(rule.type))} Â· ${rule.threshold}/${rule.window}s</b></div>
      <div class="rule-cell"><small class="mono">RESPONSE</small><b>${escapeHTML(rule.action)}</b></div>
      <div class="rule-state"><button class="toggle ${rule.enabled ? "on" : ""}" data-toggle-rule="${rule.id}"><i></i></button><label class="${rule.enabled ? "" : "off"}">${rule.enabled ? "ACTIVE" : "DORMANT"}</label></div>
      <div class="rule-menu"><button data-edit-rule="${rule.id}" title="Edit">âœŽ</button><button class="delete" data-delete-rule="${rule.id}" title="Delete">Ã—</button></div>`;
    list.appendChild(row);
  });
  document
    .getElementById("rulesEmpty")
    .classList.toggle("hidden", visible.length > 0);
  const active = rules.filter((r) => r.enabled).length;
  document.getElementById("summaryTotal").textContent = rules.length;
  document.getElementById("summaryActive").textContent = active;
  document.getElementById("summaryDormant").textContent = rules.length - active;
  document.getElementById("masterProtectionLabel").textContent =
    settings.enabled ? "ARMED" : "DORMANT";
  document
    .getElementById("masterProtectionToggle")
    .classList.toggle("on", settings.enabled);
  updateOverview();
  list
    .querySelectorAll("[data-toggle-rule]")
    .forEach((btn) =>
      btn.addEventListener("click", () => toggleRule(btn.dataset.toggleRule)),
    );
  list
    .querySelectorAll("[data-edit-rule]")
    .forEach((btn) =>
      btn.addEventListener("click", () => openRuleDrawer(btn.dataset.editRule)),
    );
  list
    .querySelectorAll("[data-delete-rule]")
    .forEach((btn) =>
      btn.addEventListener("click", () => deleteRule(btn.dataset.deleteRule)),
    );
}

document.getElementById("ruleSearch").addEventListener("input", renderRules);
function toggleRule(id) {
  const rules = loadRules();
  const rule = rules.find((r) => r.id === id);
  if (!rule) return;
  rule.enabled = !rule.enabled;
  saveRules(rules);
  renderRules();
}
function deleteRule(id) {
  const rules = loadRules();
  const rule = rules.find((r) => r.id === id);
  if (!rule) return;
  if (!confirm(`Delete â€œ${rule.name}â€?`)) return;
  saveRules(rules.filter((r) => r.id !== id));
  renderRules();
  toast("RULE DELETED");
}

document
  .getElementById("masterProtectionToggle")
  .addEventListener("click", () => {
    const settings = loadSettings();
    settings.enabled = !settings.enabled;
    saveSettings(settings);
    renderRules();
    toast(settings.enabled ? "PROTECTION ARMED" : "PROTECTION DORMANT");
  });

function openRuleDrawer(id = null) {
  editingRuleId = id;
  const rule = id ? loadRules().find((r) => r.id === id) : null;
  document.getElementById("ruleDrawerTitle").textContent = rule
    ? "Edit rule"
    : "New rule";
  document.getElementById("ruleName").value = rule?.name || "";
  document.getElementById("ruleDescription").value = rule?.description || "";
  document.getElementById("ruleType").value = rule?.type || "spam";
  document.getElementById("ruleThreshold").value = rule?.threshold || 5;
  document.getElementById("ruleWindow").value = rule?.window || 10;
  document.getElementById("ruleAction").value = rule?.action || "Delete";
  document.getElementById("ruleDrawerBackdrop").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  setTimeout(() => document.getElementById("ruleName").focus(), 80);
}
function closeRuleDrawer() {
  document.getElementById("ruleDrawerBackdrop").classList.add("hidden");
  document.body.style.overflow = "";
  editingRuleId = null;
}
document
  .getElementById("newRuleButton")
  .addEventListener("click", () => openRuleDrawer());
document
  .getElementById("closeRuleDrawer")
  .addEventListener("click", closeRuleDrawer);
document
  .getElementById("cancelRuleDrawer")
  .addEventListener("click", closeRuleDrawer);

document.getElementById("saveRuleButton").addEventListener("click", () => {
  const name = document.getElementById("ruleName").value.trim();
  if (!name) return toast("ENTER A RULE NAME");
  const rules = loadRules();
  const data = {
    name,
    description:
      document.getElementById("ruleDescription").value.trim() ||
      "Custom Arclume protection rule.",
    type: document.getElementById("ruleType").value,
    threshold: Number(document.getElementById("ruleThreshold").value) || 1,
    window: Number(document.getElementById("ruleWindow").value) || 1,
    action: document.getElementById("ruleAction").value,
  };
  if (editingRuleId) {
    const rule = rules.find((r) => r.id === editingRuleId);
    if (rule) Object.assign(rule, data);
  } else {
    rules.unshift({ id: `rule-${Date.now()}`, enabled: true, ...data });
  }
  saveRules(rules);
  closeRuleDrawer();
  renderRules();
  toast(editingRuleId ? "RULE UPDATED" : "RULE CREATED");
});

function openDefaults() {
  const settings = loadSettings();
  document.getElementById("defaultAction").value = settings.action;
  document.getElementById("defaultTimeout").value = settings.timeout;
  document.getElementById("defaultsDrawerBackdrop").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}
function closeDefaults() {
  document.getElementById("defaultsDrawerBackdrop").classList.add("hidden");
  document.body.style.overflow = "";
}
document
  .getElementById("matrixDefaultsButton")
  .addEventListener("click", openDefaults);
document
  .getElementById("closeDefaultsDrawer")
  .addEventListener("click", closeDefaults);
document
  .getElementById("cancelDefaultsDrawer")
  .addEventListener("click", closeDefaults);
document.getElementById("saveDefaultsButton").addEventListener("click", () => {
  const settings = loadSettings();
  settings.action = document.getElementById("defaultAction").value;
  settings.timeout =
    Number(document.getElementById("defaultTimeout").value) || 10;
  saveSettings(settings);
  closeDefaults();
  toast("DEFAULTS SAVED");
});

function filteredCommands() {
  const q = document.getElementById("commandInput").value.trim().toLowerCase();
  return q
    ? commands.filter((c) =>
        [c.title, c.subtitle, c.keywords].join(" ").toLowerCase().includes(q),
      )
    : commands;
}
function renderCommands() {
  const items = filteredCommands();
  if (commandIndex >= items.length) commandIndex = 0;
  const box = document.getElementById("commandResults");
  box.innerHTML = "";
  items.forEach((cmd, index) => {
    const button = document.createElement("button");
    button.className =
      "command-result" + (index === commandIndex ? " selected" : "");
    button.innerHTML = `<span>${escapeHTML(cmd.symbol)}</span><span><b>${escapeHTML(cmd.title)}</b><small>${escapeHTML(cmd.subtitle)}</small></span>`;
    button.addEventListener("click", () => runCommand(cmd));
    box.appendChild(button);
  });
}
function openCommand() {
  document.getElementById("commandOverlay").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  const input = document.getElementById("commandInput");
  input.value = "";
  commandIndex = 0;
  renderCommands();
  setTimeout(() => input.focus(), 60);
}
function closeCommand() {
  closeOverlay("commandOverlay");
}
function runCommand(cmd) {
  closeCommand();
  cmd.action();
}
document.getElementById("commandButton").addEventListener("click", openCommand);
document.getElementById("commandInput").addEventListener("input", () => {
  commandIndex = 0;
  renderCommands();
});

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.key.toLowerCase() === "k") {
    event.preventDefault();
    document.getElementById("commandOverlay").classList.contains("hidden")
      ? openCommand()
      : closeCommand();
    return;
  }
  const commandOpen = !document
    .getElementById("commandOverlay")
    .classList.contains("hidden");
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
      if (list[commandIndex]) runCommand(list[commandIndex]);
    }
  }
  if (event.key === "Escape") {
    closeCommand();
    closeOverlay("serverOverlay");
    closeRuleDrawer();
    closeDefaults();
  }
});

let toastTimer = null;
function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

boot();


