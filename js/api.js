// ============================================
// 🔌 API Client - ใช้ JSONP เลี่ยง CORS
// ============================================
const API = (() => {
  const cache = new Map();
  
  // สร้าง JSONP request (เลี่ยง CORS กับ Google Apps Script)
  function jsonp(params, timeout = 15000) {
    return new Promise((resolve, reject) => {
      const callbackName = 'gsCallback_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const script = document.createElement('script');
      
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Request timeout'));
      }, timeout);
      
      function cleanup() {
        clearTimeout(timer);
        delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
      }
      
      window[callbackName] = (response) => {
        cleanup();
        if (response.success) resolve(response.data);
        else reject(new Error(response.error || 'API error'));
      };
      
      const query = new URLSearchParams({
        ...params,
        callback: callbackName,
        _t: Date.now()  // กัน cache ของ browser
      });
      
      script.src = `${CONFIG.API_URL}?${query}`;
      script.onerror = () => { cleanup(); reject(new Error('Network error')); };
      document.body.appendChild(script);
    });
  }
  
  // POST ผ่าน fetch (fallback)
  async function post(params) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(params)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    return json.data;
  }
  
  // Cache wrapper
  async function cached(key, fn, ttl = CONFIG.CACHE_TTL) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.time < ttl) return hit.data;
    
    const data = await fn();
    cache.set(key, { data, time: Date.now() });
    return data;
  }
  
  function clearCache(prefix) {
    if (!prefix) return cache.clear();
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) cache.delete(key);
    }
  }
  
  // ✅ API Methods
  return {
    // โหลดทุกอย่างในครั้งเดียว (เร็วที่สุด)
    getFullData: () => cached('full', () => jsonp({ action: 'getFullData' })),
    
    getInitialData: () => cached('init', () => jsonp({ action: 'getInitialData' })),
    getDashboardStats: () => cached('stats', () => jsonp({ action: 'getDashboardStats' })),
    getTransactions: (filters) => jsonp({ action: 'getTransactions', ...filters }),
    
    // Mutations (ไม่แคช + clear cache)
    addTransaction: (data) => post({ action: 'addTransaction', data }).then(r => { clearCache(); return r; }),
    updateTransaction: (id, data) => post({ action: 'updateTransaction', id, data }).then(r => { clearCache(); return r; }),
    deleteTransaction: (id) => post({ action: 'deleteTransaction', id }).then(r => { clearCache(); return r; }),
    
    addCategory: (data) => post({ action: 'addCategory', data }).then(r => { clearCache(); return r; }),
    updateCategory: (id, data) => post({ action: 'updateCategory', id, data }).then(r => { clearCache(); return r; }),
    deleteCategory: (id) => post({ action: 'deleteCategory', id }).then(r => { clearCache(); return r; }),
    
    addPaymentType: (data) => post({ action: 'addPaymentType', data }).then(r => { clearCache(); return r; }),
    updatePaymentType: (id, data) => post({ action: 'updatePaymentType', id, data }).then(r => { clearCache(); return r; }),
    deletePaymentType: (id) => post({ action: 'deletePaymentType', id }).then(r => { clearCache(); return r; }),
    
    setBudget: (categoryId, monthlyLimit, alertPercent) =>
      post({ action: 'setBudget', categoryId, monthlyLimit, alertPercent }).then(r => { clearCache(); return r; }),
    
    clearCache
  };
})();
