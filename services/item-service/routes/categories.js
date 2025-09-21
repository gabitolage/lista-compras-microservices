const express = require('express');
const JsonDatabase = require('../../../shared/JsonDatabase');
const path = require('path');

const router = express.Router();
const dbPath = path.join(__dirname, '../database');
const itemsDb = new JsonDatabase(dbPath, 'items');
const categoriesDb = new JsonDatabase(dbPath, 'categories');

// GET /categories - Listar categorias disponíveis
router.get('/', async (req, res, next) => {
    try {
        // Buscar categorias do banco ou extrair dos itens
        let categories = await categoriesDb.find();
        
        if (categories.length === 0) {
            // Se não houver categorias no banco, extrair dos itens
            const items = await itemsDb.find();
            const uniqueCategories = [...new Set(items.map(item => item.category))];
            
            categories = uniqueCategories.map(category => ({
                id: category.toLowerCase().replace(/\s+/g, '-'),
                name: category,
                count: items.filter(item => item.category === category).length
            }));
            
            // Salvar categorias no banco
            for (const category of categories) {
                await categoriesDb.create(category);
            }
        }
        
        res.json(categories);
    } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        next(error);
    }
});

module.exports = router;