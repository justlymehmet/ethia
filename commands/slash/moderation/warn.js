const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const GuildSettings = require('../../models/GuildSettings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Kullanıcı uyarı sistemi.')
        .addSubcommand(sub =>
            sub.setName('ver')
                .setDescription('Kullanıcıya uyarı verir.')
                .addUserOption(o => o.setName('kullanıcı').setDescription('Kime?').setRequired(true))
                .addStringOption(o => o.setName('sebep').setDescription('Neden?').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('sil')
                .setDescription('Kullanıcının uyarısını siler (1 adet azaltır).')
                .addUserOption(o => o.setName('kullanıcı').setDescription('Kime?').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('liste')
                .setDescription('Kullanıcının uyarılarını gösterir.')
                .addUserOption(o => o.setName('kullanıcı').setDescription('Kimin?').setRequired(true))
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const user = interaction.options.getUser('kullanıcı');
        const reason = interaction.options.getString('sebep') || 'Sebep yok';
        const guildId = interaction.guild.id;

        // 1. Veritabanından Ayarları Çek
        let settings = await GuildSettings.findOne({ guildId: guildId });
        if (!settings) {
            settings = new GuildSettings({ guildId: guildId });
            await settings.save();
        }

        const warnLimit = settings.warnSystem.limit || 3;

        // Kullanıcının uyarı verisini bul (Yoksa undefined döner)
        // Array içinde arama yapıyoruz
        let userWarnData = settings.warnSystem.warnings.find(w => w.userId === user.id);

        // --- WARN VER ---
        if (subcommand === 'ver') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                return interaction.reply({ content: '❌ Yetkiniz yok!', ephemeral: true });
            }

            // Veri yoksa oluştur
            if (!userWarnData) {
                userWarnData = { userId: user.id, count: 0, reasons: [] };
                settings.warnSystem.warnings.push(userWarnData);
                // Push işleminden sonra referansı güncellemek gerekebilir ama 
                // array'in son elemanı olduğu için doğrudan erişebiliriz:
                userWarnData = settings.warnSystem.warnings[settings.warnSystem.warnings.length - 1];
            }

            // Uyarı ekle
            userWarnData.count += 1;
            userWarnData.reasons.push({ 
                moderator: interaction.user.id, 
                reason: reason, 
                date: new Date() 
            });

            await settings.save();

            const currentCount = userWarnData.count;

            // OTO BAN KONTROLÜ
            if (currentCount >= warnLimit && settings.warnSystem.enabled) {
                try {
                    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
                    
                    if (member && member.bannable) {
                        await member.ban({ reason: `Otomatik Ban: ${warnLimit} uyarı limitine ulaştı.` });
                        
                        // Banlayınca uyarıları sıfırla (Array'den filtreleyerek sil)
                        settings.warnSystem.warnings = settings.warnSystem.warnings.filter(w => w.userId !== user.id);
                        await settings.save();

                        const banEmbed = new EmbedBuilder()
                            .setDescription(`<:true:${process.env.TRUE_EMOJI || '✅'}> _**${user.tag} yasaklandı!** (Uyarı Limiti: ${warnLimit})_`)
                            .setColor(`#${process.env.BASARILI || '00FF00'}`);
                        return interaction.reply({ embeds: [banEmbed] });
                    }
                } catch (e) {
                    return interaction.reply({ content: `⚠️ Limit (${currentCount}/${warnLimit}) aşıldı ama kullanıcı banlanamadı (Yetki hatası).`, ephemeral: true });
                }
            }

            const embed = new EmbedBuilder()
                .setDescription(`<:true:${process.env.TRUE_EMOJI || '✅'}> _**${user.tag} uyarıldı!** (${currentCount}/${warnLimit}) | ${reason}_`)
                .setColor(`#${process.env.BASARILI || '00FF00'}`);
            await interaction.reply({ embeds: [embed] });
        }

        // --- WARN SİL ---
        if (subcommand === 'sil') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return interaction.reply({ content: '❌ Yetkiniz yok!', ephemeral: true });

            if (!userWarnData || userWarnData.count <= 0) {
                return interaction.reply({ content: 'Bu kullanıcının zaten uyarısı yok.', ephemeral: true });
            }

            userWarnData.count -= 1;
            userWarnData.reasons.pop(); // Son sebebi siler
            
            // Eğer 0'a düştüyse veriyi tamamen sil (Temizlik)
            if (userWarnData.count <= 0) {
                settings.warnSystem.warnings = settings.warnSystem.warnings.filter(w => w.userId !== user.id);
            }
            
            await settings.save();

            const embed = new EmbedBuilder()
                .setDescription(`<:true:${process.env.TRUE_EMOJI || '✅'}> _**Uyarı silindi!** Kalan: ${userWarnData.count > 0 ? userWarnData.count : 0}_`)
                .setColor(`#${process.env.BASARILI || '00FF00'}`);
            await interaction.reply({ embeds: [embed] });
        }

        // --- WARN LİSTE ---
        if (subcommand === 'liste') {
            if (!userWarnData || userWarnData.count === 0) {
                return interaction.reply({ content: 'Kullanıcının hiç uyarısı yok.', ephemeral: true });
            }

            const reasonList = userWarnData.reasons.map((w, i) => `**${i+1}.** ${w.reason} (<@${w.moderator}>)`).join('\n');

            const embed = new EmbedBuilder()
                .setAuthor({ name: `${user.username} Uyarı Geçmişi`, iconURL: user.displayAvatarURL() })
                .setDescription(`**Toplam:** ${userWarnData.count} / ${warnLimit}\n\n${reasonList}`)
                .setColor('#2B2D31');
            
            await interaction.reply({ embeds: [embed] });
        }
    },
};