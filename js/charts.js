// ============================================
// 📊 CHARTS - Glassmorphism LIGHT (Garnier)
// ============================================
var Charts = (function () {
  var instances = {};

  var baseOpts = {
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
          color: '#6B5478'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        titleColor: '#3D2A52',
        bodyColor: '#6B5478',
        borderColor: '#D99888',
        borderWidth: 2,
        padding: 14,
        cornerRadius: 14,
        titleFont: { family: 'Prompt, sans-serif', size: 12, weight: '700' },
        bodyFont: { family: 'Prompt, sans-serif', size: 12 },
        callbacks: {
          label: function (context) {
            var value = context.parsed.y != null ? context.parsed.y : (context.parsed || 0);
            return (context.dataset.label || context.label || '') + ': ฿' + value.toLocaleString();
          }
        }
      }
    }
  };

  function destroy(key) {
    if (instances[key]) {
      try { instances[key].destroy(); } catch (e) {}
      instances[key] = null;
    }
  }

  function destroyAll() {
    Object.keys(instances).forEach(function (k) { destroy(k); });
  }

  function renderWeekly(data) {
    var canvas = document.getElementById('weeklyChart');
    if (!canvas) return;
    destroy('weekly');

    if (!data || !data.length) {
      canvas.parentElement.innerHTML = '<div class="empty-state"><i class="fas fa-chart-bar"></i><p>ยังไม่มีข้อมูล</p></div>';
      return;
    }

    var colors = ['#D99888', '#7B5A9E', '#8B9E6C', '#D4B88C', '#C9647E', '#C4785A', '#E8B5A8'];
    var max = Math.max.apply(null, data.map(function (d) { return d.amount; }).concat([1]));

    instances.weekly = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map(function (d) { return d.day; }),
        datasets: [{
          label: 'ค่าใช้จ่าย (฿)',
          data: data.map(function (d) { return d.amount; }),
          backgroundColor: data.map(function (_, i) { return colors[i % colors.length]; }),
          borderRadius: 12,
          borderSkipped: false,
          maxBarThickness: 50
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600 },
        plugins: {
          legend: { display: false },
          tooltip: baseOpts.plugins.tooltip
        },
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: max * 1.2,
            grid: { color: 'rgba(123, 90, 158, 0.1)', drawBorder: false },
            ticks: {
              callback: function (v) { return '฿' + v.toLocaleString(); },
              font: { family: 'Prompt', size: 10 },
              color: '#9B8AA8'
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'Prompt', size: 11, weight: '600' },
              color: '#6B5478'
            }
          }
        }
      }
    });
  }

  function renderCategory(data) {
    var canvas = document.getElementById('categoryChart');
    if (!canvas) return;
    destroy('category');

    var withSpent = (data || []).filter(function (d) { return d.spent > 0; });
    if (!withSpent.length) {
      canvas.parentElement.innerHTML = '<div class="empty-state"><i class="fas fa-chart-pie"></i><p>ยังไม่มีข้อมูล</p></div>';
      return;
    }

    instances.category = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: withSpent.map(function (d) { return d.name; }),
        datasets: [{
          data: withSpent.map(function (d) { return d.spent; }),
          backgroundColor: withSpent.map(function (d, i) {
            return d.color || CONFIG.CHART_COLORS[i % CONFIG.CHART_COLORS.length];
          }),
          borderWidth: 3,
          borderColor: '#FAF5F0',
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600 },
        cutout: '60%',
        plugins: {
          legend: baseOpts.plugins.legend,
          tooltip: baseOpts.plugins.tooltip
        }
      }
    });
  }

  function renderPayment(data) {
    var canvas = document.getElementById('paymentChart');
    if (!canvas) return;
    destroy('payment');

    if (!data || !data.length) {
      canvas.parentElement.innerHTML = '<div class="empty-state"><i class="fas fa-credit-card"></i><p>ยังไม่มีข้อมูล</p></div>';
      return;
    }

    instances.payment = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: data.map(function (d) { return d.name; }),
        datasets: [{
          data: data.map(function (d) { return d.amount; }),
          backgroundColor: data.map(function (d, i) {
            return d.color || CONFIG.CHART_COLORS[i % CONFIG.CHART_COLORS.length];
          }),
          borderWidth: 3,
          borderColor: '#FAF5F0',
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600 },
        cutout: '55%',
        plugins: {
          legend: baseOpts.plugins.legend,
          tooltip: baseOpts.plugins.tooltip
        }
      }
    });
  }

  function renderTrend(dailyData) {
    var canvas = document.getElementById('trendChart');
    if (!canvas) return;
    destroy('trend');

    if (!dailyData || !Object.keys(dailyData).length) {
      canvas.parentElement.innerHTML = '<div class="empty-state"><i class="fas fa-chart-line"></i><p>ยังไม่มีข้อมูล</p></div>';
      return;
    }

    var dates = Object.keys(dailyData).sort();
    var labels = dates.map(function (d) {
      var x = new Date(d);
      return x.getDate() + '/' + (x.getMonth() + 1);
    });
    var values = dates.map(function (d) { return dailyData[d]; });

    var gradient = canvas.getContext('2d').createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(217, 152, 136, 0.35)');
    gradient.addColorStop(1, 'rgba(123, 90, 158, 0.02)');

    instances.trend = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'ค่าใช้จ่าย (฿)',
          data: values,
          borderColor: '#D99888',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: '#D99888',
          pointBorderColor: '#FAF5F0',
          pointBorderWidth: 2,
          pointHoverRadius: 7,
          pointHoverBackgroundColor: '#C4785A'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600 },
        plugins: {
          legend: { display: false },
          tooltip: baseOpts.plugins.tooltip
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(123, 90, 158, 0.1)', drawBorder: false },
            ticks: {
              callback: function (v) { return '฿' + v.toLocaleString(); },
              font: { family: 'Prompt', size: 10 },
              color: '#9B8AA8'
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'Prompt', size: 10, weight: '600' },
              color: '#6B5478'
            }
          }
        }
      }
    });
  }

  return {
    renderWeekly: renderWeekly,
    renderCategory: renderCategory,
    renderPayment: renderPayment,
    renderTrend: renderTrend,
    destroyAll: destroyAll
  };
})();
