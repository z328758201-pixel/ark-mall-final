// API 配置
const API_BASE = 'https://arkmall-simple-production.up.railway.app';

// Dexscreener API (ARK 價格)
const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/pairs/bsc/0xCAaF3c41a40103a23Eeaa4BbA468AF3cF5b0e0D8';

// 代幣合約地址
const TOKEN_CONTRACTS = {
    BNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    ARK: '0xCae117ca6Bc8A341D2E7207F30E180f0e5618B9D',
    USDT: '0x55d398326f99059fF775485246999027B3197955'
};

// 匯率數據
let exchangeRates = {
    bnb: 0,
    ark: 0,
    usdCny: 6.79 // 默認匯率
};

// CORS 代理
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

// 載入匯率
async function loadExchangeRates() {
    try {
        console.log('開始載入匯率...');
        
        // 1. 從 Binance 獲取 BNB/USDT 價格
        try {
            const bnbResponse = await fetch(CORS_PROXY + encodeURIComponent('https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT'));
            const bnbData = await bnbResponse.json();
            exchangeRates.bnb = parseFloat(bnbData.price);
            console.log('BNB 價格:', exchangeRates.bnb);
        } catch (e) {
            console.error('獲取 BNB 價格失敗:', e);
            exchangeRates.bnb = 575.74; // 默認值
        }
        
        // 2. 從 Dexscreener 獲取 ARK/USDT 價格
        try {
            const arkResponse = await fetch(CORS_PROXY + encodeURIComponent(DEXSCREENER_API));
            const arkData = await arkResponse.json();
            if (arkData.pairs && arkData.pairs.length > 0) {
                exchangeRates.ark = parseFloat(arkData.pairs[0].priceUsd);
                console.log('ARK 價格:', exchangeRates.ark);
            }
        } catch (e) {
            console.error('獲取 ARK 價格失敗:', e);
            exchangeRates.ark = 7.80; // 默認值
        }
        
        // 3. 從 exchangerate-api 獲取 USD/CNY 匯率
        try {
            const cnyResponse = await fetch(CORS_PROXY + encodeURIComponent('https://api.exchangerate-api.com/v4/latest/USD'));
            const cnyData = await cnyResponse.json();
            if (cnyData.rates && cnyData.rates.CNY) {
                exchangeRates.usdCny = parseFloat(cnyData.rates.CNY);
                console.log('USD/CNY 匯率:', exchangeRates.usdCny);
            }
        } catch (e) {
            console.error('獲取 USD/CNY 匯率失敗:', e);
            exchangeRates.usdCny = 6.79; // 默認值
        }
        
        console.log('匯率載入完成:', exchangeRates);
    } catch (error) {
        console.error('載入匯率失敗:', error);
        // 使用默認值
        exchangeRates = {
            bnb: 575.74,
            ark: 7.80,
            usdCny: 6.79
        };
    }
}

// 格式化多種代幣價格（接受 USD 價格）
function formatAllPrices(usdPrice) {
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

// 其他函數保持不變...
