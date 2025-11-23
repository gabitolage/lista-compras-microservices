const axios = require('axios');

function resolveGetItemService() {
    try {
        const mod = require('../server');
        if (mod && typeof mod.getItemService === 'function') return mod.getItemService;
        return null;
    } catch (e) {
        return null;
    }
}

class ItemServiceClient {
    static async getItem(itemId) {
        try {
            // Resolver a função getItemService em tempo de execução para evitar circular dependency
            let service = null;
            const getItemService = resolveGetItemService();
            if (getItemService) {
                try {
                    service = await getItemService();
                } catch (e) {
                    console.warn('getItemService() falhou:', e && e.message ? e.message : e);
                }
            }

            // Se não obtivemos via getItemService (ex.: circular require), tentar o registry diretamente
            if (!service) {
                try {
                    const registry = require('../../../shared/serviceRegistry');
                    service = registry.discover('item-service');
                } catch (e) {
                    // não crítico aqui, faremos throw abaixo
                }
            }

            if (!service) {
                throw new Error('Item Service não disponível');
            }

            const url = `${service.url}/items/${itemId}`;
            let lastError = null;
            // tentar duas vezes antes de falhar (pequeno retry para instabilidades locais)
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    console.log(`ItemServiceClient: buscando item ${itemId} em ${url} (attempt ${attempt})`);
                    const response = await axios.get(url, { timeout: 5000 });
                    if (response && response.status >= 200 && response.status < 300) {
                        return response.data;
                    }
                    lastError = new Error(`Status ${response.status} ${response.statusText}`);
                } catch (err) {
                    lastError = err;
                    console.warn(`getItem attempt ${attempt} failed for ${url}: ${err && err.message ? err.message : err}`);
                    if (attempt < 2) await new Promise(r => setTimeout(r, 200));
                }
            }
            // Tentativa de fallback direto para o item-service em 127.0.0.1:3003
            try {
                const fallbackUrl = `http://127.0.0.1:3003/items/${itemId}`;
                console.warn('getItem: tentando fallback direto em', fallbackUrl);
                const resp = await axios.get(fallbackUrl, { timeout: 4000 });
                if (resp && resp.status >= 200 && resp.status < 300) return resp.data;
            } catch (fbErr) {
                console.warn('getItem fallback também falhou:', fbErr && fbErr.message ? fbErr.message : fbErr);
            }

            throw lastError;
        } catch (error) {
            console.error('Erro ao buscar item:', error && error.stack ? error.stack : error);
            throw new Error(`Não foi possível buscar o item: ${error && error.message ? error.message : String(error)}`);
        }
    }

    static async searchItems(query) {
        try {
            const service = await getItemService();
            if (!service) {
                throw new Error('Item Service não disponível');
            }

            const response = await axios.get(`${service.url}/search?q=${encodeURIComponent(query)}`, {
                timeout: 5000
            });

            return response.data;
        } catch (error) {
            console.error('Erro ao buscar itens:', error.message);
            throw new Error(`Não foi possível buscar itens: ${error.message}`);
        }
    }

    static async getItemPriceEstimate(itemId) {
        try {
            const item = await this.getItem(itemId);
            const val = parseFloat(item && (item.averagePrice || item.average_price || item.price));
            return isNaN(val) ? 0 : val;
        } catch (error) {
            console.warn('Não foi possível obter preço do item, usando valor padrão 0');
            return 0;
        }
    }
}

module.exports = ItemServiceClient;