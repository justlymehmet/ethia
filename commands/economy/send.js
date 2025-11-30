const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const UserEconomy = require('../../models/UserEconomy');

module.exports = {
    name: 'send',
    aliases: ['give'],
    description: 'Başka bir kullanıcıya para gönderir.',

    async execute(message, args, client) {
        const sender = message.author;
        const target = message.mentions.users.first();
        const userId = sender.id;

        // --- Girdi Kontrolleri ---
        let finalAmount = 0;
        args.forEach(arg => {
            if (!isNaN(arg) && !arg.startsWith('<@')) {
                finalAmount = parseInt(arg);
            }
        });

        if (!target) return message.reply(`<:false:${process.env.FALSE_EMOJI || '❌'}> Kime para göndereceğini etiketlemelisin!`);
        if (!finalAmount || finalAmount <= 0) return message.reply(`<:false:${process.env.FALSE_EMOJI || '❌'}> Geçerli bir miktar girmelisin!`);
        if (sender.id === target.id) return message.reply(`<:false:${process.env.FALSE_EMOJI || '❌'}> Kendine para gönderemezsin!`);
        if (target.bot) return message.reply(`<:false:${process.env.FALSE_EMOJI || '❌'}> Botlara para gönderemezsin!`);

        // 1. Gönderenin Verisini Çek
        let senderData = await UserEconomy.findOne({ userId: sender.id });

        if (!senderData) {
            const warningEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`<:false:${process.env.FALSE_EMOJI || '❌'}> **${message.author}**, henüz bir hesabın yok!\nLütfen önce **et money** yazarak hesap oluştur.`);
            return message.reply({ embeds: [warningEmbed] });
        }

        if (senderData.balance < finalAmount) {
            return message.reply(`<:false:${process.env.FALSE_EMOJI || '❌'}> Yetersiz bakiye!`);
        }

        // --- Onay Mesajı ---
        const authorText = `${sender.username} ile  ${target.username} arasında para transferi`;
        const instructionsText = `Onaylamak için ✅ butonuna,\nİptal etmek için ❌ butonuna basınız.\n\n`;
        const warningText = `⚠️ *ET bakiyesini gerçek para, kripto varlıklar veya Nitro gibi maddi değeri olan öğelerle takas etmek kesinlikle yasaktır. Bu eylem **kalıcı olarak yasaklanmanıza** neden olur.*\n\n`;
        const amountBox = `${sender} ➜ ${target}:\n\`\`\`css\n${finalAmount.toLocaleString()} ET\n\`\`\``;

        const confirmEmbed = new EmbedBuilder()
            .setAuthor({
                name: authorText,
                iconURL: sender.displayAvatarURL()
            })
            .setColor('#ffffff')
            .setDescription(instructionsText + warningText + amountBox)
            .setTimestamp();

        const acceptButton = new ButtonBuilder()
            .setCustomId('accept_transfer')
            .setLabel('Onayla')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success);

        const cancelButton = new ButtonBuilder()
            .setCustomId('cancel_transfer')
            .setLabel('İptal')
            .setEmoji('✖️')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(acceptButton, cancelButton);

        const replyMessage = await message.reply({ embeds: [confirmEmbed], components: [row] });

        const collector = replyMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 15000
        });

        let interactionHandled = false;

        collector.on('collect', async i => {
            if (i.user.id !== sender.id) {
                return i.reply({ content: 'Bu butonu sadece gönderen kullanabilir!', ephemeral: true });
            }

            interactionHandled = true;

            // Verileri tekrar taze çek (Güvenlik)
            senderData = await UserEconomy.findOne({ userId: sender.id });

            if (senderData.balance < finalAmount) {
                return i.update({ content:(`<:false:${process.env.FALSE_EMOJI || '❌'}> İşlem sırasında bakiyeniz yetersiz kaldı.`), embeds: [], components: [] });
            }

            if (i.customId === 'accept_transfer') {
                // Alıcıyı bul veya oluştur
                let targetData = await UserEconomy.findOne({ userId: target.id });
                if (!targetData) {
                    targetData = new UserEconomy({ userId: target.id });
                }

                // Transfer İşlemi
                senderData.balance -= finalAmount;
                targetData.balance += finalAmount;

                // Kaydet
                await senderData.save();
                await targetData.save();

                const successEmbed = EmbedBuilder.from(confirmEmbed)
                    .setColor(`#${process.env.BASARILI || '00FF00'}`)
                    .setDescription(warningText + amountBox)
                    .setFooter({ text: `${sender.username} onayladı!` })
                    .setTimestamp();

                await i.update({
                    content: `**💳 | ${sender}**, **${target}** kullanıcısına **${finalAmount.toLocaleString()} ET** gönderdi!`,
                    embeds: [successEmbed],
                    components: []
                });

                collector.stop();

            } else {
                const cancelEmbed = EmbedBuilder.from(confirmEmbed)
                    .setColor(`#${process.env.HATA || 'FF0000'}`)
                    .setDescription('Transfer iptal edildi.')
                    .setFooter({ text: `${sender.username} iptal etti.` });

                await i.update({ embeds: [cancelEmbed], components: [] });
                collector.stop();
            }
        });

        collector.on('end', async () => {
            if (!interactionHandled) {
                try {
                    const disabledRow = new ActionRowBuilder().addComponents(
                        acceptButton.setDisabled(true),
                        cancelButton.setDisabled(true)
                    );

                    const timeoutEmbed = EmbedBuilder.from(confirmEmbed)
                        .setColor('#95A5A6')
                        .setFooter({ text: 'Zaman aşımı.' });

                    await replyMessage.edit({ embeds: [timeoutEmbed], components: [disabledRow] });
                } catch (e) { }
            }
        });
    },
};