const { EmbedBuilder } = require('discord.js');
const UserEconomy = require('../../models/UserEconomy');

module.exports = {
    name: 'work',
    aliases: ['calis', 'çalış', 'w'],
    description: 'Çalışarak para kazanırsın.',

    async execute(message, args, client) {
        const userId = message.author.id;
        const cooldown = 3600000; // 1 Saat

        // 1. Veriyi Çek
        let userData = await UserEconomy.findOne({ userId: userId });

        if (!userData) {
            const warningEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`<:false:${process.env.FALSE_EMOJI || '❌'}> **${message.author}**, henüz bir hesabın yok!\nLütfen önce **et money** yazarak hesap oluştur.`);
            return message.reply({ embeds: [warningEmbed] });
        }

        const lastWork = userData.lastWork || 0;
        const timeSince = Date.now() - lastWork;

        if (timeSince < cooldown) {
            const remaining = Math.ceil((cooldown - timeSince) / 60000);

            const waitEmbed = new EmbedBuilder()
                .setColor(`#${process.env.HATA || 'FF0000'}`)
                .setDescription(`⏳ **${message.author.username}**, tekrar çalışmak için **${remaining} DK** dinlenmelisin.`);

            return message.reply({ embeds: [waitEmbed] });
        }

        const jobs = [
            "bir restoranda garsonluk yaptın",
            "serbest zamanlı kod yazdın",
            "komşunun köpeğini gezdirdin",
            "discord sunucusunda moderatörlük yaptın",
            "eski eşyalarını sattın",
            "bahçıvanlık yaptın",
            "markette kasiyerlik yaptın"
        ];

        const randomJob = jobs[Math.floor(Math.random() * jobs.length)];
        const earnings = Math.floor(Math.random() * 401) + 100;

        // Verileri Güncelle
        userData.balance += earnings;
        userData.lastWork = Date.now();
        
        // Kaydet
        await userData.save();

        const workEmbed = new EmbedBuilder()
            .setColor('#FFFFFF')
            .setDescription(`💼 **${message.author.username}**, ${randomJob} ve **${earnings} ET** kazandın!`)

        await message.reply({ embeds: [workEmbed] });
    },
};