const { EmbedBuilder } = require('discord.js');
const UserEconomy = require('../../models/UserEconomy');

module.exports = {
    name: 'cookie',
    aliases: ['kurabiye', 'bisküvi'],
    description: 'Bir arkadaşına kurabiye gönderirsin.',

    async execute(message, args, client) {
        const sender = message.author;
        const receiver = message.mentions.users.first();
        
        // 1. Gönderenin Verisini Çek
        let senderData = await UserEconomy.findOne({ userId: sender.id });

        // Hesap Kontrolü
        if (!senderData) {
            const warningEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`<:false:${process.env.FALSE_EMOJI || '❌'}> **${sender}**, henüz bir hesabın yok!\nLütfen önce **et money** yazarak hesap oluştur.`);
            return message.reply({ embeds: [warningEmbed] });
        }
        
        // --- Sadece Bakiye Gösterme (Etiketsiz) ---
        if (!receiver) {
            const count = senderData.cookies || 0;
            return message.reply(`🍪 **${sender.username}**, şu an sahip olduğun **${count}** kurabiyen var!`);
        }

        // --- Gönderme İşlemi ---
        if (receiver.id === sender.id || receiver.bot) return message.reply('❌ Kendine veya botlara gönderemezsin.');

        // 2. Alıcının Verisini Çek (Yoksa Oluştur)
        let receiverData = await UserEconomy.findOne({ userId: receiver.id });
        if (!receiverData) {
            receiverData = new UserEconomy({ userId: receiver.id });
            // Alıcıyı henüz kaydetmiyoruz, işlem sonunda toplu kaydedeceğiz
        }

        // 3. Cooldown Kontrolü
        const lastCookie = senderData.lastCookie || 0;
        const cooldown = 86400000; // 24 Saat
        
        if (Date.now() - lastCookie < cooldown) {
            const remainingMs = cooldown - (Date.now() - lastCookie);
            const hours = Math.floor(remainingMs / (1000 * 60 * 60));
            return message.reply(`⏳ Kurabiyeler pişiyor! **${hours} saat** beklemelisin.`);
        }

        // 4. Cookie Transferi
        receiverData.cookies = (receiverData.cookies || 0) + 1;
        senderData.lastCookie = Date.now();

        // 5. Checklist Güncelleme
        const todayGlobal = new Date().toISOString().split('T')[0];

        // Eğer tarih farklıysa checklist'i sıfırla
        if (senderData.checklist.date !== todayGlobal) {
            senderData.checklist = { 
                date: todayGlobal, 
                lootbox: 0, 
                weaponbox: 0, 
                cookie: false, 
                completed: false 
            };
        }
        
        senderData.checklist.cookie = true; // Görev Tamamlandı

        // 6. Verileri Kaydet
        await senderData.save();
        await receiverData.save();

        message.reply(`🍪 **${sender.username}**, **${receiver.username}** kullanıcısına leziz bir kurabiye hediye etti!`);
    },
};