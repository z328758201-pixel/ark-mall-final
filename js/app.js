// ARK Mall - 前端商城 JavaScript
// 支持商品展示、購物車、訂單、商家入駐（含 TP 錢包地址 + 二維碼）

// ============ 全局變量 ============
// 後端 API 地址 - 使用 Railway 生產環境
const API_BASE = 'https://arkmall-simple-production.up.railway.app/api';

// 外部 API（支持 CORS）
const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/pairs/bsc/0xCAaF3c41a40103a23Eeaa4BbA468AF3cF5b0e0D8';
const BINANCE_API = 'https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT';
const EXCHANGERATE_API = 'https://api.exchangerate-api.com/v4/latest/USD';

// 代幣合約地址
const TOKEN_CONTRACTS = {
    BNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    ARK: '0xCae117ca6Bc8A341D2E7207F30E180f0e5618B9D',
    USDT: '0x55d398326f99059fF775485246999027B3197955'
};

// 匯率（初始使用合理默認值）
let exchangeRates = {
    ark: 7.80,
    bnb: 580.00,
    usdt: 1,
    usdCny: 6.80
};

let provider;
let signer;
let currentAccount = null;

// 購物車
let cart = [];

// 當前頁面
let currentPage = 'home';

// 商品和商家
let products = [];
let merchants = [];

// 當前查看的商品
let currentProduct = null;

// ============ 初始化 ============
document.addEventListener('DOMContentLoaded', async () => {
    console.log('=== ARK Mall 初始化 ===');
    console.log('API_BASE:', API_BASE);
    
    // 先載入匯率，再載入商品
    await loadExchangeRates();
    loadProducts();
    loadMerchants();
    loadCart();
});

// ============ 匯率功能 ============
async function loadExchangeRates() {
    try {
        console.log('開始載入匯率...');
        
        // 1. 從 Binance 獲取 BNB/USDT 價格
        try {
            const bnbResponse = await fetch(BINANCE_API);
            const bnbData = await bnbResponse.json();
            if (bnbData && bnbData.price) {
                exchangeRates.bnb = parseFloat(bnbData.price);
                console.log('✅ BNB 價格:', exchangeRates.bnb);
            }
        } catch (e) {
            console.warn('⚠️ 獲取 BNB 價格失敗，使用默認值:', e.message);
        }
        
        // 2. 從 Dexscreener 獲取 ARK/USDT 價格
        try {
            const arkResponse = await fetch(DEXSCREENER_API);
            const arkData = await arkResponse.json();
            if (arkData && arkData.pairs && arkData.pairs.length > 0) {
                exchangeRates.ark = parseFloat(arkData.pairs[0].priceUsd);
                console.log('✅ ARK 價格:', exchangeRates.ark);
            }
        } catch (e) {
            console.warn('⚠️ 獲取 ARK 價格失敗，使用默認值:', e.message);
        }
        
        // 3. 從 exchangerate-api 獲取 USD/CNY 匯率
        try {
            const cnyResponse = await fetch(EXCHANGERATE_API);
            const cnyData = await cnyResponse.json();
            if (cnyData && cnyData.rates && cnyData.rates.CNY) {
                exchangeRates.usdCny = parseFloat(cnyData.rates.CNY);
                console.log('✅ USD/CNY 匯率:', exchangeRates.usdCny);
            }
        } catch (e) {
            console.warn('⚠️ 獲取 USD/CNY 匯率失敗，使用默認值:', e.message);
        }
        
        console.log('=== 匯率已更新 ===');
        console.log('BNB/USDT:', exchangeRates.bnb);
        console.log('ARK/USDT:', exchangeRates.ark);
        console.log('USD/CNY:', exchangeRates.usdCny);
        
        // 重新渲染商品以顯示最新價格
        if (products.length > 0) {
            renderProducts(products);
        }
    } catch (error) {
        console.error('獲取匯率失敗:', error);
        // 保持使用默認值
    }
}

// 格式化多種代幣價格
function formatAllPrices(usdPrice) {
    usdPrice = parseFloat(usdPrice);
    if (isNaN(usdPrice) || usdPrice <= 0) return '價格不可用';
    
    const prices = [];
    
    // 1. USD 價格
    prices.push(`$${usdPrice.toFixed(2)}`);
    
    // 2. CNY 價格
    if (exchangeRates.usdCny > 0) {
        const cnyValue = usdPrice * exchangeRates.usdCny;
        prices.push(`¥${cnyValue.toFixed(2)}`);
    }
    
    // 3. BNB 價格
    if (exchangeRates.bnb > 0) {
        const bnbValue = usdPrice / exchangeRates.bnb;
        prices.push(`${bnbValue.toFixed(6)} BNB`);
    }
    
    // 4. ARK 價格
    if (exchangeRates.ark > 0) {
        const arkValue = usdPrice / exchangeRates.ark;
        prices.push(`${arkValue.toFixed(2)} ARK`);
    }
    
    return prices.join(' / ');
}

// ============ API 請求 ============
async function apiRequest(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error(`API 請求失敗 (${endpoint}):`, error);
        throw error;
    }
}

// ============ 錢包連接 ============
async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        alert('請安裝 MetaMask 或其他 Web3 錢包！');
        return;
    }
    
    try {
        provider = new ethers.BrowserProvider(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        signer = await provider.getSigner();
        currentAccount = await signer.getAddress();
        
        document.getElementById('connectWallet').textContent = 
            currentAccount.slice(0, 6) + '...' + currentAccount.slice(-4);
        
        console.log('錢包已連接:', currentAccount);
    } catch (error) {
        console.error('連接錢包失敗:', error);
        alert('連接錢包失敗！');
    }
}

// ============ 商品功能 ============
async function loadProducts() {
    try {
        console.log('開始載入商品...');
        const result = await apiRequest('/products');
        
        // 後端返回數組（沒有 success 字段）
        if (Array.isArray(result)) {
            products = result;
            console.log('✅ 商品已載入:', products.length, '個');
        } else if (result.success && result.data) {
            products = result.data;
            console.log('✅ 商品已載入:', products.length, '個');
        }
        
        renderProducts(products);
    } catch (error) {
        console.error('加載商品失敗:', error);
    }
}

// 渲染商品列表
function renderProducts(productsToRender) {
    const container = document.getElementById('productGrid');
    if (!container) {
        console.error('productGrid 不存在');
        return;
    }
    
    if (productsToRender.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">暫無商品</p>';
        return;
    }
    
    container.innerHTML = productsToRender.map(product => `
        <div class="product-card" onclick="showProductDetail(${product.id})">
            <img src="${product.image_url || 'https://picsum.photos/400/300?random=' + product.id}" alt="${product.name}">
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="product-price">${formatAllPrices(product.price)}</p>
                <p class="product-category">${product.category || '未分類'}</p>
                <p class="product-stock">庫存：${product.stock || 0}</p>
            </div>
        </div>
    `).join('');
}

// 顯示商品詳情
function showProductDetail(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    currentProduct = product;
    
    document.getElementById('detailName').textContent = product.name;
    document.getElementById('detailDescription').textContent = product.description || '';
    document.getElementById('detailPrice').innerHTML = formatAllPrices(product.price);
    document.getElementById('detailStock').textContent = '庫存：' + (product.stock || 0);
    document.getElementById('detailImage').src = product.image_url || 'https://picsum.photos/400/300?random=' + product.id;
    
    showPage('product');
}

// 添加到購物車
function addToCart(productId, quantity = 1) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image_url: product.image_url,
            quantity: quantity
        });
    }
    
    saveCart();
    alert('已加入購物車！');
}

function addCurrentToCart() {
    if (currentProduct) {
        addToCart(currentProduct.id, 1);
    }
}

// ============ 購物車功能 ============
function loadCart() {
    const savedCart = localStorage.getItem('arkmall_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        renderCart();
    }
}

function saveCart() {
    localStorage.setItem('arkmall_cart', JSON.stringify(cart));
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cartItems');
    if (!container) return;
    
    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">購物車是空的</p>';
        document.getElementById('cartTotal').textContent = '總計：$0.00';
        return;
    }
    
    let total = 0;
    container.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return `
            <div class="cart-item">
                <img src="${item.image_url || 'https://picsum.photos/100/100?random=' + item.id}" alt="${item.name}">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>${formatAllPrices(item.price)}</p>
                    <div class="cart-item-actions">
                        <button onclick="updateQuantity(${item.id}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateQuantity(${item.id}, 1)">+</button>
                        <button onclick="removeFromCart(${item.id})">刪除</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('cartTotal').innerHTML = `總計：${formatAllPrices(total)}`;
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart();
        }
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
}

function showCart() {
    showPage('cart');
}

async function checkout() {
    if (!currentAccount) {
        alert('請先連接錢包！');
        return;
    }
    
    if (cart.length === 0) {
        alert('購物車是空的！');
        return;
    }
    
    try {
        // 計算總金額
        let totalUSD = 0;
        cart.forEach(item => {
            totalUSD += item.price * item.quantity;
        });
        
        // 轉換為 ARK
        const totalARK = exchangeRates.ark > 0 ? totalUSD / exchangeRates.ark : 0;
        
        // 發送 ARK 到商家地址（這裡需要商家的 TP 錢包地址）
        // 暫時使用默認地址，實際需要從商家獲取
        const merchantAddress = '0x0000000000000000000000000000000000000000';
        
        alert(`訂單金額：${totalARK.toFixed(2)} ARK ($${totalUSD.toFixed(2)} USD)\n\n請手動轉帳到商家錢包地址：${merchantAddress}`);
        
        // 清空購物車
        cart = [];
        saveCart();
        showPage('home');
    } catch (error) {
        console.error('結帳失敗:', error);
        alert('結帳失敗！');
    }
}

// ============ 商家功能 ============
async function loadMerchants() {
    try {
        const result = await apiRequest('/merchants');
        if (result.success && result.data) {
            merchants = result.data;
            renderMerchants(merchants);
        }
    } catch (error) {
        console.error('加載商家失敗:', error);
    }
}

function renderMerchants(merchantsToRender) {
    const container = document.getElementById('merchantGrid');
    if (!container) return;
    
    if (merchantsToRender.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">暫無入駐商家</p>';
        return;
    }
    
    container.innerHTML = merchantsToRender.map(merchant => `
        <div class="merchant-card" onclick="showMerchantDetail(${merchant.id})">
            <img src="${merchant.qrcode_url || 'https://picsum.photos/100/100?random=' + merchant.id}" alt="${merchant.name}">
            <div class="merchant-info">
                <h3>${merchant.name}</h3>
                <p>${merchant.description || ''}</p>
                <p class="merchant-address">💰 ${merchant.tp_address ? merchant.tp_address.slice(0, 10) + '...' : '未設置'}</p>
            </div>
        </div>
    `).join('');
}

// ============ 商家入駐功能 ============
function showMerchantRegister() {
    document.getElementById('merchantModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

async function submitMerchantRegister() {
    if (!currentAccount) {
        alert('請先連接錢包！');
        return;
    }
    
    const name = document.getElementById('merchantName').value.trim();
    const description = document.getElementById('merchantDescription').value.trim();
    const tpAddress = document.getElementById('merchantTpAddress').value.trim();
    const qrcodeFile = document.getElementById('merchantQrcode').files[0];
    
    // 驗證
    if (!name) {
        alert('請輸入商家名稱！');
        return;
    }
    
    if (!tpAddress) {
        alert('請輸入 TP 錢包收款地址！');
        return;
    }
    
    // 驗證以太坊地址格式
    if (!/^0x[a-fA-F0-9]{40}$/.test(tpAddress)) {
        alert('TP 錢包地址格式不正確！請輸入有效的以太坊地址。');
        return;
    }
    
    // 上傳二維碼（如果有）
    let qrcodeUrl = '';
    if (qrcodeFile) {
        const formData = new FormData();
        formData.append('image', qrcodeFile);
        
        try {
            const uploadResult = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                body: formData
            });
            const uploadData = await uploadResult.json();
            if (uploadData.url) {
                qrcodeUrl = uploadData.url;
            }
        } catch (e) {
            console.error('上傳二維碼失敗:', e);
        }
    }
    
    // 提交入駐申請
    try {
        const result = await apiRequest('/merchants', 'POST', {
            name: name,
            address: currentAccount,
            description: description,
            tp_address: tpAddress,
            qrcode_url: qrcodeUrl
        });
        
        if (result.error) {
            alert('入駐失敗：' + result.error);
        } else {
            alert('商家入駐成功！等待審核通過。');
            loadMerchants();
            closeModal('merchantModal');
            showPage('merchants');
        }
    } catch (error) {
        console.error('商家入駐失敗:', error);
        alert('入駐失敗：' + error.message);
    }
}

// ============ 商家詳情 ============
function showMerchantDetail(merchantId) {
    showPage('merchantDetail');
    
    const merchant = merchants.find(m => m.id === merchantId);
    if (merchant) {
        document.getElementById('merchantDetailName').textContent = merchant.name;
        document.getElementById('merchantDetailDesc').textContent = merchant.description || '';
        
        // 顯示 TP 錢包地址和二維碼
        const detailContainer = document.getElementById('merchantDetailInfo');
        if (detailContainer) {
            detailContainer.innerHTML = `
                <div class="merchant-payment-info">
                    <h3>💰 支付信息</h3>
                    <p><strong>TP 錢包地址：</strong>${merchant.tp_address || '未設置'}</p>
                    ${merchant.qrcode_url ? `<img src="${merchant.qrcode_url}" alt="收款二維碼" style="max-width: 200px;">` : ''}
                </div>
            `;
        }
    }
}

// ============ 訂單功能 ============
async function loadOrders() {
    if (!currentAccount) {
        document.getElementById('orderList').innerHTML = '<p style="text-align: center;">請先連接錢包</p>';
        return;
    }
    
    try {
        const result = await apiRequest(`/orders?user_address=${currentAccount}`);
        if (result.data) {
            renderOrders(result.data);
        }
    } catch (error) {
        console.error('加載訂單失敗:', error);
    }
}

function renderOrders(orders) {
    const container = document.getElementById('orderList');
    if (!container) return;
    
    if (orders.length === 0) {
        container.innerHTML = '<p style="text-align: center;">暫無訂單</p>';
        return;
    }
    
    container.innerHTML = orders.map(order => `
        <div class="order-card">
            <h4>訂單號：${order.order_no}</h4>
            <p>金額：${formatAllPrices(order.total_price)}</p>
            <p>狀態：${order.status}</p>
            <p>時間：${formatDate(order.created_at)}</p>
        </div>
    `).join('');
}

// ============ 頁面導航 ============
function showPage(page) {
    currentPage = page;
    
    // 隱藏所有頁面
    const allPages = [
        'homePage',
        'productPage',
        'cartPage',
        'ordersPage',
        'merchantsPage',
        'merchantDetailPage',
        'merchantRegisterPage'
    ];
    allPages.forEach(pageId => {
        const el = document.getElementById(pageId);
        if (el) el.style.display = 'none';
    });
    
    // 顯示對應頁面
    const pageElement = document.getElementById(page + 'Page');
    if (pageElement) {
        pageElement.style.display = 'block';
    }
    
    // 更新導航欄
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-link[onclick="showPage('${page}')"]`);
    if (activeLink) activeLink.classList.add('active');
    
    // 加載頁面數據
    switch (page) {
        case 'merchants':
            loadMerchants();
            break;
        case 'orders':
            loadOrders();
            break;
    }
}

// ============ 工具函數 ============
function formatPrice(price) {
    return parseFloat(price).toFixed(4);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleString('zh-CN');
}

// ============ 搜索 ============
async function search() {
    const keyword = document.getElementById('searchInput').value.trim();
    if (!keyword) {
        renderProducts(products);
        return;
    }
    
    try {
        const result = await apiRequest(`/search?keyword=${encodeURIComponent(keyword)}`);
        if (result.products) {
            renderProducts(result.products);
        }
    } catch (error) {
        console.error('搜索失敗:', error);
    }
}

// ============ 全局函數 ============
window.connectWallet = connectWallet;
window.showPage = showPage;
window.showCart = showCart;
window.addToCart = addToCart;
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.checkout = checkout;
window.showMerchantRegister = showMerchantRegister;
window.submitMerchantRegister = submitMerchantRegister;
window.closeModal = closeModal;
window.showMerchantDetail = showMerchantDetail;
window.showProductDetail = showProductDetail;
window.addCurrentToCart = addCurrentToCart;
window.search = search;
