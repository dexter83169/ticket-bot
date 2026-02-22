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

/* ===============================
   CLIENT
================================ */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers // Essencial para manipular roles
  ]
});

/* ===============================
   BOT ONLINE
================================ */
client.once(Events.ClientReady, () => {
  console.log(`🤖 Bot online como ${client.user.tag}`);
});

/* ===============================
   CLOSE TICKET FUNCTION
================================ */
function fecharTicket(channel, tempo) {
  const tempoMs = tempo * 60 * 1000;

  setTimeout(async () => {
    if (!channel || channel.deleted) return;

    try {
      if (channel.permissionsFor(channel.guild.members.me).has("SendMessages")) {
        await channel.send("⏳ This ticket will be closed automatically.");
      }
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

    const member = interaction.member;
    const cooldownRoleId = config.cooldownRoleId;
    const cooldownHours = config.cooldownHours || 24;

    // 🔒 BLOQUEIA USUÁRIO EM COOLDOWN DE CRIAR TICKET
    if (member.roles.cache.has(cooldownRoleId)) {
      return interaction.reply({
        content: `⛔ You are still on cooldown for ${cooldownHours} hours and cannot create a new ticket.`,
        ephemeral: true
      });
    }

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

  const member = interaction.member;
  const cooldownRoleId = config.cooldownRoleId;
  const cooldownHours = config.cooldownHours || 24;

  /* ===============================
     FUNCIONOU
  ============================== */
  if (interaction.customId === "funcionou") {
    try {
      if (member.roles.cache.has(cooldownRoleId)) {
        return interaction.reply({
          content: `⛔ You are already on cooldown for ${cooldownHours} hours.`,
          ephemeral: true
        });
      }

      await interaction.reply({ content: "✅ Confirmed!", ephemeral: true });

      // Adiciona cooldown role
      await member.roles.add(cooldownRoleId).catch(err => {
        console.log("Erro ao adicionar cooldown role:", err.message);
      });

      // Remove role após o tempo
      setTimeout(async () => {
        try {
          const updatedMember = await interaction.guild.members.fetch(member.id);
          if (updatedMember.roles.cache.has(cooldownRoleId)) {
            await updatedMember.roles.remove(cooldownRoleId);
          }
        } catch (err) {
          console.log("Erro removendo cooldown role:", err.message);
        }
      }, cooldownHours * 60 * 60 * 1000);

      // Envia mensagem final
      try {
        if (interaction.channel.permissionsFor(interaction.guild.members.me).has("SendMessages")) {
          await interaction.channel.send(
            `✅ **Excellent ${interaction.user}**\n\n` +
            `🕒 You received a ${cooldownHours} hours cooldown.\n\n` +
            `⏱️ Ticket closes in ${config.closeTimeFuncionou} minutes.`
          );
        }
      } catch (err) {
        console.log("Não foi possível enviar mensagem FUNCIONOU:", err.message);
      }

      // Fecha ticket
      fecharTicket(interaction.channel, config.closeTimeFuncionou);

    } catch (err) {
      console.log("Erro no botão funcionou:", err);
    }
  }

  /* ===============================
     NAO FUNCIONOU
  ============================== */
  if (interaction.customId === "nao_funcionou") {
    try {
      await interaction.reply({ content: "🔴 Support has been notified.", ephemeral: true });

      try {
        if (interaction.channel.permissionsFor(interaction.guild.members.me).has("SendMessages")) {
          await interaction.channel.send(
            `❌ **Support has been activated.**\n\n` +
            `Please wait for <@&1447743349749715005>`
          );
        }
      } catch (err) {
        console.log("Não foi possível enviar mensagem NAO FUNCIONOU:", err.message);
      }

    } catch (err) {
      console.log("Erro no botão nao_funcionou:", err);
    }
  }

});

/* ===============================
   LOGIN
================================ */
client.login(process.env.BOT_TOKEN);