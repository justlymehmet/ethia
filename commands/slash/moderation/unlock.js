const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Kanalın mesaj kilidini açar.'),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Yetkiniz yok!', ephemeral: true });
        }

        const channel = interaction.channel;

        try {
            await channel.permissionOverwrites.edit(interaction.guild.id, {
                SendMessages: true
            });

            const successEmbed = new EmbedBuilder()
                .setDescription(`<:true:${process.env.TRUE_EMOJI || '✅'}> _**Kanal kilidi açıldı!**_`)
                .setColor(`#${process.env.BASARILI || '00FF00'}`);

            await interaction.reply({ embeds: [successEmbed] });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Kanal kilidi açılırken bir hata oluştu.', ephemeral: true });
        }
    },
};