// ARK Mall - 前端商城 JavaScript
// 支持商品展示、購物車、訂單、商家入駐

// ============ 全局變量 ============
// 後端 API 地址（Railway）
const API_BASE = 'https://arkmall-simple-production.up.railway.app/api';
// 本地測試：const API_BASE = 'http://localhost:10001/api';
let provider;
let signer;
let currentAccount = null;

// 購物車
let cart = [];

// 匯率
let exchangeRates = {
    ark: 0,
    bnb: 0,
    usdt: 1,
    usdCny: 7.20
};

// 商品分類
let categories = [];

// 商品列表
let products = [];

// 商家列表
let merchants = [];

// 當前頁面
let currentPage = 'home';

// ============ 初始化 ============
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    loadMerchants();
    loadCart();
});

// ============ API 請求 ============
async function apiRequest(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        const result = await response.json();
        
        return result;
    } catch (error) {
        console.error('API 請求失敗:', error);
        return { success: false, message: error.message };
    }
}

// ============ 錢包連接 ============
async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        alert('請安裝 MetaMask 或 Trust Wallet！');
        return;
    }
    
    try {
        provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = await provider.getSigner();
        
        currentAccount = await signer.getAddress();
        
        document.getElementById('walletText').textContent = currentAccount.slice(0, 6) + '...' + currentAccount.slice(-4);
        
        console.log('錢包連接成功:', currentAccount);
        
        // 加載用戶地址
        loadUserAddresses();
        
    } catch (error) {
        console.error('連接失敗:', error);
    }
}

// ============ 加載商品 ============
async function loadProducts() {
    try {
        const result = await apiRequest('/products');
        // 後端直接返回數組，不是 { success: true, data: [...] }
        if (Array.isArray(result)) {
            products = result;
            renderProducts(products);
        }
    } catch (error) {
        console.error('加載商品失敗:', error);
    }
}

// 渲染商品列表
function renderProducts(productsToRender) {
    const container = document.getElementById('productGrid');
    if (!container) return;
    
    container.innerHTML = productsToRender.map(product => `
        <div class="product-card" onclick="showProductDetail(${product.id})">
            <img src="${product.image_url || 'https://picsum.photos/400/300?random=' + product.id}" alt="${product.name}">
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="product-price">${product.price} BNB</p>
                <p class="product-category">${product.category}</p>
                <p class="product-stock">庫存：${product.stock}</p>
            </div>
        </div>
    `).join('');
}

// ============ 加載商家 ============
async function loadMerchants() {
    try {
        const result = await apiRequest('/merchants');
        // 後端返回數組
        if (Array.isArray(result)) {
            merchants = result;
            renderMerchants(merchants);
        }
    } catch (error) {
        console.error('加載商家失敗:', error);
    }
}

// 渲染商家列表
function renderMerchants(merchantsToRender) {
    const container = document.getElementById('merchantGrid');
    if (!container) return;
    
    if (merchantsToRender.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">暫無入駐商家</p>';
        return;
    }
    
    container.innerHTML = merchantsToRender.map(merchant => `
        <div class="merchant-card" onclick="showMerchantDetail(${merchant.id})">
            <img src="https://picsum.photos/100/100?random=${merchant.id}" alt="${merchant.name}">
            <div class="merchant-info">
                <h3>${merchant.name}</h3>
                <p>${merchant.description || ''}</p>
            </div>
        </div>
    `).join('');
}

// ============ 購物車功能 ============
function loadCart() {
    const savedCart = localStorage.getItem('arkmall_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartBadge();
    }
}

function saveCart() {
    localStorage.setItem('arkmall_cart', JSON.stringify(cart));
    updateCartBadge();
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }
    
    saveCart();
    alert('已加入購物車！');
}

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (badge) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        badge.textContent = totalItems;
    }
}

function showCart() {
    showPage('cart');
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cartContent');
    if (!container) return;
    
    if (cart.length === 0) {
        container.innerHTML = '<p class="empty-cart">購物車是空的</p>';
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    container.innerHTML = `
        <div class="cart-items">
            ${cart.map(item => `
                <div class="cart-item">
                    <img src="${item.image_url || 'https://picsum.photos/100/100?random=' + item.id}" alt="${item.name}">
                    <div class="cart-item-info">
                        <h3>${item.name}</h3>
                        <p>${item.price} BNB</p>
                        <div class="quantity-control">
                            <button onclick="updateQuantity(${item.id}, -1)">-</button>
                            <span>${item.quantity}</span>
                            <button onclick="updateQuantity(${item.id}, 1)">+</button>
                        </div>
                    </div>
                    <button class="remove-btn" onclick="removeFromCart(${item.id})">刪除</button>
                </div>
            `).join('')}
        </div>
        <div class="cart-summary">
            <p>總計：${total.toFixed(4)} BNB</p>
            <button class="checkout-btn" onclick="checkout()">結算</button>
        </div>
    `;
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart();
            renderCart();
        }
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    renderCart();
}

// ============ 訂單功能 ============
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
        // 為每個商品創建訂單
        for (const item of cart) {
            await apiRequest('/orders', 'POST', {
                user_address: currentAccount,
                product_id: item.id,
                quantity: item.quantity
            });
        }
        
        // 清空購物車
        cart = [];
        saveCart();
        
        alert('訂單創建成功！');
        showPage('orders');
        loadOrders();
        
    } catch (error) {
        console.error('結算失敗:', error);
        alert('結算失敗：' + error.message);
    }
}

async function loadOrders() {
    if (!currentAccount) return;
    
    try {
        const result = await apiRequest(`/orders?user_address=${currentAccount}`);
        // 後端返回數組
        if (Array.isArray(result)) {
            renderOrders(result);
        }
    } catch (error) {
        console.error('加載訂單失敗:', error);
    }
}

function renderOrders(orders) {
    const container = document.getElementById('ordersContent');
    if (!container) return;
    
    if (orders.length === 0) {
        container.innerHTML = '<p class="empty-orders">暫無訂單</p>';
        return;
    }
    
    container.innerHTML = orders.map(order => `
        <div class="order-card">
            <div class="order-header">
                <span class="order-no">${order.order_no}</span>
                <span class="order-status status-${order.status}">${getStatusText(order.status)}</span>
            </div>
            <div class="order-body">
                <p>商品ID：${order.product_id}</p>
                <p>數量：${order.quantity}</p>
                <p>總計：${order.total_price} BNB</p>
            </div>
        </div>
    `).join('');
}

function getStatusText(status) {
    const statusMap = {
        'pending': '待支付',
        'paid': '已支付',
        'shipped': '已發貨',
        'received': '已簽收',
        'completed': '已完成',
        'cancelled': '已取消'
    };
    return statusMap[status] || status;
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
    
    if (!name) {
        alert('請輸入商家名稱！');
        return;
    }
    
    try {
        const result = await apiRequest('/merchants', 'POST', {
            name: name,
            address: currentAccount,
            description: description
        });
        
        if (result.error) {
            alert('入駐失敗：' + result.error);
        } else {
            alert('商家入駐成功！');
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
        document.getElementById('merchantDetailDesc').textContent = merchant.description || '暫無描述';
        
        // 加載商家商品
        const merchantProducts = products.filter(p => p.merchant_id === merchantId);
        renderMerchantProducts(merchantProducts);
    }
}

function renderMerchantProducts(productsToRender) {
    const container = document.getElementById('merchantProducts');
    if (!container) return;
    
    if (productsToRender.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">暫無商品</p>';
        return;
    }
    
    container.innerHTML = productsToRender.map(product => `
        <div class="product-card" onclick="showProductDetail(${product.id})">
            <img src="${product.image_url || 'https://picsum.photos/400/300?random=' + product.id}" alt="${product.name}">
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="product-price">${product.price} BNB</p>
            </div>
        </div>
    `).join('');
}

// ============ 商品詳情 ============
function showProductDetail(productId) {
    showPage('productDetail');
    
    const product = products.find(p => p.id === productId);
    if (product) {
        document.getElementById('detailName').textContent = product.name;
        document.getElementById('detailPrice').textContent = product.price + ' BNB';
        document.getElementById('detailDesc').textContent = product.description || '暫無描述';
        document.getElementById('detailStock').textContent = '庫存：' + product.stock;
        document.getElementById('detailCategory').textContent = product.category || '';
        
        const img = document.getElementById('detailImage');
        img.src = product.image_url || 'https://picsum.photos/400/300?random=' + product.id;
        
        // 存儲當前商品 ID
        document.getElementById('addToCartBtn').setAttribute('data-product-id', product.id);
    }
}

function addCurrentToCart() {
    const btn = document.getElementById('addToCartBtn');
    const productId = parseInt(btn.getAttribute('data-product-id'));
    addToCart(productId);
}

// ============ 頁面導航 ============
function showPage(page) {
    currentPage = page;
    
    // 隱藏所有頁面
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    
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

// 搜索功能
async function search() {
    const keyword = document.getElementById('searchInput').value.trim();
    if (!keyword) {
        loadProducts();
        return;
    }
    
    try {
        const result = await apiRequest(`/search?keyword=${encodeURIComponent(keyword)}`);
        if (result.products) {
            products = result.products;
            renderProducts(products);
        }
    } catch (error) {
        console.error('搜索失敗:', error);
    }
}