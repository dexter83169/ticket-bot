
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