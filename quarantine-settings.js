"use strict";

/* =========================================================
   ARCLUME — QUARANTINE DASHBOARD
   Direct Discord profile picker — no manual user IDs.
========================================================= */

(() => {
  "use strict";

  const PAGE_ID = "page-quarantine";
  const NAV_ID = "quarantineNavButton";
  const STYLE_ID = "arclumeQuarantineStylesV2";

  let loading = false;
  let searching = false;
  let actionBusy = false;
  let selectedMember = null;
  let searchResults = [];
  let activeRecords = [];
  let historyRecords = [];
  let searchTimer = null;

  const memberCache = new Map();

  const $ = (id) => document.getElementById(id);

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function guildID() {
    if (window.currentGuild?.id) return String(window.currentGuild.id);
    return $("identityServerId")?.textContent?.match(/\d{5,32}/)?.[0] || "";
  }

  function toast(message) {
    if (typeof window.toast === "function") {
      window.toast(message);
      return;
    }

    const box = $("toast");
    if (!box) return console.log(message);

    box.textContent = message;
    box.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => box.classList.remove("show"), 2800);
  }

  function text(id, value) {
    const el = $(id);
    if (el) el.textContent = String(value ?? "");
  }

  function input(id) {
    return String($(id)?.value || "").trim();
  }

  function cache(member) {
    if (member?.id) memberCache.set(String(member.id), member);
  }

  function nameOf(member) {
    return (
      member?.displayName ||
      member?.globalName ||
      member?.username ||
      "Unknown Member"
    );
  }

  function handleOf(member) {
    return member?.username ? `@${member.username}` : "@unknown";
  }

  function methodName(method) {
    return String(method || "").toLowerCase() === "role"
      ? "Quarantine Role"
      : "Discord Timeout";
  }

  function dateText(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function remaining(value) {
    if (!value) return "Permanent";
    const ms = new Date(value).getTime() - Date.now();
    if (!Number.isFinite(ms) || ms <= 0) return "Expiring";

    const mins = Math.floor(ms / 60000);
    if (mins < 1) return `${Math.max(1, Math.floor(ms / 1000))}s`;
    if (mins < 60) return `${mins}m`;

    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ${mins % 60}m`;

    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  }

  function setLive(state, label) {
    const live = $("qLiveState");
    live?.classList.remove("online", "error");
    if (state) live?.classList.add(state);
    text("qLiveText", label);
  }

  /* =====================================================
     STYLES
  ===================================================== */

  function addStyles() {
    if ($(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${PAGE_ID}{--qp:#a78bfa;--qg:#9effc7;--qr:#ff7182;--qb:rgba(255,255,255,.105);--qm:rgba(245,242,255,.48);padding-bottom:130px}
      .qv{color:#cbbcff!important}.qhero{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:22px}.qhero h1{margin:8px 0 12px;font:800 clamp(42px,7vw,78px)/.92 "Syne",sans-serif;letter-spacing:-.055em}.qhero h1 span{color:var(--qp)}.qhero p{max-width:730px;margin:0;color:var(--qm);line-height:1.65}.qlive{min-width:180px;padding:14px 17px;border:1px solid var(--qb);border-radius:18px;background:rgba(255,255,255,.025)}.qlive small,.qsmall{display:block;color:rgba(245,242,255,.4);font-size:9px;letter-spacing:.1em}.qlive strong{display:flex;align-items:center;gap:8px;margin-top:7px;font-family:"Syne",sans-serif}.qdot{width:9px;height:9px;border-radius:50%;background:#ffd37a;box-shadow:0 0 15px rgba(255,211,122,.65)}.qlive.online .qdot{background:var(--qg);box-shadow:0 0 15px rgba(158,255,199,.65)}.qlive.error .qdot{background:var(--qr)}
      .qbar{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:18px;padding:13px;border:1px solid var(--qb);border-radius:20px;background:rgba(255,255,255,.02)}.qbarleft{display:flex;align-items:center;gap:12px}.qicon{width:40px;height:40px;display:grid;place-items:center;border:1px solid rgba(167,139,250,.2);border-radius:12px;background:rgba(167,139,250,.06)}.qbar b{display:block;margin-top:4px;font-family:"Syne",sans-serif}.qbtn{min-height:40px;padding:0 14px;border:1px solid var(--qb);border-radius:11px;background:rgba(255,255,255,.035);color:#fff;font:600 10px inherit;letter-spacing:.06em;cursor:pointer}.qbtn:hover{background:rgba(255,255,255,.07)}.qbtn.primary{border-color:rgba(167,139,250,.34);background:rgba(124,92,255,.12)}.qbtn.red{border-color:rgba(255,113,130,.34);background:rgba(255,113,130,.08);color:#ff9ca8}.qbtn.green{border-color:rgba(158,255,199,.28);background:rgba(158,255,199,.07);color:#bbffd6}.qbtn:disabled{opacity:.45;cursor:not-allowed}
      .qmetrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px;margin-bottom:18px}.qmetric{padding:17px;border:1px solid var(--qb);border-radius:18px;background:rgba(255,255,255,.02)}.qmetric strong{display:block;margin-top:12px;font:700 24px "Syne",sans-serif}.qmetric p{margin:5px 0 0;color:var(--qm);font-size:10px;line-height:1.5}
      .qlayout{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(330px,.75fr);gap:17px}.qstack{display:grid;gap:17px}.qbox{overflow:hidden;border:1px solid var(--qb);border-radius:22px;background:rgba(255,255,255,.018)}.qhead{display:flex;justify-content:space-between;gap:16px;padding:19px 20px;border-bottom:1px solid rgba(255,255,255,.07)}.qhead h3{margin:5px 0 0;font:700 18px "Syne",sans-serif}.qhead p{margin:6px 0 0;max-width:520px;color:var(--qm);font-size:10px;line-height:1.55}.qbody{padding:19px}
      .qfield small{display:block;margin-bottom:8px;color:rgba(245,242,255,.4);font-size:9px;letter-spacing:.1em}.qfield input,.qfield select{width:100%;min-height:44px;padding:10px 12px;border:1px solid rgba(255,255,255,.11);border-radius:12px;outline:none;background:#0d0d13;color:#fff;font:inherit}.qfield input:focus,.qfield select:focus{border-color:rgba(167,139,250,.55)}.qsearchwrap{position:relative}.qsearchwrap>span{position:absolute;left:14px;top:50%;transform:translateY(-50%);opacity:.45}.qsearchwrap input{padding-left:42px}
      .qresults{display:grid;gap:8px;margin-top:10px}.qresult{width:100%;display:grid;grid-template-columns:46px minmax(0,1fr) auto;align-items:center;gap:11px;padding:10px 11px;border:1px solid rgba(255,255,255,.085);border-radius:14px;background:rgba(255,255,255,.02);color:#fff;text-align:left;cursor:pointer}.qresult:hover,.qresult.selected{border-color:rgba(167,139,250,.4);background:rgba(124,92,255,.075)}.qavatar{width:46px;height:46px;overflow:hidden;border-radius:50%;background:rgba(255,255,255,.05)}.qavatar img,.qprofileavatar img,.qcardavatar img{width:100%;height:100%;display:block;object-fit:cover}.qcopy{min-width:0}.qcopy b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.qcopy span{display:block;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(245,242,255,.42);font-size:9px}
      .qchip{display:inline-flex;align-items:center;padding:5px 7px;border:1px solid rgba(255,255,255,.08);border-radius:999px;background:rgba(255,255,255,.025);color:rgba(245,242,255,.58);font-size:8px}.qchip.green{border-color:rgba(158,255,199,.18);color:#b9ffd5}.qchip.red{border-color:rgba(255,113,130,.2);color:#ff9eaa}.qchip.purple{border-color:rgba(167,139,250,.2);color:#cbbcff}
      .qempty{padding:25px 14px;border:1px dashed rgba(255,255,255,.1);border-radius:15px;color:rgba(245,242,255,.42);font-size:10px;text-align:center}.qprofileempty{display:grid;place-items:center;min-height:270px;padding:28px;text-align:center}.qprofileempty span{display:grid;place-items:center;width:58px;height:58px;margin:0 auto 13px;border:1px solid rgba(167,139,250,.18);border-radius:18px;background:rgba(167,139,250,.06);font-size:24px}.qprofileempty b{font-family:"Syne",sans-serif}.qprofileempty p{max-width:280px;margin:7px auto 0;color:var(--qm);font-size:10px;line-height:1.55}
      .qprofile{padding:19px}.qprofilehead{display:flex;align-items:center;gap:13px}.qprofileavatar{width:68px;height:68px;flex:0 0 68px;overflow:hidden;border-radius:50%;background:rgba(255,255,255,.05)}.qprofilecopy{min-width:0}.qprofilecopy h3{margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:700 19px "Syne",sans-serif}.qprofilecopy p{margin:5px 0 0;color:var(--qm);font-size:10px}.qstatus,.qroles,.qactions{display:flex;flex-wrap:wrap;gap:6px}.qstatus{margin-top:15px}.qroles{margin-top:12px}.qrole{padding:5px 8px;border:1px solid rgba(255,255,255,.08);border-radius:999px;background:rgba(255,255,255,.025);color:rgba(245,242,255,.65);font-size:8px}.qstats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:15px}.qstat{padding:10px;border:1px solid rgba(255,255,255,.07);border-radius:12px}.qstat small{display:block;margin-bottom:6px;color:rgba(245,242,255,.4);font-size:8px;letter-spacing:.08em}.qstat b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px}.qform{display:grid;grid-template-columns:.38fr .62fr;gap:12px;margin-top:16px}.qactions{margin-top:12px}.qnote{margin-top:8px;color:rgba(245,242,255,.38);font-size:9px;line-height:1.5}
      .qlist{display:grid;gap:8px}.qcard{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:13px;border:1px solid rgba(255,255,255,.08);border-radius:15px;background:rgba(255,255,255,.02)}.qperson{display:flex;align-items:center;gap:10px;min-width:0}.qcardavatar{width:42px;height:42px;flex:0 0 42px;overflow:hidden;border-radius:50%;background:rgba(255,255,255,.05)}.qcardtitle{min-width:0}.qcardtitle b,.qcardtitle span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.qcardtitle b{font-size:11px}.qcardtitle span{margin-top:3px;color:rgba(245,242,255,.4);font-size:9px}.qreason{margin:10px 0 0;color:rgba(245,242,255,.62);font-size:10px;line-height:1.5}.qmeta{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}.qmini{min-height:33px;padding:0 9px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:rgba(255,255,255,.03);color:#fff;font:600 8px inherit;cursor:pointer}.qmini.red{border-color:rgba(255,113,130,.25);color:#ff9eaa}
      .qhistory{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.055)}.qhistory:last-child{border-bottom:0}.qhistory b{display:block;font-size:10px}.qhistory p{margin:4px 0 0;color:rgba(245,242,255,.45);font-size:9px;line-height:1.45}.qloading{opacity:.58;pointer-events:none}
      @media(max-width:1050px){.qlayout{grid-template-columns:1fr}.qmetrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:720px){.qhero,.qbar{align-items:stretch;flex-direction:column}.qmetrics,.qform,.qstats{grid-template-columns:1fr}.qresult{grid-template-columns:42px minmax(0,1fr)}.qresult>.qchip{grid-column:2;justify-self:start}.qcard,.qhistory{grid-template-columns:1fr}.qactions{display:grid;grid-template-columns:1fr}.qbtn{width:100%}}
    `;

    document.head.appendChild(style);
  }

  /* =====================================================
     PAGE + NAVIGATION
  ===================================================== */

  function buildPage() {
    if ($(PAGE_ID)) return;

    const main = document.querySelector(".control-main");
    if (!main) return;

    const page = document.createElement("section");
    page.className = "dash-page";
    page.id = PAGE_ID;
    page.innerHTML = `
      <div class="qhero">
        <div>
          <span class="mono eyebrow">11 / MEMBER CONTAINMENT</span>
          <h1>Quarantine<br><span>Control.</span></h1>
          <p>Search members by name, open the real Discord profile, then quarantine or release them without copying user IDs.</p>
        </div>

        <div class="qlive" id="qLiveState">
          <small class="mono">QUARANTINE API</small>
          <strong><i class="qdot"></i><span id="qLiveText">WAITING</span></strong>
        </div>
      </div>

      <div class="qbar">
        <div class="qbarleft">
          <span class="qicon">🔒</span>
          <div><span class="qsmall mono">ARCLUME / QUARANTINE</span><b id="qCommandStatus">READY TO SYNC</b></div>
        </div>
        <div class="qactions">
          <button class="qbtn" id="qRefreshButton" type="button">REFRESH</button>
          <button class="qbtn primary" id="qFindButton" type="button">FIND MEMBER</button>
        </div>
      </div>

      <div class="qmetrics">
        <article class="qmetric"><span class="qsmall mono">ACTIVE</span><strong id="qMetricActive">0</strong><p>Members currently quarantined.</p></article>
        <article class="qmetric"><span class="qsmall mono">ROLE METHOD</span><strong id="qMetricRole">0</strong><p>Using the configured quarantine role.</p></article>
        <article class="qmetric"><span class="qsmall mono">TIMEOUT METHOD</span><strong id="qMetricTimeout">0</strong><p>Using Discord timeout.</p></article>
        <article class="qmetric"><span class="qsmall mono">HISTORY</span><strong id="qMetricHistory">0</strong><p>Recent stored quarantine records.</p></article>
      </div>

      <div class="qlayout">
        <div class="qstack">
          <section class="qbox" id="qSearchSection">
            <header class="qhead">
              <div><span class="qsmall mono">01 / MEMBER PICKER</span><h3>Find a Member</h3><p>Search by display name, nickname or @username, then click the profile.</p></div>
            </header>
            <div class="qbody">
              <label class="qfield">
                <small class="mono">SEARCH SERVER MEMBERS</small>
                <div class="qsearchwrap"><span>⌕</span><input id="qMemberSearch" type="search" autocomplete="off" placeholder="Search name, nickname or @username..."></div>
              </label>
              <div class="qresults" id="qSearchResults"><div class="qempty">Loading server members...</div></div>
            </div>
          </section>

          <section class="qbox">
            <header class="qhead">
              <div><span class="qsmall mono">02 / ACTIVE</span><h3>Active Quarantines</h3><p>Members currently restricted by Arclume.</p></div>
              <span class="qchip purple" id="qActiveCountChip">0 ACTIVE</span>
            </header>
            <div class="qbody"><div class="qlist" id="qActiveList"><div class="qempty">No active quarantines loaded yet.</div></div></div>
          </section>
        </div>

        <aside class="qstack">
          <section class="qbox">
            <header class="qhead"><div><span class="qsmall mono">03 / SELECTED PROFILE</span><h3>Member Profile</h3><p>Profile details and quarantine controls.</p></div></header>
            <div id="qSelectedProfile"></div>
          </section>

          <section class="qbox">
            <header class="qhead"><div><span class="qsmall mono">04 / HISTORY</span><h3>Recent History</h3><p>Latest quarantine and release records.</p></div></header>
            <div class="qbody" id="qHistoryList"><div class="qempty">No history loaded yet.</div></div>
          </section>
        </aside>
      </div>
    `;

    main.appendChild(page);
  }

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
      button.innerHTML = `<span>11</span><b>Quarantine</b>`;
      button.addEventListener("click", openPage);

      if (logout) dock.insertBefore(button, logout);
      else dock.appendChild(button);
    }

    if (!$("overviewQuarantineButton")) {
      const ledger = document.querySelector("#page-overview .ledger-table");
      if (ledger) {
        const row = document.createElement("button");
        row.className = "ledger-row";
        row.id = "overviewQuarantineButton";
        row.type = "button";
        row.innerHTML = `
          <span class="ledger-index mono">11</span>
          <span class="ledger-symbol qv">Q</span>
          <span class="ledger-name"><small class="mono">MEMBER CONTAINMENT</small><b>Quarantine Control</b></span>
          <span class="ledger-value"><small class="mono">ACTIVE</small><b id="overviewQuarantineCount">0</b></span>
          <span class="ledger-state"><i></i><b id="overviewQuarantineState">AVAILABLE</b></span>
          <span class="ledger-arrow">&gt;</span>`;
        row.addEventListener("click", openPage);
        ledger.appendChild(row);
      }
    }

    if (!$("systemQuarantineButton")) {
      const index = document.querySelector("#page-systems .system-index");
      if (index) {
        const row = document.createElement("article");
        row.className = "system-index-row live";
        row.innerHTML = `
          <span class="mono">11</span><span class="system-index-symbol qv">Q</span>
          <div><small class="mono">MEMBER CONTAINMENT</small><h3>Quarantine Control</h3><p>Direct member profiles, quarantine, release and history.</p></div>
          <b class="mono">AVAILABLE</b><button id="systemQuarantineButton" type="button">OPEN</button>`;
        index.appendChild(row);
        $("systemQuarantineButton")?.addEventListener("click", openPage);
      }
    }
  }

  function openPage() {
    const page = $(PAGE_ID);
    if (!page) return;

    document
      .querySelectorAll(".dash-page")
      .forEach((item) => item.classList.remove("active"));
    document
      .querySelectorAll(".control-dock button")
      .forEach((item) => item.classList.remove("active"));

    page.classList.add("active");
    $(NAV_ID)?.classList.add("active");
    text("pageCode", "11 / QUARANTINE");
    window.scrollTo({ top: 0, behavior: "smooth" });

    loadAll();
    if (!searchResults.length) searchMembers("");
  }

  /* =====================================================
     SEARCH + PROFILE
  ===================================================== */

  async function searchMembers(query = "") {
    if (searching) return;

    const id = guildID();
    if (!id) return toast("NO ACTIVE SERVER");

    searching = true;
    const results = $("qSearchResults");
    if (results)
      results.innerHTML = `<div class="qempty">Searching server members...</div>`;

    try {
      const data = await api(
        `/api/guild/${encodeURIComponent(id)}/quarantine/members?query=${encodeURIComponent(query)}&limit=20`,
      );

      searchResults = Array.isArray(data.members) ? data.members : [];
      searchResults.forEach(cache);
      renderSearch();
    } catch (error) {
      console.error("Quarantine search error:", error);
      if (results)
        results.innerHTML = `<div class="qempty">${esc(error.message || "Could not search members.")}</div>`;
    } finally {
      searching = false;
    }
  }

  function renderSearch() {
    const box = $("qSearchResults");
    if (!box) return;

    if (!searchResults.length) {
      box.innerHTML = `<div class="qempty">No matching server members found.</div>`;
      return;
    }

    box.innerHTML = searchResults
      .map((member) => {
        const selected = selectedMember?.id === member.id;
        const status = member.quarantined
          ? `<span class="qchip red">QUARANTINED</span>`
          : member.actionAllowed === false
            ? `<span class="qchip">PROTECTED</span>`
            : `<span class="qchip green">AVAILABLE</span>`;

        return `
          <button class="qresult ${selected ? "selected" : ""}" type="button" data-member="${esc(member.id)}">
            <span class="qavatar"><img src="${esc(member.avatarURL || "/arclume-logo.png")}" alt=""></span>
            <span class="qcopy"><b>${esc(nameOf(member))}</b><span>${esc(handleOf(member))}</span></span>
            ${status}
          </button>`;
      })
      .join("");

    box.querySelectorAll("[data-member]").forEach((button) => {
      button.addEventListener("click", () => {
        const member = memberCache.get(String(button.dataset.member || ""));
        if (member) selectMember(member);
      });
    });
  }

  async function fetchMember(userID) {
    const id = guildID();
    if (!id || !userID) return null;

    const data = await api(
      `/api/guild/${encodeURIComponent(id)}/quarantine/member/${encodeURIComponent(userID)}`,
    );

    if (data.member) cache(data.member);
    return data.member || null;
  }

  async function selectMember(member) {
    selectedMember = member;
    renderSearch();
    renderProfile();

    try {
      const fresh = await fetchMember(member.id);
      if (fresh && selectedMember?.id === fresh.id) {
        selectedMember = fresh;
        renderSearch();
        renderProfile();
      }
    } catch (error) {
      console.error("Profile refresh error:", error);
    }
  }

  function emptyProfile() {
    return `
      <div class="qprofileempty">
        <div><span>👤</span><b>No member selected</b><p>Search the server and click a Discord profile to open quarantine controls.</p></div>
      </div>`;
  }

  function renderProfile() {
    const box = $("qSelectedProfile");
    if (!box) return;

    if (!selectedMember) {
      box.innerHTML = emptyProfile();
      return;
    }

    const member = selectedMember;
    const quarantine = member.quarantine || null;
    const active = Boolean(member.quarantined || quarantine);
    const blocked = member.actionAllowed === false;
    const roles = Array.isArray(member.roles) ? member.roles : [];

    box.innerHTML = `
      <div class="qprofile">
        <div class="qprofilehead">
          <div class="qprofileavatar"><img src="${esc(member.avatarURL || "/arclume-logo.png")}" alt=""></div>
          <div class="qprofilecopy"><h3>${esc(nameOf(member))}</h3><p>${esc(handleOf(member))}</p></div>
        </div>

        <div class="qstatus">
          <span class="qchip ${active ? "red" : "green"}">${active ? "ACTIVE QUARANTINE" : "NOT QUARANTINED"}</span>
          ${quarantine ? `<span class="qchip purple">${esc(methodName(quarantine.method))}</span>` : ""}
          ${quarantine ? `<span class="qchip">${esc(remaining(quarantine.expiresAt))}</span>` : ""}
          ${member.bot ? `<span class="qchip">BOT ACCOUNT</span>` : ""}
        </div>

        <div class="qroles">
          ${
            roles.length
              ? roles
                  .slice(0, 8)
                  .map((role) => `<span class="qrole">${esc(role.name)}</span>`)
                  .join("")
              : `<span class="qrole">No visible roles</span>`
          }
        </div>

        <div class="qstats">
          <div class="qstat"><small class="mono">TOP ROLE</small><b>${esc(member.topRole?.name || "Member")}</b></div>
          <div class="qstat"><small class="mono">JOINED SERVER</small><b>${esc(dateText(member.joinedAt))}</b></div>
          <div class="qstat"><small class="mono">ACCOUNT CREATED</small><b>${esc(dateText(member.accountCreatedAt))}</b></div>
          <div class="qstat"><small class="mono">ACTION STATUS</small><b>${blocked ? "BLOCKED" : "AVAILABLE"}</b></div>
        </div>

        ${blocked && member.actionReason ? `<div class="qnote">${esc(member.actionReason)}</div>` : ""}
        ${quarantine?.reason ? `<div class="qnote"><b>Current reason:</b> ${esc(quarantine.reason)}</div>` : ""}

        <div class="qform">
          <label class="qfield">
            <small class="mono">DURATION</small>
            <select id="qDuration">
              <option value="10m">10 minutes</option><option value="30m" selected>30 minutes</option><option value="1h">1 hour</option>
              <option value="6h">6 hours</option><option value="12h">12 hours</option><option value="1d">1 day</option>
              <option value="3d">3 days</option><option value="7d">7 days</option><option value="14d">14 days</option>
              <option value="28d">28 days</option><option value="permanent">Permanent</option>
            </select>
          </label>

          <label class="qfield"><small class="mono">REASON</small><input id="qReason" type="text" maxlength="1000" placeholder="Reason for this action..."></label>
        </div>

        <div class="qactions">
          <button class="qbtn red" id="qQuarantineButton" type="button" ${active || blocked ? "disabled" : ""}>🔒 QUARANTINE MEMBER</button>
          <button class="qbtn green" id="qReleaseButton" type="button" ${active ? "" : "disabled"}>🔓 RELEASE MEMBER</button>
        </div>

        <div class="qnote">Permanent quarantine requires a configured Quarantine Role. Temporary actions can use Discord timeout fallback.</div>
      </div>`;

    $("qQuarantineButton")?.addEventListener("click", quarantineSelected);
    $("qReleaseButton")?.addEventListener("click", releaseSelected);
  }

  /* =====================================================
     ACTIVE + HISTORY
  ===================================================== */

  async function hydrate(records) {
    const ids = [
      ...new Set(
        records.map((record) => String(record.userID || "")).filter(Boolean),
      ),
    ].slice(0, 30);

    await Promise.allSettled(
      ids.map(async (userID) => {
        if (!memberCache.has(userID)) await fetchMember(userID);
      }),
    );
  }

  function renderMetrics() {
    const role = activeRecords.filter(
      (r) => String(r.method).toLowerCase() === "role",
    ).length;
    const timeout = activeRecords.filter(
      (r) => String(r.method).toLowerCase() === "timeout",
    ).length;

    text("qMetricActive", activeRecords.length);
    text("qMetricRole", role);
    text("qMetricTimeout", timeout);
    text("qMetricHistory", historyRecords.length);
    text("qActiveCountChip", `${activeRecords.length} ACTIVE`);
    text("overviewQuarantineCount", activeRecords.length);
  }

  function renderActive() {
    const box = $("qActiveList");
    if (!box) return;

    if (!activeRecords.length) {
      box.innerHTML = `<div class="qempty">No members are currently quarantined.</div>`;
      return;
    }

    box.innerHTML = activeRecords
      .map((record) => {
        const member = memberCache.get(String(record.userID));
        const avatar = member?.avatarURL || "/arclume-logo.png";
        const methodClass =
          String(record.method).toLowerCase() === "role" ? "purple" : "green";

        return `
          <article class="qcard">
            <div>
              <div class="qperson">
                <span class="qcardavatar"><img src="${esc(avatar)}" alt=""></span>
                <span class="qcardtitle"><b>${esc(nameOf(member))}</b><span>${esc(handleOf(member))}</span></span>
              </div>
              <p class="qreason">${esc(record.reason || "No reason provided.")}</p>
              <div class="qmeta"><span class="qchip ${methodClass}">${esc(methodName(record.method))}</span><span class="qchip red">${esc(remaining(record.expiresAt))}</span><span class="qchip">${esc(dateText(record.createdAt))}</span></div>
            </div>

            <div class="qactions">
              <button class="qmini" type="button" data-profile="${esc(record.userID)}">PROFILE</button>
              <button class="qmini red" type="button" data-release="${esc(record.userID)}">RELEASE</button>
            </div>
          </article>`;
      })
      .join("");

    box.querySelectorAll("[data-profile]").forEach((button) => {
      button.addEventListener("click", async () => {
        const userID = String(button.dataset.profile || "");
        const member =
          memberCache.get(userID) ||
          (await fetchMember(userID).catch(() => null));
        if (member) {
          await selectMember(member);
          $("qSelectedProfile")?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      });
    });

    box.querySelectorAll("[data-release]").forEach((button) => {
      button.addEventListener("click", async () => {
        const userID = String(button.dataset.release || "");
        const member =
          memberCache.get(userID) ||
          (await fetchMember(userID).catch(() => null));
        if (member) {
          selectedMember = member;
          renderProfile();
          await releaseSelected();
        }
      });
    });
  }

  function renderHistory() {
    const box = $("qHistoryList");
    if (!box) return;

    if (!historyRecords.length) {
      box.innerHTML = `<div class="qempty">No quarantine history is stored for this server yet.</div>`;
      return;
    }

    box.innerHTML = historyRecords
      .slice(0, 30)
      .map((record) => {
        const member = memberCache.get(String(record.userID));
        const state = record.active ? "ACTIVE" : "ENDED";
        return `
          <div class="qhistory">
            <div><b>${esc(nameOf(member))}</b><p>${esc(record.reason || "No reason provided.")}<br>${esc(methodName(record.method))} • ${esc(dateText(record.createdAt))}</p></div>
            <span class="qchip ${record.active ? "red" : "green"}">${state}</span>
          </div>`;
      })
      .join("");
  }

  /* =====================================================
     LOAD + ACTIONS
  ===================================================== */

  async function loadAll() {
    if (loading) return;

    const id = guildID();
    if (!id) return toast("NO ACTIVE SERVER");

    loading = true;
    $(PAGE_ID)?.classList.add("qloading");
    setLive("", "SYNCING");
    text("qCommandStatus", "SYNCING QUARANTINE DATA");

    try {
      const [activeData, historyData] = await Promise.all([
        api(`/api/guild/${encodeURIComponent(id)}/quarantine`),
        api(`/api/guild/${encodeURIComponent(id)}/quarantine/history?limit=50`),
      ]);

      activeRecords = Array.isArray(activeData.quarantines)
        ? activeData.quarantines
        : [];
      historyRecords = Array.isArray(historyData.history)
        ? historyData.history
        : [];

      await hydrate([...activeRecords, ...historyRecords]);
      renderMetrics();
      renderActive();
      renderHistory();

      if (selectedMember?.id) {
        const fresh = await fetchMember(selectedMember.id).catch(() => null);
        if (fresh) {
          selectedMember = fresh;
          renderProfile();
        }
      }

      setLive("online", "ONLINE");
      text("qCommandStatus", "QUARANTINE SYSTEM ONLINE");
      text("overviewQuarantineState", "ONLINE");
    } catch (error) {
      console.error("Quarantine dashboard load error:", error);
      setLive("error", "API ERROR");
      text("qCommandStatus", error.message || "QUARANTINE API ERROR");
      text("overviewQuarantineState", "ERROR");
      toast("QUARANTINE DATA LOAD FAILED");
    } finally {
      loading = false;
      $(PAGE_ID)?.classList.remove("qloading");
    }
  }

  async function quarantineSelected() {
    if (actionBusy || !selectedMember) return;

    if (selectedMember.actionAllowed === false) {
      return toast(
        selectedMember.actionReason || "THIS MEMBER CANNOT BE QUARANTINED",
      );
    }

    if (selectedMember.quarantined)
      return toast("THIS MEMBER IS ALREADY QUARANTINED");

    const id = guildID();
    if (!id) return toast("NO ACTIVE SERVER");

    const duration = input("qDuration") || "30m";
    const reason = input("qReason") || "Dashboard quarantine action.";

    if (
      !window.confirm(`Quarantine ${nameOf(selectedMember)} for ${duration}?`)
    )
      return;

    actionBusy = true;
    const button = $("qQuarantineButton");
    if (button) {
      button.disabled = true;
      button.textContent = "QUARANTINING...";
    }

    try {
      const data = await api(
        `/api/guild/${encodeURIComponent(id)}/quarantine`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userID: selectedMember.id, duration, reason }),
        },
      );

      selectedMember = data.member || (await fetchMember(selectedMember.id));
      if (selectedMember) cache(selectedMember);
      renderProfile();
      toast(`QUARANTINED ${nameOf(selectedMember).toUpperCase()}`);
      await loadAll();
      await searchMembers(input("qMemberSearch"));
    } catch (error) {
      console.error("Quarantine action error:", error);
      toast(error.message || "QUARANTINE ACTION FAILED");
    } finally {
      actionBusy = false;
    }
  }

  async function releaseSelected() {
    if (actionBusy || !selectedMember) return;
    if (!selectedMember.quarantined && !selectedMember.quarantine)
      return toast("THIS MEMBER IS NOT QUARANTINED");

    const id = guildID();
    if (!id) return toast("NO ACTIVE SERVER");

    const reason = input("qReason") || "Released from the dashboard.";
    if (!window.confirm(`Release ${nameOf(selectedMember)} from quarantine?`))
      return;

    actionBusy = true;
    const button = $("qReleaseButton");
    if (button) {
      button.disabled = true;
      button.textContent = "RELEASING...";
    }

    try {
      const data = await api(
        `/api/guild/${encodeURIComponent(id)}/quarantine/release`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userID: selectedMember.id, reason }),
        },
      );

      selectedMember = data.member || (await fetchMember(selectedMember.id));
      if (selectedMember) cache(selectedMember);
      renderProfile();
      toast(`RELEASED ${nameOf(selectedMember).toUpperCase()}`);
      await loadAll();
      await searchMembers(input("qMemberSearch"));
    } catch (error) {
      console.error("Release action error:", error);
      toast(error.message || "QUARANTINE RELEASE FAILED");
    } finally {
      actionBusy = false;
    }
  }

  /* =====================================================
     EVENTS + INIT
  ===================================================== */

  function bind() {
    $("qRefreshButton")?.addEventListener("click", async () => {
      await loadAll();
      await searchMembers(input("qMemberSearch"));
    });

    $("qFindButton")?.addEventListener("click", () => {
      $("qSearchSection")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setTimeout(() => $("qMemberSearch")?.focus(), 300);
    });

    $("qMemberSearch")?.addEventListener("input", (event) => {
      clearTimeout(searchTimer);
      const query = String(event.target.value || "").trim();
      searchTimer = setTimeout(() => searchMembers(query), 260);
    });
  }

  function watchGuild() {
    let previous = guildID();

    setInterval(() => {
      const next = guildID();
      if (!next || next === previous) return;

      previous = next;
      memberCache.clear();
      selectedMember = null;
      searchResults = [];
      activeRecords = [];
      historyRecords = [];
      renderProfile();
      renderMetrics();

      if ($(PAGE_ID)?.classList.contains("active")) {
        loadAll();
        searchMembers("");
      }
    }, 1200);
  }

  function init() {
    addStyles();
    buildPage();
    buildNavigation();
    bind();
    renderProfile();
    renderMetrics();
    watchGuild();

    setTimeout(buildNavigation, 150);
    setTimeout(buildNavigation, 500);
    setTimeout(buildNavigation, 1000);
    setTimeout(buildNavigation, 2000);

    console.log("🔒 Arclume Quarantine direct-profile dashboard loaded");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.ArclumeQuarantine = {
    open: openPage,
    load: loadAll,
    search: searchMembers,
    select: selectMember,
    quarantine: quarantineSelected,
    release: releaseSelected,
  };
})();
