/**
 * storage.js — Data Persistence Layer (LocalStorage + SQLite .bin Importer)
 */

const STORAGE_KEY = 'finance_tracker_v2_data';

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
  { id: 'acc-1', name: 'Dompet Tunai', type: 'cash', initialBalance: 0, color: '#10b981', icon: '💵' },
  { id: 'acc-2', name: 'Rekening Utama (Bank)', type: 'bank', initialBalance: 0, color: '#3b82f6', icon: '🏦' },
  { id: 'acc-3', name: 'E-Wallet (GoPay/OVO/Dana)', type: 'ewallet', initialBalance: 0, color: '#06b6d4', icon: '📱' },
  { id: 'acc-4', name: 'Tabungan / Emas / Investasi', type: 'investment', initialBalance: 0, color: '#f59e0b', icon: '🪙' }
];

function getInitialData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.transactions)) {
        return {
          accounts: parsed.accounts && parsed.accounts.length ? parsed.accounts : defaultAccounts,
          categories: parsed.categories && parsed.categories.length ? parsed.categories : defaultCategories,
          transactions: parsed.transactions || [],
          budgets: parsed.budgets || {},
          goals: parsed.goals || []
        };
      }
    } catch (e) {
      console.error('Gagal membaca data dari LocalStorage:', e);
    }
  }
  return {
    accounts: JSON.parse(JSON.stringify(defaultAccounts)),
    categories: JSON.parse(JSON.stringify(defaultCategories)),
    transactions: [],
    budgets: {},
    goals: []
  };
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

function resetAllData() {
  localStorage.removeItem(STORAGE_KEY);
  return getInitialData();
}

function exportBackupJSON(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `backup_keuangan_${today}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Helper untuk membaca seluruh baris dari tabel SQLite menjadi array of objects
 */
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

/**
 * Pemetaan tipe akun berdasarkan nama grup & nama aset Money Manager
 */
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
    combined.includes('kartu kredit') ||
    combined.includes('credit') ||
    combined.includes('paylater') ||
    combined.includes('pinjaman') ||
    combined.includes('hutang') ||
    combined.includes('utang') ||
    Number(groupType) === 2
  ) {
    return { type: 'credit', icon: '💳', color: '#f43f5e' };
  }

  return { type: 'bank', icon: '🏦', color: '#3b82f6' };
}

/**
 * Memilih ikon & warna otomatis yang relevan berdasarkan nama kategori
 */
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

/**
 * Mengonversi nilai WDATE / CDATE dari Money Manager ke format YYYY-MM-DD
 */
function parseMoneyManagerDate(row) {
  const candidates = [row.WDATE, row.DATE, row.CDATE, row.UDATE];
  for (const val of candidates) {
    if (val === null || val === undefined || val === '') continue;

    // Jika format string ISO atau tanggal teks: "2026-10-15" atau "2026/10/15 12:00:00"
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

    // Jika format epoch milliseconds atau seconds (angka)
    if (typeof val === 'number' && val > 0) {
      const dt = new Date(val > 1e11 ? val : val * 1000);
      if (!isNaN(dt.getTime()) && dt.getFullYear() >= 2000 && dt.getFullYear() <= 2100) {
        return dt.toISOString().slice(0, 10);
      }
    }
  }
  return new Date().toISOString().slice(0, 10);
}

/**
 * Impor file backup SQLite (.bin / .db / .sqlite) dari Money Manager
 * Menggunakan struktur asli tabel ASSETS, ASSETGROUP, ZCATEGORY, dan INOUTCOME.
 */
async function importSqliteBackup(arrayBuffer) {
  if (typeof initSqlJs !== 'function') {
    throw new Error('Library SQL.js belum dimuat. Pastikan koneksi internet aktif atau file sql-wasm tersedia.');
  }

  const SQL = await initSqlJs({
    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
  });

  const u8 = new Uint8Array(arrayBuffer);
  const db = new SQL.Database(u8);

  // 1. Baca Grup Akun (ASSETGROUP)
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

  // 2. Baca Daftar Akun / Aset (ASSETS)
  const rawAssets = queryRows(db, `SELECT * FROM ASSETS WHERE IFNULL(IS_DEL, 0) = 0 ORDER BY ORDERSEQ ASC, ID ASC`);
  if (!rawAssets.length) {
    throw new Error('Tabel ASSETS kosong atau file .bin bukan merupakan database Money Manager yang valid.');
  }

  const assetUidToAccountId = {};
  const accounts = rawAssets.map((a, idx) => {
    const uid = String(a.UID || a.uid || a.ID || `acc-${idx + 1}`);
    const accId = `acc-mm-${uid}`;
    assetUidToAccountId[uid] = accId;

    const grp = groupMap[String(a.GROUP_UID || a.groupUid || '')] || { name: '', type: 0 };
    const name = (a.NIC_NAME || a.NAME || `Akun ${idx + 1}`).trim();
    const meta = detectAccountMeta(grp.name, grp.type, name);

    // Saldo awal di Money Manager (jika ada kolom START_MONEY / INIT_MONEY)
    const initBal = Number(a.START_MONEY ?? a.INIT_MONEY ?? 0) || 0;

    return {
      id: accId,
      name,
      groupName: grp.name || 'Umum',
      type: meta.type,
      initialBalance: initBal,
      color: meta.color,
      icon: meta.icon
    };
  });

  const fallbackAccountId = accounts[0].id;

  // 3. Baca Kategori & Sub-kategori (ZCATEGORY)
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

    // C_TYPE di Money Manager: 0 = Income, 1 = Expense (kadang ada tipe lain)
    const isIncome = Number(c.C_TYPE) === 0;
    const type = isIncome ? 'income' : 'expense';
    const rawName = (c.NAME || 'Tanpa Kategori').trim();

    // Gabungkan nama induk jika memiliki pUid valid
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

  // Tambahkan kategori khusus untuk Penyesuaian Saldo (ctgUid = "-4" atau tanpa kategori)
  const adjIncomeCatId = 'cat-mm-adj-inc';
  const adjExpenseCatId = 'cat-mm-adj-exp';
  categories.push(
    { id: adjIncomeCatId, name: 'Penyesuaian Saldo (+)', type: 'income', color: '#059669', icon: '⚖️' },
    { id: adjExpenseCatId, name: 'Penyesuaian Saldo (-)', type: 'expense', color: '#64748b', icon: '⚖️' }
  );

  // Pastikan selalu ada kategori cadangan
  if (!categories.some(c => c.type === 'income')) {
    categories.push({ id: 'cat-mm-fallback-inc', name: 'Pemasukan Lainnya', type: 'income', color: '#10b981', icon: '💰' });
  }
  if (!categories.some(c => c.type === 'expense')) {
    categories.push({ id: 'cat-mm-fallback-exp', name: 'Pengeluaran Lainnya', type: 'expense', color: '#f43f5e', icon: '📦' });
  }

  const fallbackIncomeCatId = categories.find(c => c.type === 'income').id;
  const fallbackExpenseCatId = categories.find(c => c.type === 'expense').id;

  // 4. Baca Seluruh Transaksi (INOUTCOME)
  const rawTx = queryRows(db, `SELECT * FROM INOUTCOME WHERE IFNULL(IS_DEL, 0) = 0 ORDER BY WDATE ASC, ID ASC`);
  const transactions = [];
  const processedTransferUids = new Set();

  // Indeks transaksi berdasarkan UID untuk mencocokkan pasangan transfer (txUidTrans)
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

    // DO_TYPE di Money Manager:
    // 0 = Income (Pemasukan)
    // 1 = Expense (Pengeluaran)
    // 3 = Transfer Keluar (Sumber), 4 = Transfer Masuk (Tujuan)
    // 7 = Balance Adjustment / Penyesuaian Saldo khusus
    if (doType === '3' || doType === '4') {
      // Hindari duplikasi pasangan transfer jika kedua sisi tersimpan sebagai baris terpisah
      if (processedTransferUids.has(uid)) return;
      if (linkedTransUid) processedTransferUids.add(linkedTransUid);
      processedTransferUids.add(uid);

      let fromAccId = accountId;
      let toAccId = toAssetUid ? assetUidToAccountId[toAssetUid] : null;

      // Jika baris ini adalah sisi masuk (DO_TYPE = 4), balik arahnya agar konsisten (from -> to)
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

      // Tangani nominal negatif (misal koreksi transfer aset/emas di Money Manager)
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
          date,
          accountId: fromAccId,
          toAccountId: toAccId,
          categoryId: null,
          note: content || 'Transfer Antar Akun'
        });
      } else {
        // Fallback jika akun tujuan transfer sudah dihapus di aplikasi asal
        const isNegative = rawAmount < 0;
        transactions.push({
          id: `tx-mm-${uid}`,
          type: isNegative ? 'expense' : 'income',
          amount: finalAmount,
          date,
          accountId: fromAccId,
          categoryId: isNegative ? adjExpenseCatId : adjIncomeCatId,
          note: note || 'Transfer / Mutasi Aset'
        });
      }
      return;
    }

    // Penentuan Pemasukan vs Pengeluaran (termasuk DO_TYPE = 0, 1, 7 dan ctgUid = "-4")
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
      date,
      accountId,
      categoryId,
      note
    });
  });

  db.close();

  const newData = {
    accounts,
    categories,
    transactions,
    budgets: {},
    goals: []
  };

  saveData(newData);
  return {
    data: newData,
    stats: {
      accountsCount: accounts.length,
      categoriesCount: categories.length,
      transactionsCount: transactions.length
    }
  };
}