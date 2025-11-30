const { EmbedBuilder } = require('discord.js');
const UserEconomy = require('../../models/UserEconomy');

// Sıralı Hayvan Listesi
const ANIMALS_ORDER = [
    { id: 1, emoji: '🐝' }, { id: 2, emoji: '🐛' }, { id: 3, emoji: '🦋' }, 
    { id: 4, emoji: '🐇' }, { id: 5, emoji: '🐄' }, { id: 6, emoji: '🦊' }, 
    { id: 7, emoji: '🐺' }, { id: 8, emoji: '🐻' }, { id: 9, emoji: '🐼' }, 
    { id: 10, emoji: '🐉' }
];

// Üs Karakterleri Fonksiyonu
const toSuperscript = (num) => {
    const map = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
    return num.toString().split('').map(d => map[d]).join('');
};

module.exports = {
    name: 'zoo',
    aliases: ['hayvanlar', 'etzoo'],
    description: 'Avladığın hayvan koleksiyonu.',

    async execute(message, args, client) {
        const userId = message.author.id;
        
        // 1. Veriyi Çek
        let userData = await UserEconomy.findOne({ userId: userId });

        if (!userData) {
            const warningEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`<:false:${process.env.FALSE_EMOJI || '❌'}> **${message.author}**, henüz bir hesabın yok!\nLütfen önce **et money** yazarak hesap oluştur.`);
            return message.reply({ embeds: [warningEmbed] });
        }

        // Map verisini al (yoksa boş Map)
        const userAnimals = userData.animals || new Map();
        const totalXp = userData.huntingXp || 0;

        let displayString = "";
        let itemCount = 0;

        for (const animal of ANIMALS_ORDER) {
            // MongoDB Map'ten veriyi al (Key string olarak saklandığı için string çevrimi yapıyoruz)
            const count = userAnimals.get(animal.id.toString()) || 0;
            
            if (count > 0) {
                // Yakalanmışsa: ID + Emoji + Sayı
                displayString += `\`${animal.id}\` ${animal.emoji}${toSuperscript(count)}   `;
            } else {
                // Yakalanmamışsa: Soru İşareti
                displayString += `\`${animal.id}\` ❔⁰   `;
            }

            itemCount++;

            // Her 4 hayvanda bir alt satıra geç
            if (itemCount % 4 === 0) {
                displayString += "\n\n";
            }
        }

        const header = `🦁 **${message.author.username}'in bahçesi**`;
        const stats = `🏆 Toplam: **${totalXp} XP**`;
        const footer = `-# 💡 Satmak için: \`et sell <id>\` (Örn: et sell 1)`;
        
        message.reply(`${header}\n\n${displayString}\n\n${stats}\n${footer}`);
    },
};