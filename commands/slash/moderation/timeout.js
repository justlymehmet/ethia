const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Bir kullanıcıya butonlarla süre seçerek zamanaşımı uygular.')
        .addUserOption(option =>
            option.setName('kullanıcı')
                .setDescription('Zamanaşımı uygulamak istediğiniz kullanıcı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('sebep')
                .setDescription('Zamanaşımı sebebi nedir?')
                .setRequired(false)
        ),

    async execute(interaction) {
        const user = interaction.options.getUser('kullanıcı');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ content: '❌ Yetkiniz yok!', ephemeral: true });
        }

        // --- KULLANICI KONTROLÜ ---
        let member;
        try {
            member = await interaction.guild.members.fetch(user.id);
        } catch (e) {
            return interaction.reply({ content: 'Kullanıcı sunucuda bulunamadı!', ephemeral: true });
        }

        if (!member.manageable) {
            return interaction.reply({ content: '❌ Bu kullanıcıya işlem yapamam! (Yetkisi benden yüksek olabilir)', ephemeral: true });
        }

        if (member.id === interaction.user.id) {
            return interaction.reply({ content: 'Kendine zamanaşımı uygulayamazsın.', ephemeral: true });
        }

        // --- SÜRE SEÇİM BUTONLARI ---
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('60000').setLabel('1 Dakika').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('300000').setLabel('5 Dakika').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('3600000').setLabel('1 Saat').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('86400000').setLabel('1 Gün').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('604800000').setLabel('1 Hafta').setStyle(ButtonStyle.Primary),
            );
        
        const cancelRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('cancel').setLabel('İptal').setStyle(ButtonStyle.Secondary).setEmoji('✖️')
            );

        const selectionEmbed = new EmbedBuilder()
            .setColor('#2B2D31') // Nötr renk
            .setAuthor({ name: `${user.username} için süre seçin`, iconURL: user.displayAvatarURL() })
            .setDescription(`**Sebep:** ${reason}\n\nLütfen aşağıdan bir zamanaşımı süresi seçin.`);

        // Mesajı gönder ve cevap bekle
        const response = await interaction.reply({ 
            embeds: [selectionEmbed], 
            components: [row, cancelRow], 
            fetchReply: true ,
            ephemeral: true
        });

        // --- COLLECTOR (BUTON DİNLEYİCİ) ---
        const filter = i => i.user.id === interaction.user.id;
        const collector = response.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 30000 });

        collector.on('collect', async i => {
            if (i.customId === 'cancel') {
                await i.update({ content: 'İşlem iptal edildi.', embeds: [], components: [] });
                return collector.stop();
            }

            // Seçilen süre (milisaniye cinsinden)
            const duration = parseInt(i.customId);
            const durationText = i.component.label; 

            try {
                // --- TIMEOUT UYGULA ---
                await member.timeout(duration, reason);

                const successEmbed = new EmbedBuilder()
                    .setDescription(`<:true:${process.env.TRUE_EMOJI || '✅'}> _**${user.tag} susturuldu!** (${durationText}) | ${reason}_`)
                    .setColor(`#${process.env.BASARILI || '00FF00'}`);

                const removeButton = new ButtonBuilder()
                    .setCustomId('remove_timeout')
                    .setLabel('Zamanaşımını Kaldır')
                    .setStyle(ButtonStyle.Danger);

                const removeRow = new ActionRowBuilder().addComponents(removeButton);

                await i.update({ embeds: [successEmbed], components: [removeRow] });
                
                // Alt toplayıcı (Timeout kaldırmak için)
                const removeCollector = response.createMessageComponentCollector({ 
                    filter, 
                    componentType: ComponentType.Button, 
                    time: 60000
                });

                removeCollector.on('collect', async subI => {
                    if (subI.customId === 'remove_timeout') {
                        // Timeout kaldır (null göndererek)
                        try {
                            await member.timeout(null, 'Buton ile kaldırıldı');
                            
                            await subI.update({ 
                                content: `<:true:${process.env.TRUE_EMOJI || '✅'}> **${user.tag}** kullanıcısının zamanaşımı kaldırıldı!`, 
                                embeds: [], 
                                components: [] 
                            });
                            removeCollector.stop();
                        } catch (err) {
                            await subI.reply({ content: 'Kaldırırken hata oluştu.', ephemeral: true });
                        }
                    }
                });

                removeCollector.on('end', async () => {
                    try {
                        const disabledRow = new ActionRowBuilder().addComponents(removeButton.setDisabled(true));
                        await interaction.editReply({ components: [disabledRow] });
                    } catch (e) {}
                });

                collector.stop(); // İlk seçiciyi durdur

            } catch (error) {
                console.error(error);
                await i.reply({ content: `Hata oluştu: ${error.message}`, ephemeral: true });
            }
        });
    },
};