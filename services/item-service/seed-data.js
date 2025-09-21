const JsonDatabase = require('../../shared/JsonDatabase');
const path = require('path');

const seedItems = async () => {
    const dbPath = path.join(__dirname, 'database');
    const itemsDb = new JsonDatabase(dbPath, 'items');
    const categoriesDb = new JsonDatabase(dbPath, 'categories');
    
    // Verificar se já existem itens
    const existingItems = await itemsDb.find();
    if (existingItems.length > 0) {
        console.log('Já existem itens no banco. Pulando seed.');
        return;
    }
    
    console.log('Populando banco com dados iniciais...');
    
    const sampleItems = [
        // Alimentos (5 itens)
        {
            name: 'Arroz Integral',
            category: 'Alimentos',
            brand: 'Tio João',
            unit: 'kg',
            averagePrice: 8.50,
            barcode: '7891000315507',
            description: 'Arroz integral tipo 1'
        },
        {
            name: 'Feijão Carioca',
            category: 'Alimentos',
            brand: 'Camil',
            unit: 'kg',
            averagePrice: 7.90,
            barcode: '7891000053507',
            description: 'Feijão carioca especial'
        },
        {
            name: 'Açúcar Refinado',
            category: 'Alimentos',
            brand: 'União',
            unit: 'kg',
            averagePrice: 4.20,
            barcode: '7891000053408',
            description: 'Açúcar refinado premium'
        },
        {
            name: 'Macarrão Espaguete',
            category: 'Alimentos',
            brand: 'Renata',
            unit: 'g',
            averagePrice: 3.50,
            barcode: '7891000053309',
            description: 'Macarrão espaguete nº 8'
        },
        {
            name: 'Óleo de Soja',
            category: 'Alimentos',
            brand: 'Liza',
            unit: 'ml',
            averagePrice: 6.80,
            barcode: '7891000053200',
            description: 'Óleo de soja refinado'
        },
        
        // Limpeza (4 itens)
        {
            name: 'Detergente Líquido',
            category: 'Limpeza',
            brand: 'Ypê',
            unit: 'ml',
            averagePrice: 2.50,
            barcode: '7891000053101',
            description: 'Detergente líquido neutro'
        },
        {
            name: 'Sabão em Pó',
            category: 'Limpeza',
            brand: 'Omo',
            unit: 'g',
            averagePrice: 12.90,
            barcode: '7891000053002',
            description: 'Sabão em pó multiação'
        },
        {
            name: 'Água Sanitária',
            category: 'Limpeza',
            brand: 'Qboa',
            unit: 'ml',
            averagePrice: 5.40,
            barcode: '7891000052906',
            description: 'Água sanitária concentrada'
        },
        {
            name: 'Desinfetante',
            category: 'Limpeza',
            brand: 'Pinho Sol',
            unit: 'ml',
            averagePrice: 8.20,
            barcode: '7891000052807',
            description: 'Desinfetante pinho'
        },
        
        // Higiene (4 itens)
        {
            name: 'Sabonete',
            category: 'Higiene',
            brand: 'Dove',
            unit: 'un',
            averagePrice: 2.80,
            barcode: '7891000052708',
            description: 'Sabonete hidratante'
        },
        {
            name: 'Shampoo',
            category: 'Higiene',
            brand: 'Head & Shoulders',
            unit: 'ml',
            averagePrice: 15.90,
            barcode: '7891000052609',
            description: 'Shampoo anticaspa'
        },
        {
            name: 'Pasta de Dente',
            category: 'Higiene',
            brand: 'Colgate',
            unit: 'g',
            averagePrice: 4.50,
            barcode: '7891000052500',
            description: 'Pasta dental total 12'
        },
        {
            name: 'Papel Higiênico',
            category: 'Higiene',
            brand: 'Neve',
            unit: 'un',
            averagePrice: 9.80,
            barcode: '7891000052401',
            description: 'Papel higiênico folha dupla'
        },
        
        // Bebidas (4 itens)
        {
            name: 'Refrigerante Coca-Cola',
            category: 'Bebidas',
            brand: 'Coca-Cola',
            unit: 'ml',
            averagePrice: 7.50,
            barcode: '7891000052302',
            description: 'Refrigerante cola 2L'
        },
        {
            name: 'Suco de Laranja',
            category: 'Bebidas',
            brand: 'Del Valle',
            unit: 'ml',
            averagePrice: 6.20,
            barcode: '7891000052203',
            description: 'Suco integral de laranja'
        },
        {
            name: 'Água Mineral',
            category: 'Bebidas',
            brand: 'Crystal',
            unit: 'ml',
            averagePrice: 2.00,
            barcode: '7891000052104',
            description: 'Água mineral sem gás'
        },
        {
            name: 'Cerveja Heineken',
            category: 'Bebidas',
            brand: 'Heineken',
            unit: 'ml',
            averagePrice: 5.90,
            barcode: '7891000052005',
            description: 'Cerveja pilsen lata 350ml'
        },
        
        // Padaria (3 itens)
        {
            name: 'Pão Francês',
            category: 'Padaria',
            brand: 'Padaria Pão Quente',
            unit: 'un',
            averagePrice: 0.60,
            barcode: '7891000051909',
            description: 'Pão francês tradicional'
        },
        {
            name: 'Bolo de Chocolate',
            category: 'Padaria',
            brand: 'Visconti',
            unit: 'g',
            averagePrice: 25.90,
            barcode: '7891000051800',
            description: 'Bolo de chocolate premium'
        },
        {
            name: 'Biscoito Recheado',
            category: 'Padaria',
            brand: 'Bono',
            unit: 'g',
            averagePrice: 3.20,
            barcode: '7891000051701',
            description: 'Biscoito recheado chocolate'
        }
    ];
    
    // Adicionar itens ao banco
    for (const itemData of sampleItems) {
        await itemsDb.create({
            ...itemData,
            id: itemData.barcode, // Usar barcode como ID
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }
    
    console.log(`Adicionados ${sampleItems.length} itens ao banco de dados`);
    
    // Criar categorias
    const categories = [
        { id: 'alimentos', name: 'Alimentos', count: 5 },
        { id: 'limpeza', name: 'Limpeza', count: 4 },
        { id: 'higiene', name: 'Higiene', count: 4 },
        { id: 'bebidas', name: 'Bebidas', count: 4 },
        { id: 'padaria', name: 'Padaria', count: 3 }
    ];
    
    for (const category of categories) {
        await categoriesDb.create(category);
    }
    
    console.log('Dados iniciais populados com sucesso!');
};

module.exports = seedItems;