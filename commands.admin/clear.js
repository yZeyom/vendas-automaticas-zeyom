const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("clear")
        .setDescription("Limpa uma quantidade específica de mensagens no canal.")
        .addIntegerOption(option =>
            option
                .setName("quantidade")
                .setDescription("O número de mensagens a serem limpas (1 a 100).")
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),
    async execute(interaction) {
        const allowedRoleIds = [
            "1300861186232942633",
            "1301233606282182677",
            "1302794856308932639",
            "1301232064527597589",
            "1301321892526821427"
        ];

        const hasPermission = interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages) ||
            interaction.member.roles.cache.some(role => allowedRoleIds.includes(role.id));

        if (!hasPermission) {
            return interaction.reply({ content: "Você não tem permissão para usar este comando.", ephemeral: true });
        }

        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: "Eu não tenho permissão para gerenciar mensagens neste canal.", ephemeral: true });
        }

        const amount = interaction.options.getInteger("quantidade");

        if (amount < 1 || amount > 100) {
            return interaction.reply({ content: "Por favor, insira um número válido entre 1 e 100.", ephemeral: true });
        }

        try {
            const deletedMessages = await interaction.channel.bulkDelete(amount, true);
            const reply = await interaction.reply({ content: `${deletedMessages.size} mensagens foram limpas!`, fetchReply: true });

            setTimeout(async () => {
                try {
                    await reply.delete();
                } catch (error) {
                    console.error("Erro ao apagar a mensagem de confirmação:", error);
                }
            }, 5000);

        } catch (error) {
            console.error("Erro ao limpar mensagens:", error);
            interaction.reply({ content: "Ocorreu um erro ao limpar as mensagens.", ephemeral: true });
        }
    },
};