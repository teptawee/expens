// ============================================
// ⚡ API with CacheService — เร็วขึ้น 10 เท่า
// ============================================

const CACHE_TTL = 300; // 5 นาที

// ✅ Cache wrapper
function cached(key, fn, ttl) {
  const cache = CacheService.getScriptCache();
  const hit = cache.get(key);
  if (hit) {
    try { return JSON.parse(hit); } catch(e) {}
  }
  
  const result = fn();
  
  try {
    const json = JSON.stringify(result);
    // CacheService จำกัด 100KB ต่อ key
    if (json.length < 100000) {
      cache.put(key, json, ttl || CACHE_TTL);
    }
  } catch(e) {}
  
  return result;
}

// ✅ ล้าง cache เมื่อข้อมูลเปลี่ยน
function clearApiCache() {
  const cache = CacheService.getScriptCache();
  cache.remove('full_data');
  cache.remove('bootstrap');
  cache.remove('dashboard');
}

// ✅ โหลดทุกอย่างใน 1 ครั้ง + cache 5 นาที
function getFullData() {
  return cached('full_data', function() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // ✅ อ่านทุก sheet ทีละครั้ง (เร็วกว่าเรียกซ้ำ)
    const allData = {
      cat: ss.getSheetByName(SHEET_NAMES.CATEGORIES).getDataRange().getValues(),
      pay: ss.getSheetByName(SHEET_NAMES.PAYMENT_TYPES).getDataRange().getValues(),
      bud: ss.getSheetByName(SHEET_NAMES.BUDGETS).getDataRange().getValues(),
      set: ss.getSheetByName(SHEET_NAMES.SETTINGS).getDataRange().getValues(),
      tx:  ss.getSheetByName(SHEET_NAMES.TRANSACTIONS).getDataRange().getValues()
    };
    
    // ✅ Parse แบบ manual (เร็วกว่า .map + .filter)
    const categories = [];
    for (let i = 1; i < allData.cat.length; i++) {
      const r = allData.cat[i];
      if (r[0]) categories.push({ id: r[0], name: r[1], color: r[2] });
    }
    
    const paymentTypes = [];
    for (let i = 1; i < allData.pay.length; i++) {
      const r = allData.pay[i];
      if (r[0]) paymentTypes.push({ id: r[0], name: r[1], icon: r[2], color: r[3] });
    }
    
    const budgets = [];
    for (let i = 1; i < allData.bud.length; i++) {
      const r = allData.bud[i];
      if (r[0]) budgets.push({
        categoryId: r[0],
        monthlyLimit: Number(r[1]) || 0,
        alertPercent: Number(r[2]) || 80
      });
    }
    
    const settings = {};
    for (let i = 1; i < allData.set.length; i++) {
      const r = allData.set[i];
      if (r[0]) settings[r[0]] = r[1];
    }
    
    // ✅ Transactions
    const tz = Session.getScriptTimeZone();
    const transactions = [];
    for (let i = 1; i < allData.tx.length; i++) {
      const r = allData.tx[i];
      if (!r[0]) continue;
      transactions.push({
        id: r[0],
        date: r[1] instanceof Date
          ? Utilities.formatDate(r[1], tz, 'yyyy-MM-dd')
          : String(r[1] || ''),
        category: r[2] || '',
        paymentType: r[3] || '',
        amount: Number(r[4]) || 0,
        note: r[5] || '',
        timestamp: r[6] ? String(r[6]) : ''
      });
    }
    
    // ✅ คำนวณ stats ทั้งหมดจาก transactions ที่โหลดมาแล้ว (ไม่ต้องอ่านซ้ำ)
    const stats = calculateStats(transactions, categories, paymentTypes, budgets);
    
    return Object.assign(
      { categories, paymentTypes, budgets, settings, transactions },
      stats
    );
  });
}

// ✅ แยกฟังก์ชันคำนวณ stats (ใช้ transactions ที่มีอยู่แล้ว)
function calculateStats(transactions, categories, paymentTypes, budgets) {
  const today = new Date();
  const tz = Session.getScriptTimeZone();
  const todayStr = Utilities.formatDate(today, tz, 'yyyy-MM-dd');
  const weekAgoStr = Utilities.formatDate(new Date(today.getTime() - 6*86400000), tz, 'yyyy-MM-dd');
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthStartStr = Utilities.formatDate(monthStart, tz, 'yyyy-MM-dd');
  const yearStartStr = Utilities.formatDate(new Date(today.getFullYear(), 0, 1), tz, 'yyyy-MM-dd');
  const yesterdayStr = Utilities.formatDate(new Date(today.getTime() - 86400000), tz, 'yyyy-MM-dd');
  const weekPrevStartStr = Utilities.formatDate(new Date(today.getTime() - 13*86400000), tz, 'yyyy-MM-dd');
  const weekPrevEndStr = Utilities.formatDate(new Date(today.getTime() - 7*86400000), tz, 'yyyy-MM-dd');
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const lastMonthStartStr = Utilities.formatDate(lastMonthStart, tz, 'yyyy-MM-dd');
  const lastMonthEndStr = Utilities.formatDate(lastMonthEnd, tz, 'yyyy-MM-dd');
  
  // ✅ Single-pass loop (เร็วกว่า filter ซ้ำๆ)
  let todayAmount = 0, weekAmount = 0, monthAmount = 0, yearAmount = 0;
  let yesterdayAmount = 0, weekPrevAmount = 0, lastMonthAmount = 0;
  let totalAmount = 0;
  const monthTxByCat = {}, monthTxByPay = {}, dailyStats = {};
  
  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];
    const d = t.date;
    const a = t.amount;
    
    totalAmount += a;
    if (d === todayStr) todayAmount += a;
    if (d === yesterdayStr) yesterdayAmount += a;
    if (d >= weekAgoStr) weekAmount += a;
    if (d >= weekPrevStartStr && d <= weekPrevEndStr) weekPrevAmount += a;
    if (d >= monthStartStr) {
      monthAmount += a;
      monthTxByCat[t.category] = (monthTxByCat[t.category] || 0) + a;
      monthTxByPay[t.paymentType] = (monthTxByPay[t.paymentType] || 0) + a;
      dailyStats[d] = (dailyStats[d] || 0) + a;
    }
    if (d >= yearStartStr) yearAmount += a;
    if (d >= lastMonthStartStr && d <= lastMonthEndStr) lastMonthAmount += a;
  }
  
  function calcChange(c, p) {
    if (p === 0) return c > 0 ? 100 : 0;
    return ((c - p) / p) * 100;
  }
  
  const daysPassed = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dailyAvg = daysPassed > 0 ? (monthAmount / daysPassed) : 0;
  const estimatedMonthTotal = dailyAvg * daysInMonth;
  
  const stats = {
    today: todayAmount, week: weekAmount, month: monthAmount, year: yearAmount,
    total: totalAmount, yesterday: yesterdayAmount, weekPrev: weekPrevAmount,
    lastMonth: lastMonthAmount,
    todayChange: calcChange(todayAmount, yesterdayAmount),
    weekChange: calcChange(weekAmount, weekPrevAmount),
    monthChange: calcChange(monthAmount, lastMonthAmount),
    dailyAvg, estimatedMonthTotal, daysPassed, daysInMonth
  };
  
  // Category stats
  const categoryStats = [];
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const spent = monthTxByCat[cat.id] || 0;
    const bud = budgets.find(b => b.categoryId === cat.id);
    const limit = bud ? bud.monthlyLimit : 0;
    const remaining = limit - spent;
    const percentUsed = limit > 0 ? (spent / limit * 100) : 0;
    const percentRemaining = limit > 0 ? Math.max(0, (remaining / limit * 100)) : 100;
    
    if (spent > 0 || limit > 0) {
      categoryStats.push({
        id: cat.id, name: cat.name, color: cat.color,
        spent, budget: limit, remaining, percentUsed, percentRemaining
      });
    }
  }
  
  // Payment stats
  const paymentStats = [];
  for (let i = 0; i < paymentTypes.length; i++) {
    const pt = paymentTypes[i];
    const amt = monthTxByPay[pt.id] || 0;
    if (amt > 0) {
      paymentStats.push({
        id: pt.id, name: pt.name, icon: pt.icon, color: pt.color,
        amount: amt, count: 0
      });
    }
  }
  
  // Weekly breakdown
  const weeklyBreakdown = [];
  const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const dateStr = Utilities.formatDate(d, tz, 'yyyy-MM-dd');
    weeklyBreakdown.push({
      date: dateStr,
      day: dayNames[d.getDay()],
      amount: dailyStats[dateStr] || 0
    });
  }
  
  // Budget summary
  const totalBudget = budgets.reduce((s, b) => s + b.monthlyLimit, 0);
  const totalSpent = monthAmount;
  const totalRemaining = totalBudget - totalSpent;
  const totalPercent = totalBudget > 0 ? (totalSpent / totalBudget * 100) : 0;
  const daysLeft = daysInMonth - daysPassed;
  const dailyAllowed = daysLeft > 0 ? totalRemaining / daysLeft : 0;
  
  let statusOk = 0, statusWarning = 0, statusDanger = 0;
  for (let i = 0; i < categoryStats.length; i++) {
    const c = categoryStats[i];
    if (c.budget <= 0) continue;
    if (c.percentUsed >= 90) statusDanger++;
    else if (c.percentUsed >= 70) statusWarning++;
    else statusOk++;
  }
  
  return {
    stats, categoryStats, paymentStats, weeklyBreakdown,
    dailyBreakdown: dailyStats,
    budgetSummary: {
      totalBudget, totalSpent, totalRemaining, totalPercent,
      daysLeft, daysPassed, daysInMonth, dailyAvg, dailyAllowed,
      statusOk, statusWarning, statusDanger
    }
  };
}

// ✅ getBootstrapData ใช้ cache แยก
function getBootstrapData() {
  return cached('bootstrap', function() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const [catData, payData, budgetData, settingsData] = [
      ss.getSheetByName(SHEET_NAMES.CATEGORIES).getDataRange().getValues(),
      ss.getSheetByName(SHEET_NAMES.PAYMENT_TYPES).getDataRange().getValues(),
      ss.getSheetByName(SHEET_NAMES.BUDGETS).getDataRange().getValues(),
      ss.getSheetByName(SHEET_NAMES.SETTINGS).getDataRange().getValues()
    ];
    
    const categories = [];
    for (let i = 1; i < catData.length; i++) {
      const r = catData[i];
      if (r[0]) categories.push({ id: r[0], name: r[1], color: r[2] });
    }
    const paymentTypes = [];
    for (let i = 1; i < payData.length; i++) {
      const r = payData[i];
      if (r[0]) paymentTypes.push({ id: r[0], name: r[1], icon: r[2], color: r[3] });
    }
    const budgets = [];
    for (let i = 1; i < budgetData.length; i++) {
      const r = budgetData[i];
      if (r[0]) budgets.push({ categoryId: r[0], monthlyLimit: Number(r[1]) || 0, alertPercent: Number(r[2]) || 80 });
    }
    const settings = {};
    settingsData.slice(1).forEach(r => { if (r[0]) settings[r[0]] = r[1]; });
    
    return { categories, paymentTypes, budgets, settings };
  });
}

// ✅ Dashboard ใช้ cache
function getDashboardStats() {
  return cached('dashboard', function() {
    const full = getFullData(); // ใช้ cache ที่มีอยู่แล้ว
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
  });
}
