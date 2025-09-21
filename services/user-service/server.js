const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const JsonDatabase = require('../../shared/JsonDatabase');
const serviceRegistry = require('../../shared/serviceRegistry');

// Inicializar app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Inicializar banco de dados
const dbPath = path.join(__dirname, 'database');
const usersDb = new JsonDatabase(dbPath, 'users');

// Registrar serviço
const serviceInfo = {
    url: `http://localhost:${PORT}`,
    version: '1.0.0',
    database: 'JSON-NoSQL',
    endpoints: [
        '/health',
        '/auth/register',
        '/auth/login',
        '/users/:id'
    ]
};

serviceRegistry.register('user-service', serviceInfo);

// Rotas
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        service: 'user-service',
        timestamp: new Date().toISOString()
    });
});

// Auth routes
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// User routes
const userRoutes = require('./routes/users');
app.use('/users', userRoutes);

// Rota padrão
app.get('/', (req, res) => {
    res.json({
        message: 'User Service - Microsserviço de Gerenciamento de Usuários',
        version: '1.0.0',
        endpoints: [
            'GET /health',
            'POST /auth/register',
            'POST /auth/login',
            'GET /users/:id',
            'PUT /users/:id'
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
    console.log(`User Service rodando na porta ${PORT}`);
    console.log(`Health check disponível em: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nDesligando User Service...');
    process.exit(0);
});