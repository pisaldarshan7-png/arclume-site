"use strict";

(() => {
  "use strict";

  const MODULES = [
    {
      name: "Applications",
      number: "12",
      script: "/applications-settings.js?v=20261010-2",
      navID: "applicationsNavButton",
      pageID: "page-applications",
    },

    {
      name: "Access Lock",
      number: "13",
      script: "/access-lock.js?v=20261010-3",
      navID: "accessLockNavButton",
      pageID: "page-access-lock",
    },
  ];

  /* =====================================================
     HELPERS
  ===================================================== */

  function byID(id) {
    return document.getElementById(id);
  }

  function findDockItem(name) {
    const wanted = String(name || "")
      .trim()
      .toLowerCase();

    return Array.from(
      document.querySelectorAll(".control-dock button, .control-dock a"),
    ).find((item) => {
      const label =
        item.querySelector("b")?.textContent?.trim().toLowerCase() || "";

      return label === wanted;
    });
  }

  function getLogoutButton() {
    return Array.from(
      document.querySelectorAll(".control-dock button, .control-dock a"),
    ).find((item) => {
      const text =
        item.querySelector("b")?.textContent?.trim().toLowerCase() || "";

      return text === "logout";
    });
  }

  /* =====================================================
     SCRIPT LOADER
  ===================================================== */

  function scriptAlreadyLoaded(fileName) {
    return Array.from(document.scripts).some((script) =>
      String(script.src || "").includes(fileName),
    );
  }

  function loadScript(module) {
    const fileName = module.script.split("?")[0];

    if (scriptAlreadyLoaded(fileName)) {
      return;
    }

    const script = document.createElement("script");

    script.src = module.script;

    script.async = false;

    script.dataset.arclumeModule = module.name;

    script.onload = () => {
      console.log(`✅ ${module.name} website module loaded`);

      setTimeout(normalizeModules, 100);
    };

    script.onerror = () => {
      console.error(`❌ Could not load ${module.name}: ${module.script}`);
    };

    document.body.appendChild(script);
  }

  /* =====================================================
     NUMBERING
  ===================================================== */

  function updateNumber(name, number) {
    const nav = findDockItem(name);

    if (nav) {
      const numberElement = nav.querySelector("span");

      if (numberElement) {
        numberElement.textContent = number;
      }
    }

    /*
      Update Overview card number.
    */

    if (name === "Applications") {
      const overview = byID("overviewApplicationsButton");

      const numberElement = overview?.querySelector(".ledger-index");

      if (numberElement) {
        numberElement.textContent = number;
      }
    }

    if (name === "Access Lock") {
      const overview = byID("overviewAccessLockButton");

      const numberElement = overview?.querySelector(".ledger-index");

      if (numberElement) {
        numberElement.textContent = number;
      }
    }

    /*
      Update Systems page card number.
    */

    if (name === "Applications") {
      const button = byID("systemApplicationsButton");

      const row = button?.closest(".system-index-row");

      const numberElement = row?.querySelector(".mono");

      if (numberElement) {
        numberElement.textContent = number;
      }
    }

    if (name === "Access Lock") {
      const button = byID("systemAccessLockButton");

      const row = button?.closest(".system-index-row");

      const numberElement = row?.querySelector(".mono");

      if (numberElement) {
        numberElement.textContent = number;
      }
    }
  }

  /* =====================================================
     ORDER
  ===================================================== */

  function normalizeOrder() {
    const dock = document.querySelector(".control-dock");

    if (!dock) {
      return;
    }

    const applications = findDockItem("Applications");

    const accessLock = findDockItem("Access Lock");

    const logout = getLogoutButton();

    /*
      Required order:

      12 Applications
      13 Access Lock
      Logout
    */

    if (applications && accessLock) {
      dock.insertBefore(applications, accessLock);
    }

    if (logout && accessLock) {
      dock.insertBefore(accessLock, logout);
    }
  }

  /* =====================================================
     FIX ACCESS LOCK NUMBER
  ===================================================== */

  function fixAccessLockPage() {
    const page = byID("page-access-lock");

    if (!page) {
      return;
    }

    const eyebrow = page.querySelector(".eyebrow");

    if (eyebrow && eyebrow.textContent.toLowerCase().includes("access")) {
      eyebrow.textContent = "13 / ACCESS CONTROL";
    }
  }

  /* =====================================================
     FIX APPLICATIONS NUMBER
  ===================================================== */

  function fixApplicationsPage() {
    const page = byID("page-applications");

    if (!page) {
      return;
    }

    const eyebrow = page.querySelector(".eyebrow");

    if (eyebrow && eyebrow.textContent.toLowerCase().includes("application")) {
      eyebrow.textContent = "12 / APPLICATIONS CENTER";
    }
  }

  /* =====================================================
     NORMALIZE ALL
  ===================================================== */

  function normalizeModules() {
    updateNumber("Applications", "12");

    updateNumber("Access Lock", "13");

    fixApplicationsPage();

    fixAccessLockPage();

    normalizeOrder();
  }

  /* =====================================================
     ENSURE MODULES
  ===================================================== */

  function ensureModules() {
    for (const module of MODULES) {
      const nav = byID(module.navID);

      const page = byID(module.pageID);

      if (!nav || !page) {
        loadScript(module);
      }
    }

    normalizeModules();
  }

  /* =====================================================
     INIT
  ===================================================== */

  function init() {
    ensureModules();

    /*
      Modules are dynamically generated,
      so retry a few times while the
      dashboard finishes loading.
    */

    [250, 700, 1200, 2000, 3500].forEach((delay) => {
      setTimeout(() => {
        ensureModules();
      }, delay);
    });

    console.log("🧩 Arclume module loader ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
      once: true,
    });
  } else {
    init();
  }
})();
