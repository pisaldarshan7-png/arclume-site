/* =========================================================
   ARCLUME — REACTION ROLES
   CLEAN BUILD V1
========================================================= */

(() => {
  "use strict";

  /* =====================================================
     MOUNT
  ===================================================== */

  const mount = document.getElementById("reactionRolesMount");

  if (!mount) {
    console.error("❌ Reaction Roles mount not found.");

    return;
  }

  /* =====================================================
     STATE
  ===================================================== */

  let currentGuildID = "";

  let loading = false;

  let channels = [];

  let roles = [];

  let settings = {
    enabled: false,

    panelChannel: "",

    panelMessageID: "",

    title: "Choose Your Roles",

    message: "Click the buttons below to add or remove roles.",

    roleIDs: [],
  };

  /* =====================================================
     UI
  ===================================================== */

  mount.innerHTML = `
    <section class="rr-shell">

      <header class="rr-head">

        <div>

          <small>
            02 / REACTION ROLES
          </small>

          <h2>
            Reaction Roles
          </h2>

          <p>
            Let members choose their own Discord roles from a panel posted by Arclume.
          </p>

        </div>


        <span
          class="rr-state"
          id="rrPanelState"
        >
          NOT PUBLISHED
        </span>

      </header>


      <div class="rr-grid">

        <article class="rr-card">

          <span class="rr-card-label">
            02A / PANEL SETUP
          </span>


          <h3>
            Role selector panel
          </h3>


          <p>
            Choose the channel where Arclume should publish the Reaction Role panel.
          </p>


          <div class="rr-toggle-row">

            <div class="rr-toggle-copy">

              <strong>
                Reaction Roles
              </strong>

              <span>
                Members can add or remove the selected roles.
              </span>

            </div>


            <label class="rr-switch">

              <input
                type="checkbox"
                id="rrEnabled"
              >

              <span class="rr-slider"></span>

            </label>

          </div>


          <div class="rr-field">

            <label for="rrChannel">
              PANEL CHANNEL
            </label>


            <select id="rrChannel">

              <option value="">
                Loading channels...
              </option>

            </select>

          </div>


          <div class="rr-field">

            <label for="rrTitle">
              PANEL TITLE
            </label>


            <input
              id="rrTitle"
              type="text"
              maxlength="100"
              placeholder="Choose Your Roles"
            >

          </div>


          <div class="rr-field">

            <label for="rrMessage">
              PANEL MESSAGE
            </label>


            <textarea
              id="rrMessage"
              maxlength="1000"
              placeholder="Click the buttons below to add or remove roles."
            ></textarea>

          </div>


          <div class="rr-preview">

            <div class="rr-preview-embed">

              <h4 id="rrPreviewTitle">
                Choose Your Roles
              </h4>


              <p id="rrPreviewMessage">
                Click the buttons below to add or remove roles.
              </p>

            </div>


            <div
              class="rr-preview-buttons"
              id="rrPreviewButtons"
            ></div>

          </div>

        </article>


        <article class="rr-card">

          <span class="rr-card-label">
            02B / AVAILABLE ROLES
          </span>


          <h3>
            Select member roles
          </h3>


          <p>
            Choose which manageable Discord roles members are allowed to select.
          </p>


          <div
            class="rr-role-list"
            id="rrRoleList"
          >

            <div class="rr-role-empty">
              Loading Discord roles...
            </div>

          </div>


          <div
            class="rr-counter"
            id="rrCounter"
          >
            0 SELECTED
          </div>

        </article>

      </div>


      <footer class="rr-footer">

        <span
          class="rr-status"
          id="rrStatus"
        >
          LOADING REACTION ROLES...
        </span>


        <div class="rr-actions">

          <button
            class="rr-save"
            id="rrSave"
            type="button"
          >
            SAVE SETTINGS
          </button>


          <button
            class="rr-publish"
            id="rrPublish"
            type="button"
          >
            PUBLISH PANEL
          </button>

        </div>

      </footer>

    </section>
  `;

  /* =====================================================
     ELEMENTS
  ===================================================== */

  const enabled = document.getElementById("rrEnabled");

  const channel = document.getElementById("rrChannel");

  const title = document.getElementById("rrTitle");

  const message = document.getElementById("rrMessage");

  const roleList = document.getElementById("rrRoleList");

  const counter = document.getElementById("rrCounter");

  const status = document.getElementById("rrStatus");

  const panelState = document.getElementById("rrPanelState");

  const previewTitle = document.getElementById("rrPreviewTitle");

  const previewMessage = document.getElementById("rrPreviewMessage");

  const previewButtons = document.getElementById("rrPreviewButtons");

  const saveButton = document.getElementById("rrSave");

  const publishButton = document.getElementById("rrPublish");

  /* =====================================================
     FETCH
  ===================================================== */

  async function fetchJSON(url, options = {}) {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 10000);

    try {
      const response = await fetch(url, {
        credentials: "same-origin",

        signal: controller.signal,

        ...options,
      });

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data.error || `Request failed (${response.status})`);
      }

      return data;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Request timed out.");
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  /* =====================================================
     CURRENT GUILD
  ===================================================== */

  async function resolveGuild() {
    const data = await fetchJSON("/api/me");

    if (!data.loggedIn || !Array.isArray(data.guilds) || !data.guilds.length) {
      throw new Error("No manageable Discord server found.");
    }

    const storedGuild = localStorage.getItem("arclume-selected-guild");

    const guild =
      data.guilds.find((item) => item.id === storedGuild) || data.guilds[0];

    currentGuildID = guild.id;

    localStorage.setItem("arclume-selected-guild", currentGuildID);
  }

  /* =====================================================
     SELECTED ROLES
  ===================================================== */

  function selectedRoleIDs() {
    return Array.from(
      roleList.querySelectorAll('input[type="checkbox"]:checked'),
    ).map((checkbox) => checkbox.value);
  }

  /* =====================================================
     CHANNELS
  ===================================================== */

  function renderChannels() {
    channel.replaceChildren();

    const placeholder = document.createElement("option");

    placeholder.value = "";

    placeholder.textContent = channels.length
      ? `Select channel (${channels.length})`
      : "No text channels found";

    channel.appendChild(placeholder);

    channels.forEach((item) => {
      const option = document.createElement("option");

      option.value = String(item.id);

      const category = item.category ? `${item.category} / ` : "";

      if (item.type === "announcement") {
        option.textContent = `${category}📢 ${item.name}`;
      } else {
        option.textContent = `${category}# ${item.name}`;
      }

      channel.appendChild(option);
    });

    const savedExists = channels.some(
      (item) => String(item.id) === String(settings.panelChannel),
    );

    channel.value = savedExists ? String(settings.panelChannel) : "";
  }

  /* =====================================================
     ROLES
  ===================================================== */

  function renderRoles() {
    roleList.replaceChildren();

    if (!roles.length) {
      const empty = document.createElement("div");

      empty.className = "rr-role-empty";

      empty.textContent = "No Discord roles found.";

      roleList.appendChild(empty);

      counter.textContent = "0 SELECTED";

      return;
    }

    const selected = new Set(settings.roleIDs || []);

    roles.forEach((role) => {
      const row = document.createElement("label");

      row.className = "rr-role";

      if (role.assignable === false) {
        row.classList.add("disabled");
      }

      const info = document.createElement("span");

      info.className = "rr-role-info";

      const dot = document.createElement("span");

      dot.className = "rr-role-dot";

      if (role.color && role.color !== "#000000") {
        dot.style.background = role.color;
      }

      const roleName = document.createElement("span");

      roleName.className = "rr-role-name";

      roleName.textContent = role.name;

      info.appendChild(dot);

      info.appendChild(roleName);

      if (role.assignable === false) {
        const locked = document.createElement("small");

        locked.textContent = "LOCKED";

        info.appendChild(locked);
      }

      const checkbox = document.createElement("input");

      checkbox.type = "checkbox";

      checkbox.value = role.id;

      checkbox.checked = selected.has(role.id);

      checkbox.disabled = role.assignable === false;

      checkbox.addEventListener("change", updatePreview);

      row.appendChild(info);

      row.appendChild(checkbox);

      roleList.appendChild(row);
    });

    updatePreview();
  }

  /* =====================================================
     PREVIEW
  ===================================================== */

  function updatePreview() {
    previewTitle.textContent = title.value.trim() || "Choose Your Roles";

    previewMessage.textContent =
      message.value.trim() || "Click the buttons below to add or remove roles.";

    previewButtons.replaceChildren();

    const selected = selectedRoleIDs();

    counter.textContent = `${selected.length} SELECTED`;

    const selectedRoles = roles.filter((role) => selected.includes(role.id));

    if (!selectedRoles.length) {
      const empty = document.createElement("span");

      empty.className = "rr-preview-button";

      empty.textContent = "Select a role";

      previewButtons.appendChild(empty);

      return;
    }

    selectedRoles.forEach((role) => {
      const button = document.createElement("span");

      button.className = "rr-preview-button";

      button.textContent = role.name;

      previewButtons.appendChild(button);
    });
  }

  /* =====================================================
     PANEL STATE
  ===================================================== */

  function renderPanelState() {
    const published = Boolean(settings.panelMessageID);

    panelState.textContent = published ? "PUBLISHED" : "NOT PUBLISHED";

    panelState.classList.toggle("published", published);
  }

  /* =====================================================
     APPLY
  ===================================================== */

  function applySettings() {
    enabled.checked = settings.enabled === true;

    title.value = settings.title || "Choose Your Roles";

    message.value =
      settings.message || "Click the buttons below to add or remove roles.";

    renderPanelState();

    renderChannels();

    renderRoles();

    updatePreview();
  }

  /* =====================================================
     LOAD
  ===================================================== */

  async function loadReactionRoles() {
    if (loading) {
      return;
    }

    loading = true;

    status.textContent = "LOADING REACTION ROLES...";

    channel.innerHTML = '<option value="">Loading channels...</option>';

    roleList.innerHTML =
      '<div class="rr-role-empty">Loading Discord roles...</div>';

    try {
      await resolveGuild();

      const [settingsData, optionsData] = await Promise.all([
        fetchJSON(`/api/guild/${currentGuildID}/reaction-roles/settings`),

        fetchJSON(`/api/guild/${currentGuildID}/reaction-roles/cache-options`),
      ]);

      settings = {
        enabled: false,

        panelChannel: "",

        panelMessageID: "",

        title: "Choose Your Roles",

        message: "Click the buttons below to add or remove roles.",

        roleIDs: [],

        ...(settingsData.settings || {}),
      };

      channels = Array.isArray(optionsData.channels)
        ? optionsData.channels
        : [];

      roles = Array.isArray(optionsData.roles) ? optionsData.roles : [];

      applySettings();

      status.textContent = `READY • ${channels.length} CHANNELS • ${roles.length} ROLES`;
    } catch (error) {
      console.error("❌ Reaction Roles load error:", error);

      channels = [];

      roles = [];

      channel.replaceChildren();

      const failedChannel = document.createElement("option");

      failedChannel.value = "";

      failedChannel.textContent = "Channels failed to load";

      channel.appendChild(failedChannel);

      roleList.replaceChildren();

      const failedRoles = document.createElement("div");

      failedRoles.className = "rr-role-empty";

      failedRoles.textContent = "Roles failed to load.";

      roleList.appendChild(failedRoles);

      status.textContent = `ERROR • ${error.message}`;
    } finally {
      loading = false;
    }
  }

  /* =====================================================
     SAVE PAYLOAD
  ===================================================== */

  function buildPayload() {
    return {
      enabled: enabled.checked,

      panelChannel: channel.value,

      title: title.value.trim() || "Choose Your Roles",

      message:
        message.value.trim() ||
        "Click the buttons below to add or remove roles.",

      roleIDs: selectedRoleIDs(),
    };
  }

  /* =====================================================
     SAVE
  ===================================================== */

  async function saveSettings(showSuccess = true) {
    if (!currentGuildID) {
      return false;
    }

    saveButton.disabled = true;

    status.textContent = "SAVING...";

    try {
      const data = await fetchJSON(
        `/api/guild/${currentGuildID}/reaction-roles/settings`,

        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(buildPayload()),
        },
      );

      settings = {
        ...settings,

        ...(data.settings || {}),
      };

      renderPanelState();

      if (showSuccess) {
        status.textContent = "REACTION ROLES SAVED";
      }

      return true;
    } catch (error) {
      console.error("❌ Reaction Roles save error:", error);

      status.textContent = `SAVE FAILED • ${error.message}`;

      return false;
    } finally {
      saveButton.disabled = false;
    }
  }

  /* =====================================================
     PUBLISH
  ===================================================== */

  async function publishPanel() {
    if (!enabled.checked) {
      status.textContent = "ENABLE REACTION ROLES FIRST";

      return;
    }

    if (!channel.value) {
      status.textContent = "SELECT A PANEL CHANNEL";

      return;
    }

    if (!selectedRoleIDs().length) {
      status.textContent = "SELECT AT LEAST ONE ROLE";

      return;
    }

    publishButton.disabled = true;

    saveButton.disabled = true;

    publishButton.textContent = "PUBLISHING...";

    try {
      const saved = await saveSettings(false);

      if (!saved) {
        return;
      }

      status.textContent = "PUBLISHING PANEL...";

      const data = await fetchJSON(
        `/api/guild/${currentGuildID}/reaction-roles/publish`,

        {
          method: "POST",
        },
      );

      settings = {
        ...settings,

        ...(data.settings || {}),
      };

      renderPanelState();

      status.textContent = "REACTION ROLE PANEL PUBLISHED";
    } catch (error) {
      console.error("❌ Reaction Roles publish error:", error);

      status.textContent = `PUBLISH FAILED • ${error.message}`;
    } finally {
      publishButton.disabled = false;

      saveButton.disabled = false;

      publishButton.textContent = "PUBLISH PANEL";
    }
  }

  /* =====================================================
     EVENTS
  ===================================================== */

  title.addEventListener("input", updatePreview);

  message.addEventListener("input", updatePreview);

  saveButton.addEventListener("click", () => {
    saveSettings();
  });

  publishButton.addEventListener("click", publishPanel);

  /* =====================================================
     SERVER SWITCH WATCHER
  ===================================================== */

  let knownGuild = localStorage.getItem("arclume-selected-guild") || "";

  setInterval(() => {
    const latest = localStorage.getItem("arclume-selected-guild") || "";

    if (latest && latest !== knownGuild) {
      knownGuild = latest;

      currentGuildID = latest;

      loadReactionRoles();
    }
  }, 800);

  /* =====================================================
     START
  ===================================================== */

  loadReactionRoles();
})();
