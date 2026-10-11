"use strict";

const {
  Events,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");

const { pool } = require("./database");

let isBotOwner = () => false;

try {
  ({ isBotOwner } = require("./owner-access"));
} catch {}

const CATEGORY_NAME = "🔒 ACCESS LOCK";
const EXPIRY_CHECK_MS = 30 * 1000;
const MAX_LOCK_MS = 28 * 24 * 60 * 60 * 1000;
const MAX_REASON_LENGTH = 300;

let registered = false;
let expiryTimer = null;

const processingUnlocks = new Set();

const COMMANDS = {
  lock: new Set(["!accesslock", "!alock", "!lockmember"]),
  unlock: new Set(["!accessunlock", "!aunlock", "!unlockmember"]),
  status: new Set(["!lockstatus", "!accessstatus"]),
  list: new Set(["!locklist", "!accesslocklist"]),
};

/* =========================================================
   HELPERS
========================================================= */

function cleanReason(value, fallback = "No reason provided.") {
  const text = String(value || "")
    .trim()
    .replace(/\s+/g, " ");

  return (text || fallback).slice(0, MAX_REASON_LENGTH);
}

function canManageAccessLock(message) {
  if (!message?.guild || !message?.member || !message?.author) {
    return false;
  }

  if (message.author.id === message.guild.ownerId) {
    return true;
  }

  if (isBotOwner(message.author)) {
    return true;
  }

  const permissions = message.member.permissions;

  return (
    permissions.has(PermissionFlagsBits.Administrator) ||
    permissions.has(PermissionFlagsBits.ManageGuild) ||
    permissions.has(PermissionFlagsBits.ModerateMembers)
  );
}

function parseDurationToken(token) {
  const text = String(token || "")
    .trim()
    .toLowerCase();

  if (!text || text === "permanent" || text === "manual") {
    return null;
  }

  const match = text.match(/^(\d{1,4})(m|h|d|w)$/);

  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2];

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const unitMs = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  }[unit];

  const ms = amount * unitMs;

  if (ms > MAX_LOCK_MS) {
    return {
      tooLong: true,
      ms,
      label: `${amount}${unit}`,
    };
  }

  return {
    ms,
    label: `${amount}${unit}`,
  };
}

function formatDiscordTime(date) {
  if (!date) {
    return "Permanent";
  }

  const unix = Math.floor(new Date(date).getTime() / 1000);

  if (!Number.isFinite(unix)) {
    return "Permanent";
  }

  return `<t:${unix}:F> (<t:${unix}:R>)`;
}

async function getTargetMember(message, token) {
  const mentioned = message.mentions?.members?.first?.();

  if (mentioned) {
    return mentioned;
  }

  const id = String(token || "").replace(/[^0-9]/g, "");

  if (!id) {
    return null;
  }

  return message.guild.members.fetch(id).catch(() => null);
}

/* =========================================================
   DATABASE
========================================================= */

async function ensureDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS access_lock_settings (
      guild_id TEXT PRIMARY KEY,
      category_id TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS access_locks (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      room_channel_id TEXT,
      previous_overwrites JSONB NOT NULL DEFAULT '{}'::jsonb,
      PRIMARY KEY (guild_id, user_id)
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS access_locks_expiry_idx
    ON access_locks (expires_at)
    WHERE expires_at IS NOT NULL
  `);

  console.log("🔒 Access Lock database ready");
}

async function getLockRecord(guildID, userID) {
  const result = await pool.query(
    `
      SELECT *
      FROM access_locks
      WHERE guild_id = $1
        AND user_id = $2
      LIMIT 1
    `,
    [guildID, userID],
  );

  return result.rows[0] || null;
}

async function getGuildLocks(guildID) {
  const result = await pool.query(
    `
      SELECT *
      FROM access_locks
      WHERE guild_id = $1
      ORDER BY locked_at ASC
    `,
    [guildID],
  );

  return result.rows;
}

async function saveLockRecord({
  guildID,
  userID,
  moderatorID,
  reason,
  expiresAt,
  roomChannelID,
  previousOverwrites,
}) {
  await pool.query(
    `
      INSERT INTO access_locks (
        guild_id,
        user_id,
        moderator_id,
        reason,
        expires_at,
        room_channel_id,
        previous_overwrites
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7::jsonb
      )
      ON CONFLICT (guild_id, user_id)
      DO UPDATE SET
        moderator_id = EXCLUDED.moderator_id,
        reason = EXCLUDED.reason,
        expires_at = EXCLUDED.expires_at,
        room_channel_id = EXCLUDED.room_channel_id,
        previous_overwrites = EXCLUDED.previous_overwrites,
        locked_at = NOW()
    `,
    [
      guildID,
      userID,
      moderatorID,
      reason,
      expiresAt,
      roomChannelID,
      JSON.stringify(previousOverwrites || {}),
    ],
  );
}

async function deleteLockRecord(guildID, userID) {
  await pool.query(
    `
      DELETE FROM access_locks
      WHERE guild_id = $1
        AND user_id = $2
    `,
    [guildID, userID],
  );
}

async function getSavedCategoryID(guildID) {
  const result = await pool.query(
    `
      SELECT category_id
      FROM access_lock_settings
      WHERE guild_id = $1
      LIMIT 1
    `,
    [guildID],
  );

  return result.rows[0]?.category_id || null;
}

async function saveCategoryID(guildID, categoryID) {
  await pool.query(
    `
      INSERT INTO access_lock_settings (
        guild_id,
        category_id,
        updated_at
      )
      VALUES ($1, $2, NOW())
      ON CONFLICT (guild_id)
      DO UPDATE SET
        category_id = EXCLUDED.category_id,
        updated_at = NOW()
    `,
    [guildID, categoryID],
  );
}

/* =========================================================
   ACCESS LOCK CATEGORY / PERMISSIONS
========================================================= */

function botMissingPermissions(guild) {
  const me = guild.members.me;

  if (!me) {
    return ["Bot member unavailable"];
  }

  if (me.permissions.has(PermissionFlagsBits.Administrator)) {
    return [];
  }

  const required = [
    [PermissionFlagsBits.ManageChannels, "Manage Channels"],
    [PermissionFlagsBits.ManageRoles, "Manage Roles"],
    [PermissionFlagsBits.MoveMembers, "Move Members"],
  ];

  return required
    .filter(([permission]) => !me.permissions.has(permission))
    .map(([, name]) => name);
}

function isStaffRole(role) {
  if (!role || role.managed || role.id === role.guild.id) {
    return false;
  }

  return (
    role.permissions.has(PermissionFlagsBits.Administrator) ||
    role.permissions.has(PermissionFlagsBits.ManageGuild) ||
    role.permissions.has(PermissionFlagsBits.ModerateMembers) ||
    role.permissions.has(PermissionFlagsBits.KickMembers) ||
    role.permissions.has(PermissionFlagsBits.BanMembers)
  );
}

async function syncCategoryStaffAccess(category, guild, invokerID = null) {
  await category.permissionOverwrites.edit(guild.roles.everyone, {
    ViewChannel: false,
  });

  if (guild.members.me) {
    await category.permissionOverwrites
      .edit(guild.members.me.id, {
        ViewChannel: true,
        ReadMessageHistory: true,
        SendMessages: true,
        ManageMessages: true,
        ManageChannels: true,
      })
      .catch(() => {});
  }

  for (const role of guild.roles.cache.values()) {
    if (!isStaffRole(role)) {
      continue;
    }

    await category.permissionOverwrites
      .edit(role.id, {
        ViewChannel: true,
        ReadMessageHistory: true,
        SendMessages: true,
        ManageMessages: true,
      })
      .catch(() => {});
  }

  if (invokerID) {
    await category.permissionOverwrites
      .edit(invokerID, {
        ViewChannel: true,
        ReadMessageHistory: true,
        SendMessages: true,
      })
      .catch(() => {});
  }

  const ownerID = String(process.env.BOT_OWNER_ID || "").trim();

  if (ownerID) {
    await category.permissionOverwrites
      .edit(ownerID, {
        ViewChannel: true,
        ReadMessageHistory: true,
        SendMessages: true,
      })
      .catch(() => {});
  }
}

async function ensureLockCategory(guild, invokerID = null) {
  await guild.channels.fetch().catch(() => {});

  const savedID = await getSavedCategoryID(guild.id);

  let category = savedID ? guild.channels.cache.get(savedID) : null;

  if (!category || category.type !== ChannelType.GuildCategory) {
    category = guild.channels.cache.find(
      (channel) =>
        channel.type === ChannelType.GuildCategory &&
        channel.name === CATEGORY_NAME,
    );
  }

  if (!category) {
    category = await guild.channels.create({
      name: CATEGORY_NAME,
      type: ChannelType.GuildCategory,
      reason: "Arclume Access Lock system",
    });
  }

  await syncCategoryStaffAccess(category, guild, invokerID);
  await saveCategoryID(guild.id, category.id);

  return category;
}

function safeChannelName(username, userID) {
  const base =
    String(username || "member")
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 55) || "member";

  return `locked-${base}-${String(userID).slice(-4)}`.slice(0, 90);
}

async function createPrivateLockRoom({
  guild,
  category,
  member,
  moderator,
  reason,
}) {
  const room = await guild.channels.create({
    name: safeChannelName(member.user.username, member.id),
    type: ChannelType.GuildText,
    parent: category.id,
    topic:
      `Access Lock room for ${member.user.tag} (${member.id}) • ${reason}`.slice(
        0,
        1024,
      ),
    reason: `Access Lock for ${member.user.tag}`,
  });

  await room.permissionOverwrites.edit(member.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AddReactions: true,
    AttachFiles: true,
    EmbedLinks: true,
  });

  if (moderator?.id) {
    await room.permissionOverwrites
      .edit(moderator.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        ManageMessages: true,
      })
      .catch(() => {});
  }

  return room;
}

/* =========================================================
   PERMISSION SNAPSHOTS
========================================================= */

function permissionSnapshot(channel, userID) {
  const overwrite = channel.permissionOverwrites?.cache?.get(userID);

  if (!overwrite) {
    return null;
  }

  return {
    allow: overwrite.allow.bitfield.toString(),
    deny: overwrite.deny.bitfield.toString(),
  };
}

function overwriteOptionsFromSnapshot(snapshot) {
  const options = {};

  const allow = BigInt(snapshot?.allow || "0");
  const deny = BigInt(snapshot?.deny || "0");

  for (const [name, permission] of Object.entries(PermissionFlagsBits)) {
    if ((allow & permission) === permission) {
      options[name] = true;
    } else if ((deny & permission) === permission) {
      options[name] = false;
    }
  }

  return options;
}

function canEditOverwrites(channel) {
  return Boolean(channel?.permissionOverwrites?.edit);
}

async function hideMemberFromServer(guild, member, roomChannelID) {
  await guild.channels.fetch().catch(() => {});

  const snapshot = {};

  for (const channel of guild.channels.cache.values()) {
    if (!canEditOverwrites(channel)) {
      continue;
    }

    if (channel.id === roomChannelID) {
      continue;
    }

    snapshot[channel.id] = permissionSnapshot(channel, member.id);

    await channel.permissionOverwrites
      .edit(
        member.id,
        {
          ViewChannel: false,
          SendMessages: false,
          SendMessagesInThreads: false,
          CreatePublicThreads: false,
          CreatePrivateThreads: false,
          AddReactions: false,
          Connect: false,
          Speak: false,
          Stream: false,
        },
        {
          reason: "Arclume Access Lock",
        },
      )
      .catch((error) => {
        console.error(
          `⚠️ Access Lock could not update ${channel.name || channel.id}:`,
          error.message,
        );
      });
  }

  return snapshot;
}

async function restoreMemberOverwrites(guild, userID, record) {
  await guild.channels.fetch().catch(() => {});

  const snapshot =
    record?.previous_overwrites &&
    typeof record.previous_overwrites === "object"
      ? record.previous_overwrites
      : {};

  const roomID = record?.room_channel_id || null;

  for (const channel of guild.channels.cache.values()) {
    if (!canEditOverwrites(channel)) {
      continue;
    }

    if (channel.id === roomID) {
      continue;
    }

    const existsInSnapshot = Object.prototype.hasOwnProperty.call(
      snapshot,
      channel.id,
    );

    const previous = existsInSnapshot ? snapshot[channel.id] : undefined;

    try {
      if (previous === null || previous === undefined) {
        const current = channel.permissionOverwrites.cache.get(userID);

        if (current) {
          await channel.permissionOverwrites.delete(
            userID,
            "Arclume Access Lock restored",
          );
        }

        continue;
      }

      await channel.permissionOverwrites
        .delete(userID, "Restore previous permissions")
        .catch(() => {});

      await channel.permissionOverwrites.edit(
        userID,
        overwriteOptionsFromSnapshot(previous),
        {
          reason: "Restore permissions from before Access Lock",
        },
      );
    } catch (error) {
      console.error(
        `⚠️ Access Lock restore failed for ${channel.id}:`,
        error.message,
      );
    }
  }
}

/* =========================================================
   LOCK / UNLOCK
========================================================= */

async function announceLockRoom({
  room,
  member,
  moderator,
  reason,
  expiresAt,
}) {
  const embed = new EmbedBuilder()
    .setTitle("🔒 ACCESS RESTRICTED")
    .setDescription(
      [
        `<@${member.id}>, your server access has been restricted.`,
        "",
        "**This is now the only server channel you can access.**",
        "You can speak with staff here while the restriction is active.",
      ].join("\n"),
    )
    .addFields(
      {
        name: "📝 Reason",
        value: cleanReason(reason),
      },
      {
        name: "🛡️ Locked By",
        value: moderator?.id ? `<@${moderator.id}>` : "Staff",
        inline: true,
      },
      {
        name: "⏱️ Duration",
        value: expiresAt
          ? formatDiscordTime(expiresAt)
          : "Until staff unlocks you",
        inline: true,
      },
    )
    .setFooter({
      text: "Arclume Access Lock",
    })
    .setTimestamp();

  await room.send({
    content: `<@${member.id}>`,
    embeds: [embed],
    allowedMentions: {
      users: [member.id],
      roles: [],
    },
  });
}

async function lockMember({
  message,
  guild: suppliedGuild,
  member,
  moderator: suppliedModerator,
  duration,
  reason,
}) {
  const guild = suppliedGuild || message?.guild;
  const moderator = suppliedModerator || message?.author;

  if (!guild) {
    throw new Error("Access Lock requires a guild.");
  }

  if (!member) {
    throw new Error("Access Lock requires a member.");
  }

  if (!moderator?.id) {
    throw new Error("Access Lock requires a moderator.");
  }

  if (member.id === moderator.id) {
    throw new Error("You cannot Access Lock yourself.");
  }

  if (member.id === guild.ownerId) {
    throw new Error("The server owner cannot be Access Locked.");
  }

  if (member.user?.bot) {
    throw new Error("Access Lock cannot be used on bots.");
  }

  if (member.permissions.has(PermissionFlagsBits.Administrator)) {
    throw new Error(
      "This member has Administrator. Remove Administrator before using Access Lock.",
    );
  }

  const missing = botMissingPermissions(guild);

  if (missing.length) {
    throw new Error(`Arclume needs: ${missing.join(", ")}.`);
  }

  const existing = await getLockRecord(guild.id, member.id);

  if (existing) {
    throw new Error("That member is already Access Locked.");
  }

  let parsedDuration = duration;

  if (typeof duration === "string") {
    parsedDuration = parseDurationToken(duration);

    if (parsedDuration?.tooLong) {
      throw new Error("Temporary Access Locks can be at most 28 days.");
    }
  }

  const category = await ensureLockCategory(guild, moderator.id);

  let room = null;
  let snapshot = {};

  const expiresAt = parsedDuration?.ms
    ? new Date(Date.now() + parsedDuration.ms)
    : null;

  const safeReason = cleanReason(reason);

  try {
    room = await createPrivateLockRoom({
      guild,
      category,
      member,
      moderator,
      reason: safeReason,
    });

    snapshot = await hideMemberFromServer(guild, member, room.id);

    await saveLockRecord({
      guildID: guild.id,
      userID: member.id,
      moderatorID: moderator.id,
      reason: safeReason,
      expiresAt,
      roomChannelID: room.id,
      previousOverwrites: snapshot,
    });

    if (member.voice?.channelId) {
      await member.voice.disconnect("Arclume Access Lock").catch(() => {});
    }

    await announceLockRoom({
      room,
      member,
      moderator,
      reason: safeReason,
      expiresAt,
    });

    console.log(`🔒 Access Locked ${member.user.tag} in ${guild.name}`);

    return {
      room,
      expiresAt,
      record: await getLockRecord(guild.id, member.id),
    };
  } catch (error) {
    if (Object.keys(snapshot).length) {
      await restoreMemberOverwrites(guild, member.id, {
        previous_overwrites: snapshot,
        room_channel_id: room?.id || null,
      }).catch(() => {});
    }

    if (room) {
      await room.delete("Access Lock creation failed").catch(() => {});
    }

    await deleteLockRecord(guild.id, member.id).catch(() => {});

    throw error;
  }
}

async function unlockByRecord({
  client,
  guild,
  record,
  moderatorID = null,
  reason = null,
}) {
  if (!guild || !record) {
    throw new Error("Access Lock unlock requires guild and record.");
  }

  const key = `${guild.id}:${record.user_id}`;

  if (processingUnlocks.has(key)) {
    return false;
  }

  processingUnlocks.add(key);

  try {
    await restoreMemberOverwrites(guild, record.user_id, record);

    let room = null;

    if (record.room_channel_id) {
      room = guild.channels.cache.get(record.room_channel_id);

      if (!room) {
        room = await guild.channels
          .fetch(record.room_channel_id)
          .catch(() => null);
      }
    }

    if (room?.isTextBased?.()) {
      await room
        .send({
          content:
            `<@${record.user_id}> 🔓 ` +
            "**Your server access has been restored.**",
        })
        .catch(() => {});
    }

    await deleteLockRecord(guild.id, record.user_id);

    if (room) {
      const timer = setTimeout(() => {
        room.delete("Arclume Access Lock ended").catch(() => {});
      }, 1500);

      timer.unref?.();
    }

    if (client?.users) {
      const user = await client.users.fetch(record.user_id).catch(() => null);

      if (user) {
        let dm = `🔓 Your Access Lock in **${guild.name}** has ended.`;

        if (reason) {
          dm += `\nReason: ${cleanReason(reason)}`;
        }

        await user.send(dm).catch(() => {});
      }
    }

    console.log(
      `🔓 Access Lock removed: ${record.user_id} in ${guild.name}` +
        (moderatorID ? ` by ${moderatorID}` : ""),
    );

    return true;
  } finally {
    processingUnlocks.delete(key);
  }
}

async function unlockMember({
  client,
  guild,
  userID,
  moderatorID = null,
  reason = "Unlocked by staff.",
}) {
  const record = await getLockRecord(guild.id, userID);

  if (!record) {
    throw new Error("That member is not Access Locked.");
  }

  await unlockByRecord({
    client,
    guild,
    record,
    moderatorID,
    reason,
  });

  return true;
}

async function processExpiredLocks(client) {
  try {
    const result = await pool.query(`
      SELECT *
      FROM access_locks
      WHERE expires_at IS NOT NULL
        AND expires_at <= NOW()
      ORDER BY expires_at ASC
      LIMIT 50
    `);

    for (const record of result.rows) {
      const guild =
        client.guilds.cache.get(record.guild_id) ||
        (await client.guilds.fetch(record.guild_id).catch(() => null));

      if (!guild) {
        continue;
      }

      await unlockByRecord({
        client,
        guild,
        record,
        reason: "Temporary Access Lock expired automatically.",
      }).catch((error) => {
        console.error("❌ Access Lock expiry restore failed:", error);
      });
    }
  } catch (error) {
    console.error("❌ Access Lock expiry processor error:", error);
  }
}

/* =========================================================
   COMMANDS
========================================================= */

async function handleLockCommand(client, message, args) {
  const member = await getTargetMember(message, args[0]);

  if (!member) {
    await message.reply(
      "❌ Usage: `!accesslock @member [30m/2h/1d/1w] [reason]`",
    );

    return;
  }

  let cursor = 1;

  const duration = parseDurationToken(args[cursor]);

  if (duration?.tooLong) {
    await message.reply(
      "❌ Temporary Access Locks can be at most **28 days**.",
    );

    return;
  }

  if (duration) {
    cursor += 1;
  }

  const reason = cleanReason(args.slice(cursor).join(" "));

  const result = await lockMember({
    message,
    member,
    duration,
    reason,
  });

  const durationText = result.expiresAt
    ? formatDiscordTime(result.expiresAt)
    : "Until manually unlocked";

  await message.reply({
    content: [
      `🔒 **${member.user.username}** is now Access Locked.`,
      `💬 Private room: <#${result.room.id}>`,
      `⏱️ ${durationText}`,
      `📝 Reason: ${reason}`,
    ].join("\n"),

    allowedMentions: {
      parse: [],
    },
  });
}

async function handleUnlockCommand(client, message, args) {
  const member = await getTargetMember(message, args[0]);

  const userID = member?.id || String(args[0] || "").replace(/[^0-9]/g, "");

  if (!userID) {
    await message.reply("❌ Usage: `!accessunlock @member [reason]`");

    return;
  }

  const reason = cleanReason(args.slice(1).join(" "), "Unlocked by staff.");

  await unlockMember({
    client,
    guild: message.guild,
    userID,
    moderatorID: message.author.id,
    reason,
  });

  await message.reply(`🔓 Access restored for <@${userID}>.`);
}

async function handleStatusCommand(message, args) {
  const member = await getTargetMember(message, args[0]);

  const userID = member?.id || String(args[0] || "").replace(/[^0-9]/g, "");

  if (!userID) {
    await message.reply("❌ Usage: `!lockstatus @member`");

    return;
  }

  const record = await getLockRecord(message.guild.id, userID);

  if (!record) {
    await message.reply(`✅ <@${userID}> is **not** Access Locked.`);

    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("🔒 Access Lock Status")
    .addFields(
      {
        name: "Member",
        value: `<@${record.user_id}>`,
        inline: true,
      },
      {
        name: "Locked By",
        value: `<@${record.moderator_id}>`,
        inline: true,
      },
      {
        name: "Private Room",
        value: record.room_channel_id
          ? `<#${record.room_channel_id}>`
          : "Missing",
        inline: true,
      },
      {
        name: "Reason",
        value: cleanReason(record.reason),
      },
      {
        name: "Locked At",
        value: formatDiscordTime(record.locked_at),
        inline: true,
      },
      {
        name: "Expires",
        value: record.expires_at
          ? formatDiscordTime(record.expires_at)
          : "Manual unlock",
        inline: true,
      },
    )
    .setFooter({
      text: "Arclume Access Lock",
    })
    .setTimestamp();

  await message.reply({
    embeds: [embed],

    allowedMentions: {
      parse: [],
    },
  });
}

async function handleListCommand(message) {
  const locks = await getGuildLocks(message.guild.id);

  if (!locks.length) {
    await message.reply("✅ Nobody is currently Access Locked.");

    return;
  }

  const lines = locks.slice(0, 25).map((record, index) => {
    const expiry = record.expires_at
      ? `<t:${Math.floor(new Date(record.expires_at).getTime() / 1000)}:R>`
      : "manual";

    const room = record.room_channel_id
      ? `<#${record.room_channel_id}>`
      : "room missing";

    return `${index + 1}. <@${record.user_id}> • ${expiry} • ${room}`;
  });

  const embed = new EmbedBuilder()
    .setTitle("🔒 Active Access Locks")
    .setDescription(lines.join("\n"))
    .setFooter({
      text: `${locks.length} active lock${locks.length === 1 ? "" : "s"}`,
    })
    .setTimestamp();

  await message.reply({
    embeds: [embed],

    allowedMentions: {
      parse: [],
    },
  });
}

async function handleMessage(client, message) {
  if (!message.guild || message.author.bot) {
    return;
  }

  const content = String(message.content || "").trim();

  if (!content.startsWith("!")) {
    return;
  }

  const parts = content.split(/\s+/);

  const command = parts.shift().toLowerCase();

  const args = parts;

  const known =
    COMMANDS.lock.has(command) ||
    COMMANDS.unlock.has(command) ||
    COMMANDS.status.has(command) ||
    COMMANDS.list.has(command);

  if (!known) {
    return;
  }

  if (!canManageAccessLock(message)) {
    await message.reply(
      "❌ You need **Moderate Members** or **Manage Server** to use Access Lock.",
    );

    return;
  }

  try {
    if (COMMANDS.lock.has(command)) {
      await handleLockCommand(client, message, args);

      return;
    }

    if (COMMANDS.unlock.has(command)) {
      await handleUnlockCommand(client, message, args);

      return;
    }

    if (COMMANDS.status.has(command)) {
      await handleStatusCommand(message, args);

      return;
    }

    if (COMMANDS.list.has(command)) {
      await handleListCommand(message);
    }
  } catch (error) {
    console.error("❌ Access Lock command error:", error);

    await message
      .reply(`❌ ${error.message || "Access Lock failed."}`)
      .catch(() => {});
  }
}

/* =========================================================
   PROTECTION
========================================================= */

async function handleNewChannel(channel) {
  if (!channel.guild || !canEditOverwrites(channel)) {
    return;
  }

  try {
    const locks = await getGuildLocks(channel.guild.id);

    for (const record of locks) {
      if (record.room_channel_id === channel.id) {
        continue;
      }

      await channel.permissionOverwrites
        .edit(
          record.user_id,
          {
            ViewChannel: false,
            SendMessages: false,
            Connect: false,
            Speak: false,
          },
          {
            reason: "Active Arclume Access Lock",
          },
        )
        .catch(() => {});
    }
  } catch (error) {
    console.error("❌ Access Lock new-channel protection error:", error);
  }
}

async function handleMemberRejoin(member) {
  try {
    const record = await getLockRecord(member.guild.id, member.id);

    if (!record) {
      return;
    }

    await member.guild.channels.fetch().catch(() => {});

    for (const channel of member.guild.channels.cache.values()) {
      if (!canEditOverwrites(channel)) {
        continue;
      }

      if (channel.id === record.room_channel_id) {
        continue;
      }

      await channel.permissionOverwrites
        .edit(
          member.id,
          {
            ViewChannel: false,
            SendMessages: false,
            Connect: false,
            Speak: false,
          },
          {
            reason: "Restore active Access Lock after rejoin",
          },
        )
        .catch(() => {});
    }

    const room = record.room_channel_id
      ? member.guild.channels.cache.get(record.room_channel_id)
      : null;

    if (room && canEditOverwrites(room)) {
      await room.permissionOverwrites
        .edit(member.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        })
        .catch(() => {});
    }
  } catch (error) {
    console.error("❌ Access Lock rejoin protection error:", error);
  }
}

function startExpiryProcessor(client) {
  if (expiryTimer) {
    return;
  }

  processExpiredLocks(client).catch(() => {});

  expiryTimer = setInterval(() => {
    processExpiredLocks(client).catch(() => {});
  }, EXPIRY_CHECK_MS);

  expiryTimer.unref?.();
}

/* =========================================================
   REGISTER
========================================================= */

function registerAccessLockManager({ client } = {}) {
  if (!client) {
    throw new Error("registerAccessLockManager requires a Discord client.");
  }

  if (registered) {
    return;
  }

  registered = true;

  ensureDatabase().catch((error) => {
    console.error("❌ Access Lock database setup failed:", error);
  });

  client.on(Events.MessageCreate, (message) => {
    handleMessage(client, message).catch((error) => {
      console.error("❌ Access Lock message handler error:", error);
    });
  });

  client.on(Events.ChannelCreate, (channel) => {
    handleNewChannel(channel).catch(() => {});
  });

  client.on(Events.GuildMemberAdd, (member) => {
    handleMemberRejoin(member).catch(() => {});
  });

  if (client.isReady()) {
    startExpiryProcessor(client);
  } else {
    client.once(Events.ClientReady, () => {
      startExpiryProcessor(client);
    });
  }

  console.log("🔒 Arclume Access Lock Manager loaded");
  console.log("🙈 Full server hide system loaded");
  console.log("💬 Private lock-room system loaded");
  console.log("⏱️ Temporary Access Locks loaded");
  console.log("♻️ Permission restore system loaded");
  console.log("🚪 VC disconnect protection loaded");
  console.log("✅ !accesslock ready");
  console.log("✅ !accessunlock ready");
  console.log("✅ !lockstatus ready");
  console.log("✅ !locklist ready");
}

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  registerAccessLockManager,

  ensureDatabase,

  cleanReason,
  parseDurationToken,
  formatDiscordTime,

  getLockRecord,
  getGuildLocks,
  saveLockRecord,
  deleteLockRecord,

  getSavedCategoryID,
  saveCategoryID,

  botMissingPermissions,
  isStaffRole,
  syncCategoryStaffAccess,
  ensureLockCategory,

  safeChannelName,
  createPrivateLockRoom,

  permissionSnapshot,
  overwriteOptionsFromSnapshot,
  canEditOverwrites,
  hideMemberFromServer,
  restoreMemberOverwrites,

  announceLockRoom,
  lockMember,
  unlockMember,
  unlockByRecord,
  processExpiredLocks,

  handleNewChannel,
  handleMemberRejoin,
};
