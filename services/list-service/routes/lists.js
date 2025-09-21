const express = require('express');
const { v4: uuidv4 } = require('uuid');
const JsonDatabase = require('../../../shared/JsonDatabase');
const path = require('path');
const { authenticateToken, authorizeListAccess } = require('../middleware/auth');
const ItemServiceClient = require('../utils/itemServiceClient');

const router = express.Router();
const dbPath = path.join(__dirname, '../database');
const listsDb = new JsonDatabase(dbPath, 'lists');

// Configurar listsDb para uso no middleware
router.use((req, res, next) => {
    req.app.set('listsDb', listsDb);
    next();
});

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// POST /lists - Criar nova lista
router.post('/', async (req, res, next) => {
    try {
        const { name, description } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Nome da lista é obrigatório' });
        }

        const list = {
            id: uuidv4(),
            userId: req.userId,
            name,
            description: description || '',
            status: 'active',
            items: [],
            summary: {
                totalItems: 0,
                purchasedItems: 0,
                estimatedTotal: 0
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const createdList = await listsDb.create(list);
        res.status(201).json(createdList);
    } catch (error) {
        console.error('Erro ao criar lista:', error);
        next(error);
    }
});

// GET /lists - Listar listas do usuário
router.get('/', async (req, res, next) => {
    try {
        const lists = await listsDb.find({ userId: req.userId });
        res.json(lists);
    } catch (error) {
        console.error('Erro ao buscar listas:', error);
        next(error);
    }
});

// GET /lists/:id - Buscar lista específica
router.get('/:id', authorizeListAccess, async (req, res, next) => {
    try {
        res.json(req.list);
    } catch (error) {
        console.error('Erro ao buscar lista:', error);
        next(error);
    }
});

// PUT /lists/:id - Atualizar lista
router.put('/:id', authorizeListAccess, async (req, res, next) => {
    try {
        const { name, description, status } = req.body;
        
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (status !== undefined) updates.status = status;
        updates.updatedAt = new Date().toISOString();

        const updatedList = await listsDb.update(req.params.id, updates);
        res.json(updatedList);
    } catch (error) {
        console.error('Erro ao atualizar lista:', error);
        next(error);
    }
});

// DELETE /lists/:id - Deletar lista
router.delete('/:id', authorizeListAccess, async (req, res, next) => {
    try {
        await listsDb.delete(req.params.id);
        res.json({ message: 'Lista deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar lista:', error);
        next(error);
    }
});

// POST /lists/:id/items - Adicionar item à lista
router.post('/:id/items', authorizeListAccess, async (req, res, next) => {
    try {
        const { itemId, quantity, notes } = req.body;
        
        if (!itemId || !quantity) {
            return res.status(400).json({ error: 'itemId e quantity são obrigatórios' });
        }

        // Buscar informações do item no Item Service
        let itemInfo;
        try {
            itemInfo = await ItemServiceClient.getItem(itemId);
        } catch (error) {
            console.warn('Não foi possível buscar informações do item:', error.message);
            itemInfo = { name: 'Item Desconhecido', unit: 'un', averagePrice: 0 };
        }

        const newItem = {
            itemId,
            itemName: itemInfo.name || 'Item Desconhecido',
            quantity: parseFloat(quantity),
            unit: itemInfo.unit || 'un',
            estimatedPrice: itemInfo.averagePrice || 0,
            purchased: false,
            notes: notes || '',
            addedAt: new Date().toISOString()
        };

        const list = req.list;
        list.items.push(newItem);
        list.updatedAt = new Date().toISOString();

        // Atualizar resumo
        await updateListSummary(list);

        const updatedList = await listsDb.update(list.id, list);
        res.status(201).json(updatedList);
    } catch (error) {
        console.error('Erro ao adicionar item:', error);
        next(error);
    }
});

// PUT /lists/:id/items/:itemId - Atualizar item na lista
router.put('/:id/items/:itemId', authorizeListAccess, async (req, res, next) => {
    try {
        const { quantity, purchased, notes } = req.body;
        const itemId = req.params.itemId;

        const list = req.list;
        const itemIndex = list.items.findIndex(item => item.itemId === itemId);
        
        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Item não encontrado na lista' });
        }

        if (quantity !== undefined) list.items[itemIndex].quantity = parseFloat(quantity);
        if (purchased !== undefined) list.items[itemIndex].purchased = purchased;
        if (notes !== undefined) list.items[itemIndex].notes = notes;

        list.updatedAt = new Date().toISOString();

        // Atualizar resumo
        await updateListSummary(list);

        const updatedList = await listsDb.update(list.id, list);
        res.json(updatedList);
    } catch (error) {
        console.error('Erro ao atualizar item:', error);
        next(error);
    }
});

// DELETE /lists/:id/items/:itemId - Remover item da lista
router.delete('/:id/items/:itemId', authorizeListAccess, async (req, res, next) => {
    try {
        const itemId = req.params.itemId;

        const list = req.list;
        const itemIndex = list.items.findIndex(item => item.itemId === itemId);
        
        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Item não encontrado na lista' });
        }

        list.items.splice(itemIndex, 1);
        list.updatedAt = new Date().toISOString();

        // Atualizar resumo
        await updateListSummary(list);

        const updatedList = await listsDb.update(list.id, list);
        res.json(updatedList);
    } catch (error) {
        console.error('Erro ao remover item:', error);
        next(error);
    }
});

// GET /lists/:id/summary - Resumo da lista
router.get('/:id/summary', authorizeListAccess, async (req, res, next) => {
    try {
        const list = req.list;
        await updateListSummary(list); // Atualizar resumo antes de retornar
        
        res.json({
            listId: list.id,
            listName: list.name,
            summary: list.summary,
            totalItems: list.items.length,
            purchasedItems: list.items.filter(item => item.purchased).length,
            items: list.items
        });
    } catch (error) {
        console.error('Erro ao gerar resumo:', error);
        next(error);
    }
});

// Função auxiliar para atualizar o resumo da lista
async function updateListSummary(list) {
    let estimatedTotal = 0;
    let purchasedItems = 0;

    for (const item of list.items) {
        // Se o preço estimado for 0, tentar buscar do Item Service
        if (item.estimatedPrice === 0) {
            try {
                item.estimatedPrice = await ItemServiceClient.getItemPriceEstimate(item.itemId);
            } catch (error) {
                console.warn('Não foi possível atualizar preço do item:', error.message);
            }
        }

        estimatedTotal += item.estimatedPrice * item.quantity;
        if (item.purchased) {
            purchasedItems++;
        }
    }

    list.summary = {
        totalItems: list.items.length,
        purchasedItems,
        estimatedTotal: parseFloat(estimatedTotal.toFixed(2))
    };

    // Se a lista foi atualizada, salvar no banco
    if (list.id) {
        try {
            await listsDb.update(list.id, list);
        } catch (error) {
            console.error('Erro ao salvar lista atualizada:', error);
        }
    }
}

module.exports = router;