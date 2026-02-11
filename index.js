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
  PermissionsBitField,
  SlashCommandBuilder,
  REST,
  Routes
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
   REGISTER SLASH COMMAND
================================ */
const commands = [
  new SlashCommandBuilder()
    .setName("reply")
    .setDescription("Send game confirmation buttons in the ticket")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log("⏳ Registering slash command...");
    await rest.put(
      Routes.applicationCommands("1470122326191247593"),
      { body: commands }
    );
    console.log("✅ Slash command registered");
  } catch (error) {
    console.error(error);
  }
})();

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
  let tempoMs =
    unidade === "horas"
      ? tempo * 60 * 60 * 1000
      : tempo * 60 * 1000;

  setTimeout(async () => {
    if (!channel || channel.deleted) return;

    await channel.send("⏳ This ticket will be closed automatically.");

    setTimeout(() => {
      channel.delete().catch(() => {});
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

    // Only ticket channels
    if (interaction.channel.parentId !== config.ticketCategoryId) {
      await interaction.reply({
        content: "❌ This command can only be used inside tickets.",
        ephemeral: true
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
        ephemeral: true
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
  if (interaction.channel.parentId !== config.ticketCategoryId) return;

  if (interaction.customId === "funcionou") {
    await interaction.reply({
      content:
        "\u200B\n✅ Excellent! Send a Screenshot Review in https://discord.com/channels/1470129418629546167/1470467186740039913.\n" +
        `⏱️ You have ${config.closeTimeFuncionou} minutes to review before ticket close.`,
      flags: MessageFlags.Ephemeral
    });

    await interaction.channel.send(
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

    await interaction.channel.send(
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
