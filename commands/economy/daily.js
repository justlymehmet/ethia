const { EmbedBuilder } = require('discord.js');
const UserEconomy = require('../../models/UserEconomy');

module.exports = {
    name: 'daily',
    aliases: ['gunluk', 'günlük'], 
    description: 'Günlük ödülünü alır. Her gün girersen ödül artar!',

    async execute(message, args, client) {
        const userId = message.author.id;
        const username = message.author.username;

        // 1. VERİYİ MONGODB'DEN ÇEK
        let userData = await UserEconomy.findOne({ userId: userId });

        // 2. HESAP KONTROLÜ
        if (!userData) {
            const warningEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`<:false:${process.env.FALSE_EMOJI || '❌'}> **${message.author}**, henüz bir hesabın yok!\nLütfen önce **et money** yazarak hesap oluştur.`);
            return message.reply({ embeds: [warningEmbed] });
        }

        // 3. COOLDOWN KONTROLÜ
        const lastDaily = userData.lastDaily || 0;
        const cooldown = 86400000; // 24 Saat
        
        const timeSinceLast = Date.now() - lastDaily;

        if (timeSinceLast < cooldown) {
            const remaining = cooldown - timeSinceLast;
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

            return message.reply(`🕐 **${username}**, günlük ödülünü zaten aldın! Yeni ödül için **${hours}S ${minutes}DK ${seconds}S** kaldı!`);
        }

        // 4. SERİ (STREAK) HESAPLAMA
        let streak = userData.dailyStreak || 0;
        
        // Eğer son ödülün üzerinden 48 saat (cooldown * 2) geçtiyse seri bozulur
        if (timeSinceLast > (cooldown * 2) && lastDaily !== 0) {
            streak = 1;
        } else {
            streak += 1;
        }

        // 5. ÖDÜL HESAPLAMA
        let minReward, maxReward;

        if (streak >= 5) {
            minReward = 4000;
            maxReward = 5000;
        } else {
            const increaseAmount = (streak - 1) * 750; 
            minReward = 1000 + increaseAmount;
            maxReward = 2000 + increaseAmount;
        }

        const reward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;

        // 6. VERİLERİ GÜNCELLE
        userData.balance += reward;
        userData.dailyStreak = streak;
        userData.lastDaily = Date.now();

        // 7. VERİLERİ KAYDET
        await userData.save();

        // 8. MESAJ GÖNDER
        let replyText = `Tebrikler **${username}**! İşte bugünkü kazancın:\n`;

        replyText += `<:money:${process.env.MONEY || '💰'}> | Kazanılan: **${reward} ET**\n`;
        replyText += `🔥 | Serinin **${streak}. günü**\n`;
        
        if (streak >= 5) {
            replyText += `⭐ | Maksimum ödül seviyesindesin! Yarın gelmeyi unutma.`;
        }

        await message.reply(replyText);
    },
};