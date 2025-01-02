const fs = require("fs");
const colors = require('colors');

module.exports = async (client) => {
  const SlashsArray = [];

  const directories = ['commands.admin', 'commands.public'];
  directories.forEach((directory) => {
    fs.readdir(`./${directory}`, (error, files) => {
      if (error) console.error(`Erro ao ler a pasta ${directory}:`, error);
      
      files.forEach(file => {
        if (!file.endsWith('.js')) return;
        const command = require(`../${directory}/${file}`);

        if (command?.data) {
          client.slashCommands.set(command.data.name, command);
          SlashsArray.push(command.data.toJSON());
        }
      });
    });
  });

  client.on("ready", async () => {
    try {
      await client.application.commands.set(SlashsArray);
      console.log(colors.bgGreen("✅ Slash commands carregados!"));
    } catch (error) {
      console.error("Erro ao registrar os slash commands:", error);
    }
  });
};