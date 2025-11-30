require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

// Özyinelemeli (Recursive) dosya tarama fonksiyonu
const getCommandFiles = (dir, fileList = []) => {
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                getCommandFiles(filePath, fileList);
            } else if (file.endsWith('.js')) {
                fileList.push(filePath);
            }
        }
    } catch (err) {
        console.error(`Klasör taranırken hata: ${dir}`, err);
    }
    return fileList;
};

// Tüm komut dosyalarını bul
const allCommandFiles = getCommandFiles(commandsPath);

console.log(`📂 Toplam ${allCommandFiles.length} adet komut dosyası tarandı.`);

for (const filePath of allCommandFiles) {
    try {
        const command = require(filePath);
        
        // Slash komut verisi (data) ve çalıştırma fonksiyonu (execute) var mı?
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
            console.log(`✅ [HAZIR] ${command.data.name} komutu listeye eklendi.`);
        } else {
            // Sadece dosya adını alalım
            const fileName = path.basename(filePath);
            console.log(`⚠️  [ATLANDI] ${fileName} -> 'data' özelliği yok (Sadece prefix komutu olabilir).`);
        }
    } catch (e) {
        console.warn(`❌ [HATA] ${filePath} okunurken hata:`, e);
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        if (commands.length === 0) {
            console.log(`❌ Yüklenecek hiç slash komut bulunamadı! Lütfen komut dosyalarına 'data' (SlashCommandBuilder) eklediğinden emin ol.`);
            return;
        }

        console.log(`--------------------------------------------------`);
        console.log(`🚀 ${commands.length} adet slash komut GLOBAL olarak Discord API'ye gönderiliyor...`);
        console.log(`🌍 Hedef: TÜM SUNUCULAR (Global)`);

        // GLOBAL KOMUTLAR İÇİN DEĞİŞİKLİK BURADA YAPILDI:
        // applicationGuildCommands yerine applicationCommands kullanıldı.
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log(`🎉 Başarılı! ${data.length} adet slash komut global olarak kaydedildi.`);
        console.log(`ℹ️  Not: Global komutların tüm sunuculara yayılması 1 saate kadar sürebilir.`);
        console.log(`--------------------------------------------------`);
    } catch (error) {
        console.error('❌ Yükleme sırasında hata oluştu:');
        console.error(error);
    }
})();