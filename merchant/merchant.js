// 商家後台 JavaScript
// 支持商品管理、訂單管理、優惠券管理、物流管理

// ============ 全局變量 ============
let provider;
let signer;
let currentAccount = null;

// 當前訂單 ID（用於發貨）
let currentOrderId = null;

// ============ 錢包連接 ============
async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        alert('請安裝 MetaMask！');
        return;
    }
    
    try {
        provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = await provider.getSigner();
        
        currentAccount = await signer.getAddress();
        
        document.getElementById('walletAddress').textContent = currentAccount.slice(0, 6) + '...' + currentAccount.slice(-4);
        
        console.log('錢包連接成功:', currentAccount);
        
    } catch (error) {
        console.error('連接失敗:', error);
    }
}

// ============ 頁面切換 ============
function showSection(section) {
    // 隱藏所有部分
    document.getElementById('dashboardSection').style.display = 'none';
    document.getElementById('productsSection').style.display = 'none';
    document.getElementById('ordersSection').style.display = 'none';
    document.getElementById('couponsSection').style.display = 'none';
    document.getElementById('storeSection').style.display = 'none';
    document.getElementById('statsSection').style.display = 'none';
    
    // 顯示目標部分
    switch (section) {
        case 'dashboard':
            document.getElementById('dashboardSection').style.display = 'block';
            document.getElementById('pageTitle').textContent = '控制面板';
            break;
        case 'products':
            document.getElementById('productsSection').style.display = 'block';
            document.getElementById('pageTitle').textContent = '商品管理';
            break;
        case 'orders':
            document.getElementById('ordersSection').style.display = 'block';
            document.getElementById('pageTitle').textContent = '訂單管理';
            break;
        case 'coupons':
            document.getElementById('couponsSection').style.display = 'block';
            document.getElementById('pageTitle').textContent = '優惠券管理';
            break;
        case 'store':
            document.getElementById('storeSection').style.display = 'block';
            document.getElementById('pageTitle').textContent = '店鋪設置';
            break;
        case 'stats':
            document.getElementById('statsSection').style.display = 'block';
            document.getElementById('pageTitle').textContent = '數據統計';
            break;
    }
    
    // 更新菜單選中狀態
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.classList.remove('active');
    });
    event.target.closest('a').classList.add('active');
}

// ============ 商品管理 ============

// 顯示添加商品模態框
function showAddProductModal() {
    document.getElementById('addProductModal').style.display = 'block';
}

// 編輯商品
function editProduct(productId) {
    // 實際應該從合約獲取商品信息
    alert('編輯商品功能開發中...');
}

// 下架商品
function delistProduct(productId) {
    if (confirm('確定要下架此商品嗎？')) {
        // 實際應該調用合約的 delistProduct 函數
        alert('商品已下架');
    }
}

// ============ 訂單管理 ============

// 篩選訂單
function filterOrders() {
    const status = document.getElementById('orderStatusFilter').value;
    
    // 實際應該從合約獲取訂單並篩選
    console.log('篩選狀態:', status);
}

// 發貨
function shipOrder(orderId) {
    currentOrderId = orderId;
    document.getElementById('shipOrderModal').style.display = 'block';
}

// ============ 優惠券管理 ============

// 顯示添加優惠券模態框
function showAddCouponModal() {
    document.getElementById('addCouponModal').style.display = 'block');
}

// 停用優惠券
function deactivateCoupon(couponId) {
    if (confirm('確定要停用此優惠券嗎？')) {
        // 實際應該調用合約的 deactivateCoupon 函數
        alert('優惠券已停用');
    }
}

// ============ 店鋪設置 ============

// 保存店鋪信息
function saveStoreInfo() {
    const name = document.getElementById('storeName').value;
    const description = document.getElementById('storeDescription').value;
    const logo = document.getElementById('storeLogo').value;
    
    // 實際應該調用合約的 updateStoreInfo 函數
    alert('店鋪信息已保存');
}

// ============ 模態框 ============

// 關閉模態框
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// ============ 表單提交 ============

// 商品表單提交
document.getElementById('productForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('productName').value;
    const description = document.getElementById('productDescription').value;
    const imageUrl = document.getElementById('productImage').value;
    const price = document.getElementById('productPrice').value;
    const stock = document.getElementById('productStock').value;
    const category = document.getElementById('productCategory').value;
    const isRefundable = document.getElementById('productRefundable').checked;
    
    // 實際應該調用合約的 listProduct 函數
    alert('商品添加成功！');
    closeModal('addProductModal');
    e.target.reset();
});

// 發貨表單提交
document.getElementById('shipForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const company = document.getElementById('shippingCompany').value;
    const number = document.getElementById('shippingNumber').value;
    
    const shippingInfo = `${company} ${number}`;
    
    // 實際應該調用合約的 shipOrder 函數
    alert('發貨成功！物流信息已更新');
    closeModal('shipOrderModal');
    e.target.reset();
});

// 優惠券表單提交
document.getElementById('couponForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('couponName').value;
    const discount = document.getElementById('couponDiscount').value;
    const minAmount = document.getElementById('couponMinAmount').value;
    const maxDiscount = document.getElementById('couponMaxDiscount').value;
    const quantity = document.getElementById('couponQuantity').value;
    const expiry = document.getElementById('couponExpiry').value;
    
    // 實際應該調用合約的 createCoupon 函數
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
window.showAddCouponModal = showAddCouponModal;
window.deactivateCoupon = deactivateCoupon;
window.saveStoreInfo = saveStoreInfo;
window.closeModal = closeModal;
