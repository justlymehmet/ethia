const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const UserEconomy = require('../../models/UserEconomy');

module.exports = {
    name: 'money', // Komut adı: et money
    description: 'Ekonomi bakiyenizi görüntüler.',
    
    async execute(message, args, client) {
        const userId = message.author.id;
        const username = message.author.username;
        const moneyEmoji = process.env.MONEY ? `<:money:${process.env.MONEY}>` : '💰';

        // 1. Veriyi MongoDB'den Çek
        let userData = await UserEconomy.findOne({ userId: userId });

        if (!userData) {
            const tosEmbed = new EmbedBuilder()
                .setDescription(`Ekonomi sistemini kullanmak için aşağıdaki butona tıkla!`)
                .setColor('#ffffff');

            const acceptButton = new ButtonBuilder()
                .setCustomId('register_btn')
                .setLabel('Başla')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder().addComponents(acceptButton);

            const sentMsg = await message.reply({ embeds: [tosEmbed], components: [row] });

            const collector = sentMsg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 30000
            });

            collector.on('collect', async i => {
                if (i.user.id !== userId) {
                    return i.reply({ content: 'Bu butonu sadece komutu yazan kullanabilir!', ephemeral: true });
                }

                if (i.customId === 'register_btn') {
                    // Tekrar kontrol et (Çift kayıt önlemek için)
                    let checkUser = await UserEconomy.findOne({ userId: userId });
                    
                    if (!checkUser) {
                        // Yeni kullanıcı oluştur
                        const newUser = new UserEconomy({ userId: userId, balance: 0 });
                        await newUser.save();
                        
                        await i.update({ 
                            content: `✅ Kayıt tamamlandı! Şuanda **${moneyEmoji} 0 ET** paran var.`, 
                            embeds: [], 
                            components: [] 
                        });
                    } else {
                        await i.update({ content: 'Zaten bir hesabın var!', embeds: [], components: [] });
                    }
                }
            });
            return;
        }

        // --- Kullanıcı Varsa ---
        await message.channel.send(`**${moneyEmoji} | ${username}**, toplam **${userData.balance} ET** paran var!`);
    },
};