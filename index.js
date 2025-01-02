const { Client, GatewayIntentBits, Collection, ActivityType, Partials, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const { isAdmin } = require('./checkAdmin');
require('dotenv').config();

const { configurarColetor, carregarMensagemECanal } = require('./commands.admin/reacao');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.commands = new Collection();
client.slashCommands = new Collection();
let isCommandRunning = false;

function loadCommandsFromDir(directory, adminOnly = false) {
  const commandFiles = fs.readdirSync(directory).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const command = require(`${directory}/${file}`);
    
    if (adminOnly) {
      command.adminOnly = true;
    }

    if (command.data && command.data.name) {
      client.slashCommands.set(command.data.name, command);
    } else {
      client.commands.set(command.name, command);
    }
  }
}
loadCommandsFromDir('./commands.public');
loadCommandsFromDir('./commands.admin', true);

client.once('ready', async () => {
  console.log(`Bot online! Logado como ${client.user.tag}`);
  client.user.setActivity('Lunar Store: https://ggmax.com.br/perfil/xZeyom', { type: ActivityType.Playing });

  const dadosSalvos = carregarMensagemECanal();
  if (dadosSalvos) {
    const { mensagemId, canalId } = dadosSalvos;
    const canal = client.channels.cache.get(canalId);
    if (canal) {
      try {
        const mensagem = await canal.messages.fetch(mensagemId);
        if (mensagem) {
          await configurarColetor(client, canal, mensagemId, '1293210899766575205');
        } else {
          console.error("Mensagem não encontrada.");
        }
      } catch (error) {
        console.error('Erro ao configurar o coletor de reações:', error);
      }
    } else {
      console.error("Canal não encontrado.");
    }
  }

  const slashCommandsData = client.slashCommands.map(command => command.data.toJSON());
  await client.application.commands.set(slashCommandsData);
  console.log("Slash commands registrados com sucesso.");
});

client.on('messageCreate', async message => {
  if (message.channel.type === 'DM' && !message.author.bot) {
    try {
      await message.reply('Obrigado por sua mensagem! Estamos aqui para ajudar.');
    } catch (error) {
      console.error('Não foi possível responder à mensagem privada:', error);
    }
  }

  if (message.author.bot) return;

  const forbiddenLinks = ['youtube.com', 'discord.gg','twitch.tv'];
  const hasForbiddenLink = forbiddenLinks.some(link => message.content.includes(link));
  
  if (hasForbiddenLink) {
    const allowedRoles = ['1317573063709294653', '1301232003189968917', '1301232672021938236'];
    const memberRoles = message.member.roles.cache.map(role => role.id);
    
    const hasPermission = allowedRoles.some(role => memberRoles.includes(role));

    if (!hasPermission) {
      try {
        await message.delete();
        const embed = new EmbedBuilder()
          .setTitle('Divulgação não permitida')
          .setDescription('Você não pode enviar links do YouTube ou Discord neste servidor.')
          .setColor('Red')
          .setFooter({ text: 'AutoMod - 2025', iconURL: client.user.displayAvatarURL() });

        await message.channel.send({ embeds: [embed] });
      } catch (error) {
        console.error('Erro ao processar mensagem proibida:', error);
      }
      return;
    }
  }

  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  if (!client.commands.has(commandName)) return;

  const command = client.commands.get(commandName);

  if (command.adminOnly && !isAdmin(message.author.id)) {
    return message.reply('Você não tem permissão para usar este comando.');
  }

  if (isCommandRunning) {
    return message.reply('Já existe um comando em execução! Por favor, aguarde até que ele termine.');
  }

  isCommandRunning = true;

  try {
    await command.execute(message, args);
  } catch (error) {
    console.error(error);
    message.reply('Houve um erro ao tentar executar o comando.');
  }

  isCommandRunning = false;
});

client.on('interactionCreate', async interaction => {
  if (interaction.isCommand()) {
    const command = client.slashCommands.get(interaction.commandName);
    if (!command) return interaction.reply({ content: 'Erro: comando não encontrado.', ephemeral: true });

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'Houve um erro ao tentar executar o comando.', ephemeral: true });
    }
  }
});

client.login(process.env.KEY);