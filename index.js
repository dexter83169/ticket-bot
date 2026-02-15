require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  MessageFlags,
  EmbedBuilder,
  PermissionsBitField
} = require("discord.js");

const config = require("./config.json");

/* ===============================
   CLIENT
================================ */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

/* ===============================
   BOT ONLINE
================================ */
client.once(Events.ClientReady, () => {
  console.log(`🤖 Bot online as ${client.user.tag}`);
});

/* ===============================
   CLOSE TICKET FUNCTION (AUTO)
================================ */
function fecharTicket(channel, tempo, unidade = "minutos") {
  const tempoMs =
    unidade === "horas"
      ? tempo * 60 * 60 * 1000
      : tempo * 60 * 1000;

  console.log(
    `⏱️ Ticket ${channel.id} will close in ${tempo} ${unidade}`
  );

  setTimeout(async () => {
    if (!channel || channel.deleted) return;

    try {
      await channel.send("⏳ This ticket will be closed automatically.");
    } catch {}

    try {
      await channel.delete();
      console.log("✅ Ticket closed automatically:", channel.id);
    } catch (err) {
      console.log("❌ Failed to close ticket:", err.message);
    }
  }, tempoMs);
}

/* ===============================
   INTERACTIONS
================================ */
client.on(Events.InteractionCreate, async interaction => {

  /* ===== SLASH COMMAND /reply ===== */
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName !== "reply") return;

    // ✅ CHECK: must be inside a ticket category
    if (!config.ticketCategoryIds.includes(interaction.channel.parentId)) {
      await interaction.reply({
        content: "❌ This command can only be used inside tickets.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Permission check
    const isAdmin = interaction.member.permissions.has(
      PermissionsBitField.Flags.Administrator
    );

    const hasAllowedRole = interaction.member.roles.cache.some(role =>
      config.allowedRoleIds.includes(role.id)
    );

    if (!isAdmin && !hasAllowedRole) {
      await interaction.reply({
        content: "❌ You are not allowed to use this command.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("funcionou")
        .setLabel("✅ It worked")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("nao_funcionou")
        .setLabel("❌ It didn't work")
        .setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setDescription("🎮 **Your game worked correctly?**")
      .setColor(0x2ecc71);

    await interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }

  /* ===== BUTTONS ===== */
  if (!interaction.isButton()) return;

  // ✅ CHECK: must be ticket category
  if (!config.ticketCategoryIds.includes(interaction.channel.parentId)) return;

  /* ===== FUNCIONOU ===== */
  if (interaction.customId === "funcionou") {
	  
	    // Define cooldown
    const cooldownTime = config.cooldownHours * 60 * 60 * 1000;
    cooldowns.set(userId, now + cooldownTime);

    // Desativar botões
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("funcionou")
        .setLabel("✅ It worked")
        .setStyle(ButtonStyle.Success)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("nao_funcionou")
        .setLabel("❌ It didn't work")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true)
    );

    await interaction.update({ components: [disabledRow] });

   // Mensagem pública no ticket
    await interaction.channel.send(
      "\u200B\n" +
      "✅ **Excellent!**\n\n" +
      "📸 Send a **Screenshot Review** here and Ping your Helper: https://discord.com/channels/1447731387250507857/1449424868209594378\n\n" +
      "🕒 **You will be given a 24 hour cooldown to ensure fairness!**\n\n" +
      `⏱️ This ticket will close in **${config.closeTimeFuncionou} minutes**.`
  );

  fecharTicket(
    interaction.channel,
    config.closeTimeFuncionou,
    "minutos"
  );
}


  /* ===== NÃO FUNCIONOU ===== */
if (interaction.customId === "nao_funcionou") {
    await interaction.update({ components: [] });

    await interaction.channel.send(
      "\u200B\n" +
        "❌ **Support has been activated.**\n\n" +
        "🔴 The member reported that it **didn't work**.\n\n" +
        "🕒 Please wait for <@&1447743349749715005			>",
      
    );

    
    
  }

});

/* ===============================
   LOGIN
================================ */
client.login(process.env.BOT_TOKEN);













require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  EmbedBuilder,
  PermissionsBitField
} = require("discord.js");

const config = require("./config.json");

/* ===============================
   CLIENT
================================ */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

/* ===============================
   COOLDOWN SYSTEM
================================ */
const cooldowns = new Map();

/* ===============================
   BOT ONLINE
================================ */
client.once(Events.ClientReady, () => {
  console.log(`🤖 Bot online as ${client.user.tag}`);
});

/* ===============================
   CLOSE TICKET FUNCTION (ORIGINAL)
================================ */
function fecharTicket(channel, tempo, unidade = "minutos") {
  const tempoMs =
    unidade === "horas"
      ? tempo * 60 * 60 * 1000
      : tempo * 60 * 1000;

  console.log(
    `⏱️ Ticket ${channel.id} will close in ${tempo} ${unidade}`
  );

  setTimeout(async () => {
    if (!channel || channel.deleted) return;

    try {
      await channel.send("⏳ This ticket will be closed automatically.");
    } catch {}

    try {
      await channel.delete();
      console.log("✅ Ticket closed automatically:", channel.id);
    } catch (err) {
      console.log("❌ Failed to close ticket:", err.message);
    }
  }, tempoMs);
}

/* ===============================
   INTERACTIONS
================================ */
client.on(Events.InteractionCreate, async interaction => {

  /* ===== SLASH COMMAND /reply ===== */
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName !== "reply") return;

    if (!config.ticketCategoryIds.includes(interaction.channel.parentId)) {
      await interaction.reply({
        content: "❌ This command can only be used inside tickets.",
        ephemeral: true
      });
      return;
    }

    const isAdmin = interaction.member.permissions.has(
      PermissionsBitField.Flags.Administrator
    );

    const hasAllowedRole = interaction.member.roles.cache.some(role =>
      config.allowedRoleIds.includes(role.id)
    );

    if (!isAdmin && !hasAllowedRole) {
      await interaction.reply({
        content: "❌ You are not allowed to use this command.",
        ephemeral: true
      });
      return;
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("funcionou")
        .setLabel("✅ It worked")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("nao_funcionou")
        .setLabel("❌ It didn't work")
        .setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setDescription("🎮 **Your game worked correctly?**")
      .setColor(0x2ecc71);

    await interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }

  /* ===== BUTTONS ===== */
  if (!interaction.isButton()) return;

  if (!config.ticketCategoryIds.includes(interaction.channel.parentId)) return;

  const userId = interaction.user.id;
  const now = Date.now();

  /* ===============================
     CHECK COOLDOWN
  ============================== */
  if (cooldowns.has(userId)) {
    const expiration = cooldowns.get(userId);

    if (now < expiration) {
      const restanteHoras = Math.ceil((expiration - now) / (1000 * 60 * 60));
      return interaction.reply({
        content: `⛔ You are on cooldown for **${restanteHoras} more hour(s)**.`,
        ephemeral: true
      });
    }
  }

  /* ===============================
     FUNCIONOU
  ============================== */
  if (interaction.customId === "funcionou") {

    // Define cooldown
    const cooldownTime = config.cooldownHours * 60 * 60 * 1000;
    cooldowns.set(userId, now + cooldownTime);

    // Desativar botões
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("funcionou")
        .setLabel("✅ It worked")
        .setStyle(ButtonStyle.Success)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("nao_funcionou")
        .setLabel("❌ It didn't work")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true)
    );

    await interaction.update({ components: [disabledRow] });

    // Mensagem pública no ticket
    await interaction.channel.send(
      "\u200B\n" +
      `✅ **Excellent! ${interaction.user} reported it worked!**\n\n` +
      "📸 Send a **Screenshot Review**.\n\n" +
      `🕒 Cooldown: ${config.cooldownHours} hour(s).\n\n` +
      `⏱️ This ticket will close in **${config.closeTimeFuncionou} minutes**.`
    );

    // Fechar automaticamente
    fecharTicket(
      interaction.channel,
      config.closeTimeFuncionou,
      "minutos"
    );
  }

  /* ===============================
     NAO FUNCIONOU
  ============================== */
  if (interaction.customId === "nao_funcionou") {

    await interaction.update({ components: [] });

    await interaction.channel.send(
      "\u200B\n" +
      `❌ **${interaction.user} reported that it didn't work.**\n\n` +
      "🔴 Support has been activated."
    );
  }

});

/* ===============================
   LOGIN
================================ */
client.login(process.env.BOT_TOKEN);
