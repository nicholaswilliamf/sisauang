/**
 * storage.js
 * Modul untuk mengelola penyimpanan data lokal (LocalStorage),
 * migrasi skema data (dari pockets ke 6 kategori akun & kategori transaksi),
 * ekspor cadangan ke file JSON, dan pemulihan (impor) dari file JSON.
 */

window.SisaUang = window.SisaUang || {};

window.SisaUang.Storage = {
  loadData() {
    const config = window.SisaUang.Config;
    try {
      const raw = localStorage.getItem(config.STORAGE_KEY);
      if (!raw) {
        const initial = this.getInitialData();
        this.saveData(initial);
        return initial;
      }

      let parsed = JSON.parse(raw);

      // Migrasi data jika masih versi lama (berbasis pockets)
      if (parsed.pockets && !parsed.accounts) {
        parsed = this.migrateV1toV2(parsed);
        this.saveData(parsed);
      }

      // Validasi keberadaan accounts & categories
      if (!Array.isArray(parsed.accounts) || !parsed.currencies || !parsed.categories) {
        parsed = this.migrateV1toV2(parsed);
        this.saveData(parsed);
      }

      // Pastikan setiap akun memiliki tipe yang valid dalam 6 kategori
      let updatedAccounts = false;
      parsed.accounts = parsed.accounts.map(acc => {
        if (!config.ACCOUNT_TYPES[acc.type]) {
          acc.type = "bank";
          updatedAccounts = true;
        }
        // Pastikan akun credit memiliki default statementDay & dueDay jika belum ada
        if (acc.type === "credit") {
          if (acc.statementDay === undefined) {
            acc.statementDay = 15;
            updatedAccounts = true;
          }
          if (acc.dueDay === undefined) {
            acc.dueDay = 5;
            updatedAccounts = true;
          }
        }
        return acc;
      });

      if (updatedAccounts) {
        this.saveData(parsed);
      }

      return parsed;
    } catch (e) {
      console.error("Gagal membaca LocalStorage, memuat data default:", e);
      return this.getInitialData();
    }
  },

  getInitialData() {
    const config = window.SisaUang.Config;
    return {
      version: config.DATA_VERSION,
      lastUpdated: new Date().toISOString(),
      baseCurrency: config.DEFAULT_BASE_CURRENCY,
      viewMode: "base",
      currencies: JSON.parse(JSON.stringify(config.DEFAULT_CURRENCIES)),
      accounts: JSON.parse(JSON.stringify(config.DEFAULT_ACCOUNTS)),
      categories: JSON.parse(JSON.stringify(config.DEFAULT_CATEGORIES)),
      transactions: []
    };
  },

  /**
   * Mengonversi struktur lama V1 (berbasis pos) ke V2 (berbasis akun dan kategori)
   */
  migrateV1toV2(oldData) {
    const config = window.SisaUang.Config;
    const newData = this.getInitialData();

    if (oldData.currencies) {
      newData.currencies = oldData.currencies;
    }
    if (oldData.baseCurrency) {
      newData.baseCurrency = oldData.baseCurrency;
    }
    if (oldData.viewMode) {
      newData.viewMode = oldData.viewMode;
    }

    // Jika ada transaksi lama, petakan pocketId ke accountId utama dan buat kategori jika ada
    if (Array.isArray(oldData.transactions)) {
      newData.transactions = oldData.transactions.map(t => {
        const item = { ...t };
        if (item.pocketId) {
          item.accountId = "acc-bank-utama";
          delete item.pocketId;
        }
        if (item.fromPocketId) {
          item.fromAccountId = "acc-bank-utama";
          delete item.fromPocketId;
        }
        if (item.toPocketId) {
          item.toAccountId = "acc-dompet-tunai";
          delete item.toPocketId;
        }
        if (!item.categoryId && item.type !== "transfer") {
          item.categoryId = item.type === "income" ? "cat-gaji" : "cat-kebutuhan-harian";
        }
        return item;
      });
    }

    return newData;
  },

  saveData(data) {
    const config = window.SisaUang.Config;
    try {
      data.lastUpdated = new Date().toISOString();
      localStorage.setItem(config.STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error("Gagal menyimpan ke LocalStorage:", e);
      return false;
    }
  },

  exportBackup(data) {
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `SisaUang-backup-${dateStr}.json`;
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.error("Gagal membuat file export:", e);
      return false;
    }
  },

  importBackup(jsonString) {
    try {
      let parsed = JSON.parse(jsonString);

      if (!parsed || typeof parsed !== "object") {
        return { success: false, message: "File bukan format JSON yang valid." };
      }

      // Jika format v1 lama, migrasi ke v2
      if (parsed.pockets && !parsed.accounts) {
        parsed = this.migrateV1toV2(parsed);
      }

      if (!Array.isArray(parsed.accounts) || !parsed.currencies) {
        return {
          success: false,
          message: "Format cadangan tidak sesuai! Diperlukan data akun (accounts) dan mata uang (currencies)."
        };
      }

      if (!parsed.categories) {
        parsed.categories = JSON.parse(JSON.stringify(window.SisaUang.Config.DEFAULT_CATEGORIES));
      }

      if (!Array.isArray(parsed.transactions)) {
        parsed.transactions = [];
      }

      this.saveData(parsed);

      return {
        success: true,
        message: "Data cadangan berhasil dipulihkan!",
        data: parsed
      };
    } catch (e) {
      return { success: false, message: "Gagal memproses file cadangan: " + e.message };
    }
  },

  resetToDefault() {
    const defaultData = this.getInitialData();
    this.saveData(defaultData);
    return defaultData;
  }
};
