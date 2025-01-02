const botAdmins = ['712741631941410917', 'idadmin']; // ID dos administradores do BOT

function isAdmin(userId) {
  return botAdmins.includes(userId);
}

module.exports = { isAdmin };