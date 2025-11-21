const path = require('path');
// Load .env from project root to ensure RABBITMQ_URL is available
try {
    const dotenvPath = path.resolve(__dirname, '..', '..', '.env');
    require('dotenv').config({ path: dotenvPath });
} catch (e) {
    try { require('dotenv').config(); } catch (e) { }
}
const amqplib = require('amqplib');

(async () => {
    try {
        const RABBIT_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
        const conn = await amqplib.connect(RABBIT_URL);
        const channel = await conn.createChannel();
        const exchange = 'shopping_events';
        await channel.assertExchange(exchange, 'topic', { durable: true });

        const q = 'shopping_analytics';
        await channel.assertQueue(q, { durable: true });
        await channel.bindQueue(q, exchange, 'list.checkout.#');

        console.log('Consumer Analytics aguardando mensagens...');

        channel.consume(q, async (msg) => {
            if (msg !== null) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    const listId = content.listId || '(unknown)';
                    let total = 0;

                    if (Array.isArray(content.items) && content.items.length > 0) {
                        for (const it of content.items) {
                            const price = parseFloat(it.estimatedPrice || 0) || 0;
                            const qty = parseFloat(it.quantity || 0) || 0;
                            total += price * qty;
                        }
                    } else if (content.summary && content.summary.estimatedTotal) {
                        total = parseFloat(content.summary.estimatedTotal) || 0;
                    } else {
                        // simulação genérica
                        total = 0;
                    }

                    console.log(`Analytics: Lista ${listId} -> total gasto R$ ${total.toFixed(2)}`);

                    channel.ack(msg);
                } catch (err) {
                    console.error('Erro ao processar mensagem no consumer_analytics:', err);
                    channel.nack(msg, false, false);
                }
            }
        }, { noAck: false });

        process.on('SIGINT', async () => {
            console.log('Fechando consumer_analytics...');
            try { await channel.close(); } catch (e) {}
            try { await conn.close(); } catch (e) {}
            process.exit(0);
        });

    } catch (error) {
        console.error('Erro no consumer_analytics:', error);
        process.exit(1);
    }
})();
