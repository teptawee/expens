// ============================================
// 🌐 REST API - สำหรับ GitHub Pages (JSONP + POST)
// ============================================

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const params = body.params || {};
    
    const result = routeAction(action, params);
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ตรวจสอบ: ถ้ามี action param → API mode, ถ้าไม่มี → HTML Web App mode
function doGet(e) {
  const action = e.parameter.action;
  const callback = e.parameter.callback;
  
  // ⚡ ถ้ามี action → เป็น API request
  if (action) {
    try {
      const result = routeAction(action, e.parameter);
      
      if (callback) {
        return ContentService
          .createTextOutput(callback + '(' + JSON.stringify({ success: true, data: result }) + ')')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, data: result }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      const errResponse = JSON.stringify({ success: false, error: err.message });
      
      if (callback) {
        return ContentService
          .createTextOutput(callback + '(' + errResponse + ')')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      
      return ContentService
        .createTextOutput(errResponse)
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // 🌐 ถ้าไม่มี action → ใช้ HTML Web App mode (เหมือนเดิม)
  const page = e.parameter.page || 'Index';
  let template;
  
  try {
    template = HtmlService.createTemplateFromFile(page);
  } catch (err) {
    template = HtmlService.createTemplateFromFile('Index');
  }
  
  return template.evaluate()
    .setTitle('💰 ระบบบันทึกค่าใช้จ่าย')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function routeAction(action, params) {
  switch (action) {
    case 'getFullData':       return getFullData();
    case 'getBootstrapData':  return getBootstrapData();
    case 'getInitialData':    return getInitialData();
    case 'getDashboardStats': return getDashboardStats();
    case 'getTransactions':   return getTransactions(params);
    
    case 'addTransaction':    return addTransaction(params.data || params);
    case 'updateTransaction': return updateTransaction(params.id, params.data);
    case 'deleteTransaction': return deleteTransaction(params.id);
    
    case 'addCategory':       return addCategory(params.data || params);
    case 'updateCategory':    return updateCategory(params.id, params.data);
    case 'deleteCategory':    return deleteCategory(params.id);
    
    case 'addPaymentType':    return addPaymentType(params.data || params);
    case 'updatePaymentType': return updatePaymentType(params.id, params.data);
    case 'deletePaymentType': return deletePaymentType(params.id);
    
    case 'setBudget':         return setBudget(params.categoryId, params.monthlyLimit, params.alertPercent);
    
    default:
      throw new Error('Unknown action: ' + action);
  }
}

// ✅ โหลดข้อมูลตั้งต้นทั้งหมดในครั้งเดียว (เร็วที่สุด)
function getBootstrapData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const [catData, payData, budgetData, settingsData] = [
    ss.getSheetByName(SHEET_NAMES.CATEGORIES).getDataRange().getValues(),
    ss.getSheetByName(SHEET_NAMES.PAYMENT_TYPES).getDataRange().getValues(),
    ss.getSheetByName(SHEET_NAMES.BUDGETS).getDataRange().getValues(),
    ss.getSheetByName(SHEET_NAMES.SETTINGS).getDataRange().getValues()
  ];
  
  const categories = catData.slice(1)
    .filter(r => r[0])
    .map(r => ({ id: r[0], name: r[1], color: r[2] }));
  
  const paymentTypes = payData.slice(1)
    .filter(r => r[0])
    .map(r => ({ id: r[0], name: r[1], icon: r[2], color: r[3] }));
  
  const budgets = budgetData.slice(1)
    .filter(r => r[0])
    .map(r => ({ categoryId: r[0], monthlyLimit: Number(r[1]) || 0, alertPercent: Number(r[2]) || 80 }));
  
  const settings = {};
  settingsData.slice(1).forEach(r => { if (r[0]) settings[r[0]] = r[1]; });
  
  return { categories, paymentTypes, budgets, settings };
}

// ✅ โหลดทุกอย่างในครั้งเดียว (Bootstrap + Dashboard)
function getFullData() {
  const base = getBootstrapData();
  const stats = getDashboardStats();
  return Object.assign({}, base, stats);
}
