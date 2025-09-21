const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'user-service-secret-key-puc-minas';

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ error: 'Token de acesso necessário' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        console.error('Erro na autenticação:', error);
        return res.status(403).json({ error: 'Token inválido' });
    }
};

const authorizeListAccess = async (req, res, next) => {
    try {
        const listId = req.params.id;
        const listsDb = req.app.get('listsDb');
        const list = await listsDb.findById(listId);

        if (!list) {
            return res.status(404).json({ error: 'Lista não encontrada' });
        }

        if (list.userId !== req.userId) {
            return res.status(403).json({ error: 'Acesso negado a esta lista' });
        }

        req.list = list;
        next();
    } catch (error) {
        console.error('Erro na autorização:', error);
        next(error);
    }
};

module.exports = { authenticateToken, authorizeListAccess };