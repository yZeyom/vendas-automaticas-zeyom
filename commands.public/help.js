const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const banlist = ['reacao'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Exibe todos os comandos disponíveis no bot.'),

    async execute(interaction) {
        const commands = interaction.client.commands
            .filter(command => !banlist.includes(command.name) && command.description)
            .map(command => `**\`${command.name}\`**: ${command.description}`)
            .join('\n');

        const embed = new EmbedBuilder()
            .setTitle('Comandos Disponíveis')
            .setDescription('Aqui estão todos os comandos disponíveis no bot:')
            .addFields({ name: 'Comandos:', value: commands || 'Nenhum comando disponível' })
            .setColor('#0099ff')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};