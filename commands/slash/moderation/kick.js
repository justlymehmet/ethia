const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Bir kullanıcıyı sunucudan atar.')
        .addUserOption(option =>
            option.setName('kullanıcı')
                .setDescription('Atılacak kullanıcı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('sebep')
                .setDescription('Atılma sebebi')
                .setRequired(false)
        ),

    async execute(interaction) {
        const user = interaction.options.getUser('kullanıcı');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';

        // Botun kendi yetkisini kontrol et (Opsiyonel ama iyi olur)
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return interaction.reply({ content: '❌ Benim insanları atma yetkim yok!', ephemeral: true });
        }

        // Komutu kullananın yetkisi
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            const errorEmbed = new EmbedBuilder()
                .setDescription(`<:false:${process.env.FALSE_EMOJI || '❌'}> _**Yetkiniz bulunmamakta!**_ (Üyeleri At)`)
                .setColor(`#${process.env.HATA || 'FF0000'}`);
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Üyeyi cache'den bulmaya çalış
        let member = interaction.guild.members.cache.get(user.id);
        if (!member) {
            // Cache'de yoksa fetch etmeyi dene
            try {
                member = await interaction.guild.members.fetch(user.id);
            } catch (e) {
                return interaction.reply({ content: 'Kullanıcı sunucuda bulunamadı.', ephemeral: true });
            }
        }

        if (!member.kickable) {
            const errorEmbed = new EmbedBuilder()
                .setDescription(`<:false:${process.env.FALSE_EMOJI || '❌'}> _**Bu kullanıcıyı atamam!**_ (Yetkisi benden yüksek)`)
                .setColor(`#${process.env.HATA || 'FF0000'}`);
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        try {
            await member.kick(reason);
            const successEmbed = new EmbedBuilder()
                .setDescription(`<:true:${process.env.TRUE_EMOJI || '✅'}> _**${user.tag} sunucudan atıldı!** | ${reason}_`)
                .setColor(`#${process.env.BASARILI || '00FF00'}`);
            await interaction.reply({ embeds: [successEmbed] });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Bir hata oluştu.', ephemeral: true });
        }
    },
};