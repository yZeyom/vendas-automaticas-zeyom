const { 
  SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, 
  ButtonBuilder, ChannelType, EmbedBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');

function generateUniqueId() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketpanel')
    .setDescription('Envia um painel de tickets para o canal especificado.')
    .addChannelOption(option =>
      option
        .setName('canal')
        .setDescription('O canal para enviar o painel de tickets')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const channelMention = interaction.options.getChannel('canal');

    if (!channelMention || channelMention.type !== ChannelType.GuildText) {
      return await interaction.reply({
        content: 'Por favor, selecione um canal de texto válido para enviar o painel de tickets.',
        ephemeral: true,
      });
    }

    const ticketCategoryId = '1303044435063341056'; // Categoria para os tickets
    const logChannelId = '1318266628319871110'; // ID do canal de logs
    const teamRoles = [ // ID roles da equipe de suporte
      '1301232957570154508',
      '1301232950029058109',
      '1300861186232942633',
      '1301233606282182677',
      '1301232003189968917',
    ];

    const embed = new EmbedBuilder()
      .setTitle('Atendimento')
      .setDescription(
        'Olá, selecione a categoria abaixo de acordo com sua necessidade e aguarde um membro da nossa equipe responder.\n\n' +
          '> **Horário de atendimento:** 08:00 às 22:00 - Segunda a Domingo (exceto feriados)\n\n' +
          '**Utilize a categoria correta, caso contrário seu ticket será encerrado.**'
      )
      .setColor(0x5865f2);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_ticket_category')
      .setPlaceholder('Selecione a categoria do seu ticket')
      .addOptions(
        { label: '💵 Financeiro', value: 'financeiro' },
        { label: '🎥 Criador de Conteúdo', value: 'criador_conteudo' },
        { label: '🏹 Moderadores', value: 'moderadores' },
        { label: '🆘 Dúvidas', value: 'duvidas' }
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await channelMention.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: `Painel de tickets enviado para ${channelMention}.`, ephemeral: true });

    module.exports.registerListeners(interaction.client, ticketCategoryId, teamRoles, logChannelId);
  },

  registerListeners(client, ticketCategoryId, teamRoles, logChannelId) {
    client.on('interactionCreate', async interaction => {
      if (interaction.isStringSelectMenu() && interaction.customId === 'select_ticket_category') {
        await handleTicketCreation(interaction, ticketCategoryId, teamRoles);
      } else if (interaction.isButton()) {
        if (interaction.customId === 'close_ticket') {
          await handleTicketClosure(interaction, logChannelId);
        } else if (interaction.customId === 'claim_ticket') {
          const memberRoles = interaction.member.roles.cache.map(role => role.id);
          const hasStaffRole = teamRoles.some(roleId => memberRoles.includes(roleId));

          if (!hasStaffRole) {
            return await interaction.reply({
              content: 'Apenas membros da equipe podem reivindicar este ticket.',
              ephemeral: true,
            });
          }

          const ticketChannel = interaction.channel;
          const isClaimed = ticketChannel.topic?.includes('Reivindicado por');

          if (isClaimed) {
            return await interaction.reply({
              content: 'Este ticket já foi reivindicado.',
              ephemeral: true,
            });
          }

          const claimEmbed = new EmbedBuilder()
            .setTitle('Ticket Reivindicado')
            .setDescription(`Este ticket será atendido por ${interaction.user}.`)
            .setColor(0x57f287);

          await ticketChannel.setTopic(`Reivindicado por ${interaction.user.tag}`);
          await interaction.reply({ embeds: [claimEmbed] });
        } else if (interaction.customId === 'add_user_ticket') {
          await showAddUserModal(interaction);
        }
      } else if (interaction.isModalSubmit() && interaction.customId === 'add_user_modal') {
        await handleAddUserToTicket(interaction);
      }
    });
  }
};

async function handleTicketCreation(interaction, ticketCategoryId, teamRoles) {
  await interaction.deferReply({ ephemeral: true });

  const selectedCategory = interaction.values[0];
  const userTicketChannelName = `${interaction.user.username.toLowerCase()}-${selectedCategory}`;

  try {
    const existingChannel = interaction.guild.channels.cache.find(
      channel => channel.name === userTicketChannelName && channel.parentId === ticketCategoryId
    );

    if (existingChannel) {
      return await interaction.editReply({ content: 'Você já possui um ticket aberto nessa categoria!' });
    }

    const ticketChannel = await interaction.guild.channels.create({
      name: userTicketChannelName,
      type: ChannelType.GuildText,
      parent: ticketCategoryId,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: ['ViewChannel'] },
        { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
        ...teamRoles.map(roleId => ({ id: roleId, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] })),
      ],
    });

    await interaction.editReply({
      content: `Ticket de **${selectedCategory}** criado com sucesso! Acesse o canal ${ticketChannel}.`,
    });

    const ticketEmbed = new EmbedBuilder()
      .setTitle(`Ticket - ${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}`)
      .setDescription(`Olá ${interaction.user}, um membro da equipe estará com você em breve.`)
      .setColor(0x5865f2);

    const ticketButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('claim_ticket')
        .setLabel('Reivindicar Ticket')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Fechar Ticket')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('add_user_ticket')
        .setLabel('Adicionar Usuário')
        .setStyle(ButtonStyle.Primary)
    );

    await ticketChannel.send({ embeds: [ticketEmbed], components: [ticketButtons] });
  } catch (error) {
    console.error('Erro ao criar o ticket:', error);
    await interaction.editReply({
      content: 'Houve um erro ao criar o ticket. Verifique as permissões do bot e tente novamente.',
    });
  }
}

async function showAddUserModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('add_user_modal')
    .setTitle('Adicionar Usuário ao Ticket')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('user_id')
          .setLabel('ID do Usuário')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Digite o ID do usuário a ser adicionado')
          .setRequired(true)
      )
    );

  await interaction.showModal(modal);
}

async function handleAddUserToTicket(interaction) {
  const userId = interaction.fields.getTextInputValue('user_id');

  try {
    const user = await interaction.guild.members.fetch(userId);

    if (!user) {
      return await interaction.reply({ content: 'Usuário não encontrado. Verifique o ID e tente novamente.', ephemeral: true });
    }

    await interaction.channel.permissionOverwrites.create(user, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    });

    await interaction.reply({ content: `Usuário <@${user.id}> adicionado ao ticket com sucesso!`, ephemeral: true });
  } catch (error) {
    console.error('Erro ao adicionar o usuário:', error);
    await interaction.reply({ content: 'Houve um erro ao adicionar o usuário. Verifique o ID e tente novamente.', ephemeral: true });
  }
}

async function handleTicketClosure(interaction, logChannelId) {
  const ticketChannel = interaction.channel;
  const ticketId = generateUniqueId();
  const ticketOwner = ticketChannel.permissionOverwrites.cache.find(perm => perm.allow.has('ViewChannel')).id;

  const messages = await ticketChannel.messages.fetch({ limit: 100 });
  const logContent = messages.map(msg => `[${msg.author.tag}] ${msg.content}`).reverse().join('\n');

  const logEmbed = new EmbedBuilder()
    .setTitle(`Atendimento #${ticketId}`)
    .setDescription(`**Usuário:** <@${ticketOwner}>`)
    .setColor(0x5865f2)
    .addFields({ name: 'Logs do Atendimento', value: logContent || 'Nenhuma mensagem registrada.' });

  const logChannel = interaction.guild.channels.cache.get(logChannelId);
  if (logChannel) {
    await logChannel.send({ embeds: [logEmbed] });
  }

  await ticketChannel.delete();
  await interaction.user.send(`Seu atendimento foi encerrado. Caso deseje fazer uma reclamação sobre o atendimento ou continuá-lo, você poderá abrir um novo ticket informando o seguinte ID: **${ticketId}**.`);
}