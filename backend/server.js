const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');
const https = require('https');
const http = require('http');

const app = express();
const PORT = 10001;

// 中間件
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 確保上傳目錄存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// 數據庫連接
const db = new Database(path.join(__dirname, 'arkmall.db'));

// 創建數據庫表
function initDatabase() {
    // 商家表
    db.exec(`
        CREATE TABLE IF NOT EXISTS merchants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            address TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            logo TEXT,
            status TEXT DEFAULT 'pending',
            deposit_paid INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 商品表
    db.exec(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            merchant_id INTEGER,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            price_cny REAL,
            image TEXT,
            category TEXT,
            stock INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active',
            refundable INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (merchant_id) REFERENCES merchants(id)
        )
    `);

    // 訂單表
    db.exec(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_no TEXT UNIQUE NOT NULL,
            user_address TEXT NOT NULL,
            merchant_id INTEGER,
            product_id INTEGER,
            quantity INTEGER DEFAULT 1,
            total_price REAL,
            payment_token TEXT,
            status TEXT DEFAULT 'pending',
            shipping_company TEXT,
            shipping_no TEXT,
            shipping_time DATETIME,
            receive_time DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (merchant_id) REFERENCES merchants(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    `);

    // 用戶地址表
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_addresses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_address TEXT NOT NULL,
            name TEXT,
            phone TEXT,
            address TEXT,
            is_default INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 評價表
    db.exec(`
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER,
            user_address TEXT,
            product_id INTEGER,
            rating INTEGER,
            comment TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    `);

    // 優惠券表
    db.exec(`
        CREATE TABLE IF NOT EXISTS coupons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            merchant_id INTEGER,
            code TEXT UNIQUE NOT NULL,
            discount_type TEXT,
            discount_value REAL,
            min_amount REAL,
            start_time DATETIME,
            end_time DATETIME,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (merchant_id) REFERENCES merchants(id)
        )
    `);

    // 分類表
    db.exec(`
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

// 初始化數據庫
initDatabase();

// 圖片上傳配置
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 3 * 1024 * 1024 // 3MB
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('只允許上傳圖片文件！'), false);
        }
    }
});

// ============ API 路由 ============

// 商家 API
app.post('/api/merchants/register', (req, res) => {
    const { address, name, description, logo } = req.body;
    
    try {
        const stmt = db.prepare('INSERT INTO merchants (address, name, description, logo) VALUES (?, ?, ?, ?)');
        stmt.run(address, name, description, logo);
        
        res.json({ success: true, message: '商家註冊成功，等待審核' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

app.get('/api/merchants', (req, res) => {
    try {
        const merchants = db.prepare('SELECT * FROM merchants WHERE status = ?').all('approved');
        res.json({ success: true, data: merchants });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

app.get('/api/merchants/pending', (req, res) => {
    try {
        const merchants = db.prepare('SELECT * FROM merchants WHERE status = ?').all('pending');
        res.json({ success: true, data: merchants });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

app.put('/api/merchants/:id/approve', (req, res) => {
    const { id } = req.params;
    
    try {
        const stmt = db.prepare('UPDATE merchants SET status = ? WHERE id = ?');
        stmt.run('approved', id);
        
        res.json({ success: true, message: '商家審核通過' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// 商品 API
app.get('/api/products', (req, res) => {
    try {
        const products = db.prepare('SELECT * FROM products WHERE status = ?').all('active');
        res.json({ success: true, data: products });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

app.get('/api/products/:id', (req, res) => {
    const { id } = req.params;
    
    try {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
        res.json({ success: true, data: product });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

app.post('/api/products', (req, res) => {
    const { merchant_id, name, description, price, price_cny, image, category, stock, refundable } = req.body;
    
    try {
        const stmt = db.prepare('INSERT INTO products (merchant_id, name, description, price, price_cny, image, category, stock, refundable) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        stmt.run(merchant_id, name, description, price, price_cny, image, category, stock, refundable);
        
        res.json({ success: true, message: '商品上架成功' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const { name, description, price, price_cny, image, category, stock, refundable } = req.body;
    
    try {
        const stmt = db.prepare('UPDATE products SET name = ?, description = ?, price = ?, price_cny = ?, image = ?, category = ?, stock = ?, refundable = ? WHERE id = ?');
        stmt.run(name, description, price, price_cny, image, category, stock, refundable, id);
        
        res.json({ success: true, message: '商品更新成功' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    
    try {
        const stmt = db.prepare('DELETE FROM products WHERE id = ?');
        stmt.run(id);
        
        res.json({ success: true, message: '商品刪除成功' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// 訂單 API
app.get('/api/orders', (req, res) => {
    try {
        const orders = db.prepare('SELECT * FROM orders').all();
        res.json({ success: true, data: orders });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

app.get('/api/orders/:order_no', (req, res) => {
    const { order_no } = req.params;
    
    try {
        const order = db.prepare('SELECT * FROM orders WHERE order_no = ?').get(order_no);
        res.json({ success: true, data: order });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

app.post('/api/orders', (req, res) => {
    const { user_address, merchant_id, product_id, quantity, total_price, payment_token } = req.body;
    
    try {
        const order_no = 'ORD' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
        
        const stmt = db.prepare('INSERT INTO orders (order_no, user_address, merchant_id, product_id, quantity, total_price, payment_token) VALUES (?, ?, ?, ?, ?, ?, ?)');
        stmt.run(order_no, user_address, merchant_id, product_id, quantity, total_price, payment_token);
        
        res.json({ success: true, order_no: order_no });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

app.put('/api/orders/:order_no/status', (req, res) => {
    const { order_no } = req.params;
    const { status, shipping_company, shipping_no } = req.body;
    
    try {
        let stmt;
        if (status === 'shipped') {
            stmt = db.prepare('UPDATE orders SET status = ?, shipping_company = ?, shipping_no = ?, shipping_time = CURRENT_TIMESTAMP WHERE order_no = ?');
            stmt.run(status, shipping_company, shipping_no, order_no);
        } else if (status === 'received') {
            stmt = db.prepare('UPDATE orders SET status = ?, receive_time = CURRENT_TIMESTAMP WHERE order_no = ?');
            stmt.run(status, order_no);
        } else {
            stmt = db.prepare('UPDATE orders SET status = ? WHERE order_no = ?');
            stmt.run(status, order_no);
        }
        
        res.json({ success: true, message: '訂單狀態更新成功' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// 用戶地址 API
app.get('/api/addresses/:user_address', (req, res) => {
    const { user_address } = req.params;
    
    try {
        const addresses = db.prepare('SELECT * FROM user_addresses WHERE user_address = ?').all(user_address);
        res.json({ success: true, data: addresses });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

app.post('/api/addresses', (req, res) => {
    const { user_address, name, phone, address, is_default } = req.body;
    
    try {
        const stmt = db.prepare('INSERT INTO user_addresses (user_address, name, phone, address, is_default) VALUES (?, ?, ?, ?, ?)');
        stmt.run(user_address, name, phone, address, is_default);
        
        res.json({ success: true, message: '地址添加成功' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

app.put('/api/addresses/:id', (req, res) => {
    const { id } = req.params;
    const { name, phone, address, is_default } = req.body;
    
    try {
        const stmt = db.prepare('UPDATE user_addresses SET name = ?, phone = ?, address = ?, is_default = ? WHERE id = ?');
        stmt.run(name, phone, address, is_default, id);
        
        res.json({ success: true, message: '地址更新成功' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

app.delete('/api/addresses/:id', (req, res) => {
    const { id } = req.params;
    
    try {
        const stmt = db.prepare('DELETE FROM user_addresses WHERE id = ?');
        stmt.run(id);
        
        res.json({ success: true, message: '地址刪除成功' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// 評價 API
app.get('/api/reviews/:product_id', (req, res) => {
    const { product_id } = req.params;
    
    try {
        const reviews = db.prepare('SELECT * FROM reviews WHERE product_id = ?').all(product_id);
        res.json({ success: true, data: reviews });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

app.post('/api/reviews', (req, res) => {
    const { order_id, user_address, product_id, rating, comment } = req.body;
    
    try {
        const stmt = db.prepare('INSERT INTO reviews (order_id, user_address, product_id, rating, comment) VALUES (?, ?, ?, ?, ?)');
        stmt.run(order_id, user_address, product_id, rating, comment);
        
        res.json({ success: true, message: '評價提交成功' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// 優惠券 API
app.get('/api/coupons/:merchant_id', (req, res) => {
    const { merchant_id } = req.params;
    
    try {
        const coupons = db.prepare('SELECT * FROM coupons WHERE merchant_id = ?').all(merchant_id);
        res.json({ success: true, data: coupons });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

app.post('/api/coupons', (req, res) => {
    const { merchant_id, code, discount_type, discount_value, min_amount, start_time, end_time } = req.body;
    
    try {
        const stmt = db.prepare('INSERT INTO coupons (merchant_id, code, discount_type, discount_value, min_amount, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?)');
        stmt.run(merchant_id, code, discount_type, discount_value, min_amount, start_time, end_time);
        
        res.json({ success: true, message: '優惠券創建成功' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// 分類 API
app.get('/api/categories', (req, res) => {
    try {
        const categories = db.prepare('SELECT DISTINCT category FROM products WHERE status = ? AND category IS NOT NULL').all('active');
        res.json({ success: true, data: categories.map(c => c.category) });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// 圖片上傳 API
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.json({ success: false, message: '請選擇圖片' });
    }
    
    const imageUrl = '/uploads/' + req.file.filename;
    res.json({ success: true, url: imageUrl });
});

// 匯率 API
function fetchJson(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const req = protocol.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } 
                catch (e) { reject(new Error('JSON parse failed')); }
            });
        });
        req.on('error', reject);
        req.setTimeout(5000, () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

app.get('/api/rates', async (req, res) => {
    try {
        const bnbData = await fetchJson('https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT');
        const arkData = await fetchJson('https://api.dexscreener.com/latest/dex/pairs/bsc/0xCAaF3c41a40103a23Eeaa4BbA468AF3cF5b0e0D8');
        const cnyData = await fetchJson('https://api.exchangerate-api.com/v4/latest/USD');

        let arkPrice = 7.80;
        if (arkData && arkData.pairs && arkData.pairs.length > 0) {
            arkPrice = parseFloat(arkData.pairs[0].priceUsd);
        }

        let usdCny = 6.80;
        if (cnyData && cnyData.rates && cnyData.rates.CNY) {
            usdCny = parseFloat(cnyData.rates.CNY);
        }

        const rates = {
            bnb: bnbData ? parseFloat(bnbData.price) : 580.52,
            ark: arkPrice,
            usdt: 1,
            usdCny: usdCny
        };

        console.log('Rates:', rates);
        res.json({ success: true, data: rates });
    } catch (error) {
        console.error('Rates error:', error);
        res.json({ success: true, data: { bnb: 580.52, ark: 7.80, usdt: 1, usdCny: 6.80 } });
    }
});

// 搜索 API
app.get('/api/search', (req, res) => {
    const { keyword } = req.query;
    
    try {
        const products = db.prepare('SELECT * FROM products WHERE (name LIKE ? OR description LIKE ?) AND status = ?').all(`%${keyword}%`, `%${keyword}%`, 'active');
        const merchants = db.prepare('SELECT * FROM merchants WHERE (name LIKE ? OR description LIKE ?) AND status = ?').all(`%${keyword}%`, `%${keyword}%`, 'approved');
        
        res.json({ success: true, products: products, merchants: merchants });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// 啟動服務器
app.listen(PORT, () => {
    console.log(`ARK Mall 後端 API 運行在 http://localhost:${PORT}`);
});
