require("dotenv").config();
const fs = require("fs");

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
// COOLDOWN STORAGE
// ===============================
const cooldownFile = "./cooldowns.json";
let cooldowns = {};

if (fs.existsSync(cooldownFile)) {
  cooldowns = JSON.parse(fs.readFileSync(cooldownFile));
}

function saveCooldowns() {
  fs.writeFileSync(cooldownFile, JSON.stringify(cooldowns, null, 2));
}

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
client.once(Events.ClientReady, async () => {
  console.log(`🤖 Bot online como ${client.user.tag}`);

  // Restaurar cooldowns ao reiniciar
  for (const userId in cooldowns) {
    const expiration = cooldowns[userId];
    const remaining = expiration - Date.now();
    if (remaining <= 0) {
      delete cooldowns[userId];
      continue;
    }

    setTimeout(async () => {
      try {
        const guild = client.guilds.cache.first();
        const member = await guild.members.fetch(userId);
        if (member.roles.cache.has(config.cooldownRoleId)) {
          await member.roles.remove(config.cooldownRoleId);
        }
        delete cooldowns[userId];
        saveCooldowns();
        console.log(`✅ Cooldown finished for ${member.user.tag} (restored)`);
      } catch {}
    }, remaining);
  }
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
// START COOLDOWN
// ===============================
async function startCooldown(member) {
  const cooldownHours = config.cooldownHours || 24;
  const cooldownRoleId = config.cooldownRoleId;
  const expiration = Date.now() + cooldownHours * 60 * 60 * 1000;

  cooldowns[member.id] = expiration;
  saveCooldowns();

  setTimeout(async () => {
    try {
      const guild = member.guild;
      const user = await guild.members.fetch(member.id);

      if (user.roles.cache.has(cooldownRoleId)) {
        await user.roles.remove(cooldownRoleId);
      }

      delete cooldowns[member.id];
      saveCooldowns();
      console.log(`✅ Cooldown finished for ${user.user.tag}`);
    } catch (err) {
      console.log("❌ Failed to remove cooldown role:", err.message);
    }
  }, expiration - Date.now());
}

// ===============================
// INTERACTIONS
// ===============================
client.on(Events.InteractionCreate, async interaction => {

  // ===============================
  // SLASH COMMANDS
  // ===============================
  if (interaction.isChatInputCommand()) {

    // ===============================
    // /reply
    // ===============================
    if (interaction.commandName === "reply") {

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

    // ===============================
    // /cooldown
    // ===============================
    if (interaction.commandName === "cooldown") {
      const expiration = cooldowns[interaction.user.id];

      if (!expiration) {
        return interaction.reply({
          content: "✅ You are not on cooldown.",
          flags: 64
        });
      }

      const remaining = expiration - Date.now();
      if (remaining <= 0) {
        delete cooldowns[interaction.user.id];
        saveCooldowns();
        return interaction.reply({
          content: "✅ Your cooldown has ended.",
          flags: 64
        });
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

      return interaction.reply({
        content: `⏱️ Cooldown remaining: **${hours}h ${minutes}m**`,
        flags: 64
      });
    }

  }

  // ===============================
  // BUTTONS
  // ===============================
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

      await interaction.reply({
        content: `✅ **Excellent ${interaction.user}**

🕒 You have 10 minutes to complete the review before receiving a cooldown.

📸 Send a **SCREENSHOT REVIEW** and Ping your Helper here: https://discord.com/channels/1447731387250507857/1449424868209594378.

⏱️ Ticket closes in ${config.closeTimeFuncionou} minutes.`,
      });

      await hideButtons(interaction.message);

      // Adiciona role de cooldown
      try {
        await member.roles.add(cooldownRoleId);
      } catch (err) {
        console.log("Não foi possível adicionar cooldown role:", err.message);
      }

      // Inicia contador de cooldown
      startCooldown(member);

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
