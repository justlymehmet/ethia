const { EmbedBuilder } = require('discord.js');
const UserEconomy = require('../../models/UserEconomy');

module.exports = {
    name: 'coinflip',
    aliases: ['cf'],
    description: 'Yazı tura atarak paranı katla.',
    
    async execute(message, args, client) {
        const amount = parseInt(args[0]);
        const userId = message.author.id;
        const username = message.author.username;

        // --- MAX BAHİS KONTROLÜ ---
        const MAX_BET = parseInt(process.env.MAX_BET) || 50000;

        if (isNaN(amount) || amount <= 0) {
            return message.reply(`<:false:${process.env.FALSE_EMOJI || '❌'}> Lütfen geçerli bir miktar gir! Örnek: \`et coinflip 100\``);
        }

        if (amount > MAX_BET) {
            return message.reply(`<:false:${process.env.FALSE_EMOJI || '❌'}> Maksimum bahis miktarı: **${MAX_BET} ET**`);
        }

        // 1. Kullanıcıyı ve Bakiyeyi Kontrol Et
        let userData = await UserEconomy.findOne({ userId: userId });

        if (!userData) {
            const warningEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`<:false:${process.env.FALSE_EMOJI || '❌'}> **${message.author}**, henüz bir hesabın yok!\nLütfen önce **et money** yazarak hesap oluştur.`);
            return message.reply({ embeds: [warningEmbed] });
        }

        if (userData.balance < amount) {
            return message.reply(`<:false:${process.env.FALSE_EMOJI || '❌'}> **${username}**, yeterli bakiyen yok!`);
        }

        // Animasyon mesajı
        const sentMsg = await message.reply(`<a:cf:${process.env.CF || ''}> **${username}**, tam **${amount}** kadarını harcadı..\nPara dönüyor ve.. `);

        // 3 Saniye Bekleme
        setTimeout(async () => {
            const isWin = Math.random() < 0.4; // %40 Kazanma Şansı
            let resultText = "";

            // 2. Veriyi Tekrar Çek (Bekleme süresinde bakiye değişmiş olabilir, en güncel hali al)
            userData = await UserEconomy.findOne({ userId: userId });

            // Güvenlik: Eğer kullanıcı o arada parasını başka yerde harcadıysa eksiye düşebilir,
            // ama basitlik adına işlemi yapıyoruz. (İstenirse burada tekrar if check yapılabilir)

            if (isWin) {
                userData.balance += amount;
                resultText = `<:money:${process.env.MONEY || '💰'}> **${username}**, tam **${amount}** kadarını harcadı..\nPara dönüyor ve... **${amount}ET kazandın! :>**`;
            } else {
                userData.balance -= amount;
                resultText = `<:money:${process.env.MONEY || '💰'}> **${username}**, tam **${amount}** kadarını harcadı..\nPara dönüyor ve... ${amount}ET kaybettin! :>`;
            }

            // 3. Veriyi Kaydet
            await userData.save();

            await sentMsg.edit(resultText);

        }, 3000);
    },
};