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
    updateExchangeRates();
    loadCategories();
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

// ============ 匯率更新 ============
async function updateExchangeRates() {
    try {
        const result = await apiRequest('/rates');
        if (result.success) {
            exchangeRates = result.data;
            
            document.getElementById('arkRate').textContent = '$' + exchangeRates.ark.toFixed(2);
            document.getElementById('bnbRate').textContent = '$' + exchangeRates.bnb.toFixed(2);
            document.getElementById('usdtRate').textContent = '$' + exchangeRates.usdt.toFixed(2);
            document.getElementById('usdCnyRate').textContent = '¥' + exchangeRates.usdCny.toFixed(2);
        }
    } catch (error) {
        console.error('更新匯率失敗:', error);
    }
}

// ============ 加載商品 ============
async function loadProducts() {
    try {
        const result = await apiRequest('/products');
        if (result.success) {
            products = result.data;
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
            <img src="${product.image || 'https://picsum.photos/400/300?random=' + product.id}" alt="${product.name}">
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="product-price">${product.price} BNB ≈ ¥${product.price_cny}</p>
                <p class="product-category">${product.category}</p>
                <div class="product-rating">
                    ${'★'.repeat(5)} (${product.rating_count || 0})
                </div>
            </div>
        </div>
    `).join('');
}

// ============ 加載商家 ============
async function loadMerchants() {
    try {
        const result = await apiRequest('/merchants');
        if (result.success) {
            merchants = result.data;
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
    
    container.innerHTML = merchantsToRender.map(merchant => `
        <div class="merchant-card" onclick="showMerchantDetail(${merchant.id})">
            <img src="${merchant.logo || 'https://picsum.photos/100/100?random=' + merchant.id}" alt="${merchant.name}">
            <div class="merchant-info">
                <h3>${merchant.name}</h3>
                <p>${merchant.description || ''}</p>
            </div>
        </div>
    `).join('');
}

// ============ 加載分類 ============
async function loadCategories() {
    try {
        const result = await apiRequest('/categories');
        if (result.success) {
            categories = result.data;
            renderCategories(categories);
        }
    } catch (error) {
        console.error('加載分類失敗:', error);
    }
}

// 渲染分類
function renderCategories(categoriesToRender) {
    const container = document.getElementById('categoryNav');
    if (!container) return;
    
    container.innerHTML = categoriesToRender.map(category => `
        <a class="category-tag" onclick="filterByCategory('${category}')">${category}</a>
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
    const totalCny = total * exchangeRates.bnb;
    
    container.innerHTML = `
        <div class="cart-items">
            ${cart.map(item => `
                <div class="cart-item">
                    <img src="${item.image || 'https://picsum.photos/100/100?random=' + item.id}" alt="${item.name}">
                    <div class="cart-item-info">
                        <h3>${item.name}</h3>
                        <p>${item.price} BNB ≈ ¥${item.price_cny}</p>
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
            <p>總計：${total.toFixed(4)} BNB ≈ ¥${totalCny.toFixed(2)}</p>
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
                merchant_id: item.merchant_id,
                product_id: item.id,
                quantity: item.quantity,
                total_price: item.price * item.quantity,
                payment_token: 'BNB'
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
        if (result.success) {
            renderOrders(result.data);
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
                ${order.shipping_no ? `<p>物流單號：${order.shipping_no}</p>` : ''}
            </div>
            <div class="order-actions">
                ${order.status === 'shipped' ? `<button onclick="confirmReceive('${order.order_no}')">確認收貨</button>` : ''}
                ${order.status === 'received' ? `<button onclick="reviewOrder('${order.order_no}', ${order.product_id})">評價</button>` : ''}
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
        'cancelled': '已取消',
        'refunded': '已退款'
    };
    return statusMap[status] || status;
}

async function confirmReceive(orderNo) {
    try {
        await apiRequest(`/orders/${orderNo}/status`, 'PUT', { status: 'received' });
        alert('已確認收貨！');
        loadOrders();
    } catch (error) {
        console.error('確認收貨失敗:', error);
    }
}

// ============ 評價功能 ============
function reviewOrder(orderNo, productId) {
    const rating = prompt('請輸入評分（1-5）：');
    const comment = prompt('請輸入評價內容：');
    
    if (rating && comment) {
        apiRequest('/reviews', 'POST', {
            order_id: orderNo,
            user_address: currentAccount,
            product_id: productId,
            rating: parseInt(rating),
            comment: comment
        }).then(result => {
            if (result.success) {
                alert('評價提交成功！');
            } else {
                alert('評價提交失敗：' + result.message);
            }
        });
    }
}

// ============ 用戶地址功能 ============
async function loadUserAddresses() {
    if (!currentAccount) return;
    
    try {
        const result = await apiRequest(`/addresses/${currentAccount}`);
        if (result.success) {
            renderUserAddresses(result.data);
        }
    } catch (error) {
        console.error('加載地址失敗:', error);
    }
}

function renderUserAddresses(addresses) {
    const container = document.getElementById('addressesContent');
    if (!container) return;
    
    if (addresses.length === 0) {
        container.innerHTML = '<p class="empty-addresses">暫無收貨地址</p>';
        return;
    }
    
    container.innerHTML = addresses.map(addr => `
        <div class="address-card">
            <p><strong>${addr.name}</strong> ${addr.phone}</p>
            <p>${addr.address}</p>
            ${addr.is_default ? '<span class="default-tag">默認</span>' : ''}
            <div class="address-actions">
                <button onclick="editAddress(${addr.id})">編輯</button>
                <button onclick="deleteAddress(${addr.id})">刪除</button>
            </div>
        </div>
    `).join('');
}

function addAddress() {
    const name = prompt('請輸入收貨人姓名：');
    const phone = prompt('請輸入手機號碼：');
    const address = prompt('請輸入收貨地址：');
    
    if (name && phone && address) {
        apiRequest('/addresses', 'POST', {
            user_address: currentAccount,
            name: name,
            phone: phone,
            address: address,
            is_default: 0
        }).then(result => {
            if (result.success) {
                alert('地址添加成功！');
                loadUserAddresses();
            } else {
                alert('地址添加失敗：' + result.message);
            }
        });
    }
}

// ============ 商家功能 ============
function showMerchantDetail(merchantId) {
    showPage('merchantDetail');
    
    const merchant = merchants.find(m => m.id === merchantId);
    if (merchant) {
        document.getElementById('merchantName').textContent = merchant.name;
        document.getElementById('merchantDescription').textContent = merchant.description || '';
        
        // 加載商家商品
        const merchantProducts = products.filter(p => p.merchant_id === merchantId);
        renderProducts(merchantProducts);
    }
}

// ============ 搜索功能 ============
async function search() {
    const keyword = document.getElementById('searchInput').value.trim();
    if (!keyword) return;
    
    try {
        const result = await apiRequest(`/search?keyword=${encodeURIComponent(keyword)}`);
        if (result.success) {
            products = result.products;
            merchants = result.merchants;
            
            renderProducts(products);
            renderMerchants(merchants);
        }
    } catch (error) {
        console.error('搜索失敗:', error);
    }
}

// ============ 分類篩選 ============
function filterByCategory(category) {
    const filteredProducts = products.filter(p => p.category === category);
    renderProducts(filteredProducts);
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
    document.querySelector(`.nav-link[onclick="showPage('${page}')"]`)?.classList.add('active');
    
    // 加載頁面數據
    switch (page) {
        case 'orders':
            loadOrders();
            break;
        case 'addresses':
            loadUserAddresses();
            break;
    }
}

// ============ 工具函數 ============
function formatPrice(price) {
    return price.toFixed(4);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleString('zh-CN');
}
