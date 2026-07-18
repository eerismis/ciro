// Dünya Spot - Veri Yönetimi Modülü
// localStorage üzerinde CRUD, yedekleme ve dışa aktarma

const DataManager = (() => {
  const STORAGE_KEY = 'dunyaspot_revenues';
  const TARGETS_KEY = 'dunyaspot_targets';
  const SETTINGS_KEY = 'dunyaspot_settings';

  // ─── Yardımcı Fonksiyonlar ───
  function formatDateKey(date) {
    if (typeof date === 'string') return date;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getAllData() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveAllData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // ─── Ciro CRUD ───

  /**
   * Bir güne ait ciro kaydını kaydet/güncelle
   * @param {string} dateKey 'YYYY-MM-DD'
   * @param {Object} entry { revenue, cashAmount, cardAmount, notes, weather }
   */
  function saveEntry(dateKey, entry) {
    const data = getAllData();
    data[dateKey] = {
      revenue: parseFloat(entry.revenue) || 0,
      cashAmount: parseFloat(entry.cashAmount) || 0,
      cardAmount: parseFloat(entry.cardAmount) || 0,
      notes: entry.notes || '',
      weather: entry.weather || '',
      weatherIcon: entry.weatherIcon || '',
      weatherTemp: entry.weatherTemp !== undefined ? entry.weatherTemp : null,
      updatedAt: new Date().toISOString()
    };
    saveAllData(data);
  }

  /**
   * Bir güne ait ciro kaydını getir
   * @param {string} dateKey 'YYYY-MM-DD'
   * @returns {Object|null}
   */
  function getEntry(dateKey) {
    const data = getAllData();
    return data[dateKey] || null;
  }

  /**
   * Bir güne ait ciro kaydını sil
   * @param {string} dateKey 'YYYY-MM-DD'
   */
  function deleteEntry(dateKey) {
    const data = getAllData();
    delete data[dateKey];
    saveAllData(data);
  }

  /**
   * Belirli tarih aralığındaki kayıtları getir
   * @param {string} startDate 'YYYY-MM-DD'
   * @param {string} endDate 'YYYY-MM-DD'
   * @returns {Array<{date, ...entry}>}
   */
  function getEntriesInRange(startDate, endDate) {
    const data = getAllData();
    const results = [];

    const current = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');

    while (current <= end) {
      const key = formatDateKey(current);
      if (data[key]) {
        results.push({ date: key, ...data[key] });
      }
      current.setDate(current.getDate() + 1);
    }

    return results;
  }

  /**
   * Belirli bir aydaki tüm kayıtları getir
   * @param {number} year
   * @param {number} month (0-indexed)
   * @returns {Object} { 'YYYY-MM-DD': entry, ... }
   */
  function getMonthEntries(year, month) {
    const data = getAllData();
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const result = {};

    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith(prefix)) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Belirli bir yıldaki tüm kayıtları getir (ay bazında gruplu)
   * @param {number} year
   * @returns {Array} 12 elemanlı dizi, her eleman o aydaki toplam ciro
   */
  function getYearlyMonthTotals(year) {
    const data = getAllData();
    const totals = new Array(12).fill(0);

    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith(String(year))) {
        const month = parseInt(key.split('-')[1]) - 1;
        totals[month] += value.revenue || 0;
      }
    }

    return totals;
  }

  // ─── Hedef Yönetimi ───

  function getTargets() {
    try {
      const targets = JSON.parse(localStorage.getItem(TARGETS_KEY)) || {};
      return {
        daily: targets.daily || 0,
        weekly: targets.weekly || 0,
        monthly: targets.monthly || 0,
        monthlyByMonth: targets.monthlyByMonth || {}
      };
    } catch {
      return { daily: 0, weekly: 0, monthly: 0, monthlyByMonth: {} };
    }
  }

  function saveTargets(targets) {
    localStorage.setItem(TARGETS_KEY, JSON.stringify(targets));
  }

  // ─── Ayarlar ───

  function getSettings() {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {
        storeName: 'Dünya Spot',
        location: 'Keşan, Edirne'
      };
    } catch {
      return { storeName: 'Dünya Spot', location: 'Keşan, Edirne' };
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  // ─── İstatistikler ───

  /**
   * Haftanın günlerine göre ortalama ciro
   * @returns {Array} 7 elemanlı dizi [Pazar, Pazartesi, ..., Cumartesi]
   */
  function getDayOfWeekAverages() {
    const data = getAllData();
    const sums = new Array(7).fill(0);
    const counts = new Array(7).fill(0);

    for (const [key, value] of Object.entries(data)) {
      const date = new Date(key + 'T00:00:00');
      const dayOfWeek = date.getDay();
      sums[dayOfWeek] += value.revenue || 0;
      counts[dayOfWeek]++;
    }

    return sums.map((sum, i) => counts[i] > 0 ? Math.round(sum / counts[i]) : 0);
  }

  /**
   * Ciro girilmemiş son günleri bul (uyarı için)
   * @param {number} daysBack Kaç gün geriye bakılacak
   * @returns {Array<string>} Girilmemiş tarihler
   */
  function getMissingDays(daysBack = 7) {
    const data = getAllData();
    const missing = [];
    const today = new Date();

    for (let i = 1; i <= daysBack; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = formatDateKey(d);
      if (!data[key]) {
        missing.push(key);
      }
    }

    return missing;
  }

  // ─── Dışa Aktarma ───

  /**
   * Tüm verileri CSV formatında döndür
   */
  function exportCSV() {
    const data = getAllData();
    const keys = Object.keys(data).sort();

    if (keys.length === 0) return '';

    const header = 'Tarih,Toplam Ciro (₺),Nakit (₺),Kredi Kartı (₺),Hava Durumu,Notlar\n';
    const rows = keys.map(key => {
      const e = data[key];
      const notes = (e.notes || '').replace(/"/g, '""');
      const weather = (e.weather || '').replace(/"/g, '""');
      return `${key},${e.revenue},${e.cashAmount},${e.cardAmount},"${weather}","${notes}"`;
    });

    return header + rows.join('\n');
  }

  /**
   * Tüm verileri JSON olarak yedekle
   */
  function exportJSON() {
    return JSON.stringify({
      revenues: getAllData(),
      targets: getTargets(),
      settings: getSettings(),
      exportDate: new Date().toISOString()
    }, null, 2);
  }

  /**
   * JSON yedeğinden geri yükle
   * @param {string} jsonString
   */
  function importJSON(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      if (imported.revenues) {
        const existing = getAllData();
        // Mevcut verilerle birleştir (yeni veriler öncelikli)
        const merged = { ...existing, ...imported.revenues };
        saveAllData(merged);
      }
      if (imported.targets) {
        saveTargets(imported.targets);
      }
      if (imported.settings) {
        saveSettings(imported.settings);
      }
      return { success: true, count: Object.keys(imported.revenues || {}).length };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * CSV dosyasını indir
   */
  function downloadCSV() {
    const csv = exportCSV();
    if (!csv) return;
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dunyaspot_ciro_${formatDateKey(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * JSON dosyasını indir
   */
  function downloadJSON() {
    const json = exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dunyaspot_yedek_${formatDateKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    formatDateKey,
    saveEntry,
    getEntry,
    deleteEntry,
    getEntriesInRange,
    getMonthEntries,
    getYearlyMonthTotals,
    getTargets,
    saveTargets,
    getSettings,
    saveSettings,
    getDayOfWeekAverages,
    getMissingDays,
    exportCSV,
    exportJSON,
    importJSON,
    downloadCSV,
    downloadJSON
  };
})();
