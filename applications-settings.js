"use strict";

(() => {
  "use strict";

  const PAGE_ID = "page-applications";
  const NAV_ID = "applicationsNavButton";
  const STYLE_ID = "arclumeApplicationsStyles";

  let loading = false;

  let forms = [];

  let submissions = [];

  let stats = null;

  let options = {
    roles: [],
    channels: [],
  };

  let selectedFormID = null;

  let selectedSubmissionID = null;

  const $ = (id) => document.getElementById(id);

  /* =====================================================
     HELPERS
  ===================================================== */

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function guildID() {
    if (window.currentGuild?.id) {
      return String(window.currentGuild.id);
    }

    return $("identityServerId")?.textContent?.match(/\d{5,32}/)?.[0] || "";
  }

  function toast(message) {
    if (typeof window.toast === "function") {
      window.toast(message);

      return;
    }

    const box = $("toast");

    if (!box) {
      console.log(message);

      return;
    }

    box.textContent = message;

    box.classList.add("show");

    clearTimeout(toast.timer);

    toast.timer = setTimeout(
      () => box.classList.remove("show"),

      2800,
    );
  }

  function setText(id, value) {
    const element = $(id);

    if (element) {
      element.textContent = String(value ?? "");
    }
  }

  async function api(url, options = {}) {
    const response = await fetch(
      url,

      {
        credentials: "same-origin",

        ...options,
      },
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  }

  function statusLabel(value) {
    return String(value || "")
      .replaceAll("_", " ")
      .replace(
        /\b\w/g,

        (character) => character.toUpperCase(),
      );
  }

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleString(
      [],

      {
        year: "numeric",

        month: "short",

        day: "numeric",

        hour: "2-digit",

        minute: "2-digit",
      },
    );
  }

  function roleOptions(selected = "") {
    const rows = [`<option value="">No automatic role</option>`];

    for (const role of options.roles || []) {
      rows.push(
        `
          <option
            value="${esc(role.id)}"
            ${String(role.id) === String(selected) ? "selected" : ""}
          >
            ${esc(role.name)}
          </option>
        `,
      );
    }

    return rows.join("");
  }

  function channelOptions(selected = "", emptyLabel = "No channel") {
    const rows = [
      `
        <option value="">
          ${esc(emptyLabel)}
        </option>
      `,
    ];

    for (const channel of options.channels || []) {
      rows.push(
        `
          <option
            value="${esc(channel.id)}"
            ${String(channel.id) === String(selected) ? "selected" : ""}
          >
            #${esc(channel.name)}
          </option>
        `,
      );
    }

    return rows.join("");
  }

  /* =====================================================
     STYLES
  ===================================================== */

  function injectStyles() {
    if ($(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");

    style.id = STYLE_ID;

    style.textContent = `
      #${PAGE_ID} {
        --a-purple: #a78bfa;
        --a-green: #9effc7;
        --a-yellow: #ffd37a;
        --a-red: #ff7c8e;
        --a-border: rgba(255,255,255,.1);
        --a-muted: rgba(245,242,255,.48);

        padding-bottom: 140px;
      }

      .app-violet {
        color: #cbbcff !important;
      }

      .apps-hero {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;

        gap: 24px;

        margin-bottom: 22px;
      }

      .apps-hero h1 {
        margin:
          8px 0 12px;

        font:
          800
          clamp(
            42px,
            7vw,
            80px
          ) /
          .92
          "Syne",
          sans-serif;

        letter-spacing:
          -.055em;
      }

      .apps-hero h1 span {
        color:
          var(--a-purple);
      }

      .apps-hero p {
        max-width:
          760px;

        margin: 0;

        color:
          var(--a-muted);

        line-height:
          1.65;
      }

      .apps-live {
        min-width:
          180px;

        padding:
          14px 17px;

        border:
          1px solid
          var(--a-border);

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

      .apps-live small,
      .apps-small {
        display:
          block;

        color:
          rgba(
            245,
            242,
            255,
            .4
          );

        font-size:
          9px;

        letter-spacing:
          .1em;
      }

      .apps-live strong {
        display:
          flex;

        align-items:
          center;

        gap:
          8px;

        margin-top:
          7px;

        font-family:
          "Syne",
          sans-serif;
      }

      .apps-dot {
        width:
          9px;

        height:
          9px;

        border-radius:
          50%;

        background:
          var(--a-yellow);

        box-shadow:
          0 0 15px
          rgba(
            255,
            211,
            122,
            .65
          );
      }

      .apps-live.online
      .apps-dot {
        background:
          var(--a-green);

        box-shadow:
          0 0 15px
          rgba(
            158,
            255,
            199,
            .65
          );
      }

      .apps-live.error
      .apps-dot {
        background:
          var(--a-red);
      }

      .apps-toolbar {
        display:
          flex;

        justify-content:
          space-between;

        align-items:
          center;

        gap:
          14px;

        margin-bottom:
          18px;

        padding:
          13px;

        border:
          1px solid
          var(--a-border);

        border-radius:
          20px;

        background:
          rgba(
            255,
            255,
            255,
            .02
          );
      }

      .apps-toolbar-left {
        display:
          flex;

        align-items:
          center;

        gap:
          12px;
      }

      .apps-toolbar-icon {
        width:
          40px;

        height:
          40px;

        display:
          grid;

        place-items:
          center;

        border:
          1px solid
          rgba(
            167,
            139,
            250,
            .2
          );

        border-radius:
          12px;

        background:
          rgba(
            167,
            139,
            250,
            .06
          );
          }
          
      .apps-actions {
        display:
          flex;

        flex-wrap:
          wrap;

        gap:
          8px;
      }

      .apps-btn {
        min-height:
          40px;

        padding:
          0 14px;

        border:
          1px solid
          var(--a-border);

        border-radius:
          11px;

        background:
          rgba(
            255,
            255,
            255,
            .035
          );

        color:
          #fff;

        font:
          600
          10px
          inherit;

        letter-spacing:
          .06em;

        cursor:
          pointer;
      }

      .apps-btn:hover {
        background:
          rgba(
            255,
            255,
            255,
            .07
          );
      }

      .apps-btn.primary {
        border-color:
          rgba(
            167,
            139,
            250,
            .34
          );

        background:
          rgba(
            124,
            92,
            255,
            .12
          );
      }

      .apps-btn.green {
        border-color:
          rgba(
            158,
            255,
            199,
            .3
          );

        background:
          rgba(
            158,
            255,
            199,
            .07
          );

        color:
          #bcffd7;
      }

      .apps-btn.red {
        border-color:
          rgba(
            255,
            124,
            142,
            .3
          );

        background:
          rgba(
            255,
            124,
            142,
            .07
          );

        color:
          #ffa5b0;
      }

      .apps-btn.yellow {
        border-color:
          rgba(
            255,
            211,
            122,
            .28
          );

        background:
          rgba(
            255,
            211,
            122,
            .06
          );

        color:
          #ffe2a7;
      }

      .apps-btn:disabled {
        opacity:
          .45;

        cursor:
          not-allowed;
      }

      .apps-metrics {
        display:
          grid;

        grid-template-columns:
          repeat(
            5,
            minmax(
              0,
              1fr
            )
          );

        gap:
          11px;

        margin-bottom:
          18px;
      }

      .apps-metric {
        padding:
          16px;

        border:
          1px solid
          var(--a-border);

        border-radius:
          18px;

        background:
          rgba(
            255,
            255,
            255,
            .02
          );
      }

      .apps-metric strong {
        display:
          block;

        margin-top:
          11px;

        font:
          700
          24px
          "Syne",
          sans-serif;
      }

      .apps-metric p {
        margin:
          5px 0 0;

        color:
          var(--a-muted);

        font-size:
          9px;

        line-height:
          1.45;
      }

      .apps-layout {
        display:
          grid;

        grid-template-columns:
          minmax(
            0,
            1.05fr
          )
          minmax(
            340px,
            .95fr
          );

        gap:
          17px;
      }

      .apps-stack {
        display:
          grid;

        gap:
          17px;
      }

      .apps-box {
        overflow:
          hidden;

        border:
          1px solid
          var(--a-border);

        border-radius:
          22px;

        background:
          rgba(
            255,
            255,
            255,
            .018
          );
      }

      .apps-head {
        display:
          flex;

        justify-content:
          space-between;

        align-items:
          flex-start;

        gap:
          16px;

        padding:
          19px 20px;

        border-bottom:
          1px solid
          rgba(
            255,
            255,
            255,
            .07
          );
      }

      .apps-head h3 {
        margin:
          5px 0 0;

        font:
          700
          18px
          "Syne",
          sans-serif;
      }

      .apps-head p {
        max-width:
          560px;

        margin:
          6px 0 0;

        color:
          var(--a-muted);

        font-size:
          10px;

        line-height:
          1.55;
      }

      .apps-body {
        padding:
          19px;
      }

      .apps-list {
        display:
          grid;

        gap:
          9px;
      }

      .apps-empty {
        padding:
          25px 14px;

        border:
          1px dashed
          rgba(
            255,
            255,
            255,
            .1
          );

        border-radius:
          15px;

        color:
          rgba(
            245,
            242,
            255,
            .42
          );

        font-size:
          10px;

        text-align:
          center;
      }

      .apps-card {
        display:
          grid;

        grid-template-columns:
          minmax(
            0,
            1fr
          )
          auto;

        gap:
          12px;

        padding:
          14px;

        border:
          1px solid
          rgba(
            255,
            255,
            255,
            .08
          );

        border-radius:
          16px;

        background:
          rgba(
            255,
            255,
            255,
            .02
          );
      }

      .apps-card:hover {
        border-color:
          rgba(
            255,
            255,
            255,
            .14
          );
      }

      .apps-card-title {
        display:
          flex;

        align-items:
          center;

        flex-wrap:
          wrap;

        gap:
          7px;
      }

      .apps-card-title b {
        font-size:
          12px;
      }

      .apps-card p {
        margin:
          8px 0 0;

        color:
          rgba(
            245,
            242,
            255,
            .58
          );

        font-size:
          10px;

        line-height:
          1.5;
      }

      .apps-meta {
        display:
          flex;

        flex-wrap:
          wrap;

        gap:
          6px;

        margin-top:
          10px;
      }

      .apps-chip {
        display:
          inline-flex;

        align-items:
          center;

        padding:
          5px 7px;

        border:
          1px solid
          rgba(
            255,
            255,
            255,
            .08
          );

        border-radius:
          999px;

        background:
          rgba(
            255,
            255,
            255,
            .025
          );

        color:
          rgba(
            245,
            242,
            255,
            .58
          );

        font-size:
          8px;
      }

      .apps-chip.green {
        border-color:
          rgba(
            158,
            255,
            199,
            .18
          );

        color:
          #b9ffd5;
      }

      .apps-chip.red {
        border-color:
          rgba(
            255,
            124,
            142,
            .2
          );

        color:
          #ffa5b0;
      }

      .apps-chip.purple {
        border-color:
          rgba(
            167,
            139,
            250,
            .2
          );

        color:
          #cbbcff;
      }

      .apps-chip.yellow {
        border-color:
          rgba(
            255,
            211,
            122,
            .2
          );

        color:
          #ffe3ac;
      }

      .apps-mini {
        min-height:
          33px;

        padding:
          0 9px;

        border:
          1px solid
          rgba(
            255,
            255,
            255,
            .1
          );

        border-radius:
          9px;

        background:
          rgba(
            255,
            255,
            255,
            .03
          );

        color:
          #fff;

        font:
          600
          8px
          inherit;

        cursor:
          pointer;
      }

      .apps-mini:hover {
        background:
          rgba(
            255,
            255,
            255,
            .07
          );
      }

      .apps-grid {
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
          12px;
      }

      .apps-field {
        display:
          block;
      }

      .apps-field.full {
        grid-column:
          1 / -1;
      }

      .apps-field small {
        display:
          block;

        margin-bottom:
          8px;

        color:
          rgba(
            245,
            242,
            255,
            .4
          );

        font-size:
          9px;

        letter-spacing:
          .09em;
      }

      .apps-field input,
      .apps-field select,
      .apps-field textarea {
        width:
          100%;

        min-height:
          44px;

        padding:
          10px 12px;

        border:
          1px solid
          rgba(
            255,
            255,
            255,
            .11
          );

        border-radius:
          12px;

        outline:
          none;

        background:
          #0d0d13;

        color:
          #fff;

        font:
          inherit;
      }

      .apps-field textarea {
        min-height:
          95px;

        resize:
          vertical;
      }

      .apps-field input:focus,
      .apps-field select:focus,
      .apps-field textarea:focus {
        border-color:
          rgba(
            167,
            139,
            250,
            .55
          );
      }

      .apps-q-list {
        display:
          grid;

        gap:
          8px;

        margin-top:
          10px;
      }

      .apps-question {
        display:
          grid;

        grid-template-columns:
          minmax(
            0,
            1fr
          )
          130px
          90px
          auto;

        gap:
          8px;

        align-items:
          center;

        padding:
          9px;

        border:
          1px solid
          rgba(
            255,
            255,
            255,
            .07
          );

        border-radius:
          12px;

        background:
          rgba(
            255,
            255,
            255,
            .02
          );
      }

      .apps-question input,
      .apps-question select {
        width:
          100%;

        min-height:
          38px;

        padding:
          8px;

        border:
          1px solid
          rgba(
            255,
            255,
            255,
            .1
          );

        border-radius:
          9px;

        background:
          #0d0d13;

        color:
          #fff;
      }

      .apps-question button {
        min-height:
          36px;

        padding:
          0 9px;

        border:
          1px solid
          rgba(
            255,
            124,
            142,
            .25
          );

        border-radius:
          9px;

        background:
          rgba(
            255,
            124,
            142,
            .06
          );

        color:
          #ffa5b0;

        cursor:
          pointer;
      }

      .apps-profile {
        display:
          flex;

        align-items:
          center;

        gap:
          12px;
      }

      .apps-avatar {
        width:
          56px;

        height:
          56px;

        flex:
          0 0 56px;

        overflow:
          hidden;

        border-radius:
          50%;

        background:
          rgba(
            255,
            255,
            255,
            .05
          );
      }

      .apps-avatar img {
        width:
          100%;

        height:
          100%;

        object-fit:
          cover;
      }

      .apps-profile h4 {
        margin:
          0;

        font:
          700
          15px
          "Syne",
          sans-serif;
      }

      .apps-profile p {
        margin:
          4px 0 0;

        color:
          var(--a-muted);

        font-size:
          9px;
      }

      .apps-answer {
        margin-top:
          10px;

        padding:
          11px;

        border:
          1px solid
          rgba(
            255,
            255,
            255,
            .07
          );

        border-radius:
          12px;

        background:
          rgba(
            255,
            255,
            255,
            .02
          );
      }

      .apps-answer small {
        display:
          block;

        color:
          rgba(
            245,
            242,
            255,
            .42
          );

        font-size:
          8px;

        letter-spacing:
          .08em;
      }

      .apps-answer p {
        margin:
          7px 0 0;

        color:
          rgba(
            245,
            242,
            255,
            .72
          );

        font-size:
          10px;

        line-height:
          1.55;

        white-space:
          pre-wrap;
      }

      .apps-loading {
        opacity:
          .55;

        pointer-events:
          none;
      }

      @media (
        max-width:
          1100px
      ) {
        .apps-layout {
          grid-template-columns:
            1fr;
        }

        .apps-metrics {
          grid-template-columns:
            repeat(
              2,
              minmax(
                0,
                1fr
              )
            );
        }
      }

      @media (
        max-width:
          720px
      ) {
        .apps-hero,
        .apps-toolbar {
          align-items:
            stretch;

          flex-direction:
            column;
        }

        .apps-actions {
          display:
            grid;

          grid-template-columns:
            1fr;
        }

        .apps-btn {
          width:
            100%;
        }

        .apps-metrics,
        .apps-grid {
          grid-template-columns:
            1fr;
        }

        .apps-question {
          grid-template-columns:
            1fr;
        }

        .apps-card {
          grid-template-columns:
            1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* =====================================================
     PAGE
  ===================================================== */

  function buildPage() {
    if ($(PAGE_ID)) {
      return;
    }

    const main = document.querySelector(".control-main");

    if (!main) {
      return;
    }

    const page = document.createElement("section");

    page.className = "dash-page";

    page.id = PAGE_ID;

    page.innerHTML = `
      <div class="apps-hero">
        <div>
          <span class="mono eyebrow">
            12 / APPLICATIONS CENTER
          </span>

          <h1>
            Applications
            <br>

            <span>
              Studio.
            </span>
          </h1>

          <p>
            Create application types, manage questions and requirements,
            review submissions, accept or deny applicants,
            and assign roles automatically.
          </p>
        </div>

        <div
          class="apps-live"
          id="appsLiveState"
        >
          <small class="mono">
            APPLICATIONS API
          </small>

          <strong>
            <i class="apps-dot"></i>

            <span id="appsLiveText">
              WAITING
            </span>
          </strong>
        </div>
      </div>

      <div class="apps-toolbar">
        <div class="apps-toolbar-left">
          <span class="apps-toolbar-icon">
            📋
          </span>

          <div>
            <span class="apps-small mono">
              ARCLUME / APPLICATIONS
            </span>

            <b id="appsCommandStatus">
              READY TO SYNC
            </b>
          </div>
        </div>

        <div class="apps-actions">
          <button
            class="apps-btn"
            id="appsRefreshButton"
            type="button"
          >
            REFRESH
          </button>

          <button
            class="apps-btn primary"
            id="appsNewFormButton"
            type="button"
          >
            + NEW APPLICATION
          </button>
        </div>
      </div>

      <div class="apps-metrics">
        <article class="apps-metric">
          <span class="apps-small mono">
            FORMS
          </span>

          <strong id="appsMetricForms">
            0
          </strong>

          <p>
            Total application types.
          </p>
        </article>

        <article class="apps-metric">
          <span class="apps-small mono">
            OPEN
          </span>

          <strong id="appsMetricOpen">
            0
          </strong>

          <p>
            Forms accepting applications.
          </p>
        </article>

        <article class="apps-metric">
          <span class="apps-small mono">
            PENDING
          </span>

          <strong id="appsMetricPending">
            0
          </strong>

          <p>
            Waiting for staff review.
          </p>
        </article>

        <article class="apps-metric">
          <span class="apps-small mono">
            ACCEPTED
          </span>

          <strong id="appsMetricAccepted">
            0
          </strong>

          <p>
            Accepted submissions.
          </p>
        </article>

        <article class="apps-metric">
          <span class="apps-small mono">
            DENIED
          </span>

          <strong id="appsMetricDenied">
            0
          </strong>

          <p>
            Denied submissions.
          </p>
        </article>
      </div>

      <div class="apps-layout">
        <div class="apps-stack">
          <section class="apps-box">
            <header class="apps-head">
              <div>
                <span class="apps-small mono">
                  01 / FORMS
                </span>

                <h3>
                  Application Types
                </h3>

                <p>
                  Moderator, Support Team, Event Staff,
                  Beta Tester, Partnerships and your
                  own custom forms.
                </p>
              </div>
            </header>

            <div class="apps-body">
              <div
                class="apps-list"
                id="appsFormsList"
              >
                <div class="apps-empty">
                  Loading application forms...
                </div>
              </div>
            </div>
          </section>

          <section class="apps-box">
            <header class="apps-head">
              <div>
                <span class="apps-small mono">
                  02 / SUBMISSIONS
                </span>

                <h3>
                  Review Queue
                </h3>

                <p>
                  Open applicant profiles,
                  inspect every answer and make
                  a staff decision.
                </p>
              </div>

              <label
                class="apps-field"
                style="min-width:170px"
              >
                <small class="mono">
                  FILTER
                </small>

                <select id="appsStatusFilter">
                  <option value="">
                    All statuses
                  </option>

                  <option value="pending">
                    Pending
                  </option>

                  <option value="under_review">
                    Under Review
                  </option>

                  <option value="accepted">
                    Accepted
                  </option>

                  <option value="denied">
                    Denied
                  </option>

                  <option value="withdrawn">
                    Withdrawn
                  </option>
                </select>
              </label>
            </header>

            <div class="apps-body">
              <div
                class="apps-list"
                id="appsSubmissionsList"
              >
                <div class="apps-empty">
                  No submissions loaded yet.
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside class="apps-stack">
          <section class="apps-box">
            <header class="apps-head">
              <div>
                <span class="apps-small mono">
                  03 / FORM EDITOR
                </span>

                <h3 id="appsEditorTitle">
                  Create Application
                </h3>

                <p>
                  Build the form members will
                  see on the public application website.
                </p>
              </div>
            </header>

            <div class="apps-body">
              <input
                id="appsFormID"
                type="hidden"
              >

              <div class="apps-grid">
                <label class="apps-field">
                  <small class="mono">
                    NAME
                  </small>

                  <input
                    id="appsFormName"
                    type="text"
                    placeholder="Moderator Application"
                  >
                </label>

                <label class="apps-field">
                  <small class="mono">
                    EMOJI
                  </small>

                  <input
                    id="appsFormEmoji"
                    type="text"
                    maxlength="16"
                    placeholder="🛡️"
                  >
                </label>

                <label class="apps-field full">
                  <small class="mono">
                    DESCRIPTION
                  </small>

                  <textarea
                    id="appsFormDescription"
                    placeholder="Tell members what this application is for..."
                  ></textarea>
                </label>

                <label class="apps-field">
                  <small class="mono">
                    ACCEPTED ROLE
                  </small>

                  <select id="appsAcceptedRole">
                  </select>
                </label>

                <label class="apps-field">
                  <small class="mono">
                    REVIEW CHANNEL
                  </small>

                  <select id="appsReviewChannel">
                  </select>
                </label>

                <label class="apps-field">
                  <small class="mono">
                    LOG CHANNEL
                  </small>

                  <select id="appsLogChannel">
                  </select>
                </label>

                <label class="apps-field">
                  <small class="mono">
                    COOLDOWN HOURS
                  </small>

                  <input
                    id="appsCooldown"
                    type="number"
                    min="0"
                    max="8760"
                    value="24"
                  >
                </label>

                <label class="apps-field">
                  <small class="mono">
                    MIN ACCOUNT AGE / DAYS
                  </small>

                  <input
                    id="appsAccountAge"
                    type="number"
                    min="0"
                    max="3650"
                    value="0"
                  >
                </label>

                <label class="apps-field">
                  <small class="mono">
                    MIN SERVER AGE / DAYS
                  </small>

                  <input
                    id="appsServerAge"
                    type="number"
                    min="0"
                    max="3650"
                    value="0"
                  >
                </label>
              </div>

              <div style="margin-top:16px">
                <span class="apps-small mono">
                  QUESTIONS
                </span>

                <div
                  class="apps-q-list"
                  id="appsQuestions"
                ></div>
              </div>

              <div
                class="apps-actions"
                style="margin-top:10px"
              >
                <button
                  class="apps-btn"
                  id="appsAddQuestionButton"
                  type="button"
                >
                  + ADD QUESTION
                </button>
              </div>

              <div
                class="apps-actions"
                style="margin-top:16px"
              >
                <button
                  class="apps-btn primary"
                  id="appsSaveFormButton"
                  type="button"
                >
                  SAVE APPLICATION
                </button>

                <button
                  class="apps-btn"
                  id="appsResetFormButton"
                  type="button"
                >
                  CLEAR
                </button>
              </div>
            </div>
          </section>

          <section class="apps-box">
            <header class="apps-head">
              <div>
                <span class="apps-small mono">
                  04 / REVIEW
                </span>

                <h3>
                  Application Review
                </h3>

                <p>
                  Select a submission to inspect
                  the applicant and answers.
                </p>
              </div>
            </header>

            <div class="apps-body">
              <div id="appsReviewPanel">
                <div class="apps-empty">
                  Select an application from
                  the review queue.
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    `;

    main.appendChild(page);
  }

  /* =====================================================
     NAVIGATION
  ===================================================== */

  function buildNavigation() {
    const dock = document.querySelector(".control-dock");

    if (dock && !$(NAV_ID)) {
      const logout = Array.from(dock.children).find(
        (child) =>
          child.querySelector("b")?.textContent?.trim().toLowerCase() ===
          "logout",
      );

      const button = document.createElement("button");

      button.id = NAV_ID;

      button.type = "button";

      button.innerHTML = `
        <span>
          12
        </span>

        <b>
          Applications
        </b>
      `;

      button.addEventListener(
        "click",

        openApplications,
      );

      if (logout) {
        dock.insertBefore(
          button,

          logout,
        );
      } else {
        dock.appendChild(button);
      }
    }

    if (!$("overviewApplicationsButton")) {
      const ledger = document.querySelector("#page-overview .ledger-table");

      if (ledger) {
        const row = document.createElement("button");

        row.className = "ledger-row";

        row.id = "overviewApplicationsButton";

        row.type = "button";

        row.innerHTML = `
          <span class="ledger-index mono">
            12
          </span>

          <span class="ledger-symbol app-violet">
            A
          </span>

          <span class="ledger-name">
            <small class="mono">
              RECRUITMENT
            </small>

            <b>
              Applications Studio
            </b>
          </span>

          <span class="ledger-value">
            <small class="mono">
              PENDING
            </small>

            <b id="overviewApplicationsCount">
              0
            </b>
          </span>

          <span class="ledger-state">
            <i></i>

            <b id="overviewApplicationsState">
              AVAILABLE
            </b>
          </span>

          <span class="ledger-arrow">
            &gt;
          </span>
        `;

        row.addEventListener(
          "click",

          openApplications,
        );

        ledger.appendChild(row);
      }
    }

    if (!$("systemApplicationsButton")) {
      const index = document.querySelector("#page-systems .system-index");

      if (index) {
        const row = document.createElement("article");

        row.className = "system-index-row live";

        row.innerHTML = `
          <span class="mono">
            12
          </span>

          <span class="system-index-symbol app-violet">
            A
          </span>

          <div>
            <small class="mono">
              RECRUITMENT
            </small>

            <h3>
              Applications Studio
            </h3>

            <p>
              Custom forms, applicant reviews
              and automatic accepted roles.
            </p>
          </div>

          <b class="mono">
            AVAILABLE
          </b>

          <button
            id="systemApplicationsButton"
            type="button"
          >
            OPEN
          </button>
        `;

        index.appendChild(row);

        $("systemApplicationsButton")?.addEventListener(
          "click",

          openApplications,
        );
      }
    }
  }

  function openApplications() {
    const page = $(PAGE_ID);

    if (!page) {
      return;
    }

    document
      .querySelectorAll(".dash-page")
      .forEach((item) => item.classList.remove("active"));

    document
      .querySelectorAll(".control-dock button")
      .forEach((item) => item.classList.remove("active"));

    page.classList.add("active");

    $(NAV_ID)?.classList.add("active");

    setText(
      "pageCode",

      "12 / APPLICATIONS",
    );

    window.scrollTo({
      top: 0,

      behavior: "smooth",
    });

    loadAll();
  }

  /* =====================================================
     FORM EDITOR
  ===================================================== */

  function resetEditor() {
    selectedFormID = null;

    $("appsFormID").value = "";

    $("appsFormName").value = "";

    $("appsFormEmoji").value = "📋";

    $("appsFormDescription").value = "";

    $("appsAcceptedRole").innerHTML = roleOptions("");

    $("appsReviewChannel").innerHTML = channelOptions(
      "",

      "No review channel",
    );

    $("appsLogChannel").innerHTML = channelOptions(
      "",

      "No log channel",
    );

    $("appsCooldown").value = "24";

    $("appsAccountAge").value = "0";

    $("appsServerAge").value = "0";

    $("appsQuestions").innerHTML = "";

    setText(
      "appsEditorTitle",

      "Create Application",
    );

    addQuestion();
  }

  function addQuestion(question = {}) {
    const list = $("appsQuestions");

    if (!list) {
      return;
    }

    const row = document.createElement("div");

    row.className = "apps-question";

    row.innerHTML = `
      <input
        class="apps-question-label"
        type="text"
        placeholder="Question"
        value="${esc(question.label || "")}"
      >

      <select class="apps-question-type">
        <option
          value="short"
          ${question.type === "short" ? "selected" : ""}
        >
          Short
        </option>

        <option
          value="long"
          ${question.type === "long" ? "selected" : ""}
        >
          Long
        </option>

        <option
          value="yesno"
          ${question.type === "yesno" ? "selected" : ""}
        >
          Yes / No
        </option>

        <option
          value="select"
          ${question.type === "select" ? "selected" : ""}
        >
          Select
        </option>

        <option
          value="multi"
          ${question.type === "multi" ? "selected" : ""}
        >
          Multi-select
        </option>
      </select>

      <select class="apps-question-required">
        <option
          value="true"
          ${question.required !== false ? "selected" : ""}
        >
          Required
        </option>

        <option
          value="false"
          ${question.required === false ? "selected" : ""}
        >
          Optional
        </option>
      </select>

      <button type="button">
        REMOVE
      </button>

      <input
        class="apps-question-options"
        style="
          grid-column:1/-1;
          display:${
            ["select", "multi"].includes(question.type) ? "block" : "none"
          };
        "
        type="text"
        placeholder="Options separated by commas"
        value="${esc(
          Array.isArray(question.options) ? question.options.join(", ") : "",
        )}"
      >
    `;

    const typeSelect = row.querySelector(".apps-question-type");

    const optionsInput = row.querySelector(".apps-question-options");

    typeSelect.addEventListener(
      "change",

      () => {
        optionsInput.style.display = ["select", "multi"].includes(
          typeSelect.value,
        )
          ? "block"
          : "none";
      },
    );

    row.querySelector("button")?.addEventListener(
      "click",

      () => row.remove(),
    );

    list.appendChild(row);
  }

  function collectQuestions() {
    return Array.from(
      document.querySelectorAll("#appsQuestions .apps-question"),
    )
      .map((row, index) => {
        const label =
          row.querySelector(".apps-question-label")?.value?.trim() || "";

        const type = row.querySelector(".apps-question-type")?.value || "short";

        const required =
          row.querySelector(".apps-question-required")?.value !== "false";

        const optionsText =
          row.querySelector(".apps-question-options")?.value || "";

        return {
          id: `question_${index + 1}`,

          label,

          type,

          required,

          options: ["select", "multi"].includes(type)
            ? optionsText
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
            : [],
        };
      })
      .filter((question) => question.label);
  }

  function editForm(formID) {
    const form = forms.find((item) => item.formID === formID);

    if (!form) {
      return;
    }

    selectedFormID = form.formID;

    $("appsFormID").value = form.formID;

    $("appsFormName").value = form.name || "";

    $("appsFormEmoji").value = form.emoji || "📋";

    $("appsFormDescription").value = form.description || "";

    $("appsAcceptedRole").innerHTML = roleOptions(form.acceptedRoleID || "");

    $("appsReviewChannel").innerHTML = channelOptions(
      form.reviewChannelID || "",

      "No review channel",
    );

    $("appsLogChannel").innerHTML = channelOptions(
      form.logChannelID || "",

      "No log channel",
    );

    $("appsCooldown").value = String(form.cooldownHours ?? 24);

    $("appsAccountAge").value = String(form.requireAccountAgeDays ?? 0);

    $("appsServerAge").value = String(form.requireServerAgeDays ?? 0);

    $("appsQuestions").innerHTML = "";

    (form.questions || []).forEach(addQuestion);

    if (!(form.questions || []).length) {
      addQuestion();
    }

    setText(
      "appsEditorTitle",

      `Edit ${form.name}`,
    );

    $("appsFormName")?.scrollIntoView({
      behavior: "smooth",

      block: "center",
    });
  }

  async function saveForm() {
    const id = guildID();

    if (!id) {
      toast("NO ACTIVE SERVER");

      return;
    }

    const name = $("appsFormName")?.value?.trim() || "";

    if (!name) {
      toast("APPLICATION NAME IS REQUIRED");

      return;
    }

    const body = {
      name,

      emoji: $("appsFormEmoji")?.value?.trim() || "📋",

      description: $("appsFormDescription")?.value?.trim() || "",

      acceptedRoleID: $("appsAcceptedRole")?.value || "",

      reviewChannelID: $("appsReviewChannel")?.value || "",

      logChannelID: $("appsLogChannel")?.value || "",

      cooldownHours: Number($("appsCooldown")?.value || 0),

      requireAccountAgeDays: Number($("appsAccountAge")?.value || 0),

      requireServerAgeDays: Number($("appsServerAge")?.value || 0),

      allowResubmit: true,

      maxPendingPerUser: 1,

      questions: collectQuestions(),
    };

    const button = $("appsSaveFormButton");

    if (button) {
      button.disabled = true;

      button.textContent = "SAVING...";
    }

    try {
      if (selectedFormID) {
        await api(
          `/api/guild/${encodeURIComponent(
            id,
          )}/applications/forms/${encodeURIComponent(selectedFormID)}`,

          {
            method: "PUT",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify(body),
          },
        );

        toast("APPLICATION UPDATED");
      } else {
        await api(
          `/api/guild/${encodeURIComponent(id)}/applications/forms`,

          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify(body),
          },
        );

        toast("APPLICATION CREATED");
      }

      resetEditor();

      await loadAll();
    } catch (error) {
      console.error(
        "Application save error:",

        error,
      );

      toast(error.message || "SAVE FAILED");
    } finally {
      if (button) {
        button.disabled = false;

        button.textContent = "SAVE APPLICATION";
      }
    }
  }

  /* =====================================================
     FORMS
  ===================================================== */

  function renderForms() {
    const box = $("appsFormsList");

    if (!box) {
      return;
    }

    const visible = forms.filter((form) => !form.archived);

    if (!visible.length) {
      box.innerHTML = `
        <div class="apps-empty">
          No application forms found.
        </div>
      `;

      return;
    }

    box.innerHTML = visible
      .map(
        (form) => `
            <article class="apps-card">
              <div>
                <div class="apps-card-title">
                  <b>
                    ${esc(form.emoji || "📋")}
                    ${esc(form.name)}
                  </b>

                  <span
                    class="apps-chip ${
                      form.status === "open" && form.enabled ? "green" : "red"
                    }"
                  >
                    ${
                      form.status === "open" && form.enabled ? "OPEN" : "CLOSED"
                    }
                  </span>
                </div>

                <p>
                  ${esc(form.description || "No description.")}
                </p>

                <div class="apps-meta">
                  <span class="apps-chip purple">
                    ${(form.questions || []).length}
                    QUESTIONS
                  </span>

                  <span class="apps-chip">
                    ${Number(form.cooldownHours || 0)}H COOLDOWN
                  </span>

                  ${
                    form.acceptedRoleID
                      ? `
                        <span class="apps-chip yellow">
                          AUTO ROLE
                        </span>
                      `
                      : ""
                  }
                </div>
              </div>

              <div class="apps-actions">
                <button
                  class="apps-mini"
                  type="button"
                  data-edit-form="${esc(form.formID)}"
                >
                  EDIT
                </button>

                <button
                  class="apps-mini"
                  type="button"
                  data-toggle-form="${esc(form.formID)}"
                  data-open="${form.status === "open" ? "false" : "true"}"
                >
                  ${form.status === "open" ? "CLOSE" : "OPEN"}
                </button>
              </div>
            </article>
          `,
      )
      .join("");

    box.querySelectorAll("[data-edit-form]").forEach((button) => {
      button.addEventListener(
        "click",

        () => editForm(String(button.dataset.editForm || "")),
      );
    });

    box.querySelectorAll("[data-toggle-form]").forEach((button) => {
      button.addEventListener(
        "click",

        () =>
          toggleForm(
            String(button.dataset.toggleForm || ""),

            button.dataset.open === "true",
          ),
      );
    });
  }

  async function toggleForm(formID, open) {
    const id = guildID();

    if (!id) {
      return;
    }

    try {
      await api(
        `/api/guild/${encodeURIComponent(
          id,
        )}/applications/forms/${encodeURIComponent(formID)}/state`,

        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            open,
          }),
        },
      );

      toast(open ? "APPLICATION OPENED" : "APPLICATION CLOSED");

      await loadAll();
    } catch (error) {
      toast(error.message || "STATE CHANGE FAILED");
    }
  }

  /* =====================================================
     SUBMISSIONS
  ===================================================== */

  function submissionStatusClass(status) {
    if (status === "accepted") {
      return "green";
    }

    if (status === "denied" || status === "withdrawn") {
      return "red";
    }

    if (status === "under_review") {
      return "yellow";
    }

    return "purple";
  }

  function renderSubmissions() {
    const box = $("appsSubmissionsList");

    if (!box) {
      return;
    }

    if (!submissions.length) {
      box.innerHTML = `
        <div class="apps-empty">
          No application submissions
          match this filter.
        </div>
      `;

      return;
    }

    box.innerHTML = submissions
      .map((item) => {
        const profile = item.profile || {};

        const name = profile.displayName || profile.username || "Applicant";

        return `
              <article class="apps-card">
                <div>
                  <div class="apps-card-title">
                    <b>
                      ${esc(item.form?.emoji || "📋")}

                      ${esc(name)}
                    </b>

                    <span
                      class="apps-chip ${submissionStatusClass(item.status)}"
                    >
                      ${esc(statusLabel(item.status))}
                    </span>
                  </div>

                  <p>
                    ${esc(item.form?.name || "Application")}

                    •

                    Submitted
                    ${esc(formatDate(item.submittedAt))}
                  </p>

                  <div class="apps-meta">
                    <span class="apps-chip">
                      @${esc(profile.username || "unknown")}
                    </span>
                  </div>
                </div>

                <div class="apps-actions">
                  <button
                    class="apps-mini"
                    type="button"
                    data-review="${esc(item.submissionID)}"
                  >
                    REVIEW
                  </button>
                </div>
              </article>
            `;
      })
      .join("");

    box.querySelectorAll("[data-review]").forEach((button) => {
      button.addEventListener(
        "click",

        () => openReview(String(button.dataset.review || "")),
      );
    });
  }

  async function openReview(submissionID) {
    const id = guildID();

    if (!id) {
      return;
    }

    selectedSubmissionID = submissionID;

    const panel = $("appsReviewPanel");

    if (panel) {
      panel.innerHTML = `
        <div class="apps-empty">
          Loading application...
        </div>
      `;
    }

    try {
      const data = await api(
        `/api/guild/${encodeURIComponent(
          id,
        )}/applications/submissions/${encodeURIComponent(submissionID)}`,
      );

      renderReview(data);
    } catch (error) {
      if (panel) {
        panel.innerHTML = `
          <div class="apps-empty">
            ${esc(error.message || "Could not load application.")}
          </div>
        `;
      }
    }
  }

  function renderReview(data) {
    const panel = $("appsReviewPanel");

    if (!panel) {
      return;
    }

    const submission = data.submission || {};

    const form = data.form || {};

    const applicant = data.applicant || submission.profile || {};

    const questions = Array.isArray(form.questions) ? form.questions : [];

    const answers = submission.answers || {};

    panel.innerHTML = `
      <div class="apps-profile">
        <div class="apps-avatar">
          <img
            src="${esc(applicant.avatarURL || "/arclume-logo.png")}"
            alt=""
          >
        </div>

        <div>
          <h4>
            ${esc(applicant.displayName || applicant.username || "Applicant")}
          </h4>

          <p>
            @${esc(applicant.username || "unknown")}

            •

            ${esc(form.name || "Application")}
          </p>
        </div>
      </div>

      <div class="apps-meta">
        <span
          class="apps-chip ${submissionStatusClass(submission.status)}"
        >
          ${esc(statusLabel(submission.status))}
        </span>

        <span class="apps-chip">
          ${esc(formatDate(submission.submittedAt))}
        </span>
      </div>

      <div style="margin-top:14px">
        ${questions
          .map((question) => {
            const raw = answers[question.id];

            const answer = Array.isArray(raw)
              ? raw.join(", ")
              : String(raw ?? "");

            return `
                <div class="apps-answer">
                  <small class="mono">
                    ${esc(question.label)}
                  </small>

                  <p>
                    ${esc(answer || "No answer")}
                  </p>
                </div>
              `;
          })
          .join("")}
      </div>

      <label
        class="apps-field full"
        style="margin-top:14px"
      >
        <small class="mono">
          REVIEWER NOTE
        </small>

        <textarea
          id="appsReviewerNote"
          placeholder="Internal staff note or decision reason..."
        >${esc(submission.reviewerNote || "")}</textarea>
      </label>

      <div
        class="apps-actions"
        style="margin-top:12px"
      >
        <button
          class="apps-btn yellow"
          type="button"
          data-review-status="under_review"
        >
          MARK UNDER REVIEW
        </button>

        <button
          class="apps-btn green"
          type="button"
          data-review-status="accepted"
        >
          ACCEPT
        </button>

        <button
          class="apps-btn red"
          type="button"
          data-review-status="denied"
        >
          DENY
        </button>
      </div>
    `;

    panel.querySelectorAll("[data-review-status]").forEach((button) => {
      button.addEventListener(
        "click",

        () => submitReview(String(button.dataset.reviewStatus || "")),
      );
    });
  }

  async function submitReview(status) {
    const id = guildID();

    if (!id || !selectedSubmissionID) {
      return;
    }

    const note = $("appsReviewerNote")?.value?.trim() || "";

    if (["accepted", "denied"].includes(status)) {
      const confirmed = window.confirm(
        `${status === "accepted" ? "Accept" : "Deny"} this application?`,
      );

      if (!confirmed) {
        return;
      }
    }

    try {
      const result = await api(
        `/api/guild/${encodeURIComponent(
          id,
        )}/applications/submissions/${encodeURIComponent(
          selectedSubmissionID,
        )}/review`,

        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            status,

            note,
          }),
        },
      );

      if (
        status === "accepted" &&
        result.roleAssignment?.attempted &&
        !result.roleAssignment?.assigned
      ) {
        toast(
          `ACCEPTED • ROLE NOT ASSIGNED: ${
            result.roleAssignment.reason || "CHECK ROLE PERMISSIONS"
          }`,
        );
      } else {
        toast(
          status === "accepted"
            ? "APPLICATION ACCEPTED"
            : status === "denied"
              ? "APPLICATION DENIED"
              : "MARKED UNDER REVIEW",
        );
      }

      await loadAll();

      await openReview(selectedSubmissionID);
    } catch (error) {
      toast(error.message || "REVIEW FAILED");
    }
  }

  /* =====================================================
     METRICS
  ===================================================== */

  function renderMetrics() {
    setText(
      "appsMetricForms",

      stats?.totalForms || forms.filter((form) => !form.archived).length,
    );

    setText(
      "appsMetricOpen",

      stats?.openForms ||
        forms.filter(
          (form) => !form.archived && form.enabled && form.status === "open",
        ).length,
    );

    setText(
      "appsMetricPending",

      stats?.pending || 0,
    );

    setText(
      "appsMetricAccepted",

      stats?.accepted || 0,
    );

    setText(
      "appsMetricDenied",

      stats?.denied || 0,
    );

    setText(
      "overviewApplicationsCount",

      stats?.pending || 0,
    );
  }

  /* =====================================================
     LOAD
  ===================================================== */

  async function loadAll() {
    if (loading) {
      return;
    }

    const id = guildID();

    if (!id) {
      toast("NO ACTIVE SERVER");

      return;
    }

    loading = true;

    $(PAGE_ID)?.classList.add("apps-loading");

    $("appsLiveState")?.classList.remove(
      "online",

      "error",
    );

    setText(
      "appsLiveText",

      "SYNCING",
    );

    setText(
      "appsCommandStatus",

      "SYNCING APPLICATIONS DATA",
    );

    try {
      const status = $("appsStatusFilter")?.value || "";

      const [formsData, submissionsData, statsData, optionsData] =
        await Promise.all([
          api(`/api/guild/${encodeURIComponent(id)}/applications/forms`),

          api(
            `/api/guild/${encodeURIComponent(
              id,
            )}/applications/submissions?limit=100${
              status ? `&status=${encodeURIComponent(status)}` : ""
            }`,
          ),

          api(`/api/guild/${encodeURIComponent(id)}/applications/stats`),

          api(`/api/guild/${encodeURIComponent(id)}/welcome-options`).catch(
            () => ({
              roles: [],

              channels: [],
            }),
          ),
        ]);

      forms = Array.isArray(formsData.forms) ? formsData.forms : [];

      submissions = Array.isArray(submissionsData.submissions)
        ? submissionsData.submissions
        : [];

      stats = statsData.stats || {};

      options = {
        roles: Array.isArray(optionsData.roles) ? optionsData.roles : [],

        channels: Array.isArray(optionsData.channels)
          ? optionsData.channels
          : [],
      };

      if (!selectedFormID) {
        $("appsAcceptedRole").innerHTML = roleOptions(
          $("appsAcceptedRole")?.value || "",
        );

        $("appsReviewChannel").innerHTML = channelOptions(
          $("appsReviewChannel")?.value || "",

          "No review channel",
        );

        $("appsLogChannel").innerHTML = channelOptions(
          $("appsLogChannel")?.value || "",

          "No log channel",
        );
      }

      renderMetrics();

      renderForms();

      renderSubmissions();

      $("appsLiveState")?.classList.add("online");

      setText(
        "appsLiveText",

        "ONLINE",
      );

      setText(
        "appsCommandStatus",

        "APPLICATIONS SYSTEM ONLINE",
      );

      setText(
        "overviewApplicationsState",

        "ONLINE",
      );
    } catch (error) {
      console.error(
        "Applications dashboard load error:",

        error,
      );

      $("appsLiveState")?.classList.add("error");

      setText(
        "appsLiveText",

        "API ERROR",
      );

      setText(
        "appsCommandStatus",

        error.message || "APPLICATIONS API ERROR",
      );

      setText(
        "overviewApplicationsState",

        "ERROR",
      );

      toast("APPLICATIONS DATA LOAD FAILED");
    } finally {
      loading = false;

      $(PAGE_ID)?.classList.remove("apps-loading");
    }
  }

  /* =====================================================
     EVENTS
  ===================================================== */

  function bindEvents() {
    $("appsRefreshButton")?.addEventListener(
      "click",

      loadAll,
    );

    $("appsNewFormButton")?.addEventListener(
      "click",

      () => {
        resetEditor();

        $("appsFormName")?.scrollIntoView({
          behavior: "smooth",

          block: "center",
        });

        setTimeout(
          () => $("appsFormName")?.focus(),

          250,
        );
      },
    );

    $("appsAddQuestionButton")?.addEventListener(
      "click",

      () => addQuestion(),
    );

    $("appsSaveFormButton")?.addEventListener(
      "click",

      saveForm,
    );

    $("appsResetFormButton")?.addEventListener(
      "click",

      resetEditor,
    );

    $("appsStatusFilter")?.addEventListener(
      "change",

      loadAll,
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

        forms = [];

        submissions = [];

        stats = null;

        selectedFormID = null;

        selectedSubmissionID = null;

        resetEditor();

        if ($(PAGE_ID)?.classList.contains("active")) {
          loadAll();
        }
      },

      1200,
    );
  }

  /* =====================================================
     INITIALIZE
  ===================================================== */

  function init() {
    injectStyles();

    buildPage();

    buildNavigation();

    bindEvents();

    resetEditor();

    watchGuild();

    setTimeout(
      buildNavigation,

      150,
    );

    setTimeout(
      buildNavigation,

      500,
    );

    setTimeout(
      buildNavigation,

      1000,
    );

    setTimeout(
      buildNavigation,

      2000,
    );

    console.log("📋 Arclume Applications dashboard module loaded");
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

  window.ArclumeApplications = {
    open: openApplications,

    load: loadAll,

    resetEditor,

    editForm,
  };
})();
