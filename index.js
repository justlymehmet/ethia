require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    Collection, 
    EmbedBuilder, 
    Partials, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot aktif ve calisiyor!');
});
server.listen(process.env.PORT || 3000);

const mongoURL = process.env.MONGO_URL;

if (!mongoURL) {
    console.error("HATA: MONGO_URL bulunamadı! .env dosyasını veya Render ayarlarını kontrol et.");
} else {
    mongoose.connect(mongoURL)
        .then(() => console.log("MongoDB'ye Başarıyla Bağlandı!"))
        .catch((err) => console.log("MongoDB Bağlantı Hatası:", err));
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites 
    ],
    partials: [Partials.GuildMember, Partials.User]
});

// --- DAVET TAKİP SİSTEMİ ---
const invites = new Collection(); 

const updateInvites = async (guild) => {
    try {
        const guildInvites = await guild.invites.fetch();
        invites.set(guild.id, new Collection(guildInvites.map((invite) => [invite.code, invite.uses])));
    } catch (e) {
        console.log(`[UYARI] ${guild.name} sunucusu için davetler çekilemedi (Yetki eksik olabilir).`);
    }
};

client.commands = new Collection();
client.prefixCommands = new Collection();

// --- Slash Komut Yükleyici ---
const slashFolders = fs.readdirSync('./commands/slash');
for (const folder of slashFolders) {
    const folderPath = `./commands/slash/${folder}`;
    if (fs.lstatSync(folderPath).isDirectory()) {
        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const command = require(`./commands/slash/${folder}/${file}`);
            if (command.data && command.execute) {
                client.commands.set(command.data.name, command);
            }
        }
    }
}

// --- Prefix Komut Yükleyici ---
const prefixPath = './commands/economy';
if (fs.existsSync(prefixPath)) {
    const prefixFiles = fs.readdirSync(prefixPath).filter(file => file.endsWith('.js'));
    for (const file of prefixFiles) {
        const command = require(`${prefixPath}/${file}`);
        if (command.name && command.execute) {
            client.prefixCommands.set(command.name, command);
        }
    }
}

client.once('clientReady', async () => {
    console.log(`✅ ${client.user.tag} aktif!`);
    
    // --- BOT DURUMU (STREAMING) ---
    client.user.setPresence({
        activities: [{ 
            name: "Elraenn'i İzliyor", 
            type: 1, 
            url: "https://www.twitch.tv/elraenn" 
        }],
        status: 'idle'
    });

    for (const guild of client.guilds.cache.values()) {
        await updateInvites(guild);
    }
});

// Yeni sunucuya eklendiğinde davetleri çek
client.on('guildCreate', async (guild) => {
    await updateInvites(guild);
});

// Davet oluşturulduğunda önbelleği güncelle
client.on('inviteCreate', async (invite) => {
    const guildInvites = invites.get(invite.guild.id) || new Collection();
    guildInvites.set(invite.code, invite.uses);
    invites.set(invite.guild.id, guildInvites);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: 'Hata!', ephemeral: true });
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    const prefix = 'et';
    if (!message.content.startsWith(prefix)) return;
    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const commandName = args.shift().toLowerCase();
    const command = client.prefixCommands.get(commandName) || client.prefixCommands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
    if (!command) return;
    try {
        await command.execute(message, args, client);
    } catch (error) {
        console.error(error);
    }
});

// ==========================================
// --- GELİŞMİŞ HOŞGELDİN / VEDA SİSTEMİ ---
// ==========================================

const settingsPath = path.join(process.cwd(), 'serverSettings.json');

const getGuildSettings = (guildId) => {
    if (fs.existsSync(settingsPath)) {
        try {
            const db = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            return db[guildId];
        } catch (e) { return null; }
    }
    return null;
};

// Değişken Formatlama Fonksiyonu
const formatVariable = (text, member, inviterData = null) => {
    if (!text) return "";
    
    // Doğru üye sayısı için memberCount kullanılır
    const totalMembers = member.guild.memberCount;

    let formatted = text
        .replace(/{kullanıcı}/g, `<@${member.id}>`)
        .replace(/{isim}/g, member.user.username)
        .replace(/{id}/g, member.id)
        .replace(/{üye_sayısı}/g, totalMembers.toString());

    // Resim değişkeni ({üye_pp} -> URL)
    if (formatted.includes('{üye_pp}')) {
        formatted = formatted.replace(/{üye_pp}/g, member.user.displayAvatarURL({ extension: 'png', size: 1024 }));
    }

    // Davet verileri
    if (inviterData) {
        formatted = formatted
            .replace(/{davet_eden}/g, `<@${inviterData.id}>`)
            .replace(/{davet_sayısı}/g, inviterData.count.toString());
    } else {
        formatted = formatted
            .replace(/{davet_eden}/g, "Bilinmiyor")
            .replace(/{davet_sayısı}/g, "0");
    }

    return formatted;
};

// 🟢 HOŞGELDİN EVENTİ
client.on('guildMemberAdd', async member => {
    const settings = getGuildSettings(member.guild.id);
    if (!settings || !settings.welcome || !settings.welcome.enabled || !settings.welcome.channel) return;

    // --- DAVET EDENİ BUL ---
    let inviterData = null;
    try {
        const oldInvites = invites.get(member.guild.id);
        const newInvites = await member.guild.invites.fetch();
        
        const usedInvite = newInvites.find(i => {
            const prevUses = oldInvites ? oldInvites.get(i.code) : 0;
            return i.uses > prevUses;
        });

        if (usedInvite && usedInvite.inviter) {
            const inviterInvites = newInvites.filter(i => i.inviter && i.inviter.id === usedInvite.inviter.id);
            const totalUses = inviterInvites.reduce((acc, inv) => acc + inv.uses, 0);
            inviterData = { id: usedInvite.inviter.id, count: totalUses };
        }
        updateInvites(member.guild);
    } catch (e) {}

    const channel = member.guild.channels.cache.get(settings.welcome.channel);
    if (!channel) return;

    const rawMsg = settings.welcome.message || "Hoşgeldin {kullanıcı}!";
    const finalMsg = formatVariable(rawMsg, member, inviterData);

    try {
        if (settings.welcome.isEmbed) {
            const embed = new EmbedBuilder()
                .setDescription(finalMsg)
                .setColor(settings.welcome.color || '#43B581')
                .setTimestamp();

            if (settings.welcome.thumbnail) {
                const thumbUrl = formatVariable(settings.welcome.thumbnail, member, inviterData);
                if (thumbUrl.startsWith('http')) embed.setThumbnail(thumbUrl);
            }

            if (settings.welcome.author && settings.welcome.author.name) {
                const authorName = formatVariable(settings.welcome.author.name, member, inviterData);
                const authorIcon = settings.welcome.author.icon 
                    ? formatVariable(settings.welcome.author.icon, member, inviterData) 
                    : undefined;
                
                embed.setAuthor({ 
                    name: authorName, 
                    iconURL: authorIcon && authorIcon.startsWith('http') ? authorIcon : undefined 
                });
            } else {
                embed.setTitle('🎉 Sunucuya Yeni Biri Katıldı!');
            }

            const components = [];
            if (settings.welcome.button && settings.welcome.button.enabled) {
                const btn = new ButtonBuilder()
                    .setLabel(settings.welcome.button.label || 'Tıkla')
                    .setStyle(ButtonStyle.Link)
                    .setURL(settings.welcome.button.url);
                components.push(new ActionRowBuilder().addComponents(btn));
            }

            await channel.send({ embeds: [embed], components: components });
        } else {
            await channel.send(finalMsg);
        }
    } catch (err) {
        console.error(`[HATA] Hoşgeldin mesajı gönderilemedi:`, err);
    }
});

// 🔴 VEDA EVENTİ
client.on('guildMemberRemove', async member => {
    const settings = getGuildSettings(member.guild.id);
    if (!settings || !settings.goodbye || !settings.goodbye.enabled || !settings.goodbye.channel) return;

    const channel = member.guild.channels.cache.get(settings.goodbye.channel);
    if (!channel) return;

    const rawMsg = settings.goodbye.message || "Görüşürüz {kullanıcı}.";
    const finalMsg = formatVariable(rawMsg, member, null);

    try {
        if (settings.goodbye.isEmbed) {
            const embed = new EmbedBuilder()
                .setDescription(finalMsg)
                .setColor(settings.goodbye.color || '#F04747')
                .setTimestamp();

            if (settings.goodbye.thumbnail) {
                const thumbUrl = formatVariable(settings.goodbye.thumbnail, member, null);
                if (thumbUrl.startsWith('http')) embed.setThumbnail(thumbUrl);
            }

            if (settings.goodbye.author && settings.goodbye.author.name) {
                const authorName = formatVariable(settings.goodbye.author.name, member, null);
                const authorIcon = settings.goodbye.author.icon 
                    ? formatVariable(settings.goodbye.author.icon, member, null) 
                    : undefined;

                embed.setAuthor({ 
                    name: authorName, 
                    iconURL: authorIcon && authorIcon.startsWith('http') ? authorIcon : undefined 
                });
            } else {
                embed.setTitle('👋 Birisi Ayrıldı');
            }

            const components = [];
            if (settings.goodbye.button && settings.goodbye.button.enabled) {
                const btn = new ButtonBuilder()
                    .setLabel(settings.goodbye.button.label || 'Güle Güle')
                    .setStyle(ButtonStyle.Link)
                    .setURL(settings.goodbye.button.url);
                components.push(new ActionRowBuilder().addComponents(btn));
            }

            await channel.send({ embeds: [embed], components: components });
        } else {
            await channel.send(finalMsg);
        }
    } catch (err) {
        console.error(`[HATA] Veda mesajı gönderilemedi:`, err);
    }
});


client.login(process.env.TOKEN);