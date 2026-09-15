// ============================================
// 🔌 API Client (JSONP + Memory Cache)
// ============================================
const API = (() => {
  const CALLBACK_PREFIX = 'gsCb_' + Date.now() + '_';
  
  function jsonp(params, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const cbName = CALLBACK_PREFIX + Math.floor(Math.random() * 1e9);
      const script = document.createElement('script');
      let done = false;
      
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        cleanup();
        reject(new Error('Timeout'));
      }, timeout);
      
      function cleanup() {
        clearTimeout(timer);
        delete window[cbName];
        if (script.parentNode) script.parentNode.removeChild(script);
      }
      
      window[cbName] = (r) => {
        if (done) return;
        done = true;
        cleanup();
        if (r && r.success) resolve(r.data);
        else reject(new Error(r?.error || 'API error'));
      };
      
      const query = new URLSearchParams({ ...params, callback: cbName, _t: Date.now() });
      script.src = `${CONFIG.API_URL}?${query}`;
      script.onerror = () => { if (!done) { done = true; cleanup(); reject(new Error('Network error')); } };
      document.body.appendChild(script);
    });
  }
  
  let fullDataCache = null;
  let fullDataTime = 0;
  
  return {
    getFullData: async (force = false) => {
      const now = Date.now();
      if (!force && fullDataCache && (now - fullDataTime) < CONFIG.CACHE_TTL) {
        return fullDataCache;
      }
      fullDataCache = await jsonp({ action: 'getFullData' });
      fullDataTime = now;
      return fullDataCache;
    },
    
    getTransactions: async (filters = {}) => {
      const full = await API.getFullData();
      let txs = full.transactions || [];
      
      if (filters.startDate) txs = txs.filter(t => t.date >= filters.startDate);
      if (filters.endDate) txs = txs.filter(t => t.date <= filters.endDate);
      if (filters.category && filters.category !== 'all') {
        txs = txs.filter(t => t.category === filters.category);
      }
      
      return txs.sort((a, b) => {
        const c = (b.date || '').localeCompare(a.date || '');
        return c !== 0 ? c : (b.timestamp || '').localeCompare(a.timestamp || '');
      });
    },
    
    getInitialData: () => jsonp({ action: 'getInitialData' }),
    
    getDashboardStats: async () => {
      const full = await API.getFullData();
      return {
        stats: full.stats,
        categoryStats: full.categoryStats,
        paymentStats: full.paymentStats,
        weeklyBreakdown: full.weeklyBreakdown,
        dailyBreakdown: full.dailyBreakdown,
        budgetSummary: full.budgetSummary,
        budgets: full.budgets,
        settings: full.settings
      };
    },
    
    addTransaction: (data) => jsonp({ action: 'addTransaction', data: JSON.stringify(data) })
      .then(r => { fullDataCache = null; return r; }),
    updateTransaction: (id, data) => jsonp({ action: 'updateTransaction', id, data: JSON.stringify(data) })
      .then(r => { fullDataCache = null; return r; }),
    deleteTransaction: (id) => jsonp({ action: 'deleteTransaction', id })
      .then(r => { fullDataCache = null; return r; }),
    
    addCategory: (data) => jsonp({ action: 'addCategory', data: JSON.stringify(data) })
      .then(r => { fullDataCache = null; return r; }),
    updateCategory: (id, data) => jsonp({ action: 'updateCategory', id, data: JSON.stringify(data) })
      .then(r => { fullDataCache = null; return r; }),
    deleteCategory: (id) => jsonp({ action: 'deleteCategory', id })
      .then(r => { fullDataCache = null; return r; }),
    
    addPaymentType: (data) => jsonp({ action: 'addPaymentType', data: JSON.stringify(data) })
      .then(r => { fullDataCache = null; return r; }),
    updatePaymentType: (id, data) => jsonp({ action: 'updatePaymentType', id, data: JSON.stringify(data) })
      .then(r => { fullDataCache = null; return r; }),
    deletePaymentType: (id) => jsonp({ action: 'deletePaymentType', id })
      .then(r => { fullDataCache = null; return r; }),
    
    setBudget: (categoryId, monthlyLimit, alertPercent) =>
      jsonp({ action: 'setBudget', categoryId, monthlyLimit, alertPercent })
        .then(r => { fullDataCache = null; return r; }),
    
    clearCache: () => { fullDataCache = null; fullDataTime = 0; }
  };
})();
