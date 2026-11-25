/**
 * storage.js
 * Modul untuk mengelola penyimpanan data lokal (LocalStorage),
 * migrasi skema data, ekspor & impor JSON, serta konversi SQLite (.bin) Money Manager.
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

      if (parsed.pockets && !parsed.accounts) {
        parsed = this.migrateV1toV2(parsed);
        this.saveData(parsed);
      }

      if (!Array.isArray(parsed.accounts) || !parsed.currencies || !parsed.categories) {
        parsed = this.migrateV1toV2(parsed);
        this.saveData(parsed);
      }

      let updatedAccounts = false;
      parsed.accounts = parsed.accounts.map(acc => {
        if (!config.ACCOUNT_TYPES[acc.type]) {
          acc.type = "bank";
          updatedAccounts = true;
        }
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

  migrateV1toV2(oldData) {
    const newData = this.getInitialData();

    if (oldData.currencies) newData.currencies = oldData.currencies;
    if (oldData.baseCurrency) newData.baseCurrency = oldData.baseCurrency;
    if (oldData.viewMode) newData.viewMode = oldData.viewMode;

    if (Array.isArray(oldData.transactions)) {
      newData.transactions = oldData.transactions.map(t => {
        const item = { ...t };
        if (item.pocketId) {
          item.account = "acc-bank-utama";
          delete item.pocketId;
        }
        if (item.fromPocketId) {
          item.account = "acc-bank-utama";
          delete item.fromPocketId;
        }
        if (item.toPocketId) {
          item.accountTo = "acc-dompet-tunai";
          delete item.toPocketId;
        }
        if (!item.category && item.type !== "transfer") {
          item.category = item.type === "income" ? "cat-gaji" : "cat-kebutuhan-harian";
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
      console.error("Gagal membuat file export JSON:", e);
      return false;
    }
  },

  /**
   * Ekspor data SisaUang ke format SQLite (.bin) kompatibel dengan Money Manager
   */
  async exportSqliteBackup(data) {
    try {
      if (typeof window.initSqlJs !== "function") {
        alert("Library SQL.js belum termuat. Pastikan koneksi internet aktif atau periksa index.html.");
        return false;
      }

      const SQL = await window.initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
      });

      const db = new SQL.Database();

      db.run(`
        CREATE TABLE ASSETGROUP (uid TEXT PRIMARY KEY, NAME TEXT, TYPE INTEGER, IS_DEL INTEGER DEFAULT 0);
        CREATE TABLE ASSETS (uid TEXT PRIMARY KEY, NIC_NAME TEXT, groupUid TEXT, CURRENCY_UID TEXT, CARD_DAY_FIN TEXT, CARD_DAY_PAY TEXT, IS_DEL INTEGER DEFAULT 0);
        CREATE TABLE ZCATEGORY (uid TEXT PRIMARY KEY, NAME TEXT, TYPE INTEGER, IS_DEL INTEGER DEFAULT 0);
        CREATE TABLE INOUTCOME (uid TEXT PRIMARY KEY, ASSET_UID TEXT, CATEGORY_UID TEXT, ZDATE TEXT, AMOUNT_ACCOUNT REAL, ZMONEY TEXT, DO_TYPE TEXT, ZCONTENT TEXT, ASSET_NIC TEXT, IS_DEL INTEGER DEFAULT 0);
      `);

      // Grup default
      const groupMap = {
        cash: { uid: "grp-cash", name: "Cash", type: 0 },
        bank: { uid: "grp-bank", name: "Accounts", type: 1 },
        ewallet: { uid: "grp-ewallet", name: "E-Wallet", type: 1 },
        credit: { uid: "grp-credit", name: "Card", type: 2 },
        loan: { uid: "grp-loan", name: "Loan", type: 3 },
        investment: { uid: "grp-invest", name: "Investment", type: 4 }
      };

      Object.values(groupMap).forEach(g => {
        db.run("INSERT INTO ASSETGROUP (uid, NAME, TYPE, IS_DEL) VALUES (?, ?, ?, 0)", [g.uid, g.name, g.type]);
      });

      // Insert Accounts
      data.accounts.forEach(acc => {
        const grp = groupMap[acc.type] || groupMap.bank;
        db.run(
          "INSERT INTO ASSETS (uid, NIC_NAME, groupUid, CURRENCY_UID, CARD_DAY_FIN, CARD_DAY_PAY, IS_DEL) VALUES (?, ?, ?, ?, ?, ?, 0)",
          [
            acc.id,
            acc.name,
            grp.uid,
            acc.currency || data.baseCurrency,
            acc.statementDay ? String(acc.statementDay) : "",
            acc.dueDay ? String(acc.dueDay) : ""
          ]
        );
      });

      // Insert Categories
      data.categories.forEach(cat => {
        const typeInt = cat.type === "income" ? 1 : 0;
        db.run("INSERT INTO ZCATEGORY (uid, NAME, TYPE, IS_DEL) VALUES (?, ?, ?, 0)", [cat.id, cat.name, typeInt]);
      });

      // Insert Transactions
      data.transactions.forEach((tx, idx) => {
        const acc = data.accounts.find(a => a.id === tx.account);
        const accName = acc ? acc.name : "";

        if (tx.type === "transfer") {
          const toAcc = data.accounts.find(a => a.id === tx.accountTo);
          const toAccName = toAcc ? toAcc.name : "";
          // Baris keluar (DO_TYPE = 3)
          db.run(
            "INSERT INTO INOUTCOME (uid, ASSET_UID, CATEGORY_UID, ZDATE, AMOUNT_ACCOUNT, ZMONEY, DO_TYPE, ZCONTENT, ASSET_NIC, IS_DEL) VALUES (?, ?, ?, ?, ?, ?, '3', ?, ?, 0)",
            [`${tx.id}-out-${idx}`, tx.account, "", tx.date, tx.amount, String(tx.amount), tx.note || "", accName]
          );
          // Baris masuk (DO_TYPE = 4)
          if (tx.accountTo) {
            db.run(
              "INSERT INTO INOUTCOME (uid, ASSET_UID, CATEGORY_UID, ZDATE, AMOUNT_ACCOUNT, ZMONEY, DO_TYPE, ZCONTENT, ASSET_NIC, IS_DEL) VALUES (?, ?, ?, ?, ?, ?, '4', ?, ?, 0)",
              [`${tx.id}-in-${idx}`, tx.accountTo, "", tx.date, tx.amount, String(tx.amount), tx.note || "", toAccName]
            );
          }
        } else {
          const doType = tx.type === "income" ? "0" : "1";
          db.run(
            "INSERT INTO INOUTCOME (uid, ASSET_UID, CATEGORY_UID, ZDATE, AMOUNT_ACCOUNT, ZMONEY, DO_TYPE, ZCONTENT, ASSET_NIC, IS_DEL) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
            [tx.id, tx.account, tx.category || "", tx.date, tx.amount, String(tx.amount), doType, tx.note || "", accName]
          );
        }
      });

      const binaryArray = db.export();
      db.close();

      const dateStr = new Date().toISOString().slice(0, 10);
      const blob = new Blob([binaryArray], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `cadangan-sisauang-${dateStr}.bin`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.error("Gagal mengekspor SQLite .bin:", e);
      alert("Gagal mengekspor file .bin: " + e.message);
      return false;
    }
  },

  importBackup(jsonString) {
    try {
      let parsed = JSON.parse(jsonString);

      if (!parsed || typeof parsed !== "object") {
        return { success: false, message: "File bukan format JSON yang valid." };
      }

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
        message: "Data cadangan JSON berhasil dipulihkan!",
        data: parsed
      };
    } catch (e) {
      return { success: false, message: "Gagal memproses file cadangan JSON: " + e.message };
    }
  },

  /**
   * Mengimpor file SQLite (.bin / .db / .sqlite) hasil ekspor Money Manager
   */
  async importSqliteBackup(arrayBuffer) {
    try {
      if (typeof window.initSqlJs !== "function") {
        return {
          success: false,
          message: "Library sql.js belum dimuat di index.html. Pastikan tag <script> sql-wasm.js sudah terpasang."
        };
      }

      const SQL = await window.initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
      });

      const uInt8Array = new Uint8Array(arrayBuffer);
      const db = new SQL.Database(uInt8Array);

      const queryRows = sql => {
        try {
          const res = db.exec(sql);
          if (!res || res.length === 0) return [];
          const cols = res[0].columns;
          return res[0].values.map(row => {
            const obj = {};
            cols.forEach((col, i) => {
              obj[col] = row[i];
            });
            return obj;
          });
        } catch (err) {
          return [];
        }
      };

      const rawGroups = queryRows("SELECT * FROM ASSETGROUP WHERE IFNULL(IS_DEL, 0) = 0");
      const rawAssets = queryRows("SELECT * FROM ASSETS WHERE IFNULL(IS_DEL, 0) = 0");
      const rawCategories = queryRows("SELECT * FROM ZCATEGORY WHERE IFNULL(IS_DEL, 0) = 0");
      const rawTxs = queryRows("SELECT * FROM INOUTCOME WHERE IFNULL(IS_DEL, 0) = 0 ORDER BY ZDATE DESC");

      db.close();

      if (rawAssets.length === 0 && rawTxs.length === 0) {
        return {
          success: false,
          message: "File SQLite tidak berisi tabel Money Manager (ASSETS / INOUTCOME) yang valid."
        };
      }

      const newData = this.getInitialData();
      const palette = [
        "#059669", "#2563eb", "#7c3aed", "#db2777", "#ea580c",
        "#d97706", "#0891b2", "#4f46e5", "#16a34a", "#dc2626"
      ];

      // 1. Pemetaan Grup Akun
      const groupInfo = {};
      rawGroups.forEach(g => {
        const gName = (g.NAME || "").toLowerCase();
        const gType = Number(g.TYPE);
        let mappedType = "bank";

        if (gType === 0 || gName.includes("cash") || gName.includes("tunai")) {
          mappedType = "cash";
        } else if (gType === 2 || gName.includes("card") || gName.includes("kredit") || gName.includes("paylater")) {
          mappedType = "credit";
        } else if (gType === 3 || gName.includes("loan") || gName.includes("pinjam") || gName.includes("hutang") || gName.includes("utang")) {
          mappedType = "loan";
        } else if (gType === 4 || gName.includes("invest") || gName.includes("emas") || gName.includes("saham") || gName.includes("aset")) {
          mappedType = "investment";
        } else if (gName.includes("wallet") || gName.includes("gopay") || gName.includes("ovo") || gName.includes("dana") || gName.includes("shopeepay")) {
          mappedType = "ewallet";
        }
        groupInfo[String(g.uid)] = mappedType;
      });

      // 2. Pemetaan Akun (ASSETS)
      const accountIdMap = {};
      const mappedAccounts = [];

      rawAssets.forEach((a, idx) => {
        const rawUid = String(a.uid);
        const accId = "acc-mm-" + rawUid;
        accountIdMap[rawUid] = accId;

        const accName = (a.NIC_NAME || a.NAME || `Akun ${idx + 1}`).trim();
        const lowerName = accName.toLowerCase();
        let accType = groupInfo[String(a.groupUid)] || "bank";

        // Deteksi cerdas berdasarkan nama akun jika grup generik
        if (lowerName.includes("cash") || lowerName.includes("tunai") || lowerName.includes("dompet")) {
          accType = "cash";
        } else if (lowerName.includes("gopay") || lowerName.includes("ovo") || lowerName.includes("dana") || lowerName.includes("shopeepay") || lowerName.includes("linkaja")) {
          accType = "ewallet";
        } else if (lowerName.includes("kredivo") || lowerName.includes("akulaku") || lowerName.includes("cc ") || lowerName.includes("kartu kredit") || lowerName.includes("paylater")) {
          accType = "credit";
        } else if (lowerName.includes("emas") || lowerName.includes("pegadaian") || lowerName.includes("bibit") || lowerName.includes("stockbit") || lowerName.includes("reksadana")) {
          accType = "investment";
        } else if (lowerName.includes("piutang") || lowerName.includes("pinjam") || lowerName.includes("cicilan")) {
          accType = "loan";
        }

        const iconMap = {
          cash: "💵",
          bank: "🏦",
          ewallet: "📱",
          credit: "💳",
          loan: "🤝",
          investment: "📈"
        };

        const accObj = {
          id: accId,
          type: accType,
          name: accName,
          icon: iconMap[accType] || "🏦",
          color: palette[idx % palette.length],
          currency: newData.baseCurrency,
          initialBalance: 0
        };

        if (accType === "credit") {
          accObj.creditLimit = 0;
          accObj.statementDay = parseInt(a.CARD_DAY_FIN, 10) || 15;
          accObj.dueDay = parseInt(a.CARD_DAY_PAY, 10) || 5;
        }

        mappedAccounts.push(accObj);
      });

      if (mappedAccounts.length > 0) {
        newData.accounts = mappedAccounts;
      }

      // 3. Pemetaan Kategori (ZCATEGORY)
      const categoryIdMap = {};
      const categoryTypeMap = {};
      const mappedCategories = [];

      rawCategories.forEach((c, idx) => {
        const rawUid = String(c.uid);
        const catId = "cat-mm-" + rawUid;
        const catType = Number(c.TYPE) === 1 ? "income" : "expense";
        const catName = (c.NAME || "Kategori").trim();

        categoryIdMap[rawUid] = catId;
        categoryTypeMap[rawUid] = catType;

        mappedCategories.push({
          id: catId,
          type: catType,
          name: catName,
          icon: catType === "income" ? "💰" : "🏷️",
          color: palette[idx % palette.length]
        });
      });

      if (mappedCategories.length > 0) {
        newData.categories = mappedCategories;
      }

      // 4. Pemetaan Transaksi (INOUTCOME) & Penggabungan Pasangan Transfer
      const defaultAccId = newData.accounts[0].id;
      const defaultExpCat = newData.categories.find(c => c.type === "expense")?.id || "cat-uncategorized";
      const defaultIncCat = newData.categories.find(c => c.type === "income")?.id || "cat-uncategorized";

      const transferOutList = [];
      const transferInList = [];
      const finalTransactions = [];

      rawTxs.forEach((t, idx) => {
        const doType = String(t.DO_TYPE ?? "");
        const rawAmt = Number(t.AMOUNT_ACCOUNT ?? t.ZMONEY ?? 0);
        const amount = Math.abs(rawAmt);
        if (amount <= 0) return;

        // Normalisasi tanggal YYYY-MM-DD
        let dateStr = String(t.ZDATE || "").trim().slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          dateStr = new Date().toISOString().slice(0, 10);
        }

        const accId = accountIdMap[String(t.ASSET_UID)] || defaultAccId;
        const note = (t.ZCONTENT || "").trim();
        const rawCatUid = String(t.CATEGORY_UID || "");
        const catId = categoryIdMap[rawCatUid];

        if (doType === "3") {
          transferOutList.push({
            id: "tx-mm-" + (t.uid || idx),
            date: dateStr,
            amount,
            account: accId,
            note,
            matched: false
          });
        } else if (doType === "4") {
          transferInList.push({
            id: "tx-mm-" + (t.uid || idx),
            date: dateStr,
            amount,
            account: accId,
            note,
            matched: false
          });
        } else {
          // Tentukan apakah income atau expense
          let txType = "expense";
          if (doType === "0") {
            txType = "income";
          } else if (doType === "1") {
            txType = "expense";
          } else if (categoryTypeMap[rawCatUid]) {
            txType = categoryTypeMap[rawCatUid];
          } else if (rawAmt > 0 && doType === "2") {
            txType = "income";
          }

          finalTransactions.push({
            id: "tx-mm-" + (t.uid || idx),
            type: txType,
            amount,
            currency: newData.baseCurrency,
            account: accId,
            category: catId || (txType === "income" ? defaultIncCat : defaultExpCat),
            date: dateStr,
            note
          });
        }
      });

      // Pasangkan transfer keluar (DO_TYPE=3) dengan transfer masuk (DO_TYPE=4)
      transferOutList.forEach(outTx => {
        const matchIdx = transferInList.findIndex(
          inTx => !inTx.matched && inTx.date === outTx.date && Math.abs(inTx.amount - outTx.amount) < 0.01 && inTx.account !== outTx.account
        );

        if (matchIdx !== -1) {
          const inTx = transferInList[matchIdx];
          inTx.matched = true;
          finalTransactions.push({
            id: outTx.id,
            type: "transfer",
            amount: outTx.amount,
            currency: newData.baseCurrency,
            account: outTx.account,
            accountTo: inTx.account,
            date: outTx.date,
            note: outTx.note || inTx.note
          });
        } else {
          // Jika tidak ada pasangannya, catat sebagai pengeluaran biasa agar saldo akun sumber tetap akurat
          finalTransactions.push({
            id: outTx.id,
            type: "expense",
            amount: outTx.amount,
            currency: newData.baseCurrency,
            account: outTx.account,
            category: defaultExpCat,
            date: outTx.date,
            note: outTx.note ? `[Transfer Keluar] ${outTx.note}` : "Transfer Keluar"
          });
        }
      });

      // Sisa transfer masuk (DO_TYPE=4) yang tidak punya pasangan keluar dicatat sebagai pemasukan
      transferInList.forEach(inTx => {
        if (!inTx.matched) {
          finalTransactions.push({
            id: inTx.id,
            type: "income",
            amount: inTx.amount,
            currency: newData.baseCurrency,
            account: inTx.account,
            category: defaultIncCat,
            date: inTx.date,
            note: inTx.note ? `[Transfer Masuk] ${inTx.note}` : "Transfer Masuk"
          });
        }
      });

      // Urutkan transaksi terbaru di atas
      finalTransactions.sort((a, b) => b.date.localeCompare(a.date));
      newData.transactions = finalTransactions;

      this.saveData(newData);

      return {
        success: true,
        message: `Berhasil memulihkan ${newData.accounts.length} akun, ${newData.categories.length} kategori, dan ${newData.transactions.length} transaksi dari SQLite!`,
        data: newData
      };
    } catch (e) {
      console.error("Gagal mengimpor SQLite:", e);
      return {
        success: false,
        message: "Gagal membaca file SQLite (.bin): " + e.message
      };
    }
  },

  resetToDefault() {
    const defaultData = this.getInitialData();
    this.saveData(defaultData);
    return defaultData;
  }
};