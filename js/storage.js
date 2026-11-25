/**
 * storage.js — Data Persistence Layer (LocalStorage + SQLite .bin Importer/Exporter)
 * Kompatibel penuh dengan namespace window.SisaUang.Storage, window.Storage, dan skema app.js.
 */

(function () {
  const STORAGE_KEY = 'sisauang_v3_data';
  const LEGACY_KEYS = ['finance_tracker_v2_data', 'sisauang_data'];

  const defaultCurrencies = {
    IDR: { code: 'IDR', symbol: 'Rp', name: 'Rupiah Indonesia', rate: 1, decimals: 0 },
    USD: { code: 'USD', symbol: '$', name: 'Dolar AS', rate: 16200, decimals: 2 },
    SGD: { code: 'SGD', symbol: 'S$', name: 'Dolar Singapura', rate: 12100, decimals: 2 },
    EUR: { code: 'EUR', symbol: '€', name: 'Euro', rate: 17500, decimals: 2 },
    JPY: { code: 'JPY', symbol: '¥', name: 'Yen Jepang', rate: 108, decimals: 0 },
    MYR: { code: 'MYR', symbol: 'RM', name: 'Ringgit Malaysia', rate: 3750, decimals: 2 }
  };

  const defaultCategories = [
    // Pemasukan
    { id: 'inc-1', name: 'Gaji & Tunjangan', type: 'income', color: '#10b981', icon: '💼' },
    { id: 'inc-2', name: 'Bonus & THR', type: 'income', color: '#34d399', icon: '🎁' },
    { id: 'inc-3', name: 'Hasil Investasi / Dividen', type: 'income', color: '#059669', icon: '📈' },
    { id: 'inc-4', name: 'Penjualan / Cashback', type: 'income', color: '#6ee7b7', icon: '🏷️' },
    { id: 'inc-5', name: 'Pemasukan Lainnya', type: 'income', color: '#a7f3d0', icon: '💰' },
    // Pengeluaran
    { id: 'exp-1', name: 'Makanan & Minuman', type: 'expense', color: '#f43f5e', icon: '🍽️' },
    { id: 'exp-2', name: 'Transportasi & BBM', type: 'expense', color: '#fb923c', icon: '⛽' },
    { id: 'exp-3', name: 'Tagihan & Utilitas', type: 'expense', color: '#eab308', icon: '⚡' },
    { id: 'exp-4', name: 'Belanja & Kebutuhan', type: 'expense', color: '#a855f7', icon: '🛍️' },
    { id: 'exp-5', name: 'Hiburan & Langganan', type: 'expense', color: '#ec4899', icon: '🎬' },
    { id: 'exp-6', name: 'Kesehatan & Olahraga', type: 'expense', color: '#06b6d4', icon: '🏥' },
    { id: 'exp-7', name: 'Keluarga & Sosial', type: 'expense', color: '#6366f1', icon: '🤝' },
    { id: 'exp-8', name: 'Biaya Admin & Pajak', type: 'expense', color: '#64748b', icon: '🧾' },
    { id: 'exp-9', name: 'Pengeluaran Lainnya', type: 'expense', color: '#94a3b8', icon: '📦' }
  ];

  const defaultAccounts = [
    { id: 'acc-1', name: 'Dompet Tunai', type: 'cash', currency: 'IDR', initialBalance: 0, color: '#10b981', icon: '💵' },
    { id: 'acc-2', name: 'Rekening Utama (Bank)', type: 'bank', currency: 'IDR', initialBalance: 0, color: '#3b82f6', icon: '🏦' },
    { id: 'acc-3', name: 'E-Wallet (GoPay/OVO/Dana)', type: 'ewallet', currency: 'IDR', initialBalance: 0, color: '#06b6d4', icon: '📱' },
    { id: 'acc-4', name: 'Tabungan / Emas / Investasi', type: 'investment', currency: 'IDR', initialBalance: 0, color: '#f59e0b', icon: '🪙' }
  ];

  function getBaseCurrencies() {
    if (window.SisaUang && window.SisaUang.Config && window.SisaUang.Config.DEFAULT_CURRENCIES) {
      return JSON.parse(JSON.stringify(window.SisaUang.Config.DEFAULT_CURRENCIES));
    }
    return JSON.parse(JSON.stringify(defaultCurrencies));
  }

  function normalizeState(raw) {
    const baseCurr = (raw && raw.baseCurrency) || 'IDR';
    const currencies = Object.assign(getBaseCurrencies(), (raw && raw.currencies) || {});

    // Normalisasi kategori (dukung format array maupun object {expense, income})
    let categories = [];
    if (raw && Array.isArray(raw.categories)) {
      categories = raw.categories.map(c => Object.assign({ type: 'expense', icon: '🏷️', color: '#10b981' }, c));
    } else if (raw && raw.categories && typeof raw.categories === 'object') {
      const exp = Array.isArray(raw.categories.expense)
        ? raw.categories.expense.map(c => Object.assign({}, c, { type: 'expense' }))
        : [];
      const inc = Array.isArray(raw.categories.income)
        ? raw.categories.income.map(c => Object.assign({}, c, { type: 'income' }))
        : [];
      categories = exp.concat(inc);
    }
    if (!categories.length) {
      categories = JSON.parse(JSON.stringify(defaultCategories));
    }

    // Normalisasi akun
    let accounts = raw && Array.isArray(raw.accounts) && raw.accounts.length
      ? raw.accounts.map(a => Object.assign({
          type: 'bank',
          currency: baseCurr,
          initialBalance: 0,
          icon: '🏦',
          color: '#3b82f6'
        }, a))
      : JSON.parse(JSON.stringify(defaultAccounts));

    // Normalisasi transaksi (dukung properti account/accountId, accountTo/toAccountId, category/categoryId)
    const transactions = raw && Array.isArray(raw.transactions)
      ? raw.transactions.map((t, idx) => ({
          id: t.id || `tx-${idx + 1}`,
          type: t.type || 'expense',
          amount: Number(t.amount) || 0,
          currency: t.currency || baseCurr,
          account: t.account || t.accountId || (accounts[0] ? accounts[0].id : 'acc-1'),
          accountTo: t.accountTo || t.toAccountId || null,
          category: t.category || t.categoryId || null,
          date: t.date || new Date().toISOString().slice(0, 10),
          note: t.note || ''
        }))
      : [];

    // Urutkan transaksi terbaru di atas
    transactions.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    return {
      baseCurrency: baseCurr,
      viewMode: (raw && raw.viewMode) || 'base',
      currencies,
      accounts,
      categories,
      transactions,
      budgets: (raw && raw.budgets) || {},
      goals: (raw && raw.goals) || []
    };
  }

  function loadData() {
    const keysToTry = [STORAGE_KEY].concat(LEGACY_KEYS);
    for (const key of keysToTry) {
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            const normalized = normalizeState(parsed);
            if (key !== STORAGE_KEY) {
              saveData(normalized);
            }
            return normalized;
          }
        } catch (e) {
          console.error('Gagal membaca data dari LocalStorage:', e);
        }
      }
    }
    return normalizeState(null);
  }

  function saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Gagal menyimpan data ke LocalStorage:', e);
      return false;
    }
  }

  function resetToDefault() {
    localStorage.removeItem(STORAGE_KEY);
    LEGACY_KEYS.forEach(k => localStorage.removeItem(k));
    const fresh = normalizeState(null);
    saveData(fresh);
    return fresh;
  }

  function exportBackup(data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `SisaUang_Backup_${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importBackup(jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, message: 'Format file JSON tidak valid.' };
      }
      const normalized = normalizeState(parsed);
      saveData(normalized);
      return {
        success: true,
        data: normalized,
        message: `Berhasil memulihkan ${normalized.accounts.length} akun & ${normalized.transactions.length} transaksi.`
      };
    } catch (e) {
      return { success: false, message: 'Gagal membaca file JSON: ' + e.message };
    }
  }

  function queryRows(db, sql) {
    try {
      const res = db.exec(sql);
      if (!res || !res.length) return [];
      const cols = res[0].columns;
      return res[0].values.map(row => {
        const obj = {};
        cols.forEach((c, idx) => {
          obj[c] = row[idx];
        });
        return obj;
      });
    } catch (e) {
      console.warn('Query dilewati:', sql, e.message);
      return [];
    }
  }

  function detectAccountMeta(groupName = '', groupType = 0, accName = '') {
    const combined = `${groupName} ${accName}`.toLowerCase();

    if (
      combined.includes('tunai') ||
      combined.includes('cash') ||
      combined.includes('dompet') ||
      combined.includes('uang saku')
    ) {
      return { type: 'cash', icon: '💵', color: '#10b981' };
    }

    if (
      combined.includes('invest') ||
      combined.includes('emas') ||
      combined.includes('pegadaian') ||
      combined.includes('saham') ||
      combined.includes('reksa') ||
      combined.includes('bibit') ||
      combined.includes('stockbit') ||
      combined.includes('tabungan') ||
      combined.includes('deposito') ||
      combined.includes('crypto')
    ) {
      return { type: 'investment', icon: '🪙', color: '#f59e0b' };
    }

    if (
      combined.includes('gopay') ||
      combined.includes('ovo') ||
      combined.includes('dana') ||
      combined.includes('shopeepay') ||
      combined.includes('linkaja') ||
      combined.includes('wallet') ||
      combined.includes('ewallet') ||
      combined.includes('e-wallet') ||
      combined.includes('flazz') ||
      combined.includes('emoney') ||
      combined.includes('e-money') ||
      combined.includes('brizzi') ||
      combined.includes('tapcash')
    ) {
      return { type: 'ewallet', icon: '📱', color: '#06b6d4' };
    }

    if (
      combined.includes('pinjaman') ||
      combined.includes('cicilan') ||
      combined.includes('loan') ||
      combined.includes('kta') ||
      combined.includes('kpr')
    ) {
      return { type: 'loan', icon: '🤝', color: '#d97706' };
    }

    if (
      combined.includes('kartu kredit') ||
      combined.includes('credit') ||
      combined.includes('paylater') ||
      combined.includes('hutang') ||
      combined.includes('utang') ||
      Number(groupType) === 2
    ) {
      return { type: 'credit', icon: '💳', color: '#f43f5e' };
    }

    return { type: 'bank', icon: '🏦', color: '#3b82f6' };
  }

  function detectCategoryVisual(name = '', type = 'expense', index = 0) {
    const n = name.toLowerCase();
    const expensePalette = ['#f43f5e', '#fb923c', '#eab308', '#a855f7', '#ec4899', '#06b6d4', '#6366f1', '#14b8a6', '#8b5cf6', '#f97316'];
    const incomePalette = ['#10b981', '#34d399', '#059669', '#0ea5e9', '#14b8a6', '#22c55e'];

    if (type === 'income') {
      let icon = '💰';
      if (n.includes('gaji') || n.includes('salary') || n.includes('tunjangan')) icon = '💼';
      else if (n.includes('bonus') || n.includes('thr') || n.includes('hadiah')) icon = '🎁';
      else if (n.includes('invest') || n.includes('dividen') || n.includes('bunga') || n.includes('emas')) icon = '📈';
      else if (n.includes('jual') || n.includes('cashback') || n.includes('refund')) icon = '🏷️';
      else if (n.includes('saldo') || n.includes('penyesuaian')) icon = '⚖️';
      return { icon, color: incomePalette[index % incomePalette.length] };
    }

    let icon = '📦';
    if (n.includes('makan') || n.includes('minum') || n.includes('kopi') || n.includes('jajan') || n.includes('warteg')) icon = '🍽️';
    else if (n.includes('transport') || n.includes('bensin') || n.includes('bbm') || n.includes('parkir') || n.includes('baterai') || n.includes('motor') || n.includes('gojek') || n.includes('grab') || n.includes('kereta')) icon = '🛵';
    else if (n.includes('tagihan') || n.includes('listrik') || n.includes('internet') || n.includes('pulsa') || n.includes('kuota') || n.includes('air') || n.includes('kos')) icon = '⚡';
    else if (n.includes('belanja') || n.includes('mart') || n.includes('kebutuhan') || n.includes('baju')) icon = '🛍️';
    else if (n.includes('hiburan') || n.includes('game') || n.includes('film') || n.includes('konser') || n.includes('langganan') || n.includes('spotify') || n.includes('netflix')) icon = '🎬';
    else if (n.includes('sehat') || n.includes('obat') || n.includes('dokter') || n.includes('gym') || n.includes('futsal') || n.includes('olahraga')) icon = '🏥';
    else if (n.includes('hewan') || n.includes('sugar') || n.includes('peliharaan') || n.includes('vet')) icon = '🐾';
    else if (n.includes('vape') || n.includes('liquid') || n.includes('coil') || n.includes('rokok')) icon = '💨';
    else if (n.includes('keluarga') || n.includes('pacar') || n.includes('sosial') || n.includes('donasi') || n.includes('kado')) icon = '🤝';
    else if (n.includes('admin') || n.includes('pajak') || n.includes('biaya') || n.includes('denda')) icon = '🧾';
    else if (n.includes('saldo') || n.includes('penyesuaian')) icon = '⚖️';

    return { icon, color: expensePalette[index % expensePalette.length] };
  }

  function parseMoneyManagerDate(row) {
    const candidates = [row.WDATE, row.DATE, row.CDATE, row.UDATE];
    for (const val of candidates) {
      if (val === null || val === undefined || val === '') continue;

      if (typeof val === 'string') {
        const trimmed = val.trim();
        const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
        if (isoMatch) {
          return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
        }
        if (/^\d+$/.test(trimmed)) {
          const num = Number(trimmed);
          const dt = new Date(num > 1e11 ? num : num * 1000);
          if (!isNaN(dt.getTime()) && dt.getFullYear() >= 2000 && dt.getFullYear() <= 2100) {
            return dt.toISOString().slice(0, 10);
          }
        }
      }

      if (typeof val === 'number' && val > 0) {
        const dt = new Date(val > 1e11 ? val : val * 1000);
        if (!isNaN(dt.getTime()) && dt.getFullYear() >= 2000 && dt.getFullYear() <= 2100) {
          return dt.toISOString().slice(0, 10);
        }
      }
    }
    return new Date().toISOString().slice(0, 10);
  }

  async function importSqliteBackup(arrayBuffer) {
    try {
      if (typeof initSqlJs !== 'function') {
        return {
          success: false,
          message: 'Library SQL.js belum dimuat. Pastikan koneksi internet aktif saat membuka halaman.'
        };
      }

      const SQL = await initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
      });

      const u8 = new Uint8Array(arrayBuffer);
      const db = new SQL.Database(u8);

      // 1. Grup Akun (ASSETGROUP)
      const rawGroups = queryRows(db, `SELECT * FROM ASSETGROUP`);
      const groupMap = {};
      rawGroups.forEach(g => {
        const uid = String(g.UID || g.uid || g.ID || '');
        if (uid) {
          groupMap[uid] = {
            name: g.ACC_GROUP_NAME || g.NAME || '',
            type: g.TYPE ?? 0
          };
        }
      });

      // 2. Daftar Akun / Aset (ASSETS)
      const rawAssets = queryRows(db, `SELECT * FROM ASSETS WHERE IFNULL(IS_DEL, 0) = 0 ORDER BY ORDERSEQ ASC, ID ASC`);
      if (!rawAssets.length) {
        db.close();
        return {
          success: false,
          message: 'Tabel ASSETS kosong atau file .bin bukan merupakan database Money Manager yang valid.'
        };
      }

      const assetUidToAccountId = {};
      const accounts = rawAssets.map((a, idx) => {
        const uid = String(a.UID || a.uid || a.ID || `acc-${idx + 1}`);
        const accId = `acc-mm-${uid}`;
        assetUidToAccountId[uid] = accId;

        const grp = groupMap[String(a.GROUP_UID || a.groupUid || '')] || { name: '', type: 0 };
        const name = (a.NIC_NAME || a.NAME || `Akun ${idx + 1}`).trim();
        const meta = detectAccountMeta(grp.name, grp.type, name);
        const initBal = Number(a.START_MONEY ?? a.INIT_MONEY ?? 0) || 0;

        return {
          id: accId,
          name,
          groupName: grp.name || 'Umum',
          type: meta.type,
          currency: 'IDR',
          initialBalance: initBal,
          color: meta.color,
          icon: meta.icon
        };
      });

      const fallbackAccountId = accounts[0].id;

      // 3. Kategori & Sub-kategori (ZCATEGORY)
      const rawCategories = queryRows(db, `SELECT * FROM ZCATEGORY WHERE IFNULL(C_IS_DEL, 0) = 0 ORDER BY ORDERSEQ ASC, ID ASC`);
      const rawCatByUid = {};
      rawCategories.forEach(c => {
        const uid = String(c.UID || c.uid || c.ID || '');
        if (uid) rawCatByUid[uid] = c;
      });

      const catUidToCategoryId = {};
      const categories = [];
      let incIdx = 0;
      let expIdx = 0;

      rawCategories.forEach(c => {
        const uid = String(c.UID || c.uid || c.ID || '');
        if (!uid) return;

        const isIncome = Number(c.C_TYPE) === 0;
        const type = isIncome ? 'income' : 'expense';
        const rawName = (c.NAME || 'Tanpa Kategori').trim();

        const parentUid = c.pUid !== null && c.pUid !== undefined ? String(c.pUid) : '';
        const parentObj = parentUid && parentUid !== '-1' && parentUid !== '0' ? rawCatByUid[parentUid] : null;
        const fullName = parentObj && parentObj.NAME ? `${parentObj.NAME.trim()} - ${rawName}` : rawName;

        const visual = detectCategoryVisual(fullName, type, isIncome ? incIdx++ : expIdx++);
        const catId = `cat-mm-${uid}`;
        catUidToCategoryId[uid] = catId;

        categories.push({
          id: catId,
          name: fullName,
          type,
          color: visual.color,
          icon: visual.icon
        });
      });

      const adjIncomeCatId = 'cat-mm-adj-inc';
      const adjExpenseCatId = 'cat-mm-adj-exp';
      categories.push(
        { id: adjIncomeCatId, name: 'Penyesuaian Saldo (+)', type: 'income', color: '#059669', icon: '⚖️' },
        { id: adjExpenseCatId, name: 'Penyesuaian Saldo (-)', type: 'expense', color: '#64748b', icon: '⚖️' }
      );

      if (!categories.some(c => c.type === 'income')) {
        categories.push({ id: 'cat-mm-fallback-inc', name: 'Pemasukan Lainnya', type: 'income', color: '#10b981', icon: '💰' });
      }
      if (!categories.some(c => c.type === 'expense')) {
        categories.push({ id: 'cat-mm-fallback-exp', name: 'Pengeluaran Lainnya', type: 'expense', color: '#f43f5e', icon: '📦' });
      }

      const fallbackIncomeCatId = categories.find(c => c.type === 'income').id;
      const fallbackExpenseCatId = categories.find(c => c.type === 'expense').id;

      // 4. Transaksi (INOUTCOME)
      const rawTx = queryRows(db, `SELECT * FROM INOUTCOME WHERE IFNULL(IS_DEL, 0) = 0 ORDER BY WDATE DESC, ID DESC`);
      const transactions = [];
      const processedTransferUids = new Set();

      const txByUid = {};
      rawTx.forEach(t => {
        const uid = String(t.UID || t.uid || '');
        if (uid) txByUid[uid] = t;
      });

      rawTx.forEach((t, idx) => {
        const uid = String(t.UID || t.uid || `tx-${idx + 1}`);
        const doType = String(t.DO_TYPE ?? '');
        const assetUid = String(t.assetUid || t.ASSET_UID || '');
        const toAssetUid = String(t.toAssetUid || t.TO_ASSET_UID || '');
        const ctgUid = String(t.ctgUid || t.CATEGORY_UID || '');
        const linkedTransUid = String(t.txUidTrans || '');

        const accountId = assetUidToAccountId[assetUid] || fallbackAccountId;
        const date = parseMoneyManagerDate(t);
        const rawAmount = Number(t.AMOUNT_ACCOUNT ?? t.AMOUNT ?? 0) || 0;
        const content = (t.ZCONTENT || t.CONTENT || '').trim();
        const memo = (t.ZDATA || t.MEMO || '').trim();
        const note = [content, memo].filter(Boolean).join(' — ') || 'Transaksi';

        if (doType === '3' || doType === '4') {
          if (processedTransferUids.has(uid)) return;
          if (linkedTransUid) processedTransferUids.add(linkedTransUid);
          processedTransferUids.add(uid);

          let fromAccId = accountId;
          let toAccId = toAssetUid ? assetUidToAccountId[toAssetUid] : null;

          if (doType === '4') {
            const paired = linkedTransUid ? txByUid[linkedTransUid] : null;
            if (paired) {
              fromAccId = assetUidToAccountId[String(paired.assetUid || '')] || toAccId || fallbackAccountId;
              toAccId = accountId;
            } else if (toAccId) {
              const temp = fromAccId;
              fromAccId = toAccId;
              toAccId = temp;
            }
          }

          let finalAmount = Math.abs(rawAmount);
          if (rawAmount < 0 && toAccId) {
            const temp = fromAccId;
            fromAccId = toAccId;
            toAccId = temp;
          }

          if (toAccId && fromAccId !== toAccId) {
            transactions.push({
              id: `tx-mm-${uid}`,
              type: 'transfer',
              amount: finalAmount,
              currency: 'IDR',
              date,
              account: fromAccId,
              accountTo: toAccId,
              category: null,
              note: content || 'Transfer Antar Akun'
            });
          } else {
            const isNegative = rawAmount < 0;
            transactions.push({
              id: `tx-mm-${uid}`,
              type: isNegative ? 'expense' : 'income',
              amount: finalAmount,
              currency: 'IDR',
              date,
              account: fromAccId,
              category: isNegative ? adjExpenseCatId : adjIncomeCatId,
              note: note || 'Transfer / Mutasi Aset'
            });
          }
          return;
        }

        let txType = 'expense';
        if (doType === '0') {
          txType = rawAmount < 0 ? 'expense' : 'income';
        } else if (doType === '1') {
          txType = rawAmount < 0 ? 'income' : 'expense';
        } else if (doType === '7') {
          txType = rawAmount >= 0 ? 'income' : 'expense';
        } else {
          txType = rawAmount >= 0 ? 'income' : 'expense';
        }

        let categoryId = catUidToCategoryId[ctgUid];
        if (!categoryId) {
          if (ctgUid === '-4' || doType === '7' || content.toLowerCase().includes('selisih saldo')) {
            categoryId = txType === 'income' ? adjIncomeCatId : adjExpenseCatId;
          } else {
            categoryId = txType === 'income' ? fallbackIncomeCatId : fallbackExpenseCatId;
          }
        }

        transactions.push({
          id: `tx-mm-${uid}`,
          type: txType,
          amount: Math.abs(rawAmount),
          currency: 'IDR',
          date,
          account: accountId,
          category: categoryId,
          note
        });
      });

      db.close();

      // Urutkan transaksi terbaru di urutan paling atas agar otomatis melompat ke bulan terbaru
      transactions.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      const newData = normalizeState({
        baseCurrency: 'IDR',
        viewMode: 'base',
        currencies: getBaseCurrencies(),
        accounts,
        categories,
        transactions,
        budgets: {},
        goals: []
      });

      saveData(newData);
      return {
        success: true,
        data: newData,
        message: `Berhasil mengimpor ${accounts.length} akun, ${categories.length} kategori, dan ${transactions.length} transaksi dari file .bin!`
      };
    } catch (err) {
      console.error('Error importSqliteBackup:', err);
      return {
        success: false,
        message: 'Gagal mengimpor file .bin: ' + (err && err.message ? err.message : String(err))
      };
    }
  }

  async function exportSqliteBackup(stateData) {
    try {
      if (typeof initSqlJs !== 'function') {
        alert('Library SQL.js belum dimuat. Gunakan ekspor .JSON atau periksa koneksi internet.');
        return;
      }

      const SQL = await initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
      });

      const db = new SQL.Database();
      db.run(`
        CREATE TABLE ASSETGROUP (UID TEXT PRIMARY KEY, ACC_GROUP_NAME TEXT, TYPE INTEGER);
        CREATE TABLE ASSETS (ID INTEGER PRIMARY KEY AUTOINCREMENT, UID TEXT, NIC_NAME TEXT, GROUP_UID TEXT, START_MONEY REAL, ORDERSEQ INTEGER, IS_DEL INTEGER DEFAULT 0);
        CREATE TABLE ZCATEGORY (ID INTEGER PRIMARY KEY AUTOINCREMENT, UID TEXT, NAME TEXT, C_TYPE INTEGER, pUid TEXT, ORDERSEQ INTEGER, C_IS_DEL INTEGER DEFAULT 0);
        CREATE TABLE INOUTCOME (ID INTEGER PRIMARY KEY AUTOINCREMENT, UID TEXT, assetUid TEXT, toAssetUid TEXT, ctgUid TEXT, DO_TYPE TEXT, AMOUNT_ACCOUNT REAL, WDATE TEXT, ZCONTENT TEXT, ZDATA TEXT, txUidTrans TEXT, IS_DEL INTEGER DEFAULT 0);
      `);

      db.run(`INSERT INTO ASSETGROUP (UID, ACC_GROUP_NAME, TYPE) VALUES ('grp-1', 'Umum', 0)`);

      (stateData.accounts || []).forEach((acc, idx) => {
        db.run(
          `INSERT INTO ASSETS (UID, NIC_NAME, GROUP_UID, START_MONEY, ORDERSEQ, IS_DEL) VALUES (?, ?, 'grp-1', ?, ?, 0)`,
          [acc.id, acc.name, Number(acc.initialBalance) || 0, idx]
        );
      });

      (stateData.categories || []).forEach((cat, idx) => {
        const cType = cat.type === 'income' ? 0 : 1;
        db.run(
          `INSERT INTO ZCATEGORY (UID, NAME, C_TYPE, pUid, ORDERSEQ, C_IS_DEL) VALUES (?, ?, ?, '-1', ?, 0)`,
          [cat.id, cat.name, cType, idx]
        );
      });

      (stateData.transactions || []).forEach(tx => {
        let doType = '1';
        if (tx.type === 'income') doType = '0';
        else if (tx.type === 'transfer') doType = '3';

        db.run(
          `INSERT INTO INOUTCOME (UID, assetUid, toAssetUid, ctgUid, DO_TYPE, AMOUNT_ACCOUNT, WDATE, ZCONTENT, ZDATA, IS_DEL) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', 0)`,
          [
            tx.id,
            tx.account || '',
            tx.accountTo || '',
            tx.category || '-4',
            doType,
            Number(tx.amount) || 0,
            tx.date || new Date().toISOString().slice(0, 10),
            tx.note || ''
          ]
        );
      });

      const binaryArray = db.export();
      db.close();

      const blob = new Blob([binaryArray], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const today = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `SisaUang_Backup_${today}.bin`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exportSqliteBackup:', err);
      alert('Gagal mengekspor file .bin: ' + err.message);
    }
  }

  const StorageAPI = {
    STORAGE_KEY,
    defaultCategories,
    defaultAccounts,
    loadData,
    getInitialData: loadData,
    saveData,
    resetToDefault,
    resetAllData: resetToDefault,
    exportBackup,
    exportBackupJSON: exportBackup,
    importBackup,
    importSqliteBackup,
    exportSqliteBackup
  };

  window.SisaUang = window.SisaUang || {};
  window.SisaUang.Storage = StorageAPI;
  window.Storage = StorageAPI;
})();
