const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType } = require('discord.js');
const UserEconomy = require('../../models/UserEconomy');

// --- EMOJİLER ---
const EMOJIS = {
    GEM1: '<a:gem1:1444659894098591744>', 
    GEM2: '<a:gem2:1444659918761365554>', 
    GEM3: '<a:gem3:1444659939690811514>', 
    GEM4: '<a:gem4:1444659962390384811>', 
    GEM5: '<a:gem5:1444659982351073320>', 
    GEM6: '<a:gem6:1444659998046027906>'  
};

// --- MARKET ÜRÜNLERİ ---
const SHOP_ITEMS = [
    { id: 1, name: "Sapan", price: 500, emoji: "🪃", type: 'weapon', tier: 1, desc: "Başlangıç silahı." },
    { id: 2, name: "Yay", price: 2500, emoji: "🏹", type: 'weapon', tier: 2, desc: "Sessiz avcı yayı." },
    { id: 3, name: "Tüfek", price: 10000, emoji: "🔫", type: 'weapon', tier: 3, desc: "Yüksek hasar gücü." },
    { id: 4, name: "Keskin Nişancı", price: 50000, emoji: "🔭", type: 'weapon', tier: 4, desc: "Uzak mesafe, kesin sonuç." },
    { id: 5, name: "Lazer Kılıcı", price: 150000, emoji: "⚔️", type: 'weapon', tier: 5, desc: "Geleceğin teknolojisi. Çok güçlü." },
    { id: 6, name: "Plazma Topu", price: 500000, emoji: "💠", type: 'weapon', tier: 6, desc: "Yok edici güç. Efsanevi avcılar için." },
    { id: 10, name: "Pembe Elmas", price: 1000, emoji: EMOJIS.GEM1, type: 'gem', category: 'diamond', tier: 1, durability: 10, desc: "Şans +%5 (10 Av)" },
    { id: 11, name: "Mavi Elmas", price: 5000, emoji: EMOJIS.GEM2, type: 'gem', category: 'diamond', tier: 2, durability: 25, desc: "Şans +%15 (25 Av)" },
    { id: 12, name: "Gri Elmas", price: 20000, emoji: EMOJIS.GEM3, type: 'gem', category: 'diamond', tier: 3, durability: 60, desc: "Şans +%30 (60 Av)" },
    { id: 20, name: "Beyaz Kalp", price: 1500, emoji: EMOJIS.GEM4, type: 'gem', category: 'heart', tier: 1, durability: 15, desc: "XP +%10 (15 Av)" },
    { id: 21, name: "Pembe Kalp", price: 7000, emoji: EMOJIS.GEM5, type: 'gem', category: 'heart', tier: 2, durability: 35, desc: "XP +%25 (35 Av)" },
    { id: 22, name: "Mavi Kalp", price: 25000, emoji: EMOJIS.GEM6, type: 'gem', category: 'heart', tier: 3, durability: 80, desc: "XP +%50 (80 Av)" }
];

module.exports = {
    name: 'shop',
    aliases: ['market', 'buy'],
    description: 'Silahlar ve Gemler satın alırsın.',

    async execute(message, args, client) {
        const userId = message.author.id;
        const action = args[0] ? args[0].toLowerCase() : null;

        // 1. Veriyi Çek
        let userData = await UserEconomy.findOne({ userId: userId });
        
        if (!userData) {
            const warningEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`🚫 **${message.author.username}**, henüz bir hesabın yok!\n\nLütfen önce **et money** yazarak hesap oluştur.`);
            return message.reply({ embeds: [warningEmbed] });
        }

        // --- MANUEL SATIN ALMA ---
        if (action === 'buy' || action === 'al') {
            const itemId = parseInt(args[1]);
            const item = SHOP_ITEMS.find(i => i.id === itemId);
            if (!item) return message.reply('❌ Geçersiz ID.');
            await buyItem(message, userData, item);
            return;
        }

        // --- EMBED ---
        const generateEmbed = (currentBalance) => {
            return new EmbedBuilder()
                .setTitle('🛒 Silah ve Mühimmat Marketi')
                .setDescription(`Daha güçlü silahlar = Savaşta daha fazla güç!\n**Bakiyen:** ${currentBalance.toLocaleString()} ET`)
                .setColor('#2F3136')
                .addFields(
                    { name: '⚔️ Silahlar', value: SHOP_ITEMS.filter(i => i.type === 'weapon').map(i => `\`ID:${i.id}\` ${i.emoji} **${i.name}** - ${i.price.toLocaleString()} ET`).join('\n'), inline: true },
                    { name: '💎 Gemler', value: SHOP_ITEMS.filter(i => i.type === 'gem').map(i => `\`ID:${i.id}\` ${i.emoji} **${i.name}** - ${i.price.toLocaleString()} ET`).join('\n'), inline: true }
                );
        };

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('shop_menu')
            .setPlaceholder('Satın almak için seç...');

        SHOP_ITEMS.forEach(item => {
            selectMenu.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(`${item.name}`)
                    .setDescription(`${item.price} ET - ${item.desc}`)
                    .setValue(item.id.toString())
                    .setEmoji(item.emoji)
            );
        });

        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const replyMsg = await message.reply({ 
            embeds: [generateEmbed(userData.balance)], 
            components: [row] 
        });

        const collector = replyMsg.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== userId) return i.reply({ content: 'Bu menü senin değil.', ephemeral: true });
            
            const rawItem = SHOP_ITEMS.find(it => it.id === parseInt(i.values[0]));
            
            // Veriyi taze çek
            userData = await UserEconomy.findOne({ userId: userId });

            if (userData.balance < rawItem.price) {
                return i.reply({ content: `❌ Paran yetmiyor!`, ephemeral: true });
            }

            // --- CRITICAL FIX: NESNEYİ TEMİZLE ---
            // Mongoose bazen referansları sevmez, yeni temiz bir obje oluşturalım.
            const itemToSave = {
                id: rawItem.id,
                name: rawItem.name,
                emoji: rawItem.emoji,
                type: rawItem.type,
                price: rawItem.price,
                desc: rawItem.desc,
                // Eğer varsa bunları da ekle
                tier: rawItem.tier || undefined,
                category: rawItem.category || undefined,
                durability: rawItem.durability || undefined
            };

            // Satın Alma
            userData.balance -= rawItem.price;
            
            if (rawItem.type === 'weapon') {
                // Silah zaten var mı?
                if (userData.weapons.find(w => w.id === rawItem.id)) {
                    userData.balance += rawItem.price; // İade
                    return i.reply({ content: `🎒 Buna zaten sahipsin!`, ephemeral: true });
                }
                userData.weapons.push(itemToSave);
            } else {
                // Envantere ekle
                userData.inventory.push(itemToSave);
            }

            await userData.save();
            
            await i.reply({ content: `✅ **${rawItem.name}** satın alındı!`, ephemeral: true });

            await replyMsg.edit({ 
                embeds: [generateEmbed(userData.balance)] 
            });
        });
    },
};

// Manuel satın alma fonksiyonu
async function buyItem(message, userData, rawItem) {
    if (userData.balance < rawItem.price) return message.reply('❌ Yetersiz bakiye.');
    
    // Temiz Obje Oluşturma (Fix)
    const itemToSave = {
        id: rawItem.id,
        name: rawItem.name,
        emoji: rawItem.emoji,
        type: rawItem.type,
        price: rawItem.price,
        desc: rawItem.desc,
        tier: rawItem.tier || undefined,
        category: rawItem.category || undefined,
        durability: rawItem.durability || undefined
    };

    userData.balance -= rawItem.price;
    
    if (rawItem.type === 'weapon') {
        if (userData.weapons.find(w => w.id === rawItem.id)) {
            userData.balance += rawItem.price;
            return message.reply('🎒 Zaten sende var.');
        }
        userData.weapons.push(itemToSave);
    } else {
        userData.inventory.push(itemToSave);
    }

    await userData.save();
    message.reply(`✅ **${rawItem.name}** alındı.`);
}
