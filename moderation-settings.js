(() => {
  "use strict";

  /* =========================================================
     STATE
  ========================================================= */

  const state = {
    guildID: "",
    settings: null,
    options: null,

    cases: [],
    reports: [],
    appeals: [],
    watchlist: [],
    audit: [],

    selectedMember: null,
    selectedProfile: null,

    activeTab: "overview",
    loading: false,
  };

  /* =========================================================
     HELPERS
  ========================================================= */

  const $ = (selector, root = document) => root.querySelector(selector);

  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function validDiscordID(value) {
    return /^\d{5,32}$/.test(String(value || ""));
  }

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleString();
  }

  function shortID(value) {
    const text = String(value || "");

    if (text.length <= 16) {
      return text;
    }

    return text.slice(0, 8) + "…" + text.slice(-6);
  }

  function getSelectedGuildID() {
    const keys = ["arclume-selected-guild", "currentGuild", "selectedGuild"];

    for (const key of keys) {
      const raw = localStorage.getItem(key);

      if (!raw) {
        continue;
      }

      if (validDiscordID(raw)) {
        return raw;
      }

      try {
        const parsed = JSON.parse(raw);

        if (typeof parsed === "string" && validDiscordID(parsed)) {
          return parsed;
        }

        const possible = parsed?.id || parsed?.guildID || parsed?.guildId;

        if (validDiscordID(possible)) {
          return String(possible);
        }
      } catch {}
    }

    const identity =
      $("#identityServerId")?.textContent?.match(/\d{5,32}/)?.[0];

    if (validDiscordID(identity)) {
      return identity;
    }

    const globalGuild = window.currentGuild?.id;

    if (validDiscordID(globalGuild)) {
      return String(globalGuild);
    }

    return "";
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",

      ...options,

      headers: {
        ...(options.body
          ? {
              "Content-Type": "application/json",
            }
          : {}),

        ...(options.headers || {}),
      },
    });

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(data?.error || `Request failed (${response.status})`);
    }

    return data;
  }

  function toast(message, type = "success") {
    let holder = $("#arclumeModToastHolder");

    if (!holder) {
      holder = document.createElement("div");

      holder.id = "arclumeModToastHolder";

      document.body.appendChild(holder);
    }

    const item = document.createElement("div");

    item.className = `mod-toast ${type}`;

    item.textContent = message;

    holder.appendChild(item);

    requestAnimationFrame(() => {
      item.classList.add("show");
    });

    setTimeout(() => {
      item.classList.remove("show");

      setTimeout(() => item.remove(), 300);
    }, 3500);
  }

  function setLiveState(text, type = "ready") {
    const holder = $("#moderationLiveState");

    const label = $("#moderationLiveText");

    if (!holder) {
      return;
    }

    holder.classList.remove("loading", "error", "ready");

    holder.classList.add(type);

    if (label) {
      label.textContent = text;
    }
  }

  /* =========================================================
     CSS
  ========================================================= */

  function injectStyles() {
    if ($("#arclumeModerationStyles")) {
      return;
    }

    const style = document.createElement("style");

    style.id = "arclumeModerationStyles";

    style.textContent = `
      #page-moderation {
        --mod-accent: #9b87ff;
        --mod-success: #76e6a7;
        --mod-danger: #ff6f7f;
        --mod-warning: #ffd36d;
        --mod-border: rgba(255,255,255,.09);
        --mod-muted: rgba(244,241,255,.52);
        padding-bottom: 130px;
      }

      .mod-hero {
        display:flex;
        justify-content:space-between;
        align-items:flex-end;
        gap:24px;
        margin-bottom:22px;
      }

      .mod-live {
        display:flex;
        align-items:center;
        gap:8px;
        padding:10px 13px;
        border:1px solid rgba(155,135,255,.22);
        border-radius:999px;
        background:rgba(155,135,255,.06);
        color:rgba(245,242,255,.72);
        font-size:10px;
        letter-spacing:.1em;
        white-space:nowrap;
      }

      .mod-live i {
        width:8px;
        height:8px;
        border-radius:50%;
        background:var(--mod-success);
        box-shadow:0 0 14px rgba(118,230,167,.7);
      }

      .mod-live.loading i {
        background:var(--mod-warning);
        box-shadow:0 0 14px rgba(255,211,109,.7);
      }

      .mod-live.error i {
        background:var(--mod-danger);
        box-shadow:0 0 14px rgba(255,111,127,.7);
      }

      .mod-tabs {
        display:flex;
        gap:7px;
        padding:7px;
        margin-bottom:20px;
        overflow-x:auto;
        border:1px solid var(--mod-border);
        border-radius:18px;
        background:rgba(255,255,255,.018);
      }

      .mod-tab {
        flex:0 0 auto;
        border:0;
        border-radius:12px;
        padding:11px 14px;
        background:transparent;
        color:rgba(245,242,255,.52);
        cursor:pointer;
        font:600 10px "IBM Plex Mono",monospace;
        letter-spacing:.08em;
        transition:.2s ease;
      }

      .mod-tab:hover {
        color:#fff;
        background:rgba(255,255,255,.04);
      }

      .mod-tab.active {
        color:#fff;
        background:rgba(155,135,255,.13);
        box-shadow:inset 0 0 0 1px rgba(155,135,255,.2);
      }

      .mod-view {
        display:none;
      }

      .mod-view.active {
        display:block;
      }

      .mod-grid {
        display:grid;
        grid-template-columns:repeat(12,minmax(0,1fr));
        gap:16px;
      }

      .mod-card {
        grid-column:span 12;
        border:1px solid var(--mod-border);
        border-radius:22px;
        background:rgba(255,255,255,.018);
        overflow:hidden;
      }

      .mod-card.half {
        grid-column:span 6;
      }

      .mod-card.third {
        grid-column:span 4;
      }

      .mod-card-head {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:16px;
        padding:17px 19px;
        border-bottom:1px solid rgba(255,255,255,.07);
      }

      .mod-card-head span {
        display:block;
        color:rgba(245,242,255,.4);
        font:500 9px "IBM Plex Mono",monospace;
        letter-spacing:.12em;
      }

      .mod-card-head h3 {
        margin:4px 0 0;
        color:#fff;
        font:700 18px "Syne",sans-serif;
      }

      .mod-card-body {
        padding:18px;
      }

      .mod-stat-grid {
        display:grid;
        grid-template-columns:repeat(5,minmax(0,1fr));
        gap:12px;
        margin-bottom:18px;
      }

      .mod-stat {
        min-height:112px;
        padding:16px;
        border:1px solid var(--mod-border);
        border-radius:19px;
        background:
          radial-gradient(circle at top right,rgba(155,135,255,.08),transparent 50%),
          rgba(255,255,255,.018);
      }

      .mod-stat small {
        display:block;
        color:rgba(245,242,255,.43);
        font:500 9px "IBM Plex Mono",monospace;
        letter-spacing:.1em;
      }

      .mod-stat strong {
        display:block;
        margin-top:19px;
        color:#fff;
        font:700 30px "Syne",sans-serif;
      }

      .mod-stat em {
        display:block;
        margin-top:5px;
        color:rgba(245,242,255,.38);
        font:normal 10px "IBM Plex Mono",monospace;
      }

      .mod-command-grid {
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:10px;
      }

      .mod-command {
        padding:13px;
        border:1px solid rgba(255,255,255,.07);
        border-radius:15px;
        background:rgba(255,255,255,.018);
      }

      .mod-command code {
        color:#d0c6ff;
        font-size:12px;
      }

      .mod-command p {
        margin:7px 0 0;
        color:var(--mod-muted);
        font-size:11px;
        line-height:1.55;
      }

      .mod-toolbar {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin-bottom:15px;
      }

      .mod-search {
        flex:1;
        position:relative;
      }

      .mod-search input,
      .mod-field input,
      .mod-field textarea,
      .mod-field select,
      .mod-filter {
        width:100%;
        box-sizing:border-box;
        border:1px solid rgba(255,255,255,.1);
        border-radius:14px;
        outline:none;
        background:rgba(255,255,255,.026);
        color:#fff;
        padding:12px 13px;
        font:500 12px "IBM Plex Mono",monospace;
      }

      .mod-field textarea {
        min-height:100px;
        resize:vertical;
      }

      .mod-search input:focus,
      .mod-field input:focus,
      .mod-field textarea:focus,
      .mod-field select:focus,
      .mod-filter:focus {
        border-color:rgba(155,135,255,.48);
        box-shadow:0 0 0 3px rgba(155,135,255,.07);
      }

      .mod-btn {
        border:1px solid rgba(255,255,255,.1);
        border-radius:12px;
        background:rgba(255,255,255,.035);
        color:#fff;
        padding:10px 13px;
        cursor:pointer;
        font:600 10px "IBM Plex Mono",monospace;
        letter-spacing:.06em;
      }

      .mod-btn:hover {
        border-color:rgba(155,135,255,.34);
        background:rgba(155,135,255,.08);
      }

      .mod-btn.primary {
        border-color:rgba(155,135,255,.32);
        background:rgba(155,135,255,.13);
      }

      .mod-btn.success {
        border-color:rgba(118,230,167,.25);
        background:rgba(118,230,167,.08);
      }

      .mod-btn.danger {
        border-color:rgba(255,111,127,.28);
        background:rgba(255,111,127,.08);
        color:#ffb7c0;
      }

      .mod-btn:disabled {
        opacity:.42;
        cursor:not-allowed;
      }

      .mod-empty {
        padding:34px 18px;
        text-align:center;
        color:rgba(245,242,255,.43);
        font-size:12px;
      }

      .mod-list {
        display:grid;
        gap:9px;
      }

      .mod-row {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:14px;
        padding:14px;
        border:1px solid rgba(255,255,255,.065);
        border-radius:16px;
        background:rgba(255,255,255,.014);
      }

      .mod-row-main {
        min-width:0;
      }

      .mod-row-main b {
        display:block;
        color:#fff;
        font-size:13px;
      }

      .mod-row-main p {
        margin:5px 0 0;
        color:var(--mod-muted);
        font-size:11px;
        line-height:1.5;
        overflow-wrap:anywhere;
      }

      .mod-row-main small {
        display:block;
        margin-top:6px;
        color:rgba(245,242,255,.34);
        font:500 9px "IBM Plex Mono",monospace;
      }

      .mod-row-actions {
        display:flex;
        flex-wrap:wrap;
        justify-content:flex-end;
        gap:7px;
      }

      .mod-badge {
        display:inline-flex;
        align-items:center;
        gap:6px;
        padding:6px 8px;
        border:1px solid rgba(255,255,255,.08);
        border-radius:999px;
        background:rgba(255,255,255,.026);
        color:rgba(245,242,255,.62);
        font:600 9px "IBM Plex Mono",monospace;
        text-transform:uppercase;
      }

      .mod-badge.active,
      .mod-badge.open,
      .mod-badge.submitted {
        border-color:rgba(255,211,109,.22);
        color:#ffe39a;
      }

      .mod-badge.resolved,
      .mod-badge.closed,
      .mod-badge.accepted {
        border-color:rgba(118,230,167,.23);
        color:#a9f3c9;
      }

      .mod-badge.removed,
      .mod-badge.denied,
      .mod-badge.void {
        border-color:rgba(255,111,127,.23);
        color:#ffb1ba;
      }

      .mod-member-results {
        display:grid;
        gap:8px;
        max-height:330px;
        overflow:auto;
      }

      .mod-member-result {
        display:flex;
        align-items:center;
        gap:12px;
        width:100%;
        padding:11px;
        border:1px solid rgba(255,255,255,.065);
        border-radius:15px;
        background:rgba(255,255,255,.014);
        color:#fff;
        cursor:pointer;
        text-align:left;
      }

      .mod-member-result:hover {
        border-color:rgba(155,135,255,.28);
        background:rgba(155,135,255,.055);
      }

      .mod-avatar {
        width:42px;
        height:42px;
        flex:0 0 42px;
        border-radius:13px;
        object-fit:cover;
        background:rgba(255,255,255,.05);
      }

      .mod-member-result div {
        min-width:0;
      }

      .mod-member-result b,
      .mod-member-result small {
        display:block;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      }

      .mod-member-result small {
        margin-top:4px;
        color:var(--mod-muted);
        font-size:10px;
      }

      .mod-profile-head {
        display:flex;
        align-items:center;
        gap:15px;
        margin-bottom:17px;
      }

      .mod-profile-head .mod-avatar {
        width:70px;
        height:70px;
        flex-basis:70px;
        border-radius:20px;
      }

      .mod-profile-head h2 {
        margin:0;
        color:#fff;
        font:700 23px "Syne",sans-serif;
      }

      .mod-profile-head p {
        margin:6px 0 0;
        color:var(--mod-muted);
        font-size:11px;
      }

      .mod-profile-stats {
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:9px;
        margin-bottom:17px;
      }

      .mod-mini-stat {
        padding:12px;
        border:1px solid rgba(255,255,255,.06);
        border-radius:14px;
        background:rgba(255,255,255,.014);
      }

      .mod-mini-stat small {
        color:rgba(245,242,255,.38);
        font-size:9px;
      }

      .mod-mini-stat b {
        display:block;
        margin-top:7px;
        color:#fff;
        font-size:18px;
      }

      .mod-profile-actions {
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        margin-bottom:18px;
      }

      .mod-section-label {
        margin:18px 0 9px;
        color:rgba(245,242,255,.42);
        font:600 9px "IBM Plex Mono",monospace;
        letter-spacing:.12em;
      }

      .mod-settings-grid {
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:16px;
      }

      .mod-settings-block {
        border:1px solid rgba(255,255,255,.07);
        border-radius:18px;
        background:rgba(255,255,255,.014);
        padding:16px;
      }

      .mod-settings-block.full {
        grid-column:1 / -1;
      }

      .mod-settings-block h4 {
        margin:0;
        color:#fff;
        font:700 15px "Syne",sans-serif;
      }

      .mod-settings-block > p {
        margin:6px 0 15px;
        color:var(--mod-muted);
        font-size:11px;
        line-height:1.55;
      }

      .mod-switch-row {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:14px;
        padding:11px 0;
        border-bottom:1px solid rgba(255,255,255,.05);
      }

      .mod-switch-row:last-child {
        border-bottom:0;
      }

      .mod-switch-row b {
        display:block;
        color:#fff;
        font-size:12px;
      }

      .mod-switch-row small {
        display:block;
        margin-top:4px;
        color:var(--mod-muted);
        font-size:10px;
      }

      .mod-switch {
        position:relative;
        width:46px;
        height:26px;
        flex:0 0 46px;
      }

      .mod-switch input {
        opacity:0;
        width:0;
        height:0;
      }

      .mod-switch span {
        position:absolute;
        inset:0;
        border:1px solid rgba(255,255,255,.11);
        border-radius:999px;
        background:rgba(255,255,255,.05);
        cursor:pointer;
        transition:.2s;
      }

      .mod-switch span::after {
        content:"";
        position:absolute;
        width:18px;
        height:18px;
        left:3px;
        top:3px;
        border-radius:50%;
        background:rgba(255,255,255,.55);
        transition:.2s;
      }

      .mod-switch input:checked + span {
        background:rgba(155,135,255,.18);
        border-color:rgba(155,135,255,.35);
      }

      .mod-switch input:checked + span::after {
        left:23px;
        background:#c8bbff;
        box-shadow:0 0 16px rgba(155,135,255,.48);
      }

      .mod-field {
        margin-top:12px;
      }

      .mod-field label {
        display:block;
        margin-bottom:7px;
        color:rgba(245,242,255,.43);
        font:600 9px "IBM Plex Mono",monospace;
        letter-spacing:.09em;
      }

      .mod-multi {
        display:grid;
        gap:5px;
        max-height:190px;
        overflow:auto;
        padding:7px;
        border:1px solid rgba(255,255,255,.075);
        border-radius:14px;
        background:rgba(0,0,0,.12);
      }

      .mod-multi label {
        display:flex;
        align-items:center;
        gap:9px;
        margin:0;
        padding:8px;
        border-radius:10px;
        color:rgba(245,242,255,.72);
        font:500 11px "IBM Plex Mono",monospace;
        cursor:pointer;
      }

      .mod-multi label:hover {
        background:rgba(255,255,255,.035);
      }

      .mod-multi input {
        accent-color:#9b87ff;
      }

      .mod-savebar {
        position:sticky;
        bottom:88px;
        z-index:8;
        display:flex;
        justify-content:flex-end;
        gap:9px;
        margin-top:18px;
        padding:12px;
        border:1px solid rgba(255,255,255,.09);
        border-radius:17px;
        background:rgba(10,9,16,.86);
        backdrop-filter:blur(20px);
      }

      .mod-future-grid {
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:10px;
      }

      .mod-future {
        padding:14px;
        border:1px solid rgba(255,255,255,.065);
        border-radius:15px;
        background:rgba(255,255,255,.014);
      }

      .mod-future b {
        display:block;
        color:#fff;
        font-size:12px;
      }

      .mod-future span {
        display:inline-block;
        margin-top:9px;
        color:#bbaeff;
        font:600 9px "IBM Plex Mono",monospace;
      }

      .mod-audit-entry {
        display:grid;
        grid-template-columns:120px minmax(0,1fr) 170px;
        gap:12px;
        align-items:start;
        padding:11px 0;
        border-bottom:1px solid rgba(255,255,255,.05);
      }

      .mod-audit-entry:last-child {
        border-bottom:0;
      }

      .mod-audit-entry code {
        color:#c9bdff;
        font-size:10px;
      }

      .mod-audit-entry p {
        margin:0;
        color:rgba(245,242,255,.68);
        font-size:11px;
        line-height:1.5;
      }

      .mod-audit-entry small {
        color:rgba(245,242,255,.34);
        font-size:9px;
        text-align:right;
      }

      #moderationNavButton {
        appearance:none;
        cursor:pointer;
      }

      #arclumeModToastHolder {
        position:fixed;
        top:82px;
        right:20px;
        z-index:10050;
        display:grid;
        gap:8px;
        width:min(360px,calc(100vw - 40px));
        pointer-events:none;
      }

      .mod-toast {
        opacity:0;
        transform:translateY(-8px);
        padding:12px 14px;
        border:1px solid rgba(255,255,255,.11);
        border-radius:14px;
        background:rgba(12,11,18,.96);
        color:#fff;
        box-shadow:0 20px 60px rgba(0,0,0,.34);
        font-size:11px;
        transition:.25s ease;
      }

      .mod-toast.show {
        opacity:1;
        transform:none;
      }

      .mod-toast.error {
        border-color:rgba(255,111,127,.28);
      }

      .mod-toast.success {
        border-color:rgba(118,230,167,.22);
      }

      .mod-modal-backdrop {
        position:fixed;
        inset:0;
        z-index:10040;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:20px;
        background:rgba(0,0,0,.68);
        backdrop-filter:blur(10px);
      }

      .mod-modal {
        width:min(560px,100%);
        max-height:90vh;
        overflow:auto;
        border:1px solid rgba(255,255,255,.11);
        border-radius:24px;
        background:#0d0c14;
        box-shadow:0 30px 100px rgba(0,0,0,.55);
      }

      .mod-modal-head {
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:15px;
        padding:19px;
        border-bottom:1px solid rgba(255,255,255,.07);
      }

      .mod-modal-head small {
        color:#a99cff;
        font:600 9px "IBM Plex Mono",monospace;
        letter-spacing:.12em;
      }

      .mod-modal-head h3 {
        margin:5px 0 0;
        color:#fff;
        font:700 20px "Syne",sans-serif;
      }

      .mod-modal-close {
        border:0;
        background:transparent;
        color:rgba(255,255,255,.55);
        font-size:20px;
        cursor:pointer;
      }

      .mod-modal-body {
        padding:19px;
      }

      .mod-modal-info {
        padding:13px;
        border:1px solid rgba(255,255,255,.065);
        border-radius:14px;
        background:rgba(255,255,255,.018);
        color:rgba(245,242,255,.64);
        font-size:11px;
        line-height:1.65;
        overflow-wrap:anywhere;
      }

      .mod-modal-actions {
        display:flex;
        justify-content:flex-end;
        gap:9px;
        padding:15px 19px 19px;
      }

      @media(max-width:1050px) {
        .mod-stat-grid {
          grid-template-columns:repeat(3,minmax(0,1fr));
        }

        .mod-command-grid,
        .mod-future-grid {
          grid-template-columns:repeat(2,minmax(0,1fr));
        }
      }

      @media(max-width:820px) {
        .mod-card.half,
        .mod-card.third {
          grid-column:span 12;
        }

        .mod-settings-grid {
          grid-template-columns:1fr;
        }

        .mod-profile-stats {
          grid-template-columns:repeat(2,minmax(0,1fr));
        }

        .mod-audit-entry {
          grid-template-columns:1fr;
        }

        .mod-audit-entry small {
          text-align:left;
        }
      }

      @media(max-width:620px) {
        .mod-hero {
          align-items:flex-start;
          flex-direction:column;
        }

        .mod-stat-grid,
        .mod-command-grid,
        .mod-future-grid {
          grid-template-columns:1fr;
        }

        .mod-toolbar {
          align-items:stretch;
          flex-direction:column;
        }

        .mod-row {
          align-items:flex-start;
          flex-direction:column;
        }

        .mod-row-actions {
          justify-content:flex-start;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* =========================================================
     PAGE
  ========================================================= */

  function injectPage() {
    if ($("#page-moderation")) {
      return;
    }

    const main = $(".control-main");

    if (!main) {
      return;
    }

    const section = document.createElement("section");

    section.className = "dash-page";

    section.id = "page-moderation";

    section.innerHTML = `
      <div class="page-hero compact mod-hero">
        <div>
          <span class="mono eyebrow">08 / STAFF CONTROL</span>
          <h1>
            Moderation
            <br />
            <span>Center.</span>
          </h1>
          <p>
            Cases, warnings, member history and staff operations in one control surface.
          </p>
        </div>

        <div class="mod-live loading" id="moderationLiveState">
          <i></i>
          <span class="mono" id="moderationLiveText">WAITING FOR DATA</span>
        </div>
      </div>

      <div class="mod-tabs" id="moderationTabs">
        <button class="mod-tab active" data-mod-tab="overview" type="button">OVERVIEW</button>
        <button class="mod-tab" data-mod-tab="members" type="button">MEMBER LOOKUP</button>
        <button class="mod-tab" data-mod-tab="cases" type="button">CASES</button>
        <button class="mod-tab" data-mod-tab="reports" type="button">REPORTS</button>
        <button class="mod-tab" data-mod-tab="appeals" type="button">APPEALS</button>
        <button class="mod-tab" data-mod-tab="watchlist" type="button">WATCHLIST</button>
        <button class="mod-tab" data-mod-tab="audit" type="button">AUDIT</button>
        <button class="mod-tab" data-mod-tab="settings" type="button">SETTINGS</button>
      </div>


      <!-- OVERVIEW -->
      <div class="mod-view active" data-mod-view="overview">
        <div class="mod-stat-grid">
          <div class="mod-stat">
            <small>MODERATION CASES</small>
            <strong id="modOverviewCases">0</strong>
            <em id="modOverviewOpenCases">0 OPEN</em>
          </div>

          <div class="mod-stat">
            <small>REPORTS</small>
            <strong id="modOverviewReports">0</strong>
            <em id="modOverviewOpenReports">0 OPEN</em>
          </div>

          <div class="mod-stat">
            <small>APPEALS</small>
            <strong id="modOverviewAppeals">0</strong>
            <em id="modOverviewOpenAppeals">0 PENDING</em>
          </div>

          <div class="mod-stat">
            <small>WATCHLIST</small>
            <strong id="modOverviewWatchlist">0</strong>
            <em>ACTIVE MEMBERS</em>
          </div>

          <div class="mod-stat">
            <small>ENGINE</small>
            <strong id="modOverviewEngine">ON</strong>
            <em>ARCLUME MODERATION</em>
          </div>
        </div>

        <div class="mod-grid">
          <article class="mod-card half">
            <header class="mod-card-head">
              <div>
                <span>01 / COMMAND CENTER</span>
                <h3>Staff Commands</h3>
              </div>
            </header>

            <div class="mod-card-body">
              <div class="mod-command-grid">
                <div class="mod-command">
                  <code>/warn</code>
                  <p>Issue a warning with points and severity.</p>
                </div>

                <div class="mod-command">
                  <code>/warnings</code>
                  <p>View a member's warning history.</p>
                </div>

                <div class="mod-command">
                  <code>/timeout</code>
                  <p>Apply a Discord timeout with a reason.</p>
                </div>

                <div class="mod-command">
                  <code>/kick</code>
                  <p>Kick with hierarchy and safety checks.</p>
                </div>

                <div class="mod-command">
                  <code>/ban</code>
                  <p>Permanent ban with confirmation protection.</p>
                </div>

                <div class="mod-command">
                  <code>/tempban</code>
                  <p>Restart-safe temporary ban expiry.</p>
                </div>

                <div class="mod-command">
                  <code>/purge</code>
                  <p>Bulk delete messages with staff limits.</p>
                </div>

                <div class="mod-command">
                  <code>/lock</code>
                  <p>Lock a channel against member messages.</p>
                </div>

                <div class="mod-command">
                  <code>/modprofile</code>
                  <p>Open a member's moderation history.</p>
                </div>
              </div>
            </div>
          </article>

          <article class="mod-card half">
            <header class="mod-card-head">
              <div>
                <span>02 / NEXT LAYERS</span>
                <h3>Moderation Network</h3>
              </div>
            </header>

            <div class="mod-card-body">
              <div class="mod-future-grid">
                <div class="mod-future">
                  <b>Protection V2</b>
                  <span>FOUNDATION READY</span>
                </div>

                <div class="mod-future">
                  <b>Anti-Raid</b>
                  <span>NEXT PHASE</span>
                </div>

                <div class="mod-future">
                  <b>Anti-Nuke</b>
                  <span>NEXT PHASE</span>
                </div>

                <div class="mod-future">
                  <b>Quarantine</b>
                  <span>DATABASE READY</span>
                </div>

                <div class="mod-future">
                  <b>Voice Moderation</b>
                  <span>NEXT PHASE</span>
                </div>

                <div class="mod-future">
                  <b>Quick Actions</b>
                  <span>NEXT PHASE</span>
                </div>
              </div>
            </div>
          </article>

          <article class="mod-card">
            <header class="mod-card-head">
              <div>
                <span>03 / RECENT ACTIVITY</span>
                <h3>Audit Feed</h3>
              </div>

              <button class="mod-btn" id="modOverviewRefresh" type="button">
                REFRESH
              </button>
            </header>

            <div class="mod-card-body" id="modOverviewAudit">
              <div class="mod-empty">No audit events loaded.</div>
            </div>
          </article>
        </div>
      </div>


      <!-- MEMBERS -->
      <div class="mod-view" data-mod-view="members">
        <div class="mod-grid">
          <article class="mod-card third">
            <header class="mod-card-head">
              <div>
                <span>MEMBER DIRECTORY</span>
                <h3>Lookup</h3>
              </div>
            </header>

            <div class="mod-card-body">
              <div class="mod-search">
                <input
                  id="modMemberSearch"
                  type="text"
                  placeholder="Name, display name or Discord ID..."
                  autocomplete="off"
                />
              </div>

              <div style="height:12px"></div>

              <div class="mod-member-results" id="modMemberResults">
                <div class="mod-empty">
                  Search for a server member.
                </div>
              </div>
            </div>
          </article>

          <article class="mod-card" style="grid-column:span 8">
            <header class="mod-card-head">
              <div>
                <span>MEMBER INTELLIGENCE</span>
                <h3>Moderation Profile</h3>
              </div>
            </header>

            <div class="mod-card-body" id="modMemberProfile">
              <div class="mod-empty">
                Select a member to open their moderation profile.
              </div>
            </div>
          </article>
        </div>
      </div>


      <!-- CASES -->
      <div class="mod-view" data-mod-view="cases">
        <article class="mod-card">
          <header class="mod-card-head">
            <div>
              <span>CASE NETWORK</span>
              <h3>Moderation Cases</h3>
            </div>

            <button class="mod-btn" id="modReloadCases" type="button">
              REFRESH
            </button>
          </header>

          <div class="mod-card-body">
            <div class="mod-toolbar">
              <select class="mod-filter" id="modCaseFilter">
                <option value="">ALL CASES</option>
                <option value="open">OPEN</option>
                <option value="claimed">CLAIMED</option>
                <option value="under-review">UNDER REVIEW</option>
                <option value="resolved">RESOLVED</option>
                <option value="closed">CLOSED</option>
                <option value="void">VOID</option>
              </select>
            </div>

            <div class="mod-list" id="modCaseList"></div>
          </div>
        </article>
      </div>


      <!-- REPORTS -->
      <div class="mod-view" data-mod-view="reports">
        <article class="mod-card">
          <header class="mod-card-head">
            <div>
              <span>MEMBER REPORTS</span>
              <h3>Reports Queue</h3>
            </div>

            <button class="mod-btn" id="modReloadReports" type="button">
              REFRESH
            </button>
          </header>

          <div class="mod-card-body">
            <div class="mod-list" id="modReportList"></div>
          </div>
        </article>
      </div>


      <!-- APPEALS -->
      <div class="mod-view" data-mod-view="appeals">
        <article class="mod-card">
          <header class="mod-card-head">
            <div>
              <span>REVIEW CENTER</span>
              <h3>Appeals</h3>
            </div>

            <button class="mod-btn" id="modReloadAppeals" type="button">
              REFRESH
            </button>
          </header>

          <div class="mod-card-body">
            <div class="mod-list" id="modAppealList"></div>
          </div>
        </article>
      </div>


      <!-- WATCHLIST -->
      <div class="mod-view" data-mod-view="watchlist">
        <article class="mod-card">
          <header class="mod-card-head">
            <div>
              <span>STAFF WATCH</span>
              <h3>Watchlist</h3>
            </div>

            <button class="mod-btn" id="modReloadWatchlist" type="button">
              REFRESH
            </button>
          </header>

          <div class="mod-card-body">
            <div class="mod-list" id="modWatchlistList"></div>
          </div>
        </article>
      </div>


      <!-- AUDIT -->
      <div class="mod-view" data-mod-view="audit">
        <article class="mod-card">
          <header class="mod-card-head">
            <div>
              <span>IMMUTABLE HISTORY</span>
              <h3>Moderation Audit</h3>
            </div>

            <button class="mod-btn" id="modReloadAudit" type="button">
              REFRESH
            </button>
          </header>

          <div class="mod-card-body" id="modAuditList"></div>
        </article>
      </div>


      <!-- SETTINGS -->
      <div class="mod-view" data-mod-view="settings">
        <div class="mod-settings-grid">

          <section class="mod-settings-block">
            <h4>Moderation Core</h4>
            <p>Master controls and action safety.</p>

            ${switchHTML(
              "modSettingEnabled",
              "Moderation Engine",
              "Enable Arclume's moderation configuration.",
            )}

            ${switchHTML(
              "modSettingReasons",
              "Require Reasons",
              "Staff actions should include a reason.",
            )}

            ${switchHTML(
              "modSettingConfirm",
              "Confirm Serious Actions",
              "Confirmation before dangerous moderation actions.",
            )}

            ${switchHTML(
              "modSettingOwnerProtection",
              "Protect Server Owner",
              "Prevent moderation actions against the owner.",
            )}
          </section>


          <section class="mod-settings-block">
            <h4>Warnings</h4>
            <p>Configure warning defaults and member notifications.</p>

            <div class="mod-field">
              <label>DEFAULT WARNING POINTS</label>
              <input id="modWarningPoints" type="number" min="0" max="100" />
            </div>

            <div class="mod-field">
              <label>DEFAULT SEVERITY</label>
              <select id="modWarningSeverity">
                <option value="minor">MINOR</option>
                <option value="moderate">MODERATE</option>
                <option value="major">MAJOR</option>
                <option value="critical">CRITICAL</option>
              </select>
            </div>

            ${switchHTML(
              "modDMWarn",
              "DM on Warning",
              "Tell members when a warning is issued.",
            )}

            ${switchHTML(
              "modDMWarningRemoved",
              "DM on Warning Removal",
              "Tell members when a warning is removed.",
            )}
          </section>


          <section class="mod-settings-block">
            <h4>Cases</h4>
            <p>Case creation and structured incident history.</p>

            ${switchHTML(
              "modCasesEnabled",
              "Case System",
              "Store structured moderation cases.",
            )}

            ${switchHTML(
              "modCasesAuto",
              "Automatic Manual Cases",
              "Create a case when staff uses moderation commands.",
            )}
          </section>


          <section class="mod-settings-block">
            <h4>Member Notifications</h4>
            <p>Choose which punishments trigger a direct message.</p>

            ${switchHTML(
              "modDMTimeout",
              "DM on Timeout",
              "Notify a member before or after timeout.",
            )}

            ${switchHTML(
              "modDMKick",
              "DM on Kick",
              "Attempt to notify before kicking.",
            )}

            ${switchHTML(
              "modDMBan",
              "DM on Ban",
              "Attempt to notify before banning.",
            )}

            ${switchHTML(
              "modDMTempban",
              "DM on Tempban",
              "Notify about temporary ban duration.",
            )}
          </section>


          <section class="mod-settings-block">
            <h4>Moderator Roles</h4>
            <p>Roles treated as regular moderation staff.</p>
            <div class="mod-multi" id="modModeratorRoles"></div>
          </section>


          <section class="mod-settings-block">
            <h4>Senior Moderator Roles</h4>
            <p>Roles with elevated moderation access.</p>
            <div class="mod-multi" id="modSeniorRoles"></div>
          </section>


          <section class="mod-settings-block">
            <h4>Administrator Roles</h4>
            <p>Highest configured Arclume staff level.</p>
            <div class="mod-multi" id="modAdminRoles"></div>
          </section>


          <section class="mod-settings-block">
            <h4>Trusted / Bypass Roles</h4>
            <p>Roles trusted by future Protection V2 checks.</p>
            <div class="mod-multi" id="modTrustedRoles"></div>
          </section>


          <section class="mod-settings-block">
            <h4>Ignored Roles</h4>
            <p>Roles that can be excluded from automated protection checks.</p>
            <div class="mod-multi" id="modIgnoredRoles"></div>
          </section>


          <section class="mod-settings-block">
            <h4>Protected Roles</h4>
            <p>Prevent non-owner staff from moderating members with these roles.</p>
            <div class="mod-multi" id="modProtectedRoles"></div>
          </section>


          <section class="mod-settings-block full">
            <h4>Ignored Channels</h4>
            <p>Channels excluded from automated moderation rules.</p>
            <div class="mod-multi" id="modIgnoredChannels"></div>
          </section>


          <section class="mod-settings-block full">
            <h4>Moderation Logs</h4>
            <p>Choose where important staff events are sent.</p>

            <div class="mod-settings-grid">
              ${channelSelectHTML("modLogModeration", "MODERATION LOG")}

              ${channelSelectHTML("modLogAudit", "AUDIT LOG")}

              ${channelSelectHTML("modLogCases", "CASE LOG")}

              ${channelSelectHTML("modLogReports", "REPORT LOG")}

              ${channelSelectHTML("modLogAppeals", "APPEAL LOG")}

              ${channelSelectHTML("modLogRaid", "RAID LOG")}
            </div>
          </section>
        </div>

        <div class="mod-savebar">
          <button class="mod-btn danger" id="modResetSettings" type="button">
            RESET
          </button>

          <button class="mod-btn primary" id="modSaveSettings" type="button">
            SAVE MODERATION
          </button>
        </div>
      </div>
    `;

    main.appendChild(section);
  }

  function switchHTML(id, title, description) {
    return `
      <div class="mod-switch-row">
        <div>
          <b>${escapeHTML(title)}</b>
          <small>${escapeHTML(description)}</small>
        </div>

        <label class="mod-switch">
          <input id="${id}" type="checkbox" />
          <span></span>
        </label>
      </div>
    `;
  }

  function channelSelectHTML(id, label) {
    return `
      <div class="mod-field">
        <label>${escapeHTML(label)}</label>

        <select id="${id}">
          <option value="">NOT SET</option>
        </select>
      </div>
    `;
  }

  /* =========================================================
     NAVIGATION
  ========================================================= */

  function injectNavigation() {
    if ($("#moderationNavButton")) {
      return;
    }

    const dock = $(".control-dock");

    if (!dock) {
      return;
    }

    const button = document.createElement("button");

    button.id = "moderationNavButton";

    button.type = "button";

    button.innerHTML = `
      <span>08</span>
      <b>Moderation</b>
    `;

    const logout = dock.querySelector(
      'a[href="/logout"], [href="/logout"], .logout',
    );

    if (logout) {
      dock.insertBefore(button, logout);
    } else {
      dock.appendChild(button);
    }

    button.addEventListener("click", () => {
      openModerationPage();
    });
  }

  function openModerationPage() {
    $$(".dash-page").forEach((page) => page.classList.remove("active"));

    const page = $("#page-moderation");

    if (page) {
      page.classList.add("active");
    }

    $(".control-dock .active")?.classList.remove("active");

    $("#moderationNavButton")?.classList.add("active");

    const code = $("#pageCode");

    if (code) {
      code.textContent = "08 / MODERATION";
    }

    if (!state.guildID) {
      loadModeration();
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function setTab(tab) {
    state.activeTab = tab;

    $$(".mod-tab").forEach((button) => {
      button.classList.toggle("active", button.dataset.modTab === tab);
    });

    $$(".mod-view").forEach((view) => {
      view.classList.toggle("active", view.dataset.modView === tab);
    });
  }

  /* =========================================================
     LOAD CORE DATA
  ========================================================= */

  async function loadModeration(force = false) {
    const guildID = getSelectedGuildID();

    if (!guildID) {
      setLiveState("SELECT A SERVER", "error");

      return;
    }

    if (state.loading) {
      return;
    }

    if (!force && state.guildID === guildID && state.settings) {
      return;
    }

    state.loading = true;

    state.guildID = guildID;

    state.selectedMember = null;

    state.selectedProfile = null;

    setLiveState("SYNCING", "loading");

    try {
      const base = `/api/guild/${encodeURIComponent(guildID)}/moderation`;

      const [
        settingsData,
        optionsData,
        caseData,
        reportData,
        appealData,
        watchlistData,
        auditData,
      ] = await Promise.all([
        api(`${base}/settings`),

        api(`${base}/options`),

        api(`${base}/cases?limit=100`),

        api(`${base}/reports?limit=100`),

        api(`${base}/appeals?limit=100`),

        api(`${base}/watchlist`),

        api(`${base}/audit?limit=100`),
      ]);

      state.settings = settingsData.settings || {};

      state.options = optionsData;

      state.cases = caseData.cases || [];

      state.reports = reportData.reports || [];

      state.appeals = appealData.appeals || [];

      state.watchlist = watchlistData.watchlist || [];

      state.audit = auditData.entries || [];

      renderEverything();

      setLiveState("LIVE", "ready");
    } catch (error) {
      console.error("❌ Moderation dashboard load error:", error);

      setLiveState("SYNC FAILED", "error");

      toast(error.message, "error");
    } finally {
      state.loading = false;
    }
  }

  async function refreshLists() {
    if (!state.guildID) {
      return;
    }

    const base = `/api/guild/${state.guildID}/moderation`;

    try {
      const [caseData, reportData, appealData, watchlistData, auditData] =
        await Promise.all([
          api(`${base}/cases?limit=100`),

          api(`${base}/reports?limit=100`),

          api(`${base}/appeals?limit=100`),

          api(`${base}/watchlist`),

          api(`${base}/audit?limit=100`),
        ]);

      state.cases = caseData.cases || [];

      state.reports = reportData.reports || [];

      state.appeals = appealData.appeals || [];

      state.watchlist = watchlistData.watchlist || [];

      state.audit = auditData.entries || [];

      renderOverview();
      renderCases();
      renderReports();
      renderAppeals();
      renderWatchlist();
      renderAudit();
    } catch (error) {
      toast(error.message, "error");
    }
  }

  /* =========================================================
     RENDER ALL
  ========================================================= */

  function renderEverything() {
    renderOverview();
    renderCases();
    renderReports();
    renderAppeals();
    renderWatchlist();
    renderAudit();
    renderSettings();

    const search = $("#modMemberSearch");

    if (search) {
      search.value = "";
    }

    const results = $("#modMemberResults");

    if (results) {
      results.innerHTML = `<div class="mod-empty">Search for a server member.</div>`;
    }

    const profile = $("#modMemberProfile");

    if (profile) {
      profile.innerHTML = `<div class="mod-empty">Select a member to open their moderation profile.</div>`;
    }
  }

  /* =========================================================
     OVERVIEW
  ========================================================= */

  function renderOverview() {
    const openCases = state.cases.filter(
      (item) => !["resolved", "closed", "void"].includes(item.status),
    ).length;

    const openReports = state.reports.filter(
      (item) => !["resolved", "denied", "closed"].includes(item.status),
    ).length;

    const openAppeals = state.appeals.filter(
      (item) => !["accepted", "denied", "closed"].includes(item.status),
    ).length;

    setText("#modOverviewCases", state.cases.length);

    setText("#modOverviewOpenCases", `${openCases} OPEN`);

    setText("#modOverviewReports", state.reports.length);

    setText("#modOverviewOpenReports", `${openReports} OPEN`);

    setText("#modOverviewAppeals", state.appeals.length);

    setText("#modOverviewOpenAppeals", `${openAppeals} PENDING`);

    setText("#modOverviewWatchlist", state.watchlist.length);

    setText("#modOverviewEngine", state.settings?.enabled ? "ON" : "OFF");

    renderAuditInto("#modOverviewAudit", state.audit.slice(0, 8));
  }

  function setText(selector, value) {
    const element = $(selector);

    if (element) {
      element.textContent = String(value);
    }
  }

  /* =========================================================
     MEMBER SEARCH
  ========================================================= */

  let memberSearchTimer = null;

  async function searchMembers(query) {
    const holder = $("#modMemberResults");

    if (!holder) {
      return;
    }

    const text = String(query || "").trim();

    if (!text) {
      holder.innerHTML = `<div class="mod-empty">Search for a server member.</div>`;

      return;
    }

    holder.innerHTML = `<div class="mod-empty">Searching...</div>`;

    try {
      const data = await api(
        `/api/guild/${state.guildID}/moderation/members/search?q=${encodeURIComponent(
          text,
        )}`,
      );

      const members = data.members || [];

      if (!members.length) {
        holder.innerHTML = `<div class="mod-empty">No matching member found.</div>`;

        return;
      }

      holder.innerHTML = members
        .map(
          (member) => `
              <button
                type="button"
                class="mod-member-result"
                data-mod-member="${escapeHTML(member.id)}"
              >
                <img
                  class="mod-avatar"
                  src="${escapeHTML(member.avatar || "/arclume-logo.png")}"
                  alt=""
                />

                <div>
                  <b>${escapeHTML(member.displayName || member.username)}</b>

                  <small>
                    @${escapeHTML(member.username)} • ${escapeHTML(member.id)}
                  </small>
                </div>
              </button>
            `,
        )
        .join("");

      $$("[data-mod-member]", holder).forEach((button) => {
        button.addEventListener("click", () => {
          loadMemberProfile(button.dataset.modMember);
        });
      });
    } catch (error) {
      holder.innerHTML = `<div class="mod-empty">${escapeHTML(
        error.message,
      )}</div>`;
    }
  }

  async function loadMemberProfile(userID) {
    const holder = $("#modMemberProfile");

    if (!holder) {
      return;
    }

    holder.innerHTML = `<div class="mod-empty">Loading moderation profile...</div>`;

    try {
      const data = await api(
        `/api/guild/${state.guildID}/moderation/member/${encodeURIComponent(
          userID,
        )}`,
      );

      state.selectedMember = data.member;

      state.selectedProfile = data.profile;

      renderMemberProfile();
    } catch (error) {
      holder.innerHTML = `<div class="mod-empty">${escapeHTML(
        error.message,
      )}</div>`;
    }
  }

  function renderMemberProfile() {
    const holder = $("#modMemberProfile");

    const member = state.selectedMember;

    const profile = state.selectedProfile;

    if (!holder || !profile) {
      return;
    }

    const displayName =
      member?.displayName || member?.username || profile.userID;

    const warnings = profile.warnings || [];

    const notes = profile.notes || [];

    holder.innerHTML = `
      <div class="mod-profile-head">
        <img
          class="mod-avatar"
          src="${escapeHTML(member?.avatar || "/arclume-logo.png")}"
          alt=""
        />

        <div>
          <h2>${escapeHTML(displayName)}</h2>

          <p>
            ${escapeHTML(member?.username ? `@${member.username}` : "")}
            ${member?.id ? ` • ${escapeHTML(member.id)}` : ""}
          </p>
        </div>
      </div>

      <div class="mod-profile-stats">
        ${miniStat("ACTIVE WARNINGS", profile.totals?.activeWarnings || 0)}

        ${miniStat("WARNING POINTS", profile.warningStats?.points || 0)}

        ${miniStat("CASES", profile.totals?.cases || 0)}

        ${miniStat("STAFF NOTES", profile.totals?.notes || 0)}
      </div>

      <div class="mod-profile-actions">
        <button class="mod-btn primary" id="modAddNote" type="button">
          + STAFF NOTE
        </button>

        <button class="mod-btn" id="modAddWatchlist" type="button">
          + WATCHLIST
        </button>

        <button class="mod-btn" id="modCopyWarnCommand" type="button">
          COPY /WARN
        </button>
      </div>

      <div class="mod-section-label">WARNING HISTORY</div>

      <div class="mod-list">
        ${
          warnings.length
            ? warnings.map((warning) => warningHTML(warning)).join("")
            : `<div class="mod-empty">No warning history.</div>`
        }
      </div>

      <div class="mod-section-label">STAFF NOTES</div>

      <div class="mod-list">
        ${
          notes.length
            ? notes.map((note) => noteHTML(note)).join("")
            : `<div class="mod-empty">No staff notes.</div>`
        }
      </div>
    `;

    $("#modAddNote", holder)?.addEventListener("click", openAddNoteModal);

    $("#modAddWatchlist", holder)?.addEventListener(
      "click",
      openWatchlistModal,
    );

    $("#modCopyWarnCommand", holder)?.addEventListener("click", () => {
      const text = `/warn user:${member?.username || profile.userID} reason:`;

      navigator.clipboard
        ?.writeText(text)
        .then(() => toast("/warn template copied."))
        .catch(() => toast("Could not copy command.", "error"));
    });

    $$("[data-warning-remove]", holder).forEach((button) => {
      button.addEventListener("click", () => {
        const warning = warnings.find(
          (item) => item.warningID === button.dataset.warningRemove,
        );

        if (warning) {
          openRemoveWarningModal(warning);
        }
      });
    });

    $$("[data-warning-delete]", holder).forEach((button) => {
      button.addEventListener("click", () => {
        const warning = warnings.find(
          (item) => item.warningID === button.dataset.warningDelete,
        );

        if (warning) {
          openPermanentWarningDeleteModal(warning);
        }
      });
    });

    $$("[data-note-remove]", holder).forEach((button) => {
      button.addEventListener("click", () => {
        const note = notes.find(
          (item) => item.noteID === button.dataset.noteRemove,
        );

        if (note) {
          openRemoveNoteModal(note);
        }
      });
    });
  }

  function miniStat(title, value) {
    return `
      <div class="mod-mini-stat">
        <small>${escapeHTML(title)}</small>

        <b>${escapeHTML(value)}</b>
      </div>
    `;
  }

  function warningHTML(warning) {
    const canRemove = warning.status !== "removed";

    return `
      <div class="mod-row">
        <div class="mod-row-main">
          <b>
            Warning #${escapeHTML(warning.warningNumber)}
            <span class="mod-badge ${escapeHTML(warning.status)}">
              ${escapeHTML(warning.status)}
            </span>
          </b>

          <p>${escapeHTML(warning.reason)}</p>

          <small>
            ${escapeHTML(warning.points)} POINT(S)
            • ${escapeHTML(warning.severity)}
            • ${escapeHTML(formatDate(warning.createdAt))}
          </small>

          ${
            warning.status === "removed"
              ? `
                <small>
                  REMOVED BY ${escapeHTML(warning.removedBy || "UNKNOWN")}
                  • ${escapeHTML(warning.removalReason || "No reason")}
                </small>
              `
              : ""
          }
        </div>

        <div class="mod-row-actions">
          ${
            canRemove
              ? `
                <button
                  class="mod-btn"
                  type="button"
                  data-warning-remove="${escapeHTML(warning.warningID)}"
                >
                  REMOVE
                </button>
              `
              : ""
          }

          <button
            class="mod-btn danger"
            type="button"
            data-warning-delete="${escapeHTML(warning.warningID)}"
          >
            PERMANENT DELETE
          </button>
        </div>
      </div>
    `;
  }

  function noteHTML(note) {
    return `
      <div class="mod-row">
        <div class="mod-row-main">
          <b>
            ${note.pinned ? "📌 " : ""}Staff Note
          </b>

          <p>${escapeHTML(note.note)}</p>

          <small>
            BY ${escapeHTML(shortID(note.authorID))}
            • ${escapeHTML(formatDate(note.createdAt))}
          </small>
        </div>

        <div class="mod-row-actions">
          <button
            class="mod-btn danger"
            type="button"
            data-note-remove="${escapeHTML(note.noteID)}"
          >
            REMOVE
          </button>
        </div>
      </div>
    `;
  }

  /* =========================================================
     CASES
  ========================================================= */

  function renderCases() {
    const holder = $("#modCaseList");

    if (!holder) {
      return;
    }

    const filter = $("#modCaseFilter")?.value || "";

    const items = filter
      ? state.cases.filter((item) => item.status === filter)
      : state.cases;

    if (!items.length) {
      holder.innerHTML = `<div class="mod-empty">No moderation cases found.</div>`;

      return;
    }

    holder.innerHTML = items
      .map(
        (item) => `
            <div class="mod-row">
              <div class="mod-row-main">
                <b>
                  Case #${escapeHTML(item.caseNumber)}
                  <span class="mod-badge ${escapeHTML(item.status)}">
                    ${escapeHTML(item.status)}
                  </span>
                </b>

                <p>
                  ${escapeHTML(item.action)}
                  ${item.reason ? ` • ${escapeHTML(item.reason)}` : ""}
                </p>

                <small>
                  TARGET ${escapeHTML(shortID(item.targetUserID))}
                  • ${escapeHTML(formatDate(item.createdAt))}
                  • PRIORITY ${escapeHTML(item.priority)}
                </small>
              </div>

              <div class="mod-row-actions">
                ${
                  !item.claimedBy &&
                  !["resolved", "closed", "void"].includes(item.status)
                    ? `
                      <button
                        class="mod-btn"
                        type="button"
                        data-case-claim="${escapeHTML(item.caseID)}"
                      >
                        CLAIM
                      </button>
                    `
                    : ""
                }

                ${
                  !["resolved", "closed", "void"].includes(item.status)
                    ? `
                      <button
                        class="mod-btn success"
                        type="button"
                        data-case-resolve="${escapeHTML(item.caseID)}"
                      >
                        RESOLVE
                      </button>
                    `
                    : ""
                }
              </div>
            </div>
          `,
      )
      .join("");

    $$("[data-case-claim]", holder).forEach((button) =>
      button.addEventListener("click", () =>
        claimCase(button.dataset.caseClaim),
      ),
    );

    $$("[data-case-resolve]", holder).forEach((button) =>
      button.addEventListener("click", () =>
        openResolveCaseModal(button.dataset.caseResolve),
      ),
    );
  }

  async function claimCase(caseID) {
    try {
      await api(
        `/api/guild/${state.guildID}/moderation/case/${encodeURIComponent(
          caseID,
        )}/claim`,
        {
          method: "POST",
        },
      );

      toast("Case claimed.");

      await refreshLists();
    } catch (error) {
      toast(error.message, "error");
    }
  }

  /* =========================================================
     REPORTS
  ========================================================= */

  function renderReports() {
    const holder = $("#modReportList");

    if (!holder) {
      return;
    }

    if (!state.reports.length) {
      holder.innerHTML = `<div class="mod-empty">No member reports.</div>`;

      return;
    }

    holder.innerHTML = state.reports
      .map(
        (report) => `
            <div class="mod-row">
              <div class="mod-row-main">
                <b>
                  Report
                  <span class="mod-badge ${escapeHTML(report.status)}">
                    ${escapeHTML(report.status)}
                  </span>
                </b>

                <p>${escapeHTML(report.reason)}</p>

                <small>
                  REPORTER ${escapeHTML(shortID(report.reporterUserID))}
                  • TARGET ${escapeHTML(shortID(report.targetUserID))}
                  • ${escapeHTML(formatDate(report.createdAt))}
                </small>
              </div>

              <div class="mod-row-actions">
                ${
                  report.status === "open"
                    ? `
                      <button
                        class="mod-btn"
                        data-report-claim="${escapeHTML(report.reportID)}"
                        type="button"
                      >
                        CLAIM
                      </button>
                    `
                    : ""
                }

                ${
                  !["resolved", "denied", "closed"].includes(report.status)
                    ? `
                      <button
                        class="mod-btn success"
                        data-report-resolve="${escapeHTML(report.reportID)}"
                        type="button"
                      >
                        RESOLVE
                      </button>
                    `
                    : ""
                }
              </div>
            </div>
          `,
      )
      .join("");

    $$("[data-report-claim]", holder).forEach((button) =>
      button.addEventListener("click", () =>
        claimReportAction(button.dataset.reportClaim),
      ),
    );

    $$("[data-report-resolve]", holder).forEach((button) =>
      button.addEventListener("click", () =>
        openResolveReportModal(button.dataset.reportResolve),
      ),
    );
  }

  async function claimReportAction(reportID) {
    try {
      await api(
        `/api/guild/${state.guildID}/moderation/report/${encodeURIComponent(
          reportID,
        )}/claim`,
        {
          method: "POST",
        },
      );

      toast("Report claimed.");

      await refreshLists();
    } catch (error) {
      toast(error.message, "error");
    }
  }

  /* =========================================================
     APPEALS
  ========================================================= */

  function renderAppeals() {
    const holder = $("#modAppealList");

    if (!holder) {
      return;
    }

    if (!state.appeals.length) {
      holder.innerHTML = `<div class="mod-empty">No appeals submitted.</div>`;

      return;
    }

    holder.innerHTML = state.appeals
      .map(
        (appeal) => `
            <div class="mod-row">
              <div class="mod-row-main">
                <b>
                  ${escapeHTML(appeal.punishmentType || "Moderation")} Appeal

                  <span class="mod-badge ${escapeHTML(appeal.status)}">
                    ${escapeHTML(appeal.status)}
                  </span>
                </b>

                <p>${escapeHTML(appeal.reason)}</p>

                <small>
                  USER ${escapeHTML(shortID(appeal.userID))}
                  • ${escapeHTML(formatDate(appeal.createdAt))}
                </small>
              </div>

              <div class="mod-row-actions">
                ${
                  !["accepted", "denied", "closed"].includes(appeal.status)
                    ? `
                      <button
                        class="mod-btn"
                        data-appeal-review="${escapeHTML(appeal.appealID)}"
                        type="button"
                      >
                        REVIEW
                      </button>
                    `
                    : ""
                }
              </div>
            </div>
          `,
      )
      .join("");

    $$("[data-appeal-review]", holder).forEach((button) =>
      button.addEventListener("click", () =>
        openAppealModal(button.dataset.appealReview),
      ),
    );
  }

  /* =========================================================
     WATCHLIST
  ========================================================= */

  function renderWatchlist() {
    const holder = $("#modWatchlistList");

    if (!holder) {
      return;
    }

    if (!state.watchlist.length) {
      holder.innerHTML = `<div class="mod-empty">No members are currently on the watchlist.</div>`;

      return;
    }

    holder.innerHTML = state.watchlist
      .map(
        (entry) => `
            <div class="mod-row">
              <div class="mod-row-main">
                <b>
                  User ${escapeHTML(entry.userID)}

                  <span class="mod-badge active">
                    WATCHING
                  </span>
                </b>

                <p>${escapeHTML(entry.reason)}</p>

                <small>
                  ADDED BY ${escapeHTML(shortID(entry.addedBy))}
                  • ${escapeHTML(formatDate(entry.createdAt))}

                  ${
                    entry.expiresAt
                      ? ` • EXPIRES ${escapeHTML(formatDate(entry.expiresAt))}`
                      : ""
                  }
                </small>
              </div>

              <div class="mod-row-actions">
                <button
                  class="mod-btn danger"
                  type="button"
                  data-watch-remove="${escapeHTML(entry.userID)}"
                >
                  REMOVE
                </button>
              </div>
            </div>
          `,
      )
      .join("");

    $$("[data-watch-remove]", holder).forEach((button) =>
      button.addEventListener("click", () =>
        openRemoveWatchlistModal(button.dataset.watchRemove),
      ),
    );
  }

  /* =========================================================
     AUDIT
  ========================================================= */

  function renderAudit() {
    renderAuditInto("#modAuditList", state.audit);
  }

  function renderAuditInto(selector, entries) {
    const holder = $(selector);

    if (!holder) {
      return;
    }

    if (!entries?.length) {
      holder.innerHTML = `<div class="mod-empty">No moderation audit entries yet.</div>`;

      return;
    }

    holder.innerHTML = entries
      .map((entry) => {
        const eventType =
          entry.event_type || entry.eventType || "moderation_event";

        const reason = entry.reason || "No reason recorded.";

        const actor = entry.actor_user_id || entry.actorUserID || "SYSTEM";

        const target = entry.target_user_id || entry.targetUserID || "";

        const created = entry.created_at || entry.createdAt;

        return `
              <div class="mod-audit-entry">
                <code>${escapeHTML(eventType)}</code>

                <p>
                  ${escapeHTML(reason)}

                  <br />

                  <span style="color:rgba(245,242,255,.34)">
                    Actor: ${escapeHTML(shortID(actor))}

                    ${target ? ` • Target: ${escapeHTML(shortID(target))}` : ""}
                  </span>
                </p>

                <small>${escapeHTML(formatDate(created))}</small>
              </div>
            `;
      })
      .join("");
  }

  /* =========================================================
     SETTINGS
  ========================================================= */

  function renderSettings() {
    const settings = state.settings || {};

    const staff = settings.staff || {};

    const safety = settings.safety || {};

    const warnings = settings.warnings || {};

    const cases = settings.cases || {};

    const notifications = settings.notifications || {};

    const logs = settings.logs || {};

    setChecked("modSettingEnabled", settings.enabled !== false);

    setChecked("modSettingReasons", safety.requireReasons !== false);

    setChecked("modSettingConfirm", safety.confirmSeriousActions !== false);

    setChecked(
      "modSettingOwnerProtection",
      safety.preventOwnerTarget !== false,
    );

    setValue("modWarningPoints", warnings.defaultPoints ?? 1);

    setValue("modWarningSeverity", warnings.defaultSeverity || "minor");

    setChecked("modDMWarn", Boolean(notifications.dmOnWarn));

    setChecked(
      "modDMWarningRemoved",
      Boolean(notifications.dmOnWarningRemoved),
    );

    setChecked("modDMTimeout", Boolean(notifications.dmOnTimeout));

    setChecked("modDMKick", Boolean(notifications.dmOnKick));

    setChecked("modDMBan", Boolean(notifications.dmOnBan));

    setChecked("modDMTempban", Boolean(notifications.dmOnTempban));

    setChecked("modCasesEnabled", cases.enabled !== false);

    setChecked("modCasesAuto", cases.autoCreateManualCases !== false);

    const roles = state.options?.roles || [];

    const channels = state.options?.channels || [];

    renderMulti("modModeratorRoles", roles, staff.moderatorRoleIDs || []);

    renderMulti("modSeniorRoles", roles, staff.seniorModeratorRoleIDs || []);

    renderMulti("modAdminRoles", roles, staff.adminRoleIDs || []);

    renderMulti("modTrustedRoles", roles, staff.trustedRoleIDs || []);

    renderMulti("modIgnoredRoles", roles, staff.ignoredRoleIDs || []);

    renderMulti("modProtectedRoles", roles, staff.protectedRoleIDs || []);

    renderMulti(
      "modIgnoredChannels",
      channels,
      staff.ignoredChannelIDs || [],
      true,
    );

    renderChannelSelect(
      "modLogModeration",
      channels,
      logs.moderationLogChannelID,
    );

    renderChannelSelect("modLogAudit", channels, logs.auditLogChannelID);

    renderChannelSelect("modLogCases", channels, logs.caseLogChannelID);

    renderChannelSelect("modLogReports", channels, logs.reportLogChannelID);

    renderChannelSelect("modLogAppeals", channels, logs.appealLogChannelID);

    renderChannelSelect("modLogRaid", channels, logs.raidLogChannelID);
  }

  function setChecked(id, value) {
    const input = document.getElementById(id);

    if (input) {
      input.checked = Boolean(value);
    }
  }

  function setValue(id, value) {
    const input = document.getElementById(id);

    if (input) {
      input.value = value ?? "";
    }
  }

  function renderMulti(id, items, selected, channelMode = false) {
    const holder = document.getElementById(id);

    if (!holder) {
      return;
    }

    const selectedSet = new Set(Array.isArray(selected) ? selected : []);

    if (!items.length) {
      holder.innerHTML = `<div class="mod-empty">No options available.</div>`;

      return;
    }

    holder.innerHTML = items
      .map(
        (item) => `
            <label>
              <input
                type="checkbox"
                value="${escapeHTML(item.id)}"
                ${selectedSet.has(item.id) ? "checked" : ""}
              />

              <span>
                ${channelMode ? "#" : "@"}${escapeHTML(item.name)}
              </span>
            </label>
          `,
      )
      .join("");
  }

  function collectMulti(id) {
    return $$(`#${id} input[type="checkbox"]:checked`).map(
      (input) => input.value,
    );
  }

  function renderChannelSelect(id, channels, selected) {
    const select = document.getElementById(id);

    if (!select) {
      return;
    }

    select.innerHTML =
      `
        <option value="">NOT SET</option>
      ` +
      channels
        .filter((channel) => [0, 5].includes(Number(channel.type)))
        .map(
          (channel) => `
            <option
              value="${escapeHTML(channel.id)}"
              ${channel.id === selected ? "selected" : ""}
            >
              #${escapeHTML(channel.name)}
            </option>
          `,
        )
        .join("");
  }

  async function saveSettings() {
    if (!state.settings) {
      return;
    }

    const settings = clone(state.settings);

    settings.staff = settings.staff || {};

    settings.safety = settings.safety || {};

    settings.warnings = settings.warnings || {};

    settings.cases = settings.cases || {};

    settings.notifications = settings.notifications || {};

    settings.logs = settings.logs || {};

    settings.enabled = Boolean($("#modSettingEnabled")?.checked);

    settings.safety.requireReasons = Boolean($("#modSettingReasons")?.checked);

    settings.safety.confirmSeriousActions = Boolean(
      $("#modSettingConfirm")?.checked,
    );

    settings.safety.preventOwnerTarget = Boolean(
      $("#modSettingOwnerProtection")?.checked,
    );

    settings.warnings.defaultPoints = Math.max(
      0,
      Math.min(100, Number($("#modWarningPoints")?.value || 1)),
    );

    settings.warnings.defaultSeverity =
      $("#modWarningSeverity")?.value || "minor";

    settings.notifications.dmOnWarn = Boolean($("#modDMWarn")?.checked);

    settings.notifications.dmOnWarningRemoved = Boolean(
      $("#modDMWarningRemoved")?.checked,
    );

    settings.notifications.dmOnTimeout = Boolean($("#modDMTimeout")?.checked);

    settings.notifications.dmOnKick = Boolean($("#modDMKick")?.checked);

    settings.notifications.dmOnBan = Boolean($("#modDMBan")?.checked);

    settings.notifications.dmOnTempban = Boolean($("#modDMTempban")?.checked);

    settings.cases.enabled = Boolean($("#modCasesEnabled")?.checked);

    settings.cases.autoCreateManualCases = Boolean($("#modCasesAuto")?.checked);

    settings.staff.moderatorRoleIDs = collectMulti("modModeratorRoles");

    settings.staff.seniorModeratorRoleIDs = collectMulti("modSeniorRoles");

    settings.staff.adminRoleIDs = collectMulti("modAdminRoles");

    settings.staff.trustedRoleIDs = collectMulti("modTrustedRoles");

    settings.staff.ignoredRoleIDs = collectMulti("modIgnoredRoles");

    settings.staff.protectedRoleIDs = collectMulti("modProtectedRoles");

    settings.staff.ignoredChannelIDs = collectMulti("modIgnoredChannels");

    settings.logs.moderationLogChannelID =
      $("#modLogModeration")?.value || null;

    settings.logs.auditLogChannelID = $("#modLogAudit")?.value || null;

    settings.logs.caseLogChannelID = $("#modLogCases")?.value || null;

    settings.logs.reportLogChannelID = $("#modLogReports")?.value || null;

    settings.logs.appealLogChannelID = $("#modLogAppeals")?.value || null;

    settings.logs.raidLogChannelID = $("#modLogRaid")?.value || null;

    const saveButton = $("#modSaveSettings");

    if (saveButton) {
      saveButton.disabled = true;

      saveButton.textContent = "SAVING...";
    }

    try {
      const result = await api(
        `/api/guild/${state.guildID}/moderation/settings`,
        {
          method: "PUT",

          body: JSON.stringify(settings),
        },
      );

      state.settings = result.settings;

      renderSettings();
      renderOverview();

      toast("Moderation settings saved.");
    } catch (error) {
      toast(error.message, "error");
    } finally {
      if (saveButton) {
        saveButton.disabled = false;

        saveButton.textContent = "SAVE MODERATION";
      }
    }
  }

  /* =========================================================
     MODALS
  ========================================================= */

  function openModal({
    eyebrow = "ARCLUME / MODERATION",

    title,

    info = "",

    fields = "",

    confirmText = "CONFIRM",

    danger = false,

    onConfirm,
  }) {
    closeModal();

    const backdrop = document.createElement("div");

    backdrop.className = "mod-modal-backdrop";

    backdrop.id = "arclumeModModal";

    backdrop.innerHTML = `
      <div class="mod-modal">
        <div class="mod-modal-head">
          <div>
            <small>${escapeHTML(eyebrow)}</small>

            <h3>${escapeHTML(title)}</h3>
          </div>

          <button class="mod-modal-close" id="modModalClose" type="button">
            ×
          </button>
        </div>

        <div class="mod-modal-body">
          ${
            info
              ? `
                <div class="mod-modal-info">
                  ${info}
                </div>
              `
              : ""
          }

          ${fields}
        </div>

        <div class="mod-modal-actions">
          <button class="mod-btn" id="modModalCancel" type="button">
            CANCEL
          </button>

          <button
            class="mod-btn ${danger ? "danger" : "primary"}"
            id="modModalConfirm"
            type="button"
          >
            ${escapeHTML(confirmText)}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const close = () => closeModal();

    $("#modModalClose", backdrop)?.addEventListener("click", close);

    $("#modModalCancel", backdrop)?.addEventListener("click", close);

    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) {
        close();
      }
    });

    $("#modModalConfirm", backdrop)?.addEventListener("click", async () => {
      const button = $("#modModalConfirm", backdrop);

      button.disabled = true;

      const original = button.textContent;

      button.textContent = "PROCESSING...";

      try {
        await onConfirm(backdrop);
      } catch (error) {
        toast(error.message, "error");

        button.disabled = false;

        button.textContent = original;
      }
    });
  }

  function closeModal() {
    $("#arclumeModModal")?.remove();
  }

  /* =========================================================
     WARNING SAFETY
  ========================================================= */

  function openRemoveWarningModal(warning) {
    openModal({
      eyebrow: "WARNING / SAFE REMOVE",

      title: `Remove Warning #${warning.warningNumber}`,

      info: `
          <b>Member:</b>
          ${escapeHTML(warning.userID)}
          <br />

          <b>Original reason:</b>
          ${escapeHTML(warning.reason)}
          <br />

          <b>Issued by:</b>
          ${escapeHTML(warning.moderatorID)}
          <br />

          <b>Date:</b>
          ${escapeHTML(formatDate(warning.createdAt))}
          <br /><br />

          The warning will become <b>REMOVED</b>.
          Its moderation history will remain.
        `,

      fields: `
        <div class="mod-field">
          <label>REMOVAL REASON — REQUIRED</label>

          <textarea
            id="modModalReason"
            placeholder="Why is this warning being removed?"
          ></textarea>
        </div>
      `,

      confirmText: "REMOVE WARNING",

      danger: true,

      onConfirm: async (modal) => {
        const reason = $("#modModalReason", modal)?.value.trim();

        if (!reason) {
          throw new Error("A removal reason is required.");
        }

        await api(
          `/api/guild/${state.guildID}/moderation/warning/${encodeURIComponent(
            warning.warningID,
          )}/remove`,
          {
            method: "POST",

            body: JSON.stringify({
              reason,
            }),
          },
        );

        closeModal();

        toast(
          `Warning #${warning.warningNumber} removed. Audit history preserved.`,
        );

        await loadMemberProfile(warning.userID);

        await refreshLists();
      },
    });
  }

  function openPermanentWarningDeleteModal(warning) {
    openModal({
      eyebrow: "WARNING / DANGER ZONE",

      title: `Permanent Delete #${warning.warningNumber}`,

      info: `
          <b>This is the destructive warning action.</b>
          <br /><br />

          Warning:
          #${escapeHTML(warning.warningNumber)}
          <br />

          Member:
          ${escapeHTML(warning.userID)}
          <br />

          Original reason:
          ${escapeHTML(warning.reason)}
          <br /><br />

          The live warning record will be deleted.
          Arclume still keeps the separate deletion audit snapshot.
        `,

      fields: `
        <div class="mod-field">
          <label>DELETION REASON — REQUIRED</label>

          <textarea
            id="modDeleteWarningReason"
            placeholder="Why must this record be permanently deleted?"
          ></textarea>
        </div>

        <div class="mod-field">
          <label>TYPE DELETE TO CONFIRM</label>

          <input
            id="modDeleteWarningPhrase"
            type="text"
            autocomplete="off"
            placeholder="DELETE"
          />
        </div>
      `,

      confirmText: "PERMANENT DELETE",

      danger: true,

      onConfirm: async (modal) => {
        const reason = $("#modDeleteWarningReason", modal)?.value.trim();

        const confirmation = $("#modDeleteWarningPhrase", modal)?.value.trim();

        if (!reason) {
          throw new Error("A deletion reason is required.");
        }

        if (confirmation !== "DELETE") {
          throw new Error("Type DELETE exactly to continue.");
        }

        await api(
          `/api/guild/${state.guildID}/moderation/warning/${encodeURIComponent(
            warning.warningID,
          )}`,
          {
            method: "DELETE",

            body: JSON.stringify({
              reason,
              confirmation,
            }),
          },
        );

        closeModal();

        toast(`Warning #${warning.warningNumber} permanently deleted.`);

        await loadMemberProfile(warning.userID);

        await refreshLists();
      },
    });
  }

  /* =========================================================
     NOTES
  ========================================================= */

  function openAddNoteModal() {
    const member = state.selectedMember;

    const profile = state.selectedProfile;

    if (!profile) {
      return;
    }

    openModal({
      eyebrow: "MEMBER / STAFF NOTE",

      title: `Add Note — ${member?.displayName || member?.username || profile.userID}`,

      fields: `
        <div class="mod-field">
          <label>PRIVATE STAFF NOTE</label>

          <textarea
            id="modNewNoteText"
            placeholder="Add internal context for other moderators..."
          ></textarea>
        </div>

        <div class="mod-field">
          <label style="display:flex;align-items:center;gap:8px">
            <input id="modNewNotePinned" type="checkbox" />
            PIN THIS NOTE
          </label>
        </div>
      `,

      confirmText: "ADD NOTE",

      onConfirm: async (modal) => {
        const note = $("#modNewNoteText", modal)?.value.trim();

        if (!note) {
          throw new Error("Staff note cannot be empty.");
        }

        await api(
          `/api/guild/${state.guildID}/moderation/member/${profile.userID}/notes`,
          {
            method: "POST",

            body: JSON.stringify({
              note,

              pinned: Boolean($("#modNewNotePinned", modal)?.checked),
            }),
          },
        );

        closeModal();

        toast("Staff note added.");

        await loadMemberProfile(profile.userID);
      },
    });
  }

  function openRemoveNoteModal(note) {
    openModal({
      eyebrow: "MEMBER / STAFF NOTE",

      title: "Remove Staff Note",

      info: escapeHTML(note.note),

      fields: `
        <div class="mod-field">
          <label>REMOVAL REASON</label>

          <textarea
            id="modRemoveNoteReason"
            placeholder="Why is this staff note being removed?"
          ></textarea>
        </div>
      `,

      confirmText: "REMOVE NOTE",

      danger: true,

      onConfirm: async (modal) => {
        const reason = $("#modRemoveNoteReason", modal)?.value.trim();

        if (!reason) {
          throw new Error("A removal reason is required.");
        }

        await api(
          `/api/guild/${state.guildID}/moderation/note/${encodeURIComponent(
            note.noteID,
          )}/remove`,
          {
            method: "POST",

            body: JSON.stringify({
              reason,
            }),
          },
        );

        closeModal();

        toast("Staff note removed.");

        await loadMemberProfile(state.selectedProfile.userID);
      },
    });
  }

  /* =========================================================
     WATCHLIST MODALS
  ========================================================= */

  function openWatchlistModal() {
    const userID = state.selectedProfile?.userID;

    if (!userID) {
      return;
    }

    openModal({
      eyebrow: "MEMBER / WATCHLIST",

      title: "Add to Watchlist",

      fields: `
        <div class="mod-field">
          <label>WATCHLIST REASON</label>

          <textarea
            id="modWatchReason"
            placeholder="Why should staff watch this member?"
          ></textarea>
        </div>

        <div class="mod-field">
          <label>OPTIONAL EXPIRY</label>

          <input id="modWatchExpiry" type="datetime-local" />
        </div>
      `,

      confirmText: "ADD TO WATCHLIST",

      onConfirm: async (modal) => {
        const reason = $("#modWatchReason", modal)?.value.trim();

        if (!reason) {
          throw new Error("A watchlist reason is required.");
        }

        const rawExpiry = $("#modWatchExpiry", modal)?.value;

        await api(
          `/api/guild/${state.guildID}/moderation/watchlist/${userID}`,
          {
            method: "POST",

            body: JSON.stringify({
              reason,

              expiresAt: rawExpiry ? new Date(rawExpiry).toISOString() : null,
            }),
          },
        );

        closeModal();

        toast("Member added to watchlist.");

        await refreshLists();

        await loadMemberProfile(userID);
      },
    });
  }

  function openRemoveWatchlistModal(userID) {
    openModal({
      eyebrow: "WATCHLIST / REMOVE",

      title: "Remove Member from Watchlist",

      fields: `
        <div class="mod-field">
          <label>REMOVAL REASON</label>

          <textarea
            id="modWatchRemoveReason"
            placeholder="Why is this member being removed from the watchlist?"
          ></textarea>
        </div>
      `,

      confirmText: "REMOVE",

      danger: true,

      onConfirm: async (modal) => {
        const reason = $("#modWatchRemoveReason", modal)?.value.trim();

        if (!reason) {
          throw new Error("A removal reason is required.");
        }

        await api(
          `/api/guild/${state.guildID}/moderation/watchlist/${encodeURIComponent(
            userID,
          )}/remove`,
          {
            method: "POST",

            body: JSON.stringify({
              reason,
            }),
          },
        );

        closeModal();

        toast("Member removed from watchlist.");

        await refreshLists();

        if (state.selectedProfile?.userID === userID) {
          await loadMemberProfile(userID);
        }
      },
    });
  }

  /* =========================================================
     CASE MODAL
  ========================================================= */

  function openResolveCaseModal(caseID) {
    const item = state.cases.find((entry) => entry.caseID === caseID);

    if (!item) {
      return;
    }

    openModal({
      eyebrow: "CASE / RESOLUTION",

      title: `Resolve Case #${item.caseNumber}`,

      info: `
          <b>Action:</b>
          ${escapeHTML(item.action)}
          <br />

          <b>Target:</b>
          ${escapeHTML(item.targetUserID || "N/A")}
          <br />

          <b>Original reason:</b>
          ${escapeHTML(item.reason || "No reason")}
        `,

      fields: `
        <div class="mod-field">
          <label>FINAL STATUS</label>

          <select id="modCaseResolutionStatus">
            <option value="resolved">RESOLVED</option>
            <option value="closed">CLOSED</option>
            <option value="void">VOID</option>
          </select>
        </div>

        <div class="mod-field">
          <label>RESOLUTION REASON</label>

          <textarea
            id="modCaseResolutionReason"
            placeholder="Explain how this case was resolved..."
          ></textarea>
        </div>
      `,

      confirmText: "RESOLVE CASE",

      onConfirm: async (modal) => {
        const reason = $("#modCaseResolutionReason", modal)?.value.trim();

        if (!reason) {
          throw new Error("A resolution reason is required.");
        }

        await api(
          `/api/guild/${state.guildID}/moderation/case/${caseID}/resolve`,
          {
            method: "POST",

            body: JSON.stringify({
              reason,

              status: $("#modCaseResolutionStatus", modal)?.value || "resolved",
            }),
          },
        );

        closeModal();

        toast(`Case #${item.caseNumber} updated.`);

        await refreshLists();
      },
    });
  }

  /* =========================================================
     REPORT MODAL
  ========================================================= */

  function openResolveReportModal(reportID) {
    const report = state.reports.find((item) => item.reportID === reportID);

    if (!report) {
      return;
    }

    openModal({
      eyebrow: "REPORT / RESOLUTION",

      title: "Resolve Report",

      info: `
          <b>Reporter:</b>
          ${escapeHTML(report.reporterUserID)}
          <br />

          <b>Target:</b>
          ${escapeHTML(report.targetUserID || "N/A")}
          <br />

          <b>Report:</b>
          ${escapeHTML(report.reason)}
        `,

      fields: `
        <div class="mod-field">
          <label>FINAL STATUS</label>

          <select id="modReportStatus">
            <option value="resolved">RESOLVED</option>
            <option value="denied">DENIED</option>
            <option value="closed">CLOSED</option>
            <option value="escalated">ESCALATED</option>
          </select>
        </div>

        <div class="mod-field">
          <label>RESOLUTION</label>

          <textarea
            id="modReportResolution"
            placeholder="What did staff decide?"
          ></textarea>
        </div>
      `,

      confirmText: "UPDATE REPORT",

      onConfirm: async (modal) => {
        const resolution = $("#modReportResolution", modal)?.value.trim();

        if (!resolution) {
          throw new Error("A resolution is required.");
        }

        await api(
          `/api/guild/${state.guildID}/moderation/report/${reportID}/resolve`,
          {
            method: "POST",

            body: JSON.stringify({
              resolution,

              status: $("#modReportStatus", modal)?.value || "resolved",
            }),
          },
        );

        closeModal();

        toast("Report updated.");

        await refreshLists();
      },
    });
  }

  /* =========================================================
     APPEAL MODAL
  ========================================================= */

  function openAppealModal(appealID) {
    const appeal = state.appeals.find((item) => item.appealID === appealID);

    if (!appeal) {
      return;
    }

    openModal({
      eyebrow: "APPEAL / STAFF REVIEW",

      title: "Review Appeal",

      info: `
          <b>User:</b>
          ${escapeHTML(appeal.userID)}
          <br />

          <b>Punishment:</b>
          ${escapeHTML(appeal.punishmentType || "Moderation action")}
          <br />

          <b>Appeal:</b>
          ${escapeHTML(appeal.reason)}
        `,

      fields: `
        <div class="mod-field">
          <label>APPEAL STATUS</label>

          <select id="modAppealStatus">
            <option value="under-review">UNDER REVIEW</option>
            <option value="more-info-needed">MORE INFO NEEDED</option>
            <option value="accepted">ACCEPTED</option>
            <option value="denied">DENIED</option>
            <option value="closed">CLOSED</option>
          </select>
        </div>

        <div class="mod-field">
          <label>STAFF RESPONSE</label>

          <textarea
            id="modAppealResponse"
            placeholder="Response or review notes..."
          ></textarea>
        </div>
      `,

      confirmText: "SAVE REVIEW",

      onConfirm: async (modal) => {
        await api(`/api/guild/${state.guildID}/moderation/appeal/${appealID}`, {
          method: "PUT",

          body: JSON.stringify({
            status: $("#modAppealStatus", modal)?.value || "under-review",

            staffResponse: $("#modAppealResponse", modal)?.value.trim() || null,
          }),
        });

        closeModal();

        toast("Appeal updated.");

        await refreshLists();
      },
    });
  }

  /* =========================================================
     RESET SETTINGS
  ========================================================= */

  function openResetSettingsModal() {
    openModal({
      eyebrow: "MODERATION / RESET",

      title: "Reset Moderation Settings",

      info: `
          This resets the moderation configuration for this server
          back to Arclume's defaults.
          <br /><br />
          Existing warning and case records are not removed by this settings reset.
        `,

      fields: `
        <div class="mod-field">
          <label>TYPE RESET TO CONFIRM</label>
          <input id="modResetPhrase" type="text" placeholder="RESET" />
        </div>
      `,

      confirmText: "RESET SETTINGS",

      danger: true,

      onConfirm: async (modal) => {
        const phrase = $("#modResetPhrase", modal)?.value.trim();

        if (phrase !== "RESET") {
          throw new Error("Type RESET exactly to continue.");
        }

        const result = await api(
          `/api/guild/${state.guildID}/moderation/settings/reset`,
          {
            method: "POST",
          },
        );

        state.settings = result.settings;

        closeModal();

        renderSettings();
        renderOverview();

        toast("Moderation settings reset.");
      },
    });
  }

  /* =========================================================
     EVENTS
  ========================================================= */

  function bindEvents() {
    $("#moderationTabs")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-mod-tab]");

      if (!button) {
        return;
      }

      setTab(button.dataset.modTab);
    });

    $("#modMemberSearch")?.addEventListener("input", (event) => {
      clearTimeout(memberSearchTimer);

      const value = event.target.value;

      memberSearchTimer = setTimeout(() => {
        searchMembers(value);
      }, 350);
    });

    $("#modCaseFilter")?.addEventListener("change", renderCases);

    $("#modOverviewRefresh")?.addEventListener("click", refreshLists);

    $("#modReloadCases")?.addEventListener("click", refreshLists);

    $("#modReloadReports")?.addEventListener("click", refreshLists);

    $("#modReloadAppeals")?.addEventListener("click", refreshLists);

    $("#modReloadWatchlist")?.addEventListener("click", refreshLists);

    $("#modReloadAudit")?.addEventListener("click", refreshLists);

    $("#modSaveSettings")?.addEventListener("click", saveSettings);

    $("#modResetSettings")?.addEventListener("click", openResetSettingsModal);
  }

  /* =========================================================
     SERVER CHANGE WATCH
  ========================================================= */

  let lastGuildID = "";

  function startGuildWatcher() {
    lastGuildID = getSelectedGuildID();

    setInterval(() => {
      const current = getSelectedGuildID();

      if (current && current !== lastGuildID) {
        lastGuildID = current;

        state.guildID = "";

        state.settings = null;

        loadModeration(true);
      }
    }, 1200);
  }

  /* =========================================================
     BOOT
  ========================================================= */

  function boot() {
    injectStyles();
    injectPage();
    injectNavigation();
    bindEvents();
    startGuildWatcher();

    setTimeout(() => {
      loadModeration();
    }, 500);

    console.log("⚒️ Arclume Moderation Center loaded");

    console.log("👤 Member moderation profile UI loaded");

    console.log("⚠️ Warning safety controls loaded");

    console.log("📁 Cases + reports + appeals UI loaded");

    console.log("👁️ Watchlist + audit UI loaded");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, {
      once: true,
    });
  } else {
    boot();
  }
})();
