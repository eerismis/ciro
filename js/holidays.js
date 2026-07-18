// Dünya Spot - Türkiye Resmi Tatilleri
// Sabit ve dini bayramlar (2024-2028)

const Holidays = (() => {
  // Sabit resmi tatiller (her yıl aynı tarihte)
  const fixedHolidays = {
    '01-01': 'Yılbaşı',
    '04-23': 'Ulusal Egemenlik ve Çocuk Bayramı',
    '05-01': 'Emek ve Dayanışma Günü',
    '05-19': 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı',
    '07-15': 'Demokrasi ve Milli Birlik Günü',
    '08-30': 'Zafer Bayramı',
    '10-29': 'Cumhuriyet Bayramı'
  };

  // Dini bayramlar (yıldan yıla değişir)
  // Ramazan Bayramı (3 gün) ve Kurban Bayramı (4 gün)
  const religiousHolidays = {
    2024: {
      '04-10': 'Ramazan Bayramı (1. gün)',
      '04-11': 'Ramazan Bayramı (2. gün)',
      '04-12': 'Ramazan Bayramı (3. gün)',
      '06-17': 'Kurban Bayramı (1. gün)',
      '06-18': 'Kurban Bayramı (2. gün)',
      '06-19': 'Kurban Bayramı (3. gün)',
      '06-20': 'Kurban Bayramı (4. gün)'
    },
    2025: {
      '03-30': 'Ramazan Bayramı (1. gün)',
      '03-31': 'Ramazan Bayramı (2. gün)',
      '04-01': 'Ramazan Bayramı (3. gün)',
      '06-06': 'Kurban Bayramı (1. gün)',
      '06-07': 'Kurban Bayramı (2. gün)',
      '06-08': 'Kurban Bayramı (3. gün)',
      '06-09': 'Kurban Bayramı (4. gün)'
    },
    2026: {
      '03-20': 'Ramazan Bayramı (1. gün)',
      '03-21': 'Ramazan Bayramı (2. gün)',
      '03-22': 'Ramazan Bayramı (3. gün)',
      '05-27': 'Kurban Bayramı (1. gün)',
      '05-28': 'Kurban Bayramı (2. gün)',
      '05-29': 'Kurban Bayramı (3. gün)',
      '05-30': 'Kurban Bayramı (4. gün)'
    },
    2027: {
      '03-10': 'Ramazan Bayramı (1. gün)',
      '03-11': 'Ramazan Bayramı (2. gün)',
      '03-12': 'Ramazan Bayramı (3. gün)',
      '05-16': 'Kurban Bayramı (1. gün)',
      '05-17': 'Kurban Bayramı (2. gün)',
      '05-18': 'Kurban Bayramı (3. gün)',
      '05-19': 'Kurban Bayramı (4. gün)'
    },
    2028: {
      '02-27': 'Ramazan Bayramı (1. gün)',
      '02-28': 'Ramazan Bayramı (2. gün)',
      '02-29': 'Ramazan Bayramı (3. gün)',
      '05-05': 'Kurban Bayramı (1. gün)',
      '05-06': 'Kurban Bayramı (2. gün)',
      '05-07': 'Kurban Bayramı (3. gün)',
      '05-08': 'Kurban Bayramı (4. gün)'
    }
  };

  /**
   * Belirli bir tarihin tatil olup olmadığını kontrol eder
   * @param {Date} date
   * @returns {string|null} Tatil adı veya null
   */
  function getHoliday(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const key = `${month}-${day}`;
    const year = date.getFullYear();

    // Önce sabit tatillere bak
    if (fixedHolidays[key]) {
      return fixedHolidays[key];
    }

    // Dini bayramlara bak
    if (religiousHolidays[year] && religiousHolidays[year][key]) {
      return religiousHolidays[year][key];
    }

    return null;
  }

  /**
   * Belirli bir tarihin hafta sonu olup olmadığını kontrol eder
   * @param {Date} date
   * @returns {boolean}
   */
  function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6; // Pazar=0, Cumartesi=6
  }

  /**
   * Belirli bir aydaki tüm tatilleri döndürür
   * @param {number} year
   * @param {number} month (0-indexed)
   * @returns {Object} { 'dd': holidayName, ... }
   */
  function getMonthHolidays(year, month) {
    const result = {};
    const monthStr = String(month + 1).padStart(2, '0');

    // Sabit tatiller
    for (const [key, name] of Object.entries(fixedHolidays)) {
      if (key.startsWith(monthStr + '-')) {
        const day = key.split('-')[1];
        result[parseInt(day)] = name;
      }
    }

    // Dini bayramlar
    if (religiousHolidays[year]) {
      for (const [key, name] of Object.entries(religiousHolidays[year])) {
        if (key.startsWith(monthStr + '-')) {
          const day = key.split('-')[1];
          result[parseInt(day)] = name;
        }
      }
    }

    return result;
  }

  return { getHoliday, isWeekend, getMonthHolidays };
})();
