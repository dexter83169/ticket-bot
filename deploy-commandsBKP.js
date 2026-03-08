require("dotenv").config();

const { REST, Routes, SlashCommandBuilder } = require("discord.js");
const config = require("./config.json");

const commands = [
  new SlashCommandBuilder()
    .setName("reply")
    .setDescription("Send ticket buttons inside a Tickety ticket")
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

// Para deploy global (leve até 1h para aparecer)
(async () => {
  try {
    console.log("⏳ Registering global slash command /reply...");

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log("✅ Global slash command /reply registered successfully!");
  } catch (error) {
    console.error(error);
  }
})();
