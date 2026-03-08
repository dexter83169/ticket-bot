// ===============================
// index.js - Bot Discord corrigido
// ===============================

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
// COOLDOWNS
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
const tempLocks = new Map();

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

  setTimeout(async () => {
    try {
      const updatedMember = await member.guild.members.fetch(member.id);
      if (updatedMember.roles.cache.has(config.cooldownRoleId)) {
        await updatedMember.roles.remove(config.cooldownRoleId);
      }
      delete cooldowns[member.id];
      saveCooldowns(cooldowns);
    } catch {}
  }, cooldownHours * 60 * 60 * 1000);
}

// ===============================
// EVENTS
// ===============================
client.once(Events.ClientReady, () => {
  console.log(`🤖 Bot online como ${client.user.tag}`);

  // Reconstruir cooldowns após reinício
  const guild = client.guilds.cache.first();
  for (const userId in cooldowns) {
    const expiration = cooldowns[userId];
    const remaining = expiration - Date.now();

    if (remaining <= 0) {
      delete cooldowns[userId];
      saveCooldowns(cooldowns);
      continue;
    }

    guild.members.fetch(userId).then(member => {
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
    }).catch(() => {});
  }
});

client.on(Events.InteractionCreate, async interaction => {
  console.log("Interaction received:", interaction.commandName);

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "reply") {
    const member = interaction.member;

    // Checa cooldown
    const expiration = cooldowns[member.id];
    if (expiration && Date.now() < expiration) {
      const remaining = expiration - Date.now();
      return interaction.reply({
        content: `⛔ You are on cooldown.\n⏱ Remaining time: **${formatTime(remaining)}**`,
        flags: 64
      });
    }

    // Comando de teste
    return interaction.reply("Hello! ✅");
  }
});

// ===============================
// REGISTER SLASH COMMANDS
// ===============================
const commands = [
  { name: "reply", description: "Test reply command" }
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("Refreshing slash commands...");
    await rest.put(
      Routes.applicationGuildCommands("1470122326191247593", "1447731387250507857"), 
      { body: commands }
    );
    console.log("Commands registered ✅");
  } catch (error) {
    console.error(error);
  }
})();

// ===============================
// LOGIN
// ===============================
client.login(process.env.TOKEN);