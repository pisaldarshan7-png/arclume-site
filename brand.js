"use strict";

/* =========================================================
   ARCLUME GLOBAL BRAND SYSTEM
   ---------------------------------------------------------
   One logo source for the entire Arclume website.

   Logo:
   /arclume-logo.png

   Handles:
   - Browser favicon
   - Apple touch icon
   - Header logo
   - Loading screen logo
   - Login screen logo
   - Future dynamically-created Arclume logo elements
========================================================= */

(() => {
  const LOGO_URL = "/arclume-logo.png?v=20261002-brand";
  const BRAND_STYLE_ID = "arclume-global-brand-style";

  /* =======================================================
     FAVICON
  ======================================================= */

  function installFavicon() {
    let favicon = document.querySelector(
      'link[rel="icon"][data-arclume-brand]',
    );

    if (!favicon) {
      favicon = document.createElement("link");

      favicon.rel = "icon";
      favicon.type = "image/png";

      favicon.dataset.arclumeBrand = "true";

      document.head.appendChild(favicon);
    }

    favicon.href = LOGO_URL;

    let appleIcon = document.querySelector(
      'link[rel="apple-touch-icon"][data-arclume-brand]',
    );

    if (!appleIcon) {
      appleIcon = document.createElement("link");

      appleIcon.rel = "apple-touch-icon";

      appleIcon.dataset.arclumeBrand = "true";

      document.head.appendChild(appleIcon);
    }

    appleIcon.href = LOGO_URL;
  }

  /* =======================================================
     GLOBAL BRAND CSS
  ======================================================= */

  function installBrandStyles() {
    if (document.getElementById(BRAND_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");

    style.id = BRAND_STYLE_ID;

    style.textContent = `
      .arclume-global-logo {
        display: grid !important;
        place-items: center !important;

        overflow: hidden !important;

        padding: 0 !important;

        background: #11110f !important;

        border: 1px solid rgba(255,255,255,.13) !important;

        color: transparent !important;

        font-size: 0 !important;

        line-height: 0 !important;
      }

      .arclume-global-logo > img {
        width: 100% !important;
        height: 100% !important;

        display: block !important;

        object-fit: cover !important;

        border: 0 !important;

        border-radius: inherit !important;
      }

      .brand-mark.arclume-global-logo,
      .brand-logo.arclume-global-logo {
        width: 42px !important;
        height: 42px !important;

        flex: 0 0 42px !important;

        border-radius: 12px !important;

        box-shadow:
          0 0 20px rgba(120,104,255,.10),
          inset 0 0 12px rgba(255,255,255,.025) !important;
      }

      .state-mark.arclume-global-logo,
      .state-logo.arclume-global-logo {
        width: 72px !important;
        height: 72px !important;

        margin-left: auto !important;
        margin-right: auto !important;

        border-radius: 20px !important;

        box-shadow:
          0 0 40px rgba(120,104,255,.12),
          inset 0 0 18px rgba(255,255,255,.025) !important;
      }

      [data-arclume-logo].arclume-global-logo {
        overflow: hidden !important;
      }
    `;

    document.head.appendChild(style);
  }

  /* =======================================================
     BUILD LOGO
  ======================================================= */

  function createLogoImage() {
    const image = document.createElement("img");

    image.src = LOGO_URL;
    image.alt = "Arclume";
    image.draggable = false;

    image.addEventListener("error", () => {
      console.warn("[Arclume Brand] Could not load /arclume-logo.png");
    });

    return image;
  }

  /* =======================================================
     CONVERT ELEMENT INTO LOGO
  ======================================================= */

  function brandElement(element) {
    if (!element) {
      return;
    }

    /*
      Never replace Discord server icons.

      Those are supposed to display the server's
      actual Discord icon.
    */

    if (
      element.classList.contains("server-icon") ||
      element.classList.contains("server-choice-icon") ||
      element.classList.contains("member-avatar") ||
      element.classList.contains("selected-avatar")
    ) {
      return;
    }

    if (element.dataset.arclumeLogoApplied === "true") {
      return;
    }

    element.dataset.arclumeLogoApplied = "true";

    element.classList.add("arclume-global-logo");

    element.replaceChildren(createLogoImage());
  }

  /* =======================================================
     FIND BRAND ELEMENTS
  ======================================================= */

  function applyBranding(root = document) {
    const selectors = [
      ".brand-mark",
      ".brand-logo",
      ".state-mark",
      ".state-logo",
      "[data-arclume-logo]",
    ];

    for (const selector of selectors) {
      /*
        The supplied root might itself be a matching node.
      */

      if (root instanceof Element && root.matches(selector)) {
        brandElement(root);
      }

      if (typeof root.querySelectorAll === "function") {
        root.querySelectorAll(selector).forEach(brandElement);
      }
    }
  }

  /* =======================================================
     PAGE TITLE
  ======================================================= */

  function normalizeTitle() {
    const title = String(document.title || "").trim();

    if (!title) {
      document.title = "Arclume";

      return;
    }

    /*
      Fix old broken encoding such as:
      Arclume â€” Roles
    */

    document.title = title
      .replaceAll("â€”", "—")
      .replaceAll("â€“", "–")
      .replaceAll("â†’", "→")
      .replaceAll("â†", "←")
      .replaceAll("â†—", "↗")
      .replaceAll("â€¦", "…")
      .replaceAll("Ã—", "×")
      .replaceAll("âŒ„", "⌄");
  }

  /* =======================================================
     FIX COMMON BROKEN TEXT
  ======================================================= */

  const TEXT_REPLACEMENTS = [
    ["â€”", "—"],
    ["â€“", "–"],
    ["â†’", "→"],
    ["â†", "←"],
    ["â†—", "↗"],
    ["â€¦", "…"],
    ["Ã—", "×"],
    ["âŒ„", "⌄"],
  ];

  function repairTextNode(node) {
    if (!node?.nodeValue) {
      return;
    }

    let value = node.nodeValue;

    for (const [broken, fixed] of TEXT_REPLACEMENTS) {
      value = value.replaceAll(broken, fixed);
    }

    if (value !== node.nodeValue) {
      node.nodeValue = value;
    }
  }

  function repairBrokenText(root = document.body) {
    if (!root) {
      return;
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

    let node;

    while ((node = walker.nextNode())) {
      repairTextNode(node);
    }

    const elements =
      root.querySelectorAll?.("input[placeholder], textarea[placeholder]") ||
      [];

    elements.forEach((element) => {
      let placeholder = element.placeholder || "";

      for (const [broken, fixed] of TEXT_REPLACEMENTS) {
        placeholder = placeholder.replaceAll(broken, fixed);
      }

      element.placeholder = placeholder;
    });
  }

  /* =======================================================
     WATCH NEW CONTENT
  ======================================================= */

  function startBrandObserver() {
    if (!document.body) {
      return;
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            repairTextNode(node);

            return;
          }

          if (!(node instanceof Element)) {
            return;
          }

          applyBranding(node);

          repairBrokenText(node);
        });
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /* =======================================================
     START
  ======================================================= */

  function startBrandSystem() {
    installFavicon();

    installBrandStyles();

    normalizeTitle();

    applyBranding();

    repairBrokenText();

    startBrandObserver();

    console.log("✨ Arclume global branding loaded");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startBrandSystem, {
      once: true,
    });
  } else {
    startBrandSystem();
  }
})();
