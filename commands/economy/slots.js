const { EmbedBuilder } = require('discord.js');
const UserEconomy = require('../../models/UserEconomy');

module.exports = {
    name: 'slots',
    aliases: ['s', 'slot'], 
    description: 'Slot makinesini çevirir.',
    
    async execute(message, args, client) {
        const amount = parseInt(args[0]);
        const userId = message.author.id;
        const username = message.author.username;

        // --- MAX BAHİS KONTROLÜ ---
        const MAX_BET = parseInt(process.env.MAX_BET) || 50000;
        const SPIN_EMOJI = process.env.SLOT_SPIN || '🎰'; // Varsayılan emoji eklendi

        // Emojileri tanımla
        const EMOJIS = {
            HEART: process.env.SLOT_HEART || '❤️',
            EGGPLANT: process.env.SLOT_EGGPLANT || '🍆',
            CHERRY: process.env.SLOT_CHERRY || '🍒',
            MONEY: process.env.MONEY ? `<:money:${process.env.MONEY}>` : '💰',
            LOSE: process.env.SLOT_EGGPLANT || '🍆'
        };

        if (isNaN(amount) || amount <= 0) {
            return message.reply(`<:false:${process.env.FALSE_EMOJI || '❌'}> Geçerli bir miktar gir!`);
        }

        if (amount > MAX_BET) {
            return message.reply(`<:false:${process.env.FALSE_EMOJI || '❌'}> Maksimum bahis miktarı: **${MAX_BET} ET**`);
        }

        // 1. Veriyi MongoDB'den Çek
        let userData = await UserEconomy.findOne({ userId: userId });

        // --- HESAP KONTROLÜ ---
        if (!userData) {
            return message.reply(`<:false:${process.env.FALSE_EMOJI || '❌'}> **${message.author}**, henüz bir hesabın yok!\nLütfen önce **et money** yazarak hesap oluştur.`);
        }

        if (userData.balance < amount) {
            return message.reply(`<:false:${process.env.FALSE_EMOJI || '❌'}> Yetersiz bakiye!`);
        }

        // --- PARAYI DÜŞ VE KAYDET ---
        userData.balance -= amount;
        await userData.save();

        // Slot Görünümü Fonksiyonu
        const createSlotLayout = (e1, e2, e3) => {
            return "**____`   SLOTS   `____**\n" +
                   "` `" + `${e1}${e2}${e3}` + "` `" + ` ${username}, ${EMOJIS.MONEY} ${amount} oynadı ve..  \n` +
                   "`|         |`\n" +
                   "`|         |`";
        };

        const isWin = Math.random() < 0.5;
        let resultEmojis = [];
        let multiplier = 0;

        if (isWin) {
            const winChance = Math.random();
            if (winChance < 0.10) { 
                resultEmojis = [EMOJIS.MONEY, EMOJIS.MONEY, EMOJIS.MONEY];
                multiplier = 10;
            } else if (winChance < 0.35) {
                resultEmojis = [EMOJIS.CHERRY, EMOJIS.CHERRY, EMOJIS.CHERRY];
                multiplier = 3;
            } else if (winChance < 0.70) {
                resultEmojis = [EMOJIS.HEART, EMOJIS.HEART, EMOJIS.HEART];
                multiplier = 2;
            } else {
                resultEmojis = [EMOJIS.EGGPLANT, EMOJIS.EGGPLANT, EMOJIS.EGGPLANT];
                multiplier = 1;
            }
        } else {
            const available = [EMOJIS.HEART, EMOJIS.CHERRY, EMOJIS.LOSE, EMOJIS.EGGPLANT];
            const r1 = available[Math.floor(Math.random() * available.length)];
            const r2 = available[Math.floor(Math.random() * available.length)];
            const r3 = available[Math.floor(Math.random() * available.length)];

            resultEmojis = [r1, r2, r3];

            if (r1 === r2 && r2 === r3) {
                resultEmojis[1] = (r2 === EMOJIS.LOSE) ? EMOJIS.HEART : EMOJIS.LOSE;
            }
            multiplier = 0;
        }

        const msg = await message.reply(createSlotLayout(SPIN_EMOJI, SPIN_EMOJI, SPIN_EMOJI));

        setTimeout(async () => {
            await msg.edit(createSlotLayout(resultEmojis[0], SPIN_EMOJI, SPIN_EMOJI));
        }, 1000);

        setTimeout(async () => {
            await msg.edit(createSlotLayout(resultEmojis[0], SPIN_EMOJI, resultEmojis[2]));
        }, 2000);

        setTimeout(async () => {
            // Veriyi tekrar taze çek
            userData = await UserEconomy.findOne({ userId: userId });
            
            const winningAmount = amount * multiplier;
            userData.balance += winningAmount;
            await userData.save();

            const e1 = resultEmojis[0];
            const e2 = resultEmojis[1];
            const e3 = resultEmojis[2];

            let footerText = "";
            
            if (multiplier === 0) {
                footerText = "**____`   SLOTS   `____**\n" +
                     "` `" + `${e1}${e2}${e3}` + "` `" + ` ${username}, ${EMOJIS.MONEY} ${amount} oynadı ve.. kaybetti :<\n` +
                     "`|         |`\n" +
                     "`|         |`";
            } else if (multiplier === 1) {
                footerText = "**____`   SLOTS   `____**\n" +
                     "` `" + `${e1}${e2}${e3}` + "` `" + ` ${username}, ${EMOJIS.MONEY} ${amount} oynadı ve.. **${amount} kazandı! :>** \n` +
                     "`|         |`\n" +
                     "`|         |`";
            } else {
                footerText = "**____`   SLOTS   `____**\n" +
                     "` `" + `${e1}${e2}${e3}` + "` `" + ` ${username}, ${EMOJIS.MONEY} ${amount} oynadı ve.. **${winningAmount} kazandı! :>** \n` +
                     "`|         |`\n" +
                     "`|         |`";
            }

            await msg.edit(`${footerText}`);

        }, 3000);
    },
};