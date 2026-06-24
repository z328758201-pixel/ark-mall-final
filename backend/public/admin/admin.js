// 管理後台 JavaScript
// 支持商家審核、商品管理、訂單管理

// ============ 全局變量 ============
const API_BASE = 'https://arkmall-simple-production.up.railway.app/api';
let provider;
let signer;
let currentAccount = null;

// 管理員地址
const ADMIN_ADDRESS = "0x6b6278b766b7db9b347e0dabb4C8bf4F6f09B429";

// 數據
let merchants = [];
let products = [];
let orders = [];

// ============ API 請求 ============
async function apiRequest(endpoint, method, data) {
    try {
        const options = {
            method: method || 'GET',
            headers: { 'Content-Type': 'application/json' }
        };
        if (data) options.body = JSON.stringify(data);
        const response = await fetch(API_BASE + endpoint, options);
        return await response.json();
    } catch (error) {
        console.error('API 請求失敗:', error);
        return { error: error.message };
    }
}

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
        if (currentAccount.toLowerCase() !== ADMIN_ADDRESS.toLowerCase()) {
            alert('警告：您不是管理員地址！');
        }
        loadDashboard();
    } catch (error) {
        console.error('連接失敗:', error);
    }
}

// ============ 頁面切換 ============
function showSection(section) {
    ['dashboard','merchants','products','orders','settings'].forEach(s => {
        var el = document.getElementById(s + 'Section');
        if (el) el.style.display = 'none';
    });
    var el = document.getElementById(section + 'Section');
    if (el) el.style.display = 'block';
    var titles = { dashboard:'控制面板', merchants:'商家審核', products:'商品管理', orders:'訂單管理', settings:'系統設置' };
    document.getElementById('pageTitle').textContent = titles[section] || section;
    document.querySelectorAll('.sidebar-menu a').forEach(function(link) { link.classList.remove('active'); });
    if (event && event.target) {
        var a = event.target.closest('a');
        if (a) a.classList.add('active');
    }
    if (section === 'merchants') loadMerchants();
    else if (section === 'products') loadProducts();
    else if (section === 'orders') loadOrders();
    else if (section === 'dashboard') loadDashboard();
}

// ============ 控制面板 ============
async function loadDashboard() {
    var mr = await apiRequest('/merchants');
    if (mr.success) { merchants = mr.data; document.getElementById('totalMerchants').textContent = merchants.length; }
    var pr = await apiRequest('/merchants/pending');
    if (pr.success) { document.getElementById('pendingMerchants').textContent = pr.data.length; }
    var pdr = await apiRequest('/products');
    if (Array.isArray(pdr)) { products = pdr; document.getElementById('totalProducts').textContent = products.length; }
    var or2 = await apiRequest('/orders');
    if (Array.isArray(or2)) { orders = or2; document.getElementById('totalOrders').textContent = orders.length; }
}

// ============ 商家審核 ============
async function loadMerchants() {
    // 加載所有商家（包括待審核）
    var pending = await apiRequest('/merchants/pending');
    var approved = await apiRequest('/merchants');
    var all = [];
    if (pending.success) all = all.concat(pending.data);
    if (approved.success) all = all.concat(approved.data);
    merchants = all;
    renderMerchants(all);
}

function renderMerchants(list) {
    var tbody = document.getElementById('merchantsTableBody');
    if (!tbody) return;
    if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">暫無商家</td></tr>';
        return;
    }
    tbody.innerHTML = list.map(function(m) {
        var statusClass = m.status === 'approved' ? 'status-paid' : (m.status === 'pending' ? 'status-pending' : 'status-completed');
        var statusText = m.status === 'approved' ? '已通過' : (m.status === 'pending' ? '待審核' : '已拒絕');
        var actions = m.status === 'pending'
            ? '<button class="btn btn-success" onclick="approveMerchant(' + m.id + ')">通過</button> <button class="btn btn-danger" onclick="rejectMerchant(' + m.id + ')">拒絕</button>'
            : '<button class="btn btn-secondary" disabled>' + statusText + '</button>';
        return '<tr>' +
            '<td>' + m.id + '</td>' +
            '<td>' + m.name + '</td>' +
            '<td>' + m.address.slice(0, 10) + '...' + m.address.slice(-4) + '</td>' +
            '<td><span class="status-badge ' + statusClass + '">' + statusText + '</span></td>' +
            '<td>' + new Date(m.created_at).toLocaleString('zh-CN') + '</td>' +
            '<td>' + actions + '</td>' +
        '</tr>';
    }).join('');
}

async function approveMerchant(id) {
    if (!currentAccount) { alert('請先連接錢包！'); return; }
    if (confirm('確定要審核通過此商家嗎？')) {
        var r = await apiRequest('/merchants/' + id + '/approve', 'PUT');
        if (r.success) { alert('商家審核通過！'); loadMerchants(); }
        else { alert('審核失敗：' + (r.message || r.error)); }
    }
}

async function rejectMerchant(id) {
    if (!currentAccount) { alert('請先連接錢包！'); return; }
    if (confirm('確定要拒絕此商家嗎？')) {
        alert('商家已拒絕！');
        loadMerchants();
    }
}

function filterMerchants() {
    var status = document.getElementById('merchantStatusFilter').value;
    if (status === 'all') renderMerchants(merchants);
    else renderMerchants(merchants.filter(function(m) { return m.status === status; }));
}

function viewMerchant(id) {
    var m = merchants.find(function(x) { return x.id === id; });
    if (!m) return;
    alert('商家：' + m.name + '\n地址：' + m.address + '\n狀態：' + m.status);
}

// ============ 商品管理 ============
async function loadProducts() {
    var r = await apiRequest('/products');
    if (Array.isArray(r)) { products = r; renderProducts(products); }
}

function renderProducts(list) {
    var tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">暫無商品</td></tr>';
        return;
    }
    tbody.innerHTML = list.map(function(p) {
        return '<tr>' +
            '<td>' + p.id + '</td>' +
            '<td>' + p.name + '</td>' +
            '<td>' + p.price + ' BNB</td>' +
            '<td>' + p.stock + '</td>' +
            '<td><span class="status-badge status-paid">上架中</span></td>' +
            '<td><button class="btn btn-secondary" onclick="alert(\'編輯功能開發中\')">編輯</button></td>' +
        '</tr>';
    }).join('');
}

// ============ 訂單管理 ============
async function loadOrders() {
    var r = await apiRequest('/orders');
    if (Array.isArray(r)) { orders = r; renderOrders(orders); }
}

function renderOrders(list) {
    var tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">暫無訂單</td></tr>';
        return;
    }
    tbody.innerHTML = list.map(function(o) {
        var statusMap = { pending:'待支付', paid:'已支付', shipped:'已發貨', received:'已簽收', completed:'已完成' };
        return '<tr>' +
            '<td>' + o.order_no + '</td>' +
            '<td>' + o.user_address.slice(0, 10) + '...' + o.user_address.slice(-4) + '</td>' +
            '<td>' + o.product_id + '</td>' +
            '<td>' + o.total_price + ' BNB</td>' +
            '<td><span class="status-badge status-paid">' + (statusMap[o.status] || o.status) + '</span></td>' +
            '<td>' + new Date(o.created_at).toLocaleString('zh-CN') + '</td>' +
        '</tr>';
    }).join('');
}

// ============ 模態框 ============
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// ============ 初始化 ============
document.addEventListener('DOMContentLoaded', function() {
    window.onclick = function(e) {
        if (e.target.classList.contains('modal')) e.target.style.display = 'none';
    };
});

// ============ 全局函數 ============
window.connectWallet = connectWallet;
window.showSection = showSection;
window.approveMerchant = approveMerchant;
window.rejectMerchant = rejectMerchant;
window.filterMerchants = filterMerchants;
window.viewMerchant = viewMerchant;
window.closeModal = closeModal;
