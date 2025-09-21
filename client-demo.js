const axios = require('axios');

const API_BASE = 'http://127.0.0.1:3000';
let authToken = '';

class ClientDemo {
    constructor() {
        this.userData = null;
        this.lists = [];
        this.items = [];
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async makeRequest(method, endpoint, data = null, requireAuth = false) {
        try {
            const config = {
                method,
                url: `${API_BASE}${endpoint}`,
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            };

            if (data) {
                config.data = data;
            }

            if (requireAuth && authToken) {
                config.headers.Authorization = `Bearer ${authToken}`;
            }

            const response = await axios(config);
            return response.data;
        } catch (error) {
            if (error.response) {
                console.error(`Erro ${error.response.status}:`, error.response.data);
            } else {
                console.error('Erro de conexão:', error.message);
            }
            throw error;
        }
    }

    async testHealth() {
        console.log('=== 1. TESTANDO HEALTH CHECK ===');
        try {
            const health = await this.makeRequest('GET', '/health');
            console.log('✅ Health check OK:', health);
            return true;
        } catch (error) {
            console.log('❌ Health check falhou');
            return false;
        }
    }

    async testRegistry() {
        console.log('\n=== 2. VERIFICANDO REGISTRY ===');
        try {
            const registry = await this.makeRequest('GET', '/registry');
            console.log('✅ Registry OK - Serviços:', Object.keys(registry.services).join(', '));
            return true;
        } catch (error) {
            console.log('❌ Registry falhou');
            return false;
        }
    }

    async registerUser() {
        console.log('\n=== 3. REGISTRANDO USUÁRIO ===');
        const userData = {
            email: `userteste${Date.now()}@exemplo.com`,
            username: `userteste${Date.now()}`,
            password: 'senha123',
            firstName: 'Phillipe',
            lastName: 'Coutinho',
            preferences: {
                defaultStore: 'Mercado Central',
                currency: 'BRL'
            }
        };

        try {
            const result = await this.makeRequest('POST', '/api/auth/register', userData);
            console.log('✅ Usuário registrado com sucesso!');
            console.log('   Email:', result.user.email);
            console.log('   Username:', result.user.username);
            this.userData = result.user;
            authToken = result.token;
            return true;
        } catch (error) {
            // Se falhar no registro, tenta login com usuário padrão
            return this.loginUser();
        }
    }

    async loginUser() {
        console.log('\n=== 3. FAZENDO LOGIN ===');
        const loginData = {
            email: 'usuario@exemplo.com',
            password: 'senha123'
        };

        try {
            const result = await this.makeRequest('POST', '/api/auth/login', loginData);
            console.log('✅ Login realizado com sucesso!');
            console.log('   Usuário:', result.user.email);
            this.userData = result.user;
            authToken = result.token;
            return true;
        } catch (error) {
            console.log('❌ Login falhou, tentando registrar novo usuário...');

            // Tenta registrar um novo usuário
            const newUser = {
                email: 'usuario@exemplo.com',
                username: 'testuser',
                password: 'senha123',
                firstName: 'Usuário',
                lastName: 'Teste'
            };

            try {
                const result = await this.makeRequest('POST', '/api/auth/register', newUser);
                console.log('✅ Novo usuário registrado!');
                this.userData = result.user;
                authToken = result.token;
                return true;
            } catch (error) {
                console.log('❌ Falha total no registro/login');
                return false;
            }
        }
    }

    async browseItems() {
        console.log('\n=== 4. NAVEGANDO ITENS ===');
        try {
            // Listar categorias
            const categories = await this.makeRequest('GET', '/api/categories');
            console.log('📦 Categorias disponíveis:');
            categories.forEach(cat => {
                console.log(`   - ${cat.name} (${cat.count} itens)`);
            });

            // Listar itens
            const items = await this.makeRequest('GET', '/api/items');
            this.items = items.items;
            console.log(`\n🛒 Total de itens: ${this.items.length}`);

            // Mostrar alguns itens de exemplo
            console.log('\n🔍 Alguns itens disponíveis:');
            this.items.slice(0, 5).forEach(item => {
                console.log(`   - ${item.name} (R$ ${item.averagePrice})`);
            });

            return true;
        } catch (error) {
            console.log('❌ Falha ao buscar itens');
            return false;
        }
    }

    async searchItems() {
        console.log('\n=== 5. BUSCANDO ITENS ===');
        try {
            const searchTerm = 'Detergente';
            const results = await this.makeRequest('GET', `/api/search?q=${searchTerm}`);

            console.log(`🔎 Resultados para "${searchTerm}":`);
            if (results.items && results.items.items) {
                results.items.items.slice(0, 3).forEach(item => {
                    console.log(`   - ${item.name} (${item.category}) - R$ ${item.averagePrice}`);
                });
            }
            return true;
        } catch (error) {
            console.log('❌ Falha na busca');
            return false;
        }
    }

    async createShoppingList() {
        console.log('\n=== 6. CRIANDO LISTA DE COMPRAS ===');
        const listData = {
            name: 'Lista Semanal de Compras',
            description: 'Compras para a semana toda'
        };

        try {
            const list = await this.makeRequest('POST', '/api/lists', listData, true);
            console.log('✅ Lista criada com sucesso!');
            console.log('   Nome:', list.name);
            console.log('   ID:', list.id);
            this.lists.push(list);
            return list.id;
        } catch (error) {
            console.log('❌ Falha ao criar lista');
            return null;
        }
    }

    async addItemsToList(listId) {
        console.log('\n=== 7. ADICIONANDO ITENS À LISTA ===');

        if (!this.items || this.items.length === 0) {
            console.log('⚠️  Nenhum item disponível para adicionar');
            return false;
        }

        // Selecionar alguns itens para adicionar
        const itemsToAdd = this.items.slice(0, 3);
        let successCount = 0;

        for (const item of itemsToAdd) {
            try {
                const itemData = {
                    itemId: item.id,
                    quantity: Math.floor(Math.random() * 3) + 1, // 1-3 unidades
                    notes: `Precisamos de ${item.name}`
                };

                await this.makeRequest('POST', `/api/lists/${listId}/items`, itemData, true);
                console.log(`   ✅ Adicionado: ${item.name} (${itemData.quantity}x)`);
                successCount++;
                await this.delay(500); // Pequeno delay entre requisições
            } catch (error) {
                console.log(`   ❌ Falha ao adicionar: ${item.name}`);
            }
        }

        console.log(`\n📊 Itens adicionados: ${successCount}/${itemsToAdd.length}`);
        return successCount > 0;
    }

    async viewDashboard() {
        console.log('\n=== 8. VISUALIZANDO DASHBOARD ===');
        try {
            // Buscar apenas as listas
            const lists = await this.makeRequest('GET', '/api/lists', null, true);

            console.log('📊 DASHBOARD');
            console.log('📋 Total de listas:', lists.length);

            let totalItems = 0;
            let totalValue = 0;

            lists.forEach(list => {
                totalItems += list.items.length;
                totalValue += list.summary?.estimatedTotal || 0;
                console.log(`   - ${list.name}: ${list.items.length} itens (R$ ${list.summary?.estimatedTotal?.toFixed(2) || '0.00'})`);
            });

            console.log('🛒 Total de itens em todas listas:', totalItems);
            console.log('💰 Valor total estimado: R$', totalValue.toFixed(2));

            return true;
        } catch (error) {
            console.log('❌ Falha ao carregar dashboard simplificado:', error.message);
            return false;
        }
    }

    async viewListSummary(listId) {
        console.log('\n=== 9. RESUMO DA LISTA ===');
        try {
            const summary = await this.makeRequest('GET', `/api/lists/${listId}/summary`, null, true);

            console.log('📋 RESUMO DA LISTA:');
            console.log('   Nome:', summary.listName);
            console.log('   Total de itens:', summary.totalItems);
            console.log('   Itens comprados:', summary.purchasedItems);
            console.log('   Valor estimado: R$', summary.summary.estimatedTotal.toFixed(2));

            console.log('\n🛒 Itens da lista:');
            summary.items.slice(0, 5).forEach(item => {
                const status = item.purchased ? '✅' : '⏳';
                console.log(`   ${status} ${item.quantity}x ${item.itemName} - R$ ${(item.estimatedPrice * item.quantity).toFixed(2)}`);
            });

            return true;
        } catch (error) {
            console.log('❌ Falha ao carregar resumo da lista');
            return false;
        }
    }

    async run() {
        console.log('🚀 INICIANDO DEMONSTRAÇÃO DO SISTEMA');
        console.log('=====================================\n');

        try {
            // Testar conexão básica
            if (!(await this.testHealth())) return;
            if (!(await this.testRegistry())) return;

            // Autenticação
            if (!(await this.registerUser())) return;

            // Navegar e buscar itens
            await this.browseItems();
            await this.searchItems();

            // Gerenciamento de listas
            const listId = await this.createShoppingList();
            if (listId) {
                await this.addItemsToList(listId);
                await this.viewListSummary(listId);
            }

            // Dashboard final
            await this.viewDashboard();

            console.log('\n=====================================');
            console.log('🎉 DEMONSTRAÇÃO CONCLUÍDA COM SUCESSO!');
            console.log('=====================================');
            console.log('\n💡 Dica: Use o token abaixo para fazer outras requisições:');
            console.log('Token:', authToken);

        } catch (error) {
            console.error('❌ Erro durante a demonstração:', error.message);
        }
    }
}

// Executar a demonstração
const demo = new ClientDemo();

// Tratamento de erros não capturados
process.on('unhandledRejection', (error) => {
    console.error('Erro não tratado:', error.message);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('Exceção não capturada:', error.message);
    process.exit(1);
});

// Executar
demo.run().catch(console.error);