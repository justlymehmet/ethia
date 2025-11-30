const { EmbedBuilder } = require('discord.js');
const UserEconomy = require('../../models/UserEconomy');

// Master Liste (Fiyat Referansı)
const ANIMALS_DB = [
    { id: 1, name: 'Arı', price: 5 }, 
    { id: 2, name: 'Tırtıl', price: 8 },
    { id: 3, name: 'Kelebek', price: 12 }, 
    { id: 4, name: 'Tavşan', price: 15 },
    { id: 5, name: 'İnek', price: 25 }, 
    { id: 6, name: 'Tilki', price: 75 },
    { id: 7, name: 'Kurt', price: 100 }, 
    { id: 8, name: 'Ayı', price: 300 },
    { id: 9, name: 'Panda', price: 450 }, 
    { id: 10, name: 'Ejderha', price: 2000 }
];

module.exports = {
    name: 'sell',
    aliases: ['sat', 'etsell'],
    description: 'Hayvanlarını satarsın. (et sell all / et sell <id>)',

    async execute(message, args, client) {
        const userId = message.author.id;
        const arg = args[0] ? args[0].toLowerCase() : null;

        // 1. Veriyi MongoDB'den Çek
        let userData = await UserEconomy.findOne({ userId: userId });

        // Hesap Kontrolü
        if (!userData) {
            const warningEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`<:false:${process.env.FALSE_EMOJI || '❌'}> **${message.author}**, henüz bir hesabın yok!\nLütfen önce **et money** yazarak hesap oluştur.`);
            return message.reply({ embeds: [warningEmbed] });
        }

        // Hayvan Kontrolü
        // MongoDB Map yapısında .size kullanabiliriz
        if (!userData.animals || userData.animals.size === 0) {
            return message.reply(`<:false:${process.env.FALSE_EMOJI || '❌'}> Satacak hiç hayvanın yok! Önce **et hunt** yapmalısın.`);
        }

        // ================= TÜMÜNÜ SATMA (ALL) =================
        if (arg === 'all' || arg === 'hepsi') {
            let totalEarned = 0;
            let soldCount = 0;

            // Map üzerinde döngü (key=id, value=count)
            // for..of döngüsü Map ile çalışır
            for (const [idStr, count] of userData.animals) {
                const id = parseInt(idStr);
                const animalInfo = ANIMALS_DB.find(a => a.id === id);

                if (animalInfo && count > 0) {
                    totalEarned += animalInfo.price * count;
                    soldCount += count;
                }
            }

            if (soldCount === 0) {
                return message.reply(`<:false:${process.env.FALSE_EMOJI || '❌'}> Satılacak geçerli bir hayvan bulunamadı.`);
            }
            
            // Hayvanları temizle
            userData.animals.clear(); // Map'i boşaltır
            userData.balance += totalEarned;
            
            await userData.save();
            
            return message.reply(`💰 **${soldCount}** hayvanın hepsini sattın ve **${totalEarned} ET** kazandın!`);
        }

        // ================= TEK SATMA (ID ile) =================
        const targetId = parseInt(arg);
        
        if (isNaN(targetId)) {
            return message.reply(`<:false:${process.env.FALSE_EMOJI || '❌'}> Geçersiz komut! Hepsini satmak için \`et sell all\`, tek satmak için \`et sell <id>\` (örn: et sell 1) yaz.`);
        }

        // MongoDB Map'ten veriyi al (.get)
        const count = userData.animals.get(targetId.toString());

        if (!count || count <= 0) {
            return message.reply(`<:false:${process.env.FALSE_EMOJI || '❌'}> Bu hayvana (ID: ${targetId}) sahip değilsin!`);
        }

        const animalInfo = ANIMALS_DB.find(a => a.id === targetId);
        if (!animalInfo) return message.reply('❌ Sistem hatası: Bu ID veritabanında bulunamadı.');

        // Satış İşlemi
        const earned = animalInfo.price * count;

        userData.animals.delete(targetId.toString()); // Map'ten sil
        userData.balance += earned;

        await userData.save();
        
        return message.reply(`💰 Tüm **${animalInfo.name}** stokunu (${count} adet) sattın ve **${earned} ET** kazandın!`);
    },
};