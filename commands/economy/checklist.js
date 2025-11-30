const { EmbedBuilder } = require('discord.js');
const UserEconomy = require('../../models/UserEconomy');

module.exports = {
    name: 'checklist',
    aliases: ['cl', 'gorevler', 'dailyquest'],
    description: 'Günlük görevlerini sade bir listede gösterir.',

    async execute(message, args, client) {
        const userId = message.author.id;
        
        // 1. VERİYİ MONGODB'DEN ÇEK
        let userData = await UserEconomy.findOne({ userId: userId });

        // Hesap Kontrolü
        if (!userData) {
            const warningEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`<:false:${process.env.FALSE_EMOJI || '❌'}> **${message.author}**, henüz bir hesabın yok!\nLütfen önce **et money** yazarak hesap oluştur.`);
            return message.reply({ embeds: [warningEmbed] });
        }

        // GLOBAL STANDART TARİH (YYYY-AA-GG)
        const todayGlobal = new Date().toISOString().split('T')[0];
        
        // Checklist objesi yoksa veya tarih eskiyse SIFIRLA
        // MongoDB'de nesne güncellemesi yapıyoruz
        if (!userData.checklist || userData.checklist.date !== todayGlobal) {
            userData.checklist = { 
                date: todayGlobal, 
                lootbox: 0, 
                weaponbox: 0, 
                cookie: false, 
                completed: false 
            };
            // Veritabanına hemen yansıması için kaydet
            await userData.save();
        }

        const cl = userData.checklist;
        const blankEmoji = process.env.BLANK ? `<:blank:${process.env.BLANK}>` : "⬛"; 

        // --- GÖREV DURUMLARI ---
        
        // 1. Günlük Ödül (LastDaily kontrolü)
        const lastDaily = userData.lastDaily || 0;
        // Son alınan daily tarihini kontrol et
        const lastDailyDate = new Date(lastDaily).toISOString().split('T')[0];
        const isDailyDone = lastDailyDate === todayGlobal;
        
        // 2. Cookie
        const isCookieDone = cl.cookie;

        // 3. Lootbox
        const lootboxGoal = 3;
        const lootboxCount = cl.lootbox || 0;
        const lootboxLeft = Math.max(0, lootboxGoal - lootboxCount);
        const isLootboxDone = lootboxCount >= lootboxGoal;

        // 4. Weaponbox
        const weaponboxGoal = 1;
        const weaponboxCount = cl.weaponbox || 0;
        const weaponboxLeft = Math.max(0, weaponboxGoal - weaponboxCount);
        const isWeaponboxDone = weaponboxCount >= weaponboxGoal;

        // --- TAMAMLANMA VE ÖDÜL ---
        const allDone = isDailyDone && isCookieDone && isLootboxDone && isWeaponboxDone;
        let rewardText = "Görevleri tamamla ve ödülü kap!";
        let rewardIcon = `${blankEmoji}`;

        if (allDone) {
            rewardIcon = "✅";
            if (!cl.completed) {
                // Ödülü Ver
                userData.balance += 10000;
                userData.checklist.completed = true;
                
                // Kaydet
                await userData.save();
                
                rewardText = `Tebrikler! **<:money:${process.env.MONEY || '💰'}> 10.000 ET** kazandın!`;
            } else {
                rewardText = "Bugünün ödülünü zaten aldın!";
            }
        }

        // --- GÖRÜNÜM ---
        const dailyLine = isDailyDone 
            ? `✅ 🎁 Günlük ödülünü aldın!` 
            : `${blankEmoji} 🎁 Günlük ödülünü alabilirsin!`;

        const cookieLine = isCookieDone 
            ? `✅ 🍪 Kurabiyeni gönderdin!` 
            : `${blankEmoji} 🍪 Birine kurabiye gönderebilirsin!`;

        const lootboxLine = isLootboxDone 
            ? `✅ 💎 Tüm lootboxları buldun!` 
            : `${blankEmoji} 💎 **${lootboxLeft}** tane daha Lootbox bulmalısın!`;

        const weaponboxLine = isWeaponboxDone 
            ? `✅ ⚔️ Weaponbox buldun!` 
            : `${blankEmoji} ⚔️ **${weaponboxLeft}** tane daha Weaponbox bulmalısın!`;

        const rewardLine = `${rewardIcon} 🎉 ${rewardText}`;

        const description = `${dailyLine}\n${cookieLine}\n${lootboxLine}\n${weaponboxLine}\n${rewardLine}`;

        // --- SAYAÇ ---
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setUTCDate(now.getUTCDate() + 1);
        tomorrow.setUTCHours(0, 0, 0, 0);
        
        const diffMs = tomorrow - now;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        
        const timeString = `${hours}S ${minutes}D ${seconds}S`;

        const embed = new EmbedBuilder()
            .setAuthor({ name: `${message.author.username}'in Kontrol Listesi`, iconURL: message.author.displayAvatarURL() })
            .setColor('#ffffff')
            .setDescription(description)
            .setFooter({ text: `Sıfırlanma: ${timeString}` });

        message.reply({ embeds: [embed] });
    },
};