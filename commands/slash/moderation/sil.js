const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    // --- SLASH KOMUT YAPISI ---
    data: new SlashCommandBuilder()
        .setName('sil')
        .setDescription('Belirtilen miktarda mesajı kanaldan siler.')
        .addIntegerOption(option =>
            option.setName('miktar')
                .setDescription('Silinecek mesaj sayısı (Varsayılan: 100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(false) 
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    // --- ORTAK ÇALIŞTIRICI ---
    async execute(messageOrInteraction, args) {
        const isInteraction = messageOrInteraction.isChatInputCommand?.();
        const channel = messageOrInteraction.channel;
        const member = isInteraction ? messageOrInteraction.member : messageOrInteraction.member;

        // Yetki Kontrolü
        if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const errorContent = '❌ Bu komutu kullanmak için **Mesajları Yönet** yetkisine sahip olmalısın.';
            if (isInteraction) return messageOrInteraction.reply({ content: errorContent, ephemeral: true });
            return messageOrInteraction.reply(errorContent);
        }

        // Miktarı Al
        let amount;
        if (isInteraction) {
            amount = messageOrInteraction.options.getInteger('miktar') || 100;
        } else {
            if (!args || !args[0]) amount = 100;
            else amount = parseInt(args[0]);
        }

        // Doğrulama
        if (isNaN(amount) || amount < 1 || amount > 100) {
            const errorContent = '❌ Lütfen **1 ile 100** arasında geçerli bir sayı girin.';
            if (isInteraction) return messageOrInteraction.reply({ content: errorContent, ephemeral: true });
            return messageOrInteraction.reply(errorContent);
        }

        try {
            // Toplu Silme
            const deletedMessages = await channel.bulkDelete(amount, true);
            const deletedCount = deletedMessages.size;

            const successEmbed = new EmbedBuilder()
                .setColor(`#${process.env.BASARILI || '00FF00'}`)
                .setDescription(`_**${deletedCount} adet mesaj başarıyla silindi!**_`);

            if (isInteraction) {
                await messageOrInteraction.reply({ embeds: [successEmbed], ephemeral: true });
            } else {
                // Prefix komutunda: Kanala yaz, 5 saniye sonra sil
                const sentMsg = await channel.send({ embeds: [successEmbed] });
                
                // Komut mesajını silmeyi dene
                if (messageOrInteraction.deletable) await messageOrInteraction.delete().catch(() => {});
                
                // Bilgi mesajını sil
                setTimeout(() => {
                    sentMsg.delete().catch(() => {});
                }, 5000); // 5 saniye daha makul
            }

        } catch (error) {
            console.error(error);
            const errorMsg = '❌ Mesajlar silinirken bir hata oluştu. (14 günden eski mesajlar toplu silinemez)';
            
            if (isInteraction) {
                if (messageOrInteraction.deferred || messageOrInteraction.replied) {
                    await messageOrInteraction.followUp({ content: errorMsg, ephemeral: true });
                } else {
                    await messageOrInteraction.reply({ content: errorMsg, ephemeral: true });
                }
            } else {
                messageOrInteraction.reply(errorMsg);
            }
        }
    }
};