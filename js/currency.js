/**
 * currency.js
 * Modul untuk menangani format mata uang, perhitungan konversi kurs,
 * dan kalkulasi nilai antar mata uang.
 */

window.SisaUang = window.SisaUang || {};

window.SisaUang.Currency = {
  /**
   * Format angka menjadi string representasi mata uang (contoh: Rp 50.000 atau $ 10.50)
   * @param {number} amount Nilai nominal
   * @param {string} currencyCode Kode mata uang (IDR, USD, dll.)
   * @param {object} currencies Kamus data mata uang
   * @returns {string} String yang sudah diformat
   */
  format(amount, currencyCode, currencies) {
    if (amount === null || amount === undefined || isNaN(amount)) {
      amount = 0;
    }

    const cur = currencies && currencies[currencyCode]
      ? currencies[currencyCode]
      : { symbol: currencyCode + " ", decimals: 2 };

    const decimals = cur.decimals !== undefined ? cur.decimals : 2;
    const isNegative = amount < 0;
    const absVal = Math.abs(amount);

    // Pemisahan ribuan dan desimal sesuai standar yang mudah dibaca
    let formattedNumber;
    if (currencyCode === "IDR") {
      // Standar Indonesia: titik untuk ribuan, koma untuk desimal
      formattedNumber = absVal.toLocaleString("id-ID", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    } else {
      // Standar Internasional: koma untuk ribuan, titik untuk desimal
      formattedNumber = absVal.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    }

    const symbolPrefix = cur.symbol ? `${cur.symbol} ` : `${currencyCode} `;
    return `${isNegative ? "-" : ""}${symbolPrefix}${formattedNumber}`;
  },

  /**
   * Menghitung nilai konversi dari suatu mata uang ke mata uang lain
   * berdasarkan kurs manual terhadap mata uang dasar (Base Currency).
   * Rumus: Nilai_Target = (Nominal_Asal * Kurs_Asal) / Kurs_Target
   * 
   * @param {number} amount Jumlah nominal yang ingin dikonversi
   * @param {string} fromCode Kode mata uang asal (misal USD)
   * @param {string} toCode Kode mata uang tujuan (misal IDR)
   * @param {object} currencies Kamus mata uang beserta nilai tukarnya
   * @returns {number} Hasil konversi
   */
  convert(amount, fromCode, toCode, currencies) {
    if (fromCode === toCode) return amount;
    if (!amount || isNaN(amount)) return 0;

    const fromRate = (currencies[fromCode] && currencies[fromCode].rate) || 1;
    const toRate = (currencies[toCode] && currencies[toCode].rate) || 1;

    // Nilai dalam mata uang dasar (misal IDR)
    const amountInBase = amount * fromRate;

    // Nilai dalam mata uang tujuan
    const converted = amountInBase / toRate;
    return converted;
  }
};
