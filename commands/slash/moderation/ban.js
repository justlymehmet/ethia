const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bir kullanıcıyı sunucudan banlar.')
        .addUserOption(option =>
            option.setName('kullanıcı')
                .setDescription('Banlamak istediğiniz kullanıcı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('sebep')
                .setDescription('Banlama sebebi nedir?')
                .setRequired(false)
        ),

    async execute(interaction) {
        const user = interaction.options.getUser('kullanıcı');
        const banReason = interaction.options.getString('sebep') || "Sebep belirtilmedi";

        // Yetki Kontrolü
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            const errorEmbed = new EmbedBuilder()
                .setDescription(`<:false:${process.env.FALSE_EMOJI || '❌'}> _**Yetkiniz bulunmamakta!**_`)
                .setColor(`#${process.env.HATA || 'FF0000'}`);
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Üye kontrolü ve Ban İşlemi
        try {
            await interaction.guild.members.ban(user, { reason: banReason });
        } catch (error) {
            console.error(error);
            const errorEmbed = new EmbedBuilder()
                .setDescription(`<:false:${process.env.FALSE_EMOJI || '❌'}> _**Kullanıcı banlanamadı!** (Yetkim yetmiyor olabilir)_`)
                .setColor(`#${process.env.HATA || 'FF0000'}`);
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const successEmbed = new EmbedBuilder()
            .setDescription(`<:true:${process.env.TRUE_EMOJI || '✅'}> _**${user.tag} banlandı!** | ${banReason}_`)
            .setColor(`#${process.env.BASARILI || '00FF00'}`);

        const unbanButton = new ButtonBuilder()
            .setCustomId('unban')
            .setLabel('Banı Kaldır (Unban)')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(unbanButton);

        const message = await interaction.reply({ embeds: [successEmbed], components: [row], fetchReply: true });

        // Unban Butonu Collector
        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000 // 1 dakika buton aktif kalsın
        });

        collector.on('collect', async i => {
            if (i.customId === 'unban') {
                if (!i.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                    return i.reply({ content: `<:false:${process.env.FALSE_EMOJI || '❌'}> Yetkiniz yok!`, ephemeral: true });
                }
                
                try {
                    await interaction.guild.members.unban(user.id, 'Unban butonuyla kaldırıldı.');
                    await i.update({ content: `✅ **${user.tag}** kullanıcısının yasağı kaldırıldı!`, embeds: [], components: [] });
                    collector.stop();
                } catch (e) {
                    await i.reply({ content: 'Unban atarken hata oluştu.', ephemeral: true });
                }
            }
        });

        collector.on('end', async () => {
            // Süre bitince butonu pasif yap
            try {
                const disabledRow = new ActionRowBuilder().addComponents(unbanButton.setDisabled(true));
                await message.edit({ components: [disabledRow] });
            } catch (e) {}
        });
    },
};