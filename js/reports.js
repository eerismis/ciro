// Dünya Spot - Rapor Hesaplamaları

const Reports = (() => {

  /**
   * Haftalık rapor hesapla
   * @param {number} weekOffset 0=bu hafta, 1=geçen hafta, ...
   */
  function getWeeklyReport(weekOffset = 0) {
    const today = new Date();
    const startOfWeek = new Date(today);
    
    // JS'de Pazar=0, Pazartesi=1, ...
    // Pazartesi başlangıcı için kaydırma hesabı:
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1) - (weekOffset * 7);
    
    startOfWeek.setDate(diff);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startKey = DataManager.formatDateKey(startOfWeek);
    const endKey = DataManager.formatDateKey(endOfWeek);
    const entries = DataManager.getEntriesInRange(startKey, endKey);

    const totalRevenue = entries.reduce((s, e) => s + e.revenue, 0);
    const totalCash = entries.reduce((s, e) => s + (e.cashAmount || 0), 0);
    const totalCard = entries.reduce((s, e) => s + (e.cardAmount || 0), 0);
    const avgRevenue = entries.length > 0 ? totalRevenue / entries.length : 0;

    let bestDay = null, worstDay = null;
    if (entries.length > 0) {
      bestDay = entries.reduce((a, b) => a.revenue > b.revenue ? a : b);
      worstDay = entries.reduce((a, b) => a.revenue < b.revenue ? a : b);
    }

    // Geçen haftayla LFL karşılaştırma
    let prevTotalRevenue = 0;
    const prevStartOfWeek = new Date(startOfWeek);
    prevStartOfWeek.setDate(startOfWeek.getDate() - 7);
    
    let prevEndOfWeek = new Date(prevStartOfWeek);
    
    const isCurrentWeek = (weekOffset === 0);
    if (isCurrentWeek) {
      // Bugün haftanın kaçıncı günü (Pazartesi=1, Salı=2... Pazar=7)
      let currentDayIndex = today.getDay();
      if (currentDayIndex === 0) currentDayIndex = 7; // Pazar gününü 7 yap
      
      // Geçen haftanın sadece Pazartesi'den bugünkü gün indeksine kadar olan günlerini al
      prevEndOfWeek.setDate(prevStartOfWeek.getDate() + (currentDayIndex - 1));
    } else {
      prevEndOfWeek.setDate(prevStartOfWeek.getDate() + 6);
    }

    const prevStartKey = DataManager.formatDateKey(prevStartOfWeek);
    const prevEndKey = DataManager.formatDateKey(prevEndOfWeek);
    const prevEntries = DataManager.getEntriesInRange(prevStartKey, prevEndKey);
    prevTotalRevenue = prevEntries.reduce((s, e) => s + e.revenue, 0);

    const changePercent = prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 : 0;

    return {
      startDate: startKey,
      endDate: endKey,
      entries,
      totalRevenue,
      totalCash,
      totalCard,
      avgRevenue,
      bestDay,
      worstDay,
      entryCount: entries.length,
      prevTotalRevenue,
      changePercent
    };
  }

  /**
   * Aylık rapor hesapla
   * @param {number} year
   * @param {number} month (0-indexed)
   */
  function getMonthlyReport(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startKey = DataManager.formatDateKey(firstDay);
    const endKey = DataManager.formatDateKey(lastDay);
    const entries = DataManager.getEntriesInRange(startKey, endKey);

    const totalRevenue = entries.reduce((s, e) => s + e.revenue, 0);
    const totalCash = entries.reduce((s, e) => s + (e.cashAmount || 0), 0);
    const totalCard = entries.reduce((s, e) => s + (e.cardAmount || 0), 0);
    const avgRevenue = entries.length > 0 ? totalRevenue / entries.length : 0;

    let bestDay = null, worstDay = null;
    if (entries.length > 0) {
      bestDay = entries.reduce((a, b) => a.revenue > b.revenue ? a : b);
      worstDay = entries.reduce((a, b) => a.revenue < b.revenue ? a : b);
    }

    // Geçen ayın aynı dönemiyle karşılaştırma
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const prevFirstDay = new Date(prevYear, prevMonth, 1);
    
    // Cari ay inceleniyorsa LFL (Geçen ayın aynı gününe kadar) hesapla
    const today = new Date();
    const isCurrentMonth = (today.getFullYear() === year && today.getMonth() === month);
    
    let prevLastDay;
    if (isCurrentMonth) {
      // Geçen ayın gün sayısını aşmamak için Math.min kullan
      const maxDaysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
      const targetDay = Math.min(today.getDate(), maxDaysInPrevMonth);
      prevLastDay = new Date(prevYear, prevMonth, targetDay);
    } else {
      prevLastDay = new Date(prevYear, prevMonth + 1, 0);
    }

    const prevEntries = DataManager.getEntriesInRange(
      DataManager.formatDateKey(prevFirstDay),
      DataManager.formatDateKey(prevLastDay)
    );
    const prevTotalRevenue = prevEntries.reduce((s, e) => s + e.revenue, 0);
    const changePercent = prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 : 0;

    return {
      year,
      month,
      entries,
      totalRevenue,
      totalCash,
      totalCard,
      avgRevenue,
      bestDay,
      worstDay,
      entryCount: entries.length,
      prevTotalRevenue,
      changePercent,
      daysInMonth: lastDay.getDate()
    };
  }

  /**
   * Yıllık rapor hesapla
   * @param {number} year
   */
  function getYearlyReport(year) {
    const monthTotals = DataManager.getYearlyMonthTotals(year);
    const totalRevenue = monthTotals.reduce((s, v) => s + v, 0);
    const activeMonths = monthTotals.filter(v => v > 0).length;
    const avgMonthly = activeMonths > 0 ? totalRevenue / activeMonths : 0;

    const bestMonthIndex = monthTotals.indexOf(Math.max(...monthTotals));
    const nonZeroMonths = monthTotals.map((v, i) => ({ value: v, index: i })).filter(m => m.value > 0);
    const worstMonthIndex = nonZeroMonths.length > 0
      ? nonZeroMonths.reduce((a, b) => a.value < b.value ? a : b).index
      : -1;

    // Geçen yıl karşılaştırma
    const prevMonthTotals = DataManager.getYearlyMonthTotals(year - 1);
    const prevTotalRevenue = prevMonthTotals.reduce((s, v) => s + v, 0);
    const changePercent = prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 : 0;

    return {
      year,
      monthTotals,
      totalRevenue,
      avgMonthly,
      activeMonths,
      bestMonthIndex,
      worstMonthIndex,
      prevTotalRevenue,
      changePercent
    };
  }

  /**
   * Hedef gerçekleşme raporu
   */
  function getTargetReport() {
    const targets = DataManager.getTargets();
    const today = new Date();
    const todayKey = DataManager.formatDateKey(today);
    const todayEntry = DataManager.getEntry(todayKey);

    // Dün
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = DataManager.formatDateKey(yesterday);
    const yesterdayEntry = DataManager.getEntry(yesterdayKey);

    // Bu hafta ve Geçen hafta
    const weekReport = getWeeklyReport(0);
    const prevWeekReport = getWeeklyReport(1);
    
    // Bu ay ve Geçen ay
    const monthReport = getMonthlyReport(today.getFullYear(), today.getMonth());
    const prevMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
    const prevMonthYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
    const prevMonthReport = getMonthlyReport(prevMonthYear, prevMonth);

    return {
      daily: {
        target: targets.daily,
        actual: todayEntry ? todayEntry.revenue : 0,
        percent: targets.daily > 0 && todayEntry ? Math.min((todayEntry.revenue / targets.daily) * 100, 100) : 0,
        yesterday: yesterdayEntry ? yesterdayEntry.revenue : 0
      },
      weekly: {
        target: targets.weekly,
        actual: weekReport.totalRevenue,
        percent: targets.weekly > 0 ? Math.min((weekReport.totalRevenue / targets.weekly) * 100, 100) : 0,
        prevWeek: prevWeekReport.totalRevenue
      },
      monthly: {
        target: targets.monthly,
        actual: monthReport.totalRevenue,
        percent: targets.monthly > 0 ? Math.min((monthReport.totalRevenue / targets.monthly) * 100, 100) : 0,
        prevMonth: prevMonthReport.totalRevenue
      }
    };
  }

  /**
   * Son 90 günün günlük ciro raporu
   */
  function getDaily90Report() {
    const today = new Date();
    const entries = [];
    let totalRevenue = 0;
    let totalCash = 0;
    let totalCard = 0;

    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = DataManager.formatDateKey(d);
      const entry = DataManager.getEntry(key);

      const revenue = entry ? entry.revenue : 0;
      totalRevenue += revenue;
      totalCash += entry ? (entry.cashAmount || 0) : 0;
      totalCard += entry ? (entry.cardAmount || 0) : 0;

      entries.push({
        date: key,
        revenue: revenue,
        cash: entry ? (entry.cashAmount || 0) : 0,
        card: entry ? (entry.cardAmount || 0) : 0
      });
    }

    const activeEntries = entries.filter(e => e.revenue > 0);
    const avgRevenue = activeEntries.length > 0 ? totalRevenue / activeEntries.length : 0;

    let bestDay = null, worstDay = null;
    if (activeEntries.length > 0) {
      bestDay = activeEntries.reduce((a, b) => a.revenue > b.revenue ? a : b);
      worstDay = activeEntries.reduce((a, b) => a.revenue < b.revenue ? a : b);
    }

    return {
      entries,
      totalRevenue,
      totalCash,
      totalCard,
      avgRevenue,
      bestDay,
      worstDay,
      entryCount: activeEntries.length
    };
  }

  return {
    getWeeklyReport,
    getMonthlyReport,
    getYearlyReport,
    getTargetReport,
    getDaily90Report
  };
})();
