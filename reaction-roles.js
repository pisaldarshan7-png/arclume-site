/* =========================================================
   ARCLUME — REACTION ROLES UI
   Loaded inside roles.html
========================================================= */
(() => {
  let currentGuildID = "";
  let settings = {
    enabled: false,
    panelChannel: "",
    panelMessageID: "",
    title: "Choose Your Roles",
    message: "Click the buttons below to add or remove roles.",
    roleIDs: [],
  };
  let channels = [];
  let roles = [];
  let loading = false;
  /* =======================================================
     STYLES
  ======================================================= */
  const style = document.createElement("style");
  style.textContent = `
    .rr-shell {
      width: min(1400px, calc(100% - 40px));
      margin: 28px auto 80px;
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 18px;
      overflow: hidden;
      background: rgba(16,16,14,.78);
      color: #f0ede5;
      font-family: Inter, sans-serif;
    }
    .rr-head {
      padding: 26px 28px;
      border-bottom: 1px solid rgba(255,255,255,.08);
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 20px;
    }
    .rr-head small {
      display: block;
      color: #bc9670;
      font-family: "DM Mono", monospace;
      font-size: 9px;
      letter-spacing: .13em;
    }
    .rr-head h2 {
      margin: 8px 0 6px;
      font-size: 27px;
      letter-spacing: -.04em;
    }
    .rr-head p {
      margin: 0;
      color: #8d8a81;
      font-size: 12px;
      line-height: 1.6;
    }
    .rr-state {
      padding: 7px 10px;
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 8px;
      color: #8d8a81;
      font-family: "DM Mono", monospace;
      font-size: 8px;
      white-space: nowrap;
    }
    .rr-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
    .rr-card {
      padding: 28px;
      min-width: 0;
    }
    .rr-card + .rr-card {
      border-left: 1px solid rgba(255,255,255,.08);
    }
    .rr-card-label {
      color: #bc9670;
      font-family: "DM Mono", monospace;
      font-size: 9px;
      letter-spacing: .12em;
    }
    .rr-card h3 {
      margin: 8px 0 7px;
      font-size: 20px;
    }
    .rr-card > p {
      margin: 0 0 22px;
      color: #8d8a81;
      font-size: 11px;
      line-height: 1.6;
    }
    .rr-toggle-row {
      min-height: 68px;
      padding: 14px;
      margin-bottom: 18px;
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
    }
    .rr-toggle-copy strong {
      display: block;
      font-size: 12px;
    }
    .rr-toggle-copy span {
      display: block;
      margin-top: 4px;
      color: #625f58;
      font-size: 9px;
    }
    .rr-switch {
      position: relative;
      width: 44px;
      height: 24px;
      flex-shrink: 0;
    }
    .rr-switch input {
      opacity: 0;
      position: absolute;
    }
    .rr-slider {
      position: absolute;
      inset: 0;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.14);
      background: #1c1c19;
      transition: .2s;
    }
    .rr-slider::after {
      content: "";
      position: absolute;
      width: 16px;
      height: 16px;
      left: 3px;
      top: 3px;
      border-radius: 50%;
      background: #8d8a81;
      transition: .2s;
    }
    .rr-switch input:checked + .rr-slider {
      border-color: rgba(145,214,168,.38);
      background: rgba(145,214,168,.13);
    }
    .rr-switch input:checked + .rr-slider::after {
      transform: translateX(20px);
      background: #91d6a8;
    }
    .rr-field {
      margin-bottom: 17px;
    }
    .rr-field label {
      display: block;
      margin-bottom: 7px;
      color: #8d8a81;
      font-family: "DM Mono", monospace;
      font-size: 9px;
      letter-spacing: .08em;
    }
    .rr-field input,
    .rr-field textarea,
    .rr-field select {
      width: 100%;
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 11px;
      outline: none;
      background: #0c0c0a;
      color: #f0ede5;
      font: inherit;
    }
    .rr-field input,
    .rr-field select {
      height: 45px;
      padding: 0 12px;
    }
    .rr-field textarea {
      min-height: 110px;
      padding: 12px;
      resize: vertical;
    }
    .rr-role-list {
      max-height: 360px;
      overflow-y: auto;
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 12px;
    }
    .rr-role {
      min-height: 52px;
      padding: 10px 13px;
      border-bottom: 1px solid rgba(255,255,255,.07);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
    }
    .rr-role:last-child {
      border-bottom: 0;
    }
    .rr-role-info {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .rr-role-dot {
      width: 9px;
      height: 9px;
      flex-shrink: 0;
      border-radius: 50%;
      background: #777;
    }
    .rr-role-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 11px;
    }
    .rr-role small {
      color: #df7d7d;
      font-size: 8px;
    }
    .rr-role input {
      width: 17px;
      height: 17px;
      accent-color: #9c8cff;
    }
    .rr-role.disabled {
      opacity: .48;
    }
    .rr-role-empty {
      padding: 35px 20px;
      color: #625f58;
      text-align: center;
      font-size: 10px;
    }
    .rr-counter {
      margin-top: 9px;
      color: #625f58;
      font-family: "DM Mono", monospace;
      font-size: 8px;
    }
    .rr-preview {
      margin-top: 22px;
      padding: 18px;
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 13px;
      background: #121316;
    }
    .rr-preview-embed {
      padding: 16px 17px;
      border-left: 4px solid #9c8cff;
      border-radius: 4px 9px 9px 4px;
      background: #18191d;
    }
    .rr-preview-embed h4 {
      margin: 0 0 8px;
      font-size: 14px;
    }
    .rr-preview-embed p {
      margin: 0;
      color: #b9bbc1;
      font-size: 11px;
      line-height: 1.55;
      white-space: pre-wrap;
    }
    .rr-preview-buttons {
      margin-top: 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
    }
    .rr-preview-button {
      padding: 8px 11px;
      border-radius: 5px;
      background: #4e5058;
      color: white;
      font-size: 10px;
    }
    .rr-footer {
      padding: 20px 28px;
      border-top: 1px solid rgba(255,255,255,.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 15px;
    }
    .rr-status {
      color: #8d8a81;
      font-family: "DM Mono", monospace;
      font-size: 9px;
    }
    .rr-actions {
      display: flex;
      gap: 10px;
    }
    .rr-save,
    .rr-publish {
      min-height: 43px;
      padding: 0 18px;
      border-radius: 11px;
      font-family: inherit;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .06em;
      cursor: pointer;
    }
    .rr-save {
      border: 1px solid rgba(255,255,255,.1);
      background: transparent;
      color: #e8dfc8;
    }
    .rr-publish {
      border: 0;
      background: #e8dfc8;
      color: #111;
    }
    .rr-save:disabled,
    .rr-publish:disabled {
      opacity: .55;
      cursor: not-allowed;
    }
    @media (max-width: 850px) {
      .rr-grid {
        grid-template-columns: 1fr;
      }
      .rr-card + .rr-card {
        border-left: 0;
        border-top: 1px solid rgba(255,255,255,.08);
      }
    }
    @media (max-width: 600px) {
      .rr-shell {
        width: calc(100% - 24px);
      }
      .rr-head,
      .rr-footer {
        align-items: flex-start;
        flex-direction: column;
      }
      .rr-actions {
        width: 100%;
      }
      .rr-actions button {
        flex: 1;
      }
    }
  `;
  document.head.appendChild(style);
  /* =======================================================
     HTML
  ======================================================= */
  const section =
    document.createElement("section");
  section.className =
    "rr-shell";
  section.innerHTML = `
    <header class="rr-head">
      <div>
        <small>REACTION ROLES / SELF SERVICE</small>
        <h2>Reaction Roles</h2>
        <p>
          Let members choose their own roles using Discord buttons.
          Clicking again removes the role.
        </p>
      </div>
      <span class="rr-state" id="rrPanelState">
        NOT PUBLISHED
      </span>
    </header>
    <div class="rr-grid">
      <article class="rr-card">
        <span class="rr-card-label">
          01 / PANEL
        </span>
        <h3>Role selector</h3>
        <p>
          Configure where the panel is posted and
          what members see.
        </p>
        <div class="rr-toggle-row">
          <div class="rr-toggle-copy">
            <strong>Reaction Roles</strong>
            <span>
              Allow members to add and remove selected roles.
            </span>
          </div>
          <label class="rr-switch">
            <input
              type="checkbox"
              id="rrEnabled"
            />
            <span class="rr-slider"></span>
          </label>
        </div>
        <div class="rr-field">
          <label for="rrChannel">
            PANEL CHANNEL
          </label>
          <select id="rrChannel">
            <option value="">
              Select channel
            </option>
          </select>
        </div>
        <div class="rr-field">
          <label for="rrTitle">
            PANEL TITLE
          </label>
          <input
            id="rrTitle"
            maxlength="100"
            placeholder="Choose Your Roles"
          />
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
          02 / AVAILABLE ROLES
        </span>
        <h3>Select member roles</h3>
        <p>
          Choose the roles members can select. Arclume's Discord role
          must be above every role it gives.
        </p>
        <div
          class="rr-role-list"
          id="rrRoleList"
        >
          <div class="rr-role-empty">
            Loading Discord roles…
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
        REACTION ROLES READY
      </span>
      <div class="rr-actions">
        <button
          class="rr-save"
          id="rrSave"
        >
          SAVE SETTINGS
        </button>
        <button
          class="rr-publish"
          id="rrPublish"
        >
          PUBLISH PANEL
        </button>
      </div>
    </footer>
  `;
  const target =
    document.querySelector("main") ||
    document.getElementById("rolesApp") ||
    document.body;
  target.appendChild(section);
  /* =======================================================
     ELEMENTS
  ======================================================= */
  const enabled =
    document.getElementById("rrEnabled");
  const channel =
    document.getElementById("rrChannel");
  const title =
    document.getElementById("rrTitle");
  const message =
    document.getElementById("rrMessage");
  const roleList =
    document.getElementById("rrRoleList");
  const counter =
    document.getElementById("rrCounter");
  const status =
    document.getElementById("rrStatus");
  const panelState =
    document.getElementById("rrPanelState");
  const previewTitle =
    document.getElementById("rrPreviewTitle");
  const previewMessage =
    document.getElementById("rrPreviewMessage");
  const previewButtons =
    document.getElementById("rrPreviewButtons");
  const saveButton =
    document.getElementById("rrSave");
  const publishButton =
    document.getElementById("rrPublish");
  /* =======================================================
     REQUEST
  ======================================================= */
  async function fetchJSON(
    url,
    options = {},
  ) {
    const response =
      await fetch(
        url,
        {
          credentials:
            "same-origin",
          ...options,
        },
      );
    let data = {};
    try {
      data =
        await response.json();
    } catch {}
    if (!response.ok) {
      throw new Error(
        data.error ||
        "Request failed.",
      );
    }
    return data;
  }
  /* =======================================================
     SELECTED ROLES
  ======================================================= */
  function selectedRoleIDs() {
    return Array.from(
      roleList.querySelectorAll(
        'input[type="checkbox"]:checked',
      ),
    ).map(
      (checkbox) =>
        checkbox.value,
    );
  }
  /* =======================================================
     CHANNELS
  ======================================================= */
  function renderChannels() {
    channel.replaceChildren();
    const empty =
      document.createElement("option");
    empty.value = "";
    empty.textContent =
      "Select channel";
    channel.appendChild(
      empty,
    );
    channels.forEach(
      (item) => {
        const option =
          document.createElement(
            "option",
          );
        option.value =
          item.id;
        option.textContent =
          `# ${item.name}`;
        channel.appendChild(
          option,
        );
      },
    );
    channel.value =
      channels.some(
        (item) =>
          item.id ===
          settings.panelChannel,
      )
        ? settings.panelChannel
        : "";
  }
  /* =======================================================
     ROLES
  ======================================================= */
  function renderRoles() {
    roleList.replaceChildren();
    if (!roles.length) {
      const empty =
        document.createElement(
          "div",
        );
      empty.className =
        "rr-role-empty";
      empty.textContent =
        "No Discord roles found.";
      roleList.appendChild(
        empty,
      );
      return;
    }
    const selected =
      new Set(
        settings.roleIDs || [],
      );
    roles.forEach(
      (role) => {
        const row =
          document.createElement(
            "label",
          );
        row.className =
          "rr-role";
        if (
          role.assignable === false
        ) {
          row.classList.add(
            "disabled",
          );
        }
        const info =
          document.createElement(
            "span",
          );
        info.className =
          "rr-role-info";
        const dot =
          document.createElement(
            "span",
          );
        dot.className =
          "rr-role-dot";
        if (
          role.color &&
          role.color !==
            "#000000"
        ) {
          dot.style.background =
            role.color;
        }
        const name =
          document.createElement(
            "span",
          );
        name.className =
          "rr-role-name";
        name.textContent =
          role.name;
        info.appendChild(
          dot,
        );
        info.appendChild(
          name,
        );
        if (
          role.assignable === false
        ) {
          const locked =
            document.createElement(
              "small",
            );
          locked.textContent =
            "LOCKED";
          info.appendChild(
            locked,
          );
        }
        const checkbox =
          document.createElement(
            "input",
          );
        checkbox.type =
          "checkbox";
        checkbox.value =
          role.id;
        checkbox.checked =
          selected.has(
            role.id,
          );
        checkbox.disabled =
          role.assignable ===
          false;
        checkbox.addEventListener(
          "change",
          () => {
            const selectedNow =
              selectedRoleIDs();
            updatePreview();
          },
        );
        row.appendChild(
          info,
        );
        row.appendChild(
          checkbox,
        );
        roleList.appendChild(
          row,
        );
      },
    );
    updatePreview();
  }
  /* =======================================================
     PREVIEW
  ======================================================= */
  function updatePreview() {
    previewTitle.textContent =
      title.value.trim() ||
      "Choose Your Roles";
    previewMessage.textContent =
      message.value.trim() ||
      "Click the buttons below to add or remove roles.";
    previewButtons.replaceChildren();
    const selected =
      selectedRoleIDs();
    counter.textContent =
      `${selected.length} SELECTED`;
    const selectedRoles =
      roles.filter(
        (role) =>
          selected.includes(
            role.id,
          ),
      );
    if (
      !selectedRoles.length
    ) {
      const placeholder =
        document.createElement(
          "span",
        );
      placeholder.className =
        "rr-preview-button";
      placeholder.textContent =
        "Select a role";
      previewButtons.appendChild(
        placeholder,
      );
      return;
    }
    selectedRoles
      
      .forEach(
        (role) => {
          const button =
            document.createElement(
              "span",
            );
          button.className =
            "rr-preview-button";
          button.textContent =
            role.name;
          previewButtons.appendChild(
            button,
          );
        },
      );
  }
  /* =======================================================
     APPLY SETTINGS
  ======================================================= */
  function applySettings() {
    enabled.checked =
      settings.enabled ===
      true;
    title.value =
      settings.title ||
      "Choose Your Roles";
    message.value =
      settings.message ||
      "Click the buttons below to add or remove roles.";
    panelState.textContent =
      settings.panelMessageID
        ? "PUBLISHED"
        : "NOT PUBLISHED";
    renderChannels();
    renderRoles();
    updatePreview();
  }
  /* =======================================================
     LOAD GUILD
  ======================================================= */
  async function resolveGuild() {
    const me =
      await fetchJSON(
        "/api/me",
      );
    if (
      !me.loggedIn ||
      !Array.isArray(me.guilds) ||
      !me.guilds.length
    ) {
      throw new Error(
        "No manageable Discord server found.",
      );
    }
    const stored =
      localStorage.getItem(
        "arclume-selected-guild",
      );
    const guild =
      me.guilds.find(
        (item) =>
          item.id ===
          stored,
      ) ||
      me.guilds[0];
    currentGuildID =
      guild.id;
    localStorage.setItem(
      "arclume-selected-guild",
      currentGuildID,
    );
  }
  /* =======================================================
     LOAD
  ======================================================= */
  async function loadReactionRoles() {
    if (loading) {
      return;
    }
    loading = true;
    status.textContent =
      "LOADING REACTION ROLES…";
    try {
      await resolveGuild();
      const [
        settingsData,
        optionsData,
      ] =
        await Promise.all([
          fetchJSON(
            `/api/guild/${currentGuildID}/reaction-roles/settings`,
          ),
          fetchJSON(
            `/api/guild/${currentGuildID}/reaction-roles/options`,
          ),
        ]);
      settings = {
        enabled: false,
        panelChannel: "",
        panelMessageID: "",
        title:
          "Choose Your Roles",
        message:
          "Click the buttons below to add or remove roles.",
        roleIDs: [],
        ...(settingsData.settings || {}),
      };
      channels =
        Array.isArray(
          optionsData.channels,
        )
          ? optionsData.channels
          : [];
      roles =
        Array.isArray(
          optionsData.roles,
        )
          ? optionsData.roles
          : [];
      applySettings();
      status.textContent =
        "REACTION ROLES LOADED";
    } catch (error) {
      console.error(
        "Reaction Roles load error:",
        error,
      );
      status.textContent =
        error.message ||
        "REACTION ROLES FAILED";
    }
    loading = false;
  }
  /* =======================================================
     PAYLOAD
  ======================================================= */
  function payload() {
    return {
      enabled:
        enabled.checked,
      panelChannel:
        channel.value,
      title:
        title.value.trim() ||
        "Choose Your Roles",
      message:
        message.value.trim() ||
        "Click the buttons below to add or remove roles.",
      roleIDs:
        selectedRoleIDs(),
    };
  }
  /* =======================================================
     SAVE
  ======================================================= */
  async function saveSettings(
    showDone = true,
  ) {
    if (!currentGuildID) {
      return false;
    }
    saveButton.disabled =
      true;
    status.textContent =
      "SAVING…";
    try {
      const data =
        await fetchJSON(
          `/api/guild/${currentGuildID}/reaction-roles/settings`,
          {
            method:
              "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                payload(),
              ),
          },
        );
      settings = {
        ...settings,
        ...(data.settings || {}),
      };
      panelState.textContent =
        settings.panelMessageID
          ? "PUBLISHED"
          : "NOT PUBLISHED";
      status.textContent =
        showDone
          ? "REACTION ROLES SAVED"
          : "SETTINGS READY";
      return true;
    } catch (error) {
      console.error(
        "Reaction Roles save error:",
        error,
      );
      status.textContent =
        error.message ||
        "SAVE FAILED";
      return false;
    } finally {
      saveButton.disabled =
        false;
    }
  }
  /* =======================================================
     PUBLISH
  ======================================================= */
  async function publishPanel() {
    if (
      !enabled.checked
    ) {
      status.textContent =
        "ENABLE REACTION ROLES FIRST";
      return;
    }
    if (
      !channel.value
    ) {
      status.textContent =
        "SELECT A PANEL CHANNEL";
      return;
    }
    if (
      !selectedRoleIDs().length
    ) {
      status.textContent =
        "SELECT AT LEAST ONE ROLE";
      return;
    }
    publishButton.disabled =
      true;
    publishButton.textContent =
      "PUBLISHING…";
    try {
      const saved =
        await saveSettings(
          false,
        );
      if (!saved) {
        return;
      }
      status.textContent =
        "PUBLISHING PANEL…";
      const data =
        await fetchJSON(
          `/api/guild/${currentGuildID}/reaction-roles/publish`,
          {
            method:
              "POST",
          },
        );
      settings = {
        ...settings,
        ...(data.settings || {}),
      };
      panelState.textContent =
        "PUBLISHED";
      status.textContent =
        "REACTION ROLE PANEL PUBLISHED";
    } catch (error) {
      console.error(
        "Reaction Roles publish error:",
        error,
      );
      status.textContent =
        error.message ||
        "PUBLISH FAILED";
    } finally {
      publishButton.disabled =
        false;
      publishButton.textContent =
        "PUBLISH PANEL";
    }
  }
  /* =======================================================
     EVENTS
  ======================================================= */
  title.addEventListener(
    "input",
    updatePreview,
  );
  message.addEventListener(
    "input",
    updatePreview,
  );
  saveButton.addEventListener(
    "click",
    () => {
      saveSettings();
    },
  );
  publishButton.addEventListener(
    "click",
    publishPanel,
  );
  /*
    If the main Roles page switches server,
    reload Reaction Roles automatically.
  */
  let knownGuild =
    localStorage.getItem(
      "arclume-selected-guild",
    ) || "";
  setInterval(
    () => {
      const latest =
        localStorage.getItem(
          "arclume-selected-guild",
        ) || "";
      if (
        latest &&
        latest !==
          knownGuild
      ) {
        knownGuild =
          latest;
        currentGuildID =
          latest;
        loadReactionRoles();
      }
    },
    1200,
  );
  /* =======================================================
     START
  ======================================================= */
  loadReactionRoles();
})();

