const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const pastaPath = path.join(process.cwd(), 'parceriapastas');
const mensagemFilePath = path.join(pastaPath, 'mensagem.json');

function garantirPastaExiste() {
  if (!fs.existsSync(pastaPath)) {
    fs.mkdirSync(pastaPath, { recursive: true });
    console.log(`Pasta criada: ${pastaPath}`);
  }
}

function salvarMensagemECanal(messageId, channelId) {
  garantirPastaExiste();
  fs.writeFileSync(mensagemFilePath, JSON.stringify({ mensagemId: messageId, canalId: channelId }, null, 2));
  console.log(`ID da mensagem e canal salvos em ${mensagemFilePath}: mensagem ${messageId}, canal ${channelId}`);
}

function carregarMensagemECanal() {
  if (fs.existsSync(mensagemFilePath)) {
    const data = fs.readFileSync(mensagemFilePath);
    const { mensagemId, canalId } = JSON.parse(data);
    console.log(`ID da mensagem e canal carregados de ${mensagemFilePath}: mensagem ${mensagemId}, canal ${canalId}`);
    return { mensagemId, canalId };
  }
}

module.exports = {
  salvarMensagemECanal,
  carregarMensagemECanal,
};
