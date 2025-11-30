const { EmbedBuilder } = require('discord.js');
const UserEconomy = require('../../models/UserEconomy'); // Modeli çağır

const toSuperscript = (num) => {
    const map = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
    return num.toString().split('').map(d => map[d]).join('');
};

module.exports = {
    name: 'inventory',
    aliases: ['inv', 'canta', 'çanta', 'envanter'],
    description: 'Envanterini gösterir.',

    async execute(message, args, client) {
        const userId = message.author.id;
        
        // MongoDB'den veriyi çek
        const userData = await UserEconomy.findOne({ userId: userId });

        if (!userData) {
            return message.reply(`🎒 Hesabın yok! Önce **et money** yazarak kayıt ol.`);
        }

        // --- 1. SİLAHLAR ---
        let weaponsList = "Yok";
        if (userData.weapons && userData.weapons.length > 0) {
            weaponsList = userData.weapons
                .sort((a, b) => a.id - b.id)
                .map(w => `\`${w.id}\` ${w.emoji} **${w.name}**`)
                .join('\n');
        }

        // --- 2. AKTİF GEMLER ---
        let activeGemsDisplay = "Yok";
        const ag = userData.activeGems || {};
        if (ag.diamond || ag.heart) {
            activeGemsDisplay = "";
            const formatEmoji = (e) => e && e.startsWith('<a:') ? e : (e ? e.replace('<:', '<a:') : '');
            
            if (ag.diamond) activeGemsDisplay += `${formatEmoji(ag.diamond.emoji)} \`[${ag.diamond.currentDurability}]\`  `;
            if (ag.heart) activeGemsDisplay += `${formatEmoji(ag.heart.emoji)} \`[${ag.heart.currentDurability}]\` `;
        }

        // --- 3. ÇANTA ---
        let bagList = "Çantan boş.";
        if (userData.inventory && userData.inventory.length > 0) {
            const groupedItems = {};

            userData.inventory.forEach(item => {
                if (!groupedItems[item.id]) {
                    // Animasyonlu emoji düzeltmesi
                    let displayEmoji = item.emoji;
                    if ([10, 11, 12, 20, 21, 22].includes(item.id)) {
                         displayEmoji = item.emoji.startsWith('<a:') ? item.emoji : item.emoji.replace('<:', '<a:');
                    }
                    groupedItems[item.id] = { emoji: displayEmoji, count: 0 };
                }
                groupedItems[item.id].count++;
            });

            bagList = "";
            let itemCount = 0;
            for (const [id, info] of Object.entries(groupedItems)) {
                bagList += `\`${id}\` ${info.emoji}${toSuperscript(info.count)}   `;
                itemCount++;
                if (itemCount % 4 === 0) bagList += "\n\n";
            }
        }

        const embed = new EmbedBuilder()
            .setAuthor({ name: `${message.author.username} Envanteri`, iconURL: message.author.displayAvatarURL() })
            .setColor('#ffffff')
            .addFields(
                { name: 'Silahlar', value: weaponsList, inline: true },
                { name: 'Takılı Gemler', value: activeGemsDisplay, inline: true },
                { name: 'Çanta', value: bagList, inline: false }
            )
            .setFooter({ text: `💰 Bakiye: ${userData.balance} ET` });

        message.reply({ embeds: [embed] });
    },
};