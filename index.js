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
   CLOSE TICKET FUNCTION
================================ */
function fecharTicket(channel, tempo) {
  const tempoMs = tempo * 60 * 1000;

  setTimeout(async () => {
    if (!channel || channel.deleted) return;

    try {
      await channel.send("⏳ This ticket will be closed automatically.");
      await channel.delete();
    } catch (err) {
      console.log("Erro ao fechar ticket:", err.message);
    }
  }, tempoMs);
}

/* ===============================
   INTERACTIONS
================================ */
client.on(Events.InteractionCreate, async interaction => {

  /* ===== SLASH COMMAND ===== */
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName !== "reply") return;

    if (!config.ticketCategoryIds.includes(interaction.channel.parentId)) {
      return interaction.reply({
        content: "❌ This command can only be used inside tickets.",
        ephemeral: true
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
      const hoursLeft = Math.ceil((expiration - now) / (1000 * 60 * 60));
      return interaction.reply({
        content: `⛔ You are on cooldown for **${hoursLeft} more hour(s)**.`,
        ephemeral: true
      });
    }
  }

  /* ===============================
     FUNCIONOU
  ============================== */
  if (interaction.customId === "funcionou") {

  try {
    await interaction.deferUpdate();

    const member = interaction.member;
    const cooldownRoleId = config.cooldownRoleId;
    const cooldownHours = config.cooldownHours || 24;

    // 🔒 CHECK SE JÁ TEM O ROLE
    if (interaction.member.roles.cache.has(cooldownRoleId)) {
    return interaction.reply({
        content: `⛔ You are on cooldown for ${cooldownHours} hours.`,
        ephemeral: true
      });
    }

    // ➕ ADICIONAR ROLE
    await member.roles.add(cooldownRoleId);

    // ⏳ REMOVER ROLE DEPOIS DO TEMPO
    setTimeout(async () => {
      try {
        if (member.roles.cache.has(cooldownRoleId)) {
          await member.roles.remove(cooldownRoleId);
        }
      } catch (err) {
        console.log("Erro removendo cooldown role:", err.message);
      }
    }, cooldownHours * 60 * 60 * 1000);

    // 🔘 DESATIVAR BOTÕES
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

    await interaction.message.edit({
      components: [disabledRow]
    });

    // 📩 SUA MENSAGEM EXATA
    await interaction.channel.send(
      `\n` +
      `✅ **Excellent ${interaction.user}**\n\n` +
      `📸 Send a **Screenshot Review** here and Ping your Helper: https://discord.com/channels/1447731387250507857/1449424868209594378\n\n` +
      `🕒 **You will be given a ${cooldownHours} hours cooldown to ensure fairness!**\n\n` +
      `⏱️ This ticket will close in **${config.closeTimeFuncionou} minutes**.`
    );

    fecharTicket(
      interaction.channel,
      config.closeTimeFuncionou
    );

  } catch (err) {
    console.log("Erro no botão funcionou:", err);
  }
}


  /* ===============================
     NAO FUNCIONOU
  ============================== */
  if (interaction.customId === "nao_funcionou") {

    await interaction.deferUpdate();

    await interaction.message.edit({ components: [] });

    await interaction.channel.send(
      `❌ **Support has been activated.**\n\n` +
      `🔴 The member reported that it didn't work.\n\n` +
      `🕒 Please wait for <@&1447743349749715005>`
    );
  }

});

/* ===============================
   LOGIN
================================ */
client.login(process.env.BOT_TOKEN);
