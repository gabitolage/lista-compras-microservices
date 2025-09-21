const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const JsonDatabase = require('../../shared/JsonDatabase');
const serviceRegistry = require('../../shared/serviceRegistry');
const seedItems = require('./seed-data');

// Inicializar app
const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Inicializar banco de dados
const dbPath = path.join(__dirname, 'database');
const itemsDb = new JsonDatabase(dbPath, 'items');
const categoriesDb = new JsonDatabase(dbPath, 'categories');

// Registrar serviço
const serviceInfo = {
    url: `http://localhost:${PORT}`,
    version: '1.0.0',
    database: 'JSON-NoSQL',
    endpoints: [
        '/health',
        '/items',
        '/items/:id',
        '/categories',
        '/search'
    ]
};

serviceRegistry.register('item-service', serviceInfo);

// Rotas
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        service: 'item-service',
        timestamp: new Date().toISOString(),
        totalItems: itemsDb.count() // Será implementado async depois
    });
});

// Importar rotas
const itemRoutes = require('./routes/items');
const categoryRoutes = require('./routes/categories');
const searchRoutes = require('./routes/search');

app.use('/items', itemRoutes);
app.use('/categories', categoryRoutes);
app.use('/search', searchRoutes);

// Rota padrão
app.get('/', (req, res) => {
    res.json({
        message: 'Item Service - Microsserviço de Gerenciamento de Produtos',
        version: '1.0.0',
        endpoints: [
            'GET /health',
            'GET /items',
            'GET /items/:id',
            'POST /items',
            'PUT /items/:id',
            'GET /categories',
            'GET /search?q=termo'
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
    console.log(`Item Service rodando na porta ${PORT}`);
    console.log(`Health check disponível em: http://localhost:${PORT}/health`);
    
    // Popular dados iniciais se necessário
    seedItems().catch(console.error);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nDesligando Item Service...');
    process.exit(0);
});