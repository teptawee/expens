// ============================================
// 🔌 API Client (fetch + cache)
// ============================================
const API = (() => {
  const cache = new Map();
  
  async function request(params, timeout = 20000) {
    const query = new URLSearchParams({ ...params, _t: Date.now() });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    
    try {
      const url = `${CONFIG.API_URL}?${query}`;
      console.log('🔍 API:', url);
      
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal
      });
      
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'API error');
      return json.data;
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') throw new Error('Request timeout');
      throw err;
    }
  }
  
  async function post(params) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(params),
      redirect: 'follow'
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    return json.data;
  }
  
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
  
  return {
    getFullData: () => cached('full', () => request({ action: 'getFullData' })),
    getInitialData: () => cached('init', () => request({ action: 'getInitialData' })),
    getDashboardStats: () => cached('stats', () => request({ action: 'getDashboardStats' })),
    getTransactions: (filters) => request({ action: 'getTransactions', ...filters }),
    
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
