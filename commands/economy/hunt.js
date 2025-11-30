const UserEconomy = require('../../models/UserEconomy');

// --- GENİŞLETİLMİŞ HAYVAN LİSTESİ ---
const ANIMALS = [
    // Rarity 1 (Yaygın)
    { id: 1, name: 'Arı', emoji: '🐝', xp: 2, price: 5, rarity: 1 },
    { id: 2, name: 'Tırtıl', emoji: '🐛', xp: 3, price: 8, rarity: 1 },
    { id: 3, name: 'Kelebek', emoji: '🦋', xp: 4, price: 12, rarity: 1 },
    { id: 4, name: 'Tavşan', emoji: '🐇', xp: 5, price: 15, rarity: 1 },
    { id: 5, name: 'İnek', emoji: '🐄', xp: 8, price: 25, rarity: 1 },
    // Rarity 2 (Nadir)
    { id: 6, name: 'Tilki', emoji: '🦊', xp: 25, price: 75, rarity: 2 },
    { id: 7, name: 'Kurt', emoji: '🐺', xp: 35, price: 100, rarity: 2 },
    { id: 8, name: 'Yılan', emoji: '🐍', xp: 40, price: 120, rarity: 2 },
    // Rarity 3 (Epik)
    { id: 9, name: 'Ayı', emoji: '🐻', xp: 75, price: 300, rarity: 3 },
    { id: 10, name: 'Panda', emoji: '🐼', xp: 100, price: 450, rarity: 3 },
    { id: 11, name: 'Aslan', emoji: '🦁', xp: 150, price: 600, rarity: 3 },
    { id: 12, name: 'Köpekbalığı', emoji: '🦈', xp: 200, price: 800, rarity: 3 },
    // Rarity 4 (Efsanevi)
    { id: 13, name: 'T-Rex', emoji: '🦖', xp: 400, price: 1500, rarity: 4 },
    { id: 14, name: 'Ejderha', emoji: '🐉', xp: 500, price: 2000, rarity: 4 },
    // Rarity 5 (Mistik)
    { id: 15, name: 'Anka Kuşu', emoji: '🦅', xp: 1000, price: 5000, rarity: 5 }
];

module.exports = {
    name: 'hunt',
    aliases: ['av', 'ethunt'],
    description: 'Avlanırsın.',

    async execute(message, args, client) {
        const userId = message.author.id;
        const username = message.author.username;
        const cooldown = 3000;

        // 1. VERİYİ MONGODB'DEN ÇEK
        let userData = await UserEconomy.findOne({ userId: userId });
        
        // Hesap Kontrolü
        if (!userData) {
            return message.reply(`<:false:${process.env.FALSE_EMOJI || '❌'}> Hesap yok. **et money** yaz.`);
        }

        // 2. COOLDOWN KONTROLÜ
        const lastHunt = userData.lastHunt || 0;
        const expirationTime = lastHunt + cooldown;
        
        if (Date.now() < expirationTime) {
            const unixTime = Math.floor(expirationTime / 1000);
            const msg = await message.reply(`⏳ **${username}**, biraz bekle! <t:${unixTime}:R> tekrar avlanabilirsin.`);
            setTimeout(() => msg.delete().catch(() => {}), expirationTime - Date.now());
            return;
        }

        // 3. SİLAH VE GEM KONTROLLERİ
        if (!userData.weapons || userData.weapons.length === 0) return message.reply('❌ Silahın yok!');
        
        const activeGems = userData.activeGems || {};
        if (!activeGems.diamond && !activeGems.heart) return message.reply(`<:false:${process.env.FALSE_EMOJI || '❌'}> Gem takılı değil!`);

        // En iyi silahı bul
        const bestWeapon = userData.weapons.reduce((prev, curr) => (prev.tier > curr.tier) ? prev : curr);
        let totalTier = bestWeapon.tier;
        
        if (activeGems.diamond) totalTier += activeGems.diamond.tier;
        if (activeGems.heart) totalTier += activeGems.heart.tier;

        // 4. AVLANMA MEKANİĞİ
        // Çoklu avlanma şansı (Yüksek tier ile artar)
        let catchCount = 1;
        if (Math.random() + (totalTier * 0.08) > 1.4) catchCount = 2;
        if (Math.random() + (totalTier * 0.08) > 2.0) catchCount = 3;

        let foundString = "";
        let totalXp = 0;

        // Hayvanları Ekleme
        for (let i = 0; i < catchCount; i++) {
            // Şans formülü
            const maxRarity = Math.ceil(totalTier / 1.5) + 1;
            const possible = ANIMALS.filter(a => a.rarity <= maxRarity);
            const caught = possible[Math.floor(Math.random() * possible.length)];
            
            // MongoDB Map kullanımı (.get ve .set)
            let currentCount = userData.animals.get(caught.id.toString()) || 0;
            userData.animals.set(caught.id.toString(), currentCount + 1);
            
            totalXp += caught.xp;
            foundString += `${caught.emoji} `;
        }

        // XP Ekleme
        // Schema'da huntingXp yoksa eklemeyebilir, ama varsa günceller.
        // Eğer model dosyanda huntingXp yoksa, burası çalışmaz ama hata da vermez.
        // Genelde XP'yi balance'a veya ayrı bir XP sistemine ekleyebilirsin. 
        // Burada mevcut mantığı korumak için huntingXp varsa arttırıyoruz.
        if (userData.huntingXp !== undefined) {
             userData.huntingXp += totalXp;
        }

        // 5. KUTU VE CHECKLIST
        const todayGlobal = new Date().toISOString().split('T')[0];
        
        // Checklist Tarih Kontrolü
        if (userData.checklist.date !== todayGlobal) {
            userData.checklist = { 
                date: todayGlobal, 
                lootbox: 0, 
                weaponbox: 0, 
                cookie: false, 
                completed: false 
            };
        }

        let lootboxMsg = "";

        // Lootbox Şansı
        if (Math.random() < 0.15) { 
            userData.inventory.push({ id: 99, name: "Lootbox", emoji: "🎁", type: "box" });
            userData.checklist.lootbox += 1;
            lootboxMsg += `\n📦 | Bir **Lootbox** buldun!`;
        }
        // Weaponbox Şansı
        if (Math.random() < 0.05) { 
            userData.inventory.push({ id: 100, name: "Weaponbox", emoji: "🧰", type: "box" });
            userData.checklist.weaponbox += 1;
            lootboxMsg += `\n🧰 | İnanılmaz! Bir **Weaponbox** buldun!`;
        }

        // 6. GEM DAYANIKLILIĞI
        let gemStatusMsg = "";
        let gemBrokenMsg = "";
        const formatEmoji = (emojiStr) => emojiStr.replace('<:', '<a:');
        let gemUpdated = false;

        if (activeGems.diamond) {
            activeGems.diamond.currentDurability -= 1;
            gemStatusMsg += `${formatEmoji(activeGems.diamond.emoji)} \`[${activeGems.diamond.currentDurability}/${activeGems.diamond.maxDurability}]\` `;
            
            if (activeGems.diamond.currentDurability <= 0) {
                gemBrokenMsg += `\n🚫 | **${activeGems.diamond.name}** parçalandı!`;
                userData.activeGems.diamond = null; // Gem'i sil
            }
            gemUpdated = true;
        }

        if (activeGems.heart) {
            activeGems.heart.currentDurability -= 1;
            gemStatusMsg += `${formatEmoji(activeGems.heart.emoji)} \`[${activeGems.heart.currentDurability}/${activeGems.heart.maxDurability}]\` `;
            
            if (activeGems.heart.currentDurability <= 0) {
                gemBrokenMsg += `\n🚫 | **${activeGems.heart.name}** parçalandı!`;
                userData.activeGems.heart = null; // Gem'i sil
            }
            gemUpdated = true;
        }

        // Obje içindeki değişiklikleri Mongoose'a bildir
        if (gemUpdated) {
            userData.markModified('activeGems');
        }
        
        // Son avlanma tarihini güncelle
        userData.lastHunt = Date.now();

        // 7. VERİLERİ KAYDET
        await userData.save();

        // 8. MESAJI GÖNDER
        const blankEmoji = process.env.BLANK ? `<:blank:${process.env.BLANK}>` : "⬛"; 
        const header = `<:hunt:1444660021324550234> | **${username}**, ${gemStatusMsg}ile geliştirildi!`;
        
        message.reply(`${header}\n${blankEmoji} | ${foundString} avladın.\n${blankEmoji} | **${totalXp}XP** kazandın!${lootboxMsg}${gemBrokenMsg}`);
    },
};