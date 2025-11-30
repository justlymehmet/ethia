const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const UserEconomy = require('../../../models/UserEconomy'); // Model dosyasının yolu

module.exports = {
    data: new SlashCommandBuilder()
        .setName('money')
        .setDescription('Ekonomi bakiyenizi görüntüler.'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const username = interaction.user.username;

        // 1. Veriyi MongoDB'den Çek
        let userData = await UserEconomy.findOne({ userId: userId });

        // --- KULLANICI YOKSA (KAYIT OL) ---
        if (!userData) {
            const tosEmbed = new EmbedBuilder()
                .setTitle('📜 Hizmet Şartları')
                .setDescription(`Merhaba **${username}**, ekonomi sistemini kullanmak için kuralları kabul etmelisiniz.\n\n✅ **Kabul Ediyorum** butonuna tıklayarak hesabınızı oluşturabilirsiniz.`)
                .setColor('#00AAFF')
                .setFooter({ text: 'Bu mesaj sadece size görünür.' });

            const acceptButton = new ButtonBuilder()
                .setCustomId('accept_tos')
                .setLabel('Kabul Ediyorum')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅');

            const row = new ActionRowBuilder().addComponents(acceptButton);

            const response = await interaction.reply({ 
                embeds: [tosEmbed], 
                components: [row], 
                ephemeral: true,
                fetchReply: true 
            });

            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 30000
            });

            collector.on('collect', async i => {
                if (i.customId === 'accept_tos') {
                    // Çift kayıt önlemi
                    let checkUser = await UserEconomy.findOne({ userId: userId });
                    
                    if (!checkUser) {
                        // Yeni Kullanıcı Oluştur
                        const newUser = new UserEconomy({ userId: userId, balance: 0 });
                        await newUser.save();

                        await i.update({ 
                            content: `✅ **Harika!** Hesabın oluşturuldu. Başlangıç bakiyen: **0 ET**.\nTekrar \`/money\` yazarak bakiyeni görebilirsin.`, 
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

        // --- BAKİYE GÖSTER ---
        const moneyEmoji = process.env.MONEY ? `<:money:${process.env.MONEY}>` : '💰';

        await interaction.reply({ 
            content: `**${moneyEmoji} | ${username}**, toplam **${userData.balance} ET** paran var!` 
        });
    },
};