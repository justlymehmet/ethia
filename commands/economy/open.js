const { EmbedBuilder } = require('discord.js');
const UserEconomy = require('../../models/UserEconomy');

// --- EMOJI DEFINITIONS (Standardized) ---
const EMOJIS = {
    GEM1: '<a:gem1:1444659894098591744>', // Pink Diamond
    GEM2: '<a:gem2:1444659918761365554>', // Blue Diamond
    GEM3: '<a:gem3:1444659939690811514>', // Grey Diamond
    GEM4: '<a:gem4:1444659962390384811>', // White Heart
    GEM5: '<a:gem5:1444659982351073320>', // Pink Heart
    GEM6: '<a:gem6:1444659998046027906>', // Blue Heart
    LOOTBOX: '🎁',
    WEAPONBOX: '🧰'
};

// --- LOOT POOLS ---
const GEM_POOL = [
    { id: 10, name: "Pembe Elmas", emoji: EMOJIS.GEM1, type: 'gem', category: 'diamond', tier: 1, durability: 10 },
    { id: 11, name: "Mavi Elmas", emoji: EMOJIS.GEM2, type: 'gem', category: 'diamond', tier: 2, durability: 25 },
    { id: 12, name: "Gri Elmas", emoji: EMOJIS.GEM3, type: 'gem', category: 'diamond', tier: 3, durability: 60 },
    { id: 20, name: "Beyaz Kalp", emoji: EMOJIS.GEM4, type: 'gem', category: 'heart', tier: 1, durability: 15 },
    { id: 21, name: "Pembe Kalp", emoji: EMOJIS.GEM5, type: 'gem', category: 'heart', tier: 2, durability: 35 },
    { id: 22, name: "Mavi Kalp", emoji: EMOJIS.GEM6, type: 'gem', category: 'heart', tier: 3, durability: 80 }
];

const WEAPON_POOL = [
    { id: 2, name: "Yay", price: 2500, emoji: "🏹", type: 'weapon', tier: 2 },
    { id: 3, name: "Tüfek", price: 10000, emoji: "🔫", type: 'weapon', tier: 3 },
    { id: 4, name: "Keskin Nişancı", price: 50000, emoji: "🔭", type: 'weapon', tier: 4 },
    { id: 5, name: "Lazer Kılıcı", price: 150000, emoji: "⚔️", type: 'weapon', tier: 5 },
    { id: 6, name: "Plazma Topu", price: 500000, emoji: "💠", type: 'weapon', tier: 6 }
];

module.exports = {
    name: 'open',
    aliases: ['ac', 'aç'],
    description: 'Lootbox veya Weaponbox açar. (et open <id> <miktar>)',

    async execute(message, args, client) {
        const userId = message.author.id;
        const boxId = parseInt(args[0]); // 99 or 100
        let amountArg = args[1] ? args[1].toLowerCase() : '1';

        if (isNaN(boxId)) return message.reply('❌ Hangi kutuyu açacaksın? ID gir. (Lootbox: 99, Weaponbox: 100)\nÖrn: `et open 99 all`');

        // 1. Veriyi MongoDB'den Çek
        let userData = await UserEconomy.findOne({ userId: userId });

        // Hesap Kontrolü
        if (!userData) {
            const warningEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`<:false:${process.env.FALSE_EMOJI || '❌'}> **${message.author}**, henüz bir hesabın yok!\nLütfen önce **et money** yazarak hesap oluştur.`);
            return message.reply({ embeds: [warningEmbed] });
        }

        if (!userData.inventory || userData.inventory.length === 0) return message.reply('🎒 Çantan boş!');

        // Kutuları bul
        const userBoxes = userData.inventory.filter(i => i.id === boxId);
        const ownedCount = userBoxes.length;

        if (ownedCount === 0) return message.reply('❌ Bu kutudan hiç yok!');

        // Adet belirleme
        let openCount = 1;
        if (amountArg === 'all' || amountArg === 'hepsi') {
            openCount = Math.min(ownedCount, 20); // Max 20 limit
        } else {
            openCount = parseInt(amountArg);
            if (isNaN(openCount) || openCount < 1) openCount = 1;
            if (openCount > 20) {
                openCount = 20;
                message.channel.send('⚠️ Güvenlik nedeniyle tek seferde en fazla 20 kutu açabilirsin.');
            }
            if (openCount > ownedCount) openCount = ownedCount;
        }

        // --- AÇMA DÖNGÜSÜ ---
        let log = [];
        let totalRefund = 0;
        let removed = 0;

        // 1. Kutuları Envanterden Sil
        // MongoDB array'inden tersten silmek daha güvenlidir index kaymaması için
        for (let i = userData.inventory.length - 1; i >= 0; i--) {
            if (removed >= openCount) break;
            if (userData.inventory[i].id === boxId) {
                userData.inventory.splice(i, 1);
                removed++;
            }
        }

        // 2. Ödülleri Dağıt
        for (let i = 0; i < openCount; i++) {
            
            // --- LOOTBOX (ID 99) ---
            if (boxId === 99) {
                const reward = GEM_POOL[Math.floor(Math.random() * GEM_POOL.length)];
                userData.inventory.push(reward); 
                log.push(`${reward.emoji} ${reward.name}`);
            } 
            
            // --- WEAPONBOX (ID 100) ---
            else if (boxId === 100) {
                const reward = WEAPON_POOL[Math.floor(Math.random() * WEAPON_POOL.length)];
                
                const hasWeapon = userData.weapons.find(w => w.id === reward.id);

                if (hasWeapon) {
                    const refund = Math.floor(reward.price / 2); // %50 İade
                    totalRefund += refund;
                    log.push(`♻️ ${reward.name} (İade: ${refund} ET)`);
                } else {
                    userData.weapons.push(reward);
                    log.push(`🔫 **${reward.name}**`);
                }
            }
        }

        if (totalRefund > 0) userData.balance += totalRefund;

        // Array değiştiğini bildir ve kaydet
        userData.markModified('inventory');
        userData.markModified('weapons');
        await userData.save();

        // Sonuç Mesajı
        const counts = {};
        log.forEach(x => { counts[x] = (counts[x] || 0) + 1; });
        
        const resultString = Object.entries(counts)
            .map(([name, count]) => count > 1 ? `${name} x${count}` : name)
            .join('\n');

        const boxName = boxId === 99 ? "Lootbox" : "Weaponbox";
        message.reply(`📦 **${openCount} adet ${boxName}** açıldı!\n\n${resultString}`);
    },
};