const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');

// ============ Middleware ============
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(PUBLIC_DIR));

// ============ JSON DB ============
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readDB(name) {
  const f = path.join(DATA_DIR, name + '.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : [];
}
function writeDB(name, data) {
  fs.writeFileSync(path.join(DATA_DIR, name + '.json'), JSON.stringify(data, null, 2));
}
function nextId(items) { return items.length ? Math.max(...items.map(i => i.id)) + 1 : 1; }

// 初始化示例數據
if (readDB('merchants').length === 0) {
  writeDB('merchants', [
    { id: 1, name: 'ARK 官方商城', description: 'ARK 生態官方商品', tp_address: '0xARK0000000000000000000000000000000000', qrcode_url: '', status: 'approved', created_at: new Date().toISOString() },
    { id: 2, name: '加密周邊店', description: '加密貨幣周邊商品', tp_address: '0xCRYPTO00000000000000000000000000000000', qrcode_url: '', status: 'approved', created_at: new Date().toISOString() }
  ]);
  writeDB('products', [
    { id: 1, merchant_id: 1, name: 'ARK Logo T-Shirt', description: '純棉 ARK 標誌 T 恤', price: 29.99, image_url: 'https://picsum.photos/400/300?random=1', category: '周邊', stock: 100, status: 'active', created_at: new Date().toISOString() },
    { id: 2, merchant_id: 1, name: 'ARK 限量版帽子', description: 'ARK 品牌限量棒球帽', price: 19.99, image_url: 'https://picsum.photos/400/300?random=2', category: '周邊', stock: 50, status: 'active', created_at: new Date().toISOString() },
    { id: 3, merchant_id: 2, name: '加密貨幣安全手冊', description: '數位資產安全指南', price: 9.99, image_url: 'https://picsum.photos/400/300?random=3', category: '書籍', stock: 200, status: 'active', created_at: new Date().toISOString() },
    { id: 4, merchant_id: 2, name: '硬件錢包保護殼', description: '通用硬件錢包保護套', price: 14.99, image_url: 'https://picsum.photos/400/300?random=4', category: '配件', stock: 80, status: 'active', created_at: new Date().toISOString() }
  ]);
  writeDB('orders', []);
}

// ============ Upload ============
const storage = multer.diskStorage({
  destination: (r, f, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (r, f, cb) => cb(null, Date.now() + '-' + f.originalname)
});
const upload = multer({ storage });

// ============ Price Helpers ============
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { timeout: 10000 }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

let prices = { bnb: 580, ark: 7.80, usdCny: 6.80, updatedAt: 0 };

async function getPrices() {
  if (Date.now() - prices.updatedAt < 60000 && prices.updatedAt > 0) return prices;
  try {
    const b = await fetchJSON('https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT');
    if (b && b.price) prices.bnb = parseFloat(b.price);
  } catch(e) {}
  try {
    const a = await fetchJSON('https://api.dexscreener.com/latest/dex/pairs/bsc/0xCAaF3c41a40103a23Eeaa4BbA468AF3cF5b0e0D8');
    if (a && a.pairs && a.pairs[0]) prices.ark = parseFloat(a.pairs[0].priceUsd);
  } catch(e) {}
  prices.updatedAt = Date.now();
  return prices;
}

// ============ API: Health ============
app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ============ API: Prices ============
app.get('/api/prices', async (req, res) => {
  try { res.json(await getPrices()); } catch(e) { res.json(prices); }
});

// ============ API: Products ============
app.get('/api/products', (req, res) => {
  const all = readDB('products');
  const mers = readDB('merchants');
  res.json(all.map(p => {
    const m = mers.find(x => x.id === p.merchant_id) || {};
    return { ...p, merchant_name: m.name || '', merchant_tp_address: m.tp_address || '', merchant_qrcode: m.qrcode_url || '' };
  }));
});

app.get('/api/products/:id', (req, res) => {
  const all = readDB('products');
  const mers = readDB('merchants');
  const p = all.find(x => x.id === parseInt(req.params.id));
  if (!p) return res.status(404).json({ error: 'Not found' });
  const m = mers.find(x => x.id === p.merchant_id) || {};
  res.json({ ...p, merchant_name: m.name || '', merchant_tp_address: m.tp_address || '', merchant_qrcode: m.qrcode_url || '' });
});

app.post('/api/products', (req, res) => {
  const { name, description, price, image_url, category, stock, merchant_id } = req.body;
  if (!name || price === undefined) return res.status(400).json({ error: 'name/price required' });
  const all = readDB('products');
  const p = { id: nextId(all), merchant_id: merchant_id || 1, name, description: description || '', price: parseFloat(price), image_url: image_url || '', category: category || '', stock: parseInt(stock) || 0, status: 'active', created_at: new Date().toISOString() };
  all.push(p);
  writeDB('products', all);
  res.json(p);
});

app.put('/api/products/:id', (req, res) => {
  const all = readDB('products');
  const idx = all.findIndex(x => x.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  all[idx] = { ...all[idx], ...req.body };
  writeDB('products', all);
  res.json(all[idx]);
});

// ============ API: Merchants ============
app.get('/api/merchants', (req, res) => {
  res.json(readDB('merchants'));
});

app.get('/api/merchants/pending', (req, res) => {
  res.json(readDB('merchants').filter(m => m.status === 'pending'));
});

app.post('/api/merchants', (req, res) => {
  const { name, description, tp_address, qrcode_url } = req.body;
  if (!name || !tp_address) return res.status(400).json({ error: 'name/tp_address required' });
  const all = readDB('merchants');
  const m = { id: nextId(all), name, description: description || '', tp_address, qrcode_url: qrcode_url || '', status: 'pending', created_at: new Date().toISOString() };
  all.push(m);
  writeDB('merchants', all);
  res.json(m);
});

app.put('/api/merchants/:id/approve', (req, res) => {
  const all = readDB('merchants');
  const m = all.find(x => x.id === parseInt(req.params.id));
  if (!m) return res.status(404).json({ error: 'Not found' });
  m.status = 'approved';
  writeDB('merchants', all);
  res.json(m);
});

app.put('/api/merchants/:id', (req, res) => {
  const all = readDB('merchants');
  const idx = all.findIndex(x => x.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  all[idx] = { ...all[idx], ...req.body };
  writeDB('merchants', all);
  res.json(all[idx]);
});

// ============ API: Orders ============
app.get('/api/orders', (req, res) => {
  const ords = readDB('orders');
  const prods = readDB('products');
  const mers = readDB('merchants');
  res.json(ords.map(o => {
    const p = prods.find(x => x.id === o.product_id) || {};
    const m = mers.find(x => x.id === o.merchant_id) || {};
    return { ...o, product_name: p.name || '', merchant_name: m.name || '' };
  }));
});

app.post('/api/orders', (req, res) => {
  const { product_id, quantity, buyer_address } = req.body;
  const prods = readDB('products');
  const p = prods.find(x => x.id === product_id);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  const ords = readDB('orders');
  const o = { id: nextId(ords), order_no: 'ORD' + Date.now() + Math.random().toString(36).substr(2, 6), product_id, quantity: quantity || 1, total_price: p.price * (quantity || 1), buyer_address: buyer_address || '', merchant_id: p.merchant_id, status: 'pending', tx_hash: '', created_at: new Date().toISOString() };
  ords.push(o);
  writeDB('orders', ords);
  res.json(o);
});

app.put('/api/orders/:id', (req, res) => {
  const ords = readDB('orders');
  const idx = ords.findIndex(x => x.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  ords[idx] = { ...ords[idx], ...req.body };
  writeDB('orders', ords);
  res.json(ords[idx]);
});

// ============ API: Upload ============
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ success: true, url: '/uploads/' + req.file.filename });
});

// ============ SPA Fallback ============
app.get('*', (req, res) => {
  // 針對 admin / merchant 返回各自頁面
  if (req.path.startsWith('/admin')) return res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
  if (req.path.startsWith('/merchant')) return res.sendFile(path.join(PUBLIC_DIR, 'merchant.html'));
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// ============ Start ============
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ Server running on port ${PORT}`);
  const p = await getPrices();
  console.log(`💰 BNB=$${p.bnb} | ARK=$${p.ark} | CNY=$${p.usdCny}`);
});
