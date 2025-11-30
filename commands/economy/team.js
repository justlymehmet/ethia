const { EmbedBuilder } = require('discord.js');
const UserEconomy = require('../../models/UserEconomy');

module.exports = {
    name: 'team',
    aliases: ['takim', 'takım'],
    description: 'Savaş takımı kurar veya takımına bakar.',

    async execute(message, args, client) {
        const userId = message.author.id;
        const action = args[0] ? args[0].toLowerCase() : null; // set, kur vb.
        
        const teamName = args.slice(1).join(' ');

        // 1. Veriyi MongoDB'den Çek
        let userData = await UserEconomy.findOne({ userId: userId });

        // Hesap Kontrolü
        if (!userData) return message.reply('❌ Önce hesap oluşturmalısın! `et money` yaz.');

        // ================= DURUM 1: TAKIM BİLGİSİ (Sadece "et team") =================
        if (!action) {
            const team = userData.team;
            // MongoDB'de team objesi varsayılan olarak boş gelebilir, ismini kontrol et
            if (!team || !team.name) {
                return message.reply('❌ Henüz bir takımın yok! Kurmak için: `et team set <Takım Adı>`');
            }

            const embed = new EmbedBuilder()
                .setColor('#3498DB')
                .setTitle(`🛡️ ${team.name}`)
                .addFields(
                    { name: '🏆 Zaferler', value: `${team.wins || 0}`, inline: true },
                    { name: '💀 Yenilgiler', value: `${team.losses || 0}`, inline: true }
                )
                .setFooter({ text: 'Savaşmak için: et battle' });

            return message.reply({ embeds: [embed] });
        }

        // ================= DURUM 2: TAKIM KURMA (et team set <isim>) =================
        if (action === 'set' || action === 'kur' || action === 'oluştur') {
            
            if (!teamName) {
                return message.reply('❌ Bir takım adı yazmalısın! Örnek: `et team set Ejderha Avcıları`');
            }
            
            if (teamName.length > 20) {
                return message.reply('❌ Takım adı çok uzun! (Maksimum 20 karakter)');
            }

            // Takım verilerini güncelle
            if (!userData.team) userData.team = {};
            userData.team.name = teamName;
            
            // Eğer daha önce hiç savaşmadıysa 0'la, yoksa eski skor kalsın
            if (userData.team.wins === undefined) userData.team.wins = 0;
            if (userData.team.losses === undefined) userData.team.losses = 0;
            
            // Veriyi Kaydet
            await userData.save();
            
            return message.reply(`✅ Takım başarıyla kuruldu! Takım Adı: **${teamName}**\nArtık **et battle** komutunu kullanabilirsin.`);
        }
    },
};