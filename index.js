require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  EmbedBuilder
} = require("discord.js");

const config = require("./config.json");

// ===============================
// CLIENT
// ===============================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers
  ]
});

// ===============================
// BOT ONLINE
// ===============================
client.once(Events.ClientReady, () => {
  console.log(`🤖 Bot online como ${client.user.tag}`);
});







// ===============================
// INTERACTIONS
// ===============================
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName !== "reply") return;

    const member = interaction.member;
    const cooldownRoleId = config.cooldownRoleId;

    if (member.roles.cache.has(cooldownRoleId)) {
      return interaction.reply({
        content: `⛔ You are still on cooldown and cannot create a new ticket.`,
        flags: 64
      });
    }

    if (!config.ticketCategoryIds.includes(interaction.channel.parentId)) {
      return interaction.reply({
        content: "❌ This command can only be used inside tickets.",
        flags: 64
      });
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

    return interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }

  // ===== BUTTONS =====
  if (!interaction.isButton()) return;
  if (!config.ticketCategoryIds.includes(interaction.channel.parentId)) return;

  const member = interaction.member;
  const cooldownRoleId = config.cooldownRoleId;
  const cooldownHours = config.cooldownHours || 24;

  const hideButtons = async (message) => {
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
    try {
      await message.edit({ components: [disabledRow] });
    } catch {}
  };

  // ===============================
  // FUNCIONOU
  // ===============================
  if (interaction.customId === "funcionou") {
    try {
      if (member.roles.cache.has(cooldownRoleId)) {
        return interaction.reply({
          content: `⛔ You are already on cooldown for ${cooldownHours} hours.`,
          flags: 64
        });
      }

      // Mensagem confirmando
      await interaction.reply({
        content: `✅ **Excellent ${interaction.user}**

🕒 You have 10 minutes to complete the review before receiving a cooldown.

📸 Send a **SCREENSHOT REVIEW** and Ping your Helper here: https://discord.com/channels/1447731387250507857/1449424868209594378.

⏱️ Ticket closes in ${config.closeTimeFuncionou} minutes.`,
        
      });

      // Desativa os botões
      await hideButtons(interaction.message);

     

      // Fecha o ticket automaticamente
      fecharTicket(interaction.channel, config.closeTimeFuncionou);

    } catch (err) {
      console.log("Erro no botão funcionou:", err.message);
    }
  }

  // ===============================
  // NAO FUNCIONOU
  // ===============================
  if (interaction.customId === "nao_funcionou") {
    try {
      await interaction.reply({
        content: `❌ **Support has been activated.**\n\nPlease wait for <@&1447743349749715005>`,
        
      });

      // Desativa os botões
      await hideButtons(interaction.message);

    } catch (err) {
      console.log("Erro no botão nao_funcionou:", err.message);
    }
  }

});

// ===============================
// LOGIN
// ===============================
client.login(process.env.BOT_TOKEN);