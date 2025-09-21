const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const JsonDatabase = require('../../../shared/JsonDatabase');
const path = require('path');

const router = express.Router();
const dbPath = path.join(__dirname, '../database');
const usersDb = new JsonDatabase(dbPath, 'users');

const JWT_SECRET = process.env.JWT_SECRET || 'user-service-secret-key-puc-minas';
const SALT_ROUNDS = 12;

// POST /auth/register - Registrar novo usuário
router.post('/register', async (req, res, next) => {
    try {
        const { email, username, password, firstName, lastName, preferences } = req.body;

        // Validações
        if (!email || !username || !password || !firstName || !lastName) {
            return res.status(400).json({ 
                error: 'Email, username, password, firstName e lastName são obrigatórios' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                error: 'Senha deve ter pelo menos 6 caracteres' 
            });
        }

        // Verificar se email já existe
        const existingEmail = await usersDb.findOne({ email });
        if (existingEmail) {
            return res.status(409).json({ error: 'Email já cadastrado' });
        }

        // Verificar se username já existe
        const existingUsername = await usersDb.findOne({ username });
        if (existingUsername) {
            return res.status(409).json({ error: 'Username já cadastrado' });
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Criar usuário
        const user = {
            id: uuidv4(),
            email,
            username,
            password: hashedPassword,
            firstName,
            lastName,
            preferences: preferences || {
                defaultStore: '',
                currency: 'BRL'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const createdUser = await usersDb.create(user);

        // Gerar token JWT
        const token = jwt.sign(
            { 
                userId: createdUser.id, 
                email: createdUser.email 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Remover senha da resposta
        const { password: _, ...userWithoutPassword } = createdUser;

        res.status(201).json({
            message: 'Usuário criado com sucesso',
            user: userWithoutPassword,
            token
        });

    } catch (error) {
        console.error('Erro no registro:', error);
        next(error);
    }
});

// POST /auth/login - Login de usuário
router.post('/login', async (req, res, next) => {
    try {
        const { email, username, password } = req.body;

        // Validações
        if (!password || (!email && !username)) {
            return res.status(400).json({ 
                error: 'Email/username e password são obrigatórios' 
            });
        }

        // Buscar usuário por email ou username
        let user;
        if (email) {
            user = await usersDb.findOne({ email });
        } else {
            user = await usersDb.findOne({ username });
        }

        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        // Verificar senha
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        // Gerar token JWT
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Remover senha da resposta
        const { password: _, ...userWithoutPassword } = user;

        res.json({
            message: 'Login realizado com sucesso',
            user: userWithoutPassword,
            token
        });

    } catch (error) {
        console.error('Erro no login:', error);
        next(error);
    }
});

module.exports = router;