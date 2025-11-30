const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Botun gecikme sürelerini gösterir.'),
    async execute(interaction) {
        const sent = await interaction.reply({ content: 'Hesaplanıyor...', fetchReply: true, ephemeral: true });
        
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);

        await interaction.editReply({
            content: `Pong! 🏓\n📡 **Gecikme:** ${latency}ms\n🔌 **API Gecikmesi:** ${apiLatency}ms`
        });
    },
};