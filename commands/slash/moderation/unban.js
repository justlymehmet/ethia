const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Sunucudan banlanmış bir kullanıcıyı açar.')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('Unban yapmak istediğiniz kullanıcı ID\'si')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('sebep')
                .setDescription('Unban sebebi')
                .setRequired(false)
        ),

    async execute(interaction) {
        const userId = interaction.options.getString('id');
        const unbanReason = interaction.options.getString('sebep') || "Sebep belirtilmedi";

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({ content: '❌ Yetkiniz yok!', ephemeral: true });
        }

        try {
            // Önce bu kişinin gerçekten banlı olup olmadığını kontrol et
            let bannedUser;
            try {
                bannedUser = await interaction.guild.bans.fetch(userId);
            } catch (e) {
                // Fetch hata verirse kullanıcı banlı değildir veya ID yanlıştır
                return interaction.reply({ content: '❌ Bu ID\'ye sahip banlanmış bir kullanıcı bulunamadı.', ephemeral: true });
            }

            await interaction.guild.members.unban(userId, unbanReason);

            const successEmbed = new EmbedBuilder()
                .setDescription(`<:true:${process.env.TRUE_EMOJI || '✅'}> _**${bannedUser.user.tag} banı kaldırıldı!** | ${unbanReason}_`)
                .setColor(`#${process.env.BASARILI || '00FF00'}`);

            await interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Unban işlemi sırasında bir hata oluştu.', ephemeral: true });
        }
    },
};