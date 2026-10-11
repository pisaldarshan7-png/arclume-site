"use strict";

(() => {
  const API = "access-lock";
  const MODULE = "13";

  const APP_SCRIPT =
    "/applications-settings.js?v=20261010-applications-restore";

  let selectedMember = null;
  let searchTimer = null;
  let loading = false;
  let optionsLoaded = false;
  let appLoaderStarted = false;

  const $ = (id) => document.getElementById(id);

  const esc = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  /* =====================================================
     GUILD
  ===================================================== */

  function guildID() {
    try {
      if (window.currentGuild?.id) {
        return String(window.currentGuild.id);
      }
    } catch {}

    return $("identityServerId")?.textContent?.match(/\d{5,32}/)?.[0] || "";
  }

  /* =====================================================
     API
  ===================================================== */

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",

      headers: {
        Accept: "application/json",

        "Content-Type": "application/json",

        ...(options.headers || {}),
      },

      ...options,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }

    return data;
  }

  /* =====================================================
     TOAST
  ===================================================== */

  function toast(message, type = "success") {
    if (typeof window.toast === "function") {
      window.toast(message);

      return;
    }

    let box = $("accessLockToast");

    if (!box) {
      box = document.createElement("div");

      box.id = "accessLockToast";

      document.body.appendChild(box);
    }

    box.className = `access-lock-toast ${type}`;

    box.textContent = message;

    box.classList.add("show");

    setTimeout(
      () => box.classList.remove("show"),

      3200,
    );
  }

  /* =====================================================
     DATE
  ===================================================== */

  function formatDate(value) {
    if (!value) {
      return "Manual unlock";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }

    return date.toLocaleString([], {
      dateStyle: "medium",

      timeStyle: "short",
    });
  }

  function remaining(value) {
    if (!value) {
      return "Manual unlock";
    }

    const diff = new Date(value).getTime() - Date.now();

    if (diff <= 0) {
      return "Expiring";
    }

    const mins = Math.floor(diff / 60000);

    if (mins < 60) {
      return `${mins}m remaining`;
    }

    const hours = Math.floor(mins / 60);

    if (hours < 24) {
      return `${hours}h remaining`;
    }

    return `${Math.floor(hours / 24)}d remaining`;
  }

  /* =====================================================
     APPLICATIONS RESTORE
  ===================================================== */

  function normalizeDockOrder() {
    const dock = document.querySelector(".control-dock");

    if (!dock) {
      return;
    }

    const apps = $("applicationsNavButton");

    const lock = $("accessLockNavButton");

    const logout = Array.from(dock.children).find(
      (child) =>
        child.querySelector("b")?.textContent?.trim().toLowerCase() ===
        "logout",
    );

    /*
       Applications = 12
       Access Lock = 13
       Logout last
    */

    if (apps && lock) {
      dock.insertBefore(apps, lock);
    }

    if (logout && lock) {
      dock.insertBefore(lock, logout);
    }
  }

  function ensureApplications() {
    if (
      window.ArclumeApplications ||
      $("applicationsNavButton") ||
      $("page-applications")
    ) {
      normalizeDockOrder();

      return;
    }

    if (appLoaderStarted) {
      return;
    }

    const alreadyThere = Array.from(document.scripts).some((script) =>
      String(script.src || "").includes("/applications-settings.js"),
    );

    if (alreadyThere) {
      return;
    }

    appLoaderStarted = true;

    const script = document.createElement("script");

    script.src = APP_SCRIPT;

    script.async = false;

    script.onload = () => {
      normalizeDockOrder();

      console.log("📋 Applications dashboard restored");
    };

    script.onerror = () => {
      appLoaderStarted = false;

      console.error("❌ Could not load applications-settings.js");
    };

    document.body.appendChild(script);
  }

  /* =====================================================
     STYLES
  ===================================================== */

  function styles() {
    if ($("accessLockStyles")) {
      return;
    }

    const style = document.createElement("style");

    style.id = "accessLockStyles";

    style.textContent = `
      #page-access-lock {
        padding-bottom: 120px;
      }

      .access-lock-hero {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 24px;
        margin-bottom: 24px;
      }

      .access-lock-live {
        display: flex;
        align-items: center;
        gap: 9px;

        padding:
          10px
          14px;

        border:
          1px
          solid
          rgba(
            255,
            124,
            147,
            .22
          );

        border-radius:
          999px;

        background:
          rgba(
            255,
            94,
            125,
            .07
          );

        color:
          rgba(
            255,
            255,
            255,
            .72
          );

        font-size:
          10px;

        letter-spacing:
          .1em;
      }

      .access-lock-live i {
        width:
          8px;

        height:
          8px;

        border-radius:
          50%;

        background:
          #9effc7;

        box-shadow:
          0 0 16px
          rgba(
            158,
            255,
            199,
            .7
          );
      }

      .access-lock-live.loading i {
        background:
          #ffd37a;
      }

      .access-lock-live.error i {
        background:
          #ff7f8f;
      }

      .access-lock-stats {
        display:
          grid;

        grid-template-columns:
          repeat(
            3,
            minmax(
              0,
              1fr
            )
          );

        gap:
          14px;

        margin-bottom:
          20px;
      }

      .access-stat {
        min-height:
          126px;

        padding:
          20px;

        border:
          1px
          solid
          rgba(
            255,
            255,
            255,
            .1
          );

        border-radius:
          22px;

        background:
          linear-gradient(
            145deg,
            rgba(
              255,
              255,
              255,
              .055
            ),
            rgba(
              255,
              255,
              255,
              .018
            )
          );
      }

      .access-stat small {
        display:
          block;

        color:
          rgba(
            255,
            255,
            255,
            .42
          );

        font-size:
          10px;

        letter-spacing:
          .12em;
      }

      .access-stat strong {
        display:
          block;

        margin-top:
          13px;

        font-family:
          "Syne",
          sans-serif;

        font-size:
          38px;
      }

      .access-lock-grid {
        display:
          grid;

        grid-template-columns:
          minmax(
            340px,
            .82fr
          )
          minmax(
            0,
            1.18fr
          );

        gap:
          20px;

        align-items:
          start;
      }

      .access-panel {
        border:
          1px
          solid
          rgba(
            255,
            255,
            255,
            .1
          );

        border-radius:
          24px;

        background:
          rgba(
            255,
            255,
            255,
            .025
          );

        overflow:
          hidden;
      }

      .access-panel-head {
        padding:
          20px
          22px;

        border-bottom:
          1px
          solid
          rgba(
            255,
            255,
            255,
            .08
          );
      }

      .access-panel-head small {
        display:
          block;

        color:
          rgba(
            255,
            255,
            255,
            .38
          );

        font-size:
          10px;

        letter-spacing:
          .11em;
      }

      .access-panel-head h3 {
        margin:
          7px
          0
          0;

        font-family:
          "Syne",
          sans-serif;

        font-size:
          22px;
      }

      .access-panel-body {
        padding:
          22px;
      }

      .access-field {
        display:
          block;

        margin-bottom:
          18px;
      }

      .access-field > span {
        display:
          block;

        margin-bottom:
          8px;

        color:
          rgba(
            255,
            255,
            255,
            .47
          );

        font-size:
          10px;

        letter-spacing:
          .1em;
      }

      .access-input,
      .access-select,
      .access-textarea {
        width:
          100%;

        border:
          1px
          solid
          rgba(
            255,
            255,
            255,
            .11
          );

        border-radius:
          14px;

        outline:
          none;

        background:
          rgba(
            255,
            255,
            255,
            .045
          );

        color:
          #fff;

        font:
          inherit;
      }

      .access-input,
      .access-select {
        min-height:
          48px;

        padding:
          0
          14px;
      }

      .access-textarea {
        min-height:
          100px;

        resize:
          vertical;

        padding:
          13px
          14px;
      }

      .access-input:focus,
      .access-select:focus,
      .access-textarea:focus {
        border-color:
          rgba(
            155,
            125,
            255,
            .56
          );

        box-shadow:
          0
          0
          0
          3px
          rgba(
            130,
            95,
            255,
            .08
          );
      }

      .access-select option {
        background:
          #111118;

        color:
          white;
      }

      .access-field-note {
        display:
          block;

        margin-top:
          7px;

        color:
          rgba(
            255,
            255,
            255,
            .32
          );

        font-size:
          10px;

        line-height:
          1.45;
      }

      .access-search-wrap {
        position:
          relative;
      }

      .access-search-results {
        display:
          none;

        position:
          absolute;

        z-index:
          80;

        top:
          calc(
            100% + 8px
          );

        left:
          0;

        right:
          0;

        max-height:
          280px;

        overflow-y:
          auto;

        padding:
          7px;

        border:
          1px
          solid
          rgba(
            255,
            255,
            255,
            .12
          );

        border-radius:
          16px;

        background:
          #101016;

        box-shadow:
          0
          22px
          55px
          rgba(
            0,
            0,
            0,
            .4
          );
      }

      .access-search-results.show {
        display:
          block;
      }

      .access-member-result {
        width:
          100%;

        display:
          flex;

        align-items:
          center;

        gap:
          12px;

        padding:
          10px;

        border:
          0;

        border-radius:
          12px;

        background:
          transparent;

        color:
          white;

        text-align:
          left;

        cursor:
          pointer;
      }

      .access-member-result:hover {
        background:
          rgba(
            255,
            255,
            255,
            .06
          );
      }

      .access-member-result img,
      .access-selected-member img,
      .access-lock-user img {
        width:
          42px;

        height:
          42px;

        flex:
          0
          0
          42px;

        object-fit:
          cover;

        border-radius:
          13px;

        background:
          rgba(
            255,
            255,
            255,
            .07
          );
      }

      .access-member-result b,
      .access-selected-member b,
      .access-lock-user b {
        display:
          block;

        font-size:
          13px;
      }

      .access-member-result small,
      .access-selected-member small,
      .access-lock-user small {
        display:
          block;

        margin-top:
          3px;

        color:
          rgba(
            255,
            255,
            255,
            .4
          );

        font-size:
          10px;
      }

      .access-result-state {
        margin-left:
          auto;

        padding:
          5px
          8px;

        border-radius:
          999px;

        background:
          rgba(
            255,
            255,
            255,
            .06
          );

        color:
          rgba(
            255,
            255,
            255,
            .48
          );

        font-size:
          9px;
      }

      .access-result-state.locked {
        background:
          rgba(
            255,
            85,
            110,
            .09
          );

        color:
          #ff8da2;
      }

      .access-selected-member {
        display:
          none;

        align-items:
          center;

        gap:
          12px;

        margin-top:
          10px;

        padding:
          12px;

        border:
          1px
          solid
          rgba(
            255,
            255,
            255,
            .09
          );

        border-radius:
          15px;

        background:
          rgba(
            255,
            255,
            255,
            .025
          );
      }

      .access-selected-member.show {
        display:
          flex;
      }

      .access-selected-remove {
        margin-left:
          auto;

        border:
          0;

        border-radius:
          10px;

        background:
          rgba(
            255,
            255,
            255,
            .06
          );

        color:
          rgba(
            255,
            255,
            255,
            .65
          );

        cursor:
          pointer;

        padding:
          8px
          10px;
      }

      .access-lock-button {
        width:
          100%;

        min-height:
          50px;

        border:
          1px
          solid
          rgba(
            255,
            100,
            130,
            .28
          );

        border-radius:
          14px;

        background:
          linear-gradient(
            135deg,
            rgba(
              255,
              77,
              112,
              .18
            ),
            rgba(
              143,
              79,
              255,
              .14
            )
          );

        color:
          #fff;

        font-family:
          "Syne",
          sans-serif;

        font-weight:
          700;

        cursor:
          pointer;
      }

      .access-lock-button:disabled {
        cursor:
          not-allowed;

        opacity:
          .48;
      }

      .access-active-head {
        display:
          flex;

        align-items:
          center;

        justify-content:
          space-between;

        gap:
          10px;
      }

      .access-refresh {
        border:
          1px
          solid
          rgba(
            255,
            255,
            255,
            .1
          );

        border-radius:
          10px;

        background:
          rgba(
            255,
            255,
            255,
            .04
          );

        color:
          rgba(
            255,
            255,
            255,
            .7
          );

        padding:
          8px
          11px;

        cursor:
          pointer;
      }

      .access-lock-list {
        display:
          grid;

        gap:
          12px;
      }

      .access-lock-card {
        padding:
          16px;

        border:
          1px
          solid
          rgba(
            255,
            255,
            255,
            .09
          );

        border-radius:
          18px;

        background:
          rgba(
            255,
            255,
            255,
            .025
          );
      }

      .access-lock-card-top {
        display:
          flex;

        align-items:
          center;

        justify-content:
          space-between;

        gap:
          14px;
      }

      .access-lock-user {
        min-width:
          0;

        display:
          flex;

        align-items:
          center;

        gap:
          12px;
      }

      .access-lock-user > div {
        min-width:
          0;
      }

      .access-lock-user b {
        overflow:
          hidden;

        text-overflow:
          ellipsis;

        white-space:
          nowrap;
      }

      .access-lock-badge {
        flex:
          0
          0
          auto;

        padding:
          6px
          9px;

        border-radius:
          999px;

        border:
          1px
          solid
          rgba(
            255,
            116,
            142,
            .18
          );

        background:
          rgba(
            255,
            80,
            110,
            .07
          );

        color:
          #ff9aad;

        font-size:
          9px;

        letter-spacing:
          .08em;
      }

      .access-channel-strip {
        display:
          grid;

        grid-template-columns:
          1fr
          1fr;

        gap:
          10px;

        margin-top:
          14px;
      }

      .access-channel-box {
        padding:
          12px
          13px;

        border:
          1px
          solid
          rgba(
            139,
            112,
            255,
            .14
          );

        border-radius:
          14px;

        background:
          rgba(
            118,
            85,
            255,
            .045
          );
      }

      .access-channel-box small {
        display:
          block;

        color:
          rgba(
            255,
            255,
            255,
            .38
          );

        font-size:
          9px;

        letter-spacing:
          .08em;
      }

      .access-channel-box b {
        display:
          block;

        margin-top:
          5px;

        color:
          #d9d0ff;

        font-size:
          12px;

        overflow-wrap:
          anywhere;
      }

      .access-lock-meta {
        display:
          grid;

        grid-template-columns:
          repeat(
            2,
            minmax(
              0,
              1fr
            )
          );

        gap:
          10px;

        margin-top:
          12px;
      }

      .access-lock-meta > div {
        padding:
          11px
          12px;

        border-radius:
          12px;

        background:
          rgba(
            255,
            255,
            255,
            .025
          );
      }

      .access-lock-meta small {
        display:
          block;

        color:
          rgba(
            255,
            255,
            255,
            .35
          );

        font-size:
          9px;

        letter-spacing:
          .08em;
      }

      .access-lock-meta b {
        display:
          block;

        margin-top:
          5px;

        color:
          rgba(
            255,
            255,
            255,
            .78
          );

        font-size:
          12px;

        font-weight:
          500;

        overflow-wrap:
          anywhere;
      }

      .access-reason {
        margin-top:
          12px;

        padding:
          12px;

        border-left:
          2px
          solid
          rgba(
            159,
            121,
            255,
            .45
          );

        border-radius:
          0
          10px
          10px
          0;

        background:
          rgba(
            148,
            105,
            255,
            .035
          );

        color:
          rgba(
            255,
            255,
            255,
            .62
          );

        font-size:
          12px;

        line-height:
          1.55;
      }

      .access-card-actions {
        display:
          flex;

        gap:
          9px;

        margin-top:
          14px;
      }

      .access-room-button,
      .access-unlock-button {
        min-height:
          39px;

        padding:
          0
          13px;

        border-radius:
          11px;

        font:
          inherit;

        font-size:
          11px;

        cursor:
          pointer;
      }

      .access-room-button {
        display:
          inline-flex;

        align-items:
          center;

        justify-content:
          center;

        border:
          1px
          solid
          rgba(
            255,
            255,
            255,
            .1
          );

        background:
          rgba(
            255,
            255,
            255,
            .04
          );

        color:
          rgba(
            255,
            255,
            255,
            .73
          );

        text-decoration:
          none;
      }

      .access-unlock-button {
        border:
          1px
          solid
          rgba(
            120,
            255,
            178,
            .18
          );

        background:
          rgba(
            100,
            255,
            170,
            .06
          );

        color:
          #aaf5c9;
      }

      .access-empty,
      .access-loading {
        padding:
          40px
          18px;

        color:
          rgba(
            255,
            255,
            255,
            .4
          );

        text-align:
          center;

        font-size:
          12px;
      }

      .access-lock-toast {
        position:
          fixed;

        z-index:
          99999;

        right:
          22px;

        bottom:
          92px;

        max-width:
          min(
            390px,
            calc(
              100vw - 32px
            )
          );

        padding:
          13px
          16px;

        border:
          1px
          solid
          rgba(
            255,
            255,
            255,
            .13
          );

        border-radius:
          14px;

        background:
          #14141b;

        color:
          white;

        box-shadow:
          0
          20px
          60px
          rgba(
            0,
            0,
            0,
            .38
          );

        opacity:
          0;

        pointer-events:
          none;

        transform:
          translateY(
            12px
          );

        transition:
          .22s
          ease;
      }

      .access-lock-toast.show {
        opacity:
          1;

        transform:
          translateY(
            0
          );
      }

      .access-lock-toast.error {
        border-color:
          rgba(
            255,
            95,
            120,
            .3
          );
      }

      @media(
        max-width:
          900px
      ) {
        .access-lock-grid {
          grid-template-columns:
            1fr;
        }

        .access-lock-stats {
          grid-template-columns:
            1fr
            1fr
            1fr;
        }
      }

      @media(
        max-width:
          620px
      ) {
        .access-lock-hero {
          align-items:
            flex-start;

          flex-direction:
            column;
        }

        .access-lock-stats,
        .access-lock-meta,
        .access-channel-strip {
          grid-template-columns:
            1fr;
        }

        .access-card-actions {
          flex-direction:
            column;
        }

        .access-room-button,
        .access-unlock-button {
          width:
            100%;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* =====================================================
     NAVIGATION
  ===================================================== */

  function buildNav() {
    if ($("accessLockNavButton")) {
      normalizeDockOrder();

      return;
    }

    const dock = document.querySelector(".control-dock");

    if (!dock) {
      return;
    }

    const button = document.createElement("button");

    button.id = "accessLockNavButton";

    button.type = "button";

    button.innerHTML = `
      <span>
        ${MODULE}
      </span>

      <b>
        Access Lock
      </b>
    `;

    button.addEventListener("click", openPage);

    const logout = Array.from(dock.children).find(
      (child) =>
        child.querySelector("b")?.textContent?.trim().toLowerCase() ===
        "logout",
    );

    if (logout) {
      dock.insertBefore(button, logout);
    } else {
      dock.appendChild(button);
    }

    normalizeDockOrder();
  }

  /* =====================================================
     OVERVIEW
  ===================================================== */

  function buildOverview() {
    if ($("overviewAccessLockButton")) {
      return;
    }

    const ledger = document.querySelector("#page-overview .ledger-table");

    if (!ledger) {
      return;
    }

    const row = document.createElement("button");

    row.className = "ledger-row";

    row.id = "overviewAccessLockButton";

    row.type = "button";

    row.innerHTML = `
      <span class="ledger-index mono">
        ${MODULE}
      </span>

      <span class="ledger-symbol">
        L
      </span>

      <span class="ledger-name">

        <small class="mono">
          ACCESS CONTROL
        </small>

        <b>
          Access Lock
        </b>

      </span>

      <span class="ledger-value">

        <small class="mono">
          ACTIVE
        </small>

        <b id="overviewAccessLockCount">
          0
        </b>

      </span>

      <span class="ledger-state">

        <i></i>

        <b id="overviewAccessLockState">
          AVAILABLE
        </b>

      </span>

      <span class="ledger-arrow">
        &gt;
      </span>
    `;

    row.addEventListener("click", openPage);

    ledger.appendChild(row);
  }

  /* =====================================================
     SYSTEMS
  ===================================================== */

  function buildSystemCard() {
    if ($("systemAccessLockButton")) {
      return;
    }

    const index = document.querySelector("#page-systems .system-index");

    if (!index) {
      return;
    }

    const row = document.createElement("article");

    row.className = "system-index-row live";

    row.innerHTML = `
      <span class="mono">
        ${MODULE}
      </span>

      <span class="system-index-symbol orange">
        L
      </span>

      <div>

        <small class="mono">
          ACCESS CONTROL
        </small>

        <h3>
          Access Lock
        </h3>

        <p>
          Restrict a member to one private lock channel
          and record actions in a log channel.
        </p>

      </div>

      <b class="mono">
        AVAILABLE
      </b>

      <button
        id="systemAccessLockButton"
        type="button"
      >
        OPEN
      </button>
    `;

    index.appendChild(row);

    $("systemAccessLockButton")?.addEventListener("click", openPage);
  }

  /* =====================================================
     PAGE
  ===================================================== */

  function buildPage() {
    if ($("page-access-lock")) {
      return;
    }

    const main = document.querySelector("main");

    if (!main) {
      return;
    }

    const page = document.createElement("section");

    page.className = "dash-page";

    page.id = "page-access-lock";

    page.innerHTML = `
      <div class="page-hero compact access-lock-hero">

        <div>

          <span class="mono eyebrow">
            ${MODULE} / ACCESS CONTROL
          </span>

          <h1>
            Access
            <br>

            <span>
              Lock.
            </span>
          </h1>

          <p>
            Hide the normal server and leave one private
            channel available to the locked member.
          </p>

        </div>

        <div
          class="access-lock-live loading"
          id="accessLockLive"
        >

          <i></i>

          <span
            class="mono"
            id="accessLockLiveText"
          >
            WAITING FOR DATA
          </span>

        </div>

      </div>

      <div class="access-lock-stats">

        <article class="access-stat">

          <small class="mono">
            ACTIVE LOCKS
          </small>

          <strong id="accessStatActive">
            0
          </strong>

        </article>

        <article class="access-stat">

          <small class="mono">
            TEMPORARY
          </small>

          <strong id="accessStatTemporary">
            0
          </strong>

        </article>

        <article class="access-stat">

          <small class="mono">
            PERMANENT
          </small>

          <strong id="accessStatPermanent">
            0
          </strong>

        </article>

      </div>

      <div class="access-lock-grid">

        <section class="access-panel">

          <div class="access-panel-head">

            <small class="mono">
              NEW RESTRICTION
            </small>

            <h3>
              Lock Member
            </h3>

          </div>

          <div class="access-panel-body">

            <label class="access-field">

              <span class="mono">
                MEMBER
              </span>

              <div class="access-search-wrap">

                <input
                  class="access-input"
                  id="accessMemberSearch"
                  type="text"
                  placeholder="Search username, display name or ID..."
                  autocomplete="off"
                >

                <div
                  class="access-search-results"
                  id="accessMemberResults"
                ></div>

              </div>

              <div
                class="access-selected-member"
                id="accessSelectedMember"
              ></div>

            </label>

            <label class="access-field">

              <span class="mono">
                LOCK CHANNEL
              </span>

              <select
                class="access-select"
                id="accessLockChannel"
              >

                <option value="">
                  Loading channels...
                </option>

              </select>

              <small class="access-field-note">
                The locked member will only be able
                to see this private channel.
              </small>

            </label>

            <label class="access-field">

              <span class="mono">
                LOG CHANNEL
              </span>

              <select
                class="access-select"
                id="accessLogChannel"
              >

                <option value="">
                  Loading channels...
                </option>

              </select>

              <small class="access-field-note">
                Lock, unlock and expiry logs
                will be sent here.
              </small>

            </label>

            <label class="access-field">

              <span class="mono">
                DURATION
              </span>

              <select
                class="access-select"
                id="accessDuration"
              >

                <option value="permanent">
                  Until manually unlocked
                </option>

                <option value="30m">
                  30 minutes
                </option>

                <option value="1h">
                  1 hour
                </option>

                <option value="2h">
                  2 hours
                </option>

                <option value="6h">
                  6 hours
                </option>

                <option value="12h">
                  12 hours
                </option>

                <option value="1d">
                  1 day
                </option>

                <option value="3d">
                  3 days
                </option>

                <option value="7d">
                  7 days
                </option>

                <option value="14d">
                  14 days
                </option>

                <option value="28d">
                  28 days
                </option>

              </select>

            </label>

            <label class="access-field">

              <span class="mono">
                REASON
              </span>

              <textarea
                class="access-textarea"
                id="accessReason"
                maxlength="300"
                placeholder="Why is this member being Access Locked?"
              ></textarea>

            </label>

            <button
              class="access-lock-button"
              id="accessLockButton"
              type="button"
              disabled
            >
              🔒 LOCK MEMBER
            </button>

          </div>

        </section>

        <section class="access-panel">

          <div class="access-panel-head access-active-head">

            <div>

              <small class="mono">
                CURRENT RESTRICTIONS
              </small>

              <h3>
                Active Locks
              </h3>

            </div>

            <button
              class="access-refresh"
              id="accessRefreshButton"
              type="button"
            >
              ↻ REFRESH
            </button>

          </div>

          <div class="access-panel-body">

            <div
              class="access-lock-list"
              id="accessLockList"
            >

              <div class="access-loading">
                Open Access Lock to load data.
              </div>

            </div>

          </div>

        </section>

      </div>
    `;

    main.appendChild(page);

    bindEvents();
  }

  /* =====================================================
     LIVE STATUS
  ===================================================== */

  function live(mode, text) {
    const box = $("accessLockLive");

    box?.classList.remove("loading", "error");

    if (mode === "loading") {
      box?.classList.add("loading");
    }

    if (mode === "error") {
      box?.classList.add("error");
    }

    if ($("accessLockLiveText")) {
      $("accessLockLiveText").textContent = text;
    }

    if ($("overviewAccessLockState")) {
      $("overviewAccessLockState").textContent =
        mode === "error" ? "ERROR" : mode === "loading" ? "SYNCING" : "ONLINE";
    }
  }

  /* =====================================================
     OPEN PAGE
  ===================================================== */

  function openPage() {
    const page = $("page-access-lock");

    if (!page) {
      return;
    }

    document
      .querySelectorAll(".dash-page")
      .forEach((item) => item.classList.remove("active"));

    document
      .querySelectorAll(".control-dock button")
      .forEach((button) => button.classList.remove("active"));

    page.classList.add("active");

    $("accessLockNavButton")?.classList.add("active");

    if ($("pageCode")) {
      $("pageCode").textContent = `${MODULE} / ACCESS LOCK`;
    }

    window.scrollTo({
      top: 0,

      behavior: "smooth",
    });

    loadOptions();

    loadDashboard();
  }

  /* =====================================================
     CHANNEL OPTIONS
  ===================================================== */

  async function loadOptions(force = false) {
    if (optionsLoaded && !force) {
      return;
    }

    const id = guildID();

    if (!id) {
      return;
    }

    const lockSelect = $("accessLockChannel");

    const logSelect = $("accessLogChannel");

    try {
      const data = await api(
        `/api/guild/${encodeURIComponent(id)}/${API}/options`,
      );

      const lockChannels = Array.isArray(data.lockChannels)
        ? data.lockChannels
        : [];

      const logChannels = Array.isArray(data.logChannels)
        ? data.logChannels
        : [];

      if (lockSelect) {
        lockSelect.innerHTML =
          `
            <option value="">
              Choose private lock channel...
            </option>
          ` +
          lockChannels
            .map((channel) => {
              const disabled = channel.inUse || !channel.safe;

              const suffix = channel.inUse
                ? " — IN USE"
                : !channel.safe
                  ? " — NOT PRIVATE"
                  : "";

              return `
                  <option
                    value="${esc(channel.id)}"
                    ${disabled ? "disabled" : ""}
                  >
                    #${esc(channel.name)}${esc(suffix)}
                  </option>
                `;
            })
            .join("");
      }

      if (logSelect) {
        logSelect.innerHTML =
          `
            <option value="">
              Choose log channel...
            </option>
          ` +
          logChannels
            .map(
              (channel) => `
                <option
                  value="${esc(channel.id)}"
                >
                  #${esc(channel.name)}
                </option>
              `,
            )
            .join("");
      }

      optionsLoaded = true;

      updateButton();
    } catch (error) {
      if (lockSelect) {
        lockSelect.innerHTML = `
          <option value="">
            Could not load channels
          </option>
        `;
      }

      if (logSelect) {
        logSelect.innerHTML = `
          <option value="">
            Could not load channels
          </option>
        `;
      }

      toast(error.message, "error");
    }
  }

  /* =====================================================
     MEMBER SEARCH
  ===================================================== */

  async function searchMembers(query) {
    const id = guildID();

    const box = $("accessMemberResults");

    if (!id || !box) {
      return;
    }

    if (query.trim().length < 2) {
      box.classList.remove("show");

      box.innerHTML = "";

      return;
    }

    box.classList.add("show");

    box.innerHTML = `
      <div class="access-loading">
        Searching members...
      </div>
    `;

    try {
      const data = await api(
        `/api/guild/${encodeURIComponent(
          id,
        )}/${API}/members?query=${encodeURIComponent(query)}`,
      );

      renderMembers(data.members || []);
    } catch (error) {
      box.innerHTML = `
        <div class="access-empty">
          ${esc(error.message)}
        </div>
      `;
    }
  }

  function renderMembers(members) {
    const box = $("accessMemberResults");

    if (!box) {
      return;
    }

    if (!Array.isArray(members) || !members.length) {
      box.innerHTML = `
        <div class="access-empty">
          No members found.
        </div>
      `;

      return;
    }

    box.innerHTML = members
      .map(
        (member) => `
            <button
              class="access-member-result"
              type="button"
              data-member="${esc(member.id)}"
            >

              <img
                src="${esc(member.avatar || "/arclume-logo.png")}"
                alt=""
              >

              <span>

                <b>
                  ${esc(member.displayName || member.username)}
                </b>

                <small>
                  @${esc(member.username)}
                </small>

              </span>

              <span
                class="access-result-state ${member.locked ? "locked" : ""}"
              >

                ${
                  member.locked
                    ? "LOCKED"
                    : member.administrator
                      ? "ADMIN"
                      : member.bot
                        ? "BOT"
                        : "SELECT"
                }

              </span>

            </button>
          `,
      )
      .join("");

    box.querySelectorAll("[data-member]").forEach((button) => {
      button.addEventListener(
        "click",

        () => {
          const member = members.find(
            (item) => item.id === button.dataset.member,
          );

          if (member) {
            selectMember(member);
          }
        },
      );
    });
  }

  /* =====================================================
     MEMBER SELECT
  ===================================================== */

  function selectMember(member) {
    selectedMember = member;

    const box = $("accessSelectedMember");

    if ($("accessMemberSearch")) {
      $("accessMemberSearch").value = "";
    }

    $("accessMemberResults")?.classList.remove("show");

    if (box) {
      box.classList.add("show");

      box.innerHTML = `
        <img
          src="${esc(member.avatar || "/arclume-logo.png")}"
          alt=""
        >

        <span>

          <b>
            ${esc(member.displayName || member.username)}
          </b>

          <small>
            @${esc(member.username)}
          </small>

        </span>

        <button
          class="access-selected-remove"
          id="accessRemoveSelected"
          type="button"
        >
          ✕
        </button>
      `;

      $("accessRemoveSelected")?.addEventListener("click", clearMember);
    }

    updateButton();
  }

  function clearMember() {
    selectedMember = null;

    const box = $("accessSelectedMember");

    if (box) {
      box.classList.remove("show");

      box.innerHTML = "";
    }

    updateButton();
  }

  function updateButton() {
    const button = $("accessLockButton");

    if (!button) {
      return;
    }

    const lockChannel = $("accessLockChannel")?.value || "";

    const logChannel = $("accessLogChannel")?.value || "";

    button.disabled =
      !selectedMember ||
      selectedMember.locked ||
      selectedMember.bot ||
      selectedMember.administrator ||
      !lockChannel ||
      !logChannel ||
      lockChannel === logChannel;
  }

  /* =====================================================
     STATS
  ===================================================== */

  function renderStats(stats = {}) {
    const active = Number(stats.active || 0);

    if ($("accessStatActive")) {
      $("accessStatActive").textContent = active.toLocaleString();
    }

    if ($("accessStatTemporary")) {
      $("accessStatTemporary").textContent = Number(
        stats.temporary || 0,
      ).toLocaleString();
    }

    if ($("accessStatPermanent")) {
      $("accessStatPermanent").textContent = Number(
        stats.permanent || 0,
      ).toLocaleString();
    }

    if ($("overviewAccessLockCount")) {
      $("overviewAccessLockCount").textContent = active.toLocaleString();
    }
  }

  /* =====================================================
     ACTIVE LOCKS
  ===================================================== */

  function renderLocks(locks, id) {
    const box = $("accessLockList");

    if (!box) {
      return;
    }

    if (!Array.isArray(locks) || !locks.length) {
      box.innerHTML = `
        <div class="access-empty">
          🔓 No members are currently Access Locked.
        </div>
      `;

      return;
    }

    box.innerHTML = locks
      .map((lock) => {
        const member = lock.member || {};

        const moderator = lock.moderator || {};

        const lockName = lock.lockChannel?.name
          ? `#${lock.lockChannel.name}`
          : "Missing";

        const logName = lock.logChannel?.name
          ? `#${lock.logChannel.name}`
          : "Missing";

        const url = lock.lockChannel?.id
          ? `https://discord.com/channels/${encodeURIComponent(
              id,
            )}/${encodeURIComponent(lock.lockChannel.id)}`
          : "";

        return `
              <article class="access-lock-card">

                <div class="access-lock-card-top">

                  <div class="access-lock-user">

                    <img
                      src="${esc(member.avatar || "/arclume-logo.png")}"
                      alt=""
                    >

                    <div>

                      <b>
                        ${esc(
                          member.displayName ||
                            member.username ||
                            "Unknown Member",
                        )}
                      </b>

                      <small>
                        @${esc(member.username || "unknown")}
                      </small>

                    </div>

                  </div>

                  <span class="access-lock-badge">

                    ${lock.permanent ? "PERMANENT" : "TEMPORARY"}

                  </span>

                </div>

                <div class="access-channel-strip">

                  <div class="access-channel-box">

                    <small class="mono">
                      ONLY CHANNEL MEMBER CAN SEE
                    </small>

                    <b>
                      ${esc(lockName)}
                    </b>

                  </div>

                  <div class="access-channel-box">

                    <small class="mono">
                      LOG CHANNEL
                    </small>

                    <b>
                      ${esc(logName)}
                    </b>

                  </div>

                </div>

                <div class="access-lock-meta">

                  <div>

                    <small class="mono">
                      NORMAL SERVER
                    </small>

                    <b>
                      Hidden
                    </b>

                  </div>

                  <div>

                    <small class="mono">
                      LOCKED BY
                    </small>

                    <b>
                      ${esc(
                        moderator.displayName || moderator.username || "Staff",
                      )}
                    </b>

                  </div>

                  <div>

                    <small class="mono">
                      STATUS
                    </small>

                    <b>
                      ${esc(remaining(lock.expiresAt))}
                    </b>

                  </div>

                  <div>

                    <small class="mono">
                      EXPIRES
                    </small>

                    <b>
                      ${esc(formatDate(lock.expiresAt))}
                    </b>

                  </div>

                </div>

                <div class="access-reason">

                  <b>
                    Reason:
                  </b>

                  ${esc(lock.reason || "No reason provided.")}

                </div>

                <div class="access-card-actions">

                  ${
                    url
                      ? `
                        <a
                          class="access-room-button"
                          href="${url}"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          💬 VIEW LOCK CHANNEL
                        </a>
                      `
                      : `
                        <span class="access-room-button">
                          ⚠ CHANNEL MISSING
                        </span>
                      `
                  }

                  <button
                    class="access-unlock-button"
                    type="button"
                    data-unlock="${esc(lock.userID)}"
                  >
                    🔓 UNLOCK MEMBER
                  </button>

                </div>

              </article>
            `;
      })
      .join("");

    box.querySelectorAll("[data-unlock]").forEach((button) => {
      button.addEventListener(
        "click",

        () =>
          unlockMember(
            button.dataset.unlock,

            button,
          ),
      );
    });
  }

  /* =====================================================
     LOAD DASHBOARD
  ===================================================== */

  async function loadDashboard() {
    if (loading) {
      return;
    }

    const id = guildID();

    if (!id) {
      live("error", "NO ACTIVE SERVER");

      return;
    }

    loading = true;

    live("loading", "SYNCING ACCESS DATA");

    if ($("accessLockList")) {
      $("accessLockList").innerHTML = `
        <div class="access-loading">
          Loading active restrictions...
        </div>
      `;
    }

    try {
      const data = await api(`/api/guild/${encodeURIComponent(id)}/${API}`);

      renderStats(data.stats || {});

      renderLocks(data.locks || [], id);

      live("ready", "LIVE");
    } catch (error) {
      console.error("❌ Access Lock dashboard error:", error);

      live("error", "SYNC ERROR");

      if ($("accessLockList")) {
        $("accessLockList").innerHTML = `
          <div class="access-empty">
            ${esc(error.message)}
          </div>
        `;
      }
    } finally {
      loading = false;
    }
  }

  /* =====================================================
     LOCK MEMBER
  ===================================================== */

  async function lockMember() {
    const id = guildID();

    if (!id || !selectedMember) {
      return;
    }

    const button = $("accessLockButton");

    const lockChannelID = $("accessLockChannel")?.value || "";

    const logChannelID = $("accessLogChannel")?.value || "";

    const duration = $("accessDuration")?.value || "permanent";

    const reason = $("accessReason")?.value?.trim() || "";

    if (!lockChannelID) {
      toast("Choose a Lock Channel.", "error");

      return;
    }

    if (!logChannelID) {
      toast("Choose a Log Channel.", "error");

      return;
    }

    if (lockChannelID === logChannelID) {
      toast("Lock Channel and Log Channel must be different.", "error");

      return;
    }

    if (!reason) {
      toast("Enter a reason before locking this member.", "error");

      return;
    }

    if (button) {
      button.disabled = true;

      button.textContent = "LOCKING...";
    }

    try {
      const data = await api(
        `/api/guild/${encodeURIComponent(id)}/${API}/lock`,

        {
          method: "POST",

          body: JSON.stringify({
            userID: selectedMember.id,

            lockChannelID,

            logChannelID,

            duration,

            reason,
          }),
        },
      );

      toast(data.message || "Member Access Locked.");

      clearMember();

      if ($("accessReason")) {
        $("accessReason").value = "";
      }

      if ($("accessDuration")) {
        $("accessDuration").value = "permanent";
      }

      if ($("accessLockChannel")) {
        $("accessLockChannel").value = "";
      }

      optionsLoaded = false;

      await loadOptions(true);

      await loadDashboard();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      if (button) {
        button.textContent = "🔒 LOCK MEMBER";

        updateButton();
      }
    }
  }

  /* =====================================================
     UNLOCK MEMBER
  ===================================================== */

  async function unlockMember(userID, button) {
    const id = guildID();

    if (!id || !userID) {
      return;
    }

    if (!window.confirm("Restore this member's normal server access?")) {
      return;
    }

    const oldText = button.textContent;

    button.disabled = true;

    button.textContent = "UNLOCKING...";

    try {
      const data = await api(
        `/api/guild/${encodeURIComponent(id)}/${API}/unlock`,

        {
          method: "POST",

          body: JSON.stringify({
            userID,

            reason: "Unlocked from Arclume Dashboard.",
          }),
        },
      );

      toast(data.message || "Member access restored.");

      optionsLoaded = false;

      await loadOptions(true);

      await loadDashboard();
    } catch (error) {
      button.disabled = false;

      button.textContent = oldText;

      toast(error.message, "error");
    }
  }

  /* =====================================================
     EVENTS
  ===================================================== */

  function bindEvents() {
    $("accessMemberSearch")?.addEventListener(
      "input",

      (event) => {
        clearTimeout(searchTimer);

        searchTimer = setTimeout(
          () => searchMembers(event.target.value),

          320,
        );
      },
    );

    $("accessMemberSearch")?.addEventListener(
      "keydown",

      (event) => {
        if (event.key === "Escape") {
          $("accessMemberResults")?.classList.remove("show");
        }
      },
    );

    $("accessLockChannel")?.addEventListener("change", updateButton);

    $("accessLogChannel")?.addEventListener("change", updateButton);

    $("accessLockButton")?.addEventListener("click", lockMember);

    $("accessRefreshButton")?.addEventListener(
      "click",

      async () => {
        optionsLoaded = false;

        await loadOptions(true);

        await loadDashboard();
      },
    );

    document.addEventListener(
      "click",

      (event) => {
        const wrap = document.querySelector(".access-search-wrap");

        if (wrap && !wrap.contains(event.target)) {
          $("accessMemberResults")?.classList.remove("show");
        }
      },
    );
  }

  /* =====================================================
     SERVER CHANGE
  ===================================================== */

  function watchGuild() {
    let previous = guildID();

    setInterval(
      () => {
        const next = guildID();

        if (!next || next === previous) {
          return;
        }

        previous = next;

        selectedMember = null;

        optionsLoaded = false;

        clearMember();

        if ($("page-access-lock")?.classList.contains("active")) {
          loadOptions(true);

          loadDashboard();
        }
      },

      1200,
    );
  }

  /* =====================================================
     INIT
  ===================================================== */

  function init() {
    /*
      Restore Applications first.
    */

    ensureApplications();

    /*
      Load Access Lock.
    */

    styles();

    buildNav();

    buildOverview();

    buildSystemCard();

    buildPage();

    watchGuild();

    /*
      Retry because dashboard modules
      load at slightly different times.
    */

    [300, 800, 1500, 2500].forEach((delay) => {
      setTimeout(
        () => {
          ensureApplications();

          buildNav();

          buildOverview();

          buildSystemCard();

          normalizeDockOrder();
        },

        delay,
      );
    });

    console.log("🔒 Arclume Access Lock dashboard loaded as module 13");
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,

      {
        once: true,
      },
    );
  } else {
    init();
  }

  window.ArclumeAccessLock = {
    open: openPage,

    load: loadDashboard,

    loadOptions,
  };
})();
