"use strict";

/* =========================================================
   ARCLUME — ANTI-RAID DASHBOARD MODULE

   Frontend control center for:
   • Anti-Raid master state
   • Alert / Quarantine / Lockdown modes
   • Join raid detection
   • New-account detection
   • Message flood detection
   • Mention raid detection
   • Duplicate spam detection
   • Quarantine configuration
   • Emergency Mode
   • Alert channel
   • Containment timing
   • Trusted roles
   • Protected users
   • Test alert

   Backend API connected in next step:
   GET  /api/guild/:guildId/anti-raid
   PUT  /api/guild/:guildId/anti-raid
   POST /api/guild/:guildId/anti-raid/test
   POST /api/guild/:guildId/anti-raid/emergency
========================================================= */

(() => {
  "use strict";

  const MODULE_NAME = "Anti-Raid";

  const PAGE_ID = "page-anti-raid";

  const NAV_ID = "antiRaidNavButton";

  const STYLE_ID = "arclumeAntiRaidStyles";

  const DEFAULT_SETTINGS = {
    enabled: true,

    joinThreshold: 8,

    joinWindowSeconds: 15,

    accountAgeHours: 24,

    newAccountWeight: 2,

    suspiciousJoinThreshold: 3,

    messageThreshold: 8,

    messageWindowSeconds: 8,

    duplicateThreshold: 4,

    mentionThreshold: 6,

    mentionWindowSeconds: 10,

    mode: "alert",

    containmentMinutes: 10,

    quarantineMinutes: 15,

    autoContainMessageRaids: true,

    autoQuarantineSuspiciousJoins: true,

    quarantineRoleID: "",

    emergencyMode: false,

    emergencyDurationMinutes: 10,

    emergencyAffectsRecentJoinMinutes: 30,

    blockLinksDuringEmergency: true,

    blockMediaDuringEmergency: true,

    blockMentionsDuringEmergency: true,

    alertChannelID: "",

    alertCooldownSeconds: 60,

    eventCooldownSeconds: 15,

    ignoreBots: true,

    trustedRoleIDs: [],

    protectedUserIDs: [],
  };

  let currentSettings = {
    ...DEFAULT_SETTINGS,
  };

  let guildOptions = {
    roles: [],

    channels: [],
  };

  let loading = false;

  let saving = false;

  /* =====================================================
     UTILITIES
  ===================================================== */

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getGuildID() {
    if (window.currentGuild?.id) {
      return String(window.currentGuild.id);
    }

    const identity =
      document.getElementById("identityServerId")?.textContent || "";

    const match = identity.match(/\d{5,32}/);

    return match?.[0] || "";
  }

  function showToast(message) {
    if (typeof window.toast === "function") {
      window.toast(message);

      return;
    }

    const toast = document.getElementById("toast");

    if (!toast) {
      console.log(message);

      return;
    }

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2800);
  }

  function numberValue(id, fallback, min, max) {
    const element = document.getElementById(id);

    const number = Number(element?.value);

    if (!Number.isFinite(number)) {
      return fallback;
    }

    return Math.min(
      max,

      Math.max(min, Math.round(number)),
    );
  }

  function checked(id) {
    return Boolean(document.getElementById(id)?.checked);
  }

  function value(id) {
    return String(document.getElementById(id)?.value || "").trim();
  }

  function setText(id, text) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = text;
    }
  }

  /* =====================================================
     CSS
  ===================================================== */

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");

    style.id = STYLE_ID;

    style.textContent = `
      #${PAGE_ID} {
        --ar-red: #ff6577;
        --ar-orange: #ff9e64;
        --ar-green: #9effc7;
        --ar-purple: #a78bfa;
        --ar-blue: #7aa2ff;
        --ar-border: rgba(255, 255, 255, 0.11);
        --ar-panel: rgba(255, 255, 255, 0.025);
        --ar-muted: rgba(245, 242, 255, 0.52);

        padding-bottom: 140px;
      }

      .ar-hero {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 24px;

        margin-bottom: 24px;
      }

      .ar-hero-copy h1 {
        margin: 10px 0 12px;

        font-family: "Syne", sans-serif;
        font-size: clamp(42px, 7vw, 82px);
        line-height: 0.92;
        letter-spacing: -0.055em;
      }

      .ar-hero-copy h1 span {
        color: var(--ar-red);
      }

      .ar-hero-copy p {
        max-width: 680px;

        margin: 0;

        color: var(--ar-muted);

        line-height: 1.7;
      }

      .ar-live-state {
        min-width: 180px;

        padding: 15px 18px;

        border: 1px solid var(--ar-border);
        border-radius: 18px;

        background: rgba(255, 255, 255, 0.025);
      }

      .ar-live-state small {
        display: block;

        margin-bottom: 7px;

        color: var(--ar-muted);

        font-size: 9px;
        letter-spacing: 0.12em;
      }

      .ar-live-state strong {
        display: flex;
        align-items: center;
        gap: 9px;

        font-family: "Syne", sans-serif;
      }

      .ar-state-dot {
        width: 9px;
        height: 9px;

        flex: 0 0 9px;

        border-radius: 50%;

        background: #ffd37a;

        box-shadow: 0 0 16px rgba(255, 211, 122, 0.7);
      }

      .ar-live-state.online .ar-state-dot {
        background: var(--ar-green);

        box-shadow: 0 0 16px rgba(158, 255, 199, 0.72);
      }

      .ar-live-state.danger .ar-state-dot {
        background: var(--ar-red);

        box-shadow: 0 0 18px rgba(255, 101, 119, 0.75);
      }

      .ar-live-state.error .ar-state-dot {
        background: var(--ar-red);
      }

      .ar-emergency-banner {
        display: none;

        margin-bottom: 20px;

        padding: 18px 20px;

        border: 1px solid rgba(255, 101, 119, 0.32);
        border-radius: 20px;

        background:
          radial-gradient(
            circle at 5% 50%,
            rgba(255, 101, 119, 0.14),
            transparent 34%
          ),
          rgba(255, 101, 119, 0.035);
      }

      .ar-emergency-banner.active {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
      }

      .ar-emergency-banner strong {
        display: block;

        margin-bottom: 5px;

        color: #ff8796;

        font-family: "Syne", sans-serif;
      }

      .ar-emergency-banner p {
        margin: 0;

        color: rgba(245, 242, 255, 0.55);

        font-size: 12px;
      }

      .ar-emergency-pulse {
        width: 12px;
        height: 12px;

        flex: 0 0 12px;

        border-radius: 50%;

        background: var(--ar-red);

        box-shadow: 0 0 24px rgba(255, 101, 119, 0.9);

        animation: arPulse 1.5s infinite;
      }

      @keyframes arPulse {
        0%,
        100% {
          opacity: 1;
          transform: scale(1);
        }

        50% {
          opacity: 0.45;
          transform: scale(0.8);
        }
      }

      .ar-command-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;

        margin-bottom: 20px;

        padding: 14px;

        border: 1px solid var(--ar-border);
        border-radius: 22px;

        background: rgba(255, 255, 255, 0.02);
      }

      .ar-command-status {
        display: flex;
        align-items: center;
        gap: 13px;

        min-width: 0;
      }

      .ar-command-status > span {
        width: 40px;
        height: 40px;

        display: grid;
        place-items: center;

        flex: 0 0 40px;

        border: 1px solid rgba(255, 101, 119, 0.2);
        border-radius: 13px;

        background: rgba(255, 101, 119, 0.06);

        font-size: 18px;
      }

      .ar-command-status small,
      .ar-section-heading small,
      .ar-field small,
      .ar-metric small {
        display: block;

        color: rgba(245, 242, 255, 0.43);

        font-size: 9px;
        letter-spacing: 0.11em;
      }

      .ar-command-status b {
        display: block;

        margin-top: 4px;

        font-family: "Syne", sans-serif;
      }

      .ar-command-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 8px;
      }

      .ar-button {
        min-height: 40px;

        padding: 0 15px;

        border: 1px solid var(--ar-border);
        border-radius: 12px;

        background: rgba(255, 255, 255, 0.035);

        color: #ffffff;

        font: inherit;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.07em;

        cursor: pointer;

        transition:
          border-color 0.18s ease,
          background 0.18s ease,
          transform 0.18s ease;
      }

      .ar-button:hover {
        border-color: rgba(255, 255, 255, 0.23);

        background: rgba(255, 255, 255, 0.065);

        transform: translateY(-1px);
      }

      .ar-button.primary {
        border-color: rgba(167, 139, 250, 0.34);

        background: rgba(124, 92, 255, 0.12);
      }

      .ar-button.danger {
        border-color: rgba(255, 101, 119, 0.35);

        background: rgba(255, 101, 119, 0.08);

        color: #ff96a2;
      }

      .ar-button.success {
        border-color: rgba(158, 255, 199, 0.3);

        background: rgba(158, 255, 199, 0.07);

        color: #b9ffd5;
      }

      .ar-button:disabled {
        opacity: 0.48;

        cursor: wait;

        transform: none;
      }

      .ar-metrics {
        display: grid;

        grid-template-columns: repeat(4, minmax(0, 1fr));

        gap: 12px;

        margin-bottom: 20px;
      }

      .ar-metric {
        min-height: 110px;

        padding: 18px;

        border: 1px solid var(--ar-border);
        border-radius: 20px;

        background: var(--ar-panel);
      }

      .ar-metric strong {
        display: block;

        margin-top: 15px;

        font-family: "Syne", sans-serif;
        font-size: 25px;
      }

      .ar-metric p {
        margin: 5px 0 0;

        color: var(--ar-muted);

        font-size: 10px;
        line-height: 1.5;
      }

      .ar-layout {
        display: grid;

        grid-template-columns:
          minmax(0, 1.35fr)
          minmax(300px, 0.65fr);

        gap: 18px;
      }

      .ar-stack {
        display: grid;

        gap: 18px;
      }

      .ar-section {
        overflow: hidden;

        border: 1px solid var(--ar-border);
        border-radius: 24px;

        background: rgba(255, 255, 255, 0.018);
      }

      .ar-section-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;

        padding: 20px 21px;

        border-bottom: 1px solid rgba(255, 255, 255, 0.07);
      }

      .ar-section-heading h3 {
        margin: 5px 0 0;

        font-family: "Syne", sans-serif;
        font-size: 19px;
      }

      .ar-section-heading p {
        max-width: 460px;

        margin: 6px 0 0;

        color: var(--ar-muted);

        font-size: 11px;
        line-height: 1.55;
      }

      .ar-section-body {
        padding: 20px;
      }

      .ar-grid {
        display: grid;

        grid-template-columns: repeat(2, minmax(0, 1fr));

        gap: 14px;
      }

      .ar-grid.three {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .ar-field {
        display: block;
      }

      .ar-field.full {
        grid-column: 1 / -1;
      }

      .ar-field small {
        margin-bottom: 8px;
      }

      .ar-field input,
      .ar-field select,
      .ar-field textarea {
        width: 100%;

        min-height: 44px;

        padding: 10px 12px;

        border: 1px solid rgba(255, 255, 255, 0.11);
        border-radius: 12px;

        outline: none;

        background: #0d0d13;

        color: #ffffff;

        font: inherit;
      }

      .ar-field textarea {
        min-height: 90px;

        resize: vertical;

        line-height: 1.5;
      }

      .ar-field input:focus,
      .ar-field select:focus,
      .ar-field textarea:focus {
        border-color: rgba(167, 139, 250, 0.55);
      }

      .ar-role-picker {
        display: grid;
        gap: 8px;

        max-height: 250px;
        overflow-y: auto;

        padding: 8px;

        border: 1px solid rgba(255, 255, 255, 0.11);
        border-radius: 14px;

        background: #0d0d13;
      }

      .ar-role-picker::-webkit-scrollbar {
        width: 8px;
      }

      .ar-role-picker::-webkit-scrollbar-thumb {
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.14);
      }

      .ar-role-option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;

        min-height: 46px;

        padding: 10px 12px;

        border: 1px solid rgba(255, 255, 255, 0.07);
        border-radius: 11px;

        background: rgba(255, 255, 255, 0.018);

        cursor: pointer;

        transition:
          border-color 0.18s ease,
          background 0.18s ease,
          transform 0.18s ease;
      }

      .ar-role-option:hover {
        border-color: rgba(167, 139, 250, 0.26);
        background: rgba(124, 92, 255, 0.055);
      }

      .ar-role-option.selected {
        border-color: rgba(158, 255, 199, 0.3);
        background: rgba(158, 255, 199, 0.065);
      }

      .ar-role-option-copy {
        min-width: 0;
      }

      .ar-role-option-copy b {
        display: block;

        overflow: hidden;

        color: #ffffff;

        font-size: 11px;
        font-weight: 600;

        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ar-role-option-copy small {
        display: block;

        margin-top: 3px;

        color: rgba(245, 242, 255, 0.35);

        font-size: 8px;
        letter-spacing: 0.08em;
      }

      .ar-role-check {
        width: 20px;
        height: 20px;

        flex: 0 0 20px;

        display: grid;
        place-items: center;

        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 6px;

        background: rgba(255, 255, 255, 0.035);

        color: transparent;

        font-size: 12px;
        font-weight: 800;

        transition: 0.18s ease;
      }

      .ar-role-option.selected .ar-role-check {
        border-color: rgba(158, 255, 199, 0.45);
        background: rgba(158, 255, 199, 0.13);
        color: var(--ar-green);
        box-shadow: 0 0 14px rgba(158, 255, 199, 0.12);
      }

      .ar-role-picker-empty {
        padding: 18px 12px;

        color: rgba(245, 242, 255, 0.42);

        font-size: 10px;
        text-align: center;
      }

      .ar-role-picker-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;

        margin-bottom: 8px;
      }

      .ar-role-picker-toolbar span {
        color: rgba(245, 242, 255, 0.42);

        font-size: 9px;
      }

      .ar-role-clear {
        padding: 6px 9px;

        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;

        background: rgba(255, 255, 255, 0.025);
        color: rgba(245, 242, 255, 0.6);

        font: inherit;
        font-size: 8px;
        letter-spacing: 0.07em;

        cursor: pointer;
      }

      .ar-role-clear:hover {
        border-color: rgba(255, 255, 255, 0.2);
        color: #ffffff;
      }

      .ar-note {
        margin-top: 8px;

        color: rgba(245, 242, 255, 0.37);

        font-size: 9px;
        line-height: 1.55;
      }

      .ar-switch-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;

        min-height: 64px;

        padding: 11px 0;

        border-bottom: 1px solid rgba(255, 255, 255, 0.055);
      }

      .ar-switch-row:last-child {
        border-bottom: 0;
      }

      .ar-switch-copy {
        min-width: 0;
      }

      .ar-switch-copy b {
        display: block;

        margin-bottom: 5px;

        font-size: 12px;
      }

      .ar-switch-copy p {
        margin: 0;

        color: var(--ar-muted);

        font-size: 10px;
        line-height: 1.5;
      }

      .ar-switch {
        position: relative;

        width: 46px;
        height: 26px;

        flex: 0 0 46px;
      }

      .ar-switch input {
        position: absolute;

        opacity: 0;

        pointer-events: none;
      }

      .ar-switch-slider {
        position: absolute;

        inset: 0;

        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 999px;

        background: rgba(255, 255, 255, 0.055);

        cursor: pointer;

        transition: 0.2s ease;
      }

      .ar-switch-slider::after {
        content: "";

        position: absolute;

        top: 4px;
        left: 4px;

        width: 16px;
        height: 16px;

        border-radius: 50%;

        background: rgba(255, 255, 255, 0.64);

        transition: 0.2s ease;
      }

      .ar-switch input:checked + .ar-switch-slider {
        border-color: rgba(158, 255, 199, 0.28);

        background: rgba(158, 255, 199, 0.09);
      }

      .ar-switch input:checked + .ar-switch-slider::after {
        left: 24px;

        background: var(--ar-green);

        box-shadow: 0 0 12px rgba(158, 255, 199, 0.48);
      }

      .ar-mode-grid {
        display: grid;

        grid-template-columns: repeat(3, minmax(0, 1fr));

        gap: 10px;
      }

      .ar-mode {
        position: relative;

        min-height: 120px;

        padding: 16px;

        border: 1px solid var(--ar-border);
        border-radius: 17px;

        background: rgba(255, 255, 255, 0.018);

        cursor: pointer;

        transition:
          border-color 0.18s ease,
          background 0.18s ease,
          transform 0.18s ease;
      }

      .ar-mode:hover {
        border-color: rgba(255, 255, 255, 0.2);

        transform: translateY(-1px);
      }

      .ar-mode.active {
        border-color: rgba(167, 139, 250, 0.45);

        background: rgba(124, 92, 255, 0.09);
      }

      .ar-mode input {
        position: absolute;

        opacity: 0;

        pointer-events: none;
      }

      .ar-mode strong {
        display: block;

        margin-bottom: 8px;

        font-family: "Syne", sans-serif;
      }

      .ar-mode p {
        margin: 0;

        color: var(--ar-muted);

        font-size: 10px;
        line-height: 1.55;
      }

      .ar-mode.alert strong {
        color: #ffd37a;
      }

      .ar-mode.quarantine strong {
        color: #c2a8ff;
      }

      .ar-mode.lockdown strong {
        color: #ff8796;
      }

      .ar-warning-box {
        padding: 15px;

        border: 1px solid rgba(255, 158, 100, 0.18);
        border-radius: 16px;

        background: rgba(255, 158, 100, 0.04);

        color: rgba(255, 225, 203, 0.7);

        font-size: 10px;
        line-height: 1.65;
      }

      .ar-save-bar {
        position: sticky;

        bottom: 18px;

        z-index: 20;

        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;

        margin-top: 22px;

        padding: 14px 16px;

        border: 1px solid rgba(167, 139, 250, 0.21);
        border-radius: 18px;

        background: rgba(10, 9, 15, 0.92);

        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.38);

        backdrop-filter: blur(18px);
      }

      .ar-save-copy small {
        display: block;

        color: rgba(245, 242, 255, 0.4);

        font-size: 9px;
        letter-spacing: 0.1em;
      }

      .ar-save-copy b {
        display: block;

        margin-top: 4px;

        font-size: 11px;
      }

      .ar-loading {
        opacity: 0.58;

        pointer-events: none;
      }

      @media (max-width: 1050px) {
        .ar-layout {
          grid-template-columns: 1fr;
        }

        .ar-metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 720px) {
        .ar-hero {
          align-items: stretch;
          flex-direction: column;
        }

        .ar-live-state {
          width: 100%;
        }

        .ar-command-bar,
        .ar-emergency-banner.active,
        .ar-save-bar {
          align-items: stretch;
          flex-direction: column;
        }

        .ar-command-actions {
          justify-content: flex-start;
        }

        .ar-command-actions .ar-button,
        .ar-save-bar .ar-button {
          width: 100%;
        }

        .ar-metrics,
        .ar-grid,
        .ar-grid.three,
        .ar-mode-grid {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* =====================================================
     PAGE MARKUP
  ===================================================== */

  function buildPage() {
    if (document.getElementById(PAGE_ID)) {
      return;
    }

    const main = document.querySelector(".control-main");

    if (!main) {
      return;
    }

    const section = document.createElement("section");

    section.className = "dash-page";

    section.id = PAGE_ID;

    section.innerHTML = `
      <div class="ar-hero">
        <div class="ar-hero-copy">
          <span class="mono eyebrow">
            10 / SERVER DEFENSE
          </span>

          <h1>
            Anti-Raid
            <br />

            <span>Defense.</span>
          </h1>

          <p>
            Detect coordinated join waves, suspicious new accounts,
            message floods, mention attacks and duplicate spam.
            Control containment and Emergency Mode from one surface.
          </p>
        </div>

        <div class="ar-live-state" id="arLiveState">
          <small class="mono">
            DEFENSE SIGNAL
          </small>

          <strong>
            <i class="ar-state-dot"></i>

            <span id="arLiveText">
              WAITING
            </span>
          </strong>
        </div>
      </div>

      <div class="ar-emergency-banner" id="arEmergencyBanner">
        <div style="display:flex;align-items:center;gap:14px;">
          <span class="ar-emergency-pulse"></span>

          <div>
            <strong>
              EMERGENCY MODE ACTIVE
            </strong>

            <p>
              New and suspicious members are under enhanced Anti-Raid restrictions.
            </p>
          </div>
        </div>

        <button
          class="ar-button danger"
          id="arEmergencyStopTop"
          type="button"
        >
          END EMERGENCY
        </button>
      </div>

      <div class="ar-command-bar">
        <div class="ar-command-status">
          <span>
            🛡️
          </span>

          <div>
            <small class="mono">
              ARCLUME / ANTI-RAID
            </small>

            <b id="arMasterLabel">
              LOADING CONFIGURATION
            </b>
          </div>
        </div>

        <div class="ar-command-actions">
          <button
            class="ar-button"
            id="arRefreshButton"
            type="button"
          >
            REFRESH
          </button>

          <button
            class="ar-button"
            id="arTestButton"
            type="button"
          >
            TEST ALERT
          </button>

          <button
            class="ar-button danger"
            id="arEmergencyButton"
            type="button"
          >
            EMERGENCY MODE
          </button>
        </div>
      </div>

      <div class="ar-metrics">
        <article class="ar-metric">
          <small class="mono">
            JOIN TRIGGER
          </small>

          <strong id="arMetricJoin">
            8 / 15s
          </strong>

          <p>
            Members required to trigger join-wave analysis.
          </p>
        </article>

        <article class="ar-metric">
          <small class="mono">
            NEW ACCOUNT
          </small>

          <strong id="arMetricAge">
            ≤ 24h
          </strong>

          <p>
            Account age classified as suspicious.
          </p>
        </article>

        <article class="ar-metric">
          <small class="mono">
            MESSAGE FLOOD
          </small>

          <strong id="arMetricMessages">
            8 / 8s
          </strong>

          <p>
            Per-member message burst detection.
          </p>
        </article>

        <article class="ar-metric">
          <small class="mono">
            RESPONSE MODE
          </small>

          <strong id="arMetricMode">
            ALERT
          </strong>

          <p>
            Current automatic raid response.
          </p>
        </article>
      </div>

      <div class="ar-layout">
        <div class="ar-stack">
          <section class="ar-section">
            <header class="ar-section-heading">
              <div>
                <small class="mono">
                  01 / CORE
                </small>

                <h3>
                  Anti-Raid State
                </h3>

                <p>
                  Master Anti-Raid control and automatic response level.
                </p>
              </div>

              <label class="ar-switch">
                <input
                  id="arEnabled"
                  type="checkbox"
                />

                <span class="ar-switch-slider"></span>
              </label>
            </header>

            <div class="ar-section-body">
              <div class="ar-mode-grid">
                <label class="ar-mode alert" data-ar-mode="alert">
                  <input
                    type="radio"
                    name="arMode"
                    value="alert"
                  />

                  <strong>
                    ALERT
                  </strong>

                  <p>
                    Detect and notify staff.
                    No automatic containment.
                  </p>
                </label>

                <label class="ar-mode quarantine" data-ar-mode="quarantine">
                  <input
                    type="radio"
                    name="arMode"
                    value="quarantine"
                  />

                  <strong>
                    QUARANTINE
                  </strong>

                  <p>
                    Detect raids and automatically contain suspicious members.
                  </p>
                </label>

                <label class="ar-mode lockdown" data-ar-mode="lockdown">
                  <input
                    type="radio"
                    name="arMode"
                    value="lockdown"
                  />

                  <strong>
                    LOCKDOWN
                  </strong>

                  <p>
                    Severe raid response with automatic Emergency Mode.
                  </p>
                </label>
              </div>
            </div>
          </section>

          <section class="ar-section">
            <header class="ar-section-heading">
              <div>
                <small class="mono">
                  02 / JOIN DEFENSE
                </small>

                <h3>
                  Join Raid Detection
                </h3>

                <p>
                  Detect unusual member bursts and give newly-created accounts
                  additional threat weight.
                </p>
              </div>
            </header>

            <div class="ar-section-body">
              <div class="ar-grid three">
                <label class="ar-field">
                  <small class="mono">
                    JOIN THRESHOLD
                  </small>

                  <input
                    id="arJoinThreshold"
                    type="number"
                    min="2"
                    max="100"
                  />
                </label>

                <label class="ar-field">
                  <small class="mono">
                    WINDOW / SECONDS
                  </small>

                  <input
                    id="arJoinWindow"
                    type="number"
                    min="5"
                    max="300"
                  />
                </label>

                <label class="ar-field">
                  <small class="mono">
                    SUSPICIOUS JOINS
                  </small>

                  <input
                    id="arSuspiciousJoinThreshold"
                    type="number"
                    min="1"
                    max="100"
                  />
                </label>

                <label class="ar-field">
                  <small class="mono">
                    NEW ACCOUNT / HOURS
                  </small>

                  <input
                    id="arAccountAge"
                    type="number"
                    min="0"
                    max="8760"
                  />
                </label>

                <label class="ar-field">
                  <small class="mono">
                    NEW ACCOUNT WEIGHT
                  </small>

                  <input
                    id="arAccountWeight"
                    type="number"
                    min="1"
                    max="10"
                  />
                </label>

                <label class="ar-field">
                  <small class="mono">
                    QUARANTINE / MINUTES
                  </small>

                  <input
                    id="arQuarantineMinutes"
                    type="number"
                    min="1"
                    max="10080"
                  />
                </label>
              </div>
            </div>
          </section>

          <section class="ar-section">
            <header class="ar-section-heading">
              <div>
                <small class="mono">
                  03 / MESSAGE DEFENSE
                </small>

                <h3>
                  Raid Message Intelligence
                </h3>

                <p>
                  Detect flooding, repeated spam and coordinated mention abuse.
                </p>
              </div>
            </header>

            <div class="ar-section-body">
              <div class="ar-grid three">
                <label class="ar-field">
                  <small class="mono">
                    MESSAGE THRESHOLD
                  </small>

                  <input
                    id="arMessageThreshold"
                    type="number"
                    min="3"
                    max="100"
                  />
                </label>

                <label class="ar-field">
                  <small class="mono">
                    MESSAGE WINDOW
                  </small>

                  <input
                    id="arMessageWindow"
                    type="number"
                    min="3"
                    max="120"
                  />
                </label>

                <label class="ar-field">
                  <small class="mono">
                    DUPLICATE LIMIT
                  </small>

                  <input
                    id="arDuplicateThreshold"
                    type="number"
                    min="2"
                    max="50"
                  />
                </label>

                <label class="ar-field">
                  <small class="mono">
                    MENTION THRESHOLD
                  </small>

                  <input
                    id="arMentionThreshold"
                    type="number"
                    min="2"
                    max="100"
                  />
                </label>

                <label class="ar-field">
                  <small class="mono">
                    MENTION WINDOW
                  </small>

                  <input
                    id="arMentionWindow"
                    type="number"
                    min="3"
                    max="120"
                  />
                </label>

                <label class="ar-field">
                  <small class="mono">
                    CONTAINMENT / MINUTES
                  </small>

                  <input
                    id="arContainmentMinutes"
                    type="number"
                    min="1"
                    max="10080"
                  />
                </label>
              </div>
            </div>
          </section>

          <section class="ar-section">
            <header class="ar-section-heading">
              <div>
                <small class="mono">
                  04 / RESPONSE
                </small>

                <h3>
                  Automatic Containment
                </h3>

                <p>
                  Choose which detected raid behaviors may trigger containment.
                </p>
              </div>
            </header>

            <div class="ar-section-body">
              <div class="ar-switch-row">
                <div class="ar-switch-copy">
                  <b>
                    Contain Message Raiders
                  </b>

                  <p>
                    Automatically contain members detected flooding,
                    mass mentioning or duplicate spamming when response mode permits.
                  </p>
                </div>

                <label class="ar-switch">
                  <input
                    id="arAutoContainMessages"
                    type="checkbox"
                  />

                  <span class="ar-switch-slider"></span>
                </label>
              </div>

              <div class="ar-switch-row">
                <div class="ar-switch-copy">
                  <b>
                    Quarantine Suspicious Joiners
                  </b>

                  <p>
                    During detected raid waves, automatically contain accounts
                    classified as suspicious.
                  </p>
                </div>

                <label class="ar-switch">
                  <input
                    id="arAutoQuarantineJoins"
                    type="checkbox"
                  />

                  <span class="ar-switch-slider"></span>
                </label>
              </div>

              <div class="ar-switch-row">
                <div class="ar-switch-copy">
                  <b>
                    Ignore Bots
                  </b>

                  <p>
                    Bot accounts will not count toward Anti-Raid join analysis.
                  </p>
                </div>

                <label class="ar-switch">
                  <input
                    id="arIgnoreBots"
                    type="checkbox"
                  />

                  <span class="ar-switch-slider"></span>
                </label>
              </div>
            </div>
          </section>
        </div>

        <aside class="ar-stack">
          <section class="ar-section">
            <header class="ar-section-heading">
              <div>
                <small class="mono">
                  05 / ROUTING
                </small>

                <h3>
                  Staff Routing
                </h3>
              </div>
            </header>

            <div class="ar-section-body">
              <div class="ar-grid">
                <label class="ar-field full">
                  <small class="mono">
                    ALERT CHANNEL
                  </small>

                  <select id="arAlertChannel">
                    <option value="">
                      Not configured
                    </option>
                  </select>
                </label>

                <label class="ar-field full">
                  <small class="mono">
                    QUARANTINE ROLE
                  </small>

                  <select id="arQuarantineRole">
                    <option value="">
                      Timeout fallback
                    </option>
                  </select>

                  <div class="ar-note">
                    If no quarantine role is selected,
                    Arclume uses Discord timeout containment.
                  </div>
                </label>

                <label class="ar-field">
                  <small class="mono">
                    ALERT COOLDOWN
                  </small>

                  <input
                    id="arAlertCooldown"
                    type="number"
                    min="10"
                    max="3600"
                  />
                </label>

                <label class="ar-field">
                  <small class="mono">
                    ACTION COOLDOWN
                  </small>

                  <input
                    id="arEventCooldown"
                    type="number"
                    min="5"
                    max="600"
                  />
                </label>
              </div>
            </div>
          </section>

          <section class="ar-section">
            <header class="ar-section-heading">
              <div>
                <small class="mono">
                  06 / EMERGENCY
                </small>

                <h3>
                  Emergency Mode
                </h3>

                <p>
                  Enhanced restrictions for newly-joined and suspicious accounts.
                </p>
              </div>
            </header>

            <div class="ar-section-body">
              <div class="ar-grid">
                <label class="ar-field">
                  <small class="mono">
                    DURATION / MINUTES
                  </small>

                  <input
                    id="arEmergencyDuration"
                    type="number"
                    min="1"
                    max="1440"
                  />
                </label>

                <label class="ar-field">
                  <small class="mono">
                    RECENT JOIN / MINUTES
                  </small>

                  <input
                    id="arEmergencyRecentJoin"
                    type="number"
                    min="1"
                    max="1440"
                  />
                </label>
              </div>

              <div class="ar-switch-row">
                <div class="ar-switch-copy">
                  <b>
                    Block Links
                  </b>

                  <p>
                    Restrict links from targeted members during Emergency Mode.
                  </p>
                </div>

                <label class="ar-switch">
                  <input
                    id="arEmergencyLinks"
                    type="checkbox"
                  />

                  <span class="ar-switch-slider"></span>
                </label>
              </div>

              <div class="ar-switch-row">
                <div class="ar-switch-copy">
                  <b>
                    Block Media
                  </b>

                  <p>
                    Restrict attachments during Emergency Mode.
                  </p>
                </div>

                <label class="ar-switch">
                  <input
                    id="arEmergencyMedia"
                    type="checkbox"
                  />

                  <span class="ar-switch-slider"></span>
                </label>
              </div>

              <div class="ar-switch-row">
                <div class="ar-switch-copy">
                  <b>
                    Block Mentions
                  </b>

                  <p>
                    Restrict mentions from targeted members.
                  </p>
                </div>

                <label class="ar-switch">
                  <input
                    id="arEmergencyMentions"
                    type="checkbox"
                  />

                  <span class="ar-switch-slider"></span>
                </label>
              </div>
            </div>
          </section>

          <section class="ar-section">
            <header class="ar-section-heading">
              <div>
                <small class="mono">
                  07 / BYPASS
                </small>

                <h3>
                  Trusted Members
                </h3>
              </div>
            </header>

            <div class="ar-section-body">
              <label class="ar-field">
                <small class="mono">
                  TRUSTED ROLES
                </small>

                <div class="ar-role-picker-toolbar">
                  <span class="mono" id="arTrustedRolesCount">
                    0 SELECTED
                  </span>

                  <button
                    class="ar-role-clear"
                    id="arTrustedRolesClear"
                    type="button"
                  >
                    CLEAR ALL
                  </button>
                </div>

                <div
                  class="ar-role-picker"
                  id="arTrustedRoles"
                >
                  <div class="ar-role-picker-empty">
                    Loading roles...
                  </div>
                </div>

                <div class="ar-note">
                  Tap or click any role to select it. No Ctrl key is needed.
                  Members with selected roles bypass Anti-Raid containment.
                </div>
              </label>

              <label
                class="ar-field"
                style="margin-top:16px;"
              >
                <small class="mono">
                  PROTECTED USER IDS
                </small>

                <textarea
                  id="arProtectedUsers"
                  placeholder="One Discord user ID per line"
                ></textarea>

                <div class="ar-note">
                  These users will never be automatically contained by Anti-Raid.
                </div>
              </label>
            </div>
          </section>

          <div class="ar-warning-box">
            <b>
              SAFE SETUP
            </b>

            <br /><br />

            Start in <b>ALERT</b> mode.
            After confirming alerts and thresholds work correctly,
            switch to Quarantine or Lockdown mode.
          </div>
        </aside>
      </div>

      <div class="ar-save-bar">
        <div class="ar-save-copy">
          <small class="mono">
            ANTI-RAID / CONFIGURATION
          </small>

          <b id="arSaveState">
            Changes are stored per Discord server.
          </b>
        </div>

        <button
          class="ar-button primary"
          id="arSaveButton"
          type="button"
        >
          SAVE ANTI-RAID
        </button>
      </div>
    `;

    main.appendChild(section);
  }

  /* =====================================================
     NAVIGATION
  ===================================================== */

  function buildNavigation() {
    const dock = document.querySelector(".control-dock");

    if (dock && !document.getElementById(NAV_ID)) {
      const logout =
        Array.from(dock.children).find((child) => {
          return (
            child.querySelector("b")?.textContent?.trim().toLowerCase() ===
            "logout"
          );
        }) || null;

      const button = document.createElement("button");

      button.id = NAV_ID;

      button.type = "button";

      button.innerHTML = `
        <span>
          10
        </span>

        <b>
          Anti-Raid
        </b>
      `;

      if (logout) {
        dock.insertBefore(button, logout);
      } else {
        dock.appendChild(button);
      }

      button.addEventListener(
        "click",

        openAntiRaid,
      );
    }

    buildOverviewRow();

    buildSystemRow();
  }

  function buildOverviewRow() {
    if (document.getElementById("overviewAntiRaidButton")) {
      return;
    }

    const ledger = document.querySelector("#page-overview .ledger-table");

    if (!ledger) {
      return;
    }

    const button = document.createElement("button");

    button.className = "ledger-row";

    button.id = "overviewAntiRaidButton";

    button.type = "button";

    button.innerHTML = `
      <span class="ledger-index mono">
        10
      </span>

      <span class="ledger-symbol orange">
        A
      </span>

      <span class="ledger-name">
        <small class="mono">
          SERVER DEFENSE
        </small>

        <b>
          Anti-Raid Defense
        </b>
      </span>

      <span class="ledger-value">
        <small class="mono">
          MODE
        </small>

        <b id="overviewAntiRaidMode">
          ALERT
        </b>
      </span>

      <span class="ledger-state">
        <i></i>

        <b id="overviewAntiRaidState">
          AVAILABLE
        </b>
      </span>

      <span class="ledger-arrow">
        &gt;
      </span>
    `;

    button.addEventListener(
      "click",

      openAntiRaid,
    );

    ledger.appendChild(button);
  }

  function buildSystemRow() {
    if (document.getElementById("systemAntiRaidButton")) {
      return;
    }

    const index = document.querySelector("#page-systems .system-index");

    if (!index) {
      return;
    }

    const article = document.createElement("article");

    article.className = "system-index-row live";

    article.innerHTML = `
      <span class="mono">
        10
      </span>

      <span class="system-index-symbol orange">
        A
      </span>

      <div>
        <small class="mono">
          SERVER DEFENSE
        </small>

        <h3>
          Anti-Raid Defense
        </h3>

        <p>
          Join waves, spam raids, containment and Emergency Mode.
        </p>
      </div>

      <b class="mono">
        AVAILABLE
      </b>

      <button
        id="systemAntiRaidButton"
        type="button"
      >
        OPEN
      </button>
    `;

    index.appendChild(article);

    article.querySelector("#systemAntiRaidButton")?.addEventListener(
      "click",

      openAntiRaid,
    );
  }

  function clearActiveNavigation() {
    document.querySelectorAll(".control-dock button").forEach((button) => {
      button.classList.remove("active");
    });
  }

  function openAntiRaid() {
    const page = document.getElementById(PAGE_ID);

    if (!page) {
      return;
    }

    document.querySelectorAll(".dash-page").forEach((item) => {
      item.classList.remove("active");
    });

    page.classList.add("active");

    clearActiveNavigation();

    document.getElementById(NAV_ID)?.classList.add("active");

    const pageCode = document.getElementById("pageCode");

    if (pageCode) {
      pageCode.textContent = "10 / ANTI-RAID";
    }

    window.scrollTo({
      top: 0,

      behavior: "smooth",
    });

    loadAntiRaid();
  }

  /* =====================================================
     ROLE + CHANNEL OPTIONS
  ===================================================== */

  async function loadGuildOptions() {
    const guildID = getGuildID();

    if (!guildID) {
      return;
    }

    try {
      const response = await fetch(
        `/api/guild/${encodeURIComponent(guildID)}/welcome-options`,

        {
          credentials: "same-origin",
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      guildOptions = {
        roles: Array.isArray(data.roles) ? data.roles : [],

        channels: Array.isArray(data.channels) ? data.channels : [],
      };

      renderGuildOptions();
    } catch (error) {
      console.error("Anti-Raid options load error:", error);
    }
  }

  function updateTrustedRoleCount() {
    const count = document.querySelectorAll(
      "#arTrustedRoles [data-ar-trusted-role].selected",
    ).length;

    setText("arTrustedRolesCount", `${count} SELECTED`);
  }

  function clearTrustedRoles() {
    document
      .querySelectorAll("#arTrustedRoles [data-ar-trusted-role]")
      .forEach((button) => {
        button.classList.remove("selected");
        button.setAttribute("aria-pressed", "false");
      });

    updateTrustedRoleCount();
  }

  function renderGuildOptions() {
    const alertSelect = document.getElementById("arAlertChannel");

    if (alertSelect) {
      alertSelect.innerHTML = `
        <option value="">
          Not configured
        </option>

        ${guildOptions.channels
          .map(
            (channel) => `
              <option value="${escapeHTML(channel.id)}">
                #${escapeHTML(channel.name)}
              </option>
            `,
          )
          .join("")}
      `;

      alertSelect.value = currentSettings.alertChannelID || "";
    }

    const roleSelect = document.getElementById("arQuarantineRole");

    if (roleSelect) {
      roleSelect.innerHTML = `
        <option value="">
          Timeout fallback
        </option>

        ${guildOptions.roles
          .filter((role) => role.assignable !== false)
          .map(
            (role) => `
              <option value="${escapeHTML(role.id)}">
                ${escapeHTML(role.name)}
              </option>
            `,
          )
          .join("")}
      `;

      roleSelect.value = currentSettings.quarantineRoleID || "";
    }

    const trustedPicker = document.getElementById("arTrustedRoles");

    if (trustedPicker) {
      const selected = new Set(
        (currentSettings.trustedRoleIDs || []).map((roleID) => String(roleID)),
      );

      if (!guildOptions.roles.length) {
        trustedPicker.innerHTML = `
          <div class="ar-role-picker-empty">
            No selectable roles found.
          </div>
        `;
      } else {
        trustedPicker.innerHTML = guildOptions.roles
          .map((role) => {
            const roleID = String(role.id || "");
            const isSelected = selected.has(roleID);

            return `
              <button
                class="ar-role-option${isSelected ? " selected" : ""}"
                type="button"
                data-ar-trusted-role="${escapeHTML(roleID)}"
                aria-pressed="${isSelected ? "true" : "false"}"
              >
                <span class="ar-role-option-copy">
                  <b>${escapeHTML(role.name)}</b>

                  <small class="mono">
                    ${role.assignable === false ? "ROLE / VIEW ONLY" : "ROLE / TRUST BYPASS"}
                  </small>
                </span>

                <span class="ar-role-check">
                  ✓
                </span>
              </button>
            `;
          })
          .join("");

        trustedPicker
          .querySelectorAll("[data-ar-trusted-role]")
          .forEach((button) => {
            button.addEventListener("click", () => {
              button.classList.toggle("selected");

              const active = button.classList.contains("selected");

              button.setAttribute("aria-pressed", active ? "true" : "false");

              updateTrustedRoleCount();
            });
          });
      }

      updateTrustedRoleCount();
    }
  }

  /* =====================================================
     RENDER SETTINGS
  ===================================================== */

  function setInput(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.value = value ?? "";
    }
  }

  function setChecked(id, state) {
    const element = document.getElementById(id);

    if (element) {
      element.checked = Boolean(state);
    }
  }

  function renderMode() {
    document.querySelectorAll("[data-ar-mode]").forEach((element) => {
      const mode = element.dataset.arMode;

      const input = element.querySelector('input[type="radio"]');

      const active = currentSettings.mode === mode;

      element.classList.toggle("active", active);

      if (input) {
        input.checked = active;
      }
    });
  }

  function renderSettings() {
    setChecked("arEnabled", currentSettings.enabled);

    setInput("arJoinThreshold", currentSettings.joinThreshold);

    setInput("arJoinWindow", currentSettings.joinWindowSeconds);

    setInput(
      "arSuspiciousJoinThreshold",
      currentSettings.suspiciousJoinThreshold,
    );

    setInput("arAccountAge", currentSettings.accountAgeHours);

    setInput("arAccountWeight", currentSettings.newAccountWeight);

    setInput("arQuarantineMinutes", currentSettings.quarantineMinutes);

    setInput("arMessageThreshold", currentSettings.messageThreshold);

    setInput("arMessageWindow", currentSettings.messageWindowSeconds);

    setInput("arDuplicateThreshold", currentSettings.duplicateThreshold);

    setInput("arMentionThreshold", currentSettings.mentionThreshold);

    setInput("arMentionWindow", currentSettings.mentionWindowSeconds);

    setInput("arContainmentMinutes", currentSettings.containmentMinutes);

    setChecked(
      "arAutoContainMessages",
      currentSettings.autoContainMessageRaids,
    );

    setChecked(
      "arAutoQuarantineJoins",
      currentSettings.autoQuarantineSuspiciousJoins,
    );

    setChecked("arIgnoreBots", currentSettings.ignoreBots);

    setInput("arAlertCooldown", currentSettings.alertCooldownSeconds);

    setInput("arEventCooldown", currentSettings.eventCooldownSeconds);

    setInput("arEmergencyDuration", currentSettings.emergencyDurationMinutes);

    setInput(
      "arEmergencyRecentJoin",
      currentSettings.emergencyAffectsRecentJoinMinutes,
    );

    setChecked("arEmergencyLinks", currentSettings.blockLinksDuringEmergency);

    setChecked("arEmergencyMedia", currentSettings.blockMediaDuringEmergency);

    setChecked(
      "arEmergencyMentions",
      currentSettings.blockMentionsDuringEmergency,
    );

    setInput(
      "arProtectedUsers",
      (currentSettings.protectedUserIDs || []).join("\n"),
    );

    renderMode();

    renderGuildOptions();

    renderStatus();
  }

  /* =====================================================
     STATUS DISPLAY
  ===================================================== */

  function renderStatus() {
    const live = document.getElementById("arLiveState");

    const text = document.getElementById("arLiveText");

    live?.classList.remove("online", "danger", "error");

    if (currentSettings.emergencyMode) {
      live?.classList.add("danger");

      if (text) {
        text.textContent = "EMERGENCY";
      }
    } else if (currentSettings.enabled) {
      live?.classList.add("online");

      if (text) {
        text.textContent = "ARMED";
      }
    } else if (text) {
      text.textContent = "DISABLED";
    }

    const banner = document.getElementById("arEmergencyBanner");

    banner?.classList.toggle("active", Boolean(currentSettings.emergencyMode));

    setText(
      "arMasterLabel",
      currentSettings.enabled
        ? `DEFENSE ARMED / ${String(
            currentSettings.mode || "alert",
          ).toUpperCase()}`
        : "ANTI-RAID DISABLED",
    );

    setText(
      "arMetricJoin",
      `${currentSettings.joinThreshold} / ${currentSettings.joinWindowSeconds}s`,
    );

    setText("arMetricAge", `≤ ${currentSettings.accountAgeHours}h`);

    setText(
      "arMetricMessages",
      `${currentSettings.messageThreshold} / ${currentSettings.messageWindowSeconds}s`,
    );

    setText(
      "arMetricMode",
      currentSettings.emergencyMode
        ? "EMERGENCY"
        : String(currentSettings.mode || "alert").toUpperCase(),
    );

    setText(
      "overviewAntiRaidMode",
      currentSettings.emergencyMode
        ? "EMERGENCY"
        : String(currentSettings.mode || "alert").toUpperCase(),
    );

    setText(
      "overviewAntiRaidState",
      currentSettings.enabled
        ? currentSettings.emergencyMode
          ? "EMERGENCY"
          : "ARMED"
        : "OFF",
    );

    const emergencyButton = document.getElementById("arEmergencyButton");

    if (emergencyButton) {
      emergencyButton.textContent = currentSettings.emergencyMode
        ? "END EMERGENCY"
        : "EMERGENCY MODE";

      emergencyButton.classList.toggle(
        "success",
        currentSettings.emergencyMode,
      );

      emergencyButton.classList.toggle(
        "danger",
        !currentSettings.emergencyMode,
      );
    }
  }

  /* =====================================================
     READ FORM
  ===================================================== */

  function readTrustedRoles() {
    return Array.from(
      document.querySelectorAll(
        "#arTrustedRoles [data-ar-trusted-role].selected",
      ),
    )
      .map((button) => String(button.dataset.arTrustedRole || "").trim())
      .filter(Boolean);
  }

  function readProtectedUsers() {
    return value("arProtectedUsers")
      .split(/[\s,]+/)
      .map((item) => item.trim())
      .filter((item) => /^\d{5,32}$/.test(item));
  }

  function readSelectedMode() {
    return (
      document.querySelector('input[name="arMode"]:checked')?.value || "alert"
    );
  }

  function readForm() {
    return {
      ...currentSettings,

      enabled: checked("arEnabled"),

      mode: readSelectedMode(),

      joinThreshold: numberValue("arJoinThreshold", 8, 2, 100),

      joinWindowSeconds: numberValue("arJoinWindow", 15, 5, 300),

      suspiciousJoinThreshold: numberValue(
        "arSuspiciousJoinThreshold",
        3,
        1,
        100,
      ),

      accountAgeHours: numberValue("arAccountAge", 24, 0, 8760),

      newAccountWeight: numberValue("arAccountWeight", 2, 1, 10),

      quarantineMinutes: numberValue("arQuarantineMinutes", 15, 1, 10080),

      messageThreshold: numberValue("arMessageThreshold", 8, 3, 100),

      messageWindowSeconds: numberValue("arMessageWindow", 8, 3, 120),

      duplicateThreshold: numberValue("arDuplicateThreshold", 4, 2, 50),

      mentionThreshold: numberValue("arMentionThreshold", 6, 2, 100),

      mentionWindowSeconds: numberValue("arMentionWindow", 10, 3, 120),

      containmentMinutes: numberValue("arContainmentMinutes", 10, 1, 10080),

      autoContainMessageRaids: checked("arAutoContainMessages"),

      autoQuarantineSuspiciousJoins: checked("arAutoQuarantineJoins"),

      ignoreBots: checked("arIgnoreBots"),

      alertChannelID: value("arAlertChannel"),

      quarantineRoleID: value("arQuarantineRole"),

      alertCooldownSeconds: numberValue("arAlertCooldown", 60, 10, 3600),

      eventCooldownSeconds: numberValue("arEventCooldown", 15, 5, 600),

      emergencyDurationMinutes: numberValue("arEmergencyDuration", 10, 1, 1440),

      emergencyAffectsRecentJoinMinutes: numberValue(
        "arEmergencyRecentJoin",
        30,
        1,
        1440,
      ),

      blockLinksDuringEmergency: checked("arEmergencyLinks"),

      blockMediaDuringEmergency: checked("arEmergencyMedia"),

      blockMentionsDuringEmergency: checked("arEmergencyMentions"),

      trustedRoleIDs: readTrustedRoles(),

      protectedUserIDs: readProtectedUsers(),
    };
  }

  /* =====================================================
     LOAD SETTINGS
  ===================================================== */

  async function loadAntiRaid() {
    if (loading) {
      return;
    }

    const guildID = getGuildID();

    if (!guildID) {
      showToast("NO ACTIVE SERVER");

      return;
    }

    loading = true;

    document.getElementById(PAGE_ID)?.classList.add("ar-loading");

    const live = document.getElementById("arLiveState");

    const liveText = document.getElementById("arLiveText");

    live?.classList.remove("online", "danger", "error");

    if (liveText) {
      liveText.textContent = "SYNCING";
    }

    try {
      const [settingsResponse] = await Promise.all([
        fetch(
          `/api/guild/${encodeURIComponent(guildID)}/anti-raid`,

          {
            credentials: "same-origin",
          },
        ),

        loadGuildOptions(),
      ]);

      const data = await settingsResponse.json().catch(() => ({}));

      if (!settingsResponse.ok) {
        throw new Error(data.error || `HTTP ${settingsResponse.status}`);
      }

      currentSettings = {
        ...DEFAULT_SETTINGS,

        ...(data.settings || data || {}),
      };

      renderSettings();

      setText("arSaveState", "Configuration synchronized with Arclume.");
    } catch (error) {
      console.error("Anti-Raid load error:", error);

      currentSettings = {
        ...DEFAULT_SETTINGS,
      };

      renderSettings();

      live?.classList.add("error");

      if (liveText) {
        liveText.textContent = "API NOT CONNECTED";
      }

      setText("arSaveState", "Anti-Raid website API is not connected yet.");
    } finally {
      loading = false;

      document.getElementById(PAGE_ID)?.classList.remove("ar-loading");
    }
  }

  /* =====================================================
     SAVE SETTINGS
  ===================================================== */

  async function saveAntiRaid() {
    if (saving) {
      return;
    }

    const guildID = getGuildID();

    if (!guildID) {
      showToast("NO ACTIVE SERVER");

      return;
    }

    saving = true;

    const button = document.getElementById("arSaveButton");

    if (button) {
      button.disabled = true;

      button.textContent = "SAVING...";
    }

    setText("arSaveState", "Saving Anti-Raid configuration...");

    const settings = readForm();

    try {
      const response = await fetch(
        `/api/guild/${encodeURIComponent(guildID)}/anti-raid`,

        {
          method: "PUT",

          credentials: "same-origin",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(settings),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      currentSettings = {
        ...DEFAULT_SETTINGS,

        ...(data.settings || settings),
      };

      renderSettings();

      setText("arSaveState", "Configuration saved successfully.");

      showToast("ANTI-RAID SETTINGS SAVED");
    } catch (error) {
      console.error("Anti-Raid save error:", error);

      setText(
        "arSaveState",
        error.message || "Could not save Anti-Raid settings.",
      );

      showToast("ANTI-RAID SAVE FAILED");
    } finally {
      saving = false;

      if (button) {
        button.disabled = false;

        button.textContent = "SAVE ANTI-RAID";
      }
    }
  }

  /* =====================================================
     TEST ALERT
  ===================================================== */

  async function sendTestAlert() {
    const guildID = getGuildID();

    if (!guildID) {
      showToast("NO ACTIVE SERVER");

      return;
    }

    const button = document.getElementById("arTestButton");

    if (button) {
      button.disabled = true;

      button.textContent = "TESTING...";
    }

    try {
      const response = await fetch(
        `/api/guild/${encodeURIComponent(guildID)}/anti-raid/test`,

        {
          method: "POST",

          credentials: "same-origin",

          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      showToast("ANTI-RAID TEST ALERT SENT");
    } catch (error) {
      console.error("Anti-Raid test error:", error);

      showToast(error.message || "ANTI-RAID TEST FAILED");
    } finally {
      if (button) {
        button.disabled = false;

        button.textContent = "TEST ALERT";
      }
    }
  }

  /* =====================================================
     EMERGENCY MODE
  ===================================================== */

  async function toggleEmergency(forceState = null) {
    const guildID = getGuildID();

    if (!guildID) {
      showToast("NO ACTIVE SERVER");

      return;
    }

    const enabled =
      forceState === null
        ? !currentSettings.emergencyMode
        : Boolean(forceState);

    const duration = numberValue(
      "arEmergencyDuration",
      currentSettings.emergencyDurationMinutes || 10,
      1,
      1440,
    );

    const button = document.getElementById("arEmergencyButton");

    if (button) {
      button.disabled = true;
    }

    try {
      const response = await fetch(
        `/api/guild/${encodeURIComponent(guildID)}/anti-raid/emergency`,

        {
          method: "POST",

          credentials: "same-origin",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            enabled,

            minutes: duration,
          }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      currentSettings = {
        ...currentSettings,

        ...(data.settings || {
          emergencyMode: enabled,
        }),
      };

      renderSettings();

      showToast(enabled ? "EMERGENCY MODE ACTIVATED" : "EMERGENCY MODE ENDED");
    } catch (error) {
      console.error("Emergency Mode error:", error);

      showToast(error.message || "EMERGENCY MODE FAILED");
    } finally {
      if (button) {
        button.disabled = false;
      }
    }
  }

  /* =====================================================
     EVENTS
  ===================================================== */

  function bindEvents() {
    document.querySelectorAll("[data-ar-mode]").forEach((element) => {
      element.addEventListener(
        "click",

        () => {
          const mode = element.dataset.arMode;

          document.querySelectorAll("[data-ar-mode]").forEach((item) => {
            item.classList.remove("active");
          });

          element.classList.add("active");

          const input = element.querySelector('input[type="radio"]');

          if (input) {
            input.checked = true;
          }

          setText("arMetricMode", String(mode).toUpperCase());
        },
      );
    });

    document.getElementById("arSaveButton")?.addEventListener(
      "click",

      saveAntiRaid,
    );

    document.getElementById("arRefreshButton")?.addEventListener(
      "click",

      loadAntiRaid,
    );

    document.getElementById("arTestButton")?.addEventListener(
      "click",

      sendTestAlert,
    );

    document.getElementById("arEmergencyButton")?.addEventListener(
      "click",

      () => toggleEmergency(),
    );

    document.getElementById("arEmergencyStopTop")?.addEventListener(
      "click",

      () => toggleEmergency(false),
    );

    document.getElementById("arTrustedRolesClear")?.addEventListener(
      "click",

      clearTrustedRoles,
    );

    document.getElementById("arEnabled")?.addEventListener(
      "change",

      (event) => {
        setText(
          "arMasterLabel",
          event.target.checked ? "DEFENSE ARMED" : "ANTI-RAID DISABLED",
        );
      },
    );

    [
      "arJoinThreshold",
      "arJoinWindow",
      "arAccountAge",
      "arMessageThreshold",
      "arMessageWindow",
    ].forEach((id) => {
      document.getElementById(id)?.addEventListener(
        "input",

        () => {
          const draft = readForm();

          setText(
            "arMetricJoin",
            `${draft.joinThreshold} / ${draft.joinWindowSeconds}s`,
          );

          setText("arMetricAge", `≤ ${draft.accountAgeHours}h`);

          setText(
            "arMetricMessages",
            `${draft.messageThreshold} / ${draft.messageWindowSeconds}s`,
          );
        },
      );
    });
  }

  /* =====================================================
     ACTIVE SERVER CHANGES
  ===================================================== */

  function watchServerChanges() {
    let previousGuildID = getGuildID();

    setInterval(
      () => {
        const nextGuildID = getGuildID();

        if (nextGuildID && nextGuildID !== previousGuildID) {
          previousGuildID = nextGuildID;

          if (document.getElementById(PAGE_ID)?.classList.contains("active")) {
            loadAntiRaid();
          }
        }
      },

      1200,
    );
  }

  /* =====================================================
     INITIALIZE
  ===================================================== */

  function initialize() {
    injectStyles();

    buildPage();

    buildNavigation();

    bindEvents();

    renderSettings();

    watchServerChanges();

    /*
      Dashboard modules can load at slightly different
      moments, so safely retry navigation injection.
    */

    setTimeout(buildNavigation, 150);

    setTimeout(buildNavigation, 500);

    setTimeout(buildNavigation, 1000);

    setTimeout(buildNavigation, 2000);

    console.log("🛡️ Arclume Anti-Raid dashboard module loaded");
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",

      initialize,
      {
        once: true,
      },
    );
  } else {
    initialize();
  }

  /* =====================================================
     PUBLIC HOOKS
  ===================================================== */

  window.ArclumeAntiRaid = {
    open: openAntiRaid,

    load: loadAntiRaid,

    save: saveAntiRaid,

    emergency: toggleEmergency,
  };
})();
