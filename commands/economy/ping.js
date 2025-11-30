module.exports = {
    name: 'ping',
    description: 'Botun ping değerini gösterir.',
    async execute(message, args, client) {
        const sent = await message.reply('Hesaplanıyor...');
        
        const latency = sent.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);

        await sent.edit(`Pong! 🏓\n📡 **Gecikme:** ${latency}ms\n🔌 **API Gecikmesi:** ${apiLatency}ms`);
    },
};