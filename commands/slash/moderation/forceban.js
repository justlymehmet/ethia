const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('forceban')
        .setDescription('Sunucuda olmayan bir kullanıcıyı ID ile banlar.')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('Banlanacak kullanıcının ID\'si')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('sebep')
                .setDescription('Ban sebebi')
                .setRequired(false)
        ),

    async execute(interaction) {
        const userId = interaction.options.getString('id');
        const reason = interaction.options.getString('sebep') || 'Forceban: Sebep belirtilmedi';

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({ content: '❌ Yetkiniz yok!', ephemeral: true });
        }

        try {
            // ID üzerinden banlama
            await interaction.guild.members.ban(userId, { reason: reason });

            const successEmbed = new EmbedBuilder()
                .setDescription(`<:true:${process.env.TRUE_EMOJI || '✅'}> _**${userId} ID'li kullanıcı yargılandı!** | ${reason}_`)
                .setColor(`#${process.env.BASARILI || '00FF00'}`);

            await interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setDescription(`<:false:${process.env.FALSE_EMOJI || '❌'}> _**Hata oluştu!** Geçersiz ID veya yetersiz yetki._`)
                .setColor(`#${process.env.HATA || 'FF0000'}`);
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};