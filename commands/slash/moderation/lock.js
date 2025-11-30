const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Kanalı mesaj gönderimine kapatır.'),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: 'Yetkiniz yok!', ephemeral: true });
        }

        const channel = interaction.channel;

        try {
            await channel.permissionOverwrites.edit(interaction.guild.id, {
                SendMessages: false
            });

            const successEmbed = new EmbedBuilder()
                .setDescription(`<:true:${process.env.TRUE_EMOJI || '✅'}> _**Kanal kilitlendi!**_`)
                .setColor(`#${process.env.BASARILI || '00FF00'}`);

            await interaction.reply({ embeds: [successEmbed] });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Kanal kilitlenirken bir hata oluştu (Yetkim yetmiyor olabilir).', ephemeral: true });
        }
    },
};