const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const UserEconomy = require('../../models/UserEconomy');

module.exports = {
    name: 'blackjack',
    aliases: ['bj', '21', 'et21', 'etbj'],
    description: 'Dengeli Blackjack oyunu.',
    
    async execute(message, args, client) {
        const amount = parseInt(args[0]);
        const user = message.author;
        
        // --- MAX BAHİS KONTROLÜ ---
        const MAX_BET = parseInt(process.env.MAX_BET) || 50000;

        if (isNaN(amount) || amount <= 0) return message.reply('❌ Geçerli bir miktar gir! Örnek: `et bj 100`');

        if (amount > MAX_BET) {
            return message.reply(`<:false:${process.env.FALSE_EMOJI || '❌'}> Maksimum bahis miktarı: **${MAX_BET} ET**`);
        }

        // 1. KULLANICIYI ÇEK VE PARAYI KES
        let userData = await UserEconomy.findOne({ userId: user.id });

        if (!userData) {
            const warningEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`<:false:${process.env.FALSE_EMOJI || '❌'}> **${message.author}**, henüz bir hesabın yok!\nLütfen önce **et money** yazarak hesap oluştur.`);
            return message.reply({ embeds: [warningEmbed] });
        }

        if (userData.balance < amount) {
            return message.reply(`❌ Yetersiz bakiye! Mevcut: ${userData.balance} ET`);
        }

        // Parayı baştan kes ve kaydet (Güvenlik için)
        userData.balance -= amount;
        await userData.save();

        // --- DESTE VE MANTIK ---
        const createDeck = () => {
            const suits = ['♠', '♥', '♦', '♣'];
            const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
            const deck = [];
            for (const suit of suits) {
                for (const rank of ranks) {
                    let value = parseInt(rank);
                    if (['J', 'Q', 'K'].includes(rank)) value = 10;
                    if (rank === 'A') value = 11;
                    deck.push({ rank, suit, value });
                }
            }
            // Karıştır
            for (let i = deck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [deck[i], deck[j]] = [deck[j], deck[i]];
            }
            return deck;
        };

        const calculateScore = (hand) => {
            let score = 0;
            let aces = 0;
            for (const card of hand) {
                score += card.value;
                if (card.rank === 'A') aces += 1;
            }
            while (score > 21 && aces > 0) {
                score -= 10;
                aces -= 1;
            }
            return score;
        };

        const formatHand = (hand, hideSecond = false) => {
            if (hideSecond) return `\`${hand[0].rank}${hand[0].suit}\` \`??\``;
            return hand.map(c => `\`${c.rank}${c.suit}\``).join(' ');
        };

        // --- OYUN KURULUMU ---
        const deck = createDeck();
        const playerHand = [deck.pop(), deck.pop()];
        const dealerHand = [deck.pop(), deck.pop()];

        let playerScore = calculateScore(playerHand);
        let dealerScore = calculateScore(dealerHand);

        // --- GÖRÜNÜM (YENİ TASARIM) ---
        const generateEmbed = (isGameOver = false, winType = null) => {
            const pScore = calculateScore(playerHand);
            const dScore = calculateScore(dealerHand);
            
            let color = '#2B2D31'; // Gri
            let status = 'Sıra sende...';
            
            // Dealer Kartları
            let dealerTitle = `Dealer - Skor: ?`;
            let dealerCards = formatHand(dealerHand, true); // Kartı gizle

            if (isGameOver) {
                dealerTitle = `Dealer - Skor: ${dScore}`;
                dealerCards = formatHand(dealerHand, false); // Kartı göster

                if (winType === 'WIN') {
                    color = '#43B581';
                    status = `**KAZANDIN!** (+${amount * 2} ET)`;
                } else if (winType === 'TIE') {
                    color = '#FEE75C';
                    status = `**BERABERE!** (Paran İade)`;
                } else {
                    color = '#F04747';
                    status = winType === 'BUST' ? `**PATLADIN!** (-${amount} ET)` : `**KAYBETTİN!** (-${amount} ET)`;
                }
            }

            // Embed Oluştur (Field ile Yan Yana)
            const embed = new EmbedBuilder()
                .setColor(color)
                .setAuthor({ name: `${user.username} vs Dealer`, iconURL: user.displayAvatarURL() })
                .addFields(
                    { 
                        name: `👤 ${user.username} (Sen)`, 
                        value: `Kartlar: ${formatHand(playerHand)}\nSkor: **${pScore}**`, 
                        inline: true 
                    },
                    { 
                        name: `🎩 ${dealerTitle}`, 
                        value: `Kartlar: ${dealerCards}`, 
                        inline: true 
                    },
                    {
                        name: 'Durum',
                        value: `> ${status}`,
                        inline: false
                    }
                );
            
            return embed;
        };

        const btnHit = new ButtonBuilder().setCustomId('bj_hit').setLabel('Hit').setStyle(ButtonStyle.Secondary).setEmoji('👊');
        const btnStand = new ButtonBuilder().setCustomId('bj_stand').setLabel('Stand').setStyle(ButtonStyle.Secondary).setEmoji('🛑');
        const row = new ActionRowBuilder().addComponents(btnHit, btnStand);

        const gameMsg = await message.reply({ embeds: [generateEmbed()], components: [row] });

        // Collector
        const collector = gameMsg.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 60000 
        });

        collector.on('collect', async i => {
            if (i.user.id !== user.id) return i.reply({ content: 'Sıranı bekle!', ephemeral: true });

            if (i.customId === 'bj_hit') {
                playerHand.push(deck.pop());
                playerScore = calculateScore(playerHand);

                if (playerScore > 21) {
                    await endGame(i, 'BUST');
                } else {
                    await i.update({ embeds: [generateEmbed(false)], components: [row] });
                }

            } else if (i.customId === 'bj_stand') {
                while (dealerScore < 17) {
                    dealerHand.push(deck.pop());
                    dealerScore = calculateScore(dealerHand);
                }

                let result = '';
                
                if (dealerScore > 21) {
                    result = 'WIN';
                } else if (playerScore > dealerScore) {
                    result = 'WIN';
                } else if (playerScore < dealerScore) {
                    result = 'LOSE';
                } else {
                    result = 'TIE';
                }

                await endGame(i, result);
            }
        });

        async function endGame(interaction, result) {
            collector.stop();
            
            // Eğer kazandıysa veya berabereyse parayı ver
            if (result === 'WIN' || result === 'TIE') {
                // Veriyi taze çek (Oyun sırasında değişmiş olabilir)
                userData = await UserEconomy.findOne({ userId: user.id });
                
                if (result === 'WIN') {
                    userData.balance += (amount * 2);
                } else if (result === 'TIE') {
                    userData.balance += amount;
                }
                
                await userData.save();
            }
            // Kaybettiyse zaten başta kesmiştik, bir şey yapmaya gerek yok.

            await interaction.update({ embeds: [generateEmbed(true, result)], components: [] });
        }
    }
};