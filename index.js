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
  await interaction.reply({
    content:
      "\u200B\n" +
      "✅ **Excellent!**\n\n" +
      "📸 Send a **Screenshot Review** here and Ping your Helper: https://discord.com/channels/1447731387250507857/1449424868209594378\n\n" +
      "🕒 **You will be given a 24 hour cooldown to ensure fairness!**\n\n" +
      `⏱️ This ticket will close in **${config.closeTimeFuncionou} minutes**.`,
    flags: MessageFlags.Ephemeral
  });

  fecharTicket(
    interaction.channel,
    config.closeTimeFuncionou,
    "minutos"
  );
}


  /* ===== NÃO FUNCIONOU ===== */
if (interaction.customId === "nao_funcionou") {
    await interaction.reply({
      content:
        "\u200B\n" +
        "❌ **Support has been activated.**\n\n" +
        "🔴 The member reported that it **didn't work**.\n\n" +
        "🕒 Please wait for <@&1447743349749715005			>",
      flags: MessageFlags.Ephemeral
    });

    
    
  }

});

/* ===============================
   LOGIN
================================ */
client.login(process.env.BOT_TOKEN);
