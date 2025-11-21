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

        const q = 'shopping_notifications';
        await channel.assertQueue(q, { durable: true });
        await channel.bindQueue(q, exchange, 'list.checkout.#');

        console.log('Consumer Notification aguardando mensagens...');

        channel.consume(q, async (msg) => {
            if (msg !== null) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    const listId = content.listId || '(unknown)';
                    const userId = content.userId || '(unknown)';
                    const email = content.userEmail || `${userId}@example.com`;

                    console.log(`Enviando comprovante da lista ${listId} para o usuário ${email}`);

                    channel.ack(msg);
                } catch (err) {
                    console.error('Erro ao processar mensagem no consumer_notification:', err);
                    channel.nack(msg, false, false);
                }
            }
        }, { noAck: false });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            console.log('Fechando consumer_notification...');
            try { await channel.close(); } catch (e) {}
            try { await conn.close(); } catch (e) {}
            process.exit(0);
        });

    } catch (error) {
        console.error('Erro no consumer_notification:', error);
        process.exit(1);
    }
})();
