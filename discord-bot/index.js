require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');

// Discord Client Initialization
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

const BOT_TOKEN = process.env['BOT_TOKEN'];
const CHANNEL_ID = process.env['CHANNEL_ID'];
const CLIENT_ID = process.env['CLIENT_ID']; // Bot'un Client ID'si
const PORT = process.env.PORT || 3001;

// Slash Commands tanımları
const commands = [
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Shows AuraFX usage statistics'),
  
  new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Resets all statistics')
    .addStringOption(option =>
      option.setName('confirmation')
        .setDescription('Type "yes" to confirm the reset operation')
        .setRequired(true)),
  
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Lists available commands'),
  
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Checks if the bot is working'),
];

// Komutları Discord'a kaydet
async function deployCommands() {
  try {
    const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);
    console.log('🔄 Slash komutları kaydediliyor...');
    
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands },
    );
    
    console.log('✅ Slash komutları başarıyla kaydedildi!');
  } catch (error) {
    console.error('❌ Komut kaydetme hatası:', error);
  }
}

// İstatistik verilerini saklamak için basit bir obje
let statsData = {
  totalUses: 0,
  todayUses: 0,
  weeklyUses: 0,
  lastReset: new Date().toISOString(),
  notifications: []
};

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}!`);
  deployCommands();
});

// Slash komut işleyicisi
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    switch (commandName) {
      case 'stats':
        await handleStatsCommand(interaction);
        break;
      
      case 'reset':
        await handleResetCommand(interaction);
        break;
      
      case 'help':
        await handleHelpCommand(interaction);
        break;
      
      case 'ping':
        await handlePingCommand(interaction);
        break;
      
      default:
        await interaction.reply({ content: '❌ Unknown command!', ephemeral: true });
    }
  } catch (error) {
    console.error('Komut işleme hatası:', error);
    await interaction.reply({ 
      content: '❌ An error occurred while processing the command!', 
      ephemeral: true 
    });
  }
});

// Stats komutu
async function handleStatsCommand(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('📊 AuraFX Statistics')
    .setColor(0x3498DB)
    .addFields(
      { name: '🔥 Today\'s Usage', value: `**${statsData.todayUses}** times`, inline: true },
      { name: '📈 Total Usage', value: `**${statsData.totalUses}** times`, inline: true },
      { name: '📅 This Week', value: `**${statsData.weeklyUses}** times`, inline: true },
      { name: '🔄 Last Reset', value: `<t:${Math.floor(new Date(statsData.lastReset).getTime() / 1000)}:R>`, inline: false }
    )
    .setTimestamp()
    .setFooter({ text: 'Powered by AuraFX', iconURL: 'https://aurafx.vercel.app/favicon.ico' });

  await interaction.reply({ embeds: [embed] });
}

// Reset komutu
async function handleResetCommand(interaction) {
  const confirmation = interaction.options.getString('confirmation');
  
  if (confirmation.toLowerCase() !== 'yes') {
    await interaction.reply({ 
      content: '❌ You must type "yes" to confirm the reset operation!', 
      ephemeral: true 
    });
    return;
  }

  // İstatistikleri sıfırla
  statsData = {
    totalUses: 0,
    todayUses: 0,
    weeklyUses: 0,
    lastReset: new Date().toISOString(),
    notifications: []
  };

  const embed = new EmbedBuilder()
    .setTitle('🔄 Statistics Reset')
    .setDescription('All usage data has been successfully reset!')
    .setColor(0xE74C3C)
    .setTimestamp()
    .setFooter({ text: 'Powered by AuraFX', iconURL: 'https://aurafx.vercel.app/favicon.ico' });

  await interaction.reply({ embeds: [embed] });
}

// Help komutu
async function handleHelpCommand(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('❓ AuraFX Bot Commands')
    .setColor(0x2ECC71)
    .addFields(
      { name: '/stats', value: 'Shows usage statistics', inline: false },
      { name: '/reset', value: 'Resets all statistics (confirmation required)', inline: false },
      { name: '/help', value: 'Shows this command list', inline: false },
      { name: '/ping', value: 'Checks if the bot is working', inline: false }
    )
    .setTimestamp()
    .setFooter({ text: 'Powered by AuraFX', iconURL: 'https://aurafx.vercel.app/favicon.ico' });

  await interaction.reply({ embeds: [embed] });
}

// Ping komutu
async function handlePingCommand(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🏓 Pong!')
    .setDescription(`Bot gecikmesi: **${client.ws.ping}ms**`)
    .setColor(0x2ECC71)
    .setTimestamp()
    .setFooter({ text: 'Powered by AuraFX', iconURL: 'https://aurafx.vercel.app/favicon.ico' });

  await interaction.reply({ embeds: [embed] });
}

client.login(BOT_TOKEN);

// Express Server for receiving notifications
const app = express();

// Geniş ve İzin Verici CORS Yapılandırması
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Tarayıcıların gönderdiği pre-flight (OPTIONS) isteklerini işle
app.options('*', cors());

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('AuraFX Bot is alive! Ready to receive notifications.');
});

app.post('/notify', (req, res) => {
  console.log('Received notification data:', req.body);
  const { details, todayCount, totalUses } = req.body;

  if (!details) {
    return res.status(400).send({ error: 'Missing notification details.' });
  }

  // İstatistikleri güncelle
  statsData.totalUses = totalUses || statsData.totalUses + 1;
  statsData.todayUses = todayCount || statsData.todayUses + 1;
  statsData.weeklyUses = Math.floor(statsData.weeklyUses + 1);
  
  // Son bildirimi kaydet
  statsData.notifications.unshift({
    skillName: details.skillName,
    source: details.source,
    timestamp: new Date().toISOString()
  });
  
  // Son 10 bildirimi tut
  if (statsData.notifications.length > 10) {
    statsData.notifications = statsData.notifications.slice(0, 10);
  }

  const channel = client.channels.cache.get(CHANNEL_ID);
  if (!channel) {
    console.error('❌ Could not find the channel with the specified ID.');
    return res.status(500).send({ error: 'Channel not found.' });
  }

  const activeModesString = details.activeModes.length > 0
    ? details.activeModes.join(', ')
    : "None";

  const embed = new EmbedBuilder()
    .setTitle(`✨ New Effect Code Generated! (${details.source})`)
    .setDescription(`*Skill Name: \`${details.skillName}\`*`)
    .setColor(details.source === '3D Editor' ? 0xF39C12 : 0x3498DB) // Gold for 3D, Blue for 2D
    .addFields(
      { name: "Layer Count", value: `**${details.layerCount}**`, inline: true },
      { name: "Element Count", value: `**${details.elementCount}**`, inline: true },
      { name: "⚡ Active Modes", value: activeModesString, inline: false },
    )
    .setTimestamp()
    .setFooter({ text: "Powered by AuraFX", iconURL: "https://aurafx.vercel.app/favicon.ico" });

  channel.send({ embeds: [embed] })
    .then(() => {
      console.log('✅ Notification sent to Discord successfully!');
      res.status(200).send({ success: true, message: 'Notification sent.' });
    })
    .catch(error => {
      console.error('❌ Failed to send notification to Discord:', error);
      res.status(500).send({ error: 'Failed to send Discord message.' });
    });
});

app.listen(PORT, () => {
  console.log(`🚀 Notification server is running on port ${PORT}`);
}); 