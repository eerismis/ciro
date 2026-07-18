// Dünya Spot - Grafik Bileşenleri (Chart.js)

const Charts = (() => {
  let weeklyChart = null;
  let monthlyChart = null;
  let yearlyChart = null;
  let paymentChart = null;
  let dayOfWeekChart = null;
  let dashboardMiniChart = null;

  const COLORS = {
    primary: 'rgba(99, 102, 241, 1)',         // Indigo
    primaryLight: 'rgba(99, 102, 241, 0.3)',
    secondary: 'rgba(168, 85, 247, 1)',        // Purple
    secondaryLight: 'rgba(168, 85, 247, 0.3)',
    success: 'rgba(34, 197, 94, 1)',           // Green
    successLight: 'rgba(34, 197, 94, 0.3)',
    warning: 'rgba(245, 158, 11, 1)',          // Amber
    warningLight: 'rgba(245, 158, 11, 0.3)',
    cash: 'rgba(34, 197, 94, 1)',
    card: 'rgba(99, 102, 241, 1)',
    grid: 'rgba(148, 163, 184, 0.1)',
    text: 'rgba(203, 213, 225, 0.8)',
    target: 'rgba(251, 113, 133, 0.8)',        // Rose
  };

  const DAY_LABELS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const MONTH_LABELS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
        labels: { color: COLORS.text, font: { family: "'Inter', sans-serif" } }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(99, 102, 241, 0.3)',
        borderWidth: 1,
        cornerRadius: 12,
        padding: 12,
        titleFont: { family: "'Inter', sans-serif", weight: '600' },
        bodyFont: { family: "'Inter', sans-serif" },
        callbacks: {
          label: function(context) {
            return `₺${new Intl.NumberFormat('tr-TR').format(context.raw)}`;
          }
        }
      },
      datalabels: {
        display: false
      }
    },
    scales: {
      x: {
        grid: { color: COLORS.grid, drawBorder: false },
        ticks: { color: COLORS.text, font: { family: "'Inter', sans-serif", size: 11 } }
      },
      y: {
        grid: { color: COLORS.grid, drawBorder: false },
        ticks: {
          color: COLORS.text,
          font: { family: "'Inter', sans-serif", size: 11 },
          callback: function(value) {
            return '₺' + new Intl.NumberFormat('tr-TR', { notation: 'compact' }).format(value);
          }
        }
      }
    }
  };

  function destroyChart(chart) {
    if (chart) chart.destroy();
    return null;
  }

  // ─── Dashboard Mini Grafik (Bu Hafta vs Geçen Hafta) ───
  function renderDashboardMini(canvasId) {
    dashboardMiniChart = destroyChart(dashboardMiniChart);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const today = new Date();
    const startOfWeek = new Date(today);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff); // Bu haftanın Pazartesi günü

    const labels = [];
    const currentData = [];
    const prevData = [];
    const bgColors = [];

    const weekDaysShort = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);

      const prevD = new Date(d);
      prevD.setDate(prevD.getDate() - 7);

      const key = DataManager.formatDateKey(d);
      const prevKey = DataManager.formatDateKey(prevD);
      const entry = DataManager.getEntry(key);
      const prevEntry = DataManager.getEntry(prevKey);

      labels.push(weekDaysShort[i]);
      currentData.push(entry ? entry.revenue : 0);
      prevData.push(prevEntry ? prevEntry.revenue : 0);

      bgColors.push(Holidays.isWeekend(d) ? COLORS.secondary : COLORS.primary);
    }

    dashboardMiniChart = new Chart(canvas, {
      type: 'bar',
      plugins: [ChartDataLabels],
      data: {
        labels,
        datasets: [
          {
            label: 'Bu Hafta',
            data: currentData,
            backgroundColor: bgColors.map(c => c.replace('1)', '0.6)')),
            borderColor: bgColors,
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false
          },
          {
            label: 'Geçen Hafta',
            data: prevData,
            backgroundColor: 'rgba(148, 163, 184, 0.2)',
            borderColor: 'rgba(148, 163, 184, 0.5)',
            borderWidth: 1,
            borderRadius: 8,
            borderSkipped: false
          }
        ]
      },
      options: {
        ...defaultOptions,
        plugins: {
          ...defaultOptions.plugins,
          legend: { 
            display: true, 
            labels: { 
              color: COLORS.text, 
              font: { family: "'Inter', sans-serif" },
              usePointStyle: true,
              pointStyle: 'rectRounded'
            } 
          },
          datalabels: {
            display: true,
            align: 'top',
            anchor: 'end',
            offset: 2,
            font: { family: "'Inter', sans-serif", size: 9, weight: 'bold' },
            formatter: (value) => value > 0 ? '₺' + new Intl.NumberFormat('tr-TR', { notation: 'compact' }).format(value) : ''
          }
        }
      }
    });
  }

  // ─── Haftalık Grafik ───
  function renderWeekly(canvasId, weekOffset = 0) {
    weeklyChart = destroyChart(weeklyChart);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const today = new Date();
    const startOfWeek = new Date(today);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1) - (weekOffset * 7);
    startOfWeek.setDate(diff); // Pazartesi

    const labels = [];
    const currentData = [];
    const prevData = [];
    const bgColors = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);

      const prevD = new Date(d);
      prevD.setDate(prevD.getDate() - 7);

      const key = DataManager.formatDateKey(d);
      const prevKey = DataManager.formatDateKey(prevD);
      const entry = DataManager.getEntry(key);
      const prevEntry = DataManager.getEntry(prevKey);

      const dayName = DAY_LABELS[d.getDay()];
      const dayNum = d.getDate();
      labels.push(`${dayName} ${dayNum}`);

      currentData.push(entry ? entry.revenue : 0);
      prevData.push(prevEntry ? prevEntry.revenue : 0);

      bgColors.push(Holidays.isWeekend(d) ? COLORS.secondary : COLORS.primary);
    }

    // Hedef çizgisi
    const targets = DataManager.getTargets();
    const datasets = [
      {
        label: 'Bu Hafta',
        data: currentData,
        backgroundColor: bgColors.map(c => c.replace('1)', '0.6)')),
        borderColor: bgColors,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false
      },
      {
        label: 'Geçen Hafta',
        data: prevData,
        backgroundColor: 'rgba(148, 163, 184, 0.2)',
        borderColor: 'rgba(148, 163, 184, 0.5)',
        borderWidth: 1,
        borderRadius: 8,
        borderSkipped: false
      }
    ];

    const plugins = [];
    if (targets.daily > 0) {
      plugins.push({
        id: 'targetLine',
        afterDraw(chart) {
          const { ctx, chartArea, scales } = chart;
          const y = scales.y.getPixelForValue(targets.daily);
          ctx.save();
          ctx.strokeStyle = COLORS.target;
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 4]);
          ctx.beginPath();
          ctx.moveTo(chartArea.left, y);
          ctx.lineTo(chartArea.right, y);
          ctx.stroke();
          ctx.fillStyle = COLORS.target;
          ctx.font = "11px 'Inter', sans-serif";
          ctx.fillText(`Hedef: ₺${new Intl.NumberFormat('tr-TR').format(targets.daily)}`, chartArea.right - 150, y - 8);
          ctx.restore();
        }
      });
    }

    weeklyChart = new Chart(canvas, {
      type: 'bar',
      plugins: [ChartDataLabels, ...plugins],
      data: { labels, datasets },
      options: {
        ...defaultOptions,
        plugins: {
          ...defaultOptions.plugins,
          legend: { display: true, labels: { color: COLORS.text, font: { family: "'Inter', sans-serif" }, usePointStyle: true, pointStyle: 'rectRounded' } },
          datalabels: {
            display: true,
            align: 'top',
            anchor: 'end',
            offset: 2,
            color: COLORS.text,
            font: { family: "'Inter', sans-serif", size: 9, weight: 'bold' },
            formatter: (value) => value > 0 ? '₺' + new Intl.NumberFormat('tr-TR', { notation: 'compact' }).format(value) : ''
          }
        }
      }
    });
  }

  // ─── Aylık Grafik ───
  function renderMonthly(canvasId, year, month) {
    monthlyChart = destroyChart(monthlyChart);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const labels = [];
    const data = [];
    const pointColors = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const key = DataManager.formatDateKey(d);
      const entry = DataManager.getEntry(key);

      labels.push(day);
      data.push(entry ? entry.revenue : null);

      if (Holidays.getHoliday(d)) {
        pointColors.push(COLORS.warning);
      } else if (Holidays.isWeekend(d)) {
        pointColors.push(COLORS.secondary);
      } else {
        pointColors.push(COLORS.primary);
      }
    }

    monthlyChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: `${Calendar.MONTH_NAMES[month]} ${year}`,
          data,
          borderColor: COLORS.primary,
          backgroundColor: COLORS.primaryLight,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: pointColors,
          pointBorderColor: pointColors,
          spanGaps: true
        }]
      },
      options: {
        ...defaultOptions,
        plugins: {
          ...defaultOptions.plugins,
          legend: { display: true, labels: { color: COLORS.text, font: { family: "'Inter', sans-serif" } } },
          tooltip: {
            ...defaultOptions.plugins.tooltip,
            callbacks: {
              title: function(items) {
                const day = items[0].label;
                const d = new Date(year, month, parseInt(day));
                const holiday = Holidays.getHoliday(d);
                const dayName = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'][d.getDay()];
                let title = `${day} ${Calendar.MONTH_NAMES[month]} - ${dayName}`;
                if (holiday) title += ` (${holiday})`;
                return title;
              },
              label: function(context) {
                if (context.raw === null) return 'Kayıt yok';
                return `₺${new Intl.NumberFormat('tr-TR').format(context.raw)}`;
              }
            }
          }
        },
        scales: {
          ...defaultOptions.scales,
          x: {
            ...defaultOptions.scales.x,
            ticks: {
              ...defaultOptions.scales.x.ticks,
              maxTicksLimit: 15
            }
          }
        }
      }
    });
  }

  // ─── Yıllık Grafik ───
  function renderYearly(canvasId, year) {
    yearlyChart = destroyChart(yearlyChart);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const data = DataManager.getYearlyMonthTotals(year);
    const prevData = DataManager.getYearlyMonthTotals(year - 1);

    yearlyChart = new Chart(canvas, {
      type: 'bar',
      plugins: [ChartDataLabels],
      data: {
        labels: MONTH_LABELS,
        datasets: [
          {
            label: `${year}`,
            data,
            backgroundColor: COLORS.primaryLight,
            borderColor: COLORS.primary,
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false
          },
          {
            label: `${year - 1}`,
            data: prevData,
            backgroundColor: 'rgba(148, 163, 184, 0.15)',
            borderColor: 'rgba(148, 163, 184, 0.4)',
            borderWidth: 1,
            borderRadius: 8,
            borderSkipped: false
          }
        ]
      },
      options: {
        ...defaultOptions,
        plugins: {
          ...defaultOptions.plugins,
          legend: { display: true, labels: { color: COLORS.text, font: { family: "'Inter', sans-serif" }, usePointStyle: true, pointStyle: 'rectRounded' } },
          datalabels: {
            display: true,
            align: 'top',
            anchor: 'end',
            offset: 2,
            color: COLORS.text,
            font: { family: "'Inter', sans-serif", size: 9, weight: 'bold' },
            formatter: (value) => value > 0 ? '₺' + new Intl.NumberFormat('tr-TR', { notation: 'compact' }).format(value) : ''
          }
        }
      }
    });
  }

  // ─── Ödeme Yöntemi Pasta Grafik ───
  function renderPaymentPie(canvasId, dateRange) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Eğer global grafik güncelleniyorsa (mini grafik değilse) eskiyi temizle
    const isMini = canvasId.startsWith('chart_');
    if (!isMini) {
      paymentChart = destroyChart(paymentChart);
    } else {
      // Mini grafik ise canvas üzerinde önceden tanımlı Chart varsa onu temizle
      const existingChart = Chart.getChart(canvas);
      if (existingChart) existingChart.destroy();
    }

    const entries = DataManager.getEntriesInRange(dateRange.start, dateRange.end);
    const totalCash = entries.reduce((s, e) => s + (e.cashAmount || 0), 0);
    const totalCard = entries.reduce((s, e) => s + (e.cardAmount || 0), 0);

    if (totalCash === 0 && totalCard === 0) {
      canvas.parentElement.innerHTML = '<div class="no-data">Bu dönem için veri yok</div>';
      return;
    }

    const newChart = new Chart(canvas, {
      type: 'doughnut',
      plugins: [ChartDataLabels],
      data: {
        labels: ['Nakit', 'Kredi Kartı'],
        datasets: [{
          data: [totalCash, totalCard],
          backgroundColor: [COLORS.successLight, COLORS.primaryLight],
          borderColor: [COLORS.success, COLORS.primary],
          borderWidth: 2,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { 
              color: COLORS.text, 
              font: { family: "'Inter', sans-serif", size: 12 }, 
              padding: 16, 
              usePointStyle: true,
              reverse: true
            }
          },
          tooltip: {
            ...defaultOptions.plugins.tooltip,
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const pct = Math.round((context.raw / total) * 100);
                return `${context.label}: ₺${new Intl.NumberFormat('tr-TR').format(context.raw)} (%${pct})`;
              }
            }
          },
          datalabels: {
            display: true,
            color: '#fff',
            font: {
              family: "'Inter', sans-serif",
              weight: 'bold',
              size: 12
            },
            formatter: (value, ctx) => {
              const datasets = ctx.chart.data.datasets;
              if (datasets.indexOf(ctx.dataset) === datasets.length - 1) {
                const sum = datasets[0].data.reduce((a, b) => a + b, 0);
                if (sum === 0) return '';
                const percentage = Math.round((value / sum) * 100);
                return percentage > 0 ? `%${percentage}` : '';
              }
              return '';
            }
          }
        }
      }
    });

    if (!isMini) {
      paymentChart = newChart;
    }
  }

  // ─── Haftanın Günlerine Göre Ortalama ───
  function renderDayOfWeek(canvasId) {
    dayOfWeekChart = destroyChart(dayOfWeekChart);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const averages = DataManager.getDayOfWeekAverages();
    // Pazartesi'den başlat
    const reordered = [...averages.slice(1), averages[0]];
    const labels = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

    const maxVal = Math.max(...reordered);
    const bgColors = reordered.map((val, i) => {
      if (i >= 5) return COLORS.secondaryLight; // hafta sonu
      if (val === maxVal && val > 0) return COLORS.successLight;
      return COLORS.primaryLight;
    });
    const borderColors = reordered.map((val, i) => {
      if (i >= 5) return COLORS.secondary;
      if (val === maxVal && val > 0) return COLORS.success;
      return COLORS.primary;
    });

    dayOfWeekChart = new Chart(canvas, {
      type: 'bar',
      plugins: [ChartDataLabels],
      data: {
        labels,
        datasets: [{
          label: 'Ortalama Ciro',
          data: reordered,
          backgroundColor: bgColors,
          borderColor: borderColors,
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        ...defaultOptions,
        plugins: {
          ...defaultOptions.plugins,
          legend: { display: false },
          datalabels: {
            display: true,
            align: 'top',
            anchor: 'end',
            offset: 2,
            color: COLORS.text,
            font: { family: "'Inter', sans-serif", size: 9, weight: 'bold' },
            formatter: (value) => value > 0 ? '₺' + new Intl.NumberFormat('tr-TR', { notation: 'compact' }).format(value) : ''
          }
        }
      }
    });
  }

  // ─── Aylık Mini Günlük Ciro Sparkline Grafiği ───
  function renderMonthlyMiniLine(canvasId, year, month) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Varsa eski grafik örneğini yok et
    const existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const labels = [];
    const data = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const key = DataManager.formatDateKey(d);
      const entry = DataManager.getEntry(key);

      labels.push(day);
      data.push(entry ? entry.revenue : 0);
    }

    new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: COLORS.success,
          backgroundColor: 'rgba(34, 197, 94, 0.08)',
          borderWidth: 2,
          pointRadius: 2,
          pointBackgroundColor: COLORS.success,
          pointHoverRadius: 5,
          fill: true,
          tension: 0.25,
          spanGaps: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#e2e8f0',
            bodyColor: '#cbd5e1',
            padding: 8,
            titleFont: { size: 10 },
            bodyFont: { size: 10 },
            callbacks: {
              title: (items) => `${items[0].label} ${MONTH_LABELS[month]}`,
              label: (context) => `₺${new Intl.NumberFormat('tr-TR').format(context.raw)}`
            }
          },
          datalabels: { display: false }
        },
        scales: {
          x: {
            grid: { color: 'rgba(148, 163, 184, 0.05)', drawBorder: false },
            ticks: { color: COLORS.text, font: { size: 9 } }
          },
          y: {
            grid: { color: 'rgba(148, 163, 184, 0.05)', drawBorder: false },
            ticks: {
              color: COLORS.text,
              font: { size: 9 },
              callback: (value) => '₺' + new Intl.NumberFormat('tr-TR', { notation: 'compact' }).format(value)
            }
          }
        }
      }
    });
  }

  // ─── Son 90 Günün İnce Bar Rapor Grafiği ───
  function renderDaily90(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();

    const report = Reports.getDaily90Report();
    const labels = [];
    const data = [];
    const bgColors = [];

    report.entries.forEach(e => {
      const parts = e.date.split('-');
      // Sadece GG/AA formatında etiket göster
      labels.push(`${parts[2]}/${parts[1]}`);
      data.push(e.revenue);

      const d = new Date(e.date + 'T00:00:00');
      if (Holidays.getHoliday(d)) {
        bgColors.push(COLORS.warning);
      } else if (Holidays.isWeekend(d)) {
        bgColors.push(COLORS.secondary);
      } else {
        bgColors.push(COLORS.primary);
      }
    });

    const plugins = [{
      id: 'avgLine',
      afterDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        if (report.avgRevenue <= 0) return;
        
        const y = scales.y.getPixelForValue(report.avgRevenue);
        ctx.save();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)'; // Kırmızı tonu
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(chartArea.left, y);
        ctx.lineTo(chartArea.right, y);
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        ctx.font = "10px 'Inter', sans-serif";
        ctx.fillText(`Ortalama: ₺${new Intl.NumberFormat('tr-TR').format(Math.round(report.avgRevenue))}`, chartArea.right - 130, y - 6);
        ctx.restore();
      }
    }];

    new Chart(canvas, {
      type: 'bar',
      plugins: [ChartDataLabels, ...plugins],
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: bgColors.map(c => c.replace('1)', '0.65)')),
          borderColor: bgColors,
          borderWidth: 0.5,
          barPercentage: 0.8,
          categoryPercentage: 0.8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onHover: (event, elements) => {
          if (elements && elements.length > 0) {
            const idx = elements[0].index;
            const dateKey = report.entries[idx].date;
            if (dateKey) {
              App.setTemporaryWeather(dateKey);
            }
          } else {
            App.restoreWeather();
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#e2e8f0',
            bodyColor: '#cbd5e1',
            padding: 8,
            titleFont: { size: 10 },
            bodyFont: { size: 10 },
            callbacks: {
              title: (items) => {
                const idx = items[0].dataIndex;
                const dateKey = report.entries[idx].date;
                const d = new Date(dateKey + 'T00:00:00');
                const dayName = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'][d.getDay()];
                const holiday = Holidays.getHoliday(d);
                let title = `${dateKey.split('-')[2]}.${dateKey.split('-')[1]}.${dateKey.split('-')[0]} - ${dayName}`;
                if (holiday) title += ` (${holiday})`;
                return title;
              },
              label: (context) => `Ciro: ₺${new Intl.NumberFormat('tr-TR').format(context.raw)}`
            }
          },
          datalabels: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: COLORS.text,
              font: { size: 8 },
              maxTicksLimit: 10
            }
          },
          y: {
            grid: { color: COLORS.grid, drawBorder: false },
            ticks: {
              color: COLORS.text,
              font: { size: 9 },
              callback: (value) => '₺' + new Intl.NumberFormat('tr-TR', { notation: 'compact' }).format(value)
            }
          }
        }
      }
    });
  }

  return {
    renderDashboardMini,
    renderWeekly,
    renderMonthly,
    renderYearly,
    renderPaymentPie,
    renderDayOfWeek,
    renderMonthlyMiniLine,
    renderDaily90,
    COLORS
  };
})();
