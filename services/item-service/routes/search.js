const express = require('express');
const JsonDatabase = require('../../../shared/JsonDatabase');
const path = require('path');

const router = express.Router();
const dbPath = path.join(__dirname, '../database');
const itemsDb = new JsonDatabase(dbPath, 'items');

// GET /search?q=termo - Buscar itens por nome
router.get('/', async (req, res, next) => {
    try {
        const { q, category, page = 1, limit = 20 } = req.query;
        
        if (!q) {
            return res.status(400).json({ error: 'Parâmetro de busca (q) é obrigatório' });
        }
        
        // Buscar itens que correspondam ao termo
        const items = await itemsDb.search(q, ['name', 'brand', 'description', 'category']);
        
        // Aplicar filtro de categoria se especificado
        let filteredItems = items;
        if (category) {
            filteredItems = items.filter(item => 
                item.category.toLowerCase().includes(category.toLowerCase())
            );
        }
        
        // Paginação
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedItems = filteredItems.slice(startIndex, endIndex);
        
        res.json({
            items: paginatedItems,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: filteredItems.length,
                pages: Math.ceil(filteredItems.length / limit)
            },
            searchTerm: q
        });
    } catch (error) {
        console.error('Erro na busca:', error);
        next(error);
    }
});

module.exports = router;