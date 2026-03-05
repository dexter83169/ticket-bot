require("dotenv").config();

const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const config = require("./config.json");

// ===============================
// ARQUIVO DE COOLDOWNS
// ===============================
const cooldownFile = "./cooldowns.json";

function loadCooldowns() {
  if (!fs.existsSync(cooldownFile)) return {};
  return JSON.parse(fs.readFileSync(cooldownFile));
}

function saveCooldowns(data) {
  fs.writeFileSync(cooldownFile, JSON.stringify(data, null, 2));
}

let cooldowns = loadCooldowns();
const tempLocks = new Map(); // pre-cooldown lock 10min

// ===============================
// UTILITÁRIOS
// ===============================
function formatTime(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

async function startCooldown(member) {
  const cooldownHours = config.cooldownHours || 24;
  const expiration = Date.now() + cooldownHours * 60 * 60 * 1000;

  cooldowns[member.id] = expiration;
  saveCooldowns(cooldowns);

  console.log(`⏱️ Cooldown iniciado para ${member.user.tag}`);

  setTimeout(async () => {
    try {
      const updatedMember = await member.guild.members.fetch(member.id);

      if (updatedMember.roles.cache.has(config.cooldownRoleId)) {
        await updatedMember.roles.remove(config.cooldownRoleId);
      }

      delete cooldowns[member.id];
      saveCooldowns(cooldowns);

      try {
        await updatedMember.send("✅ Your cooldown has ended. You can create tickets again.");
      } catch {}

      console.log(`Cooldown removido de ${updatedMember.user.tag}`);
    } catch (err) {
      console.log("Erro ao remover cooldown:", err.message);
    }
  }, cooldownHours * 60 * 60 * 1000);
}

// ===============================
// CLIENT
// ===============================
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers]
});

// ===============================
// BOT ONLINE
// ===============================
client.once(Events.ClientReady, async () => {
  console.log(`🤖 Bot online como ${client.user.tag}`);

  const guild = client.guilds.cache.first();

  // Reconstruir cooldowns ativos após reinício
  for (const userId in cooldowns) {
    const expiration = cooldowns[userId];
    const remaining = expiration - Date.now();

    if (remaining <= 0) {
      delete cooldowns[userId];
      saveCooldowns(cooldowns);
      continue;
    }

    try {
      const member = await guild.members.fetch(userId);

      setTimeout(async () => {
        try {
          if (member.roles.cache.has(config.cooldownRoleId)) {
            await member.roles.remove(config.cooldownRoleId);
          }

          delete cooldowns[userId];
          saveCooldowns(cooldowns);

          console.log(`Cooldown removido de ${member.user.tag}`);
        } catch {}
      }, remaining);
    } catch {}
  }
});

// ===============================
// FECHAR TICKET AUTOMATICAMENTE
// ===============================
function fecharTicket(channel, tempo, unidade = "minutos") {
  const tempoMs = unidade === "horas" ? tempo * 60 * 60 * 1000 : tempo * 60 * 1000;

  console.log(`⏱️ Ticket ${channel.id} will close in ${tempo} ${unidade}`);

  setTimeout(async () => {
    if (!channel || channel.deleted) return;

    try { await channel.send("⏳ This ticket will be closed automatically."); } catch {}
    try {
      await channel.delete();
      console.log("✅ Ticket closed automatically:", channel.id);
    } catch (err) {
      console.log("❌ Failed to close ticket:", err.message);
    }
  }, tempoMs);
}

// ===============================
// INTERACTIONS
// ===============================
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName !== "reply") return;

    const member = interaction.member;

    const expiration = cooldowns[member.id];
    if (expiration && Date.now() < expiration) {
      const remaining = expiration - Date.now();
      return interaction.reply({
        content: `⛔ You are on cooldown.\n\n⏱ Remaining time: **${formatTime(remaining)}**`,
        flags: 64
      });
    }

    if (!config.ticketCategoryIds.includes(interaction.channel.parentId)) {
      return interaction.reply({ content: "❌ This command can only be used inside tickets.", flags: 64 });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("funcionou").setLabel("✅ It worked").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("nao_funcionou").setLabel("❌ It didn't work").setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder().setDescription("🎮 **Your game worked correctly?**").setColor(0x2ecc71);

    return interaction.reply({ embeds: [embed], components: [row] });
  }

  // ===============================
  // BUTTONS
  // ===============================
  if (!interaction.isButton()) return;
  if (!config.ticketCategoryIds.includes(interaction.channel.parentId)) return;

  const member = interaction.member;
  const cooldownRoleId = config.cooldownRoleId;

  const hideButtons = async (message) => {
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("funcionou").setLabel("✅ It worked").setStyle(ButtonStyle.Success).setDisabled(true),
      new ButtonBuilder().setCustomId("nao_funcionou").setLabel("❌ It didn't work").setStyle(ButtonStyle.Danger).setDisabled(true)
    );
    try { await message.edit({ components: [disabledRow] }); } catch {}
  };

  // ===============================
  // FUNCIONOU
  // ===============================
  if (interaction.customId === "funcionou") {
    try {
      // pre-lock 10 minutos
      if (tempLocks.has(member.id)) {
        const remaining = tempLocks.get(member.id) - Date.now();
        return interaction.reply({ content: `⏳ You must wait **${formatTime(remaining)}** before creating another ticket.`, flags: 64 });
      }
      tempLocks.set(member.id, Date.now() + 10 * 60 * 1000);

      // resposta
      await interaction.reply({
        content: `✅ **Excellent ${interaction.user}**

🕒 You have 10 minutes to complete the review before receiving a cooldown.

📸 Send a **SCREENSHOT REVIEW** and ping your Helper here: https://discord.com/channels/1447731387250507857/1449424868209594378.

⏱️ Ticket closes in ${config.closeTimeFuncionou} minutes.`,
      });

      await hideButtons(interaction.message);

      // cooldown após 10 minutos
      setTimeout(async () => {
        try {
          await member.roles.add(cooldownRoleId);
          startCooldown(member);
          console.log(`Cooldown aplicado a ${member.user.tag}`);
        } catch (err) { console.log("Erro ao aplicar cooldown:", err.message); }

        tempLocks.delete(member.id);
      }, 10 * 60 * 1000);

      // fecha ticket automaticamente
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
      await hideButtons(interaction.message);
    } catch (err) { console.log("Erro no botão nao_funcionou:", err.message); }
  }

});

// ===============================
// LOGIN
// ===============================
client.login(process.env.BOT_TOKEN);