// ============================================
// 📊 CHARTS (Dark Theme)
// ============================================
const Charts = (() => {
  let instances = {};
  
  const baseOpts = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: 'easeOutQuart' },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 12,
          usePointStyle: true,
          font: { family: 'Prompt, Sarabun, sans-serif', size: 11, weight: '600' },
          color: '#B8A8D9'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(26, 20, 48, 0.98)',
        titleColor: '#F5F0FF',
        bodyColor: '#B8A8D9',
        borderColor: '#FF6FB5',
        borderWidth: 2,
        padding: 12,
        cornerRadius: 12,
        titleFont: { family: 'Prompt, sans-serif', size: 12, weight: '700' },
        bodyFont: { family: 'Prompt, sans-serif', size: 12 },
        callbacks: {
          label: function(context) {
            const value = context.parsed.y ?? context.parsed ?? 0;
            return (context.dataset.label || context.label || '') + ': ฿' + value.toLocaleString();
          }
        }
      }
    }
  };
  
  function destroy(key) {
    if (instances[key]) {
      try { instances[key].destroy(); } catch(e) {}
      instances[key] = null;
    }
  }
  
  function destroyAll() { Object.keys(instances).forEach(destroy); }
  
  function renderWeekly(data) {
    const canvas = document.getElementById('weeklyChart');
    if (!canvas) return;
    destroy('weekly');
    
    if (!data?.length) {
      canvas.parentElement.innerHTML = '<div class="empty-state"><i class="fas fa-chart-bar"></i><p>ยังไม่มีข้อมูล</p></div>';
      return;
    }
    
    const colors = ['#FF6FB5', '#4FD9E8', '#4FE8B5', '#FFD966', '#FF9B5C', '#A47BFF', '#FF5C7A'];
    const max = Math.max(...data.map(d => d.amount), 1);
    
    instances.weekly = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map(d => d.day),
        datasets: [{
          label: 'ค่าใช้จ่าย (฿)',
          data: data.map(d => d.amount),
          backgroundColor: data.map((_, i) => colors[i % colors.length]),
          borderRadius: 12,
          borderSkipped: false,
          maxBarThickness: 50
        }]
      },
      options: {
        ...baseOpts,
        plugins: { ...baseOpts.plugins, legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: max * 1.2,
            grid: { color: 'rgba(255, 111, 181, 0.1)', drawBorder: false },
            ticks: {
              callback: v => '฿' + v.toLocaleString(),
              font: { family: 'Prompt', size: 10 },
              color: '#7A6B9A'
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'Prompt', size: 11, weight: '600' },
              color: '#B8A8D9'
            }
          }
        }
      }
    });
  }
  
  function renderCategory(data) {
    const canvas = document.getElementById('categoryChart');
    if (!canvas) return;
    destroy('category');
    
    const withSpent = (data || []).filter(d => d.spent > 0);
    if (!withSpent.length) {
      canvas.parentElement.innerHTML = '<div class="empty-state"><i class="fas fa-chart-pie"></i><p>ยังไม่มีข้อมูล</p></div>';
      return;
    }
    
    instances.category = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: withSpent.map(d => d.name),
        datasets: [{
          data: withSpent.map(d => d.spent),
          backgroundColor: withSpent.map((d, i) => d.color || CONFIG.CHART_COLORS[i % CONFIG.CHART_COLORS.length]),
          borderWidth: 3,
          borderColor: '#1A1430',
          hoverOffset: 8
        }]
      },
      options: { ...baseOpts, cutout: '60%' }
    });
  }
  
  function renderPayment(data) {
    const canvas = document.getElementById('paymentChart');
    if (!canvas) return;
    destroy('payment');
    
    if (!data?.length) {
      canvas.parentElement.innerHTML = '<div class="empty-state"><i class="fas fa-credit-card"></i><p>ยังไม่มีข้อมูล</p></div>';
      return;
    }
    
    instances.payment = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.name),
        datasets: [{
          data: data.map(d => d.amount),
          backgroundColor: data.map((d, i) => d.color || CONFIG.CHART_COLORS[i % CONFIG.CHART_COLORS.length]),
          borderWidth: 3,
          borderColor: '#1A1430',
          hoverOffset: 8
        }]
      },
      options: { ...baseOpts, cutout: '55%' }
    });
  }
  
  function renderTrend(dailyData) {
    const canvas = document.getElementById('trendChart');
    if (!canvas) return;
    destroy('trend');
    
    if (!dailyData || !Object.keys(dailyData).length) {
      canvas.parentElement.innerHTML = '<div class="empty-state"><i class="fas fa-chart-line"></i><p>ยังไม่มีข้อมูล</p></div>';
      return;
    }
    
    const dates = Object.keys(dailyData).sort();
    const labels = dates.map(d => { const x = new Date(d); return x.getDate() + '/' + (x.getMonth() + 1); });
    const values = dates.map(d => dailyData[d]);
    
    const gradient = canvas.getContext('2d').createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(255, 111, 181, 0.4)');
    gradient.addColorStop(1, 'rgba(164, 123, 255, 0.02)');
    
    instances.trend = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'ค่าใช้จ่าย (฿)',
          data: values,
          borderColor: '#FF6FB5',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: '#FF6FB5',
          pointBorderColor: '#1A1430',
          pointBorderWidth: 2,
          pointHoverRadius: 7,
          pointHoverBackgroundColor: '#FF8FC5'
        }]
      },
      options: {
        ...baseOpts,
        plugins: { ...baseOpts.plugins, legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 111, 181, 0.1)', drawBorder: false },
            ticks: {
              callback: v => '฿' + v.toLocaleString(),
              font: { family: 'Prompt', size: 10 },
              color: '#7A6B9A'
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'Prompt', size: 10, weight: '600' },
              color: '#B8A8D9'
            }
          }
        }
      }
    });
  }
  
  return { renderWeekly, renderCategory, renderPayment, renderTrend, destroyAll };
})();
