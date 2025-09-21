const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const axios = require('axios');
const serviceRegistry = require('../shared/serviceRegistry');

// Inicializar app
const app = express();
const PORT = process.env.PORT || 3000;

// Configurações do Circuit Breaker
const circuitBreakerState = {
    'user-service': { failures: 0, state: 'CLOSED', nextTry: 0 },
    'item-service': { failures: 0, state: 'CLOSED', nextTry: 0 },
    'list-service': { failures: 0, state: 'CLOSED', nextTry: 0 }
};

const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_TIMEOUT = 30000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Middleware de logging para debug
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
    next();
});

// Health check do gateway
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        service: 'api-gateway',
        timestamp: new Date().toISOString(),
        circuitBreakers: circuitBreakerState
    });
});

// Rota para visualizar o registry
app.get('/registry', (req, res) => {
    try {
        const services = serviceRegistry.listServices();
        const stats = serviceRegistry.getStats();
        
        res.json({
            services,
            stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Middleware de Circuit Breaker
function checkCircuitBreaker(serviceName) {
    const circuit = circuitBreakerState[serviceName];
    
    if (circuit.state === 'OPEN') {
        if (Date.now() > circuit.nextTry) {
            circuit.state = 'HALF_OPEN';
            circuit.failures = 0;
            return true;
        }
        return false;
    }
    return true;
}

function updateCircuitBreaker(serviceName, success) {
    const circuit = circuitBreakerState[serviceName];
    
    if (success) {
        circuit.failures = 0;
        circuit.state = 'CLOSED';
    } else {
        circuit.failures++;
        if (circuit.failures >= CIRCUIT_BREAKER_THRESHOLD) {
            circuit.state = 'OPEN';
            circuit.nextTry = Date.now() + CIRCUIT_BREAKER_TIMEOUT;
        }
    }
}

// Função para construir o path de destino
function buildTargetPath(originalUrl, serviceName) {

    if (originalUrl.startsWith('/api')) {
        return originalUrl.replace('/api', '');
    }
    return originalUrl;
}

// Função para fazer proxy de requisições
async function proxyRequest(serviceName, req, res) {
    try {
        console.log(`=== PROXY REQUEST START ===`);
        console.log(`Service: ${serviceName}`);
        console.log(`Original URL: ${req.originalUrl}`);
        console.log(`Method: ${req.method}`);
        
        // Verificar Circuit Breaker
        if (!checkCircuitBreaker(serviceName)) {
            console.log(`Circuit Breaker OPEN for ${serviceName}`);
            return res.status(503).json({ 
                error: `Service ${serviceName} temporarily unavailable (Circuit Breaker OPEN)`,
                retryAfter: Math.ceil((circuitBreakerState[serviceName].nextTry - Date.now()) / 1000)
            });
        }

        // Debug: listar serviços disponíveis
        console.log('Available services in registry:');
        const services = serviceRegistry.listServices();
        console.log(Object.keys(services));

        // Descobrir serviço
        console.log(`Discovering service: ${serviceName}`);
        const service = serviceRegistry.discover(serviceName);
        console.log(`Service found:`, service);
        
        // Construir URL corretamente
        const targetPath = buildTargetPath(req.originalUrl, serviceName);
        const targetUrl = `${service.url}${targetPath}`;
        console.log(`Target URL: ${targetUrl}`);
        
        // Configurar headers
        const headers = { ...req.headers };
        delete headers.host;
        
        // Fazer a requisição
        console.log('Making request to target service...');
        const response = await axios({
            method: req.method,
            url: targetUrl,
            data: req.body,
            headers: headers,
            timeout: 15000
        });
        
        // Atualizar Circuit Breaker para sucesso
        updateCircuitBreaker(serviceName, true);
        
        console.log('Request successful, returning response');
        // Retornar resposta
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error(`Error proxying to ${serviceName}:`, error.message);
        
        // Atualizar Circuit Breaker para falha
        updateCircuitBreaker(serviceName, false);
        
        if (error.response) {
            // Serviço respondeu com erro
            console.error('Service responded with error:', error.response.status);
            res.status(error.response.status).json(error.response.data);
        } else if (error.code === 'ECONNREFUSED') {
            // Serviço indisponível
            console.error('Service unavailable - connection refused');
            serviceRegistry.updateHealth(serviceName, false);
            res.status(503).json({ error: `Service ${serviceName} unavailable` });
        } else if (error.code === 'ECONNABORTED') {
            // Timeout
            console.error('Request timeout');
            res.status(504).json({ error: `Service ${serviceName} timeout` });
        } else {
            // Outro erro
            console.error('Other error:', error.code);
            res.status(500).json({ error: `Internal gateway error: ${error.message}` });
        }
    }
}

// Rotas para User Service
app.all('/api/auth', (req, res) => proxyRequest('user-service', req, res));
app.all('/api/auth/*', (req, res) => proxyRequest('user-service', req, res));
app.all('/api/users', (req, res) => proxyRequest('user-service', req, res));
app.all('/api/users/*', (req, res) => proxyRequest('user-service', req, res));

// Rotas para Item Service
app.all('/api/items', (req, res) => proxyRequest('item-service', req, res));
app.all('/api/items/*', (req, res) => proxyRequest('item-service', req, res));
app.all('/api/categories', (req, res) => proxyRequest('item-service', req, res));
app.all('/api/categories/*', (req, res) => proxyRequest('item-service', req, res));

// Rotas para List Service
app.all('/api/lists', (req, res) => proxyRequest('list-service', req, res));
app.all('/api/lists/*', (req, res) => proxyRequest('list-service', req, res));

// Rota de busca agregada
app.get('/api/search', async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q) {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }
        
        // Buscar em ambos os serviços
        const [itemsResults, listsResults] = await Promise.allSettled([
            axios.get(`http://127.0.0.1:3003/search?q=${encodeURIComponent(q)}`),
            axios.get(`http://127.0.0.1:3002/lists`, {
                headers: { 
                    'Authorization': req.headers.authorization || '' 
                }
            })
        ]);
        
        const results = {};
        
        if (itemsResults.status === 'fulfilled') {
            results.items = itemsResults.value.data;
        }
        
        if (listsResults.status === 'fulfilled') {
            // Filtrar listas que contenham o termo de busca
            const lists = listsResults.value.data;
            results.lists = lists.filter(list => 
                list.name.toLowerCase().includes(q.toLowerCase()) ||
                list.description.toLowerCase().includes(q.toLowerCase())
            );
        }
        
        res.json({
            searchTerm: q,
            timestamp: new Date().toISOString(),
            ...results
        });
    } catch (error) {
        console.error('Error in aggregated search:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Dashboard agregado
app.get('/api/dashboard', async (req, res) => {
    try {
        if (!req.headers.authorization) {
            return res.status(401).json({ error: 'Authorization required' });
        }
        
        const authHeader = req.headers.authorization;
        
        // Buscar dados do usuário e listas
        const [userResponse, listsResponse] = await Promise.all([
            axios.get('http://127.0.0.1:3001/users/me', {
                headers: { 'Authorization': authHeader }
            }).catch(() => null),
            
            axios.get('http://127.0.0.1:3002/lists', {
                headers: { 'Authorization': authHeader }
            })
        ]);
        
        const dashboardData = {
            user: userResponse ? userResponse.data : null,
            lists: {
                total: listsResponse.data.length,
                active: listsResponse.data.filter(l => l.status === 'active').length,
                completed: listsResponse.data.filter(l => l.status === 'completed').length,
                items: listsResponse.data.reduce((total, list) => total + (list.summary?.totalItems || 0), 0)
            },
            statistics: {
                totalEstimated: listsResponse.data.reduce((total, list) => total + (list.summary?.estimatedTotal || 0), 0),
                purchasedItems: listsResponse.data.reduce((total, list) => total + (list.summary?.purchasedItems || 0), 0)
            },
            timestamp: new Date().toISOString()
        };
        
        res.json(dashboardData);
    } catch (error) {
        console.error('Error generating dashboard:', error);
        res.status(500).json({ error: 'Failed to generate dashboard' });
    }
});

// Rota padrão
app.get('/', (req, res) => {
    res.json({
        message: 'API Gateway - Sistema de Gerenciamento de Listas de Compras',
        version: '1.0.0',
        endpoints: [
            'GET /health',
            'GET /registry',
            'GET /api/dashboard',
            'GET /api/search?q=termo',
            'POST /api/auth/* → User Service',
            'GET /api/users/* → User Service',
            'GET /api/items/* → Item Service',
            'GET /api/lists/* → List Service'
        ],
        circuitBreakerStatus: circuitBreakerState
    });
});

// Middleware de erro
app.use((err, req, res, next) => {
    console.error('Gateway error:', err.message);
    res.status(500).json({
        error: {
            message: 'Internal server error',
            status: 500
        }
    });
});

// Rota de fallback para 404
app.use('*', (req, res) => {
    res.status(404).json({
        error: {
            message: 'Endpoint not found',
            status: 404,
            path: req.originalUrl
        }
    });
});

// Health check automático dos serviços
setInterval(() => {
    console.log('Performing automatic health checks...');
    serviceRegistry.performHealthChecks().then(() => {
        console.log('Health checks completed');
    });
}, 30000);

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`API Gateway rodando na porta ${PORT}`);
    console.log(`Health check disponível em: http://localhost:${PORT}/health`);
    console.log(`Registry disponível em: http://localhost:${PORT}/registry`);
    console.log('Rotas configuradas:');
    console.log('  - /api/auth/* → User Service');
    console.log('  - /api/users/* → User Service');
    console.log('  - /api/items/* → Item Service');
    console.log('  - /api/lists/* → List Service');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nDesligando API Gateway...');
    process.exit(0);
});