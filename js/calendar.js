// Dünya Spot - Takvim Bileşeni

const Calendar = (() => {
  const MONTH_NAMES = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  let currentYear;
  let currentMonth; // 0-indexed

  function init() {
    const today = new Date();
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();
  }

  function render(container) {
    let html = `
      <div class="calendar-page-header">
        <button class="cal-nav-btn" id="calPrev" aria-label="Önceki Yıl">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 class="cal-title">1 Yıllık Görünüm</h2>
        <button class="cal-nav-btn" id="calNext" aria-label="Sonraki Yıl">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div class="calendar-legend">
        <span class="legend-item"><span class="legend-dot filled"></span> Ciro Girildi</span>
        <span class="legend-item"><span class="legend-dot weekend"></span> Hafta Sonu</span>
        <span class="legend-item"><span class="legend-dot holiday"></span> Resmi Tatil</span>
      </div>
      <div class="months-multi-grid">
    `;

    // Son 12 ayı hesapla (Geriye doğru: Ay, Ay-1, ..., Ay-11)
    const today = new Date();
    const todayKey = DataManager.formatDateKey(today);

    for (let offset = 0; offset >= -11; offset--) {
      // Hedef ay ve yılı hesapla
      let targetMonth = currentMonth + offset;
      let targetYear = currentYear;
      while (targetMonth < 0) {
        targetMonth += 12;
        targetYear -= 1;
      }
      while (targetMonth > 11) {
        targetMonth -= 12;
        targetYear += 1;
      }

      const holidays = Holidays.getMonthHolidays(targetYear, targetMonth);
      const entries = DataManager.getMonthEntries(targetYear, targetMonth);

      const firstDay = new Date(targetYear, targetMonth, 1);
      const lastDay = new Date(targetYear, targetMonth + 1, 0);
      const totalDays = lastDay.getDate();

      // Pazartesi=0 olacak şekilde ayarla
      let startDayOfWeek = firstDay.getDay() - 1;
      if (startDayOfWeek < 0) startDayOfWeek = 6;

      html += `
        <div class="months-row-container">
          <!-- Sol Taraf: Takvim -->
          <div class="single-month-container">
            <h3 class="month-grid-title">${MONTH_NAMES[targetMonth]} ${targetYear}</h3>
            <div class="calendar-grid mini-cal">
        `;

        // Gün başlıkları (Pzt, Sal...)
        DAY_NAMES.forEach(dayName => {
          html += `<div class="cal-day-header mini-header">${dayName}</div>`;
        });

        // Boş hücreler
        for (let i = 0; i < startDayOfWeek; i++) {
          html += '<div class="cal-cell empty mini-cell"></div>';
        }

      // Günler
      for (let day = 1; day <= totalDays; day++) {
        const date = new Date(targetYear, targetMonth, day);
        const dateKey = DataManager.formatDateKey(date);
        const entry = entries[dateKey];
        const holiday = holidays[day];
        const isWknd = Holidays.isWeekend(date);
        const isToday = dateKey === todayKey;

        let classes = ['cal-cell', 'mini-cell'];
        if (isWknd) classes.push('weekend');
        if (holiday) classes.push('holiday');
        if (entry) classes.push('has-entry');
        if (isToday) classes.push('today');

        let cellContent = `<span class="cal-day-number mini-num">${day}</span>`;

        if (entry) {
          cellContent += `<span class="cal-revenue mini-rev">₺${formatMoney(entry.revenue)}</span>`;
          if (entry.weatherIcon) {
            cellContent += `<span class="cal-weather mini-weather">${entry.weatherIcon}</span>`;
          }
        }
        if (holiday) {
          cellContent += `<span class="cal-holiday-badge mini-badge" title="${holiday}">🏛️</span>`;
        }
        if (entry && entry.notes) {
          cellContent += `<span class="cal-note-indicator mini-badge-note" title="${entry.notes}">📝</span>`;
        }

        html += `<div class="${classes.join(' ')}" data-date="${dateKey}" role="button" tabindex="0">${cellContent}</div>`;
      }

        // Kalan boş hücreler
        const totalCells = startDayOfWeek + totalDays;
        const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
        for (let i = 0; i < remaining; i++) {
          html += '<div class="cal-cell empty mini-cell"></div>';
        }

        // Her ayın kendi alt ciro toplamı
        const monthEntries = Object.values(entries);
        const totalRevenue = monthEntries.reduce((sum, e) => sum + (e.revenue || 0), 0);
        const totalCash = monthEntries.reduce((sum, e) => sum + (e.cashAmount || 0), 0);
        const totalCard = monthEntries.reduce((sum, e) => sum + (e.cardAmount || 0), 0);

        // En iyi gün bulma
        let bestDayStr = '—';
        if (monthEntries.length > 0) {
          const best = monthEntries.reduce((a, b) => (a.revenue || 0) > (b.revenue || 0) ? a : b);
          if (best && best.revenue > 0) {
            bestDayStr = `₺${formatMoney(best.revenue)}`;
          }
        }

        const startOfMonthKey = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-01`;
        const endOfMonthKey = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${totalDays}`;

        html += `
            </div>
            <div class="mini-month-summary">
              <span>Ciro Toplamı: <strong style="font-size: 1.05rem; color: var(--color-success);">₺${formatMoney(totalRevenue)}</strong></span>
              <span style="color: var(--text-secondary);">💵 Nakit: ₺${formatMoney(totalCash)} · 💳 Kart: ₺${formatMoney(totalCard)}</span>
            </div>
          </div>

          <!-- Sağ Taraf: O Aya Ait Mini Grafik ve İnceleme Paneli -->
          <div class="month-analytics-container">
            <h4 class="analytics-box-title">📈 Ödeme ve Satış Analizi</h4>
            <div class="analytics-box-body">
              <div class="mini-chart-wrapper" title="Ödeme Yöntemi Dağılımı">
                <canvas class="month-mini-pie-chart" data-start="${startOfMonthKey}" data-end="${endOfMonthKey}"></canvas>
              </div>
              <div class="analytics-text-details">
                <!-- Aylık Hedef Gerçekleşme Barı -->
                <div class="analytics-detail-item" style="border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom: 4px;">
                  <span class="detail-label">🎯 Aylık Hedef Durumu</span>
                  ${(() => {
                    const targets = DataManager.getTargets();
                    // O aya özel girilmiş hedefi ara (format: YYYY-MM örn: 2026-03)
                    const monthKey = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
                    const mTarget = (targets.monthlyByMonth && targets.monthlyByMonth[monthKey]) 
                      ? targets.monthlyByMonth[monthKey] 
                      : (targets.monthly || 0);

                    if (mTarget === 0) {
                      return `<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">Hedef belirlenmemiş</div>`;
                    }
                    const percent = Math.min((totalRevenue / mTarget) * 100, 100);
                    const rawPercent = ((totalRevenue / mTarget) * 100).toFixed(0);
                    const exceeded = totalRevenue >= mTarget;
                    return `
                      <div style="display:flex; align-items:center; justify-content:space-between; margin-top:4px; font-size:0.8rem;">
                        <span style="font-weight:600; color:${exceeded ? 'var(--color-success)' : 'var(--text-primary)'}">%${rawPercent} Gerçekleşti</span>
                        <span style="color:var(--text-secondary);">₺${formatMoney(totalRevenue)} / ₺${formatMoney(mTarget)}</span>
                      </div>
                      <div class="progress-bar-container" style="height: 6px; margin-top: 4px;">
                        <div class="progress-bar-fill ${exceeded ? 'exceeded' : ''}" style="width: ${percent}%"></div>
                      </div>
                    `;
                  })()}
                </div>

                <div class="analytics-detail-item">
                  <span class="detail-label">En Başarılı Gün:</span>
                  <strong class="detail-value success-text">${bestDayStr}</strong>
                </div>
                <div class="analytics-detail-item">
                  <span class="detail-label">Ortalama Günlük:</span>
                  <strong class="detail-value">₺${formatMoney(monthEntries.length > 0 ? totalRevenue / monthEntries.length : 0)}</strong>
                </div>
                <div class="analytics-detail-item">
                  <span class="detail-label">Kayıtlı Gün Sayısı:</span>
                  <strong class="detail-value">${monthEntries.length} gün</strong>
                </div>
              </div>
            </div>
            
            <!-- Günlük Ciro Trend Çizgisi (Alt Geniş Kısım) -->
            <div class="month-trend-chart-row">
              <span class="detail-label" style="margin-bottom: 6px; display: block;">📈 Günlük Ciro Trendi</span>
              <div class="mini-line-chart-wrapper">
                <canvas class="month-mini-line-chart" data-year="${targetYear}" data-month="${targetMonth}"></canvas>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    html += `</div>`; // .months-multi-grid bitişi
    container.innerHTML = html;

    // Grafiklerin çizilmesi için küçük bir bekleme (canvas'ların DOM'a yerleşmesi gerekir)
    setTimeout(() => {
      // 1. Ödeme Pasta Grafikleri
      container.querySelectorAll('.month-mini-pie-chart').forEach(canvas => {
        const start = canvas.dataset.start;
        const end = canvas.dataset.end;
        const canvasId = 'chart_pie_' + start.replace(/-/g, '_');
        canvas.id = canvasId;
        Charts.renderPaymentPie(canvasId, { start, end });
      });

      // 2. Günlük Ciro Çizgi Grafikleri
      container.querySelectorAll('.month-mini-line-chart').forEach(canvas => {
        const year = parseInt(canvas.dataset.year);
        const month = parseInt(canvas.dataset.month);
        const canvasId = 'chart_line_' + year + '_' + month;
        canvas.id = canvasId;
        Charts.renderMonthlyMiniLine(canvasId, year, month);
      });
    }, 100);

    // Event-listeners (1 yıl kaydırma)
    document.getElementById('calPrev').addEventListener('click', () => {
      currentYear--;
      render(container);
    });

    document.getElementById('calNext').addEventListener('click', () => {
      currentYear++;
      render(container);
    });

    container.querySelectorAll('.cal-cell:not(.empty)').forEach(cell => {
      cell.addEventListener('click', () => {
        const dateKey = cell.dataset.date;
        if (dateKey) {
          App.openEntryModal(dateKey);
        }
      });
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          cell.click();
        }
      });
      cell.addEventListener('mouseenter', () => {
        const dateKey = cell.dataset.date;
        if (dateKey) {
          App.setTemporaryWeather(dateKey);
        }
      });
      cell.addEventListener('mouseleave', () => {
        App.restoreWeather();
      });
    });
  }

  function formatMoney(amount) {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  function goToMonth(year, month) {
    currentYear = year;
    currentMonth = month;
  }

  return { init, render, goToMonth, MONTH_NAMES };
})();
