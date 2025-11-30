const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    
    // Oto-Ban Sistemi
    warnSystem: {
        enabled: { type: Boolean, default: true },
        limit: { type: Number, default: 3 }
    },

    // Hoşgeldin Mesajı
    welcome: {
        enabled: { type: Boolean, default: false },
        channel: { type: String, default: null },
        message: { type: String, default: null },
        isEmbed: { type: Boolean, default: false },
        color: { type: String, default: '#43B581' },
        thumbnail: { type: String, default: '{üye_pp}' },
        author: { 
            name: { type: String, default: null }, 
            icon: { type: String, default: null } 
        },
        button: {
            enabled: { type: Boolean, default: false },
            label: { type: String, default: null },
            url: { type: String, default: null }
        }
    },

    warnSystem: {
    enabled: { type: Boolean, default: true },
    limit: { type: Number, default: 3 },
    // Kullanıcı uyarılarını tutacak yeni alan:
    warnings: [{
        userId: String,
        count: { type: Number, default: 0 },
        reasons: [{ 
            moderator: String, 
            reason: String, 
            date: { type: Date, default: Date.now } 
        }]
    }]
    },

    // Görüşürüz Mesajı
    goodbye: {
        enabled: { type: Boolean, default: false },
        channel: { type: String, default: null },
        message: { type: String, default: null },
        isEmbed: { type: Boolean, default: false },
        color: { type: String, default: '#F04747' },
        thumbnail: { type: String, default: '{üye_pp}' },
        author: { 
            name: { type: String, default: null }, 
            icon: { type: String, default: null } 
        },
        button: {
            enabled: { type: Boolean, default: false },
            label: { type: String, default: null },
            url: { type: String, default: null }
        }
    }
});

module.exports = mongoose.model('GuildSettings', schema);