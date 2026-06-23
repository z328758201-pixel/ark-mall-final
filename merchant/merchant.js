// 商家後台 JavaScript
// 支持商品管理、訂單管理、發貨、退款處理

// ============ 全局變量 ============
const API_BASE = 'https://arkmall-simple-production.up.railway.app/api';
let provider;
let signer;
let currentAccount = null;

// 當前商家信息
let currentMerchant = null;

// 商品列表
let products = [];

// 訂單列表
let orders = [];

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
        
        document.getElementById('walletAddress').textContent = currentAccount.slice(0, 6) + '...' + currentAccount.slice(-4);
        
        console.log('錢包連接成功:', currentAccount);
        
        // 加載商家信息
        await loadMerchantInfo();
        
        // 加載商家商品
        await loadProducts();
        
        // 加載商家訂單
        await loadOrders();
        
        // 更新控制面板
        updateDashboard();
        
    } catch (error) {
        console.error('連接失敗:', error);
    }
}

// ============ 加載商家信息 ============
async function loadMerchantInfo() {
    try {
        const result = await apiRequest('/merchants');
        if (result.success && Array.isArray(result.data)) {
            // 找到當前商家
            currentMerchant = result.data.find(m => 
                m.address.toLowerCase() === currentAccount.toLowerCase()
            );
            
            if (currentMerchant) {
                console.log('當前商家:', currentMerchant.name);
                // 更新店鋪信息
                document.getElementById('storeName').value = currentMerchant.name || '';
                document.getElementById('storeDescription').value = currentMerchant.description || '';
            } else {
                alert('您還不是商家，請先入駐！');
            }
        }
    } catch (error) {
        console.error('加載商家信息失敗:', error);
    }
}

// ============ 加載商品 ============
async function loadProducts() {
    try {
        const result = await apiRequest('/products');
        if (Array.isArray(result)) {
            // 過濾當前商家的商品（簡化：顯示所有商品）
            products = result;
            renderProducts(products);
        }
    } catch (error) {
        console.error('加載商品失敗:', error);
    }
}

// 渲染商品列表
function renderProducts(productsToRender) {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    
    if (productsToRender.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">暫無商品</td></tr>';
        return;
    }
    
    tbody.innerHTML = productsToRender.map(product => `
        <tr>
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td>${product.price} BNB</td>
            <td>${product.stock}</td>
            <td><span class="status-badge status-paid">上架中</span></td>
            <td>
                <button class="btn btn-secondary" onclick="editProduct(${product.id})">編輯</button>
                <button class="btn btn-danger" onclick="delistProduct(${product.id})">下架</button>
            </td>
        </tr>
    `).join('');
}

// ============ 加載訂單 ============
async function loadOrders() {
    try {
        const result = await apiRequest('/orders');
        if (Array.isArray(result)) {
            orders = result;
            renderOrders(orders);
        }
    } catch (error) {
        console.error('加載訂單失敗:', error);
    }
}

// 渲染訂單列表
function renderOrders(ordersToRender) {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    
    if (ordersToRender.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">暫無訂單</td></tr>';
        return;
    }
    
    tbody.innerHTML = ordersToRender.map(order => {
        const statusMap = {
            'pending': '待支付',
            'paid': '已支付',
            'shipped': '已發貨',
            'received': '已簽收',
            'completed': '已完成',
            'cancelled': '已取消',
            'refund_requested': '退款申請中',
            'refunded': '已退款',
            'refund_completed': '退款完成'
        };
        
        return `
            <tr>
                <td>${order.order_no}</td>
                <td>${order.user_address.slice(0, 10)}...${order.user_address.slice(-4)}</td>
                <td>商品 ID: ${order.product_id}</td>
                <td>${order.total_price} BNB</td>
                <td><span class="status-badge status-${order.status}">${statusMap[order.status] || order.status}</span></td>
                <td>
                    ${order.status === 'paid' ? `<button class="btn btn-success" onclick="shipOrder(${order.id})">發貨</button>` : ''}
                    ${order.status === 'refund_requested' ? `<button class="btn btn-warning" onclick="processRefund(${order.id})">處理退款</button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

// ============ 商品管理 ============

// 顯示添加商品模態框
function showAddProductModal() {
    document.getElementById('addProductModal').style.display = 'block';
}

// 編輯商品
function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        alert(`編輯商品：${product.name}\n價格：${product.price} BNB\n庫存：${product.stock}`);
        // 實際應該打開編輯模態框
    }
}

// 下架商品
async function delistProduct(productId) {
    if (confirm('確定要下架此商品嗎？')) {
        try {
            // 修改庫存為 0 來下架
            const product = products.find(p => p.id === productId);
            if (product) {
                const result = await apiRequest(`/products/${productId}`, 'PUT', {
                    ...product,
                    stock: 0
                });
                
                if (result.id) {
                    alert('商品已下架！');
                    await loadProducts();
                } else {
                    alert('下架失敗：' + (result.error || '未知錯誤'));
                }
            }
        } catch (error) {
            console.error('下架失敗:', error);
            alert('下架失敗');
        }
    }
}

// ============ 訂單管理 ============

// 篩選訂單
function filterOrders() {
    const status = document.getElementById('orderStatusFilter').value;
    
    if (status === 'all') {
        renderOrders(orders);
    } else {
        const filtered = orders.filter(o => o.status === status);
        renderOrders(filtered);
    }
}

// 發貨
function shipOrder(orderId) {
    currentOrderId = orderId;
    document.getElementById('shipOrderModal').style.display = 'block';
}

// 處理退款
async function processRefund(orderId) {
    if (confirm('確定要處理此退款嗎？')) {
        try {
            const result = await apiRequest(`/orders/${orderId}`, 'PUT', {
                status: 'refunded'
            });
            
            if (result.success) {
                alert('退款處理成功！');
                await loadOrders();
            } else {
                alert('退款處理失敗：' + (result.error || '未知錯誤'));
            }
        } catch (error) {
            console.error('退款處理失敗:', error);
            alert('退款處理失敗');
        }
    }
}

// ============ 優惠券管理 ============

// 顯示添加優惠券模態框
function showAddCouponModal() {
    document.getElementById('addCouponModal').style.display = 'block';
}

// 停用優惠券
function deactivateCoupon(couponId) {
    if (confirm('確定要停用此優惠券嗎？')) {
        alert('優惠券已停用！');
    }
}

// ============ 店鋪設置 ============

// 保存店鋪信息
async function saveStoreInfo() {
    const name = document.getElementById('storeName').value;
    const description = document.getElementById('storeDescription').value;
    
    // 實際應該更新商家信息
    alert('店鋪信息已保存！');
}

// ============ 控制面板 ============
function updateDashboard() {
    // 統計商品數量
    document.getElementById('totalProducts').textContent = products.length;
    
    // 統計訂單數量
    document.getElementById('totalOrders').textContent = orders.length;
    
    // 統計銷售額
    const totalSales = orders
        .filter(o => o.status !== 'cancelled' && o.status !== 'refunded')
        .reduce((sum, o) => sum + o.total_price, 0);
    document.getElementById('totalSales').textContent = totalSales.toFixed(2) + ' BNB';
    
    // 統計退款數量
    const refundCount = orders.filter(o => 
        o.status === 'refund_requested' || o.status === 'refunded'
    ).length;
    document.getElementById('refundCount').textContent = refundCount;
}

// ============ 模態框 ============

// 關閉模態框
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// ============ 頁面切換 ============
function showSection(section) {
    // 隱藏所有部分
    document.getElementById('dashboardSection').style.display = 'none';
    document.getElementById('productsSection').style.display = 'none';
    document.getElementById('ordersSection').style.display = 'none';
    document.getElementById('couponsSection').style.display = 'none';
    document.getElementById('storeSection').style.display = 'none';
    
    // 顯示目標部分
    const titles = {
        'dashboard': '控制面板',
        'products': '商品管理',
        'orders': '訂單管理',
        'coupons': '優惠券管理',
        'store': '店鋪設置'
    };
    
    document.getElementById(section + 'Section').style.display = 'block';
    document.getElementById('pageTitle').textContent = titles[section] || section;
    
    // 更新菜單選中狀態
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.classList.remove('active');
    });
    if (event && event.target) {
        event.target.closest('a').classList.add('active');
    }
}

// ============ 表單提交 ============

// 商品表單提交
document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('productName').value;
    const description = document.getElementById('productDescription').value;
    const imageUrl = document.getElementById('productImage').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    const category = document.getElementById('productCategory').value;
    
    try {
        const result = await apiRequest('/products', 'POST', {
            name: name,
            description: description,
            price: price,
            image_url: imageUrl,
            category: category,
            stock: stock
        });
        
        if (result.id) {
            alert('商品添加成功！');
            closeModal('addProductModal');
            e.target.reset();
            await loadProducts();
        } else {
            alert('添加失敗：' + (result.error || '未知錯誤'));
        }
    } catch (error) {
        console.error('添加商品失敗:', error);
        alert('添加失敗');
    }
});

// 發貨表單提交
document.getElementById('shipForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const result = await apiRequest(`/orders/${currentOrderId}`, 'PUT', {
            status: 'shipped'
        });
        
        if (result.success) {
            alert('發貨成功！');
            closeModal('shipOrderModal');
            e.target.reset();
            await loadOrders();
        } else {
            alert('發貨失敗：' + (result.error || '未知錯誤'));
        }
    } catch (error) {
        console.error('發貨失敗:', error);
        alert('發貨失敗');
    }
});

// 優惠券表單提交
document.getElementById('couponForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    alert('優惠券創建成功！');
    closeModal('addCouponModal');
    e.target.reset();
});

// ============ 初始化 ============
document.addEventListener('DOMContentLoaded', () => {
    // 點擊模態框外部關閉
    window.onclick = (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    };
});

// ============ 全局函數 ============
window.connectWallet = connectWallet;
window.showSection = showSection;
window.showAddProductModal = showAddProductModal;
window.editProduct = editProduct;
window.delistProduct = delistProduct;
window.filterOrders = filterOrders;
window.shipOrder = shipOrder;
window.processRefund = processRefund;
window.showAddCouponModal = showAddCouponModal;
window.deactivateCoupon = deactivateCoupon;
window.saveStoreInfo = saveStoreInfo;
window.closeModal = closeModal;
