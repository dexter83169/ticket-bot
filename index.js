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
client.once("clientReady", () => {
  console.log(`🤖 Bot online as ${client.user.tag}`);
});

/* ===============================
   CLOSE TICKET FUNCTION
================================ */
function fecharTicket(channel, tempo, unidade = "minutos") {
  const tempoMs =
    unidade === "horas"
      ? tempo * 60 * 60 * 1000
      : tempo * 60 * 1000;

  setTimeout(async () => {
    if (!channel) return;

    try {
      // Mensagem opcional (não quebra se falhar)
      await channel.send("⏳ This ticket will be closed automatically.");
    } catch {}

    // Aguarda um pouco e fecha via Tickety
    setTimeout(async () => {
      try {
        await channel.send("/close"); // 👈 comando Tickety
        console.log("✅ Ticket closed via Tickety:", channel.id);
      } catch (err) {
        console.log("❌ Failed to close ticket via Tickety:", err.message);
      }
    }, 3000);

  }, tempoMs);
}

/* ===============================
   INTERACTIONS
================================ */
client.on(Events.InteractionCreate, async interaction => {

  /* ===== SLASH COMMAND /reply ===== */
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName !== "reply") return;

    // ✅ Somente tickets nas categorias configuradas
    if (!config.ticketCategoryIds.includes(interaction.channel.parentId)) {
      await interaction.reply({
        content: "❌ This command can only be used inside tickets.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // ✅ Permissões: Admin ou cargos permitidos
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

    // ✅ Botões dentro do canal do ticket
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

  // ✅ Só tickets válidos
  if (!config.ticketCategoryIds.includes(interaction.channel.parentId)) return;

  if (interaction.customId === "funcionou") {
    await interaction.reply({
      content:
        "\u200B\n✅ Excellent! Send a Screenshot Review in https://discord.com/channels/1447731387250507857/1449424868209594378.\n" +
        `⏱️ You have ${config.closeTimeFuncionou} minutes to review before ticket close.`,
      flags: MessageFlags.Ephemeral
    });

    await interaction.followUp(
      "\u200B\nYou will be given a 24 hour cooldown to ensure fairness!"
    );

    fecharTicket(
      interaction.channel,
      config.closeTimeFuncionou,
      "minutos"
    );
  }

  if (interaction.customId === "nao_funcionou") {
    await interaction.reply({
      content:
        "\u200B\n❌ Support has been activated. Please wait for assistance.\n" +
        `⏱️ This ticket will be closed in ${config.closeTimeNaoFuncionou} hours.`,
      flags: MessageFlags.Ephemeral
    });

    await interaction.followUp(
      `\u200B\n🔴 The member reported that it didn't work.\n<@&${config.supportRoleId}>`
    );

    fecharTicket(
      interaction.channel,
      config.closeTimeNaoFuncionou,
      "horas"
    );
  }
});

client.login(process.env.BOT_TOKEN);
