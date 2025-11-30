const { 
    SlashCommandBuilder, 
    PermissionsBitField, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    ChannelSelectMenuBuilder,
    ChannelType 
} = require('discord.js');

// MongoDB Modelini Çağırıyoruz
const GuildSettings = require('../../../models/GuildSettings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server-settings')
        .setDescription('Sunucu ayarlarını (Oto-Ban, Hoşgeldin/Görüşürüz, Davet, Buton) yapılandırır.'),

    async execute(interaction) {
        // Yetki Kontrolü
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Bu menüyü sadece **Yöneticiler** kullanabilir.', ephemeral: true });
        }

        const guildId = interaction.guild.id;

        // --- VERİTABANI FONKSİYONU ---
        // Ayarları çeker, yoksa oluşturur
        const getSettings = async () => {
            let settings = await GuildSettings.findOne({ guildId: guildId });
            if (!settings) {
                settings = new GuildSettings({ guildId: guildId });
                await settings.save();
            }
            return settings;
        };

        // --- MENÜ TASARIMLARI ---
        const generateMainMenu = (settings) => {
            const warnStatus = settings.warnSystem.enabled ? '🟢 Açık' : '🔴 Kapalı';
            
            const embed = new EmbedBuilder()
                .setTitle(`⚙️ Kontrol Paneli: ${interaction.guild.name}`)
                .setAuthor({ name: 'Hypatia 𖣂 Sunucu Ayarları', iconURL: interaction.guild.iconURL() }) 
                .setColor('#2B2D31')
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .setDescription('Sunucu sistemlerini yönetmek için aşağıdaki butonları kullanın.')
                .addFields(
                    { name: `🛡️ Oto-Ban (${warnStatus})`, value: `Limit: **${settings.warnSystem.limit}** Uyarı`, inline: true },
                    { name: '👋 Hoşgeldin', value: settings.welcome?.enabled ? '🟢 Aktif' : '🔴 Kapalı', inline: true },
                    { name: '📤 Görüşürüz', value: settings.goodbye?.enabled ? '🟢 Aktif' : '🔴 Kapalı', inline: true }
                )
                .setFooter({ text: 'Ethia Settings v3.4 (MongoDB)', iconURL: interaction.client.user.displayAvatarURL() });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('menu_warn_settings').setLabel('Oto-Ban Ayarları').setStyle(ButtonStyle.Secondary).setEmoji('🛡️'),
                new ButtonBuilder().setCustomId('menu_welcome').setLabel('Hoşgeldin Ayarları').setStyle(ButtonStyle.Success).setEmoji('👋'),
                new ButtonBuilder().setCustomId('menu_goodbye').setLabel('Görüşürüz Ayarları').setStyle(ButtonStyle.Danger).setEmoji('📤')
            );

            return { embeds: [embed], components: [row] };
        };

        const generateWarnMenu = (settings) => {
            const sys = settings.warnSystem;
            const embed = new EmbedBuilder()
                .setTitle('🛡️ Oto-Ban Sistemi')
                .setColor(sys.enabled ? '#43B581' : '#F04747')
                .setDescription(`Kullanıcılar belirli bir uyarı sayısına ulaştığında otomatik banlanır.\n\n**Durum:** ${sys.enabled ? 'Açık' : 'Kapalı'}\n**Limit:** ${sys.limit}`)
                .setFooter({ text: 'Geri dönmek için butonu kullanın.' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('toggle_warn_sys').setLabel(sys.enabled ? 'Sistemi Kapat' : 'Sistemi Aç').setStyle(sys.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
                new ButtonBuilder().setCustomId('set_warn_limit').setLabel('Limiti Değiştir').setStyle(ButtonStyle.Primary).setEmoji('🔢'),
                new ButtonBuilder().setCustomId('back_main').setLabel('Ana Menü').setStyle(ButtonStyle.Secondary).setEmoji('⬅️')
            );

            return { embeds: [embed], components: [row] };
        };

        const generateSystemMenu = (type, settings, showChannelSelect = false) => {
            const sys = settings[type]; 
            const isWelcome = type === 'welcome';
            const title = isWelcome ? '👋 Hoşgeldin Ayarları' : '📤 Görüşürüz Ayarları';
            const color = sys.color || (isWelcome ? '#43B581' : '#F04747');
            
            const messagePreview = sys.message 
                ? (sys.message.length > 50 ? sys.message.substring(0, 50) + '...' : sys.message) 
                : 'Varsayılan Mesaj';

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setColor(color) 
                .setDescription(`Sistemi yapılandırın. Detaylı ayarlar (Renk, Yazar, Buton) için **Gelişmiş Ayarlar**'a tıklayın.`)
                .addFields(
                    { name: 'Durum', value: sys.enabled ? '🟢 **AKTİF**' : '🔴 **KAPALI**', inline: true },
                    { name: 'Embed', value: sys.isEmbed ? '✅ Açık' : '❌ Kapalı', inline: true },
                    { name: 'Kanal', value: sys.channel ? `<#${sys.channel}>` : '⚠️ **Yok**', inline: true },
                    { name: 'Mesaj', value: `\`${messagePreview}\``, inline: false },
                    { name: 'Değişkenler', value: '`{kullanıcı}`, `{isim}`, `{üye_sayısı}`, `{davet_eden}`, `{davet_sayısı}`, `{üye_pp}`' }
                );

            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`toggle_${type}`).setLabel(sys.enabled ? 'Sistemi Kapat' : 'Aktifleştir').setStyle(sys.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`set_channel_btn_${type}`).setLabel('Kanal Değiştir').setStyle(ButtonStyle.Primary).setEmoji('📢'),
                new ButtonBuilder().setCustomId(`set_msg_${type}`).setLabel('Mesaj Düzenle').setStyle(ButtonStyle.Primary).setEmoji('📝')
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`toggle_embed_${type}`).setLabel(sys.isEmbed ? 'Embed Kapat' : 'Embed Yap').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`menu_advanced_${type}`).setLabel('Gelişmiş Ayarlar').setStyle(ButtonStyle.Secondary).setEmoji('🎨'),
                new ButtonBuilder().setCustomId('back_main').setLabel('Geri').setStyle(ButtonStyle.Secondary).setEmoji('⬅️')
            );

            const components = [row1, row2];

            if (showChannelSelect) {
                const channelSelect = new ChannelSelectMenuBuilder()
                    .setCustomId(`select_channel_${type}`)
                    .setPlaceholder('Kanal seçin...')
                    .setChannelTypes(ChannelType.GuildText);
                components.push(new ActionRowBuilder().addComponents(channelSelect));
            }

            return { embeds: [embed], components: components };
        };

        const generateAdvancedMenu = (type, settings) => {
            const sys = settings[type];
            const embed = new EmbedBuilder()
                .setTitle(`🎨 Gelişmiş Ayarlar: ${type === 'welcome' ? 'Hoşgeldin' : 'Görüşürüz'}`)
                .setColor('#2B2D31')
                .setDescription('Embed görünümünü ve ekstra butonları buradan yönetebilirsiniz. \n\n**İpucu:** Resim alanlarına `{üye_pp}` yazarak üyenin profil fotoğrafını dinamik olarak koyabilirsiniz.')
                .addFields(
                    { name: '🎨 Renk', value: sys.color || 'Varsayılan', inline: true },
                    { name: '🖼️ Thumbnail', value: sys.thumbnail ? (sys.thumbnail === '{üye_pp}' ? 'Üye PP' : 'Özel Link') : 'Kapalı', inline: true },
                    { name: '🔗 Link Butonu', value: sys.button?.enabled ? `[${sys.button.label}](${sys.button.url})` : 'Kapalı', inline: false },
                    { name: '✍️ Yazar (Author)', value: sys.author?.name || 'Yok', inline: true }
                );

            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`set_color_${type}`).setLabel('Renk Ayarla').setStyle(ButtonStyle.Primary).setEmoji('🎨'),
                new ButtonBuilder().setCustomId(`set_thumbnail_${type}`).setLabel('Thumbnail Ayarla').setStyle(ButtonStyle.Primary).setEmoji('🖼️'),
                new ButtonBuilder().setCustomId(`set_author_${type}`).setLabel('Yazar (Author) Düzenle').setStyle(ButtonStyle.Primary).setEmoji('✍️')
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`set_linkbtn_${type}`).setLabel('Link Butonu Ekle/Düzenle').setStyle(ButtonStyle.Success).setEmoji('🔗'),
                new ButtonBuilder().setCustomId(`toggle_linkbtn_${type}`).setLabel('Butonu Aç/Kapa').setStyle(sys.button?.enabled ? ButtonStyle.Danger : ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`menu_${type}`).setLabel('Geri Dön').setStyle(ButtonStyle.Secondary).setEmoji('⬅️')
            );

            return { embeds: [embed], components: [row1, row2] };
        };

        // --- ÇALIŞTIRMA ---
        let currentSettings = await getSettings();
        
        // İlk yanıt
        const response = await interaction.reply({ 
            ...generateMainMenu(currentSettings), 
            withResponse: true 
        });
        
        const msg = response.resource ? response.resource.message : await interaction.fetchReply();
        const collector = msg.createMessageComponentCollector({ time: 900000 }); // 15 dakika aktif

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'Bu paneli sadece komutu kullanan yönetebilir.', ephemeral: true });
            }

            try {
                // Veriyi her işlemde tazelemek (Özellikle modal sonrası için)
                // Ancak burada aynı objeyi güncelleyip save edeceğiz
                
                // --- NAVİGASYON ---
                if (i.customId === 'back_main') {
                    await i.update(generateMainMenu(currentSettings));
                }
                else if (i.customId === 'menu_warn_settings') {
                    await i.update(generateWarnMenu(currentSettings));
                }
                else if (['menu_welcome', 'menu_goodbye'].includes(i.customId)) {
                    const type = i.customId.replace('menu_', '');
                    await i.update(generateSystemMenu(type, currentSettings));
                }
                else if (i.customId.startsWith('menu_advanced_')) {
                    const type = i.customId.replace('menu_advanced_', '');
                    await i.update(generateAdvancedMenu(type, currentSettings));
                }

                // --- OTO-BAN İŞLEMLERİ ---
                else if (i.customId === 'toggle_warn_sys') {
                    currentSettings.warnSystem.enabled = !currentSettings.warnSystem.enabled;
                    await currentSettings.save(); // KAYDET
                    await i.update(generateWarnMenu(currentSettings));
                }
                else if (i.customId === 'set_warn_limit') {
                    const modal = new ModalBuilder().setCustomId('modal_warn_limit').setTitle('Oto-Ban Limiti');
                    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input').setLabel('Limit Sayısı').setStyle(TextInputStyle.Short).setValue(currentSettings.warnSystem.limit.toString())));
                    await i.showModal(modal);
                }

                // --- GELİŞMİŞ AYARLAR ---
                else if (i.customId.startsWith('toggle_linkbtn_')) {
                    const type = i.customId.replace('toggle_linkbtn_', '');
                    currentSettings[type].button.enabled = !currentSettings[type].button.enabled;
                    await currentSettings.save(); // KAYDET
                    await i.update(generateAdvancedMenu(type, currentSettings));
                }

                // --- TEMEL AYARLAR ---
                else if (i.customId.startsWith('toggle_embed_')) {
                    const type = i.customId.replace('toggle_embed_', '');
                    currentSettings[type].isEmbed = !currentSettings[type].isEmbed;
                    await currentSettings.save(); // KAYDET
                    await i.update(generateSystemMenu(type, currentSettings));
                }
                else if (i.customId.startsWith('toggle_')) { // toggle_welcome/goodbye
                    const type = i.customId.replace('toggle_', '');
                    currentSettings[type].enabled = !currentSettings[type].enabled;
                    await currentSettings.save(); // KAYDET
                    await i.update(generateSystemMenu(type, currentSettings));
                }

                else if (i.customId.startsWith('set_channel_btn_')) {
                    const type = i.customId.replace('set_channel_btn_', '');
                    await i.update(generateSystemMenu(type, currentSettings, true));
                }
                else if (i.customId.startsWith('select_channel_')) {
                    const type = i.customId.replace('select_channel_', '');
                    currentSettings[type].channel = i.values[0];
                    currentSettings[type].enabled = true;
                    await currentSettings.save(); // KAYDET
                    await i.update(generateSystemMenu(type, currentSettings, false));
                }

                // --- MODALLAR ---
                else if (i.customId.startsWith('set_msg_')) {
                    const type = i.customId.replace('set_msg_', '');
                    const modal = new ModalBuilder().setCustomId(`modal_msg_${type}`).setTitle('Mesaj Düzenle');
                    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input').setLabel('Mesaj').setStyle(TextInputStyle.Paragraph).setValue(currentSettings[type].message || '')));
                    await i.showModal(modal);
                }
                else if (i.customId.startsWith('set_color_')) {
                    const type = i.customId.replace('set_color_', '');
                    const modal = new ModalBuilder().setCustomId(`modal_color_${type}`).setTitle('Embed Rengi');
                    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input').setLabel('HEX Kodu (Örn: #ff0000)').setStyle(TextInputStyle.Short).setValue(currentSettings[type].color || '#ffffff')));
                    await i.showModal(modal);
                }
                else if (i.customId.startsWith('set_thumbnail_')) {
                    const type = i.customId.replace('set_thumbnail_', '');
                    const modal = new ModalBuilder().setCustomId(`modal_thumbnail_${type}`).setTitle('Thumbnail Ayarı');
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('input')
                                .setLabel('URL veya Değişken')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('{üye_pp} veya https://resim.com/resim.png')
                                .setValue(currentSettings[type].thumbnail || '')
                                .setRequired(false) 
                        )
                    );
                    await i.showModal(modal);
                }
                else if (i.customId.startsWith('set_author_')) {
                    const type = i.customId.replace('set_author_', '');
                    const modal = new ModalBuilder().setCustomId(`modal_author_${type}`).setTitle('Yazar (Author) Ayarları');
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel('İsim (Değişken kullanılabilir)').setStyle(TextInputStyle.Short).setRequired(false).setValue(currentSettings[type].author?.name || '')),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('icon').setLabel('Resim URL veya {üye_pp}').setStyle(TextInputStyle.Short).setRequired(false).setValue(currentSettings[type].author?.icon || ''))
                    );
                    await i.showModal(modal);
                }
                else if (i.customId.startsWith('set_linkbtn_')) {
                    const type = i.customId.replace('set_linkbtn_', '');
                    const modal = new ModalBuilder().setCustomId(`modal_linkbtn_${type}`).setTitle('Buton Ayarları');
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('label').setLabel('Buton Yazısı').setStyle(TextInputStyle.Short).setValue(currentSettings[type].button?.label || 'Tıkla')),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('url').setLabel('Link (https://...)').setStyle(TextInputStyle.Short).setValue(currentSettings[type].button?.url || ''))
                    );
                    await i.showModal(modal);
                }
            } catch (error) {
                console.error("Buton Hatası:", error);
                if (!i.replied && !i.deferred) await i.reply({ content: 'Bir hata oluştu.', ephemeral: true });
            }
        });

        // --- MODAL CEVAPLARI ---
        const modalHandler = async (mi) => {
            if (!mi.isModalSubmit() || mi.user.id !== interaction.user.id) return;
            
            try {
                // Modallarda veri değiştiği için anında kaydedip menüyü güncellemeliyiz
                
                if (mi.customId === 'modal_warn_limit') {
                    const val = parseInt(mi.fields.getTextInputValue('input'));
                    if (!isNaN(val)) currentSettings.warnSystem.limit = val;
                    await currentSettings.save();
                    await mi.update(generateWarnMenu(currentSettings));
                }
                else if (mi.customId.startsWith('modal_msg_')) {
                    const type = mi.customId.replace('modal_msg_', '');
                    currentSettings[type].message = mi.fields.getTextInputValue('input');
                    await currentSettings.save();
                    await mi.update(generateSystemMenu(type, currentSettings));
                }
                else if (mi.customId.startsWith('modal_color_')) {
                    const type = mi.customId.replace('modal_color_', '');
                    let color = mi.fields.getTextInputValue('input');
                    if (!color.startsWith('#')) color = `#${color}`;
                    currentSettings[type].color = color;
                    await currentSettings.save();
                    await mi.update(generateAdvancedMenu(type, currentSettings));
                }
                else if (mi.customId.startsWith('modal_thumbnail_')) {
                    const type = mi.customId.replace('modal_thumbnail_', '');
                    const val = mi.fields.getTextInputValue('input');
                    currentSettings[type].thumbnail = val || null; 
                    await currentSettings.save();
                    await mi.update(generateAdvancedMenu(type, currentSettings));
                }
                else if (mi.customId.startsWith('modal_author_')) {
                    const type = mi.customId.replace('modal_author_', '');
                    currentSettings[type].author = {
                        name: mi.fields.getTextInputValue('name'),
                        icon: mi.fields.getTextInputValue('icon')
                    };
                    await currentSettings.save();
                    await mi.update(generateAdvancedMenu(type, currentSettings));
                }
                else if (mi.customId.startsWith('modal_linkbtn_')) {
                    const type = mi.customId.replace('modal_linkbtn_', '');
                    currentSettings[type].button = {
                        enabled: true,
                        label: mi.fields.getTextInputValue('label'),
                        url: mi.fields.getTextInputValue('url')
                    };
                    await currentSettings.save();
                    await mi.update(generateAdvancedMenu(type, currentSettings));
                }
            } catch (error) {
                console.error("Modal Hatası:", error);
                if (!mi.replied && !mi.deferred) await mi.reply({ content: 'Ayarlar kaydedilirken hata oluştu.', ephemeral: true });
            }
        };

        interaction.client.on('interactionCreate', modalHandler);
        
        collector.on('end', () => {
            msg.edit({ components: [] }).catch(() => {});
            interaction.client.removeListener('interactionCreate', modalHandler);
        });
    },

};
