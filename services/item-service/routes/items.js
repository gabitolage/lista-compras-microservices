const express = require('express');
const { v4: uuidv4 } = require('uuid');
const JsonDatabase = require('../../../shared/JsonDatabase');
const path = require('path');

const router = express.Router();
const dbPath = path.join(__dirname, '../database');
const itemsDb = new JsonDatabase(dbPath, 'items');

// GET /items - Listar itens com filtros
router.get('/', async (req, res, next) => {
    try {
        const { category, brand, page = 1, limit = 20 } = req.query;
        
        let filter = {};
        if (category) filter.category = category;
        if (brand) filter.brand = brand;
        
        const options = {
            skip: (page - 1) * limit,
            limit: parseInt(limit)
        };
        
        const items = await itemsDb.find(filter, options);
        const total = await itemsDb.count(filter);
        
        res.json({
            items,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Erro ao buscar itens:', error);
        next(error);
    }
});

// GET /items/:id - Buscar item específico
router.get('/:id', async (req, res, next) => {
    try {
        const item = await itemsDb.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ error: 'Item não encontrado' });
        }
        res.json(item);
    } catch (error) {
        console.error('Erro ao buscar item:', error);
        next(error);
    }
});

// POST /items - Criar novo item
router.post('/', async (req, res, next) => {
    try {
        const { name, category, brand, unit, averagePrice, barcode, description } = req.body;
        
        // Validações
        if (!name || !category) {
            return res.status(400).json({ error: 'Nome e categoria são obrigatórios' });
        }
        
        // Verificar se item com mesmo código de barras já existe
        if (barcode) {
            const existingItem = await itemsDb.findOne({ barcode });
            if (existingItem) {
                return res.status(409).json({ error: 'Item com este código de barras já existe' });
            }
        }
        
        const item = {
            id: uuidv4(),
            name,
            category,
            brand: brand || '',
            unit: unit || 'un',
            averagePrice: averagePrice || 0,
            barcode: barcode || '',
            description: description || '',
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        const createdItem = await itemsDb.create(item);
        res.status(201).json(createdItem);
    } catch (error) {
        console.error('Erro ao criar item:', error);
        next(error);
    }
});

// PUT /items/:id - Atualizar item
router.put('/:id', async (req, res, next) => {
    try {
        const { name, category, brand, unit, averagePrice, barcode, description, active } = req.body;
        
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (category !== undefined) updates.category = category;
        if (brand !== undefined) updates.brand = brand;
        if (unit !== undefined) updates.unit = unit;
        if (averagePrice !== undefined) updates.averagePrice = averagePrice;
        if (barcode !== undefined) updates.barcode = barcode;
        if (description !== undefined) updates.description = description;
        if (active !== undefined) updates.active = active;
        
        const updatedItem = await itemsDb.update(req.params.id, updates);
        if (!updatedItem) {
            return res.status(404).json({ error: 'Item não encontrado' });
        }
        
        res.json(updatedItem);
    } catch (error) {
        console.error('Erro ao atualizar item:', error);
        next(error);
    }
});

module.exports = router;