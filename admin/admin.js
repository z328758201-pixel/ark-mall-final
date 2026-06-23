// 管理後台 JavaScript
// 支持商家審核、商品管理、訂單管理、系統設置

// ============ 全局變量 ============
let provider;
let signer;
let currentAccount = null;

// 管理員地址
const ADMIN_ADDRESS = "0x6b6278b766b7db9b347e0dabb4C8bf4F6f09B429";

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
        
        // 驗證是否為管理員
        if (currentAccount.toLowerCase() !== ADMIN_ADDRESS.toLowerCase()) {
            alert('警告：您不是管理員地址！');
        }
        
        console.log('錢包連接成功:', currentAccount);
        
    } catch (error) {
        console.error('連接失敗:', error);
    }
}

// ============ 頁面切換 ============
function showSection(section) {
    // 隱藏所有部分
    document.getElementById('dashboardSection').style.display = 'none';
    document.getElementById('merchantsSection').style.display = 'none';
    document.getElementById('productsSection').style.display = 'none';
    document.getElementById('ordersSection').style.display = 'none';
    document.getElementById('settingsSection').style.display = 'none';
    
    // 顯示目標部分
    switch (section) {
        case 'dashboard':
            document.getElementById('dashboardSection').style.display = 'block';
            document.getElementById('pageTitle').textContent = '控制面板';
            break;
        case 'merchants':
            document.getElementById('merchantsSection').style.display = 'block';
            document.getElementById('pageTitle').textContent = '商家審核';
            break;
        case 'products':
            document.getElementById('productsSection').style.display = 'block';
            document.getElementById('pageTitle').textContent = '商品管理';
            break;
        case 'orders':
            document.getElementById('ordersSection').style.display = 'block';
            document.getElementById('pageTitle').textContent = '訂單管理';
            break;
        case 'settings':
            document.getElementById('settingsSection').style.display = 'block';
            document.getElementById('pageTitle').textContent = '系統設置';
            break;
    }
    
    // 更新菜單選中狀態
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.classList.remove('active');
    });
    event.target.closest('a').classList.add('active');
}

// ============ 商家審核 ============

// 審核通過
function approveMerchant(merchantAddress) {
    if (!currentAccount || currentAccount.toLowerCase() !== ADMIN_ADDRESS.toLowerCase()) {
        alert('只有管理員可以審核商家！');
        return;
    }
    
    if (confirm(`確定要審核通過商家 ${merchantAddress} 嗎？`)) {
        // 實際應該調用合約的 approveMerchant 函數
        // const tx = await contract.approveMerchant(merchantAddress, true);
        // await tx.wait();
        
        alert('商家審核通過！');
        // 刷新列表
        filterMerchants();
    }
}

// 拒絕
function rejectMerchant(merchantAddress) {
    if (!currentAccount || currentAccount.toLowerCase() !== ADMIN_ADDRESS.toLowerCase()) {
        alert('只有管理員可以審核商家！');
        return;
    }
    
    if (confirm(`確定要拒絕商家 ${merchantAddress} 嗎？`)) {
        // 實際應該調用合約的 approveMerchant 函數
        // const tx = await contract.approveMerchant(merchantAddress, false);
        // await tx.wait();
        
        alert('商家已拒絕！');
        // 刷新列表
        filterMerchants();
    }
}

// 篩選商家
function filterMerchants() {
    const status = document.getElementById('merchantStatusFilter').value;
    
    // 實際應該從合約獲取商家並篩選
    console.log('篩選狀態:', status);
}

// 查看商家詳情
function viewMerchant(merchantAddress) {
    // 實際應該從合約獲取商家信息
    const merchantInfo = {
        address: merchantAddress,
        storeName: 'ARK 服飾店',
        storeDescription: '專注 ARK 品牌服飾，高品質棉質 T-Shirt、帽子等',
        storeLogo: 'https://picsum.photos/100/100?random=10',
        depositAmount: '20 ARK',
        totalSales: 1250,
        totalOrders: 456
    };
    
    const container = document.getElementById('merchantDetailContent');
    container.innerHTML = `
        <div class="merchant-info">
            <div>
                <div class="merchant-field">
                    <label>商家地址</label>
                    <value>${merchantInfo.address}</value>
                </div>
                <div class="merchant-field">
                    <label>店鋪名稱</label>
                    <value>${merchantInfo.storeName}</value>
                </div>
                <div class="merchant-field">
                    <label>店鋪簡介</label>
                    <value>${merchantInfo.storeDescription}</value>
                </div>
            </div>
            <div>
                <div class="merchant-field">
                    <label>保證金</label>
                    <value>${merchantInfo.depositAmount}</value>
                </div>
                <div class="merchant-field">
                    <label>總銷售額</label>
                    <value>${merchantInfo.totalSales} BNB</value>
                </div>
                <div class="merchant-field">
                    <label>總訂單數</label>
                    <value>${merchantInfo.totalOrders}</value>
                </div>
            </div>
        </div>
        <div style="margin-top: 30px;">
            <img src="${merchantInfo.storeLogo}" style="width: 150px; height: 150px; object-fit: cover; border-radius: 15px;">
        </div>
    `;
    
    document.getElementById('merchantDetailModal').style.display = 'block';
}

// ============ 模態框 ============

// 關閉模態框
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

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
window.approveMerchant = approveMerchant;
window.rejectMerchant = rejectMerchant;
window.filterMerchants = filterMerchants;
window.viewMerchant = viewMerchant;
window.closeModal = closeModal;
