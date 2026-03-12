require("dotenv").config();

const { REST, Routes, SlashCommandBuilder } = require("discord.js");
const config = require("./config.json");

const commands = [
  new SlashCommandBuilder()
    .setName("reply")
    .setDescription("Send ticket buttons inside a Tickety ticket"),

  new SlashCommandBuilder()
    .setName("cooldown")
    .setDescription("Check your cooldown time")
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

// Para deploy global (pode levar até 1h para aparecer)
(async () => {
  try {
    console.log("⏳ Registering global slash commands...");

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log("✅ Global slash commands registered successfully!");
  } catch (error) {
    console.error(error);
  }
})();
