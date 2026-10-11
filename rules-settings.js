"use strict";

(() => {
  /* =========================================================
     ARCLUME RULES STUDIO
  ========================================================= */

  const VERSION = "20261004-1";

  const DEFAULT_RULES = [
    {
      id: "rule-1",
      title: "Be Respectful",
      description:
        "Treat every member with respect. Harassment, discrimination, hate speech, or unnecessary hostility is not allowed.",
    },
    {
      id: "rule-2",
      title: "No Spamming",
      description:
        "Avoid message spam, flooding, repeated text, excessive mentions, or disruptive content.",
    },
    {
      id: "rule-3",
      title: "Keep Content Appropriate",
      description:
        "Keep conversations and media appropriate for the community and follow Discord's Terms of Service.",
    },
  ];

  const DEFAULT_SETTINGS = {
    enabled: true,
    channelID: "",
    title: "SERVER RULES",
    intro:
      "Please read and follow the rules below to keep the community friendly and enjoyable for everyone.",
    theme: "arclume-neon",
    borderColor: "#8b5cf6",
    authorName: "",
    footerText: "Powered by Arclume",
    showTimestamp: false,
    imageMode: "server-icon",
    customImageURL: "",
    bannerURL: "",
    rules: DEFAULT_RULES,
    postedChannelID: null,
    postedMessageID: null,
  };

  const FALLBACK_THEMES = [
    {
      id: "arclume-neon",
      name: "Arclume Neon",
      color: "#8b5cf6",
      emoji: "💜",
    },
    {
      id: "clean-blue",
      name: "Clean Blue",
      color: "#2ea8ff",
      emoji: "💎",
    },
    {
      id: "dark",
      name: "Dark",
      color: "#5865f2",
      emoji: "🌑",
    },
    {
      id: "gold-premium",
      name: "Gold Premium",
      color: "#f59e0b",
      emoji: "👑",
    },
    {
      id: "red",
      name: "Red",
      color: "#ef4444",
      emoji: "🔥",
    },
    {
      id: "cute",
      name: "Cute",
      color: "#ec4899",
      emoji: "🎀",
    },
  ];

  let state = structuredCloneSafe(DEFAULT_SETTINGS);
  let themes = [...FALLBACK_THEMES];
  let channels = [];
  let guild = null;
  let loadedGuildID = null;
  let loading = false;
  let saving = false;

  let imageInfo = {
    thumbnail: null,
    banner: null,
  };

  let bannerPreviewMode = "none";

  /* =========================================================
     HELPERS
  ========================================================= */

  function structuredCloneSafe(value) {
    try {
      return structuredClone(value);
    } catch {
      return JSON.parse(JSON.stringify(value));
    }
  }

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function validHex(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value || ""));
  }

  function normalizeHex(value, fallback = "#8b5cf6") {
    let color = String(value || "").trim();

    if (!color.startsWith("#")) {
      color = `#${color}`;
    }

    return validHex(color) ? color.toLowerCase() : fallback;
  }

  function createID() {
    return (
      "rule-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 9)
    );
  }

  function currentGuildID() {
    const saved = localStorage.getItem("arclume-selected-guild");

    if (saved && /^\d{5,32}$/.test(saved)) {
      return saved;
    }

    try {
      if (typeof currentGuild !== "undefined" && currentGuild?.id) {
        return String(currentGuild.id);
      }
    } catch {}

    const identity = el("identityServerId")?.textContent || "";

    return identity.match(/\d{5,32}/)?.[0] || null;
  }

  function showToast(message, type = "normal") {
    try {
      if (typeof window.toast === "function") {
        window.toast(message);
        return;
      }
    } catch {}

    let box = el("rulesStudioToast");

    if (!box) {
      box = document.createElement("div");

      box.id = "rulesStudioToast";

      document.body.appendChild(box);
    }

    box.textContent = message;

    box.className = `rules-studio-toast show ${type}`;

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
      box.classList.remove("show");
    }, 3500);
  }

  async function request(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",

      ...options,

      headers: {
        Accept: "application/json",

        ...(options.headers || {}),
      },
    });

    let data = {};

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      data = await response.json().catch(() => ({}));
    }

    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }

    return data;
  }

  function apiPath(path = "") {
    const id = currentGuildID();

    if (!id) {
      throw new Error("No active Discord server selected.");
    }

    return `/api/guild/${encodeURIComponent(id)}` + path;
  }

  /* =========================================================
     CSS
  ========================================================= */

  function injectStyles() {
    if (el("arclumeRulesStudioStyles")) {
      return;
    }

    const style = document.createElement("style");

    style.id = "arclumeRulesStudioStyles";

    style.textContent = `
      /* ==================================================
         ARCLUME RULES STUDIO
      ================================================== */

      #page-rules-studio {
        --rs-accent: #8b5cf6;
        --rs-border: rgba(255,255,255,.11);
        --rs-muted: rgba(245,242,255,.56);
        padding-bottom: 130px;
      }

      .rules-studio-hero {
        display:flex;
        justify-content:space-between;
        align-items:flex-end;
        gap:24px;
        margin-bottom:24px;
      }

      .rules-studio-hero h1 span {
        color:var(--rs-accent);
      }

      .rules-live-state {
        display:flex;
        align-items:center;
        gap:9px;
        padding:10px 13px;
        border:1px solid rgba(139,92,246,.22);
        border-radius:999px;
        background:rgba(139,92,246,.07);
        font-size:10px;
        letter-spacing:.1em;
        white-space:nowrap;
      }

      .rules-live-state i {
        width:7px;
        height:7px;
        border-radius:50%;
        background:#5ef29c;
        box-shadow:0 0 15px rgba(94,242,156,.6);
      }

      .rules-live-state.loading i {
        background:#f2c94c;
      }

      .rules-live-state.error i {
        background:#ff5f73;
      }

      .rules-studio-layout {
        display:grid;
        grid-template-columns:minmax(0,1.08fr) minmax(360px,.92fr);
        gap:18px;
        align-items:start;
      }

      .rules-panel {
        border:1px solid var(--rs-border);
        border-radius:24px;
        background:
          radial-gradient(
            circle at top right,
            rgba(139,92,246,.08),
            transparent 42%
          ),
          rgba(255,255,255,.022);
        overflow:hidden;
      }

      .rules-panel-header {
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:16px;
        padding:18px 20px;
        border-bottom:1px solid rgba(255,255,255,.07);
      }

      .rules-panel-header h3 {
        margin:4px 0 0;
        font-size:18px;
      }

      .rules-panel-header small {
        color:rgba(245,242,255,.43);
      }

      .rules-section {
        padding:20px;
        border-bottom:1px solid rgba(255,255,255,.06);
      }

      .rules-section:last-child {
        border-bottom:0;
      }

      .rules-section-title {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin-bottom:15px;
      }

      .rules-section-title h4 {
        margin:0;
        color:#fff;
        font-size:14px;
      }

      .rules-section-title span {
        color:rgba(245,242,255,.39);
        font-size:9px;
        letter-spacing:.12em;
      }

      .rules-field-grid {
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:13px;
      }

      .rules-field-grid.one {
        grid-template-columns:1fr;
      }

      .rules-field {
        display:grid;
        gap:7px;
      }

      .rules-field.full {
        grid-column:1 / -1;
      }

      .rules-field > span {
        color:rgba(245,242,255,.48);
        font-family:"IBM Plex Mono",monospace;
        font-size:9px;
        letter-spacing:.1em;
      }

      .rules-field input,
      .rules-field textarea,
      .rules-field select {
        width:100%;
        border:1px solid rgba(255,255,255,.1);
        border-radius:13px;
        background:rgba(5,6,13,.72);
        color:#fff;
        outline:none;
        font:inherit;
        transition:.18s ease;
      }

      .rules-field input,
      .rules-field select {
        min-height:46px;
        padding:0 13px;
      }

      .rules-field textarea {
        min-height:105px;
        padding:12px 13px;
        resize:vertical;
      }

      .rules-field input:focus,
      .rules-field textarea:focus,
      .rules-field select:focus {
        border-color:rgba(139,92,246,.65);
        box-shadow:0 0 0 3px rgba(139,92,246,.08);
      }

      .rules-color-row {
        display:grid;
        grid-template-columns:56px 1fr;
        gap:9px;
      }

      .rules-color-row input[type="color"] {
        width:56px;
        padding:5px;
        cursor:pointer;
      }

      .rules-switch-line {
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:15px;
        min-height:54px;
        padding:10px 13px;
        border:1px solid rgba(255,255,255,.08);
        border-radius:14px;
        background:rgba(255,255,255,.02);
      }

      .rules-switch-line b {
        display:block;
        font-size:12px;
      }

      .rules-switch-line small {
        display:block;
        margin-top:3px;
        color:rgba(245,242,255,.43);
        font-size:10px;
      }

      .rules-checkbox {
        appearance:none;
        width:42px !important;
        min-height:23px !important;
        height:23px;
        flex:0 0 42px;
        padding:0 !important;
        border-radius:999px !important;
        background:rgba(255,255,255,.11) !important;
        position:relative;
        cursor:pointer;
      }

      .rules-checkbox::after {
        content:"";
        position:absolute;
        width:17px;
        height:17px;
        left:2px;
        top:2px;
        border-radius:50%;
        background:#fff;
        transition:.2s ease;
      }

      .rules-checkbox:checked {
        background:#8b5cf6 !important;
      }

      .rules-checkbox:checked::after {
        transform:translateX(19px);
      }

      /* THEMES */

      .rules-themes {
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:10px;
      }

      .rules-theme {
        min-height:91px;
        padding:13px;
        border:1px solid rgba(255,255,255,.09);
        border-radius:15px;
        background:rgba(255,255,255,.025);
        color:#fff;
        text-align:left;
        cursor:pointer;
        transition:.18s ease;
      }

      .rules-theme:hover {
        transform:translateY(-1px);
        border-color:rgba(255,255,255,.18);
      }

      .rules-theme.active {
        border-color:var(--theme-color);
        box-shadow:inset 0 0 0 1px var(--theme-color);
        background:color-mix(
          in srgb,
          var(--theme-color) 10%,
          rgba(255,255,255,.02)
        );
      }

      .rules-theme-icon {
        display:block;
        margin-bottom:10px;
        font-size:20px;
      }

      .rules-theme b {
        display:block;
        font-size:11px;
      }

      .rules-theme small {
        display:block;
        margin-top:4px;
        color:rgba(245,242,255,.42);
        font-size:9px;
      }

      /* RULE EDITOR */

      .rules-list {
        display:grid;
        gap:10px;
      }

      .rules-editor-item {
        border:1px solid rgba(255,255,255,.09);
        border-radius:17px;
        padding:14px;
        background:rgba(3,4,10,.35);
      }

      .rules-editor-top {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin-bottom:12px;
      }

      .rules-editor-number {
        display:flex;
        align-items:center;
        gap:9px;
      }

      .rules-editor-number span {
        display:grid;
        place-items:center;
        width:27px;
        height:27px;
        border-radius:9px;
        background:rgba(139,92,246,.13);
        color:#c8b5ff;
        font-family:"IBM Plex Mono",monospace;
        font-size:10px;
      }

      .rules-editor-number b {
        font-size:11px;
      }

      .rules-rule-actions {
        display:flex;
        gap:6px;
      }

      .rules-mini-btn {
        min-width:31px;
        height:31px;
        border:1px solid rgba(255,255,255,.09);
        border-radius:9px;
        background:rgba(255,255,255,.03);
        color:#dcd8e8;
        cursor:pointer;
      }

      .rules-mini-btn:hover {
        border-color:rgba(139,92,246,.45);
        color:#fff;
      }

      .rules-mini-btn.danger:hover {
        border-color:rgba(255,95,115,.55);
        color:#ff8a99;
      }

      .rules-editor-fields {
        display:grid;
        gap:9px;
      }

      .rules-editor-fields input,
      .rules-editor-fields textarea {
        width:100%;
        border:1px solid rgba(255,255,255,.08);
        border-radius:11px;
        background:rgba(5,6,13,.75);
        color:#fff;
        outline:none;
        font:inherit;
      }

      .rules-editor-fields input {
        height:42px;
        padding:0 11px;
        font-weight:600;
      }

      .rules-editor-fields textarea {
        min-height:78px;
        padding:10px 11px;
        resize:vertical;
      }

      .rules-add-button {
        width:100%;
        min-height:48px;
        margin-top:11px;
        border:1px dashed rgba(139,92,246,.38);
        border-radius:14px;
        background:rgba(139,92,246,.05);
        color:#cbb9ff;
        cursor:pointer;
        font-family:"IBM Plex Mono",monospace;
        font-size:10px;
        letter-spacing:.08em;
      }

      /* IMAGE MANAGER */

      .rules-image-modes {
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:8px;
        margin-bottom:13px;
      }

      .rules-image-mode {
        padding:10px 7px;
        border:1px solid rgba(255,255,255,.09);
        border-radius:12px;
        background:rgba(255,255,255,.025);
        color:rgba(245,242,255,.65);
        cursor:pointer;
        font-size:9px;
      }

      .rules-image-mode.active {
        border-color:rgba(139,92,246,.58);
        background:rgba(139,92,246,.09);
        color:#fff;
      }

      .rules-dropzone {
        min-height:125px;
        display:grid;
        place-items:center;
        padding:18px;
        border:1px dashed rgba(255,255,255,.17);
        border-radius:16px;
        background:
          radial-gradient(
            circle at center,
            rgba(139,92,246,.07),
            transparent 70%
          );
        text-align:center;
        cursor:pointer;
        transition:.18s ease;
      }

      .rules-dropzone.drag {
        border-color:#8b5cf6;
        background:rgba(139,92,246,.11);
      }

      .rules-dropzone strong {
        display:block;
        color:#fff;
        font-size:12px;
      }

      .rules-dropzone small {
        display:block;
        margin-top:5px;
        color:rgba(245,242,255,.42);
        font-size:9px;
      }

      .rules-upload-preview {
        margin-top:11px;
        display:flex;
        align-items:center;
        gap:11px;
        min-height:65px;
        padding:9px;
        border:1px solid rgba(255,255,255,.08);
        border-radius:13px;
        background:rgba(255,255,255,.02);
      }

      .rules-upload-preview img {
        width:52px;
        height:52px;
        object-fit:cover;
        border-radius:10px;
        background:#090a10;
      }

      .rules-upload-preview.banner img {
        width:96px;
        height:54px;
      }

      .rules-upload-preview div {
        min-width:0;
        flex:1;
      }

      .rules-upload-preview b,
      .rules-upload-preview small {
        display:block;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      }

      .rules-upload-preview b {
        font-size:10px;
      }

      .rules-upload-preview small {
        margin-top:4px;
        color:rgba(245,242,255,.42);
        font-size:9px;
      }

      /* DISCORD PREVIEW */

      .rules-preview-panel {
        position:sticky;
        top:22px;
      }

      .rules-preview-wrap {
        padding:20px;
      }

      .rules-discord-shell {
        padding:16px;
        border-radius:18px;
        background:#313338;
        box-shadow:0 22px 60px rgba(0,0,0,.28);
      }

      .rules-discord-message {
        display:flex;
        gap:11px;
      }

      .rules-discord-avatar {
        width:40px;
        height:40px;
        flex:0 0 40px;
        border-radius:50%;
        overflow:hidden;
        background:#1e1f22;
      }

      .rules-discord-avatar img {
        width:100%;
        height:100%;
        object-fit:cover;
      }

      .rules-discord-content {
        min-width:0;
        flex:1;
      }

      .rules-discord-author {
        display:flex;
        align-items:center;
        gap:6px;
        margin-bottom:6px;
      }

      .rules-discord-author b {
        color:#f2f3f5;
        font-size:14px;
      }

      .rules-bot-tag {
        padding:1px 4px;
        border-radius:3px;
        background:#5865f2;
        color:#fff;
        font-size:8px;
        font-weight:700;
      }

      .rules-discord-time {
        color:#949ba4;
        font-size:9px;
      }

      .rules-embed-preview {
        width:min(100%,520px);
        overflow:hidden;
        border-left:4px solid var(--preview-color,#8b5cf6);
        border-radius:4px;
        background:#2b2d31;
        padding:15px 16px 14px;
        color:#dbdee1;
      }

      .rules-preview-author {
        display:flex;
        align-items:center;
        gap:7px;
        margin-bottom:10px;
        color:#f2f3f5;
        font-size:11px;
        font-weight:600;
      }

      .rules-preview-author img {
        width:22px;
        height:22px;
        border-radius:50%;
        object-fit:cover;
      }

      .rules-preview-title-row {
        display:flex;
        align-items:flex-start;
        gap:12px;
      }

      .rules-preview-main {
        min-width:0;
        flex:1;
      }

      .rules-preview-thumbnail {
        width:72px;
        height:72px;
        flex:0 0 72px;
        border-radius:5px;
        object-fit:cover;
      }

      .rules-preview-title {
        margin-bottom:8px;
        color:#f2f3f5;
        font-size:15px;
        font-weight:700;
      }

      .rules-preview-intro {
        margin-bottom:12px;
        color:#dbdee1;
        font-size:12px;
        line-height:1.45;
        white-space:pre-wrap;
      }

      .rules-preview-rule {
        margin-top:10px;
      }

      .rules-preview-rule strong {
        display:block;
        color:#f2f3f5;
        font-size:12px;
      }

      .rules-preview-rule p {
        margin:3px 0 0;
        color:#dbdee1;
        font-size:11px;
        line-height:1.45;
        white-space:pre-wrap;
      }

      .rules-preview-banner {
        width:100%;
        max-height:270px;
        margin-top:15px;
        border-radius:5px;
        object-fit:cover;
      }

      .rules-preview-footer {
        display:flex;
        align-items:center;
        gap:6px;
        margin-top:13px;
        color:#949ba4;
        font-size:9px;
      }

      .rules-post-state {
        margin-top:14px;
        padding:11px 12px;
        border:1px solid rgba(255,255,255,.07);
        border-radius:12px;
        background:rgba(255,255,255,.025);
        color:rgba(245,242,255,.5);
        font-size:9px;
        line-height:1.5;
      }

      /* ACTIONS */

      .rules-actions {
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:9px;
        padding:18px;
        border-top:1px solid rgba(255,255,255,.07);
      }

      .rules-action {
        min-height:46px;
        padding:0 13px;
        border:1px solid rgba(255,255,255,.11);
        border-radius:12px;
        background:rgba(255,255,255,.035);
        color:#fff;
        cursor:pointer;
        font-family:"IBM Plex Mono",monospace;
        font-size:9px;
        letter-spacing:.06em;
        transition:.18s ease;
      }

      .rules-action:hover {
        transform:translateY(-1px);
        border-color:rgba(139,92,246,.45);
      }

      .rules-action.primary {
        border-color:#8b5cf6;
        background:#8b5cf6;
      }

      .rules-action.post {
        border-color:rgba(94,242,156,.33);
        background:rgba(94,242,156,.08);
        color:#83f5b3;
      }

      .rules-action.danger {
        color:#ff8b9a;
      }

      .rules-action:disabled,
      .rules-mini-btn:disabled {
        opacity:.45;
        cursor:not-allowed;
        transform:none;
      }

      .rules-studio-toast {
        position:fixed;
        left:50%;
        bottom:35px;
        z-index:99999;
        transform:translate(-50%,20px);
        max-width:min(92vw,520px);
        padding:12px 16px;
        border:1px solid rgba(255,255,255,.12);
        border-radius:13px;
        background:rgba(9,10,17,.96);
        color:#fff;
        box-shadow:0 18px 60px rgba(0,0,0,.36);
        opacity:0;
        pointer-events:none;
        transition:.2s ease;
        font-size:11px;
      }

      .rules-studio-toast.show {
        opacity:1;
        transform:translate(-50%,0);
      }

      .rules-studio-toast.error {
        border-color:rgba(255,95,115,.42);
      }

      @media (max-width:1050px) {
        .rules-studio-layout {
          grid-template-columns:1fr;
        }

        .rules-preview-panel {
          position:relative;
          top:auto;
        }
      }

      @media (max-width:720px) {
        .rules-studio-hero {
          display:block;
        }

        .rules-live-state {
          width:max-content;
          margin-top:16px;
        }

        .rules-field-grid,
        .rules-themes {
          grid-template-columns:1fr;
        }

        .rules-image-modes {
          grid-template-columns:repeat(2,minmax(0,1fr));
        }

        .rules-actions {
          grid-template-columns:1fr;
        }

        .rules-panel {
          border-radius:18px;
        }

        .rules-section,
        .rules-preview-wrap {
          padding:15px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* =========================================================
     PAGE
  ========================================================= */

  function buildPage() {
    if (el("page-rules-studio")) {
      return;
    }

    const main = document.querySelector("main");

    if (!main) {
      console.error("❌ Rules Studio: dashboard main element not found.");

      return;
    }

    const page = document.createElement("section");

    page.className = "dash-page";

    page.id = "page-rules-studio";

    page.innerHTML = `
      <div class="page-hero compact rules-studio-hero">
        <div>
          <span class="mono eyebrow">
            07 / COMMUNITY MESSAGE
          </span>

          <h1>
            Rules
            <br />
            <span> Studio. </span>
          </h1>

          <p>
            Design, preview and publish your Discord server rules.
          </p>
        </div>

        <div
          class="rules-live-state loading"
          id="rulesLiveState"
        >
          <i></i>

          <span
            class="mono"
            id="rulesLiveText"
          >
            WAITING FOR SERVER
          </span>
        </div>
      </div>

      <div class="rules-studio-layout">
        <!-- ==============================================
             SETTINGS
        =============================================== -->

        <div class="rules-panel">
          <header class="rules-panel-header">
            <div>
              <small class="mono">
                RULES / CONTROL
              </small>

              <h3>
                Message Builder
              </h3>
            </div>

            <span class="mono">
              ARCLUME
            </span>
          </header>

          <!-- GENERAL -->

          <section class="rules-section">
            <div class="rules-section-title">
              <h4>
                General
              </h4>

              <span class="mono">
                01 / SETUP
              </span>
            </div>

            <div class="rules-field-grid">
              <label class="rules-field">
                <span>
                  POST CHANNEL
                </span>

                <select id="rulesChannel">
                  <option value="">
                    Select channel
                  </option>
                </select>
              </label>

              <div class="rules-switch-line">
                <div>
                  <b>
                    Rules Studio
                  </b>

                  <small>
                    Allow posting/updating
                  </small>
                </div>

                <input
                  class="rules-checkbox"
                  id="rulesEnabled"
                  type="checkbox"
                  checked
                />
              </div>

              <label class="rules-field full">
                <span>
                  EMBED TITLE
                </span>

                <input
                  id="rulesTitle"
                  type="text"
                  maxlength="256"
                  placeholder="SERVER RULES"
                />
              </label>

              <label class="rules-field full">
                <span>
                  INTRO / DESCRIPTION
                </span>

                <textarea
                  id="rulesIntro"
                  maxlength="2000"
                  placeholder="Please read the rules..."
                ></textarea>
              </label>
            </div>
          </section>

          <!-- DESIGN -->

          <section class="rules-section">
            <div class="rules-section-title">
              <h4>
                Design
              </h4>

              <span class="mono">
                02 / STYLE
              </span>
            </div>

            <div
              class="rules-themes"
              id="rulesThemes"
            ></div>

            <div
              class="rules-field-grid"
              style="margin-top:14px"
            >
              <label class="rules-field">
                <span>
                  BORDER COLOR
                </span>

                <div class="rules-color-row">
                  <input
                    id="rulesColorPicker"
                    type="color"
                    value="#8b5cf6"
                  />

                  <input
                    id="rulesColorText"
                    type="text"
                    value="#8b5cf6"
                    maxlength="7"
                  />
                </div>
              </label>

              <label class="rules-field">
                <span>
                  AUTHOR NAME
                </span>

                <input
                  id="rulesAuthor"
                  type="text"
                  maxlength="256"
                  placeholder="Optional"
                />
              </label>

              <label class="rules-field full">
                <span>
                  FOOTER
                </span>

                <input
                  id="rulesFooter"
                  type="text"
                  maxlength="2048"
                  placeholder="Powered by Arclume"
                />
              </label>

              <div class="rules-switch-line full">
                <div>
                  <b>
                    Timestamp
                  </b>

                  <small>
                    Show when the rules were posted
                  </small>
                </div>

                <input
                  class="rules-checkbox"
                  id="rulesTimestamp"
                  type="checkbox"
                />
              </div>
            </div>
          </section>

          <!-- RULES -->

          <section class="rules-section">
            <div class="rules-section-title">
              <h4>
                Rules
              </h4>

              <span
                class="mono"
                id="rulesCount"
              >
                00 ITEMS
              </span>
            </div>

            <div
              class="rules-list"
              id="rulesEditorList"
            ></div>

            <button
              class="rules-add-button"
              id="rulesAddButton"
              type="button"
            >
              + ADD NEW RULE
            </button>
          </section>

          <!-- THUMBNAIL -->

          <section class="rules-section">
            <div class="rules-section-title">
              <h4>
                Thumbnail
              </h4>

              <span class="mono">
                04 / IMAGE
              </span>
            </div>

            <div
              class="rules-image-modes"
              id="rulesImageModes"
            >
              <button
                class="rules-image-mode"
                data-image-mode="none"
                type="button"
              >
                NONE
              </button>

              <button
                class="rules-image-mode"
                data-image-mode="server-icon"
                type="button"
              >
                SERVER ICON
              </button>

              <button
                class="rules-image-mode"
                data-image-mode="uploaded"
                type="button"
              >
                UPLOAD
              </button>

              <button
                class="rules-image-mode"
                data-image-mode="custom"
                type="button"
              >
                URL
              </button>
            </div>

            <label
              class="rules-field"
              id="rulesCustomImageField"
            >
              <span>
                CUSTOM IMAGE URL
              </span>

              <input
                id="rulesCustomImageURL"
                type="url"
                placeholder="https://..."
              />
            </label>

            <div
              class="rules-dropzone"
              id="rulesThumbnailDrop"
              tabindex="0"
            >
              <div>
                <strong>
                  Drop thumbnail here
                </strong>

                <small>
                  PNG / JPG / WEBP / GIF • MAX 8 MB
                </small>
              </div>
            </div>

            <input
              id="rulesThumbnailInput"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              hidden
            />

            <div
              class="rules-upload-preview"
              id="rulesThumbnailStored"
              hidden
            >
              <img
                id="rulesThumbnailStoredImage"
                alt=""
              />

              <div>
                <b id="rulesThumbnailStoredName">
                  Uploaded thumbnail
                </b>

                <small id="rulesThumbnailStoredMeta">
                  STORED
                </small>
              </div>

              <button
                class="rules-mini-btn danger"
                id="rulesThumbnailDelete"
                type="button"
                title="Delete uploaded thumbnail"
              >
                ×
              </button>
            </div>
          </section>

          <!-- BANNER -->

          <section class="rules-section">
            <div class="rules-section-title">
              <h4>
                Banner
              </h4>

              <span class="mono">
                05 / OPTIONAL
              </span>
            </div>

            <div class="rules-field-grid one">
              <label class="rules-field">
                <span>
                  CUSTOM BANNER URL
                </span>

                <input
                  id="rulesBannerURL"
                  type="url"
                  placeholder="https://..."
                />
              </label>
            </div>

            <div
              class="rules-dropzone"
              id="rulesBannerDrop"
              tabindex="0"
              style="margin-top:12px"
            >
              <div>
                <strong>
                  Drop banner here
                </strong>

                <small>
                  PNG / JPG / WEBP / GIF • MAX 8 MB
                </small>
              </div>
            </div>

            <input
              id="rulesBannerInput"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              hidden
            />

            <div
              class="rules-upload-preview banner"
              id="rulesBannerStored"
              hidden
            >
              <img
                id="rulesBannerStoredImage"
                alt=""
              />

              <div>
                <b id="rulesBannerStoredName">
                  Uploaded banner
                </b>

                <small id="rulesBannerStoredMeta">
                  STORED
                </small>
              </div>

              <button
                class="rules-mini-btn danger"
                id="rulesBannerDelete"
                type="button"
                title="Delete uploaded banner"
              >
                ×
              </button>
            </div>
          </section>
        </div>

        <!-- ==============================================
             PREVIEW
        =============================================== -->

        <aside class="rules-panel rules-preview-panel">
          <header class="rules-panel-header">
            <div>
              <small class="mono">
                LIVE / DISCORD
              </small>

              <h3>
                Message Preview
              </h3>
            </div>

            <span class="mono">
              EMBED
            </span>
          </header>

          <div class="rules-preview-wrap">
            <div class="rules-discord-shell">
              <div class="rules-discord-message">
                <div class="rules-discord-avatar">
                  <img
                    id="rulesPreviewBotAvatar"
                    src="/arclume-logo.png?v=${VERSION}"
                    alt=""
                  />
                </div>

                <div class="rules-discord-content">
                  <div class="rules-discord-author">
                    <b>
                      Arclume
                    </b>

                    <span class="rules-bot-tag">
                      APP
                    </span>

                    <span class="rules-discord-time">
                      Today at 10:30
                    </span>
                  </div>

                  <div
                    class="rules-embed-preview"
                    id="rulesEmbedPreview"
                  >
                    <div
                      class="rules-preview-author"
                      id="rulesPreviewAuthor"
                      hidden
                    >
                      <img
                        id="rulesPreviewAuthorIcon"
                        alt=""
                      />

                      <span id="rulesPreviewAuthorText"></span>
                    </div>

                    <div class="rules-preview-title-row">
                      <div class="rules-preview-main">
                        <div
                          class="rules-preview-title"
                          id="rulesPreviewTitle"
                        >
                          SERVER RULES
                        </div>

                        <div
                          class="rules-preview-intro"
                          id="rulesPreviewIntro"
                        ></div>

                        <div id="rulesPreviewRules"></div>
                      </div>

                      <img
                        class="rules-preview-thumbnail"
                        id="rulesPreviewThumbnail"
                        alt=""
                        hidden
                      />
                    </div>

                    <img
                      class="rules-preview-banner"
                      id="rulesPreviewBanner"
                      alt=""
                      hidden
                    />

                    <div
                      class="rules-preview-footer"
                      id="rulesPreviewFooter"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div
              class="rules-post-state"
              id="rulesPostState"
            >
              No published Rules message is linked yet.
            </div>
          </div>

          <div class="rules-actions">
            <button
              class="rules-action"
              id="rulesTestButton"
              type="button"
            >
              🧪 TEST MESSAGE
            </button>

            <button
              class="rules-action primary"
              id="rulesSaveButton"
              type="button"
            >
              💾 SAVE SETTINGS
            </button>

            <button
              class="rules-action post"
              id="rulesPostButton"
              type="button"
            >
              🚀 POST RULES
            </button>

            <button
              class="rules-action danger"
              id="rulesResetButton"
              type="button"
            >
              ♻ RESET
            </button>
          </div>
        </aside>
      </div>
    `;

    main.appendChild(page);
  }

  /* =========================================================
     NAVIGATION
  ========================================================= */

  function buildNavigation() {
    if (el("rulesStudioNavButton")) {
      return;
    }

    const dock = document.querySelector(".control-dock");

    if (!dock) {
      return;
    }

    const button = document.createElement("button");

    button.id = "rulesStudioNavButton";

    button.type = "button";

    button.innerHTML = `
      <span> 07 </span>
      <b> Rules </b>
    `;

    const logout = [...dock.children].find(
      (item) =>
        item.tagName === "A" &&
        String(item.getAttribute("href") || "").includes("/logout"),
    );

    if (logout) {
      dock.insertBefore(button, logout);
    } else {
      dock.appendChild(button);
    }

    button.addEventListener("click", () => {
      openRulesStudio();
    });
  }

  function openRulesStudio() {
    const page = el("page-rules-studio");

    const nav = el("rulesStudioNavButton");

    if (!page) {
      return;
    }

    document.querySelectorAll(".dash-page").forEach((item) => {
      item.classList.remove("active");
    });

    page.classList.add("active");

    document.querySelectorAll(".control-dock button").forEach((item) => {
      item.classList.remove("active");
    });

    nav?.classList.add("active");

    if (el("pageCode")) {
      el("pageCode").textContent = "07 / RULES";
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    loadAll(true);
  }

  /* =========================================================
     LIVE STATE
  ========================================================= */

  function setLive(mode, text) {
    const box = el("rulesLiveState");

    if (box) {
      box.classList.remove("loading", "error");

      if (mode === "loading") {
        box.classList.add("loading");
      }

      if (mode === "error") {
        box.classList.add("error");
      }
    }

    if (el("rulesLiveText")) {
      el("rulesLiveText").textContent = text;
    }
  }

  /* =========================================================
     FORM -> STATE
  ========================================================= */

  function readForm() {
    state.enabled = Boolean(el("rulesEnabled")?.checked);

    state.channelID = el("rulesChannel")?.value || "";

    state.title = el("rulesTitle")?.value || "";

    state.intro = el("rulesIntro")?.value || "";

    state.borderColor = normalizeHex(
      el("rulesColorText")?.value,
      state.borderColor,
    );

    state.authorName = el("rulesAuthor")?.value || "";

    state.footerText = el("rulesFooter")?.value || "";

    state.showTimestamp = Boolean(el("rulesTimestamp")?.checked);

    state.customImageURL = el("rulesCustomImageURL")?.value || "";

    state.bannerURL = el("rulesBannerURL")?.value || "";

    return state;
  }

  function settingsPayload() {
    readForm();

    return {
      enabled: state.enabled,

      channelID: state.channelID || null,

      title: state.title,

      intro: state.intro,

      theme: state.theme,

      borderColor: state.borderColor,

      authorName: state.authorName,

      footerText: state.footerText,

      showTimestamp: state.showTimestamp,

      imageMode: state.imageMode,

      customImageURL: state.customImageURL,

      bannerURL: state.bannerURL,

      rules: state.rules,

      postedChannelID: state.postedChannelID,

      postedMessageID: state.postedMessageID,
    };
  }

  /* =========================================================
     SETTINGS -> FORM
  ========================================================= */

  function renderForm() {
    if (el("rulesEnabled")) {
      el("rulesEnabled").checked = state.enabled !== false;
    }

    if (el("rulesTitle")) {
      el("rulesTitle").value = state.title || "";
    }

    if (el("rulesIntro")) {
      el("rulesIntro").value = state.intro || "";
    }

    if (el("rulesAuthor")) {
      el("rulesAuthor").value = state.authorName || "";
    }

    if (el("rulesFooter")) {
      el("rulesFooter").value = state.footerText || "";
    }

    if (el("rulesTimestamp")) {
      el("rulesTimestamp").checked = Boolean(state.showTimestamp);
    }

    if (el("rulesCustomImageURL")) {
      el("rulesCustomImageURL").value = state.customImageURL || "";
    }

    if (el("rulesBannerURL")) {
      el("rulesBannerURL").value = state.bannerURL || "";
    }

    const color = normalizeHex(state.borderColor);

    state.borderColor = color;

    if (el("rulesColorText")) {
      el("rulesColorText").value = color;
    }

    if (el("rulesColorPicker")) {
      el("rulesColorPicker").value = color;
    }

    renderChannels();
    renderThemes();
    renderRulesEditor();
    renderImageModes();
    renderUploadedImages();
    renderPostState();
    renderPreview();
  }

  /* =========================================================
     CHANNELS
  ========================================================= */

  function renderChannels() {
    const select = el("rulesChannel");

    if (!select) {
      return;
    }

    const current = state.channelID || "";

    select.innerHTML =
      `<option value="">Select channel</option>` +
      channels
        .map(
          (channel) => `
            <option
              value="${escapeHTML(channel.id)}"
              ${channel.id === current ? "selected" : ""}
            >
              #${escapeHTML(channel.name)}
            </option>
          `,
        )
        .join("");
  }

  /* =========================================================
     THEMES
  ========================================================= */

  function renderThemes() {
    const box = el("rulesThemes");

    if (!box) {
      return;
    }

    box.innerHTML = themes
      .map(
        (theme) => `
            <button
              class="rules-theme ${theme.id === state.theme ? "active" : ""}"
              type="button"
              data-rules-theme="${escapeHTML(theme.id)}"
              style="--theme-color:${escapeHTML(theme.color)}"
            >
              <span class="rules-theme-icon">
                ${escapeHTML(theme.emoji || "✨")}
              </span>

              <b>
                ${escapeHTML(theme.name)}
              </b>

              <small>
                ${escapeHTML(theme.color)}
              </small>
            </button>
          `,
      )
      .join("");
  }

  function selectTheme(themeID) {
    const theme = themes.find((item) => item.id === themeID);

    if (!theme) {
      return;
    }

    state.theme = theme.id;

    state.borderColor = normalizeHex(theme.color);

    if (el("rulesColorText")) {
      el("rulesColorText").value = state.borderColor;
    }

    if (el("rulesColorPicker")) {
      el("rulesColorPicker").value = state.borderColor;
    }

    renderThemes();
    renderPreview();
  }

  /* =========================================================
     RULE EDITOR
  ========================================================= */

  function renderRulesEditor() {
    const box = el("rulesEditorList");

    if (!box) {
      return;
    }

    if (!Array.isArray(state.rules)) {
      state.rules = [];
    }

    if (el("rulesCount")) {
      el("rulesCount").textContent = `${String(state.rules.length).padStart(
        2,
        "0",
      )} ITEMS`;
    }

    if (!state.rules.length) {
      box.innerHTML = `
        <div
          style="
            padding:24px;
            text-align:center;
            color:rgba(245,242,255,.4);
            font-size:11px
          "
        >
          No rules yet. Add your first rule below.
        </div>
      `;

      return;
    }

    box.innerHTML = state.rules
      .map(
        (rule, index) => `
            <article
              class="rules-editor-item"
              data-rule-index="${index}"
            >
              <div class="rules-editor-top">
                <div class="rules-editor-number">
                  <span>
                    ${String(index + 1).padStart(2, "0")}
                  </span>

                  <b>
                    RULE ${index + 1}
                  </b>
                </div>

                <div class="rules-rule-actions">
                  <button
                    class="rules-mini-btn"
                    type="button"
                    data-rule-action="up"
                    data-rule-index="${index}"
                    ${index === 0 ? "disabled" : ""}
                    title="Move up"
                  >
                    ↑
                  </button>

                  <button
                    class="rules-mini-btn"
                    type="button"
                    data-rule-action="down"
                    data-rule-index="${index}"
                    ${index === state.rules.length - 1 ? "disabled" : ""}
                    title="Move down"
                  >
                    ↓
                  </button>

                  <button
                    class="rules-mini-btn danger"
                    type="button"
                    data-rule-action="delete"
                    data-rule-index="${index}"
                    title="Delete rule"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div class="rules-editor-fields">
                <input
                  type="text"
                  maxlength="200"
                  data-rule-field="title"
                  data-rule-index="${index}"
                  value="${escapeHTML(rule.title || "")}"
                  placeholder="Rule title"
                />

                <textarea
                  maxlength="1000"
                  data-rule-field="description"
                  data-rule-index="${index}"
                  placeholder="Rule description"
                >${escapeHTML(rule.description || "")}</textarea>
              </div>
            </article>
          `,
      )
      .join("");
  }

  function addRule() {
    state.rules.push({
      id: createID(),

      title: `New Rule`,

      description: "Write the rule description here.",
    });

    renderRulesEditor();
    renderPreview();

    setTimeout(() => {
      const inputs = document.querySelectorAll('[data-rule-field="title"]');

      inputs[inputs.length - 1]?.focus();
    }, 30);
  }

  function moveRule(index, direction) {
    const target = index + direction;

    if (target < 0 || target >= state.rules.length) {
      return;
    }

    [state.rules[index], state.rules[target]] = [
      state.rules[target],
      state.rules[index],
    ];

    renderRulesEditor();
    renderPreview();
  }

  function deleteRule(index) {
    state.rules.splice(index, 1);

    renderRulesEditor();
    renderPreview();
  }

  /* =========================================================
     IMAGE MODES
  ========================================================= */

  function renderImageModes() {
    document.querySelectorAll("[data-image-mode]").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.imageMode === state.imageMode,
      );
    });

    const custom = el("rulesCustomImageField");

    const drop = el("rulesThumbnailDrop");

    if (custom) {
      custom.style.display = state.imageMode === "custom" ? "grid" : "none";
    }

    if (drop) {
      drop.style.display = state.imageMode === "uploaded" ? "grid" : "none";
    }
  }

  function setImageMode(mode) {
    if (!["none", "server-icon", "uploaded", "custom"].includes(mode)) {
      return;
    }

    state.imageMode = mode;

    renderImageModes();
    renderPreview();
  }

  /* =========================================================
     UPLOAD INFO
  ========================================================= */

  function humanSize(bytes) {
    const value = Number(bytes || 0);

    if (value < 1024) {
      return `${value} B`;
    }

    if (value < 1024 * 1024) {
      return `${(value / 1024).toFixed(1)} KB`;
    }

    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }

  function imageURL(kind) {
    const id = currentGuildID();

    if (!id) {
      return "";
    }

    return (
      `/api/guild/${encodeURIComponent(id)}` +
      `/rules/image/${kind}` +
      `?v=${Date.now()}`
    );
  }

  function renderUploadedImages() {
    const thumb = imageInfo.thumbnail;

    const thumbBox = el("rulesThumbnailStored");

    if (thumbBox) {
      thumbBox.hidden = !thumb;

      if (thumb) {
        el("rulesThumbnailStoredImage").src = imageURL("thumbnail");

        el("rulesThumbnailStoredName").textContent =
          thumb.fileName || "Uploaded thumbnail";

        el("rulesThumbnailStoredMeta").textContent = `${humanSize(
          thumb.fileSize,
        )} • STORED`;
      }
    }

    const banner = imageInfo.banner;

    const bannerBox = el("rulesBannerStored");

    if (bannerBox) {
      bannerBox.hidden = !banner;

      if (banner) {
        el("rulesBannerStoredImage").src = imageURL("banner");

        el("rulesBannerStoredName").textContent =
          banner.fileName || "Uploaded banner";

        el("rulesBannerStoredMeta").textContent = `${humanSize(
          banner.fileSize,
        )} • STORED`;

        if (!state.bannerURL) {
          bannerPreviewMode = "uploaded";
        }
      }
    }

    renderPreview();
  }

  async function loadImageInfo() {
    try {
      const data = await request(apiPath("/rules/images"));

      imageInfo = data.images || {
        thumbnail: null,
        banner: null,
      };
    } catch (error) {
      console.error("❌ Rules image info:", error);

      imageInfo = {
        thumbnail: null,
        banner: null,
      };
    }

    renderUploadedImages();
  }

  async function uploadImage(kind, file) {
    if (!file) {
      return;
    }

    const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"];

    if (!allowed.includes(file.type)) {
      showToast("Only PNG, JPG, WEBP and GIF images are supported.", "error");

      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      showToast("Image must be smaller than 8 MB.", "error");

      return;
    }

    try {
      setLive("loading", `UPLOADING ${kind.toUpperCase()}`);

      await request(apiPath(`/rules/image/${kind}`), {
        method: "PUT",

        headers: {
          "Content-Type": file.type,

          "X-File-Name": encodeURIComponent(file.name),
        },

        body: file,
      });

      if (kind === "thumbnail") {
        state.imageMode = "uploaded";
      }

      if (kind === "banner") {
        state.bannerURL = "";

        if (el("rulesBannerURL")) {
          el("rulesBannerURL").value = "";
        }

        bannerPreviewMode = "uploaded";
      }

      await loadImageInfo();

      renderImageModes();

      setLive("live", "IMAGE STORED");

      showToast(`${kind === "banner" ? "Banner" : "Thumbnail"} uploaded.`);
    } catch (error) {
      console.error(error);

      setLive("error", "UPLOAD FAILED");

      showToast(error.message, "error");
    }
  }

  async function deleteImage(kind) {
    try {
      setLive("loading", "REMOVING IMAGE");

      await request(apiPath(`/rules/image/${kind}`), {
        method: "DELETE",
      });

      imageInfo[kind] = null;

      if (kind === "thumbnail" && state.imageMode === "uploaded") {
        state.imageMode = "server-icon";
      }

      if (kind === "banner") {
        bannerPreviewMode = "none";
      }

      renderUploadedImages();
      renderImageModes();

      setLive("live", "IMAGE REMOVED");

      showToast("Image removed.");
    } catch (error) {
      setLive("error", "DELETE FAILED");

      showToast(error.message, "error");
    }
  }

  /* =========================================================
     PREVIEW
  ========================================================= */

  function previewThumbnailURL() {
    if (state.imageMode === "none") {
      return "";
    }

    if (state.imageMode === "server-icon") {
      return guild?.iconURL || "/arclume-logo.png";
    }

    if (state.imageMode === "custom") {
      return state.customImageURL || "";
    }

    if (state.imageMode === "uploaded" && imageInfo.thumbnail) {
      return imageURL("thumbnail");
    }

    return "";
  }

  function previewBannerURL() {
    if (state.bannerURL) {
      return state.bannerURL;
    }

    if (bannerPreviewMode === "uploaded" && imageInfo.banner) {
      return imageURL("banner");
    }

    return "";
  }

  function renderPreview() {
    readForm();

    const preview = el("rulesEmbedPreview");

    if (preview) {
      preview.style.setProperty(
        "--preview-color",
        normalizeHex(state.borderColor),
      );
    }

    if (el("rulesPreviewTitle")) {
      el("rulesPreviewTitle").textContent = state.title || "SERVER RULES";
    }

    if (el("rulesPreviewIntro")) {
      el("rulesPreviewIntro").textContent = state.intro || "";
    }

    const author = el("rulesPreviewAuthor");

    if (author) {
      author.hidden = !state.authorName;

      if (state.authorName) {
        el("rulesPreviewAuthorText").textContent = state.authorName;

        el("rulesPreviewAuthorIcon").src =
          guild?.iconURL || "/arclume-logo.png";
      }
    }

    const rulesBox = el("rulesPreviewRules");

    if (rulesBox) {
      rulesBox.innerHTML = state.rules
        .map(
          (rule, index) => `
              <div class="rules-preview-rule">
                <strong>
                  ${index + 1}. ${escapeHTML(rule.title || `Rule ${index + 1}`)}
                </strong>

                ${
                  rule.description
                    ? `
                      <p>
                        ${escapeHTML(rule.description)}
                      </p>
                    `
                    : ""
                }
              </div>
            `,
        )
        .join("");
    }

    const thumbURL = previewThumbnailURL();

    const thumb = el("rulesPreviewThumbnail");

    if (thumb) {
      thumb.hidden = !thumbURL;

      if (thumbURL) {
        thumb.src = thumbURL;
      }
    }

    const bannerURL = previewBannerURL();

    const banner = el("rulesPreviewBanner");

    if (banner) {
      banner.hidden = !bannerURL;

      if (bannerURL) {
        banner.src = bannerURL;
      }
    }

    const footer = el("rulesPreviewFooter");

    if (footer) {
      const items = [];

      if (state.footerText) {
        items.push(state.footerText);
      }

      if (state.showTimestamp) {
        items.push(
          "Today at " +
            new Date().toLocaleTimeString([], {
              hour: "2-digit",

              minute: "2-digit",
            }),
        );
      }

      footer.textContent = items.join(" • ");

      footer.style.display = items.length ? "flex" : "none";
    }
  }

  function renderPostState() {
    const box = el("rulesPostState");

    const button = el("rulesPostButton");

    if (!box) {
      return;
    }

    if (state.postedMessageID && state.postedChannelID) {
      box.innerHTML = `
        <b style="color:#83f5b3">
          PUBLISHED MESSAGE LINKED
        </b>
        <br />
        Channel:
        <code>${escapeHTML(state.postedChannelID)}</code>
        <br />
        Message:
        <code>${escapeHTML(state.postedMessageID)}</code>
      `;

      if (button) {
        button.textContent = "🚀 UPDATE RULES";
      }
    } else {
      box.textContent = "No published Rules message is linked yet.";

      if (button) {
        button.textContent = "🚀 POST RULES";
      }
    }
  }

  /* =========================================================
     LOAD
  ========================================================= */

  async function loadAll(force = false) {
    if (loading && !force) {
      return;
    }

    const id = currentGuildID();

    if (!id) {
      setLive("error", "NO ACTIVE SERVER");

      return;
    }

    loading = true;

    setLive("loading", "LOADING RULES");

    try {
      const data = await request(apiPath("/rules/settings"));

      loadedGuildID = id;

      guild = data.guild || null;

      channels = Array.isArray(data.channels) ? data.channels : [];

      themes =
        Array.isArray(data.themes) && data.themes.length
          ? data.themes
          : [...FALLBACK_THEMES];

      state = {
        ...structuredCloneSafe(DEFAULT_SETTINGS),

        ...(data.settings || {}),
      };

      if (!Array.isArray(state.rules)) {
        state.rules = structuredCloneSafe(DEFAULT_RULES);
      }

      if (state.bannerURL) {
        bannerPreviewMode = "custom";
      }

      renderForm();

      await loadImageInfo();

      setLive("live", "READY / LIVE PREVIEW");
    } catch (error) {
      console.error("❌ Rules Studio load error:", error);

      setLive("error", "LOAD ERROR");

      showToast(error.message, "error");
    } finally {
      loading = false;
    }
  }

  /* =========================================================
     SAVE
  ========================================================= */

  async function saveSettings() {
    if (saving) {
      return;
    }

    saving = true;

    setButtonsBusy(true);

    setLive("loading", "SAVING SETTINGS");

    try {
      const data = await request(apiPath("/rules/settings"), {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(settingsPayload()),
      });

      state = {
        ...state,
        ...(data.settings || {}),
      };

      renderForm();

      setLive("live", "SETTINGS SAVED");

      showToast("Rules Studio settings saved.");
    } catch (error) {
      console.error(error);

      setLive("error", "SAVE FAILED");

      showToast(error.message, "error");
    } finally {
      saving = false;

      setButtonsBusy(false);
    }
  }

  /* =========================================================
     TEST MESSAGE
  ========================================================= */

  async function testMessage() {
    readForm();

    if (!state.channelID) {
      showToast("Select a Discord channel first.", "error");

      return;
    }

    setButtonsBusy(true);

    setLive("loading", "SENDING TEST");

    try {
      await request(apiPath("/rules/test"), {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(settingsPayload()),
      });

      setLive("live", "TEST SENT");

      showToast("Test Rules message sent to Discord.");
    } catch (error) {
      console.error(error);

      setLive("error", "TEST FAILED");

      showToast(error.message, "error");
    } finally {
      setButtonsBusy(false);
    }
  }

  /* =========================================================
     POST / UPDATE
  ========================================================= */

  async function postRules() {
    readForm();

    if (!state.enabled) {
      showToast("Enable Rules Studio before posting.", "error");

      return;
    }

    if (!state.channelID) {
      showToast("Select a Discord channel first.", "error");

      return;
    }

    setButtonsBusy(true);

    setLive(
      "loading",
      state.postedMessageID ? "UPDATING RULES" : "POSTING RULES",
    );

    try {
      const data = await request(apiPath("/rules/post"), {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(settingsPayload()),
      });

      state = {
        ...state,
        ...(data.settings || {}),
      };

      renderPostState();

      setLive(
        "live",
        data.action === "updated" ? "RULES UPDATED" : "RULES POSTED",
      );

      showToast(
        data.action === "updated"
          ? "Rules message updated."
          : "Rules message posted.",
      );
    } catch (error) {
      console.error(error);

      setLive("error", "POST FAILED");

      showToast(error.message, "error");
    } finally {
      setButtonsBusy(false);
    }
  }

  /* =========================================================
     RESET
  ========================================================= */

  async function resetSettings() {
    const confirmReset = window.confirm(
      "Reset the Rules Studio to its default settings?",
    );

    if (!confirmReset) {
      return;
    }

    setButtonsBusy(true);

    setLive("loading", "RESETTING");

    try {
      const data = await request(apiPath("/rules/settings/reset"), {
        method: "POST",
      });

      state = {
        ...structuredCloneSafe(DEFAULT_SETTINGS),

        ...(data.settings || {}),
      };

      bannerPreviewMode = imageInfo.banner ? "uploaded" : "none";

      renderForm();

      setLive("live", "RESET COMPLETE");

      showToast("Rules Studio reset.");
    } catch (error) {
      setLive("error", "RESET FAILED");

      showToast(error.message, "error");
    } finally {
      setButtonsBusy(false);
    }
  }

  function setButtonsBusy(busy) {
    [
      "rulesSaveButton",
      "rulesTestButton",
      "rulesPostButton",
      "rulesResetButton",
    ].forEach((id) => {
      const button = el(id);

      if (button) {
        button.disabled = busy;
      }
    });
  }

  /* =========================================================
     EVENTS
  ========================================================= */

  function bindEvents() {
    const page = el("page-rules-studio");

    if (!page) {
      return;
    }

    page.addEventListener("input", (event) => {
      const target = event.target;

      if (target.matches("[data-rule-field]")) {
        const index = Number(target.dataset.ruleIndex);

        const field = target.dataset.ruleField;

        if (state.rules[index] && ["title", "description"].includes(field)) {
          state.rules[index][field] = target.value;

          renderPreview();
        }

        return;
      }

      if (target.id === "rulesColorPicker") {
        state.borderColor = target.value;

        el("rulesColorText").value = target.value;

        renderPreview();

        return;
      }

      if (target.id === "rulesColorText") {
        const color = normalizeHex(target.value, state.borderColor);

        if (validHex(color)) {
          state.borderColor = color;

          el("rulesColorPicker").value = color;
        }

        renderPreview();

        return;
      }

      if (target.id === "rulesBannerURL") {
        bannerPreviewMode = target.value.trim()
          ? "custom"
          : imageInfo.banner
            ? "uploaded"
            : "none";
      }

      readForm();
      renderPreview();
    });

    page.addEventListener("change", (event) => {
      if (
        event.target.id === "rulesChannel" ||
        event.target.id === "rulesEnabled" ||
        event.target.id === "rulesTimestamp"
      ) {
        readForm();
        renderPreview();
      }
    });

    page.addEventListener("click", (event) => {
      const themeButton = event.target.closest("[data-rules-theme]");

      if (themeButton) {
        event.preventDefault();

        selectTheme(themeButton.dataset.rulesTheme);

        return;
      }

      const imageMode = event.target.closest("[data-image-mode]");

      if (imageMode) {
        event.preventDefault();

        setImageMode(imageMode.dataset.imageMode);

        return;
      }

      const ruleAction = event.target.closest("[data-rule-action]");

      if (ruleAction) {
        event.preventDefault();

        const index = Number(ruleAction.dataset.ruleIndex);

        const action = ruleAction.dataset.ruleAction;

        if (action === "up") {
          moveRule(index, -1);
        }

        if (action === "down") {
          moveRule(index, 1);
        }

        if (action === "delete") {
          deleteRule(index);
        }

        return;
      }
    });

    el("rulesAddButton")?.addEventListener("click", (event) => {
      event.preventDefault();

      addRule();
    });

    el("rulesSaveButton")?.addEventListener("click", (event) => {
      event.preventDefault();

      saveSettings();
    });

    el("rulesTestButton")?.addEventListener("click", (event) => {
      event.preventDefault();

      testMessage();
    });

    el("rulesPostButton")?.addEventListener("click", (event) => {
      event.preventDefault();

      postRules();
    });

    el("rulesResetButton")?.addEventListener("click", (event) => {
      event.preventDefault();

      resetSettings();
    });

    /* THUMBNAIL */

    bindDropzone("rulesThumbnailDrop", "rulesThumbnailInput", (file) =>
      uploadImage("thumbnail", file),
    );

    el("rulesThumbnailDelete")?.addEventListener("click", () => {
      deleteImage("thumbnail");
    });

    /* BANNER */

    bindDropzone("rulesBannerDrop", "rulesBannerInput", (file) =>
      uploadImage("banner", file),
    );

    el("rulesBannerDelete")?.addEventListener("click", () => {
      deleteImage("banner");
    });
  }

  function bindDropzone(dropID, inputID, callback) {
    const drop = el(dropID);

    const input = el(inputID);

    if (!drop || !input) {
      return;
    }

    drop.addEventListener("click", () => {
      input.click();
    });

    drop.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        input.click();
      }
    });

    input.addEventListener("change", () => {
      const file = input.files?.[0];

      if (file) {
        callback(file);
      }

      input.value = "";
    });

    ["dragenter", "dragover"].forEach((name) => {
      drop.addEventListener(name, (event) => {
        event.preventDefault();
        drop.classList.add("drag");
      });
    });

    ["dragleave", "drop"].forEach((name) => {
      drop.addEventListener(name, (event) => {
        event.preventDefault();
        drop.classList.remove("drag");
      });
    });

    drop.addEventListener("drop", (event) => {
      const file = event.dataTransfer?.files?.[0];

      if (file) {
        callback(file);
      }
    });
  }

  /* =========================================================
     ACTIVE SERVER WATCHER
  ========================================================= */

  function watchGuildChange() {
    setInterval(() => {
      const id = currentGuildID();

      if (id && loadedGuildID && id !== loadedGuildID) {
        loadedGuildID = id;

        if (el("page-rules-studio")?.classList.contains("active")) {
          loadAll(true);
        }
      }
    }, 1200);
  }

  /* =========================================================
     BOOT
  ========================================================= */

  function boot() {
    injectStyles();
    buildPage();
    buildNavigation();
    bindEvents();
    watchGuildChange();

    setTimeout(() => {
      const id = currentGuildID();

      if (id) {
        loadAll(true);
      }
    }, 700);

    console.log("📜 Arclume Rules Studio loaded");

    console.log("🎨 Rules embed designer loaded");

    console.log("🖼️ Rules thumbnail/banner manager loaded");

    console.log("🧪 Rules test + post controls loaded");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, {
      once: true,
    });
  } else {
    boot();
  }
})();
