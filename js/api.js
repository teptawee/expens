// ============================================
// 🔌 API Client (JSONP + POST) — เลี่ยง CORS
// ============================================
const API = (() => {
  const cache = new Map();
  const CALLBACK_PREFIX = 'gsCb_' + Date.now() + '_';
  
  // ✅ JSONP — เลี่ยง CORS ได้ 100% (ใช้กับ GET)
  function jsonp(params, timeout = 20000) {
    return new Promise((resolve, reject) => {
      const cbName = CALLBACK_PREFIX + Math.floor(Math.random() * 1e9);
      const script = document.createElement('script');
      let done = false;
      
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        cleanup();
        reject(new Error('Request timeout'));
      }, timeout);
      
      function cleanup() {
        clearTimeout(timer);
        delete window[cbName];
        if (script.parentNode) script.parentNode.removeChild(script);
      }
      
      window[cbName] = (response) => {
        if (done) return;
        done = true;
        cleanup();
        if (response && response.success) resolve(response.data);
        else reject(new Error(response?.error || 'API error'));
      };
      
      const query = new URLSearchParams({
        ...params,
        callback: cbName,
        _t: Date.now()
      });
      
      script.src = `${CONFIG.API_URL}?${query}`;
      script.onerror = () => {
        if (done) return;
        done = true;
        cleanup();
        reject(new Error('Network error'));
      };
      
      console.log('🔍 JSONP:', script.src);
      document.body.appendChild(script);
    });
  }
  
  // ✅ POST ผ่าน <form> + iframe (สำหรับ mutation ที่ส่งข้อมูลยาว)
  // แต่ของเราใช้ JSONP กับทุกอย่างได้ — ส่ง params ผ่าน query string ไปเลย
  // (ยกเว้นข้อมูลที่ยาวมาก เช่น note ยาวๆ จะใช้วิธีนี้)
  function postViaIframe(params) {
    return new Promise((resolve, reject) => {
      const cbName = CALLBACK_PREFIX + Math.floor(Math.random() * 1e9);
      const iframeName = 'iframe_' + cbName;
      
      window[cbName] = (response) => {
        try {
          if (response && response.success) resolve(response.data);
          else reject(new Error(response?.error || 'API error'));
        } finally {
          setTimeout(() => {
            delete window[cbName];
            const f = document.getElementById(iframeName);
            if (f) f.remove();
          }, 100);
        }
      };
      
      const iframe = document.createElement('iframe');
      iframe.name = iframeName;
      iframe.id = iframeName;
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = CONFIG.API_URL + '?callback=' + cbName;
      form.target = iframeName;
      form.style.display = 'none';
      
      // ✅ ส่ง params เป็น JSON string ผ่าน hidden input
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'payload';
      input.value = JSON.stringify(params);
      form.appendChild(input);
      
      document.body.appendChild(form);
      form.submit();
      
      setTimeout(() => form.remove(), 1000);
    });
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
  
  // ✅ ใช้ JSONP สำหรับ GET ทุกอย่าง (รวม mutations ที่ params ไม่ยาว)
  // ถ้า params ยาว (note) จะใช้ iframe post
  function send(action, params, usePost) {
    const fullParams = { action, ...params };
    
    // ถ้ามี note หรือ JSON ยาวๆ → ใช้ POST
    const jsonStr = JSON.stringify(fullParams);
    if (usePost || jsonStr.length > 1800) {
      return postViaIframe(fullParams);
    }
    return jsonp(fullParams);
  }
  
  return {
    getFullData: () => cached('full', () => send('getFullData', {})),
    getInitialData: () => cached('init', () => send('getInitialData', {})),
    getDashboardStats: () => cached('stats', () => send('getDashboardStats', {})),
    getTransactions: (filters) => send('getTransactions', filters || {}),
    
    addTransaction: (data) => send('addTransaction', { data }, true).then(r => { clearCache(); return r; }),
    updateTransaction: (id, data) => send('updateTransaction', { id, data }, true).then(r => { clearCache(); return r; }),
    deleteTransaction: (id) => send('deleteTransaction', { id }).then(r => { clearCache(); return r; }),
    
    addCategory: (data) => send('addCategory', { data }, true).then(r => { clearCache(); return r; }),
    updateCategory: (id, data) => send('updateCategory', { id, data }, true).then(r => { clearCache(); return r; }),
    deleteCategory: (id) => send('deleteCategory', { id }).then(r => { clearCache(); return r; }),
    
    addPaymentType: (data) => send('addPaymentType', { data }, true).then(r => { clearCache(); return r; }),
    updatePaymentType: (id, data) => send('updatePaymentType', { id, data }, true).then(r => { clearCache(); return r; }),
    deletePaymentType: (id) => send('deletePaymentType', { id }).then(r => { clearCache(); return r; }),
    
    setBudget: (categoryId, monthlyLimit, alertPercent) =>
      send('setBudget', { categoryId, monthlyLimit, alertPercent }, true).then(r => { clearCache(); return r; }),
    
    clearCache
  };
})();
