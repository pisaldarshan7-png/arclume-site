/* =====================================================
   ELEMENTS
===================================================== */

const menuTrigger = document.getElementById("menuTrigger");

const drawerClose = document.getElementById("drawerClose");

const commandDrawer = document.getElementById("commandDrawer");

const menuBackdrop = document.getElementById("menuBackdrop");

/* =====================================================
   DRAWER
===================================================== */

function openDrawer() {
  if (!commandDrawer || !menuBackdrop) {
    return;
  }

  commandDrawer.classList.add("open");

  menuBackdrop.classList.add("open");

  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  if (!commandDrawer || !menuBackdrop) {
    return;
  }

  commandDrawer.classList.remove("open");

  menuBackdrop.classList.remove("open");

  document.body.style.overflow = "";
}

if (menuTrigger) {
  menuTrigger.addEventListener("click", openDrawer);
}

if (drawerClose) {
  drawerClose.addEventListener("click", closeDrawer);
}

if (menuBackdrop) {
  menuBackdrop.addEventListener("click", closeDrawer);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeDrawer();
  }
});

/* =====================================================
   CLOSE MENU AFTER NAVIGATION
===================================================== */

document.querySelectorAll(".drawer-link").forEach((link) => {
  link.addEventListener("click", () => {
    closeDrawer();
  });
});

/* =====================================================
   USER
===================================================== */

async function loadCurrentUser() {
  try {
    const response = await fetch("/api/me", {
      credentials: "same-origin",
    });

    const data = await response.json();

    if (!data.loggedIn || !data.user) {
      window.location.href = "/auth/discord";

      return;
    }

    updateUser(data.user);

    const guilds = Array.isArray(data.guilds) ? data.guilds : [];

    if (guilds.length) {
      updateServer(guilds[0]);
    } else {
      setNoServer();
    }
  } catch (error) {
    console.error("Could not load account:", error);
  }
}

/* =====================================================
   UPDATE USER
===================================================== */

function updateUser(user) {
  const username = document.getElementById("drawerUsername");

  const avatar = document.getElementById("drawerAvatar");

  if (username) {
    username.textContent = user.globalName || user.username;
  }

  if (!avatar) {
    return;
  }

  if (user.avatar) {
    avatar.innerHTML = `
      <img
        src="https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128"
        alt=""
      >
      `;
  } else {
    avatar.textContent = user.username.charAt(0).toUpperCase();
  }
}

/* =====================================================
   UPDATE SERVER
===================================================== */

function updateServer(guild) {
  const drawerName = document.getElementById("drawerServerName");

  const drawerMeta = document.getElementById("drawerServerMeta");

  const drawerIcon = document.getElementById("drawerServerIcon");

  const largeName = document.getElementById("serverLargeName");

  const largeStatus = document.getElementById("serverLargeStatus");

  const largeIcon = document.getElementById("serverLargeIcon");

  if (drawerName) {
    drawerName.textContent = guild.name;
  }

  if (drawerMeta) {
    drawerMeta.textContent = "Manage Server";
  }

  if (largeName) {
    largeName.textContent = guild.name;
  }

  if (largeStatus) {
    largeStatus.textContent = "Arclume management context active.";
  }

  const iconURL = guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
    : null;

  if (iconURL && drawerIcon) {
    drawerIcon.innerHTML = `
      <img
        src="${iconURL}"
        alt=""
      >
      `;
  }

  if (iconURL && largeIcon) {
    largeIcon.innerHTML = `
      <img
        src="${iconURL}"
        alt=""
      >
      `;
  }

  if (!iconURL) {
    const letter = guild.name.charAt(0).toUpperCase();

    if (drawerIcon) {
      drawerIcon.textContent = letter;
    }

    if (largeIcon) {
      largeIcon.textContent = letter;
    }
  }
}

/* =====================================================
   NO SERVER
===================================================== */

function setNoServer() {
  const drawerName = document.getElementById("drawerServerName");

  const drawerMeta = document.getElementById("drawerServerMeta");

  const largeName = document.getElementById("serverLargeName");

  const largeStatus = document.getElementById("serverLargeStatus");

  if (drawerName) {
    drawerName.textContent = "No manageable server";
  }

  if (drawerMeta) {
    drawerMeta.textContent = "Discord";
  }

  if (largeName) {
    largeName.textContent = "No server selected";
  }

  if (largeStatus) {
    largeStatus.textContent = "Add Arclume to a server you manage.";
  }
}

/* =====================================================
   BOT STATUS
===================================================== */

async function loadBotStatus() {
  try {
    const response = await fetch("/api/status");

    const data = await response.json();

    const text = document.getElementById("botStatusText");

    if (!text) {
      return;
    }

    text.textContent = data.botOnline ? "SYSTEM ONLINE" : "SYSTEM OFFLINE";
  } catch (error) {
    console.error("Could not load bot status:", error);
  }
}

/* =====================================================
   ACTIVE NAV LINK
===================================================== */

function setupNavigation() {
  const links = document.querySelectorAll(".drawer-link");

  links.forEach((link) => {
    link.addEventListener("click", () => {
      links.forEach((item) => {
        item.classList.remove("active");
      });

      link.classList.add("active");
    });
  });
}

/* =====================================================
   START
===================================================== */

loadCurrentUser();

loadBotStatus();

setupNavigation();
