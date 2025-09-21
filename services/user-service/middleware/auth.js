const jwt = require('jsonwebtoken');
const JsonDatabase = require('../../../shared/JsonDatabase');
const path = require('path');

const dbPath = path.join(__dirname, '../database');
const usersDb = new JsonDatabase(dbPath, 'users');

const JWT_SECRET = process.env.JWT_SECRET || 'user-service-secret-key-puc-minas';

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ error: 'Token de acesso necessário' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await usersDb.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({ error: 'Usuário não encontrado' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Erro na autenticação:', error);
        return res.status(403).json({ error: 'Token inválido' });
    }
};

module.exports = { authenticateToken };