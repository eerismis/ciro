// Dünya Spot - Ana Uygulama Modülü
// Navigasyon, hava durumu, modal yönetimi, uyarılar

const App = (() => {
  let currentPage = 'dashboard';
  let currentWeather = null;
  let reportState = {
    period: 'daily',
    weekOffset: 0,
    monthYear: new Date().getFullYear(),
    monthMonth: new Date().getMonth(),
    year: new Date().getFullYear()
  };

  // ─── Initialization ───
  function init() {
    Calendar.init();
    setupNavigation();
    setupModal();
    setupQuickActions();
    setupSettings();
    setupTargets();
    setupExport();
    setupReportTabs();
    fetchWeather();
    renderDashboard();

    // Her 30 dakikada hava durumunu güncelle
    setInterval(fetchWeather, 30 * 60 * 1000);

    // Eksik sıcaklık derecelerini otomatik güncelle
    syncMissingWeather();

    // Firebase başlat ve bulut verilerini senkronize et
    initFirebaseAtLaunch();
  }

  // ─── Navigation ───
  function setupNavigation() {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', () => {
        navigateTo(item.dataset.page);
      });
    });

    // Mobile toggle
    const mobileToggle = document.getElementById('mobileToggle');
    const sidebar = document.getElementById('sidebar');
    if (mobileToggle) {
      mobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });

      // Sidebar dışına tıklanınca kapat
      document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) &&
            !mobileToggle.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      });
    }
  }

  function navigateTo(page) {
    currentPage = page;

    // Nav items güncelle
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    // Sayfaları göster/gizle
    document.querySelectorAll('.page-section').forEach(section => {
      section.classList.remove('active');
    });

    const target = document.getElementById('page' + page.charAt(0).toUpperCase() + page.slice(1));
    if (target) {
      target.classList.add('active');
    }

    // Sayfa render
    switch (page) {
      case 'dashboard': renderDashboard(); break;
      case 'calendar': renderCalendar(); break;
      case 'reports': renderReports(); break;
      case 'targets': renderTargetsPage(); break;
      case 'settings': renderSettings(); break;
    }

    // Mobile: sidebar kapat
    document.getElementById('sidebar').classList.remove('open');
  }

  // ─── Dashboard ───
  function renderDashboard() {
    renderAlerts();
    renderDashboardStats();
    renderDashboardTargets();
    renderRecentEntries();
    renderDashboardReportsSummary();

    // Grafikler biraz gecikmeli (animasyon için)
    setTimeout(() => {
      Charts.renderDashboardMini('dashboardMiniChart');

      const today = new Date();
      const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      const todayKey = DataManager.formatDateKey(today);
      Charts.renderPaymentPie('dashboardPaymentChart', { start: firstOfMonth, end: todayKey });
    }, 100);
  }

  function renderDashboardStats() {
    const container = document.getElementById('dashboardStats');
    const today = new Date();
    
    // Dünün tarihini hesapla
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = DataManager.formatDateKey(yesterday);
    const yesterdayEntry = DataManager.getEntry(yesterdayKey);

    // Bu hafta
    const weekReport = Reports.getWeeklyReport(0);
    const prevWeekReport = Reports.getWeeklyReport(1);

    // Bu ay
    const monthReport = Reports.getMonthlyReport(today.getFullYear(), today.getMonth());

    container.innerHTML = `
      <div class="stat-card">
        <span class="stat-icon">📅</span>
        <div class="stat-label">Dünkü Ciro</div>
        <div class="stat-value">${yesterdayEntry ? '₺' + formatMoney(yesterdayEntry.revenue) : '—'}</div>
        ${yesterdayEntry ? `
          <div style="font-size:0.8rem; color:#ffffff; margin-top:4px;">
            💵 ₺${formatMoney(yesterdayEntry.cashAmount)} · 💳 ₺${formatMoney(yesterdayEntry.cardAmount)}
          </div>
        ` : '<div style="font-size:0.8rem; color:#ffffff; margin-top:4px;">Kayıt bulunamadı</div>'}
      </div>
      <div class="stat-card">
        <span class="stat-icon">📊</span>
        <div class="stat-label">Haftalık Toplam</div>
        <div class="stat-value">₺${formatMoney(weekReport.totalRevenue)}</div>
        <div style="font-size:0.8rem; color:#ffffff; margin-top:4px; display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          <span>Geçen Hf (Aynı Gün): ₺${formatMoney(weekReport.prevTotalRevenue)}</span>
          ${weekReport.changePercent != 0 ? `
            <span class="stat-change ${weekReport.changePercent >= 0 ? 'positive' : 'negative'}" style="margin-top:0; padding:1px 6px;">
              ${weekReport.changePercent >= 0 ? '↑' : '↓'}%${Math.abs(weekReport.changePercent).toFixed(1)}
            </span>
          ` : ''}
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">📈</span>
        <div class="stat-label">Aylık Toplam</div>
        <div class="stat-value">₺${formatMoney(monthReport.totalRevenue)}</div>
        <div style="font-size:0.8rem; color:#ffffff; margin-top:4px; display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          <span>Geçen Ay (Aynı Gün): ₺${formatMoney(monthReport.prevTotalRevenue)}</span>
          ${monthReport.changePercent !== 0 ? `
            <span class="stat-change ${monthReport.changePercent >= 0 ? 'positive' : 'negative'}" style="margin-top:0; padding:1px 6px;">
              ${monthReport.changePercent >= 0 ? '↑' : '↓'}%${Math.abs(monthReport.changePercent).toFixed(1)}
            </span>
          ` : ''}
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">⚡</span>
        <div class="stat-label">Günlük Ortalama</div>
        <div class="stat-value">₺${formatMoney(monthReport.avgRevenue)}</div>
        <div style="font-size:0.8rem; color:#ffffff; margin-top:4px;">
          ${monthReport.entryCount} gün kayıtlı
        </div>
      </div>
    `;
  }

  function renderDashboardTargets() {
    const container = document.getElementById('dashboardTargets');
    const targets = DataManager.getTargets();

    if (targets.daily === 0 && targets.weekly === 0 && targets.monthly === 0) {
      container.innerHTML = '';
      return;
    }

    const report = Reports.getTargetReport();
    let html = '<div class="target-card"><div class="card-title">🎯 Hedef Takibi</div>';

    if (targets.daily > 0) {
      const exceeded = report.daily.percent >= 100;
      const yestPercent = Math.min((report.daily.yesterday / targets.daily) * 100, 100);
      const yestExceeded = report.daily.yesterday >= targets.daily;
      
      html += `
        <!-- Günlük Hedefler -->
        <div class="target-row">
          <span class="target-label">Bugün</span>
          <div class="progress-bar-container">
            <div class="progress-bar-fill ${exceeded ? 'exceeded' : ''}" style="width: ${Math.min(report.daily.percent, 100)}%"></div>
          </div>
          <span class="target-percent">%${report.daily.percent.toFixed(0)}</span>
          <span class="target-values">₺${formatMoney(report.daily.actual)} / ₺${formatMoney(report.daily.target)}</span>
        </div>
        <div class="target-row sub-target">
          <span class="target-label sub-label">⏮️ Dün</span>
          <div class="progress-bar-container sub-progress">
            <div class="progress-bar-fill ${yestExceeded ? 'exceeded' : 'sub-fill'}" style="width: ${yestPercent}%"></div>
          </div>
          <span class="target-percent sub-percent">%${((report.daily.yesterday / targets.daily) * 100).toFixed(0)}</span>
          <span class="target-values sub-values">₺${formatMoney(report.daily.yesterday)}</span>
        </div>
      `;
    }

    if (targets.weekly > 0) {
      const exceeded = report.weekly.percent >= 100;
      const prevWeekPercent = Math.min((report.weekly.prevWeek / targets.weekly) * 100, 100);
      const prevWeekExceeded = report.weekly.prevWeek >= targets.weekly;

      html += `
        <!-- Haftalık Hedefler -->
        <div class="target-row" style="border-top: 1px solid var(--border-color); padding-top:12px; margin-top:8px;">
          <span class="target-label">Bu Hafta</span>
          <div class="progress-bar-container">
            <div class="progress-bar-fill ${exceeded ? 'exceeded' : ''}" style="width: ${Math.min(report.weekly.percent, 100)}%"></div>
          </div>
          <span class="target-percent">%${report.weekly.percent.toFixed(0)}</span>
          <span class="target-values">₺${formatMoney(report.weekly.actual)} / ₺${formatMoney(report.weekly.target)}</span>
        </div>
        <div class="target-row sub-target">
          <span class="target-label sub-label">⏮️ Geçen Hf.</span>
          <div class="progress-bar-container sub-progress">
            <div class="progress-bar-fill ${prevWeekExceeded ? 'exceeded' : 'sub-fill'}" style="width: ${prevWeekPercent}%"></div>
          </div>
          <span class="target-percent sub-percent">%${((report.weekly.prevWeek / targets.weekly) * 100).toFixed(0)}</span>
          <span class="target-values sub-values">₺${formatMoney(report.weekly.prevWeek)}</span>
        </div>
      `;
    }

    if (targets.monthly > 0) {
      const exceeded = report.monthly.percent >= 100;
      const prevMonthPercent = Math.min((report.monthly.prevMonth / targets.monthly) * 100, 100);
      const prevMonthExceeded = report.monthly.prevMonth >= targets.monthly;

      html += `
        <!-- Aylık Hedefler -->
        <div class="target-row" style="border-top: 1px solid var(--border-color); padding-top:12px; margin-top:8px;">
          <span class="target-label">Bu Ay</span>
          <div class="progress-bar-container">
            <div class="progress-bar-fill ${exceeded ? 'exceeded' : ''}" style="width: ${Math.min(report.monthly.percent, 100)}%"></div>
          </div>
          <span class="target-percent">%${report.monthly.percent.toFixed(0)}</span>
          <span class="target-values">₺${formatMoney(report.monthly.actual)} / ₺${formatMoney(report.monthly.target)}</span>
        </div>
        <div class="target-row sub-target">
          <span class="target-label sub-label">⏮️ Geçen Ay</span>
          <div class="progress-bar-container sub-progress">
            <div class="progress-bar-fill ${prevMonthExceeded ? 'exceeded' : 'sub-fill'}" style="width: ${prevMonthPercent}%"></div>
          </div>
          <span class="target-percent sub-percent">%${((report.monthly.prevMonth / targets.monthly) * 100).toFixed(0)}</span>
          <span class="target-values sub-values">₺${formatMoney(report.monthly.prevMonth)}</span>
        </div>
      `;
    }

    html += '</div>';
    container.innerHTML = html;
  }

  function renderRecentEntries() {
    const container = document.getElementById('recentEntries');
    const today = new Date();
    const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const dayNamesShort = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

    let rows = '';
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = DataManager.formatDateKey(d);
      const entry = DataManager.getEntry(key);
      const holiday = Holidays.getHoliday(d);
      const isWknd = Holidays.isWeekend(d);
      const dayName = dayNamesShort[d.getDay()];

      let rowClass = 'recent-item';
      if (!entry) rowClass += ' no-entry';
      if (isWknd) rowClass += ' weekend-row';
      if (holiday) rowClass += ' holiday-row';

      const badges = [];
      if (isWknd) badges.push(`<span class="day-badge weekend-badge">${dayNames[d.getDay()]}</span>`);
      if (holiday) badges.push(`<span class="day-badge holiday-badge" title="${holiday}">🏛️ ${holiday}</span>`);

      rows += `
        <li class="${rowClass}" data-date="${key}">
          <div class="recent-left">
            <div class="recent-date-col">
              <span class="recent-day-name">${dayName}</span>
              <span class="recent-date-num">${formatDisplayDate(key)}</span>
            </div>
            <div class="recent-info">
              ${badges.length > 0 ? `<div class="recent-badges">${badges.join('')}</div>` : ''}
              ${entry && entry.weatherIcon ? `<span class="recent-weather-icon">${entry.weatherIcon} ${entry.weather || ''}</span>` : ''}
              ${entry && entry.notes ? `<div class="recent-note">📝 ${entry.notes}</div>` : ''}
            </div>
          </div>
          <div class="recent-right">
            ${entry ? `
              <div class="recent-revenue">₺${formatMoney(entry.revenue)}</div>
              <div class="recent-breakdown">
                <span class="cash-tag">💵 ${formatMoney(entry.cashAmount)}</span>
                <span class="card-tag">💳 ${formatMoney(entry.cardAmount)}</span>
              </div>
            ` : `
              <div class="recent-revenue empty">—</div>
            `}
            <button class="btn-entry-action" data-date="${key}" title="${entry ? 'Düzenle' : 'Ciro Gir'}">
              ${entry ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>` : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`}
            </button>
          </div>
        </li>
      `;
    }

    container.innerHTML = rows;

    // Ciro gir/düzenle butonları
    container.querySelectorAll('.btn-entry-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEntryModal(btn.dataset.date);
      });
    });

    // Satıra tıklama ile de düzenleme (ciro varsa)
    container.querySelectorAll('.recent-item').forEach(item => {
      item.addEventListener('click', () => {
        openEntryModal(item.dataset.date);
      });
    });
  }

  function renderDashboardReportsSummary() {
    const container = document.getElementById('dashboardReportsSummary');
    if (!container) return;

    const today = new Date();
    const weekly = Reports.getWeeklyReport(0);
    const monthly = Reports.getMonthlyReport(today.getFullYear(), today.getMonth());

    const wCashPct = weekly.totalRevenue > 0 ? Math.round((weekly.totalCash / weekly.totalRevenue) * 100) : 0;
    const wCardPct = weekly.totalRevenue > 0 ? Math.round((weekly.totalCard / weekly.totalRevenue) * 100) : 0;

    const mCashPct = monthly.totalRevenue > 0 ? Math.round((monthly.totalCash / monthly.totalRevenue) * 100) : 0;
    const mCardPct = monthly.totalRevenue > 0 ? Math.round((monthly.totalCard / monthly.totalRevenue) * 100) : 0;

    container.innerHTML = `
      <div class="dash-rep-section">
        <h4 class="dash-rep-subtitle">📅 Bu Hafta (Özet)</h4>
        <div class="dash-rep-row">
          <span>Toplam Ciro:</span>
          <strong>₺${formatMoney(weekly.totalRevenue)}</strong>
        </div>
        <div class="dash-rep-row">
          <span>Günlük Ortalama:</span>
          <strong>₺${formatMoney(weekly.avgRevenue)}</strong>
        </div>
        <div class="dash-rep-row">
          <span>Nakit / Kart:</span>
          <span>%${wCashPct} Nakit · %${wCardPct} Kart</span>
        </div>
        ${weekly.bestDay ? `
          <div class="dash-rep-row">
            <span>En İyi Gün:</span>
            <span class="success-text">₺${formatMoney(weekly.bestDay.revenue)} (${formatDisplayDate(weekly.bestDay.date)})</span>
          </div>
        ` : ''}
      </div>

      <div class="dash-rep-divider"></div>

      <div class="dash-rep-section">
        <h4 class="dash-rep-subtitle">📈 Bu Ay (${Calendar.MONTH_NAMES[today.getMonth()]})</h4>
        <div class="dash-rep-row">
          <span>Toplam Ciro:</span>
          <strong>₺${formatMoney(monthly.totalRevenue)}</strong>
        </div>
        <div class="dash-rep-row">
          <span>Günlük Ortalama:</span>
          <strong>₺${formatMoney(monthly.avgRevenue)}</strong>
        </div>
        <div class="dash-rep-row">
          <span>Nakit / Kart:</span>
          <span>%${mCashPct} Nakit · %${mCardPct} Kart</span>
        </div>
        ${monthly.bestDay ? `
          <div class="dash-rep-row">
            <span>En İyi Gün:</span>
            <span class="success-text" style="color:var(--color-success); font-weight:700;">₺${formatMoney(monthly.bestDay.revenue)} <span style="font-weight:normal; font-size:0.75rem; color:#ffffff;">(${formatDisplayDate(monthly.bestDay.date)})</span></span>
          </div>
        ` : ''}
      </div>
    `;
  }

  // ─── Alerts ───
  function renderAlerts() {
    const container = document.getElementById('alertsContainer');
    const missing = DataManager.getMissingDays(3);
    const targets = DataManager.getTargets();
    let html = '';

    if (missing.length > 0) {
      const missingDates = missing.map(d => formatDisplayDate(d)).join(', ');
      html += `
        <div class="alert-bar warning">
          ⚠️ Son 3 günde ${missing.length} gün ciro girilmemiş: ${missingDates}
          <button class="alert-close" onclick="this.parentElement.remove()">✕</button>
        </div>
      `;
    }

    // Hedef kontrolü
    if (targets.daily > 0) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = DataManager.formatDateKey(yesterday);
      const yesterdayEntry = DataManager.getEntry(yesterdayKey);

      if (yesterdayEntry && yesterdayEntry.revenue > targets.daily * 1.5) {
        html += `
          <div class="alert-bar success">
            🎉 Dün rekor gün! ₺${formatMoney(yesterdayEntry.revenue)} ciro (Hedefin %${Math.round((yesterdayEntry.revenue / targets.daily) * 100)}'i)
            <button class="alert-close" onclick="this.parentElement.remove()">✕</button>
          </div>
        `;
      }
    }

    container.innerHTML = html;
  }

  // ─── Calendar Page ───
  function renderCalendar() {
    const container = document.getElementById('calendarContainer');
    Calendar.render(container);

    document.getElementById('btnCalToday').addEventListener('click', () => {
      const today = new Date();
      Calendar.goToMonth(today.getFullYear(), today.getMonth());
      Calendar.render(container);
    });
  }

  // ─── Reports Page ───
  function setupReportTabs() {
    document.querySelectorAll('.report-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        reportState.period = tab.dataset.period;
        renderReports();
      });
    });
  }

  function renderReports() {
    const container = document.getElementById('reportContent');

    switch (reportState.period) {
      case 'daily': renderDailyReport(container); break;
      case 'weekly': renderWeeklyReport(container); break;
      case 'monthly': renderMonthlyReport(container); break;
      case 'yearly': renderYearlyReport(container); break;
      case 'dayofweek': renderDayOfWeekReport(container); break;
    }
  }

  function renderDailyReport(container) {
    const report = Reports.getDaily90Report();

    container.innerHTML = `
      <div class="report-summary-grid">
        <div class="stat-card">
          <div class="stat-label">Son 90 Gün Toplamı</div>
          <div class="stat-value">₺${formatMoney(report.totalRevenue)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Günlük Ortalama (Kayıtlı)</div>
          <div class="stat-value">₺${formatMoney(report.avgRevenue)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Nakit / Kart</div>
          <div class="stat-value" style="font-size:1rem">
            <span style="color:var(--color-cash)">₺${formatMoney(report.totalCash)}</span> /
            <span style="color:var(--color-card)">₺${formatMoney(report.totalCard)}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Kayıtlı Gün Sayısı</div>
          <div class="stat-value">${report.entryCount} / 90 gün</div>
        </div>
      </div>

      </div>

      <div class="card">
        <div class="card-title">📊 Son 90 Günün Günlük Ciroları (İnce Bar Grafik)</div>
        <div class="chart-container" style="height: 380px;">
          <canvas id="reportChart"></canvas>
        </div>
      </div>
    `;

    setTimeout(() => Charts.renderDaily90('reportChart'), 50);
  }

  function renderWeeklyReport(container) {
    const report = Reports.getWeeklyReport(reportState.weekOffset);
    const prevReport = Reports.getWeeklyReport(reportState.weekOffset + 1);
    const changePercent = prevReport.totalRevenue > 0
      ? ((report.totalRevenue - prevReport.totalRevenue) / prevReport.totalRevenue * 100).toFixed(1) : 0;

    container.innerHTML = `
      <div class="report-nav">
        <button class="btn btn-icon" id="reportPrev">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="report-period-label">${formatDisplayDate(report.startDate)} - ${formatDisplayDate(report.endDate)}</span>
        <button class="btn btn-icon" id="reportNext">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div class="report-summary-grid">
        <div class="stat-card">
          <div class="stat-label">Haftalık Toplam</div>
          <div class="stat-value">₺${formatMoney(report.totalRevenue)}</div>
          ${changePercent != 0 ? `
            <div class="stat-change ${changePercent >= 0 ? 'positive' : 'negative'}">
              ${changePercent >= 0 ? '↑' : '↓'} %${Math.abs(changePercent)} önceki haftaya göre
            </div>
          ` : ''}
          
          <!-- Haftalık Hedef Durumu -->
          ${(() => {
            const targets = DataManager.getTargets();
            const wTarget = targets.weekly || 0;
            if (wTarget === 0) return '';
            const percent = Math.min((report.totalRevenue / wTarget) * 100, 100);
            const rawPercent = ((report.totalRevenue / wTarget) * 100).toFixed(0);
            const exceeded = report.totalRevenue >= wTarget;
            return `
              <div style="margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;">
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-secondary);">
                  <span>🎯 Hedef: %${rawPercent}</span>
                  <span>₺${formatMoney(wTarget)}</span>
                </div>
                <div class="progress-bar-container" style="height: 4px; margin-top: 4px; background: rgba(255,255,255,0.1);">
                  <div class="progress-bar-fill ${exceeded ? 'exceeded' : ''}" style="width: ${percent}%"></div>
                </div>
              </div>
            `;
          })()}
        </div>
        <div class="stat-card">
          <div class="stat-label">Günlük Ortalama</div>
          <div class="stat-value">₺${formatMoney(report.avgRevenue)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Nakit / Kart</div>
          <div class="stat-value" style="font-size:1rem">
            <span style="color:var(--color-cash)">₺${formatMoney(report.totalCash)}</span> /
            <span style="color:var(--color-card)">₺${formatMoney(report.totalCard)}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">En İyi Gün</div>
          <div class="stat-value" style="font-size:1rem; color:var(--color-success)">
            ${report.bestDay ? `₺${formatMoney(report.bestDay.revenue)}` : '—'}
          </div>
          ${report.bestDay ? `<div style="font-size:0.85rem;color:#ffffff">${formatDisplayDate(report.bestDay.date)}</div>` : ''}
        </div>
      </div>

      <div class="card">
        <div class="card-title">📊 Haftalık Ciro Grafiği</div>
        <div class="chart-container">
          <canvas id="reportChart"></canvas>
        </div>
      </div>
    `;

    document.getElementById('reportPrev').addEventListener('click', () => {
      reportState.weekOffset++;
      renderWeeklyReport(container);
    });
    document.getElementById('reportNext').addEventListener('click', () => {
      if (reportState.weekOffset > 0) {
        reportState.weekOffset--;
        renderWeeklyReport(container);
      }
    });

    setTimeout(() => Charts.renderWeekly('reportChart', reportState.weekOffset), 50);
  }

  function renderMonthlyReport(container) {
    const year = reportState.monthYear;
    const month = reportState.monthMonth;
    const report = Reports.getMonthlyReport(year, month);

    container.innerHTML = `
      <div class="report-nav">
        <button class="btn btn-icon" id="reportPrev">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="report-period-label">${Calendar.MONTH_NAMES[month]} ${year}</span>
        <button class="btn btn-icon" id="reportNext">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div class="report-summary-grid">
        <div class="stat-card">
          <div class="stat-label">Aylık Toplam</div>
          <div class="stat-value">₺${formatMoney(report.totalRevenue)}</div>
          ${report.changePercent !== 0 ? `
            <div class="stat-change ${report.changePercent >= 0 ? 'positive' : 'negative'}">
              ${report.changePercent >= 0 ? '↑' : '↓'} %${Math.abs(report.changePercent).toFixed(1)} önceki aya göre
            </div>
          ` : ''}

          <!-- Aylık Hedef Durumu -->
          ${(() => {
            const targets = DataManager.getTargets();
            const monthKey = `${year}-${String(month).padStart(2, '0')}`;
            const mTarget = (targets.monthlyByMonth && targets.monthlyByMonth[monthKey])
              ? targets.monthlyByMonth[monthKey]
              : (targets.monthly || 0);

            if (mTarget === 0) return '';
            const percent = Math.min((report.totalRevenue / mTarget) * 100, 100);
            const rawPercent = ((report.totalRevenue / mTarget) * 100).toFixed(0);
            const exceeded = report.totalRevenue >= mTarget;
            return `
              <div style="margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;">
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-secondary);">
                  <span>🎯 Hedef: %${rawPercent}</span>
                  <span>₺${formatMoney(mTarget)}</span>
                </div>
                <div class="progress-bar-container" style="height: 4px; margin-top: 4px; background: rgba(255,255,255,0.1);">
                  <div class="progress-bar-fill ${exceeded ? 'exceeded' : ''}" style="width: ${percent}%"></div>
                </div>
              </div>
            `;
          })()}
        </div>
        <div class="stat-card">
          <div class="stat-label">Günlük Ortalama</div>
          <div class="stat-value">₺${formatMoney(report.avgRevenue)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Nakit / Kart</div>
          <div class="stat-value" style="font-size:1rem">
            <span style="color:var(--color-cash)">₺${formatMoney(report.totalCash)}</span> /
            <span style="color:var(--color-card)">₺${formatMoney(report.totalCard)}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Kayıtlı Gün</div>
          <div class="stat-value">${report.entryCount} / ${report.daysInMonth}</div>
        </div>
      </div>

      <div class="charts-grid">
        <div class="card">
          <div class="card-title">📈 Aylık Ciro Trendi</div>
          <div class="chart-container">
            <canvas id="reportChart"></canvas>
          </div>
        </div>
        <div class="card">
          <div class="card-title">💳 Ödeme Dağılımı</div>
          <div class="chart-container">
            <canvas id="reportPaymentChart"></canvas>
          </div>
        </div>
      </div>
    `;

    document.getElementById('reportPrev').addEventListener('click', () => {
      reportState.monthMonth--;
      if (reportState.monthMonth < 0) { reportState.monthMonth = 11; reportState.monthYear--; }
      renderMonthlyReport(container);
    });
    document.getElementById('reportNext').addEventListener('click', () => {
      const now = new Date();
      if (reportState.monthYear < now.getFullYear() || reportState.monthMonth < now.getMonth()) {
        reportState.monthMonth++;
        if (reportState.monthMonth > 11) { reportState.monthMonth = 0; reportState.monthYear++; }
        renderMonthlyReport(container);
      }
    });

    setTimeout(() => {
      Charts.renderMonthly('reportChart', year, month);
      const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;
      Charts.renderPaymentPie('reportPaymentChart', { start: firstDay, end: lastDay });
    }, 50);
  }

  function renderYearlyReport(container) {
    const year = reportState.year;
    const report = Reports.getYearlyReport(year);

    container.innerHTML = `
      <div class="report-nav">
        <button class="btn btn-icon" id="reportPrev">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="report-period-label">${year}</span>
        <button class="btn btn-icon" id="reportNext">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div class="report-summary-grid">
        <div class="stat-card">
          <div class="stat-label">Yıllık Toplam</div>
          <div class="stat-value">₺${formatMoney(report.totalRevenue)}</div>
          ${report.changePercent !== 0 ? `
            <div class="stat-change ${report.changePercent >= 0 ? 'positive' : 'negative'}">
              ${report.changePercent >= 0 ? '↑' : '↓'} %${Math.abs(report.changePercent).toFixed(1)} önceki yıla göre
            </div>
          ` : ''}
        </div>
        <div class="stat-card">
          <div class="stat-label">Aylık Ortalama</div>
          <div class="stat-value">₺${formatMoney(report.avgMonthly)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">En İyi Ay</div>
          <div class="stat-value success" style="font-size:1rem">
            ${report.bestMonthIndex >= 0 ? Calendar.MONTH_NAMES[report.bestMonthIndex] : '—'}
          </div>
          ${report.bestMonthIndex >= 0 ? `<div style="font-size:0.7rem;color:var(--text-muted)">₺${formatMoney(report.monthTotals[report.bestMonthIndex])}</div>` : ''}
        </div>
        <div class="stat-card">
          <div class="stat-label">Aktif Ay</div>
          <div class="stat-value">${report.activeMonths}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">📊 Yıllık Ciro (Aylık Dağılım)</div>
        <div class="chart-container">
          <canvas id="reportChart"></canvas>
        </div>
      </div>
    `;

    document.getElementById('reportPrev').addEventListener('click', () => {
      reportState.year--;
      renderYearlyReport(container);
    });
    document.getElementById('reportNext').addEventListener('click', () => {
      if (reportState.year < new Date().getFullYear()) {
        reportState.year++;
        renderYearlyReport(container);
      }
    });

    setTimeout(() => Charts.renderYearly('reportChart', year), 50);
  }

  function renderDayOfWeekReport(container) {
    const averages = DataManager.getDayOfWeekAverages();
    const reordered = [...averages.slice(1), averages[0]]; // Pazartesi'den başlat
    const labels = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
    const maxIdx = reordered.indexOf(Math.max(...reordered));
    const nonZero = reordered.filter(v => v > 0);
    const minIdx = nonZero.length > 0 ? reordered.indexOf(Math.min(...nonZero)) : -1;

    container.innerHTML = `
      <div class="report-summary-grid">
        <div class="stat-card">
          <div class="stat-label">En Yüksek Gün</div>
          <div class="stat-value success" style="font-size:1.1rem">${reordered[maxIdx] > 0 ? labels[maxIdx] : '—'}</div>
          ${reordered[maxIdx] > 0 ? `<div style="font-size:0.75rem;color:var(--text-muted)">Ort. ₺${formatMoney(reordered[maxIdx])}</div>` : ''}
        </div>
        <div class="stat-card">
          <div class="stat-label">En Düşük Gün</div>
          <div class="stat-value danger" style="font-size:1.1rem">${minIdx >= 0 ? labels[minIdx] : '—'}</div>
          ${minIdx >= 0 ? `<div style="font-size:0.75rem;color:var(--text-muted)">Ort. ₺${formatMoney(reordered[minIdx])}</div>` : ''}
        </div>
        <div class="stat-card">
          <div class="stat-label">Hafta İçi Ort.</div>
          <div class="stat-value" style="font-size:1.1rem">
            ${(() => {
              const weekdayVals = reordered.slice(0, 5).filter(v => v > 0);
              return weekdayVals.length > 0 ? '₺' + formatMoney(weekdayVals.reduce((a, b) => a + b, 0) / weekdayVals.length) : '—';
            })()}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Hafta Sonu Ort.</div>
          <div class="stat-value" style="font-size:1.1rem">
            ${(() => {
              const weekendVals = reordered.slice(5).filter(v => v > 0);
              return weekendVals.length > 0 ? '₺' + formatMoney(weekendVals.reduce((a, b) => a + b, 0) / weekendVals.length) : '—';
            })()}
          </div>
        </div>
      </div>
      
      <div class="charts-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; align-items: start;">
        <div class="card" style="margin-bottom: 0;">
          <div class="card-title">📊 Haftanın Günlerine Göre Ortalama Ciro</div>
          <div class="chart-container" style="height: 350px;">
            <canvas id="reportChart"></canvas>
          </div>
        </div>

        <div class="card" style="margin-bottom: 0;">
          <div class="card-title">📅 Günlük Ortalama Ciro Detayları</div>
          <div class="form-hint" style="margin-bottom: 16px;">Haftanın her gününe ait net ortalama ciro tutarları (En yüksekten en düşüğe sıralı):</div>
          
          <div style="display:flex; flex-direction:column; gap:12px;">
            ${(() => {
              // Günleri ortalamalarına göre sırala
              const dayData = labels.map((name, idx) => ({ name, val: reordered[idx] }));
              dayData.sort((a, b) => b.val - a.val);

              const maxAvg = Math.max(...reordered);

              return dayData.map(item => {
                const percent = maxAvg > 0 ? (item.val / maxAvg) * 100 : 0;
                return `
                  <div style="display:flex; flex-direction:column; gap:4px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem;">
                      <span style="font-weight:600; color:var(--text-primary);">${item.name}</span>
                      <strong style="color: ${item.val === maxAvg ? 'var(--color-success)' : 'var(--text-secondary)'}">
                        ${item.val > 0 ? '₺' + formatMoney(item.val) : '₺0'}
                      </strong>
                    </div>
                    <div class="progress-bar-container" style="height: 6px; background: rgba(255,255,255,0.05);">
                      <div class="progress-bar-fill" style="width: ${percent}%; background: ${item.val === maxAvg ? 'var(--color-success)' : 'var(--color-primary)'}"></div>
                    </div>
                  </div>
                `;
              }).join('');
            })()}
          </div>
        </div>
      </div>
    `;

    setTimeout(() => Charts.renderDayOfWeek('reportChart'), 50);
  }

  // ─── Modal ───
  // Formatlanmış string değerini sayıya çevir (Noktaları kaldırır, virgüle izin verir)
  function parseFormattedNumber(val) {
    if (!val) return 0;
    // Noktaları temizle, virgülü noktaya çevir
    const cleanStr = val.toString().replace(/\./g, '').replace(/,/g, '.');
    return parseFloat(cleanStr) || 0;
  }

  // Sayıyı binlik ayracı ile string'e formatla
  function formatInputNumber(val) {
    if (!val) return '';
    // Sadece sayısal karakterleri ve virgülü koru
    let clean = val.toString().replace(/[^0-9,]/g, '');
    
    // Birden fazla virgül girilmesini engelle
    const parts = clean.split(',');
    if (parts.length > 2) {
      clean = parts[0] + ',' + parts.slice(1).join('');
    }

    let integerPart = parts[0];
    const decimalPart = parts[1] !== undefined ? ',' + parts[1].substring(0, 2) : '';

    // Binlik ayraç ekle (nokta ile)
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    return integerPart + decimalPart;
  }

  function setupModal() {
    const overlay = document.getElementById('entryModal');
    const form = document.getElementById('entryForm');
    const totalInput = document.getElementById('entryTotal');
    const cardInput = document.getElementById('entryCard');
    const cashDisplay = document.getElementById('entryCashDisplay');

    // Kullanıcı yazarken anlık binlik ayracı formatlama
    function handleNumberInput(e) {
      const input = e.target;
      const originalValue = input.value;
      const formatted = formatInputNumber(originalValue);
      
      if (formatted !== originalValue) {
        // İmleç konumunu korumak için hesaplama
        const selectionStart = input.selectionStart;
        const diff = formatted.length - originalValue.length;
        input.value = formatted;
        input.setSelectionRange(selectionStart + diff, selectionStart + diff);
      }
      updateCashDisplay();
    }

    // Nakit otomatik hesapla (Toplam - Kredi Kartı)
    function updateCashDisplay() {
      const total = parseFormattedNumber(totalInput.value);
      const card = parseFormattedNumber(cardInput.value);
      const cash = Math.max(total - card, 0);
      cashDisplay.textContent = '₺' + formatMoney(cash);
      // Eğer kart toplamı aşarsa uyarı
      if (card > total && total > 0) {
        cashDisplay.style.color = 'var(--color-danger)';
        cashDisplay.textContent = '⚠️ Kart tutarı toplamı aşamaz';
      } else {
        cashDisplay.style.color = '';
      }
    }

    totalInput.addEventListener('input', handleNumberInput);
    cardInput.addEventListener('input', handleNumberInput);

    // Hava durumu otomatik çekilecek (manuel seçim kaldırıldı)

    // Kapatma
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Kaydetme
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      saveEntry();
    });

    // Silme
    document.getElementById('btnDeleteEntry').addEventListener('click', () => {
      const dateKey = document.getElementById('entryDate').value;
      if (dateKey && confirm('Bu günün kaydını silmek istediğinize emin misiniz?')) {
        DataManager.deleteEntry(dateKey);
        showToast('Kayıt silindi', 'warning');
        closeModal();
        refreshCurrentPage();
      }
    });
  }

  function openEntryModal(dateKey) {
    const overlay = document.getElementById('entryModal');
    const dateInput = document.getElementById('entryDate');
    const totalInput = document.getElementById('entryTotal');
    const cardInput = document.getElementById('entryCard');
    const cashDisplay = document.getElementById('entryCashDisplay');
    const notesInput = document.getElementById('entryNotes');
    const deleteBtn = document.getElementById('btnDeleteEntry');
    const modalTitle = document.getElementById('modalTitle');

    // Tarihi set et
    dateInput.value = dateKey || DataManager.formatDateKey(new Date());

    // Mevcut kayıt var mı kontrol et
    const entry = DataManager.getEntry(dateInput.value);

    // Hava durumu bilgisi gösterim alanını güncelle
    const weatherDisplay = document.getElementById('weatherAutoDisplay');

    if (entry) {
      totalInput.value = entry.revenue ? formatInputNumber(entry.revenue) : '';
      cardInput.value = entry.cardAmount ? formatInputNumber(entry.cardAmount) : '';
      const cash = Math.max((entry.revenue || 0) - (entry.cardAmount || 0), 0);
      cashDisplay.textContent = '₺' + formatMoney(cash);
      cashDisplay.style.color = '';
      notesInput.value = entry.notes || '';
      deleteBtn.style.display = 'block';
      modalTitle.textContent = 'Ciro Düzenle';

      // Kayıtlı hava durumunu göster
      if (entry.weatherIcon) {
        weatherDisplay.innerHTML = `<span class="auto-weather-info">${entry.weatherIcon} ${entry.weather || ''}</span>`;
      } else {
        weatherDisplay.innerHTML = `<span class="auto-weather-info">🌐 Hava durumu kaydedilmemiş</span>`;
      }
    } else {
      totalInput.value = '';
      cardInput.value = '';
      cashDisplay.textContent = '₺0';
      cashDisplay.style.color = '';
      notesInput.value = '';
      deleteBtn.style.display = 'none';
      modalTitle.textContent = 'Yeni Ciro Girişi';

      // Yeni giriş: hava durumunu otomatik çek ve göster
      weatherDisplay.innerHTML = `<span class="auto-weather-info">⏳ Hava durumu alınıyor...</span>`;
      fetchWeatherForDate(dateInput.value).then(w => {
        if (w) {
          weatherDisplay.innerHTML = `<span class="auto-weather-info">${w.icon} ${w.desc} · ${w.temp}°C</span>`;
        } else {
          weatherDisplay.innerHTML = `<span class="auto-weather-info">🌐 Hava durumu alınamadı</span>`;
        }
      });
    }

    // Tatil / tarih bilgisi
    const date = new Date(dateInput.value + 'T00:00:00');
    const holiday = Holidays.getHoliday(date);
    const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    let dateInfo = dayNames[date.getDay()];
    if (holiday) dateInfo += ` · ${holiday}`;
    if (Holidays.isWeekend(date)) dateInfo += ' (Hafta Sonu)';

    // Tarih altına ek bilgi gösterelim
    const existingHint = dateInput.parentElement.querySelector('.form-hint');
    if (existingHint) existingHint.remove();
    const hint = document.createElement('div');
    hint.className = 'form-hint';
    hint.textContent = dateInfo;
    dateInput.parentElement.appendChild(hint);

    overlay.classList.add('active');

    // Modal açıldığında Toplam Ciro alanına otomatik odaklan
    setTimeout(() => {
      totalInput.focus();
      // Varsa mevcut metni seçili yap (kolayca silip yazmak için)
      totalInput.select();
    }, 150);
  }

  function closeModal() {
    document.getElementById('entryModal').classList.remove('active');
  }

  function saveEntry() {
    const dateKey = document.getElementById('entryDate').value;
    const total = parseFormattedNumber(document.getElementById('entryTotal').value);
    const card = parseFormattedNumber(document.getElementById('entryCard').value);
    const cash = Math.max(total - card, 0);
    const notes = document.getElementById('entryNotes').value.trim();

    // Kart tutarı kontrolü
    if (card > total) {
      showToast('⚠️ Kredi kartı tutarı toplam ciroyu aşamaz', 'warning');
      return;
    }

    // Mevcut kaydın hava durumunu koru
    const existingEntry = DataManager.getEntry(dateKey);
    const existingWeatherIcon = existingEntry ? existingEntry.weatherIcon : '';
    const existingWeatherLabel = existingEntry ? existingEntry.weather : '';
    const existingWeatherTemp = existingEntry ? existingEntry.weatherTemp : null;

    const entry = {
      revenue: total,
      cashAmount: cash,
      cardAmount: card,
      notes,
      weather: existingWeatherLabel,
      weatherIcon: existingWeatherIcon,
      weatherTemp: existingWeatherTemp
    };

    // Önce kaydet (hava durumu henüz olmayabilir)
    DataManager.saveEntry(dateKey, entry);

    // Hava durumu yoksa otomatik çek ve güncelle
    if (!existingWeatherIcon) {
      fetchWeatherForDate(dateKey).then(w => {
        if (w) {
          const updated = DataManager.getEntry(dateKey);
          if (updated) {
            updated.weatherIcon = w.icon;
            updated.weather = w.desc;
            updated.weatherTemp = w.temp;
            DataManager.saveEntry(dateKey, updated);
            // Eğer hala aynı sayfadaysak güncelle
            if (currentPage === 'calendar') {
              Calendar.render(document.getElementById('calendarContainer'));
            } else if (currentPage === 'dashboard') {
              renderDashboard();
            }
          }
        }
      });
    }

    // Hedef aşıldı mı kontrol et
    const targets = DataManager.getTargets();
    if (targets.daily > 0 && entry.revenue >= targets.daily) {
      showToast(`🎯 Günlük hedef aşıldı! ₺${formatMoney(entry.revenue)}`, 'success');
    } else {
      showToast('Ciro kaydedildi ✓', 'success');
    }

    closeModal();
    refreshCurrentPage();
  }

  // ─── Quick Actions ───
  function setupQuickActions() {
    document.getElementById('btnNewEntry').addEventListener('click', () => {
      openEntryModal(DataManager.formatDateKey(new Date()));
    });

    document.getElementById('btnCalNewEntry').addEventListener('click', () => {
      openEntryModal(DataManager.formatDateKey(new Date()));
    });
  }

  // ─── Targets Page ───
  function setupTargets() {
    const targets = DataManager.getTargets();
    document.getElementById('targetDaily').value = targets.daily || '';
    document.getElementById('targetWeekly').value = targets.weekly || '';
    document.getElementById('targetMonthly').value = targets.monthly || '';

    // Genel hedefleri kaydet
    document.getElementById('btnSaveTargets').addEventListener('click', () => {
      const newTargets = {
        ...DataManager.getTargets(),
        daily: parseFloat(document.getElementById('targetDaily').value) || 0,
        weekly: parseFloat(document.getElementById('targetWeekly').value) || 0,
        monthly: parseFloat(document.getElementById('targetMonthly').value) || 0
      };
      DataManager.saveTargets(newTargets);
      showToast('Genel hedefler kaydedildi ✓', 'success');
      renderTargetsPage();
    });

    // Aylık özel hedefleri kaydet
    document.getElementById('btnSaveMonthlyByMonthTargets').addEventListener('click', () => {
      const targets = DataManager.getTargets();
      const currentYear = new Date().getFullYear();
      const monthlyByMonth = { ...targets.monthlyByMonth };

      const grid = document.getElementById('monthlyTargetsInputsGrid');
      grid.querySelectorAll('input.month-target-input').forEach(input => {
        const monthIndex = input.dataset.month;
        const key = `${currentYear}-${monthIndex.padStart(2, '0')}`;
        const value = parseFormattedNumber(input.value);

        if (value > 0) {
          monthlyByMonth[key] = value;
        } else {
          delete monthlyByMonth[key];
        }
      });

      targets.monthlyByMonth = monthlyByMonth;
      DataManager.saveTargets(targets);
      showToast('Aylık özel hedefler başarıyla kaydedildi ✓', 'success');
      renderTargetsPage();
    });
  }

  function renderTargetsPage() {
    const targets = DataManager.getTargets();
    document.getElementById('targetDaily').value = targets.daily || '';
    document.getElementById('targetWeekly').value = targets.weekly || '';
    document.getElementById('targetMonthly').value = targets.monthly || '';

    // 1. Genel hedef ilerlemesi
    const container = document.getElementById('targetProgress');
    const report = Reports.getTargetReport();

    let html = '';

    const items = [
      { label: 'Günlük', data: report.daily },
      { label: 'Haftalık', data: report.weekly },
      { label: 'Aylık', data: report.monthly }
    ];

    items.forEach(item => {
      if (item.data.target === 0) return;
      const exceeded = item.data.percent >= 100;
      html += `
        <div class="target-row">
          <span class="target-label">${item.label}</span>
          <div class="progress-bar-container">
            <div class="progress-bar-fill ${exceeded ? 'exceeded' : ''}" style="width: ${Math.min(item.data.percent, 100)}%"></div>
          </div>
          <span class="target-percent" style="color:${exceeded ? 'var(--color-success)' : 'var(--text-primary)'}">
            %${item.data.percent.toFixed(0)}
          </span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-muted);padding: 0 0 12px 96px;">
          <span>Gerçekleşen: ₺${formatMoney(item.data.actual)}</span>
          <span>Hedef: ₺${formatMoney(item.data.target)}</span>
        </div>
      `;
    });

    if (!html) {
      html = '<div class="no-data"><div class="no-data-icon">🎯</div><div>Henüz hedef belirlenmemiş.</div></div>';
    }

    container.innerHTML = html;

    // 2. Aylık Özel Hedefleri render et
    const currentYear = new Date().getFullYear();
    const grid = document.getElementById('monthlyTargetsInputsGrid');
    let gridHTML = '';

    for (let m = 0; m < 12; m++) {
      const monthKey = `${currentYear}-${String(m).padStart(2, '0')}`;
      const mTargetVal = (targets.monthlyByMonth && targets.monthlyByMonth[monthKey])
        ? formatInputNumber(targets.monthlyByMonth[monthKey])
        : '';

      gridHTML += `
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label" style="font-size: 0.8rem; margin-bottom: 4px;">${Calendar.MONTH_NAMES[m]}</label>
          <input type="text" class="form-input month-target-input" data-month="${m}" placeholder="Genel hedefi kullan" value="${mTargetVal}" style="padding: 6px 10px; font-size: 0.85rem;">
        </div>
      `;
    }
    grid.innerHTML = gridHTML;

    // Hedef girişleri için binlik ayracı maskelemesi
    grid.querySelectorAll('input.month-target-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const inp = e.target;
        const orig = inp.value;
        const formatted = formatInputNumber(orig);

        if (formatted !== orig) {
          const start = inp.selectionStart;
          const diff = formatted.length - orig.length;
          inp.value = formatted;
          inp.setSelectionRange(start + diff, start + diff);
        }
      });
    });
  }

  // ─── Settings ───
  function setupSettings() {
    const settings = DataManager.getSettings();
    document.getElementById('settingStoreName').value = settings.storeName;
    document.getElementById('settingLocation').value = settings.location;

    document.getElementById('btnSaveSettings').addEventListener('click', () => {
      const newSettings = {
        storeName: document.getElementById('settingStoreName').value.trim(),
        location: document.getElementById('settingLocation').value.trim()
      };
      DataManager.saveSettings(newSettings);

      // Marka adını güncelle
      document.querySelector('.brand-name').textContent = newSettings.storeName;

      showToast('Ayarlar kaydedildi ✓', 'success');
      fetchWeather(); // Konum değişmiş olabilir
    });

    // ─── Firebase Eşitleme UI ───
    setupFirebaseSettings();

    // ─── GEÇİCİ TABLO YÖNETİMİ (1 Ocak - 27 Nisan) ───
    const tempContainer = document.getElementById('tempBatchContainer');
    const tableBody = document.getElementById('tempBatchTableBody');
    const saveBtn = document.getElementById('btnSaveBatchData');
    const clearBtn = document.getElementById('btnClearBatchInputs');
    const removeBtn = document.getElementById('btnRemoveTempTable');

    // Tarih aralığını oluştur (27 Nisan'dan geriye doğru 1 Ocak'a kadar)
    const startDate = new Date('2026-01-01T00:00:00');
    const endDate = new Date('2026-04-27T00:00:00');
    const dateArray = [];
    
    let tempDate = new Date(endDate);
    while (tempDate >= startDate) {
      dateArray.push(DataManager.formatDateKey(tempDate));
      tempDate.setDate(tempDate.getDate() - 1);
    }

    // LocalStorage'daki geçici veriyi çek
    const getStoredTempData = () => JSON.parse(localStorage.getItem('temp_batch_data') || '{}');
    const saveStoredTempData = (data) => localStorage.setItem('temp_batch_data', JSON.stringify(data));

    // Tabloyu DOM'da oluştur
    function renderTempTable() {
      const stored = getStoredTempData();
      let rowsHTML = '';
      
      dateArray.forEach(dateKey => {
        const rowVal = stored[dateKey] || { total: '', card: '' };
        const parsedTotal = parseFormattedNumber(rowVal.total);
        const parsedCard = parseFormattedNumber(rowVal.card);
        const cash = Math.max(parsedTotal - parsedCard, 0);

        const dateObj = new Date(dateKey + 'T00:00:00');
        const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
        const formattedDate = `${dateKey.split('-')[2]}.${dateKey.split('-')[1]}.${dateKey.split('-')[0]} (${dayNames[dateObj.getDay()]})`;

        rowsHTML += `
          <tr style="border-bottom: 1px solid rgba(148, 163, 184, 0.08);" data-date="${dateKey}">
            <td style="padding: 8px 10px; font-weight: 600;">${formattedDate}</td>
            <td style="padding: 6px 10px;">
              <input type="text" class="form-input temp-total" style="padding: 4px 8px; font-size: 0.8rem; margin:0;" placeholder="0" value="${rowVal.total}" data-date="${dateKey}">
            </td>
            <td style="padding: 6px 10px;">
              <input type="text" class="form-input temp-card" style="padding: 4px 8px; font-size: 0.8rem; margin:0;" placeholder="0" value="${rowVal.card}" data-date="${dateKey}">
            </td>
            <td style="padding: 8px 10px; font-weight: 700; color: var(--color-success);" class="temp-cash-display">
              ${cash > 0 ? '₺' + formatMoney(cash) : '₺0'}
            </td>
          </tr>
        `;
      });
      tableBody.innerHTML = rowsHTML;

      // Input event listener'ları ekle
      tableBody.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', (e) => {
          const inp = e.target;
          const dateKey = inp.dataset.date;
          const orig = inp.value;
          const formatted = formatInputNumber(orig);

          if (formatted !== orig) {
            const start = inp.selectionStart;
            const diff = formatted.length - orig.length;
            inp.value = formatted;
            inp.setSelectionRange(start + diff, start + diff);
          }

          // LocalStorage'a kaydet
          const stored = getStoredTempData();
          if (!stored[dateKey]) stored[dateKey] = { total: '', card: '' };

          if (inp.classList.contains('temp-total')) {
            stored[dateKey].total = inp.value;
          } else {
            stored[dateKey].card = inp.value;
          }
          saveStoredTempData(stored);

          // Nakit alanını anlık güncelle
          const row = inp.closest('tr');
          const totalVal = parseFormattedNumber(stored[dateKey].total);
          const cardVal = parseFormattedNumber(stored[dateKey].card);
          const cashVal = Math.max(totalVal - cardVal, 0);
          row.querySelector('.temp-cash-display').textContent = cashVal > 0 ? '₺' + formatMoney(cashVal) : '₺0';
        });
      });
    }

    // Yükle
    saveBtn.addEventListener('click', async () => {
      const stored = getStoredTempData();
      const keys = Object.keys(stored);
      let count = 0;

      saveBtn.disabled = true;
      saveBtn.textContent = '⏳ Yükleniyor, lütfen bekleyin...';

      for (let dateKey of keys) {
        const data = stored[dateKey];
        const total = parseFormattedNumber(data.total);
        const card = parseFormattedNumber(data.card);
        const cash = Math.max(total - card, 0);

        if (total > 0) {
          let weatherIcon = '';
          let weatherDesc = '';
          let weatherTemp = null;
          const w = await fetchWeatherForDate(dateKey);
          if (w) {
            weatherIcon = w.icon;
            weatherDesc = w.desc;
            weatherTemp = w.temp;
          }

          const entry = {
            revenue: total,
            cashAmount: cash,
            cardAmount: card,
            notes: '',
            weather: weatherDesc,
            weatherIcon: weatherIcon,
            weatherTemp: weatherTemp
          };

          DataManager.saveEntry(dateKey, entry);
          count++;
        }
      }

      showToast(`${count} günlük ciro sisteme başarıyla yüklendi! ✓`, 'success');
      localStorage.removeItem('temp_batch_data');
      renderTempTable(); // Tabloyu temizle

      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Verileri Sisteme Yükle (Kaydet)';
      refreshCurrentPage();
      renderSettings();
    });

    // Temizle
    clearBtn.addEventListener('click', () => {
      if (confirm('Tablodaki tüm yazılı verileri temizlemek istediğinize emin misiniz?')) {
        localStorage.removeItem('temp_batch_data');
        renderTempTable();
        showToast('Tablo temizlendi', 'info');
      }
    });

    // Tabloyu Gizle / Kaldır
    removeBtn.addEventListener('click', () => {
      if (confirm('Tabloyu kaldırmak istediğinize emin misiniz? Doldurduğunuz yüklenmemiş veriler silinecektir.')) {
        localStorage.removeItem('temp_batch_data');
        tempContainer.remove();
        showToast('Geçici tablo kaldırıldı', 'info');
      }
    });

    // İlk yüklemede render et
    if (tempContainer) {
      renderTempTable();
    }

    renderSettings();
  }

  function renderSettings() {
    // Toplam kayıt sayısı
    const allData = JSON.parse(localStorage.getItem('dunyaspot_revenues') || '{}');
    document.getElementById('totalRecords').textContent = Object.keys(allData).length;
  }

  // Geçmiş tüm ciro kayıtlarındaki eksik sıcaklık derecelerini otomatik güncelle
  async function syncMissingWeather() {
    const allData = JSON.parse(localStorage.getItem('dunyaspot_revenues') || '{}');
    const dates = Object.keys(allData);
    
    // Sıcaklık derecesi sayısal olarak bulunmayan tüm günleri filtrele
    const missingDates = dates.filter(dateKey => {
      const entry = allData[dateKey];
      return entry.revenue > 0 && (entry.weatherTemp === undefined || entry.weatherTemp === null || typeof entry.weatherTemp !== 'number');
    });

    if (missingDates.length === 0) return;

    console.log(`Hava durumu eksik ${missingDates.length} gün tespit edildi. Senkronizasyon başlıyor...`);
    showToast(`⏳ Eksik ${missingDates.length} günün hava durumu güncelleniyor...`, 'info');

    let count = 0;
    for (let dateKey of missingDates) {
      // API limitlerine takılmamak için küçük gecikme (150ms)
      await new Promise(resolve => setTimeout(resolve, 150));
      
      try {
        const w = await fetchWeatherForDate(dateKey);
        if (w) {
          const entry = allData[dateKey];
          entry.weatherIcon = w.icon;
          entry.weather = w.desc;
          entry.weatherTemp = w.temp;
          
          DataManager.saveEntry(dateKey, entry);
          count++;
        }
      } catch (err) {
        console.warn(`${dateKey} için hava durumu güncellenemedi:`, err);
      }
    }

    if (count > 0) {
      showToast(`✅ ${count} günün hava durumu başarıyla senkronize edildi!`, 'success');
      refreshCurrentPage();
    }
  }

  // ─── Export ───
  function setupExport() {
    document.getElementById('btnExportCSV').addEventListener('click', () => {
      DataManager.downloadCSV();
      showToast('CSV dosyası indirildi ✓', 'success');
    });

    document.getElementById('btnBackupJSON').addEventListener('click', () => {
      DataManager.downloadJSON();
      showToast('JSON yedeği indirildi ✓', 'success');
    });

    document.getElementById('btnExportCSVSettings').addEventListener('click', () => {
      DataManager.downloadCSV();
      showToast('CSV dosyası indirildi ✓', 'success');
    });

    document.getElementById('btnRestoreJSON').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = DataManager.importJSON(ev.target.result);
        if (result.success) {
          showToast(`${result.count} kayıt geri yüklendi ✓`, 'success');
          refreshCurrentPage();
          renderSettings();
        } else {
          showToast('Geri yükleme hatası: ' + result.error, 'error');
        }
      };
      reader.readAsText(file);
    });
  }

  // ─── Weather ───
  // Sol alttaki hava durumu widget'ının asıl içeriğini saklayan değişkenler
  let defaultWeatherHTML = '';

  function fetchWeather() {
    const settings = DataManager.getSettings();
    const location = settings.location || 'Keşan, Edirne';

    // Open-Meteo API (API key gerektirmez!)
    // Keşan koordinatları: 40.86, 26.64
    const locationCoords = { lat: 40.86, lon: 26.64 };

    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${locationCoords.latitude || 40.86}&longitude=${locationCoords.longitude || 26.64}&current=temperature_2m,weather_code&timezone=Europe/Istanbul`)
      .then(res => res.json())
      .then(data => {
        if (data.current) {
          const temp = Math.round(data.current.temperature_2m);
          const code = data.current.weather_code;
          const { icon, desc, main } = getWeatherFromCode(code);

          currentWeather = { main, temp, desc };

          const widget = document.getElementById('weatherWidget');
          defaultWeatherHTML = `
            <div class="weather-location">${location}</div>
            <div class="weather-main">
              <span class="weather-icon">${icon}</span>
              <span class="weather-temp">${temp}°C</span>
            </div>
            <div class="weather-desc">${desc}</div>
          `;
          widget.innerHTML = defaultWeatherHTML;
        }
      })
      .catch(() => {
        // Hava durumu alınamazsa sessizce geç
        const widget = document.getElementById('weatherWidget');
        defaultWeatherHTML = `
          <div class="weather-location">${location}</div>
          <div class="weather-main">
            <span class="weather-icon">🌐</span>
            <span class="weather-temp">--°C</span>
          </div>
          <div class="weather-desc">Bağlantı kurulamadı</div>
        `;
        widget.innerHTML = defaultWeatherHTML;
      });
  }

  // Geçici hava durumu yansıt (hover olunca)
  function setTemporaryWeather(dateKey) {
    const widget = document.getElementById('weatherWidget');
    if (!widget) return;

    const entry = DataManager.getEntry(dateKey);
    const settings = DataManager.getSettings();
    const location = settings.location || 'Keşan, Edirne';

    const parts = dateKey.split('-');
    const formattedDate = `${parts[2]}.${parts[1]}.${parts[0]}`;

    if (entry && entry.weatherIcon) {
      const tempDisplay = typeof entry.weatherTemp === 'number'
        ? `${entry.weatherTemp}°C` 
        : '--°C';

      widget.innerHTML = `
        <div class="weather-location" style="color: var(--color-success); font-weight:700;">⛅ ${formattedDate}</div>
        <div class="weather-main">
          <span class="weather-icon">${entry.weatherIcon}</span>
          <span class="weather-temp">${tempDisplay}</span>
        </div>
        <div class="weather-desc" style="font-size:0.75rem;">${entry.weather || 'Kayıtlı'}</div>
      `;
    } else {
      widget.innerHTML = `
        <div class="weather-location" style="color: var(--text-muted);">${formattedDate}</div>
        <div class="weather-main">
          <span class="weather-icon">🌐</span>
          <span class="weather-temp" style="font-size: 0.95rem;">Kayıt Yok / --</span>
        </div>
        <div class="weather-desc" style="font-size:0.75rem;">Hava Durumu Bilgisi Yok</div>
      `;
    }
  }

  // Varsayılan bugünün hava durumuna geri dön (hover bitince)
  function restoreWeather() {
    const widget = document.getElementById('weatherWidget');
    if (widget && defaultWeatherHTML) {
      widget.innerHTML = defaultWeatherHTML;
    }
  }

  function getWeatherFromCode(code) {
    // WMO weather codes
    if (code === 0) return { icon: '☀️', desc: 'Açık / Güneşli', main: 'Clear' };
    if (code <= 3) return { icon: '⛅', desc: 'Parçalı Bulutlu', main: 'Clouds' };
    if (code <= 48) return { icon: '🌫️', desc: 'Sisli / Puslu', main: 'Fog' };
    if (code <= 57) return { icon: '🌧️', desc: 'Çiseleyen Yağmur', main: 'Drizzle' };
    if (code <= 67) return { icon: '🌧️', desc: 'Yağmurlu', main: 'Rain' };
    if (code <= 77) return { icon: '❄️', desc: 'Karlı', main: 'Snow' };
    if (code <= 82) return { icon: '🌧️', desc: 'Sağanak Yağış', main: 'Rain' };
    if (code <= 86) return { icon: '❄️', desc: 'Yoğun Kar', main: 'Snow' };
    if (code <= 99) return { icon: '🌪️', desc: 'Fırtınalı', main: 'Thunderstorm' };
    return { icon: '🌤️', desc: 'Belirsiz', main: 'Clouds' };
  }

  /**
   * Belirli bir tarihin hava durumunu Open-Meteo API'den çek
   * Bugün için current API, geçmiş tarihler için archive API kullanılır
   * @param {string} dateKey 'YYYY-MM-DD'
   * @returns {Promise<{icon, desc, temp}|null>}
   */
  async function fetchWeatherForDate(dateKey) {
    const LAT = 40.86;
    const LON = 26.64;

    try {
      const today = DataManager.formatDateKey(new Date());

      if (dateKey === today) {
        // Bugün: current API
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code&timezone=Europe/Istanbul`);
        const data = await res.json();
        if (data.current) {
          const w = getWeatherFromCode(data.current.weather_code);
          return { icon: w.icon, desc: w.desc, temp: Math.round(data.current.temperature_2m) };
        }
      } else {
        // Geçmiş veya gelecek: daily API (forecast 16 gün, archive geçmiş)
        const targetDate = new Date(dateKey + 'T00:00:00');
        const nowDate = new Date();
        const diffDays = Math.round((nowDate - targetDate) / (1000 * 60 * 60 * 24));

        let url;
        if (diffDays > 0) {
          // Geçmiş tarih: archive API
          url = `https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}&start_date=${dateKey}&end_date=${dateKey}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe/Istanbul`;
        } else {
          // Gelecek tarih: forecast API
          url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&start_date=${dateKey}&end_date=${dateKey}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe/Istanbul`;
        }

        const res = await fetch(url);
        const data = await res.json();
        if (data.daily && data.daily.weather_code && data.daily.weather_code.length > 0) {
          const code = data.daily.weather_code[0];
          const maxTemp = data.daily.temperature_2m_max ? Math.round(data.daily.temperature_2m_max[0]) : null;
          const minTemp = data.daily.temperature_2m_min ? Math.round(data.daily.temperature_2m_min[0]) : null;
          const avgTemp = maxTemp !== null && minTemp !== null ? Math.round((maxTemp + minTemp) / 2) : null;
          const w = getWeatherFromCode(code);
          return { icon: w.icon, desc: w.desc, temp: avgTemp };
        }
      }
    } catch (e) {
      // Hata durumunda null döndür
      console.warn('Hava durumu alınamadı:', e);
    }
    return null;
  }

  // ─── Helpers ───
  function formatMoney(amount) {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  }

  function formatDisplayDate(dateKey) {
    const parts = dateKey.split('-');
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }

  function refreshCurrentPage() {
    navigateTo(currentPage);
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ─── Firebase Entegrasyonu Yardımcıları ───
  function initFirebaseAtLaunch() {
    const config = DataManager.getFirebaseConfig();
    if (config) {
      const initialized = DataManager.initFirebase(config);
      if (initialized) {
        console.log("Firebase initialized successfully at launch");
        // Buluttan en güncel verileri çek ve ekranı yenile
        DataManager.fetchCloudData()
          .then(() => {
            console.log("Cloud sync completed at launch");
            refreshCurrentPage();
          })
          .catch(err => console.error("Cloud sync error at launch:", err));
      }
    }
  }

  function setupFirebaseSettings() {
    const apiKeyInput = document.getElementById('fbApiKey');
    const projectIdInput = document.getElementById('fbProjectId');
    const appIdInput = document.getElementById('fbAppId');
    const saveBtn = document.getElementById('btnSaveFirebase');
    const disconnectBtn = document.getElementById('btnDisconnectFirebase');
    const statusMsg = document.getElementById('fbStatusMessage');

    const config = DataManager.getFirebaseConfig();
    if (config) {
      apiKeyInput.value = config.apiKey || '';
      projectIdInput.value = config.projectId || '';
      appIdInput.value = config.appId || '';
      
      if (DataManager.isFirebaseConnected()) {
        statusMsg.textContent = '☁️ Bulut Eşitleme Aktif';
        statusMsg.style.color = 'var(--color-success)';
        disconnectBtn.style.display = 'block';
        saveBtn.textContent = '💾 Bilgileri Güncelle';
      } else {
        statusMsg.textContent = '⚠️ Bağlantı Kurulamadı';
        statusMsg.style.color = 'var(--color-danger)';
        disconnectBtn.style.display = 'block';
      }
    }

    saveBtn.addEventListener('click', async () => {
      const apiKey = apiKeyInput.value.trim();
      const projectId = projectIdInput.value.trim();
      const appId = appIdInput.value.trim();

      if (!apiKey || !projectId || !appId) {
        showToast('Lütfen tüm alanları doldurun', 'warning');
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = '⏳ Bağlanıyor...';
      statusMsg.textContent = 'Bağlantı kuruluyor ve veriler eşitleniyor...';
      statusMsg.style.color = 'var(--text-muted)';

      try {
        await DataManager.testAndSyncFirebase({ apiKey, projectId, appId });
        showToast('Firebase başarıyla bağlandı ve veriler eşitlendi! ✓', 'success');
        statusMsg.textContent = '☁️ Bulut Eşitleme Aktif';
        statusMsg.style.color = 'var(--color-success)';
        disconnectBtn.style.display = 'block';
        saveBtn.textContent = '💾 Bilgileri Güncelle';
        refreshCurrentPage();
      } catch (err) {
        showToast('Bağlantı başarısız: ' + err.message, 'error');
        statusMsg.textContent = '❌ Bağlantı Başarısız: ' + err.message;
        statusMsg.style.color = 'var(--color-danger)';
      } finally {
        saveBtn.disabled = false;
        if (!DataManager.isFirebaseConnected()) {
          saveBtn.textContent = '💾 Bağlan & Eşitle';
        }
      }
    });

    disconnectBtn.addEventListener('click', () => {
      if (confirm('Firebase bağlantısını kesmek istediğinize emin misiniz? (Yerel verileriniz silinmez)')) {
        DataManager.deleteFirebaseConfig();
        apiKeyInput.value = '';
        projectIdInput.value = '';
        appIdInput.value = '';
        disconnectBtn.style.display = 'none';
        saveBtn.textContent = '💾 Bağlan & Eşitle';
        statusMsg.textContent = 'Bağlantı kesildi';
        statusMsg.style.color = '';
        showToast('Firebase bağlantısı kesildi', 'info');
        refreshCurrentPage();
      }
    });
  }

  // ─── Public API ───
  return {
    init,
    openEntryModal,
    navigateTo,
    showToast,
    setTemporaryWeather,
    restoreWeather
  };
})();

// Uygulama başlat
document.addEventListener('DOMContentLoaded', App.init);
