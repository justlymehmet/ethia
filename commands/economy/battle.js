const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const UserEconomy = require('../../models/UserEconomy');

// Savaş Hikayeleri
const BATTLE_LOGS = [
    "🔥 **{winner}** takımı, **{loser}** takımını köşeye sıkıştırdı ve darmaduman etti!",
    "⚔️ **{winner}**, taktiksel bir hamleyle **{loser}** savunmasını yardı geçti!",
    "🛡️ **{loser}** direnmeye çalıştı ama **{winner}** gücü karşısında çaresiz kaldı.",
    "🐉 **{winner}** tarafındaki efsanevi hayvanlar **{loser}** takımını korkutup kaçırdı!",
    "🎯 **{winner}** keskin nişancıları **{loser}** takımına nefes aldırmadı!",
    "🏆 Kıyasıya geçen mücadeleyi **{winner}** son anda kazandı!"
];

// Ödül Havuzu
const REWARDS = [
    { type: 'money', val: 0, weight: 10 }, 
    { type: 'money', val: 1000, weight: 40 },
    { type: 'money', val: 3000, weight: 30 },
    { type: 'money', val: 5000, weight: 10 },
    { type: 'box', id: 99, name: "Lootbox", emoji: "🎁", weight: 8 },
    { type: 'box', id: 100, name: "Weaponbox", emoji: "🧰", weight: 2 }
];

// Hayvan Verileri
const ANIMAL_INFO = {
    1: { name: 'Arı', emoji: '🐝' }, 2: { name: 'Tırtıl', emoji: '🐛' }, 3: { name: 'Kelebek', emoji: '🦋' },
    4: { name: 'Tavşan', emoji: '🐇' }, 5: { name: 'İnek', emoji: '🐄' }, 6: { name: 'Tilki', emoji: '🦊' },
    7: { name: 'Kurt', emoji: '🐺' }, 8: { name: 'Ayı', emoji: '🐻' }, 9: { name: 'Panda', emoji: '🐼' },
    10: { name: 'Ejderha', emoji: '🐉' }
};

module.exports = {
    name: 'battle',
    aliases: ['savas', 'etbattle'],
    description: 'Modern savaş sistemi. (Takım gerektirir)',

    async execute(message, args, client) {
        const user = message.author;
        const userId = user.id;
        const target = message.mentions.users.first();

        // 1. Kendi verini çek
        let userData = await UserEconomy.findOne({ userId: userId });

        // --- HESAP KONTROLÜ ---
        if (!userData) {
            const warningEmbed = new EmbedBuilder().setColor('#FF0000').setDescription(`🚫 **${user.username}**, hesabın yok! \`et money\` yaz.`);
            return message.reply({ embeds: [warningEmbed] });
        }

        // --- TAKIM KONTROLÜ ---
        if (!userData.team || !userData.team.name) {
            return message.reply('❌ Bir takımın yok! Önce `et team set <İsim>` ile takım kur.');
        }

        // --- GÜÇ HESAPLAMA FONKSİYONU ---
        // Not: Artık ID yerine direkt veritabanı objesini (doc) alıyoruz
        const getTeamData = (doc) => {
            const animals = doc.animals || new Map();
            const weapons = doc.weapons || [];
            
            let totalPower = 0;
            let mvp = { name: "Yok", power: 0, emoji: "🏳️" };

            // 1. Hayvan Gücü (MongoDB Map Döngüsü)
            // Map olduğu için for..of kullanıyoruz
            if (animals && animals.size > 0) {
                for (const [animalIdStr, count] of animals) {
                    const numId = parseInt(animalIdStr);
                    const info = ANIMAL_INFO[numId];
                    if (!info) continue;

                    const power = (numId * 25) * count;
                    totalPower += power;

                    if (power > mvp.power) {
                        mvp = { name: info.name, power: power, emoji: info.emoji };
                    }
                }
            }

            // 2. Silah Gücü (Tier * 150)
            const weaponPower = weapons.reduce((acc, w) => acc + (w.tier * 150), 0);
            totalPower += weaponPower;

            const teamName = doc.team && doc.team.name ? doc.team.name : "İsimsiz Takım";

            return { id: doc.userId, teamName, totalPower, weaponPower, mvp };
        };

        const myTeam = getTeamData(userData);

        // ================= PvP MODU (ETİKETLİ) =================
        if (target) {
            if (target.id === userId || target.bot) return message.reply('❌ Geçersiz rakip.');

            let targetData = await UserEconomy.findOne({ userId: target.id });

            if (!targetData || !targetData.team || !targetData.team.name) {
                return message.reply('❌ Rakibinin bir takımı yok!');
            }

            const inviteEmbed = new EmbedBuilder()
                .setColor('#E67E22')
                .setTitle('⚔️ DÜELLO ÇAĞRISI')
                .setDescription(`**${myTeam.teamName}** 🆚 **${targetData.team.name}**\n\n${target}, bu meydan okumayı kabul ediyor musun?`)
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/1021/1021204.png');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('accept').setLabel('Savaş!').setStyle(ButtonStyle.Success).setEmoji('⚔️'),
                new ButtonBuilder().setCustomId('decline').setLabel('Korkak Tavuk').setStyle(ButtonStyle.Danger).setEmoji('🐔')
            );

            const msg = await message.reply({ content: `${target}`, embeds: [inviteEmbed], components: [row] });
            const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

            collector.on('collect', async i => {
                if (i.user.id !== target.id) return i.reply({ content: 'Sen karışma!', ephemeral: true });

                if (i.customId === 'decline') {
                    await i.update({ content: `🏳️ **${target.username}** savaşı reddetti.`, embeds: [], components: [] });
                    return;
                }

                // Butona tıklandığında veriler değişmiş olabilir, tekrar çekmek en güvenlisi
                // Ancak basitlik adına mevcut dataları gönderiyoruz.
                const enemyTeam = getTeamData(targetData);
                await runBattle(i, user, target, userData, targetData, myTeam, enemyTeam); // i = interaction
                collector.stop();
            });
            return;
        }

        // ================= PvE MODU (RASTGELE) =================
        // Kendisi hariç, takımı olan rastgele birini bul
        // MongoDB'de "aggregate $sample" kullanmak daha performanslıdır ama basitlik için find kullanıyoruz.
        const opponents = await UserEconomy.find({ 
            userId: { $ne: userId }, 
            'team.name': { $ne: null } 
        }).limit(50); // Çok fazla veri çekmemek için limit koyabiliriz

        if (opponents.length === 0) return message.reply('❌ Savaşacak başka kimse yok!');

        const randomOpponentData = opponents[Math.floor(Math.random() * opponents.length)];
        const enemyTeam = getTeamData(randomOpponentData);
        
        // Rakip adı (Discord'dan çekmeye çalışıyoruz, bulamazsak veritabanı ID'sini kullanırız)
        let enemyUser = { username: "Bilinmeyen Rakip", id: randomOpponentData.userId };
        try { enemyUser = await client.users.fetch(randomOpponentData.userId); } catch(e) {}

        const loadingMsg = await message.reply('⚔️ **Rakip aranıyor...**');
        
        setTimeout(async () => {
            loadingMsg.delete().catch(() => {});
            // Mesaj objesi üzerinden reply atacağız
            await runBattle(message, user, enemyUser, userData, randomOpponentData, myTeam, enemyTeam); 
        }, 1500);
    },
};

// --- SAVAŞ MANTIĞI VE GÖRSELLEŞTİRME ---
// userDoc1 ve userDoc2: MongoDB dökümanları (Kaydetmek için)
// t1 ve t2: getTeamData'dan dönen istatistik objeleri
async function runBattle(targetObj, user1, user2, userDoc1, userDoc2, t1, t2) {
    // Şans Faktörü
    const luck1 = 0.85 + Math.random() * 0.3;
    const luck2 = 0.85 + Math.random() * 0.3;

    const finalPower1 = Math.floor(t1.totalPower * luck1);
    const finalPower2 = Math.floor(t2.totalPower * luck2);

    // Kazananı Belirle
    let winner, wStats, lStats, wDoc, lDoc;
    let isWin = false;

    if (finalPower1 >= finalPower2) {
        winner = user1; wStats = t1; lStats = t2;
        wDoc = userDoc1; lDoc = userDoc2;
        isWin = true; // Komutu kullanan kazandı
    } else {
        winner = user2; wStats = t2; lStats = t1;
        wDoc = userDoc2; lDoc = userDoc1;
        isWin = false; // Komutu kullanan kaybetti
    }

    let rewardText = "Maalesef kaybettin...";

    // --- İSTATİSTİK VE ÖDÜLLER ---
    // Kazanan (wDoc) işlemleri
    wDoc.team.wins = (wDoc.team.wins || 0) + 1;

    // Kaybeden (lDoc) işlemleri
    lDoc.team.losses = (lDoc.team.losses || 0) + 1;

    // Eğer komutu kullanan (userDoc1) kazandıysa ödül ver
    if (isWin) {
        // Rastgele Ödül Seçimi
        const totalWeight = REWARDS.reduce((acc, r) => acc + r.weight, 0);
        let random = Math.random() * totalWeight;
        let selectedReward = REWARDS[0];

        for (const r of REWARDS) {
            if (random < r.weight) { selectedReward = r; break; }
            random -= r.weight;
        }

        if (selectedReward.type === 'money' && selectedReward.val > 0) {
            userDoc1.balance += selectedReward.val;
            rewardText = `💰 **${selectedReward.val} ET** kazandın!`;
        } else if (selectedReward.type === 'box') {
            userDoc1.inventory.push({ id: selectedReward.id, name: selectedReward.name, emoji: selectedReward.emoji, type: 'box' });
            rewardText = `📦 **${selectedReward.name}** kazandın!`;
        } else {
            rewardText = "Savaşı kazandın ama ganimet bulamadın.";
        }
    }

    // --- KAYDETME ---
    await userDoc1.save();
    await userDoc2.save();

    // --- GÖRSEL OLUŞTURMA ---
    const totalP = finalPower1 + finalPower2;
    let p1Percent = totalP > 0 ? Math.round((finalPower1 / totalP) * 12) : 6;
    p1Percent = Math.max(1, Math.min(11, p1Percent));
    
    const bar = '🟦'.repeat(p1Percent) + '🟥'.repeat(12 - p1Percent);

    const story = BATTLE_LOGS[Math.floor(Math.random() * BATTLE_LOGS.length)]
        .replace('{winner}', wStats.teamName)
        .replace('{loser}', lStats.teamName);

    const embed = new EmbedBuilder()
        .setTitle(isWin ? '🎉 ZAFER!' : '💀 YENİLGİ')
        .setColor(isWin ? '#2ECC71' : '#E74C3C')
        .setDescription(`
### ${t1.teamName} 🆚 ${t2.teamName}

**Savaş Raporu:**
${story}

**Güç Dengesi:**
\`${t1.teamName}\` ${bar} \`${t2.teamName}\`
        `)
        .addFields(
            { 
                name: `🟦 ${t1.teamName}`, 
                value: `💪 Güç: **${finalPower1.toLocaleString()}**\n👑 MVP: ${t1.mvp.emoji} **${t1.mvp.name}**`, 
                inline: true 
            },
            { 
                name: `🟥 ${t2.teamName}`, 
                value: `💪 Güç: **${finalPower2.toLocaleString()}**\n👑 MVP: ${t2.mvp.emoji} **${t2.mvp.name}**`, 
                inline: true 
            },
            { 
                name: '🎁 Sonuç', 
                value: rewardText, 
                inline: false 
            }
        );

    // Mesajı Gönder/Güncelle
    if (targetObj.update) { // Interaction ise
        await targetObj.update({ content: null, embeds: [embed], components: [] });
    } else { // Message ise
        await targetObj.reply({ embeds: [embed] });
    }
}