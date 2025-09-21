const axios = require('axios');
const { getItemService } = require('../server');

class ItemServiceClient {
    static async getItem(itemId) {
        try {
            const service = await getItemService();
            if (!service) {
                throw new Error('Item Service não disponível');
            }

            const response = await axios.get(`${service.url}/items/${itemId}`, {
                timeout: 5000
            });

            return response.data;
        } catch (error) {
            console.error('Erro ao buscar item:', error.message);
            throw new Error(`Não foi possível buscar o item: ${error.message}`);
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
            return item.averagePrice || 0;
        } catch (error) {
            console.warn('Não foi possível obter preço do item, usando valor padrão 0');
            return 0;
        }
    }
}

module.exports = ItemServiceClient;