const UserEconomy = require('../../models/UserEconomy');

// Kutu İçerikleri
const LOOT_REWARDS = [500, 1000, 2000, 'gem']; 
const WEAPON_REWARDS = [2, 3]; // Silah ID'leri (Yay, Tüfek)

module.exports = {
    name: 'use',
    aliases: ['tak', 'equip', 'ac'],
    description: 'Eşya kullanır veya kutu açar. (et use <id>)',

    async execute(message, args, client) {
        const userId = message.author.id;
        const itemId = parseInt(args[0]);

        if (!itemId) return message.reply('❌ ID gir. Örn: `et use 99`');

        // 1. Veriyi MongoDB'den Çek
        let userData = await UserEconomy.findOne({ userId: userId });

        if (!userData) return message.reply('❌ Önce hesap oluştur.');

        // Envanter ve Silah listelerini hazırla
        // (MongoDB'den gelen veriyi kullanıyoruz)
        const inventory = userData.inventory || [];
        const weapons = userData.weapons || [];

        // 1. ÖNCE SİLAHLARI KONTROL ET
        const weaponCheck = weapons.find(w => w.id === itemId);
        if (weaponCheck) {
            return message.reply(`⚔️ **${weaponCheck.name}** zaten sahip olduğun bir silah!\nSilahlar **otomatik** olarak kuşanılır. Avlanırken veya savaşırken en güçlü silahın devreye girer.`);
        }

        // 2. ENVANTERİ KONTROL ET
        const itemIndex = inventory.findIndex(i => i.id === itemId);
        
        if (itemIndex === -1) {
            return message.reply('❌ Bu eşyaya (Gem, Kutu veya Silah) sahip değilsin.');
        }

        const item = inventory[itemIndex];

        // === KUTU AÇMA MANTIĞI ===
        if (item.type === 'box') {
            // MongoDB Array'den silme işlemi
            userData.inventory.splice(itemIndex, 1);

            if (item.id === 99) { // Lootbox
                const reward = LOOT_REWARDS[Math.floor(Math.random() * LOOT_REWARDS.length)];
                
                if (reward === 'gem') {
                    // Rastgele bir Kalp Gemi (ID: 20 - Beyaz Kalp)
                    const gemItem = { id: 20, name: "Beyaz Kalp", emoji: "<a:gem4:1444659962390384811>", type: 'gem', category: 'heart', tier: 1, durability: 15 };
                    userData.inventory.push(gemItem);
                    message.reply(`🎁 **Lootbox** açıldı! İçinden **Beyaz Kalp** çıktı!`);
                } else {
                    userData.balance += reward;
                    message.reply(`🎁 **Lootbox** açıldı! İçinden **${reward} ET** çıktı!`);
                }
            } 
            else if (item.id === 100) { // Weaponbox
                const weaponId = WEAPON_REWARDS[Math.floor(Math.random() * WEAPON_REWARDS.length)];
                const newWeapon = { id: weaponId, name: weaponId === 2 ? "Yay" : "Tüfek", type: "weapon", tier: weaponId, emoji: weaponId === 2 ? "🏹" : "🔫" };
                
                const hasWeapon = weapons.find(w => w.id === weaponId);

                if (hasWeapon) {
                    const refund = 2500;
                    userData.balance += refund;
                    message.reply(`🧰 **Weaponbox** açıldı! Silah zaten sende olduğu için **${refund} ET** kazandın.`);
                } else {
                    userData.weapons.push(newWeapon);
                    message.reply(`🧰 **Weaponbox** açıldı! İçinden **${newWeapon.name}** çıktı!`);
                }
            }
            
            // Kaydet
            await userData.save();
            return;
        }

        // === GEM TAKMA MANTIĞI ===
        if (item.type === 'gem') {
            const category = item.category; // 'diamond' veya 'heart'
            
            // Eğer activeGems yoksa başlat (Model'de default null olabilir)
            if (!userData.activeGems) userData.activeGems = {};
            
            // Envanterden sil
            userData.inventory.splice(itemIndex, 1);
            
            // Slota yerleştir
            userData.activeGems[category] = {
                name: item.name, 
                tier: item.tier, 
                emoji: item.emoji,
                maxDurability: item.durability || 10, // Eğer durability yoksa varsayılan 10
                currentDurability: item.durability || 10
            };
            
            // Obje içi değişiklikleri Mongoose'a bildir
            userData.markModified('activeGems');
            
            await userData.save();
            
            const slotName = category === 'diamond' ? 'Elmas' : 'Kalp';
            message.reply(`✅ **${item.name}** başarıyla **${slotName}** slotuna takıldı!`);
        }
    },
};