const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const JsonDatabase = require('../../shared/JsonDatabase');
const serviceRegistry = require('../../shared/serviceRegistry');

// Inicializar app
const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Inicializar banco de dados
const dbPath = path.join(__dirname, 'database');
const listsDb = new JsonDatabase(dbPath, 'lists');

// Registrar serviço
const serviceInfo = {
    url: `http://localhost:${PORT}`,
    version: '1.0.0',
    database: 'JSON-NoSQL',
    endpoints: [
        '/health',
        '/lists',
        '/lists/:id',
        '/lists/:id/items',
        '/lists/:id/summary'
    ]
};

serviceRegistry.register('list-service', serviceInfo);

// Middleware para buscar informações do Item Service
const getItemService = async () => {
    try {
        const service = serviceRegistry.discover('item-service');
        return service;
    } catch (error) {
        console.error('Item Service não disponível:', error.message);
        return null;
    }
};

// Rotas
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        service: 'list-service',
        timestamp: new Date().toISOString(),
        totalLists: listsDb.count() // Será implementado async depois
    });
});

// Importar rotas
const listRoutes = require('./routes/lists');
app.use('/lists', listRoutes);

// Rota padrão
app.get('/', (req, res) => {
    res.json({
        message: 'List Service - Microsserviço de Gerenciamento de Listas de Compras',
        version: '1.0.0',
        endpoints: [
            'GET /health',
            'POST /lists',
            'GET /lists',
            'GET /lists/:id',
            'PUT /lists/:id',
            'DELETE /lists/:id',
            'POST /lists/:id/items',
            'PUT /lists/:id/items/:itemId',
            'DELETE /lists/:id/items/:itemId',
            'GET /lists/:id/summary'
        ]
    });
});

// Middleware de erro
app.use((err, req, res, next) => {
    console.error('Erro:', err.message);
    res.status(err.status || 500).json({
        error: {
            message: err.message,
            status: err.status || 500
        }
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`List Service rodando na porta ${PORT}`);
    console.log(`Health check disponível em: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nDesligando List Service...');
    process.exit(0);
});

// Exportar função para uso nas rotas
module.exports.getItemService = getItemService;