// ============================================
// 📊 CHARTS - Glassmorphism Garnier Theme
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
          color: '#E8D5C4'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(45, 27, 61, 0.95)',
        titleColor: '#FDF8F0',
        bodyColor: '#E8D5C4',
        borderColor: '#E8A598',
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

    var colors = ['#E8A598', '#8B5FA8', '#9BAE7C', '#E5C9A0', '#D4647E', '#C4785A', '#F5C6BB'];
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
            grid: { color: 'rgba(232, 165, 152, 0.12)', drawBorder: false },
            ticks: {
              callback: function (v) { return '฿' + v.toLocaleString(); },
              font: { family: 'Prompt', size: 10 },
              color: '#A88B9C'
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'Prompt', size: 11, weight: '600' },
              color: '#E8D5C4'
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
          borderColor: '#2D1B3D',
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
          borderColor: '#2D1B3D',
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
    gradient.addColorStop(0, 'rgba(232, 165, 152, 0.4)');
    gradient.addColorStop(1, 'rgba(91, 58, 126, 0.02)');

    instances.trend = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'ค่าใช้จ่าย (฿)',
          data: values,
          borderColor: '#E8A598',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: '#E8A598',
          pointBorderColor: '#2D1B3D',
          pointBorderWidth: 2,
          pointHoverRadius: 7,
          pointHoverBackgroundColor: '#F5C6BB'
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
            grid: { color: 'rgba(232, 165, 152, 0.12)', drawBorder: false },
            ticks: {
              callback: function (v) { return '฿' + v.toLocaleString(); },
              font: { family: 'Prompt', size: 10 },
              color: '#A88B9C'
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'Prompt', size: 10, weight: '600' },
              color: '#E8D5C4'
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
