const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Tüm komutları listeler.'),

    async execute(interaction) {
        // Render ve Local uyumlu yol
        const commandsPath = path.join(process.cwd(), 'commands');
        
        const categories = {};

        // Klasörleri gezme fonksiyonu
        const readCommands = (dir) => {
            let files;
            try {
                files = fs.readdirSync(dir);
            } catch (e) { return; }

            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);

                if (stat.isDirectory()) {
                    readCommands(filePath); // Alt klasöre gir
                } else if (file.endsWith('.js')) {
                    try {
                        const cmd = require(filePath);
                        // Data name (Slash) veya name (Prefix)
                        const name = cmd.data?.name || cmd.name;
                        if (!name) continue;

                        // Kategori ismini klasörden al
                        const category = path.basename(path.dirname(filePath));
                        
                        // Ana klasördeyse veya 'commands' ise 'Genel' yap
                        let finalCategory = category;
                        if (category === 'commands' || category === 'slash' || category === 'src') finalCategory = 'Diğer';

                        if (!categories[finalCategory]) categories[finalCategory] = [];
                        categories[finalCategory].push(`\`${name}\``);
                    } catch (err) {
                        console.error(`Hatalı komut dosyası: ${file}`, err);
                    }
                }
            }
        };

        readCommands(commandsPath);
        
        const embed = new EmbedBuilder()
            .setTitle('📚 Komut Listesi')
            .setColor('#2B2D31')
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .setFooter({ text: `${interaction.user.username} tarafından istendi.`, iconURL: interaction.user.displayAvatarURL() });

        // Kategorileri alfabetik sırala
        const sortedCategories = Object.keys(categories).sort();

        for (const category of sortedCategories) {
            const commands = categories[category];
            if (commands.length > 0) {
                // Baş harfi büyük yap
                const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
                embed.addFields({ 
                    name: `📂 ${categoryName} (${commands.length})`, 
                    value: commands.join(', ') 
                });
            }
        }

        await interaction.reply({ embeds: [embed] });
    },
};