const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const JsonDatabase = require('../../../shared/JsonDatabase');
const path = require('path');

const router = express.Router();
const dbPath = path.join(__dirname, '../database');
const usersDb = new JsonDatabase(dbPath, 'users');

// GET /users/:id - Buscar usuário por ID
router.get('/:id', authenticateToken, async (req, res, next) => {
    try {
        const userId = req.params.id;

        // Verificar se o usuário está acessando seus próprios dados
        if (req.user.id !== userId) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const user = await usersDb.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Remover senha da resposta
        const { password, ...userWithoutPassword } = user;

        res.json(userWithoutPassword);

    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        next(error);
    }
});

// PUT /users/:id - Atualizar usuário
router.put('/:id', authenticateToken, async (req, res, next) => {
    try {
        const userId = req.params.id;

        // Verificar se o usuário está atualizando seus próprios dados
        if (req.user.id !== userId) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const { firstName, lastName, preferences } = req.body;

        // Campos que podem ser atualizados
        const updates = {};
        if (firstName !== undefined) updates.firstName = firstName;
        if (lastName !== undefined) updates.lastName = lastName;
        if (preferences !== undefined) updates.preferences = preferences;

        // Atualizar usuário
        const updatedUser = await usersDb.update(userId, updates);
        if (!updatedUser) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Remover senha da resposta
        const { password, ...userWithoutPassword } = updatedUser;

        res.json({
            message: 'Usuário atualizado com sucesso',
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        next(error);
    }
});

module.exports = router;