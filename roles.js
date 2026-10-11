/* =========================================================
   ARCLUME — ROLE MANAGEMENT
   CLEAN BUILD V1

   Handles:
   - Server selection
   - Member loading
   - Role loading
   - Give role
   - Remove role
   - Role directory

   Reaction Roles are handled separately by:
   public/reaction-roles.js
========================================================= */

"use strict";

/* =========================================================
   STATE
========================================================= */

let currentUser = null;

let guilds = [];

let currentGuild = null;

let members = [];

let roles = [];

let selectedMember = null;

let loadingData = false;

let roleActionBusy = false;

/* =========================================================
   ELEMENTS
========================================================= */

const loadingState = document.getElementById("loadingState");

const loginState = document.getElementById("loginState");

const rolesApp = document.getElementById("rolesApp");

const serverButton = document.getElementById("serverButton");

const serverIcon = document.getElementById("serverIcon");

const serverName = document.getElementById("serverName");

const serverOverlay = document.getElementById("serverOverlay");

const closeServerOverlay = document.getElementById("closeServerOverlay");

const serverList = document.getElementById("serverList");

const memberCountStat = document.getElementById("memberCountStat");

const roleCountStat = document.getElementById("roleCountStat");

const manageableCountStat = document.getElementById("manageableCountStat");

const memberCountLabel = document.getElementById("memberCountLabel");

const memberSearch = document.getElementById("memberSearch");

const memberList = document.getElementById("memberList");

const selectedMemberAvatar = document.getElementById("selectedMemberAvatar");

const selectedMemberName = document.getElementById("selectedMemberName");

const selectedMemberUsername = document.getElementById(
  "selectedMemberUsername",
);

const selectedMemberRoles = document.getElementById("selectedMemberRoles");

const roleSelect = document.getElementById("roleSelect");

const giveRoleButton = document.getElementById("giveRoleButton");

const removeRoleButton = document.getElementById("removeRoleButton");

const actionStatus = document.getElementById("actionStatus");

const refreshButton = document.getElementById("refreshButton");

const roleDirectory = document.getElementById("roleDirectory");

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

function memberAvatarURL(member) {
  if (!member?.id || !member?.avatar) {
    return null;
  }

  return (
    `https://cdn.discordapp.com/avatars/` +
    `${member.id}/${member.avatar}.png?size=128`
  );
}

function memberDisplayName(member) {
  return (
    member?.displayName || member?.globalName || member?.username || "Member"
  );
}

function roleColor(role) {
  if (!role?.color || role.color === "#000000") {
    return "#77736a";
  }

  return role.color;
}

function manageableRoles() {
  return roles.filter((role) => role.assignable === true);
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

  image.addEventListener("error", () => {
    element.replaceChildren();

    element.textContent = firstLetter(fallback);
  });

  element.appendChild(image);
}

/* =========================================================
   FETCH
========================================================= */

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",

    ...options,
  });

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

  toastTimer = setTimeout(() => {
    toastElement.classList.remove("show");
  }, 2600);
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

    const copy = document.createElement("span");

    const small = document.createElement("small");

    small.textContent = "DISCORD COMMUNITY";

    const strong = document.createElement("strong");

    strong.textContent = guild.name || "Discord Server";

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

/* =========================================================
   SELECT SERVER
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

  localStorage.setItem("arclume-selected-guild", guild.id);

  selectedMember = null;

  memberSearch.value = "";

  roleSelect.value = "";

  renderServerIdentity();

  renderServerList();

  renderSelectedMember();

  updateActionButtons();

  closeServerSelector();

  await loadGuildData();

  toast(`SERVER → ${guild.name}`);
}

/* =========================================================
   STATS
========================================================= */

function renderStats() {
  memberCountStat.textContent = members.length;

  roleCountStat.textContent = roles.length;

  manageableCountStat.textContent = manageableRoles().length;

  memberCountLabel.textContent = `${members.length} member${
    members.length === 1 ? "" : "s"
  } available`;
}

/* =========================================================
   MEMBER LIST
========================================================= */

function renderMembers() {
  memberList.replaceChildren();

  const query = memberSearch.value.trim().toLowerCase();

  const filtered = members.filter((member) => {
    if (!query) {
      return true;
    }

    const searchable = [member.displayName, member.globalName, member.username]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(query);
  });

  if (!filtered.length) {
    const empty = document.createElement("div");

    empty.style.padding = "28px 18px";

    empty.style.color = "var(--dim)";

    empty.style.fontSize = "10px";

    empty.textContent = query
      ? "No members match your search."
      : "No members found.";

    memberList.appendChild(empty);

    return;
  }

  filtered.forEach((member) => {
    const button = document.createElement("button");

    button.type = "button";

    button.className =
      "member-item" + (selectedMember?.id === member.id ? " active" : "");

    const avatar = document.createElement("span");

    avatar.className = "member-avatar";

    renderImage(avatar, memberAvatarURL(member), memberDisplayName(member));

    const info = document.createElement("span");

    info.className = "member-info";

    const name = document.createElement("strong");

    name.textContent = memberDisplayName(member);

    const username = document.createElement("small");

    username.textContent = `@${member.username}`;

    info.appendChild(name);

    info.appendChild(username);

    const count = document.createElement("span");

    count.className = "member-role-count";

    const memberRoles = Array.isArray(member.roles) ? member.roles : [];

    count.textContent = `${memberRoles.length} ROLE${
      memberRoles.length === 1 ? "" : "S"
    }`;

    button.appendChild(avatar);

    button.appendChild(info);

    button.appendChild(count);

    button.addEventListener("click", () => {
      selectMember(member.id);
    });

    memberList.appendChild(button);
  });
}

/* =========================================================
   SELECT MEMBER
========================================================= */

function selectMember(memberID) {
  const member = members.find((item) => item.id === memberID);

  if (!member) {
    return;
  }

  selectedMember = member;

  renderMembers();

  renderSelectedMember();

  updateActionButtons();
}

/* =========================================================
   SELECTED MEMBER
========================================================= */

function renderSelectedMember() {
  selectedMemberRoles.replaceChildren();

  if (!selectedMember) {
    selectedMemberName.textContent = "No member selected";

    selectedMemberUsername.textContent = "Select someone from the list.";

    selectedMemberAvatar.replaceChildren();

    selectedMemberAvatar.textContent = "?";

    const empty = document.createElement("span");

    empty.style.color = "var(--dim)";

    empty.style.fontSize = "9px";

    empty.textContent = "No member selected.";

    selectedMemberRoles.appendChild(empty);

    return;
  }

  selectedMemberName.textContent = memberDisplayName(selectedMember);

  selectedMemberUsername.textContent = `@${selectedMember.username}`;

  renderImage(
    selectedMemberAvatar,
    memberAvatarURL(selectedMember),
    memberDisplayName(selectedMember),
  );

  const memberRoles = Array.isArray(selectedMember.roles)
    ? selectedMember.roles
    : [];

  if (!memberRoles.length) {
    const empty = document.createElement("span");

    empty.style.color = "var(--dim)";

    empty.style.fontSize = "9px";

    empty.textContent = "No custom roles.";

    selectedMemberRoles.appendChild(empty);

    return;
  }

  memberRoles.forEach((role) => {
    const chip = document.createElement("span");

    chip.className = "role-chip";

    const dot = document.createElement("i");

    dot.className = "role-dot";

    dot.style.background = roleColor(role);

    const name = document.createElement("span");

    name.textContent = role.name;

    chip.appendChild(dot);

    chip.appendChild(name);

    selectedMemberRoles.appendChild(chip);
  });
}

/* =========================================================
   ROLE SELECT
========================================================= */

function renderRoleSelect() {
  const previousValue = roleSelect.value;

  roleSelect.replaceChildren();

  const placeholder = document.createElement("option");

  placeholder.value = "";

  placeholder.textContent = "Select a role";

  roleSelect.appendChild(placeholder);

  roles.forEach((role) => {
    const option = document.createElement("option");

    option.value = role.id;

    if (role.assignable) {
      option.textContent = role.name;
    } else {
      option.textContent = `${role.name} — Locked`;

      option.disabled = true;
    }

    roleSelect.appendChild(option);
  });

  const exists = Array.from(roleSelect.options).some(
    (option) => option.value === previousValue && !option.disabled,
  );

  roleSelect.value = exists ? previousValue : "";
}

/* =========================================================
   ROLE DIRECTORY
========================================================= */

function renderRoleDirectory() {
  roleDirectory.replaceChildren();

  if (!roles.length) {
    const empty = document.createElement("div");

    empty.style.padding = "22px";

    empty.style.color = "var(--dim)";

    empty.textContent = "No server roles found.";

    roleDirectory.appendChild(empty);

    return;
  }

  roles.forEach((role) => {
    const card = document.createElement("article");

    card.className = "role-card";

    const top = document.createElement("div");

    top.className = "role-card-top";

    const dot = document.createElement("span");

    dot.className = "role-card-dot";

    dot.style.background = roleColor(role);

    const name = document.createElement("strong");

    name.textContent = role.name;

    top.appendChild(dot);

    top.appendChild(name);

    const meta = document.createElement("div");

    meta.className = "role-card-meta";

    const position = document.createElement("div");

    position.textContent = `Position: ${role.position ?? "—"}`;

    const count = document.createElement("div");

    count.textContent = `Members: ${role.memberCount ?? 0}`;

    meta.appendChild(position);

    meta.appendChild(count);

    const state = document.createElement("span");

    state.className =
      "role-state " + (role.assignable ? "manageable" : "locked");

    state.textContent = role.assignable
      ? "CAN GIVE / REMOVE"
      : "MOVE ARCLUME ABOVE ROLE";

    card.appendChild(top);

    card.appendChild(meta);

    card.appendChild(state);

    roleDirectory.appendChild(card);
  });
}

/* =========================================================
   ACTION BUTTONS
========================================================= */

function updateActionButtons() {
  const roleID = roleSelect.value;

  const role = roles.find((item) => item.id === roleID);

  if (roleActionBusy) {
    giveRoleButton.disabled = true;

    removeRoleButton.disabled = true;

    return;
  }

  if (!selectedMember || !role || !role.assignable) {
    giveRoleButton.disabled = true;

    removeRoleButton.disabled = true;

    actionStatus.textContent = !selectedMember
      ? "Select a member first."
      : "Select a manageable role.";

    return;
  }

  const hasRole =
    Array.isArray(selectedMember.roles) &&
    selectedMember.roles.some((memberRole) => memberRole.id === role.id);

  giveRoleButton.disabled = hasRole;

  removeRoleButton.disabled = !hasRole;

  if (hasRole) {
    actionStatus.textContent = `${memberDisplayName(
      selectedMember,
    )} currently has ${role.name}.`;
  } else {
    actionStatus.textContent = `${memberDisplayName(
      selectedMember,
    )} does not have ${role.name}.`;
  }
}

/* =========================================================
   CHANGE ROLE
========================================================= */

async function changeRole(action) {
  if (!currentGuild || !selectedMember || !roleSelect.value || roleActionBusy) {
    return;
  }

  const role = roles.find((item) => item.id === roleSelect.value);

  if (!role || !role.assignable) {
    toast("THIS ROLE CANNOT BE MANAGED", true);

    return;
  }

  const memberID = selectedMember.id;

  roleActionBusy = true;

  updateActionButtons();

  actionStatus.textContent =
    action === "give" ? "Giving role..." : "Removing role...";

  try {
    const data = await fetchJSON(
      `/api/guild/${currentGuild.id}/roles-manager/${action}`,

      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          memberID,

          roleID: role.id,
        }),
      },
    );

    if (data.alreadyAssigned || data.alreadyRemoved) {
      toast(data.message || "No change was needed.");
    }

    await Promise.all([loadRoles(), loadMembers()]);

    selectedMember = members.find((member) => member.id === memberID) || null;

    renderStats();

    renderMembers();

    renderRoleSelect();

    renderSelectedMember();

    renderRoleDirectory();

    roleSelect.value = role.id;

    if (action === "give") {
      toast(`ROLE GIVEN → ${role.name}`);
    } else {
      toast(`ROLE REMOVED → ${role.name}`);
    }
  } catch (error) {
    console.error("Role action error:", error);

    actionStatus.textContent = error.message || "Role action failed.";

    toast(error.message || "Role action failed.", true);
  } finally {
    roleActionBusy = false;

    updateActionButtons();
  }
}

/* =========================================================
   LOAD ROLES
========================================================= */

async function loadRoles() {
  const data = await fetchJSON(
    `/api/guild/${currentGuild.id}/roles-manager/roles`,
  );

  roles = Array.isArray(data.roles) ? data.roles : [];

  if (data.guild) {
    currentGuild = {
      ...currentGuild,

      ...data.guild,
    };

    renderServerIdentity();
  }
}

/* =========================================================
   LOAD MEMBERS
========================================================= */

async function loadMembers() {
  const data = await fetchJSON(
    `/api/guild/${currentGuild.id}/roles-manager/members`,
  );

  members = Array.isArray(data.members) ? data.members : [];
}

/* =========================================================
   RESET MEMBER
========================================================= */

function resetSelectedMember() {
  selectedMember = null;

  roleSelect.value = "";

  renderSelectedMember();

  updateActionButtons();
}

/* =========================================================
   LOAD GUILD DATA
========================================================= */

async function loadGuildData() {
  if (!currentGuild || loadingData) {
    return;
  }

  loadingData = true;

  refreshButton.disabled = true;

  refreshButton.textContent = "REFRESHING...";

  memberCountLabel.textContent = "Loading Discord members...";

  try {
    await Promise.all([loadRoles(), loadMembers()]);

    resetSelectedMember();

    renderStats();

    renderMembers();

    renderRoleSelect();

    renderSelectedMember();

    renderRoleDirectory();

    memberCountLabel.textContent = `${members.length} member${
      members.length === 1 ? "" : "s"
    } available`;
  } catch (error) {
    console.error("Member / role loading error:", error);

    memberCountLabel.textContent =
      error.message || "Could not load Discord members.";

    toast(error.message || "Could not load members and roles.", true);
  } finally {
    loadingData = false;

    refreshButton.disabled = false;

    refreshButton.textContent = "REFRESH DISCORD DATA";
  }
}

/* =========================================================
   EVENTS
========================================================= */

serverButton.addEventListener("click", openServerSelector);

closeServerOverlay.addEventListener("click", closeServerSelector);

serverOverlay.addEventListener("click", (event) => {
  if (event.target === serverOverlay) {
    closeServerSelector();
  }
});

memberSearch.addEventListener("input", renderMembers);

roleSelect.addEventListener("change", updateActionButtons);

giveRoleButton.addEventListener("click", () => {
  changeRole("give");
});

removeRoleButton.addEventListener("click", () => {
  changeRole("remove");
});

refreshButton.addEventListener("click", async () => {
  await loadGuildData();

  toast("DISCORD DATA REFRESHED");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeServerSelector();
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

    const storedGuild = localStorage.getItem("arclume-selected-guild");

    currentGuild =
      guilds.find((guild) => guild.id === storedGuild) || guilds[0];

    localStorage.setItem("arclume-selected-guild", currentGuild.id);

    renderServerIdentity();

    renderServerList();

    loadingState.classList.add("hidden");

    loginState.classList.add("hidden");

    rolesApp.classList.remove("hidden");

    await loadGuildData();
  } catch (error) {
    console.error("Role Manager boot error:", error);

    loadingState.classList.add("hidden");

    loginState.classList.remove("hidden");

    toast(error.message || "Could not start Role Management.", true);
  }
}

/* =========================================================
   START
========================================================= */

boot();
