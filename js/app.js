// ============================================
// 🎯 APP
// ============================================
const App = (() => {
  let state = {
    categories: [], paymentTypes: [], budgets: [], settings: {},
    currentPage: 'dashboard', currentBudgetFilter: 'all',
    categoryStats: [], budgetSummary: null, initialized: false
  };
  
  let modals = {};
  
  async function init() {
    modals.category = new bootstrap.Modal(document.getElementById('categoryModal'));
    modals.payment = new bootstrap.Modal(document.getElementById('paymentModal'));
    modals.budget = new bootstrap.Modal(document.getElementById('budgetModal'));
    
    document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
    
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        switchPage(item.dataset.page);
      });
    });
    
    document.getElementById('transactionForm').addEventListener('submit', handleFormSubmit);
    
    await loadAllData();
    state.initialized = true;
  }
  
  async function loadAllData() {
    showLoading(true);
    try {
      const data = await API.getFullData();
      
      state.categories = data.categories || [];
      state.paymentTypes = data.paymentTypes || [];
      state.budgets = data.budgets || [];
      state.settings = data.settings || {};
      
      populateDropdowns();
      loadSettingsLists();
      renderDashboard(data);
      
      showLoading(false);
    } catch (err) {
      showLoading(false);
      toast('โหลดข้อมูลไม่ได้: ' + err.message, 'danger');
      console.error(err);
    }
  }
  
  async function refresh() {
    API.clearCache();
    Charts.destroyAll();
    await loadAllData();
  }
  
  function renderDashboard(data) {
    const stats = data.stats || {};
    updateStats(stats);
    
    state.budgetSummary = data.budgetSummary || {};
    state.categoryStats = data.categoryStats || [];
    
    renderBudgetSummary(state.budgetSummary);
    renderBudgetList(state.categoryStats, state.currentBudgetFilter);
    
    Charts.renderWeekly(data.weeklyBreakdown || []);
    Charts.renderCategory(state.categoryStats || []);
    Charts.renderPayment(data.paymentStats || []);
    Charts.renderTrend(data.dailyBreakdown || {});
    
    document.getElementById('lastUpdate').textContent =
      new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
  }
  
  function updateStats(stats) {
    document.getElementById('statToday').textContent = (stats.today || 0).toLocaleString('th-TH');
    renderChangeBadge('statTodayChange', stats.todayChange || 0);
    document.getElementById('statWeek').textContent = (stats.week || 0).toLocaleString('th-TH');
    renderChangeBadge('statWeekChange', stats.weekChange || 0);
    document.getElementById('statMonth').textContent = (stats.month || 0).toLocaleString('th-TH');
    renderChangeBadge('statMonthChange', stats.monthChange || 0);
    document.getElementById('statDailyAvg').textContent = Math.round(stats.dailyAvg || 0).toLocaleString('th-TH');
    document.getElementById('statEstimate').textContent =
      `คาดการณ์สิ้นเดือน ~${Math.round(stats.estimatedMonthTotal || 0).toLocaleString('th-TH')} ฿`;
  }
  
  function renderChangeBadge(id, pct) {
    const el = document.getElementById(id);
    if (!el) return;
    const r = Math.round(pct * 10) / 10;
    if (r > 0) el.innerHTML = `<span class="badge-pill up"><span class="arrow">▲</span> +${r}%</span>`;
    else if (r < 0) el.innerHTML = `<span class="badge-pill down"><span class="arrow">▼</span> ${r}%</span>`;
    else el.innerHTML = `<span class="badge-pill neutral"><span class="arrow">−</span> 0%</span>`;
  }
  
  function renderBudgetSummary(summary) {
    const container = document.getElementById('budgetSummaryBar');
    if (!container || !summary) return;
    
    const totalSpent = summary.totalSpent || 0;
    const totalBudget = summary.totalBudget || 0;
    const totalPercent = (summary.totalPercent || 0).toFixed(1);
    const daysLeft = summary.daysLeft || 0;
    
    let icon = '✨', statusText = 'อยู่ในเกณฑ์ดี';
    if (summary.totalPercent >= 90) { icon = '🔥'; statusText = 'เกินงบแล้ว!'; }
    else if (summary.totalPercent >= 70) { icon = '⚠️'; statusText = 'ใกล้เต็มงบ'; }
    
    container.innerHTML = `
      <div class="summary-text"><i class="fas fa-chart-pie"></i><span>${icon} ${statusText} • เหลืออีก ${daysLeft} วัน</span></div>
      <div class="summary-amount">${fmt(totalSpent)} <span class="total">/ ${fmt(totalBudget)} (${totalPercent}%)</span></div>
    `;
  }
  
  function setBudgetFilter(filter) {
    state.currentBudgetFilter = filter;
    document.querySelectorAll('#budgetFilters .filter-chip').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    renderBudgetList(state.categoryStats, filter);
  }
  
  function renderBudgetList(categoryStats, filter = 'all') {
    const container = document.getElementById('budgetList');
    if (!container) return;
    
    let list = (categoryStats || []).filter(c => c.budget > 0);
    
    if (filter === 'warning') list = list.filter(c => c.percentUsed >= 70 && c.percentUsed < 90);
    else if (filter === 'danger') list = list.filter(c => c.percentUsed >= 90);
    
    list.sort((a, b) => b.percentUsed - a.percentUsed);
    
    if (!list.length) {
      const msg = { all: 'ยังไม่ได้ตั้งวงเงิน', warning: 'ไม่มีหมวดที่ใกล้เต็ม 🎉', danger: 'ไม่มีหมวดที่เกินงบ 🎉' }[filter];
      container.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><i class="fas fa-piggy-bank"></i><p>${msg}</p></div>`;
      return;
    }
    
    container.innerHTML = list.map(cat => {
      const pct = Math.min(cat.percentUsed, 100);
      const display = cat.percentUsed.toFixed(1);
      let status = 'ok', bar = 'linear-gradient(90deg, #4FE8B5, #4FD9E8)';
      if (cat.percentUsed >= 90) { status = 'danger'; bar = 'linear-gradient(90deg, #FF5C7A, #FF6FB5)'; }
      else if (cat.percentUsed >= 70) { status = 'warning'; bar = 'linear-gradient(90deg, #FFD966, #FF9B5C)'; }
      
      const match = cat.name.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*(.*)$/u);
      const emoji = match ? match[1] : '📁';
      const cleanName = match ? match[2] : cat.name;
      const remPct = cat.budget > 0 ? Math.max(0, cat.remaining / cat.budget * 100) : 0;
      
      return `
        <div class="budget-card ${status}">
          <button class="budget-card-edit-btn" onclick="App.editBudget('${cat.id}', '${cleanName.replace(/'/g, "\\'")}', ${cat.budget})" title="แก้ไขวงเงิน">
            <i class="fas fa-pen"></i>
          </button>
          <div class="budget-card-header">
            <div class="budget-card-title">
              <div class="budget-card-icon" style="background: linear-gradient(135deg, ${cat.color}40, ${cat.color}80);">${emoji}</div>
              <div style="min-width:0;flex:1;">
                <div class="budget-card-name">${cleanName}</div>
                <div class="budget-card-subtitle">คงเหลือ ${remPct.toFixed(0)}%</div>
              </div>
            </div>
            <div class="budget-card-percent ${status}">${display}%</div>
          </div>
          <div class="budget-card-stats">
            <div class="budget-stat spent"><div class="budget-stat-label"><span>💎</span> ใช้ไป</div><div class="budget-stat-value">${fmt(cat.spent)}</div></div>
            <div class="budget-stat budget"><div class="budget-stat-label"><span>🎯</span> วงเงิน</div><div class="budget-stat-value">${fmt(cat.budget)}</div></div>
            <div class="budget-stat remaining ${cat.remaining < 0 ? 'negative' : ''}"><div class="budget-stat-label"><span>💰</span> คงเหลือ</div><div class="budget-stat-value">${fmt(cat.remaining)}</div></div>
          </div>
          <div class="budget-card-progress"><div class="budget-card-progress-bar" style="width:${pct}%;background:${bar};"></div></div>
        </div>
      `;
    }).join('');
  }
  
  function switchPage(page) {
    if (page === state.currentPage && page !== 'dashboard') return;
    
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.bottom-nav-item').forEach(i => i.classList.remove('active'));
    
    document.getElementById('page-' + page)?.classList.add('active');
    document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
    
    state.currentPage = page;
    
    if (page === 'history') loadHistory();
    if (page === 'settings') loadSettingsLists();
    
    window.scrollTo(0, 0);
  }
  
  async function loadHistory() {
    const startEl = document.getElementById('filterStart');
    const endEl = document.getElementById('filterEnd');
    
    if (!startEl.value && !endEl.value) {
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 6 * 86400000);
      startEl.value = fmtDate(weekAgo);
      endEl.value = fmtDate(today);
    }
    
    try {
      const txs = await API.getTransactions({
        startDate: startEl.value,
        endDate: endEl.value,
        category: document.getElementById('filterCategory').value
      });
      renderHistory(txs || []);
    } catch (err) {
      toast('โหลดรายการไม่ได้: ' + err.message, 'danger');
      renderHistory([]);
    }
  }
  
  function setHistoryRange(range) {
    document.querySelectorAll('#page-history .filter-chip').forEach(b => {
      b.classList.toggle('active', b.dataset.range === range);
    });
    
    const startEl = document.getElementById('filterStart');
    const endEl = document.getElementById('filterEnd');
    const today = new Date();
    
    if (range === '7days') {
      startEl.value = fmtDate(new Date(today.getTime() - 6 * 86400000));
      endEl.value = fmtDate(today);
    } else if (range === '30days') {
      startEl.value = fmtDate(new Date(today.getTime() - 29 * 86400000));
      endEl.value = fmtDate(today);
    } else {
      startEl.value = '';
      endEl.value = '';
    }
    loadHistory();
  }
  
  function renderHistory(txs) {
    const container = document.getElementById('historyList');
    if (!container) return;
    
    if (!Array.isArray(txs) || !txs.length) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>ไม่พบรายการ</p></div>';
      return;
    }
    
    const grouped = {};
    txs.forEach(t => { (grouped[t.date] = grouped[t.date] || []).push(t); });
    
    let html = '';
    Object.keys(grouped).sort().reverse().forEach(date => {
      const dateStr = new Date(date).toLocaleDateString('th-TH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      const dayTotal = grouped[date].reduce((s, t) => s + (t.amount || 0), 0);
      
      html += `<div class="mb-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="fw-bold" style="font-size:0.8rem;">📅 ${dateStr}</span>
          <span class="badge bg-danger">฿${dayTotal.toLocaleString()}</span>
        </div>`;
      
      grouped[date].forEach(t => {
        const cat = state.categories.find(c => c.id === t.category) || { name: 'ไม่ระบุ', color: '#7A6B9A' };
        const pay = state.paymentTypes.find(p => p.id === t.paymentType) || { name: 'ไม่ระบุ', icon: 'fa-wallet' };
        html += `<div class="transaction-item">
          <div class="transaction-icon" style="background: linear-gradient(135deg, ${cat.color}, ${shade(cat.color, -15)});">
            <i class="fas ${pay.icon}"></i>
          </div>
          <div class="transaction-details">
            <div class="transaction-category">${cat.name}</div>
            <div class="transaction-meta">${pay.name}${t.note ? ' • ' + t.note : ''}</div>
          </div>
          <div class="text-end">
            <div class="transaction-amount">฿${(t.amount || 0).toLocaleString()}</div>
            <div class="mt-1">
              <button class="btn btn-sm btn-outline-primary py-0 px-2" onclick="App.editTransaction('${t.id}')"><i class="fas fa-edit fa-xs"></i></button>
              <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="App.confirmDelete('${t.id}')"><i class="fas fa-trash fa-xs"></i></button>
            </div>
          </div>
        </div>`;
      });
      html += '</div>';
    });
    container.innerHTML = html;
  }
  
  async function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('txId').value;
    const data = {
      date: document.getElementById('txDate').value,
      category: document.getElementById('txCategory').value,
      paymentType: document.getElementById('txPayment').value,
      amount: parseFloat(document.getElementById('txAmount').value),
      note: document.getElementById('txNote').value.trim()
    };
    
    if (!data.date || !data.category || !data.paymentType || !data.amount) {
      toast('กรอกข้อมูลให้ครบ', 'warning');
      return;
    }
    
    showLoading(true);
    try {
      const result = id ? await API.updateTransaction(id, data) : await API.addTransaction(data);
      showLoading(false);
      
      if (result && result.success !== false) {
        toast(id ? '✨ อัปเดตสำเร็จ' : '🎉 บันทึกสำเร็จ', 'success');
        resetForm();
        await refresh();
        switchPage('dashboard');
      } else {
        toast(result?.error || 'เกิดข้อผิดพลาด', 'danger');
      }
    } catch (err) {
      showLoading(false);
      toast('เกิดข้อผิดพลาด: ' + err.message, 'danger');
    }
  }
  
  async function editTransaction(id) {
    try {
      const txs = await API.getTransactions({});
      const t = txs.find(x => x.id === id);
      if (t) {
        document.getElementById('txId').value = t.id;
        document.getElementById('txDate').value = t.date;
        document.getElementById('txCategory').value = t.category;
        document.getElementById('txPayment').value = t.paymentType;
        document.getElementById('txAmount').value = t.amount;
        document.getElementById('txNote').value = t.note || '';
        switchPage('daily');
        document.querySelector('#transactionForm button[type="submit"]').innerHTML = '<i class="fas fa-save me-2"></i>อัปเดต';
      }
    } catch (err) {
      toast('โหลดไม่ได้: ' + err.message, 'danger');
    }
  }
  
  async function confirmDelete(id) {
    if (!confirm('🗑️ ต้องการลบหรือไม่?')) return;
    showLoading(true);
    try {
      await API.deleteTransaction(id);
      showLoading(false);
      toast('🗑️ ลบสำเร็จ', 'success');
      await refresh();
      loadHistory();
    } catch (err) {
      showLoading(false);
      toast('เกิดข้อผิดพลาด: ' + err.message, 'danger');
    }
  }
  
  function resetForm() {
    document.getElementById('transactionForm').reset();
    document.getElementById('txId').value = '';
    document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
    document.querySelector('#transactionForm button[type="submit"]').innerHTML = '<i class="fas fa-save me-2"></i>บันทึก';
  }
  
  function loadSettingsLists() {
    renderCategorySettings();
    renderPaymentSettings();
    renderBudgetSettings();
  }
  
  function renderCategorySettings() {
    const c = document.getElementById('categorySettingsList');
    if (!c) return;
    c.innerHTML = state.categories.length ? state.categories.map(cat => `
      <div class="d-flex align-items-center justify-content-between p-3 mb-2" style="border-radius:16px;border-left:4px solid ${cat.color};">
        <div class="d-flex align-items-center gap-2">
          <div style="width:28px;height:28px;border-radius:8px;background:${cat.color};"></div>
          <span class="fw-bold">${cat.name}</span>
        </div>
        <div>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="App.openCategoryModal('${cat.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="App.deleteCategoryItem('${cat.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `).join('') : '<div class="empty-state"><i class="fas fa-tags"></i><p>ยังไม่มีหมวดหมู่</p></div>';
  }
  
  function renderPaymentSettings() {
    const c = document.getElementById('paymentSettingsList');
    if (!c) return;
    c.innerHTML = state.paymentTypes.length ? state.paymentTypes.map(p => `
      <div class="d-flex align-items-center justify-content-between p-3 mb-2" style="border-radius:16px;border-left:4px solid ${p.color};">
        <div class="d-flex align-items-center gap-2">
          <div style="width:34px;height:34px;border-radius:10px;background:${p.color};display:flex;align-items:center;justify-content:center;color:white;">
            <i class="fas ${p.icon}"></i>
          </div>
          <span class="fw-bold">${p.name}</span>
        </div>
        <div>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="App.openPaymentModal('${p.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="App.deletePaymentItem('${p.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `).join('') : '<div class="empty-state"><i class="fas fa-credit-card"></i><p>ยังไม่มี</p></div>';
  }
  
  function renderBudgetSettings() {
    const c = document.getElementById('budgetSettingsList');
    if (!c) return;
    c.innerHTML = state.categories.map(cat => {
      const b = state.budgets.find(x => x.categoryId === cat.id);
      const limit = b ? b.monthlyLimit : 0;
      return `<div class="d-flex align-items-center justify-content-between p-3 mb-2" style="border-radius:16px;">
        <div class="d-flex align-items-center gap-2">
          <div style="width:28px;height:28px;border-radius:8px;background:${cat.color};"></div>
          <span class="fw-bold">${cat.name}</span>
        </div>
        <div class="d-flex align-items-center gap-2">
          <span style="color:var(--text-muted);font-size:0.85rem;font-weight:600;">${limit > 0 ? fmt(limit) : 'ไม่กำหนด'}</span>
          <button class="btn btn-sm btn-outline-info" onclick="App.editBudget('${cat.id}', '${cat.name.replace(/'/g, "\\'")}', ${limit})"><i class="fas fa-cog"></i></button>
        </div>
      </div>`;
    }).join('');
  }
  
  function openCategoryModal(id) {
    document.getElementById('categoryModalTitle').textContent = id ? '✏️ แก้ไขหมวดหมู่' : '➕ เพิ่มหมวดหมู่';
    document.getElementById('catEditId').value = id || '';
    document.getElementById('catName').value = '';
    document.getElementById('catColor').value = '#FF6FB5';
    if (id) {
      const cat = state.categories.find(x => x.id === id);
      if (cat) { document.getElementById('catName').value = cat.name; document.getElementById('catColor').value = cat.color; }
    }
    modals.category.show();
  }
  
  async function saveCategory() {
    const id = document.getElementById('catEditId').value;
    const data = { name: document.getElementById('catName').value.trim(), color: document.getElementById('catColor').value };
    if (!data.name) { toast('กรอกชื่อหมวดหมู่', 'warning'); return; }
    
    showLoading(true);
    try {
      if (id) await API.updateCategory(id, data);
      else await API.addCategory(data);
      showLoading(false);
      modals.category.hide();
      toast('✨ บันทึกสำเร็จ', 'success');
      await refresh();
    } catch (err) {
      showLoading(false);
      toast('เกิดข้อผิดพลาด: ' + err.message, 'danger');
    }
  }
  
  async function deleteCategoryItem(id) {
    if (!confirm('🗑️ ต้องการลบหมวดหมู่นี้หรือไม่?')) return;
    showLoading(true);
    try {
      await API.deleteCategory(id);
      showLoading(false);
      toast('🗑️ ลบสำเร็จ', 'success');
      await refresh();
    } catch (err) {
      showLoading(false);
      toast('เกิดข้อผิดพลาด: ' + err.message, 'danger');
    }
  }
  
  function openPaymentModal(id) {
    document.getElementById('paymentModalTitle').textContent = id ? '✏️ แก้ไขประเภท' : '➕ เพิ่มประเภท';
    document.getElementById('payEditId').value = id || '';
    document.getElementById('payName').value = '';
    document.getElementById('payIcon').value = 'fa-wallet';
    document.getElementById('payColor').value = '#A47BFF';
    if (id) {
      const p = state.paymentTypes.find(x => x.id === id);
      if (p) { document.getElementById('payName').value = p.name; document.getElementById('payIcon').value = p.icon; document.getElementById('payColor').value = p.color; }
    }
    modals.payment.show();
  }
  
  async function savePayment() {
    const id = document.getElementById('payEditId').value;
    const data = {
      name: document.getElementById('payName').value.trim(),
      icon: document.getElementById('payIcon').value.trim() || 'fa-wallet',
      color: document.getElementById('payColor').value
    };
    if (!data.name) { toast('กรอกชื่อประเภท', 'warning'); return; }
    showLoading(true);
    try {
      if (id) await API.updatePaymentType(id, data);
      else await API.addPaymentType(data);
      showLoading(false);
      modals.payment.hide();
      toast('✨ บันทึกสำเร็จ', 'success');
      await refresh();
    } catch (err) {
      showLoading(false);
      toast('เกิดข้อผิดพลาด: ' + err.message, 'danger');
    }
  }
  
  async function deletePaymentItem(id) {
    if (!confirm('🗑️ ต้องการลบหรือไม่?')) return;
    showLoading(true);
    try {
      await API.deletePaymentType(id);
      showLoading(false);
      toast('🗑️ ลบสำเร็จ', 'success');
      await refresh();
    } catch (err) {
      showLoading(false);
      toast('เกิดข้อผิดพลาด: ' + err.message, 'danger');
    }
  }
  
  function editBudget(catId, catName, limit) {
    document.getElementById('budgetCatId').value = catId;
    document.getElementById('budgetCatName').value = catName;
    document.getElementById('budgetLimit').value = limit || '';
    const b = state.budgets.find(x => x.categoryId === catId);
    document.getElementById('budgetAlert').value = b ? (b.alertPercent || 80) : 80;
    setTimeout(() => document.getElementById('budgetLimit').focus(), 300);
    modals.budget.show();
  }
  
  async function saveBudget() {
    const catId = document.getElementById('budgetCatId').value;
    const limit = parseFloat(document.getElementById('budgetLimit').value) || 0;
    const alert = parseInt(document.getElementById('budgetAlert').value) || 80;
    if (limit < 0) { toast('ห้ามติดลบ', 'warning'); return; }
    showLoading(true);
    try {
      await API.setBudget(catId, limit, alert);
      showLoading(false);
      modals.budget.hide();
      toast('✨ อัปเดตวงเงินสำเร็จ', 'success');
      await refresh();
    } catch (err) {
      showLoading(false);
      toast('เกิดข้อผิดพลาด: ' + err.message, 'danger');
    }
  }
  
  function populateDropdowns() {
    ['txCategory', 'filterCategory'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const isFilter = id === 'filterCategory';
      sel.innerHTML = isFilter ? '<option value="all">🌈 ทุกหมวดหมู่</option>' : '<option value="">-- เลือกหมวดหมู่ --</option>';
      state.categories.forEach(c => { sel.innerHTML += `<option value="${c.id}">${c.name}</option>`; });
    });
    
    const ps = document.getElementById('txPayment');
    if (ps) {
      ps.innerHTML = '<option value="">-- เลือกประเภท --</option>';
      state.paymentTypes.forEach(p => { ps.innerHTML += `<option value="${p.id}">${p.name}</option>`; });
    }
  }
  
  function fmt(n) { return '฿' + (n || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 }); }
  function fmtDate(d) { return d.toISOString().split('T')[0]; }
  
  function shade(color, pct) {
    const n = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * pct);
    const r = Math.max(0, Math.min(255, (n >> 16) + amt));
    const g = Math.max(0, Math.min(255, (n >> 8 & 0x00FF) + amt));
    const b = Math.max(0, Math.min(255, (n & 0x0000FF) + amt));
    return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
  }
  
  function showLoading(show) {
    document.getElementById('loading')?.classList.toggle('hidden', !show);
  }
  
  function toast(msg, type = 'info') {
    const c = document.getElementById('toastContainer');
    const id = 'toast-' + Date.now();
    const icons = { success: 'fa-check-circle', danger: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    c.insertAdjacentHTML('beforeend', `
      <div id="${id}" class="toast align-items-center text-white bg-${type} border-0" role="alert">
        <div class="d-flex">
          <div class="toast-body"><i class="fas ${icons[type]} me-2"></i>${msg}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      </div>
    `);
    const el = document.getElementById(id);
    const t = new bootstrap.Toast(el, { delay: 3000 });
    t.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
  }
  
  return {
    init, refresh, switchPage, loadHistory, setHistoryRange, setBudgetFilter,
    handleFormSubmit, editTransaction, confirmDelete, resetForm,
    openCategoryModal, saveCategory, deleteCategoryItem,
    openPaymentModal, savePayment, deletePaymentItem,
    editBudget, saveBudget
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
