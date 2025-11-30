// models/UserEconomy.js
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    balance: { type: Number, default: 0 },
    dailyStreak: { type: Number, default: 0 },
    lastDaily: { type: Number, default: 0 },
    lastHunt: { type: Number, default: 0 },
    lastWork: { type: Number, default: 0 }, // Work komutu için eklendi
    lastCookie: { type: Number, default: 0 },
    
    // Basit Sayaçlar (Map kullanıyoruz ki dinamik olsun)
    animals: { type: Map, of: Number, default: {} }, 
    cookies: { type: Number, default: 0 },

    // Envanter (Gemler, Kutular vb.)
    inventory: [{ 
        _id: false, // Her eşya için gereksiz ID oluşturmayı engeller
        id: Number, 
        name: String, 
        emoji: String, 
        type: String, // 'box', 'gem'
        price: Number, // Shop'tan gelen fiyat
        desc: String,  // Açıklama
        category: String, // Gem türü (diamond/heart)
        tier: Number,     // Gem seviyesi
        durability: Number, // Gem dayanıklılığı
        count: { type: Number, default: 1 }
    }],

    // Silahlar
    weapons: [{ 
        _id: false,
        id: Number, 
        name: String, 
        emoji: String, 
        type: String, // 'weapon'
        price: Number,
        desc: String,
        tier: Number 
    }],
    
    // Takılı Gemler
    activeGems: {
        diamond: { type: Object, default: null }, // Tier, durability vb. tutar
        heart: { type: Object, default: null }
    },

    // Checklist (Günlük Görevler)
    checklist: {
        date: { type: String, default: '' },
        lootbox: { type: Number, default: 0 },
        weaponbox: { type: Number, default: 0 },
        cookie: { type: Boolean, default: false },
        completed: { type: Boolean, default: false }
    },

    // Savaş Takımı
    team: {
        name: { type: String, default: null },
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 }
    },
    
    // Ekstra İstatistikler
    huntingXp: { type: Number, default: 0 }
});

module.exports = mongoose.model('UserEconomy', schema);
