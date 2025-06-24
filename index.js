const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require("discord.js");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;
const PORT = process.env.PORT || 3001;

if (!BOT_TOKEN || !CLIENT_ID || !CHANNEL_ID) {
  console.error("❌ Missing required environment variables!");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// Slash komutları tanımla
const commands = [
  new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Shows AuraFX usage statistics"),
    
  new SlashCommandBuilder()
    .setName("reset")
    .setDescription("Resets all statistics")
    .addStringOption(option =>
      option.setName("confirmation")
        .setDescription("Type 'yes' to confirm")
        .setRequired(true)),
        
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Shows all available commands"),
    
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check bot latency"),
    
  new SlashCommandBuilder()
    .setName("mention")
    .setDescription("Enable/disable mention notifications")
    .addStringOption(option =>
      option.setName("action")
        .setDescription("Turn mentions on or off")
        .setRequired(true)
        .addChoices(
          { name: "Enable", value: "on" },
          { name: "Disable", value: "off" }
        )),
        
  new SlashCommandBuilder()
    .setName("setuser")
    .setDescription("Set the user to mention for notifications")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("The user to mention")
        .setRequired(true)),

  // Yeni komutlar
  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Shows top skill generators"),
    
  new SlashCommandBuilder()
    .setName("activity")
    .setDescription("Shows recent activity"),
    
  new SlashCommandBuilder()
    .setName("server")
    .setDescription("Shows server information"),
    
  new SlashCommandBuilder()
    .setName("random")
    .setDescription("Generate a random motivational message"),
    
  new SlashCommandBuilder()
    .setName("uptime")
    .setDescription("Shows bot uptime and system info"),
    
  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Shows your AuraFX profile")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("User to check profile for")
        .setRequired(false)),
        
  new SlashCommandBuilder()
    .setName("announcement")
    .setDescription("Send an announcement (admin only)")
    .addStringOption(option =>
      option.setName("message")
        .setDescription("Announcement message")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("type")
        .setDescription("Announcement type")
        .setRequired(false)
        .addChoices(
          { name: "Info", value: "info" },
          { name: "Warning", value: "warning" },
          { name: "Success", value: "success" },
          { name: "Error", value: "error" }
        ))
];

// Komutları Discord'a kaydet
async function deployCommands() {
  try {
    const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);
    console.log("🔄 Slash komutları kaydediliyor...");

    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

    console.log("✅ Slash komutları başarıyla kaydedildi!");
  } catch (error) {
    console.error("❌ Komut kaydetme hatası:", error);
  }
}

// İstatistik verilerini saklamak için basit bir obje
let statsData = {
  totalUses: 0,
  todayUses: 0,
  weeklyUses: 0,
  lastReset: new Date().toISOString(),
  notifications: [],
  mentionEnabled: false,
  mentionUserId: null,
};

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}!`);
  deployCommands();
});

// Slash komut işleyicisi
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    switch (commandName) {
      case "stats":
        await handleStatsCommand(interaction);
        break;

      case "reset":
        await handleResetCommand(interaction);
        break;

      case "help":
        await handleHelpCommand(interaction);
        break;

      case "ping":
        await handlePingCommand(interaction);
        break;

      case "mention":
        await handleMentionCommand(interaction);
        break;

      case "setuser":
        await handleSetUserCommand(interaction);
        break;

      case "leaderboard":
        await handleLeaderboardCommand(interaction);
        break;

      case "activity":
        await handleActivityCommand(interaction);
        break;

      case "server":
        await handleServerCommand(interaction);
        break;

      case "random":
        await handleRandomCommand(interaction);
        break;

      case "uptime":
        await handleUptimeCommand(interaction);
        break;

      case "profile":
        await handleProfileCommand(interaction);
        break;

      case "announcement":
        await handleAnnouncementCommand(interaction);
        break;

      default:
        await interaction.reply({
          content: "❌ Unknown command!",
          ephemeral: true,
        });
    }
  } catch (error) {
    console.error("Komut işleme hatası:", error);
    await interaction.reply({
      content: "❌ An error occurred while processing the command!",
      ephemeral: true,
    });
  }
});

// Stats komutu
async function handleStatsCommand(interaction) {
  const embed = new EmbedBuilder()
    .setTitle("📊 AuraFX Statistics")
    .setColor(0x3498db)
    .addFields(
      {
        name: "🔥 Today's Usage",
        value: `**${statsData.todayUses}** times`,
        inline: true,
      },
      {
        name: "📈 Total Usage",
        value: `**${statsData.totalUses}** times`,
        inline: true,
      },
      {
        name: "📅 This Week",
        value: `**${statsData.weeklyUses}** times`,
        inline: true,
      },
      {
        name: "🔄 Last Reset",
        value: `<t:${Math.floor(new Date(statsData.lastReset).getTime() / 1000)}:R>`,
        inline: false,
      },
    )
    .setTimestamp()
    .setFooter({
      text: "Powered by AuraFX",
      iconURL: "https://aurafx.vercel.app/favicon.ico",
    });

  await interaction.reply({ embeds: [embed] });
}

// Reset komutu
async function handleResetCommand(interaction) {
  const confirmation = interaction.options.getString("confirmation");

  if (confirmation.toLowerCase() !== "yes") {
    await interaction.reply({
      content: '❌ You must type "yes" to confirm the reset operation!',
      ephemeral: true,
    });
    return;
  }

  // İstatistikleri sıfırla (mention ayarlarını koru)
  const currentMentionSettings = {
    mentionEnabled: statsData.mentionEnabled,
    mentionUserId: statsData.mentionUserId,
  };
  
  statsData = {
    totalUses: 0,
    todayUses: 0,
    weeklyUses: 0,
    lastReset: new Date().toISOString(),
    notifications: [],
    ...currentMentionSettings,
  };

  const embed = new EmbedBuilder()
    .setTitle("🔄 Statistics Reset")
    .setDescription("All usage data has been successfully reset!")
    .setColor(0xe74c3c)
    .setTimestamp()
    .setFooter({
      text: "Powered by AuraFX",
      iconURL: "https://aurafx.vercel.app/favicon.ico",
    });

  await interaction.reply({ embeds: [embed] });
}

// Help komutu
async function handleHelpCommand(interaction) {
  const embed = new EmbedBuilder()
    .setTitle("❓ AuraFX Bot Commands")
    .setColor(0x2ecc71)
    .addFields(
      { name: "📊 Basic Commands", value: "`/stats` - Usage statistics\n`/ping` - Bot latency\n`/help` - This command list", inline: false },
      { name: "🔧 Configuration", value: "`/setuser` - Set mention target\n`/mention` - Toggle mentions\n`/reset` - Reset statistics", inline: false },
      { name: "📈 Analytics", value: "`/leaderboard` - Top skills\n`/activity` - Recent activity\n`/profile` - User profile", inline: false },
      { name: "🎮 Fun & Info", value: "`/random` - Random motivation\n`/server` - Server info\n`/uptime` - System status", inline: false },
      { name: "👑 Admin Only", value: "`/announcement` - Send announcements", inline: false }
    )
    .setTimestamp()
    .setFooter({
      text: "Powered by @yaslicadi",
      iconURL: "https://aurafx.vercel.app/favicon.ico",
    });

  await interaction.reply({ embeds: [embed] });
}

// Ping komutu
async function handlePingCommand(interaction) {
  const embed = new EmbedBuilder()
    .setTitle("🏓 Pong!")
    .setDescription(`Bot gecikmesi: **${client.ws.ping}ms**`)
    .setColor(0x2ecc71)
    .setTimestamp()
    .setFooter({
      text: "Powered by AuraFX",
      iconURL: "https://aurafx.vercel.app/favicon.ico",
    });

  await interaction.reply({ embeds: [embed] });
}

// Mention komutu
async function handleMentionCommand(interaction) {
  const action = interaction.options.getString("action");
  
  if (action === "on") {
    if (!statsData.mentionUserId) {
      await interaction.reply({
        content: "❌ First, you need to set a user with `/setuser` command!",
        ephemeral: true,
      });
      return;
    }
    
    statsData.mentionEnabled = true;
    
    const embed = new EmbedBuilder()
      .setTitle("🔔 Mentions Enabled")
      .setDescription(`Mentions are now **enabled**! <@${statsData.mentionUserId}> will be mentioned after each notification.`)
      .setColor(0x2ecc71)
      .setTimestamp()
      .setFooter({
        text: "Powered by AuraFX",
        iconURL: "https://aurafx.vercel.app/favicon.ico",
      });
      
    await interaction.reply({ embeds: [embed] });
  } else {
    statsData.mentionEnabled = false;
    
    const embed = new EmbedBuilder()
      .setTitle("🔕 Mentions Disabled")
      .setDescription("Mentions are now **disabled**. No one will be mentioned after notifications.")
      .setColor(0xe74c3c)
      .setTimestamp()
      .setFooter({
        text: "Powered by AuraFX",
        iconURL: "https://aurafx.vercel.app/favicon.ico",
      });
      
    await interaction.reply({ embeds: [embed] });
  }
}

// Set User komutu
async function handleSetUserCommand(interaction) {
  const user = interaction.options.getUser("user");
  
  statsData.mentionUserId = user.id;
  
  const embed = new EmbedBuilder()
    .setTitle("👤 User Set")
    .setDescription(`<@${user.id}> has been set as the mention target for notifications.`)
    .setColor(0x3498db)
    .setTimestamp()
    .setFooter({
      text: "Powered by AuraFX",
      iconURL: "https://aurafx.vercel.app/favicon.ico",
    });
    
  await interaction.reply({ embeds: [embed] });
}

// Leaderboard komutu
async function handleLeaderboardCommand(interaction) {
  const skillCounts = {};
  
  // Son bildirimlerdeki skill isimlerini say
  statsData.notifications.forEach(notif => {
    if (notif.skillName) {
      skillCounts[notif.skillName] = (skillCounts[notif.skillName] || 0) + 1;
    }
  });
  
  const topSkills = Object.entries(skillCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
    
  let leaderboardText = "";
  if (topSkills.length === 0) {
    leaderboardText = "No data available yet!";
  } else {
    topSkills.forEach(([skill, count], index) => {
      const medals = ["🥇", "🥈", "🥉", "🏅", "🏅"];
      leaderboardText += `${medals[index]} **${skill}** - ${count} uses\n`;
    });
  }

  const embed = new EmbedBuilder()
    .setTitle("🏆 Top Generated Skills")
    .setDescription(leaderboardText)
    .setColor(0xf39c12)
    .setTimestamp()
    .setFooter({
      text: "Powered by AuraFX",
      iconURL: "https://aurafx.vercel.app/favicon.ico",
    });

  await interaction.reply({ embeds: [embed] });
}

// Activity komutu
async function handleActivityCommand(interaction) {
  if (statsData.notifications.length === 0) {
    await interaction.reply({
      content: "❌ No recent activity found!",
      ephemeral: true,
    });
    return;
  }

  let activityText = "";
  statsData.notifications.slice(0, 5).forEach((notif, index) => {
    const timeAgo = Math.floor((Date.now() - new Date(notif.timestamp).getTime()) / 60000);
    activityText += `**${index + 1}.** \`${notif.skillName}\` (${notif.source}) - ${timeAgo}m ago\n`;
  });

  const embed = new EmbedBuilder()
    .setTitle("📈 Recent Activity")
    .setDescription(activityText)
    .setColor(0x9b59b6)
    .setTimestamp()
    .setFooter({
      text: "Powered by AuraFX",
      iconURL: "https://aurafx.vercel.app/favicon.ico",
    });

  await interaction.reply({ embeds: [embed] });
}

// Server komutu
async function handleServerCommand(interaction) {
  const guild = interaction.guild;
  
  const embed = new EmbedBuilder()
    .setTitle("🏠 Server Information")
    .setThumbnail(guild.iconURL())
    .addFields(
      { name: "Server Name", value: guild.name, inline: true },
      { name: "Members", value: `${guild.memberCount}`, inline: true },
      { name: "Created", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
      { name: "Owner", value: `<@${guild.ownerId}>`, inline: true },
      { name: "Boost Level", value: `${guild.premiumTier}`, inline: true },
      { name: "Channels", value: `${guild.channels.cache.size}`, inline: true }
    )
    .setColor(0x2ecc71)
    .setTimestamp()
    .setFooter({
      text: "Powered by AuraFX",
      iconURL: "https://aurafx.vercel.app/favicon.ico",
    });

  await interaction.reply({ embeds: [embed] });
}

// Random komutu
async function handleRandomCommand(interaction) {
  const messages = [
    "✨ Keep creating amazing effects!",
    "🚀 Your creativity knows no bounds!",
    "💫 Every line of code is a step towards greatness!",
    "🎨 Art and technology unite in your hands!",
    "⚡ You're electrifying the digital world!",
    "🌟 Shine bright with your unique effects!",
    "🔥 Your passion for creation is inspiring!",
    "💎 You're crafting digital diamonds!",
    "🎯 Precision and creativity in perfect harmony!",
    "🌈 Adding color to the digital universe!"
  ];
  
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  
  const embed = new EmbedBuilder()
    .setTitle("🎲 Random Motivation")
    .setDescription(randomMessage)
    .setColor(0xe91e63)
    .setTimestamp()
    .setFooter({
      text: "Powered by AuraFX",
      iconURL: "https://aurafx.vercel.app/favicon.ico",
    });

  await interaction.reply({ embeds: [embed] });
}

// Uptime komutu
async function handleUptimeCommand(interaction) {
  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;
  
  const embed = new EmbedBuilder()
    .setTitle("⏰ System Information")
    .addFields(
      { name: "Bot Uptime", value: uptimeString, inline: true },
      { name: "Ping", value: `${client.ws.ping}ms`, inline: true },
      { name: "Memory Usage", value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, inline: true },
      { name: "Node.js Version", value: process.version, inline: true },
      { name: "Guilds", value: `${client.guilds.cache.size}`, inline: true },
      { name: "Users", value: `${client.users.cache.size}`, inline: true }
    )
    .setColor(0x34495e)
    .setTimestamp()
    .setFooter({
      text: "Powered by AuraFX",
      iconURL: "https://aurafx.vercel.app/favicon.ico",
    });

  await interaction.reply({ embeds: [embed] });
}

// Profile komutu
async function handleProfileCommand(interaction) {
  const user = interaction.options.getUser("user") || interaction.user;
  
  // Kullanıcının notification geçmişini bul
  const userNotifications = statsData.notifications.filter(notif => 
    notif.userId === user.id
  );
  
  const userStats = {
    totalGenerations: userNotifications.length,
    favoriteSource: "Unknown",
    lastActivity: userNotifications[0]?.timestamp || "Never"
  };
  
  // En çok kullanılan source'u bul
  if (userNotifications.length > 0) {
    const sources = {};
    userNotifications.forEach(notif => {
      sources[notif.source] = (sources[notif.source] || 0) + 1;
    });
    userStats.favoriteSource = Object.entries(sources)
      .sort(([,a], [,b]) => b - a)[0][0];
  }

  const embed = new EmbedBuilder()
    .setTitle(`👤 ${user.displayName || user.username}'s Profile`)
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      { name: "Total Generations", value: `${userStats.totalGenerations}`, inline: true },
      { name: "Favorite Source", value: userStats.favoriteSource, inline: true },
      { name: "Last Activity", value: userStats.lastActivity === "Never" ? "Never" : `<t:${Math.floor(new Date(userStats.lastActivity).getTime() / 1000)}:R>`, inline: true },
      { name: "Joined Discord", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
    )
    .setColor(0x8e44ad)
    .setTimestamp()
    .setFooter({
      text: "Powered by AuraFX",
      iconURL: "https://aurafx.vercel.app/favicon.ico",
    });

  await interaction.reply({ embeds: [embed] });
}

// Announcement komutu (sadece admin)
async function handleAnnouncementCommand(interaction) {
  // Admin kontrolü (sunucu sahibi veya yönetici yetkisi)
  if (!interaction.member.permissions.has("Administrator") && interaction.guild.ownerId !== interaction.user.id) {
    await interaction.reply({
      content: "❌ You don't have permission to use this command!",
      ephemeral: true,
    });
    return;
  }
  
  const message = interaction.options.getString("message");
  const type = interaction.options.getString("type") || "info";
  
  const colors = {
    info: 0x3498db,
    warning: 0xf39c12,
    success: 0x2ecc71,
    error: 0xe74c3c
  };
  
  const emojis = {
    info: "ℹ️",
    warning: "⚠️",
    success: "✅",
    error: "❌"
  };

  const embed = new EmbedBuilder()
    .setTitle(`${emojis[type]} Announcement`)
    .setDescription(message)
    .setColor(colors[type])
    .setTimestamp()
    .setFooter({
      text: `By ${interaction.user.displayName || interaction.user.username}`,
      iconURL: interaction.user.displayAvatarURL(),
    });

  await interaction.reply({ embeds: [embed] });
}

client.login(BOT_TOKEN);

// Express Server for receiving notifications
const app = express();

// Geniş ve İzin Verici CORS Yapılandırması
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Tarayıcıların gönderdiği pre-flight (OPTIONS) isteklerini işle
app.options("*", cors());

app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("AuraFX Bot is alive! Ready to receive notifications.");
});

// Stats endpoint
app.get("/stats", (req, res) => {
  res.json({
    success: true,
    data: {
      totalUses: statsData.totalUses,
      todayUses: statsData.todayUses,
      weeklyUses: statsData.weeklyUses,
      lastReset: statsData.lastReset,
      mentionEnabled: statsData.mentionEnabled,
      mentionUserId: statsData.mentionUserId,
      recentNotifications: statsData.notifications.slice(0, 5)
    }
  });
});

// Status endpoint
app.get("/status", (req, res) => {
  res.json({
    status: "online",
    uptime: process.uptime(),
    bot: {
      connected: client.isReady(),
      tag: client.user?.tag || "Not connected",
      ping: client.ws.ping
    },
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "AuraFX Discord Bot",
    version: "1.0.0"
  });
});

app.post("/notify", async (req, res) => {
  // Verileri doğrudan al
  const { canvasImage, skillName, elementCount, layerCount, activeModes, source } = req.body;

  // LOG: Gelen görselin başı ve uzunluğu
  console.log("canvasImage başı:", typeof canvasImage, canvasImage ? canvasImage.slice(0, 50) : "YOK");
  console.log("canvasImage uzunluğu:", canvasImage ? canvasImage.length : "YOK");

  const channel = client.channels.cache.get(CHANNEL_ID);
  if (!channel) {
    console.error("❌ Could not find the channel with the specified ID.");
    return res.status(500).send({ error: "Channel not found." });
  }

  // Canvas görselini dosyaya kaydet
  let attachment = null;
  let filename = null;
  if (canvasImage) {
    try {
      const matches = canvasImage.match(/^data:image\/png;base64,(.+)$/);
      if (!matches) throw new Error("Geçersiz base64!");
      const buffer = Buffer.from(matches[1], 'base64');
      filename = `preview_${Date.now()}.png`;
      require('fs').writeFileSync(filename, buffer);
      // LOG: Dosya gerçekten oluştu mu?
      console.log("Dosya kaydedildi mi?", filename, require('fs').existsSync(filename));
      attachment = new (require('discord.js').AttachmentBuilder)(filename);
    } catch (e) {
      console.error("Görsel kaydedilemedi:", e);
    }
  }

  // Embed oluştur
  const embed = new (require('discord.js').EmbedBuilder)()
    .setTitle(`✨ New Effect Code Generated! (${source || '2D Editor'})`)
    .setDescription(`*Skill Name: \`${skillName || 'Unknown'}\`*\n\nElement Count: **${elementCount ?? 'N/A'}**`)
    .setColor(source === "3D Editor" ? 0xf39c12 : 0x3498db)
    .addFields(
      { name: "Layer Count", value: `**${layerCount ?? 'N/A'}**`, inline: true },
      { name: "⚡ Active Modes", value: activeModes?.length ? activeModes.join(", ") : "None", inline: false },
    )
    .setTimestamp()
    .setFooter({
      text: "Powered by AuraFX",
      iconURL: "https://aurafx.vercel.app/favicon.ico",
    });
  if (attachment && filename) {
    embed.setImage(`attachment://${filename}`);
  }

  // Mesajı gönder
  try {
    await channel.send({ embeds: [embed], files: attachment ? [attachment] : [] });
    if (filename) require('fs').unlinkSync(filename); // Dosyayı sil
    res.status(200).send({ success: true, message: "Notification sent." });
  } catch (err) {
    console.error("❌ Failed to send notification to Discord:", err);
    if (filename) try { require('fs').unlinkSync(filename); } catch {}
    res.status(500).send({ error: "Failed to send Discord message." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Notification server is running on port ${PORT}`);
});
