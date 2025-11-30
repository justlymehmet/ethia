const { EmbedBuilder } = require('discord.js');
const UserEconomy = require('../../models/UserEconomy');

module.exports = {
    name: 'top',
    aliases: ['lb', 'leaderboard', 'sıralama'],
    description: 'En zengin kullanıcıları gösterir. (et top / et top global)',

    async execute(message, args, client) {
        const loadingMsg = await message.reply('Tablo hazırlanıyor..');

        try {
            // Önce komutu kullananın hesabı var mı kontrol et (Opsiyonel ama iyi olur)
            // Sadece varlığını kontrol etmek için basit bir count veya findOne yeterli
            const userExists = await UserEconomy.exists({ userId: message.author.id });

            if (!userExists) {
                const warningEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setDescription(`<:false:${process.env.FALSE_EMOJI || '❌'}> **${message.author}**, henüz bir hesabın yok!\nLütfen önce **et money** yazarak hesap oluştur.`);
                return loadingMsg.edit({ content: null, embeds: [warningEmbed] });
            }

            const isGlobal = args[0] && args[0].toLowerCase() === 'global';
            let leaderboard = [];
            let typeText = isGlobal ? '🌍 Global Sıralama' : `Sunucu Sıralaması`;

            // MongoDB'den en zenginleri çek (Limit koymak performansı artırır)
            // Global için ilk 50 kişiyi çekiyoruz, sunucu için hepsini çekip filtreleyeceğiz
            // (Çok büyük sunucularda limit artırılabilir veya cache kullanılabilir)
            let allUsers = await UserEconomy.find().sort({ balance: -1 }).limit(isGlobal ? 10 : 1000);

            if (isGlobal) {
                leaderboard = allUsers;
            } else {
                // Sunucu üyelerini önbelleğe al
                try {
                    await message.guild.members.fetch(); 
                } catch (err) {}
                
                // Sunucuda olanları filtrele
                leaderboard = allUsers.filter(u => message.guild.members.cache.has(u.userId));
            }

            const top10 = leaderboard.slice(0, 10);
            
            let description = "```css\n";
            
            if (top10.length === 0) {
                description += "Veri bulunamadı veya kimse para kazanmamış!\n";
            } else {
                for (let i = 0; i < top10.length; i++) {
                    const userData = top10[i];
                    let username = "Bulunamadı";

                    try {
                        let user = client.users.cache.get(userData.userId);
                        if (!user) {
                            user = await client.users.fetch(userData.userId).catch(() => null);
                        }

                        if (user) username = user.username.replace(/`/g, '');
                    } catch (e) {}

                    const rank = i + 1;
                    const balance = (userData.balance || 0).toLocaleString(); 
                    
                    const truncatedName = username.length > 12 ? username.substring(0, 10) + '..' : username;
                    const rankStr = `#${rank}`.padEnd(3, ' '); 
                    const nameStr = `${truncatedName}`.padEnd(14, ' '); 
                    
                    description += `${rankStr} ${nameStr} ${balance} ET\n`;
                }
            }
            description += "```";

            const embed = new EmbedBuilder()
                .setTitle(typeText)
                .setColor('#ffffff')
                .setDescription(description);

            await loadingMsg.edit({ content: null, embeds: [embed] });

        } catch (error) {
            console.error(error);
            await loadingMsg.edit({ content: `<:false:${process.env.FALSE_EMOJI || '❌'}> Sıralama yüklenirken bir hata oluştu.` });
        }
    },
};