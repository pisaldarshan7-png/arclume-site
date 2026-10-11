"use strict";

(() => {
  /* =========================================================
     STOP DUPLICATE LOAD
  ========================================================= */

  if (document.getElementById("arclumeLevelStudio")) {
    return;
  }

  const page = document.getElementById("page-leveling");

  if (!page) {
    console.warn("⚠️ Leveling page not found.");

    return;
  }

  /* =========================================================
     STYLE
  ========================================================= */

  const style = document.createElement("style");

  style.textContent = `
    .lvl-config {
      margin-top: 24px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 24px;
      background: rgba(255,255,255,.018);
    }

    .lvl-config * {
      box-sizing: border-box;
    }

    .lvl-config-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      padding: 22px;
      border-bottom: 1px solid rgba(255,255,255,.07);
    }

    .lvl-config-head small,
    .lvl-label {
      color: rgba(255,255,255,.42);
      font-size: 9px;
      letter-spacing: .12em;
    }

    .lvl-config-head h3 {
      margin: 5px 0 0;
      color: white;
      font-family: "Syne", sans-serif;
      font-size: 23px;
    }

    .lvl-state {
      padding: 9px 12px;
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 999px;
      background: rgba(255,255,255,.025);
      color: rgba(255,255,255,.62);
      font-size: 9px;
    }

    .lvl-state.good {
      color: #9effc7;
      border-color: rgba(158,255,199,.28);
    }

    .lvl-state.error {
      color: #ff96a3;
      border-color: rgba(255,120,140,.28);
    }

    .lvl-body {
      padding: 20px;
    }

    .lvl-grid {
      display: grid;
      grid-template-columns: repeat(2,minmax(0,1fr));
      gap: 14px;
    }

    .lvl-card {
      padding: 18px;
      border: 1px solid rgba(255,255,255,.075);
      border-radius: 18px;
      background: rgba(255,255,255,.018);
    }

    .lvl-card.wide {
      grid-column: 1 / -1;
    }

    .lvl-card-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 14px;
    }

    .lvl-card-head b {
      display: block;
      margin-top: 5px;
      color: white;
      font-size: 13px;
    }

    .lvl-description {
      margin: 0;
      color: rgba(255,255,255,.45);
      font-size: 10px;
      line-height: 1.6;
    }

    .lvl-toggle {
      position: relative;
      width: 48px;
      height: 28px;
      min-width: 48px;
      padding: 0;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 999px;
      background: rgba(255,255,255,.055);
      cursor: pointer;
    }

    .lvl-toggle span {
      position: absolute;
      top: 4px;
      left: 4px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #707078;
      transition: .2s ease;
    }

    .lvl-toggle.on {
      border-color: rgba(120,255,185,.3);
      background: rgba(80,255,160,.1);
    }

    .lvl-toggle.on span {
      left: 24px;
      background: #9effc7;
      box-shadow: 0 0 14px rgba(158,255,199,.35);
    }

    .lvl-fields {
      display: grid;
      grid-template-columns: repeat(2,minmax(0,1fr));
      gap: 12px;
    }

    .lvl-field {
      display: block;
    }

    .lvl-field .lvl-label {
      display: block;
      margin-bottom: 7px;
    }

    .lvl-field input,
    .lvl-field select,
    .lvl-field textarea {
      width: 100%;
      border: 1px solid rgba(255,255,255,.09);
      border-radius: 12px;
      outline: none;
      background: rgba(5,5,10,.72);
      color: white;
      font-family: "IBM Plex Mono", monospace;
      font-size: 11px;
    }

    .lvl-field input,
    .lvl-field select {
      height: 44px;
      padding: 0 12px;
    }

    .lvl-field textarea {
      min-height: 100px;
      padding: 12px;
      resize: vertical;
    }

    .lvl-field select option {
      color: white;
      background: #09090d;
    }

    .lvl-help {
      margin-top: 9px;
      color: rgba(255,255,255,.38);
      font-size: 9px;
      line-height: 1.6;
    }


    /* THEMES */

    .lvl-themes {
      display: grid;
      grid-template-columns: repeat(3,minmax(0,1fr));
      gap: 10px;
    }

    .lvl-theme {
      position: relative;
      min-height: 82px;
      overflow: hidden;
      padding: 12px;
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 14px;
      background: rgba(255,255,255,.018);
      color: white;
      text-align: left;
      cursor: pointer;
    }

    .lvl-theme::after {
      content: "";
      position: absolute;
      right: -20px;
      bottom: -26px;
      width: 88px;
      height: 88px;
      border-radius: 50%;
      background: var(--theme);
      filter: blur(25px);
      opacity: .55;
    }

    .lvl-theme.active {
      border-color: var(--theme);
      box-shadow: inset 0 0 0 1px var(--theme);
    }

    .lvl-theme strong,
    .lvl-theme small {
      position: relative;
      z-index: 2;
      display: block;
    }

    .lvl-theme strong {
      font-size: 11px;
    }

    .lvl-theme small {
      margin-top: 7px;
      color: rgba(255,255,255,.42);
      font-size: 8px;
    }


    /* UPLOAD */

    .lvl-upload {
      min-height: 195px;
      display: grid;
      place-items: center;
      padding: 20px;
      border: 1px dashed rgba(167,139,250,.4);
      border-radius: 17px;
      background:
        radial-gradient(
          circle at top,
          rgba(139,92,246,.11),
          transparent 55%
        ),
        rgba(255,255,255,.012);
      text-align: center;
      transition: .2s ease;
    }

    .lvl-upload.dragging {
      border-color: #c1abff;
      background: rgba(139,92,246,.1);
      transform: scale(1.01);
    }

    .lvl-upload-icon {
      width: 50px;
      height: 50px;
      display: grid;
      place-items: center;
      margin: 0 auto 12px;
      border: 1px solid rgba(167,139,250,.22);
      border-radius: 15px;
      background: rgba(139,92,246,.07);
      font-size: 22px;
    }

    .lvl-upload h4 {
      margin: 0;
      color: white;
      font-size: 14px;
    }

    .lvl-upload p {
      margin: 7px 0 14px;
      color: rgba(255,255,255,.42);
      font-size: 9px;
    }

    .lvl-upload-buttons {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .lvl-upload-info {
      margin-top: 11px;
      color: #9effc7;
      font-size: 9px;
    }

    #lvlFileInput {
      display: none;
    }


    /* PREVIEW */

    .lvl-preview {
      --preview:#a855f7;

      position: relative;
      overflow: hidden;
      min-height: 330px;
      border: 1px solid rgba(255,255,255,.09);
      border-radius: 18px;
      background: #17191e;
    }

    .lvl-preview::before {
      content: "";
      position: absolute;
      inset: 0 auto 0 0;
      width: 5px;
      background: var(--preview);
    }

    .lvl-preview-inner {
      padding: 20px 20px 22px 25px;
    }

    .lvl-preview-content {
      margin-bottom: 15px;
      padding: 10px 12px;
      border-left: 3px solid var(--preview);
      border-radius: 6px;
      background: rgba(0,0,0,.18);
      color: rgba(255,255,255,.72);
      font-size: 11px;
    }

    .lvl-preview-top {
      display: flex;
      justify-content: space-between;
      gap: 15px;
    }

    .lvl-preview-title {
      color: white;
      font-size: 19px;
      font-weight: 700;
    }

    .lvl-preview-description {
      margin-top: 12px;
      color: rgba(255,255,255,.82);
      font-size: 13px;
      line-height: 1.6;
    }

    .lvl-preview-avatar {
      width: 76px;
      height: 76px;
      min-width: 76px;
      object-fit: cover;
      border-radius: 10px;
    }

    .lvl-preview-photo {
      width: 100%;
      max-height: 320px;
      display: none;
      margin-top: 18px;
      border-radius: 8px;
      object-fit: cover;
    }


    /* BUTTONS */

    .lvl-button {
      min-height: 41px;
      padding: 0 15px;
      border-radius: 11px;
      font-family: "IBM Plex Mono", monospace;
      font-size: 9px;
      font-weight: 600;
      cursor: pointer;
    }

    .lvl-button.secondary {
      border: 1px solid rgba(255,255,255,.1);
      background: rgba(255,255,255,.025);
      color: rgba(255,255,255,.62);
    }

    .lvl-button.primary {
      border: 1px solid rgba(167,139,250,.3);
      background: rgba(124,92,255,.18);
      color: white;
    }

    .lvl-button.test {
      border: 1px solid rgba(94,234,212,.27);
      background: rgba(45,212,191,.1);
      color: #adfff2;
    }

    .lvl-button:disabled,
    .lvl-toggle:disabled,
    .lvl-theme:disabled {
      opacity: .45;
      cursor: wait;
    }

    .lvl-actions {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-top: 18px;
      padding-top: 18px;
      border-top: 1px solid rgba(255,255,255,.07);
    }

    .lvl-actions-group {
      display: flex;
      gap: 9px;
    }

    @media(max-width:800px) {
      .lvl-grid,
      .lvl-fields {
        grid-template-columns: 1fr;
      }

      .lvl-themes {
        grid-template-columns: repeat(2,minmax(0,1fr));
      }

      .lvl-actions,
      .lvl-config-head {
        flex-direction: column;
        align-items: stretch;
      }

      .lvl-actions-group {
        width: 100%;
      }

      .lvl-actions-group button {
        flex: 1;
      }
    }
  `;

  document.head.appendChild(style);

  /* =========================================================
     HTML
  ========================================================= */

  const section = document.createElement("section");

  section.id = "arclumeLevelStudio";

  section.className = "lvl-config";

  section.innerHTML = `
    <div class="lvl-config-head">

      <div>
        <small>
          LEVELING / CONFIGURATION
        </small>

        <h3>
          Level-up Studio
        </h3>
      </div>

      <div
        class="lvl-state"
        id="lvlState"
      >
        WAITING
      </div>

    </div>


    <div class="lvl-body">

      <div class="lvl-grid">


        <div class="lvl-card">

          <div class="lvl-card-head">

            <div>
              <span class="lvl-label">
                MASTER SYSTEM
              </span>

              <b>
                XP Leveling
              </b>
            </div>

            <button
              type="button"
              class="lvl-toggle"
              id="lvlEnabled"
            >
              <span></span>
            </button>

          </div>

          <p class="lvl-description">
            Allow members to earn XP from messages.
          </p>

        </div>


        <div class="lvl-card">

          <div class="lvl-card-head">

            <div>
              <span class="lvl-label">
                AUTOMATION
              </span>

              <b>
                Auto Level-up Message
              </b>
            </div>

            <button
              type="button"
              class="lvl-toggle"
              id="lvlAnnouncement"
            >
              <span></span>
            </button>

          </div>

          <p class="lvl-description">
            Automatically send a message when someone levels up.
          </p>

        </div>


        <div class="lvl-card wide">

          <div class="lvl-fields">

            <label class="lvl-field">

              <span class="lvl-label">
                MINIMUM XP
              </span>

              <input
                id="lvlMinXP"
                type="number"
                min="1"
                max="10000"
              />

            </label>


            <label class="lvl-field">

              <span class="lvl-label">
                MAXIMUM XP
              </span>

              <input
                id="lvlMaxXP"
                type="number"
                min="1"
                max="10000"
              />

            </label>


            <label class="lvl-field">

              <span class="lvl-label">
                XP COOLDOWN / SECONDS
              </span>

              <input
                id="lvlCooldown"
                type="number"
                min="1"
                max="86400"
              />

            </label>


            <label class="lvl-field">

              <span class="lvl-label">
                ANNOUNCEMENT CHANNEL
              </span>

              <select id="lvlChannel">

                <option value="">
                  Loading channels...
                </option>

              </select>

            </label>

          </div>

        </div>


        <div class="lvl-card wide">

          <div class="lvl-card-head">

            <div>
              <span class="lvl-label">
                MESSAGE
              </span>

              <b>
                Custom Level-up Message
              </b>
            </div>

          </div>


          <label class="lvl-field">

            <textarea
              id="lvlMessage"
              maxlength="1000"
              placeholder="🎉 GG {mention}! You reached Level {level}!"
            ></textarea>

          </label>


          <div class="lvl-help">
            {mention} • {user} • {display} • {level} • {server}
          </div>

        </div>


        <div class="lvl-card wide">

          <div class="lvl-card-head">

            <div>
              <span class="lvl-label">
                CARD STYLE
              </span>

              <b>
                Select Theme
              </b>
            </div>

          </div>


          <div
            class="lvl-themes"
            id="lvlThemes"
          ></div>

        </div>


        <div class="lvl-card">

          <div class="lvl-card-head">

            <div>
              <span class="lvl-label">
                CARD PHOTO
              </span>

              <b>
                Image Source
              </b>
            </div>

          </div>


          <label class="lvl-field">

            <select id="lvlPhotoMode">

              <option value="none">
                No large photo
              </option>

              <option value="member-avatar">
                Member Avatar
              </option>

              <option value="server-image">
                Server Banner / Icon
              </option>

              <option value="uploaded">
                Uploaded Photo
              </option>

              <option value="custom">
                Custom URL
              </option>

            </select>

          </label>


          <label
            class="lvl-field"
            id="lvlCustomWrap"
            style="margin-top:12px;display:none"
          >

            <span class="lvl-label">
              CUSTOM IMAGE URL
            </span>

            <input
              id="lvlCustomImage"
              type="url"
              placeholder="https://..."
            />

          </label>

        </div>


        <div class="lvl-card">

          <div class="lvl-card-head">

            <div>
              <span class="lvl-label">
                PHOTO MANAGER
              </span>

              <b>
                Upload Image
              </b>
            </div>

          </div>


          <div
            class="lvl-upload"
            id="lvlDropZone"
          >

            <div>

              <div class="lvl-upload-icon">
                🖼️
              </div>

              <h4>
                Drag & Drop Photo
              </h4>

              <p>
                PNG, JPG, WEBP or GIF • Max 8 MB
              </p>


              <div class="lvl-upload-buttons">

                <button
                  type="button"
                  class="lvl-button primary"
                  id="lvlChoosePhoto"
                >
                  CHOOSE PHOTO
                </button>


                <button
                  type="button"
                  class="lvl-button secondary"
                  id="lvlRemovePhoto"
                >
                  REMOVE
                </button>

              </div>


              <input
                type="file"
                id="lvlFileInput"
                accept="image/png,image/jpeg,image/webp,image/gif"
              />


              <div
                class="lvl-upload-info"
                id="lvlUploadInfo"
              ></div>

            </div>

          </div>

        </div>


        <div class="lvl-card wide">

          <div class="lvl-card-head">

            <div>
              <span class="lvl-label">
                LIVE PREVIEW
              </span>

              <b>
                Discord Level-up Message
              </b>
            </div>

          </div>


          <div
            class="lvl-preview"
            id="lvlPreview"
          >

            <div class="lvl-preview-inner">


              <div
                class="lvl-preview-content"
                id="lvlPreviewContent"
              >
                🎉 GG @User! You reached Level 5!
              </div>


              <div class="lvl-preview-top">

                <div>

                  <div
                    class="lvl-preview-title"
                    id="lvlPreviewTitle"
                  >
                    💜 Level Up!
                  </div>


                  <div
                    class="lvl-preview-description"
                  >
                    Congratulations <b>User</b>!
                    <br />
                    You reached <b>Level 5</b>.
                  </div>

                </div>


                <img
                  class="lvl-preview-avatar"
                  id="lvlPreviewAvatar"
                  src="/arclume-logo.png"
                  alt=""
                />

              </div>


              <img
                class="lvl-preview-photo"
                id="lvlPreviewPhoto"
                alt=""
              />

            </div>

          </div>

        </div>

      </div>


      <div class="lvl-actions">

        <div class="lvl-actions-group">

          <button
            type="button"
            class="lvl-button test"
            id="lvlTest"
          >
            🧪 TEST MESSAGE
          </button>

        </div>


        <div class="lvl-actions-group">

          <button
            type="button"
            class="lvl-button secondary"
            id="lvlReset"
          >
            RESET
          </button>


          <button
            type="button"
            class="lvl-button primary"
            id="lvlSave"
          >
            SAVE SETTINGS
          </button>

        </div>

      </div>

    </div>
  `;

  const leaderboard = page.querySelector(".levelboard");

  if (leaderboard) {
    page.insertBefore(section, leaderboard);
  } else {
    page.appendChild(section);
  }

  /* =========================================================
     SHORTCUT
  ========================================================= */

  const $ = (id) => document.getElementById(id);

  let themes = [];

  let selectedTheme = "purple-neon";

  let guildInfo = {};

  let uploadedImage = null;

  let previewBlob = null;

  let busy = false;

  /* =========================================================
     BLOCK FORM RELOADS
  ========================================================= */

  document.addEventListener(
    "submit",

    (event) => {
      const form = event.target;

      if (form?.contains?.(section) || section.contains(form)) {
        event.preventDefault();
        event.stopPropagation();
      }
    },

    true,
  );

  /* =========================================================
     GUILD ID
  ========================================================= */

  function getGuildID() {
    try {
      if (typeof currentGuild !== "undefined" && currentGuild?.id) {
        return String(currentGuild.id);
      }
    } catch (_) {}

    try {
      if (window.currentGuild?.id) {
        return String(window.currentGuild.id);
      }
    } catch (_) {}

    const identity = document.getElementById("identityServerId");

    const text = identity?.textContent || "";

    const match = text.match(/\d{5,32}/);

    if (match) {
      return match[0];
    }

    return null;
  }

  /* =========================================================
     STATE
  ========================================================= */

  function setState(text, mode = "") {
    const box = $("lvlState");

    box.textContent = text;

    box.classList.remove("good", "error");

    if (mode) {
      box.classList.add(mode);
    }
  }

  function setBusy(value) {
    busy = value;

    [
      "lvlSave",
      "lvlReset",
      "lvlTest",
      "lvlChoosePhoto",
      "lvlRemovePhoto",
    ].forEach((id) => {
      const button = $(id);

      if (button) {
        button.disabled = value;
      }
    });
  }

  /* =========================================================
     TOGGLES
  ========================================================= */

  function setToggle(button, value) {
    button.dataset.enabled = value ? "true" : "false";

    button.classList.toggle("on", value);
  }

  function getToggle(button) {
    return button.dataset.enabled === "true";
  }

  function bindSafeButton(id, handler) {
    const button = $(id);

    if (!button) {
      return;
    }

    button.addEventListener(
      "click",

      async (event) => {
        event.preventDefault();

        event.stopPropagation();

        try {
          await handler(event);
        } catch (error) {
          console.error(error);
        }
      },

      true,
    );
  }

  bindSafeButton(
    "lvlEnabled",

    () => {
      setToggle($("lvlEnabled"), !getToggle($("lvlEnabled")));
    },
  );

  bindSafeButton(
    "lvlAnnouncement",

    () => {
      setToggle($("lvlAnnouncement"), !getToggle($("lvlAnnouncement")));
    },
  );

  /* =========================================================
     THEMES
  ========================================================= */

  function renderThemes() {
    const box = $("lvlThemes");

    box.innerHTML = "";

    themes.forEach((theme) => {
      const button = document.createElement("button");

      button.type = "button";

      button.className = "lvl-theme";

      button.style.setProperty("--theme", theme.color);

      button.innerHTML = `
          <strong>
            ${theme.emoji} ${theme.label}
          </strong>

          <small>
            ${theme.color}
          </small>
        `;

      button.classList.toggle("active", theme.id === selectedTheme);

      button.addEventListener(
        "click",

        (event) => {
          event.preventDefault();

          event.stopPropagation();

          selectedTheme = theme.id;

          renderThemes();

          updatePreview();
        },

        true,
      );

      box.appendChild(button);
    });
  }

  function currentTheme() {
    return (
      themes.find((item) => item.id === selectedTheme) || {
        emoji: "💜",

        color: "#a855f7",
      }
    );
  }

  /* =========================================================
     PREVIEW
  ========================================================= */

  function formatPreviewMessage() {
    return String(
      $("lvlMessage").value || "🎉 GG {mention}! You reached Level {level}!",
    )
      .replaceAll("{mention}", "@User")

      .replaceAll("{user}", "User")

      .replaceAll("{display}", "User")

      .replaceAll("{level}", "5")

      .replaceAll("{server}", guildInfo.name || "Server");
  }

  function updatePreview() {
    const theme = currentTheme();

    $("lvlPreview").style.setProperty("--preview", theme.color);

    $("lvlPreviewTitle").textContent = `${theme.emoji} Level Up!`;

    $("lvlPreviewContent").textContent = formatPreviewMessage();

    const avatar =
      document.getElementById("levelUserAvatar")?.src ||
      guildInfo.icon ||
      "/arclume-logo.png";

    $("lvlPreviewAvatar").src = avatar;

    const mode = $("lvlPhotoMode").value;

    $("lvlCustomWrap").style.display = mode === "custom" ? "block" : "none";

    let src = "";

    if (mode === "member-avatar") {
      src = avatar;
    }

    if (mode === "server-image") {
      src = guildInfo.banner || guildInfo.icon || "";
    }

    if (mode === "custom") {
      src = $("lvlCustomImage").value.trim();
    }

    if (mode === "uploaded") {
      src = previewBlob || uploadedImage?.url || "";
    }

    const photo = $("lvlPreviewPhoto");

    if (src) {
      photo.src = src;

      photo.style.display = "block";
    } else {
      photo.removeAttribute("src");

      photo.style.display = "none";
    }
  }

  /* =========================================================
     FILE INFO
  ========================================================= */

  function formatBytes(value) {
    const bytes = Number(value) || 0;

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function showFileInfo(text = "") {
    $("lvlUploadInfo").textContent = text;
  }

  /* =========================================================
     LOAD SETTINGS
  ========================================================= */

  async function loadSettings() {
    const guildID = getGuildID();

    if (!guildID) {
      setState("NO SERVER", "error");

      $("lvlChannel").innerHTML = `
        <option value="">
          Could not detect server
        </option>
      `;

      return;
    }

    setState("LOADING");

    try {
      const response = await fetch(
        `/api/guild/${encodeURIComponent(guildID)}/leveling/settings`,

        {
          method: "GET",

          credentials: "same-origin",

          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not load settings.");
      }

      const settings = data.settings || {};

      themes = data.themes || [];

      guildInfo = data.guild || {};

      uploadedImage = data.uploadedImage || null;

      selectedTheme = settings.cardTheme || "purple-neon";

      setToggle($("lvlEnabled"), settings.enabled !== false);

      setToggle($("lvlAnnouncement"), settings.levelUpEnabled !== false);

      $("lvlMinXP").value = settings.minXP ?? 15;

      $("lvlMaxXP").value = settings.maxXP ?? 25;

      $("lvlCooldown").value = settings.cooldownSeconds ?? 60;

      $("lvlMessage").value =
        settings.levelUpMessage ||
        "🎉 GG {mention}! You reached Level {level}!";

      $("lvlPhotoMode").value = settings.photoMode || "member-avatar";

      $("lvlCustomImage").value = settings.customImageURL || "";

      /* CHANNELS */

      const channelSelect = $("lvlChannel");

      channelSelect.innerHTML = `
        <option value="">
          Same channel where member leveled
        </option>
      `;

      const channels = Array.isArray(data.channels) ? data.channels : [];

      channels.forEach((channel) => {
        const option = document.createElement("option");

        option.value = channel.id;

        option.textContent = `#${channel.name}`;

        channelSelect.appendChild(option);
      });

      if (settings.levelUpChannelID) {
        channelSelect.value = settings.levelUpChannelID;
      }

      if (uploadedImage) {
        showFileInfo(
          `✓ ${uploadedImage.fileName} • ${formatBytes(
            uploadedImage.fileSize,
          )}`,
        );
      } else {
        showFileInfo("No uploaded photo yet.");
      }

      renderThemes();

      updatePreview();

      setState("SYNCED", "good");

      console.log(`✅ Loaded ${channels.length} leveling channels`);
    } catch (error) {
      console.error("❌ Leveling settings load:", error);

      setState("LOAD ERROR", "error");

      $("lvlChannel").innerHTML = `
        <option value="">
          Failed to load channels
        </option>
      `;
    }
  }

  /* =========================================================
     COLLECT SETTINGS
  ========================================================= */

  function collectSettings() {
    let minXP = Number($("lvlMinXP").value);

    let maxXP = Number($("lvlMaxXP").value);

    if (!Number.isFinite(minXP)) {
      minXP = 15;
    }

    if (!Number.isFinite(maxXP)) {
      maxXP = 25;
    }

    minXP = Math.max(1, Math.floor(minXP));

    maxXP = Math.max(1, Math.floor(maxXP));

    if (minXP > maxXP) {
      [minXP, maxXP] = [maxXP, minXP];
    }

    return {
      enabled: getToggle($("lvlEnabled")),

      levelUpEnabled: getToggle($("lvlAnnouncement")),

      minXP,

      maxXP,

      cooldownSeconds: Math.max(1, Number($("lvlCooldown").value) || 60),

      levelUpChannelID: $("lvlChannel").value || null,

      levelUpMessage: $("lvlMessage").value.trim(),

      cardTheme: selectedTheme,

      photoMode: $("lvlPhotoMode").value,

      customImageURL: $("lvlCustomImage").value.trim(),
    };
  }

  /* =========================================================
     SAVE SETTINGS
  ========================================================= */

  async function saveSettings() {
    if (busy) {
      return;
    }

    const guildID = getGuildID();

    if (!guildID) {
      setState("NO SERVER", "error");

      return;
    }

    setBusy(true);

    setState("SAVING");

    try {
      const response = await fetch(
        `/api/guild/${encodeURIComponent(guildID)}/leveling/settings`,

        {
          method: "PUT",

          credentials: "same-origin",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(collectSettings()),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not save settings.");
      }

      setState("SAVED", "good");

      setTimeout(
        () => {
          setState("SYNCED", "good");
        },

        1200,
      );
    } catch (error) {
      console.error("❌ Save settings:", error);

      setState("SAVE ERROR", "error");

      alert(error.message);
    } finally {
      setBusy(false);
    }
  }

  /* =========================================================
     TEST
  ========================================================= */

  async function sendTest() {
    if (busy) {
      return;
    }

    const guildID = getGuildID();

    if (!guildID) {
      return;
    }

    setBusy(true);

    setState("SENDING TEST");

    try {
      const response = await fetch(
        `/api/guild/${encodeURIComponent(guildID)}/leveling/test`,

        {
          method: "POST",

          credentials: "same-origin",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(collectSettings()),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not send test message.");
      }

      setState("TEST SENT", "good");

      alert(`✅ ${data.message || "Test message sent."}`);
    } catch (error) {
      console.error("❌ Test message:", error);

      setState("TEST ERROR", "error");

      alert(error.message);
    } finally {
      setBusy(false);
    }
  }

  /* =========================================================
     RESET
  ========================================================= */

  async function resetSettings() {
    if (busy) {
      return;
    }

    if (!confirm("Reset all leveling settings?")) {
      return;
    }

    const guildID = getGuildID();

    if (!guildID) {
      return;
    }

    setBusy(true);

    setState("RESETTING");

    try {
      const response = await fetch(
        `/api/guild/${encodeURIComponent(guildID)}/leveling/settings/reset`,

        {
          method: "POST",

          credentials: "same-origin",
        },
      );

      if (!response.ok) {
        throw new Error("Reset failed.");
      }

      await loadSettings();
    } catch (error) {
      console.error(error);

      setState("RESET ERROR", "error");
    } finally {
      setBusy(false);
    }
  }

  /* =========================================================
     UPLOAD
  ========================================================= */

  async function uploadPhoto(file) {
    if (!file || busy) {
      return;
    }

    const types = ["image/png", "image/jpeg", "image/webp", "image/gif"];

    if (!types.includes(file.type)) {
      alert("Use PNG, JPG, WEBP or GIF.");

      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert("Image must be 8 MB or smaller.");

      return;
    }

    const guildID = getGuildID();

    if (!guildID) {
      return;
    }

    if (previewBlob) {
      URL.revokeObjectURL(previewBlob);
    }

    previewBlob = URL.createObjectURL(file);

    $("lvlPhotoMode").value = "uploaded";

    updatePreview();

    setBusy(true);

    setState("UPLOADING");

    showFileInfo(`Uploading ${file.name}...`);

    try {
      const response = await fetch(
        `/api/guild/${encodeURIComponent(guildID)}/leveling/image`,

        {
          method: "PUT",

          credentials: "same-origin",

          headers: {
            "Content-Type": file.type,

            "X-File-Name": encodeURIComponent(file.name),
          },

          body: file,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed.");
      }

      uploadedImage = data.image;

      if (previewBlob) {
        URL.revokeObjectURL(previewBlob);

        previewBlob = null;
      }

      showFileInfo(
        `✓ ${uploadedImage.fileName} • ${formatBytes(uploadedImage.fileSize)}`,
      );

      setState("PHOTO READY", "good");

      updatePreview();
    } catch (error) {
      console.error("❌ Photo upload:", error);

      setState("UPLOAD ERROR", "error");

      alert(error.message);
    } finally {
      setBusy(false);
    }
  }

  /* =========================================================
     DELETE PHOTO
  ========================================================= */

  async function removePhoto() {
    if (busy) {
      return;
    }

    const guildID = getGuildID();

    if (!guildID) {
      return;
    }

    if (!confirm("Remove uploaded level-up photo?")) {
      return;
    }

    setBusy(true);

    setState("REMOVING");

    try {
      const response = await fetch(
        `/api/guild/${encodeURIComponent(guildID)}/leveling/image`,

        {
          method: "DELETE",

          credentials: "same-origin",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not remove photo.");
      }

      uploadedImage = null;

      if (previewBlob) {
        URL.revokeObjectURL(previewBlob);

        previewBlob = null;
      }

      if ($("lvlPhotoMode").value === "uploaded") {
        $("lvlPhotoMode").value = "member-avatar";
      }

      showFileInfo("No uploaded photo yet.");

      setState("PHOTO REMOVED", "good");

      updatePreview();
    } catch (error) {
      console.error(error);

      setState("REMOVE ERROR", "error");
    } finally {
      setBusy(false);
    }
  }

  /* =========================================================
     SAFE BUTTON EVENTS
  ========================================================= */

  bindSafeButton("lvlSave", saveSettings);

  bindSafeButton("lvlTest", sendTest);

  bindSafeButton("lvlReset", resetSettings);

  bindSafeButton(
    "lvlChoosePhoto",

    () => {
      $("lvlFileInput").click();
    },
  );

  bindSafeButton("lvlRemovePhoto", removePhoto);

  /* =========================================================
     FILE PICKER
  ========================================================= */

  $("lvlFileInput").addEventListener(
    "change",

    (event) => {
      const file = event.target.files?.[0];

      if (file) {
        uploadPhoto(file);
      }

      event.target.value = "";
    },
  );

  /* =========================================================
     DRAG / DROP
  ========================================================= */

  const dropZone = $("lvlDropZone");

  ["dragenter", "dragover"].forEach((type) => {
    dropZone.addEventListener(
      type,

      (event) => {
        event.preventDefault();
        event.stopPropagation();

        dropZone.classList.add("dragging");
      },
    );
  });

  ["dragleave", "drop"].forEach((type) => {
    dropZone.addEventListener(
      type,

      (event) => {
        event.preventDefault();
        event.stopPropagation();

        dropZone.classList.remove("dragging");
      },
    );
  });

  dropZone.addEventListener(
    "drop",

    (event) => {
      const file = event.dataTransfer?.files?.[0];

      if (file) {
        uploadPhoto(file);
      }
    },
  );

  /* =========================================================
     PREVIEW EVENTS
  ========================================================= */

  ["lvlMessage", "lvlPhotoMode", "lvlCustomImage"].forEach((id) => {
    const input = $(id);

    input.addEventListener("input", updatePreview);

    input.addEventListener("change", updatePreview);
  });

  /* =========================================================
     PAGE OPEN EVENTS
  ========================================================= */

  [
    "levelingNavButton",
    "overviewLevelingButton",
    "systemLevelingButton",
  ].forEach((id) => {
    const button = $(id);

    if (!button) {
      return;
    }

    button.addEventListener(
      "click",

      () => {
        setTimeout(loadSettings, 150);
      },
    );
  });

  /* =========================================================
     SERVER SWITCH
  ========================================================= */

  const serverIdentity = document.getElementById("identityServerId");

  if (serverIdentity) {
    new MutationObserver(() => {
      setTimeout(loadSettings, 150);
    }).observe(
      serverIdentity,

      {
        childList: true,

        subtree: true,

        characterData: true,
      },
    );
  }

  /* =========================================================
     CLEANUP
  ========================================================= */

  window.addEventListener(
    "beforeunload",

    () => {
      if (previewBlob) {
        URL.revokeObjectURL(previewBlob);
      }
    },
  );

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  setTimeout(loadSettings, 300);

  console.log("⚙️ Arclume Level-up Studio loaded");

  console.log("🖼️ Level photo manager loaded");

  console.log("🧪 Level test message loaded");

  console.log("🛡️ Level settings reload protection loaded");
})();
