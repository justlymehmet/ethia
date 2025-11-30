const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Kanalın yavaş mod süresini ayarlar.')
        .addIntegerOption(option =>
            option.setName('saniye')
                .setDescription('Kaç saniye olsun? (0 kapatır)')
                .setMinValue(0)
                .setMaxValue(21600) // 6 Saat
                .setRequired(true)
        ),

    async execute(interaction) {
        const seconds = interaction.options.getInteger('saniye');

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Yetkiniz yok!', ephemeral: true });
        }

        try {
            await interaction.channel.setRateLimitPerUser(seconds);

            const text = seconds === 0 ? 'Yavaş mod kapatıldı.' : `Yavaş mod **${seconds} saniye** olarak ayarlandı.`;

            const successEmbed = new EmbedBuilder()
                .setDescription(`<:true:${process.env.TRUE_EMOJI || '✅'}> _**${text}**_`)
                .setColor(`#${process.env.BASARILI || '00FF00'}`);

            await interaction.reply({ embeds: [successEmbed] });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Yavaş mod ayarlanırken bir hata oluştu.', ephemeral: true });
        }
    },
};