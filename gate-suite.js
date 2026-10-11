(() => {
  let guildID = "";
  let accessSettings = {};
  let rulesSettings = {};
  let roles = [];
  let channels = [];
  /* =====================================================
     STYLE
  ===================================================== */
  const style =
    document.createElement("style");
  style.textContent = `
    .gate-suite {
      width: min(1400px, calc(100% - 40px));
      margin: 28px auto 80px;
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 18px;
      overflow: hidden;
      background: rgba(15,15,13,.88);
      color: #f0ede5;
      font-family: Inter, sans-serif;
    }
    .gate-suite-header {
      padding: 26px 28px;
      border-bottom: 1px solid rgba(255,255,255,.08);
    }
    .gate-suite-header small {
      color: #91d6a8;
      font-family: "DM Mono", monospace;
      font-size: 9px;
      letter-spacing: .13em;
    }
    .gate-suite-header h2 {
      margin: 8px 0 6px;
      font-size: 27px;
    }
    .gate-suite-header p {
      margin: 0;
      color: #8d8a81;
      font-size: 11px;
      line-height: 1.7;
    }
    .gate-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
    .gate-card {
      padding: 28px;
    }
    .gate-card + .gate-card {
      border-left: 1px solid rgba(255,255,255,.08);
    }
    .gate-label {
      color: #bc9670;
      font-family: "DM Mono", monospace;
      font-size: 9px;
      letter-spacing: .12em;
    }
    .gate-card h3 {
      margin: 8px 0 7px;
      font-size: 20px;
    }
    .gate-card > p {
      color: #8d8a81;
      font-size: 11px;
      line-height: 1.6;
      margin: 0 0 20px;
    }
    .gate-toggle {
      padding: 14px;
      margin-bottom: 18px;
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 11px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .gate-toggle strong {
      font-size: 11px;
    }
    .gate-toggle span {
      display: block;
      margin-top: 4px;
      color: #625f58;
      font-size: 9px;
    }
    .gate-toggle input {
      width: 18px;
      height: 18px;
      accent-color: #91d6a8;
    }
    .gate-field {
      margin-bottom: 16px;
    }
    .gate-field label {
      display: block;
      margin-bottom: 7px;
      color: #8d8a81;
      font-family: "DM Mono", monospace;
      font-size: 9px;
    }
    .gate-field select,
    .gate-field input,
    .gate-field textarea {
      width: 100%;
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 10px;
      outline: none;
      background: #0b0b09;
      color: #f0ede5;
      font: inherit;
      box-sizing: border-box;
    }
    .gate-field select,
    .gate-field input {
      height: 44px;
      padding: 0 12px;
    }
    .gate-field textarea {
      min-height: 100px;
      padding: 12px;
      resize: vertical;
    }
    .gate-flow {
      display: grid;
      gap: 8px;
      margin-top: 20px;
    }
    .gate-step {
      padding: 12px;
      border: 1px solid rgba(255,255,255,.07);
      border-radius: 9px;
      background: #0c0c0a;
      font-size: 10px;
    }
    .gate-step b {
      color: #91d6a8;
      margin-right: 8px;
    }
    .gate-warning {
      margin-top: 18px;
      padding: 13px;
      border: 1px solid rgba(230,185,96,.2);
      border-radius: 10px;
      background: rgba(230,185,96,.05);
      color: #c8b487;
      font-size: 9px;
      line-height: 1.6;
    }
    .gate-footer {
      padding: 20px 28px;
      border-top: 1px solid rgba(255,255,255,.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 15px;
    }
    #gateStatus {
      color: #8d8a81;
      font-family: "DM Mono", monospace;
      font-size: 9px;
    }
    .gate-actions {
      display: flex;
      gap: 9px;
      flex-wrap: wrap;
    }
    .gate-actions button {
      min-height: 42px;
      padding: 0 15px;
      border-radius: 10px;
      font-family: inherit;
      font-size: 9px;
      font-weight: 800;
      cursor: pointer;
    }
    .gate-secondary {
      background: transparent;
      border: 1px solid rgba(255,255,255,.1);
      color: #eee;
    }
    .gate-primary {
      background: #e8dfc8;
      border: 0;
      color: #111;
    }
    .gate-actions button:disabled {
      opacity: .5;
      cursor: not-allowed;
    }
    @media (max-width: 850px) {
      .gate-grid {
        grid-template-columns: 1fr;
      }
      .gate-card + .gate-card {
        border-left: 0;
        border-top: 1px solid rgba(255,255,255,.08);
      }
    }
  `;
  document.head.appendChild(
    style
  );
  /* =====================================================
     UI
  ===================================================== */
  const section =
    document.createElement("section");
  section.className =
    "gate-suite";
  section.innerHTML = `
    <header class="gate-suite-header">
      <small>MEMBER ENTRY / ACCESS CONTROL</small>
      <h2>Server Access Gate</h2>
      <p>
        Members must verify, read and accept the rules,
        then select at least one normal Reaction Role.
        Only then does Arclume give the Member access role.
      </p>
    </header>
    <div class="gate-grid">
      <article class="gate-card">
        <span class="gate-label">
          01 / RULES GATE
        </span>
        <h3>Rules Agreement</h3>
        <p>
          Members see this after verification.
          They must accept before continuing.
        </p>
        <div class="gate-toggle">
          <div>
            <strong>Enable Rules Gate</strong>
            <span>
              Require members to accept the rules.
            </span>
          </div>
          <input
            id="rulesGateEnabled"
            type="checkbox"
          />
        </div>
        <div class="gate-field">
          <label>
            RULES CHANNEL
          </label>
          <select id="rulesGateChannel">
            <option value="">
              Select Rules Channel
            </option>
          </select>
        </div>
        <div class="gate-field">
          <label>
            RULES ACCEPTED ROLE
          </label>
          <select id="rulesAcceptedRole">
            <option value="">
              Select Rules Accepted Role
            </option>
          </select>
        </div>
        <div class="gate-field">
          <label>
            RULES PANEL TITLE
          </label>
          <input
            id="rulesGateTitle"
            value="Server Rules"
          />
        </div>
        <div class="gate-field">
          <label>
            RULES MESSAGE
          </label>
          <textarea
            id="rulesGateMessage"
          >Please read all server rules carefully. When you are finished, click the button below to confirm that you have read and agree to them.</textarea>
        </div>
        <div class="gate-field">
          <label>
            BUTTON TEXT
          </label>
          <input
            id="rulesGateButton"
            value="I Have Read & Agree"
          />
        </div>
      </article>
      <article class="gate-card">
        <span class="gate-label">
          02 / ACCESS GATE
        </span>
        <h3>Full Server Unlock</h3>
        <p>
          Select the role Arclume gives only after
          every entry requirement is completed.
        </p>
        <div class="gate-toggle">
          <div>
            <strong>Enable Access Gate</strong>
            <span>
              Hide normal server channels before completion.
            </span>
          </div>
          <input
            id="accessGateEnabled"
            type="checkbox"
          />
        </div>
        <div class="gate-field">
          <label>
            ACCESS ROLE
          </label>
          <select id="accessGateRole">
            <option value="">
              Select Member Role
            </option>
          </select>
        </div>
        <div class="gate-field">
          <label>
            REACTION ROLES CHANNEL
          </label>
          <select id="accessRoleChannel">
            <option value="">
              Select Reaction Roles Channel
            </option>
          </select>
        </div>
        <div class="gate-flow">
          <div class="gate-step">
            <b>01</b>
            Join → Unverified
          </div>
          <div class="gate-step">
            <b>02</b>
            Verify → Verified
          </div>
          <div class="gate-step">
            <b>03</b>
            Read Rules → Rules Accepted
          </div>
          <div class="gate-step">
            <b>04</b>
            Select Reaction Role
          </div>
          <div class="gate-step">
            <b>05</b>
            Member role granted
          </div>
          <div class="gate-step">
            <b>06</b>
            Full server unlocked
          </div>
        </div>
        <div class="gate-warning">
          Use your existing 『✦』 Member role as the Access Role.
          Do not include that Member role in the Reaction Roles panel.
          Also remove it from Welcome Auto Role.
        </div>
      </article>
    </div>
    <footer class="gate-footer">
      <span id="gateStatus">
        GATE SETTINGS READY
      </span>
      <div class="gate-actions">
        <button
          class="gate-secondary"
          id="saveRulesGate"
        >
          SAVE RULES
        </button>
        <button
          class="gate-secondary"
          id="publishRulesGate"
        >
          PUBLISH RULES
        </button>
        <button
          class="gate-secondary"
          id="saveAccessGate"
        >
          SAVE ACCESS
        </button>
        <button
          class="gate-primary"
          id="applyAccessGate"
        >
          APPLY GATE
        </button>
      </div>
    </footer>
  `;
  const target =
    document.querySelector("main") ||
    document.getElementById("rolesApp") ||
    document.body;
  target.appendChild(
    section
  );
  /* =====================================================
     ELEMENTS
  ===================================================== */
  const rulesEnabled =
    document.getElementById(
      "rulesGateEnabled"
    );
  const rulesChannel =
    document.getElementById(
      "rulesGateChannel"
    );
  const rulesRole =
    document.getElementById(
      "rulesAcceptedRole"
    );
  const rulesTitle =
    document.getElementById(
      "rulesGateTitle"
    );
  const rulesMessage =
    document.getElementById(
      "rulesGateMessage"
    );
  const rulesButton =
    document.getElementById(
      "rulesGateButton"
    );
  const accessEnabled =
    document.getElementById(
      "accessGateEnabled"
    );
  const accessRole =
    document.getElementById(
      "accessGateRole"
    );
  const accessChannel =
    document.getElementById(
      "accessRoleChannel"
    );
  const status =
    document.getElementById(
      "gateStatus"
    );
  /* =====================================================
     REQUEST
  ===================================================== */
  async function request(
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
        "Request failed."
      );
    }
    return data;
  }
  /* =====================================================
     ACCOUNT
  ===================================================== */
  async function resolveGuild() {
    const data =
      await request(
        "/api/me"
      );
    if (
      !data.loggedIn ||
      !Array.isArray(
        data.guilds
      ) ||
      !data.guilds.length
    ) {
      throw new Error(
        "No manageable server found."
      );
    }
    const stored =
      localStorage.getItem(
        "arclume-selected-guild"
      );
    const guild =
      data.guilds.find(
        (item) =>
          item.id === stored
      ) ||
      data.guilds[0];
    guildID =
      guild.id;
    localStorage.setItem(
      "arclume-selected-guild",
      guildID
    );
  }
  /* =====================================================
     OPTIONS
  ===================================================== */
  function fillRoleSelect(
    select,
    selected,
  ) {
    const first =
      select.options[0]
        ?.textContent ||
      "Select Role";
    select.innerHTML =
      `<option value="">${first}</option>`;
    roles.forEach(
      (role) => {
        if (
          role.assignable === false
        ) {
          return;
        }
        const option =
          document.createElement(
            "option"
          );
        option.value =
          role.id;
        option.textContent =
          `@${role.name}`;
        select.appendChild(
          option
        );
      },
    );
    select.value =
      selected || "";
  }
  function fillChannelSelect(
    select,
    selected,
  ) {
    const first =
      select.options[0]
        ?.textContent ||
      "Select Channel";
    select.innerHTML =
      `<option value="">${first}</option>`;
    channels.forEach(
      (channel) => {
        const option =
          document.createElement(
            "option"
          );
        option.value =
          channel.id;
        option.textContent =
          `# ${channel.name}`;
        select.appendChild(
          option
        );
      },
    );
    select.value =
      selected || "";
  }
  /* =====================================================
     LOAD
  ===================================================== */
  async function load() {
    status.textContent =
      "LOADING GATE SETTINGS…";
    try {
      await resolveGuild();
      const [
        rulesData,
        rulesOptions,
        accessData,
        accessOptions,
      ] =
        await Promise.all([
          request(
            `/api/guild/${guildID}/rules-gate/settings`
          ),
          request(
            `/api/guild/${guildID}/rules-gate/options`
          ),
          request(
            `/api/guild/${guildID}/access-gate/settings`
          ),
          request(
            `/api/guild/${guildID}/access-gate/options`
          ),
        ]);
      rulesSettings =
        rulesData.settings || {};
      accessSettings =
        accessData.settings || {};
      roles =
        Array.isArray(
          rulesOptions.roles
        )
          ? rulesOptions.roles
          : (
              Array.isArray(
                accessOptions.roles
              )
                ? accessOptions.roles
                : []
            );
      channels =
        Array.isArray(
          rulesOptions.channels
        )
          ? rulesOptions.channels
          : (
              Array.isArray(
                accessOptions.channels
              )
                ? accessOptions.channels
                : []
            );
      rulesEnabled.checked =
        rulesSettings.enabled === true;
      rulesTitle.value =
        rulesSettings.title ||
        "Server Rules";
      rulesMessage.value =
        rulesSettings.message ||
        "";
      rulesButton.value =
        rulesSettings.buttonText ||
        "I Have Read & Agree";
      accessEnabled.checked =
        accessSettings.enabled === true;
      fillChannelSelect(
        rulesChannel,
        rulesSettings.rulesChannel
      );
      fillRoleSelect(
        rulesRole,
        rulesSettings.acceptedRole
      );
      fillRoleSelect(
        accessRole,
        accessSettings.accessRole
      );
      fillChannelSelect(
        accessChannel,
        accessSettings.roleChannel
      );
      status.textContent =
        "GATE SETTINGS LOADED";
    } catch (error) {
      console.error(
        error
      );
      status.textContent =
        error.message ||
        "LOAD FAILED";
    }
  }
  /* =====================================================
     SAVE RULES
  ===================================================== */
  async function saveRules() {
    status.textContent =
      "SAVING RULES GATE…";
    const data =
      await request(
        `/api/guild/${guildID}/rules-gate/settings`,
        {
          method:
            "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify({
              enabled:
                rulesEnabled.checked,
              rulesChannel:
                rulesChannel.value,
              acceptedRole:
                rulesRole.value,
              title:
                rulesTitle.value,
              message:
                rulesMessage.value,
              buttonText:
                rulesButton.value,
            }),
        },
      );
    rulesSettings =
      data.settings || {};
    status.textContent =
      "RULES GATE SAVED";
    return true;
  }
  /* =====================================================
     PUBLISH RULES
  ===================================================== */
  async function publishRules() {
    if (
      !rulesEnabled.checked
    ) {
      status.textContent =
        "ENABLE RULES GATE FIRST";
      return;
    }
    if (
      !rulesChannel.value ||
      !rulesRole.value
    ) {
      status.textContent =
        "SELECT RULES CHANNEL + ROLE";
      return;
    }
    try {
      await saveRules();
      status.textContent =
        "PUBLISHING RULES…";
      await request(
        `/api/guild/${guildID}/rules-gate/publish`,
        {
          method:
            "POST",
        },
      );
      status.textContent =
        "✓ RULES PANEL PUBLISHED";
    } catch (error) {
      status.textContent =
        error.message ||
        "RULES PUBLISH FAILED";
    }
  }
  /* =====================================================
     SAVE ACCESS
  ===================================================== */
  async function saveAccess() {
    status.textContent =
      "SAVING ACCESS GATE…";
    const data =
      await request(
        `/api/guild/${guildID}/access-gate/settings`,
        {
          method:
            "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify({
              enabled:
                accessEnabled.checked,
              accessRole:
                accessRole.value,
              roleChannel:
                accessChannel.value,
            }),
        },
      );
    accessSettings =
      data.settings || {};
    status.textContent =
      "ACCESS GATE SAVED";
    return true;
  }
  /* =====================================================
     APPLY
  ===================================================== */
  async function applyGate() {
    if (
      !rulesEnabled.checked ||
      !accessEnabled.checked
    ) {
      status.textContent =
        "ENABLE BOTH GATES FIRST";
      return;
    }
    if (
      !rulesChannel.value ||
      !rulesRole.value ||
      !accessRole.value ||
      !accessChannel.value
    ) {
      status.textContent =
        "SELECT ALL REQUIRED CHANNELS + ROLES";
      return;
    }
    if (
      rulesRole.value ===
      accessRole.value
    ) {
      status.textContent =
        "RULES ROLE AND MEMBER ROLE MUST BE DIFFERENT";
      return;
    }
    try {
      await saveRules();
      await saveAccess();
      status.textContent =
        "APPLYING SERVER PERMISSIONS…";
      await request(
        `/api/guild/${guildID}/access-gate/apply`,
        {
          method:
            "POST",
        },
      );
      status.textContent =
        "✓ SERVER ACCESS GATE ACTIVE";
    } catch (error) {
      console.error(
        error
      );
      status.textContent =
        error.message ||
        "APPLY FAILED";
    }
  }
  /* =====================================================
     EVENTS
  ===================================================== */
  document
    .getElementById(
      "saveRulesGate"
    )
    .addEventListener(
      "click",
      () => {
        saveRules()
          .catch(
            (error) => {
              status.textContent =
                error.message;
            },
          );
      },
    );
  document
    .getElementById(
      "publishRulesGate"
    )
    .addEventListener(
      "click",
      publishRules
    );
  document
    .getElementById(
      "saveAccessGate"
    )
    .addEventListener(
      "click",
      () => {
        saveAccess()
          .catch(
            (error) => {
              status.textContent =
                error.message;
            },
          );
      },
    );
  document
    .getElementById(
      "applyAccessGate"
    )
    .addEventListener(
      "click",
      applyGate
    );
  load();
})();
