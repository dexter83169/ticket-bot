require('dotenv').config(); // Carrega variáveis do .env

const express = require("express");
const { 
  Client, 
  GatewayIntentBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  Events, 
  EmbedBuilder, 
  REST, 
  Routes 
} = require("discord.js");

const fs = require("fs");
const config = require("./config.json");

// ===============================
// KEEP ALIVE (Express)
// ===============================
const app = express();
app.get("/", (req, res) => res.send("Bot online"));
app.listen(3000, () => console.log("Server running"));

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

// ===============================
// COOLDOWNS
// ===============================
const cooldowns = new Map();

function startCooldown(interaction, member) {
  const cooldownHours = config.cooldownHours || 24;
  const expiration = Date.now() + cooldownHours * 60 * 60 * 1000;
  cooldowns.set(member.id, expiration);

  const interval = setInterval(() => {
    const remaining = expiration - Date.now();
    if (remaining <= 0) {
      clearInterval(interval);
      cooldowns.delete(member.id);
      return;
    }

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    // Aqui não envia mensagem, pois pode gerar spam
    // Se quiser notificação, descomente a linha abaixo
    // interaction.channel.send(`⏱️ **Cooldown**: ${hours}h ${minutes}m restantes para ${member}`);
  }, 60 * 1000);
}


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

📸 Send a **SCREENSHOT REVIEW** and PING YOUR HELPER here: https://discord.com/channels/1447731387250507857/1449424868209594378.

⏱️ Ticket closes in ${config.closeTimeFuncionou} minutes.`,
        
      });

      // Desativa os botões
      await hideButtons(interaction.message);

      // Adiciona role de cooldown
      try {
        await member.roles.add(cooldownRoleId);
      } catch (err) {
        console.log("Não foi possível adicionar cooldown role:", err.message);
      }

      // Inicia contador de cooldown
      startCooldown(interaction, member);

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
client.login(process.env.TOKEN);