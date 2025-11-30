const { SlashCommandBuilder } = require('discord.js');
const UserEconomy = require('../../../models/UserEconomy'); // Model dosyasının yolu

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Yazı tura atarak paranı katla veya kaybet.')
        .addIntegerOption(option => 
            option.setName('miktar')
                .setDescription('Oynamak istediğin para miktarı')
                .setRequired(true)
                .setMinValue(1)), 

    async execute(interaction) {
        const amount = interaction.options.getInteger('miktar');
        const userId = interaction.user.id;
        const username = interaction.user.username;

        // 1. Veriyi MongoDB'den Çek
        let userData = await UserEconomy.findOne({ userId: userId });

        // Hesap Kontrolü
        if (!userData) {
            return interaction.reply({ 
                content: `<:false:${process.env.FALSE_EMOJI || '❌'}> **${username}**, hesabın yok! Önce \`/money\` komutunu kullan.`, 
                ephemeral: true
            });
        }

        if (userData.balance < amount) {
            return interaction.reply({ 
                content: `<:false:${process.env.FALSE_EMOJI || '❌'}> **${username}**, yeterli bakiyen yok!`, 
                ephemeral: true
            });
        }

        // Animasyon mesajı
        await interaction.reply({ 
            content: `<a:cf:${process.env.CF || ''}> **${username}**, tam **${amount}** kadarını harcadı..\nPara dönüyor ve.. ` 
        });

        setTimeout(async () => {
            const isWin = Math.random() < 0.4; // %40 Şans
            let resultText = "";

            // Veriyi tekrar taze çek (Bekleme süresinde bakiye değişmiş olabilir)
            userData = await UserEconomy.findOne({ userId: userId });

            if (isWin) {
                userData.balance += amount;
                resultText = `<:money:${process.env.MONEY || '💰'}> **${username}**, tam **${amount}** kadarını harcadı..\nPara dönüyor ve... **${amount}ET kazandın! :>**`;
            } else {
                userData.balance -= amount;
                resultText = `<:money:${process.env.MONEY || '💰'}> **${username}**, tam **${amount}** kadarını harcadı..\nPara dönüyor ve... ${amount}ET kaybettin :<`;
            }

            // Kaydet
            await userData.save();

            // Mesajı güncelle
            await interaction.editReply({ content: resultText });

        }, 3000);
    },
};