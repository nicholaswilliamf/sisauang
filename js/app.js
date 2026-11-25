/**
 * app.js - SisaUang (Money Manager Realbyte Style)
 * Logika utama aplikasi keuangan mobile modern:
 * - 4 Bottom Navigation Tabs: Transaksi, Statistik, Aset, Lainnya
 * - Transaksi: Pemilih Bulan, Ringkasan 3 Kolom, Grup Tanggal Flat List
 * - Statistik: Donut Chart Canvas, Switcher Pengeluaran/Pendapatan, Peringkat Kategori
 * - Aset: Ringkasan 3 Kolom (Aset, Liabilitas, Net Worth), 6 Kelompok Akun Flat List
 * - Lainnya: Menu Pengaturan, Mode Saldo, Kurs, Backup/Restore JSON & SQLite (.bin)
 * - 100% Offline dengan LocalStorage & Multi-Mata Uang
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Inisialisasi State Aplikasi
  let appState = window.SisaUang.Storage.loadData();

  const Currency = window.SisaUang.Currency;
  const Storage = window.SisaUang.Storage;
  const Config = window.SisaUang.Config;

  // Navigasi Tab Aktif: 'transaksi' | 'statistik' | 'aset' | 'lainnya'
  let currentTab = "transaksi";

  // Tanggal Bulan yang Sedang Dipilih (Default: Hari ini)
  let currentMonthDate = new Date();

  // Mode Statistik: 'expense' | 'income'
  let currentStatType = "expense";

  // Kata Kunci Pencarian Transaksi
  let searchQuery = "";
  let isSearchOpen = false;

  // Tipe Transaksi di Modal: 'expense' | 'income' | 'transfer'
  let activeTxModalType = "expense";

  // Helper XSS Escaping
  function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // 2. Elemen DOM
  const dom = {
    // Bottom Tab Bar
    tabBtnTransaksi: document.getElementById("tab-btn-transaksi"),
    tabBtnStatistik: document.getElementById("tab-btn-statistik"),
    tabBtnAset: document.getElementById("tab-btn-aset"),
    tabBtnLainnya: document.getElementById("tab-btn-lainnya"),

    // Header Panels
    headerPanelTransaksi: document.getElementById("header-panel-transaksi"),
    headerPanelStatistik: document.getElementById("header-panel-statistik"),
    headerPanelAset: document.getElementById("header-panel-aset"),
    headerPanelLainnya: document.getElementById("header-panel-lainnya"),

    // Content Pages
    pageTransaksi: document.getElementById("page-transaksi"),
    pageStatistik: document.getElementById("page-statistik"),
    pageAset: document.getElementById("page-aset"),
    pageLainnya: document.getElementById("page-lainnya"),

    // Header Transaksi & Pencarian
    btnPrevMonth: document.getElementById("btn-prev-month"),
    btnNextMonth: document.getElementById("btn-next-month"),
    displayCurrentMonth: document.getElementById("display-current-month"),
    btnToggleSearch: document.getElementById("btn-toggle-search"),
    searchBarWrap: document.getElementById("search-bar-wrap"),
    inputTxSearch: document.getElementById("input-tx-search"),
    btnClearSearch: document.getElementById("btn-clear-search"),

    // Bar Ringkasan 3 Kolom Transaksi
    transSumIncome: document.getElementById("trans-sum-income"),
    transSumExpense: document.getElementById("trans-sum-expense"),
    transSumNet: document.getElementById("trans-sum-net"),
    transDateGroupsContainer: document.getElementById("trans-date-groups-container"),

    // Header & Konten Statistik
    btnPrevMonthStat: document.getElementById("btn-prev-month-stat"),
    btnNextMonthStat: document.getElementById("btn-next-month-stat"),
    displayStatMonth: document.getElementById("display-stat-month"),
    btnStatExpense: document.getElementById("btn-stat-expense"),
    btnStatIncome: document.getElementById("btn-stat-income"),
    statDonutCanvas: document.getElementById("stat-donut-canvas"),
    donutCenterLabel: document.getElementById("donut-center-label"),
    donutCenterVal: document.getElementById("donut-center-val"),
    statRankingList: document.getElementById("stat-ranking-list"),

    // Header & Konten Aset
    btnOpenAccountTab3: document.getElementById("btn-open-account-tab3"),
    assetSumAssets: document.getElementById("asset-sum-assets"),
    assetSumLiabilities: document.getElementById("asset-sum-liabilities"),
    assetSumNetworth: document.getElementById("asset-sum-networth"),
    assetFlatGroupsList: document.getElementById("asset-flat-groups-list"),

    // Menu Lainnya
    menuBtnAddAccount: document.getElementById("menu-btn-add-account"),
    menuBtnCategories: document.getElementById("menu-btn-categories"),
    btnModeBase: document.getElementById("btn-mode-base"),
    btnModeCurr: document.getElementById("btn-mode-curr"),
    menuBtnRates: document.getElementById("menu-btn-rates"),
    menuBtnBackupExport: document.getElementById("menu-btn-backup-export"),
    menuBtnBackupImport: document.getElementById("menu-btn-backup-import"),
    menuBtnResetData: document.getElementById("menu-btn-reset-data"),

    // Floating Action Button
    fabAddTx: document.getElementById("fab-add-tx"),

    // Modal Transaksi
    modalTx: document.getElementById("modal-transaction"),
    btnCloseTx: document.getElementById("btn-close-tx-modal"),
    btnCancelTx: document.getElementById("btn-cancel-tx"),
    formTx: document.getElementById("form-transaction"),
    txModalTabButtons: document.querySelectorAll(".tx-modal-tab-btn"),
    txAmount: document.getElementById("tx-amount"),
    txCurrency: document.getElementById("tx-currency"),
    groupTxAccount: document.getElementById("group-tx-account"),
    labelTxAccount: document.getElementById("label-tx-account"),
    txAccount: document.getElementById("tx-account"),
    groupTxAccountTo: document.getElementById("group-tx-account-to"),
    txAccountTo: document.getElementById("tx-account-to"),
    groupTxCategory: document.getElementById("group-tx-category"),
    labelTxCategory: document.getElementById("label-tx-category"),
    txCategory: document.getElementById("tx-category"),
    creditPaymentNotice: document.getElementById("tx-credit-payment-notice"),
    loanPaymentNotice: document.getElementById("tx-loan-payment-notice"),
    txConversionPreview: document.getElementById("tx-conversion-preview"),
    txConversionText: document.getElementById("tx-conversion-text"),
    txDate: document.getElementById("tx-date"),
    txNote: document.getElementById("tx-note"),

    // Modal Akun
    modalAccount: document.getElementById("modal-account"),
    btnCloseAccount: document.getElementById("btn-close-account-modal"),
    btnCancelAccount: document.getElementById("btn-cancel-account"),
    formAccount: document.getElementById("form-account"),
    accountEditId: document.getElementById("account-edit-id"),
    accountType: document.getElementById("account-type"),
    accountTypeHint: document.getElementById("account-type-hint"),
    accountName: document.getElementById("account-name"),
    accountIcon: document.getElementById("account-icon"),
    accountColor: document.getElementById("account-color"),
    accountCurrency: document.getElementById("account-currency"),
    fieldInitialBalance: document.getElementById("field-initial-balance"),
    accountInitialBalance: document.getElementById("account-initial-balance"),
    fieldCreditLimit: document.getElementById("field-credit-limit"),
    accountCreditLimit: document.getElementById("account-credit-limit"),
    fieldLoanInitial: document.getElementById("field-loan-initial"),
    accountInitialLoan: document.getElementById("account-initial-loan"),
    fieldCreditInitialDebt: document.getElementById("field-credit-initial-debt"),
    accountInitialDebt: document.getElementById("account-initial-debt"),
    fieldCreditDates: document.getElementById("field-credit-dates"),
    accountStatementDay: document.getElementById("account-statement-day"),
    accountDueDay: document.getElementById("account-due-day"),
    modalAccountTitle: document.getElementById("modal-account-title"),

    // Modal Kategori
    modalCategories: document.getElementById("modal-categories"),
    btnCloseCategories: document.getElementById("btn-close-categories-modal"),
    btnDoneCategories: document.getElementById("btn-done-categories"),
    formAddCategory: document.getElementById("form-add-category"),
    newCatType: document.getElementById("new-cat-type"),
    newCatIcon: document.getElementById("new-cat-icon"),
    newCatName: document.getElementById("new-cat-name"),
    newCatColor: document.getElementById("new-cat-color"),
    listCategoriesExpense: document.getElementById("list-categories-expense"),
    listCategoriesIncome: document.getElementById("list-categories-income"),

    // Modal Kurs
    modalRates: document.getElementById("modal-rates"),
    btnCloseRates: document.getElementById("btn-close-rates-modal"),
    btnDoneRates: document.getElementById("btn-done-rates"),
    ratesModalList: document.getElementById("rates-modal-list"),
    ratesModalBaseCode: document.getElementById("rates-modal-base-code"),
    formAddCurrency: document.getElementById("form-add-currency"),
    newCurrCode: document.getElementById("new-curr-code"),
    newCurrSymbol: document.getElementById("new-curr-symbol"),
    newCurrName: document.getElementById("new-curr-name"),
    newCurrRate: document.getElementById("new-curr-rate"),

    // Modal Backup & Restore
    modalBackup: document.getElementById("modal-backup"),
    btnCloseBackup: document.getElementById("btn-close-backup-modal"),
    btnDoneBackup: document.getElementById("btn-done-backup"),
    btnExportJson: document.getElementById("btn-export-json"),
    btnExportBin: document.getElementById("btn-export-bin"),
    inputImportFile: document.getElementById("input-import-file"),
    btnImportJson: document.getElementById("btn-import-json"),
    importStatusMsg: document.getElementById("import-status-msg"),
    btnResetData: document.getElementById("btn-reset-data")
  };

  // 3. Helper Format Tanggal & Bulan
  function getSelectedMonthKey() {
    const y = currentMonthDate.getFullYear();
    const m = String(currentMonthDate.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  function getSelectedMonthDisplay() {
    return currentMonthDate.toLocaleDateString("id-ID", {
      month: "short",
      year: "numeric"
    });
  }

  // 4. Perhitungan Saldo Akun (Aset, Liabilitas, Net Worth)
  function calculateAccountBalances() {
    const balances = {};
    const creditDebts = {};
    const loanBalances = {};

    appState.accounts.forEach(acc => {
      const initBal = Number(acc.initialBalance) || 0;
      if (acc.type === "credit") {
        creditDebts[acc.id] = initBal;
        balances[acc.id] = 0;
        loanBalances[acc.id] = 0;
      } else if (acc.type === "loan") {
        loanBalances[acc.id] = initBal;
        balances[acc.id] = 0;
        creditDebts[acc.id] = 0;
      } else {
        balances[acc.id] = initBal;
        creditDebts[acc.id] = 0;
        loanBalances[acc.id] = 0;
      }
    });

    appState.transactions.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      const txCurr = tx.currency || appState.baseCurrency;

      if (tx.type === "expense") {
        const acc = appState.accounts.find(a => a.id === tx.account);
        if (acc) {
          const convertedAmt = Currency.convert(amt, txCurr, acc.currency, appState.currencies);
          if (acc.type === "credit") {
            creditDebts[acc.id] = (creditDebts[acc.id] || 0) + convertedAmt;
          } else {
            balances[acc.id] = (balances[acc.id] || 0) - convertedAmt;
          }
        }
      } else if (tx.type === "income") {
        const acc = appState.accounts.find(a => a.id === tx.account);
        if (acc) {
          const convertedAmt = Currency.convert(amt, txCurr, acc.currency, appState.currencies);
          if (acc.type === "credit") {
            creditDebts[acc.id] = Math.max(0, (creditDebts[acc.id] || 0) - convertedAmt);
          } else {
            balances[acc.id] = (balances[acc.id] || 0) + convertedAmt;
          }
        }
      } else if (tx.type === "transfer") {
        const fromAcc = appState.accounts.find(a => a.id === tx.account);
        const toAcc = appState.accounts.find(a => a.id === tx.accountTo);

        if (fromAcc) {
          const fromAmt = Currency.convert(amt, txCurr, fromAcc.currency, appState.currencies);
          if (fromAcc.type === "credit") {
            creditDebts[fromAcc.id] = (creditDebts[fromAcc.id] || 0) + fromAmt;
          } else {
            balances[fromAcc.id] = (balances[fromAcc.id] || 0) - fromAmt;
          }
        }

        if (toAcc) {
          const toAmt = Currency.convert(amt, txCurr, toAcc.currency, appState.currencies);
          if (toAcc.type === "credit") {
            creditDebts[toAcc.id] = Math.max(0, (creditDebts[toAcc.id] || 0) - toAmt);
          } else if (toAcc.type === "loan") {
            loanBalances[toAcc.id] = Math.max(0, (loanBalances[toAcc.id] || 0) - toAmt);
          } else {
            balances[toAcc.id] = (balances[toAcc.id] || 0) + toAmt;
          }
        }
      }
    });

    return { balances, creditDebts, loanBalances };
  }

  // Perhitungan Siklus Penagihan Kartu Kredit
  function calculateCCBillingCycle(account, todayDate) {
    const statementDay = account.statementDay || 15;
    const dueDay = account.dueDay || 5;

    const today = todayDate ? new Date(todayDate) : new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    let cycleEndYear = currentYear;
    let cycleEndMonth = currentMonth;

    if (currentDay > statementDay) {
      cycleEndMonth += 1;
      if (cycleEndMonth > 11) {
        cycleEndMonth = 0;
        cycleEndYear += 1;
      }
    }

    const cycleEndDate = new Date(cycleEndYear, cycleEndMonth, statementDay);

    let cycleStartMonth = cycleEndMonth - 1;
    let cycleStartYear = cycleEndYear;
    if (cycleStartMonth < 0) {
      cycleStartMonth = 11;
      cycleStartYear -= 1;
    }
    const cycleStartDate = new Date(cycleStartYear, cycleStartMonth, statementDay + 1);

    let dueYear = cycleEndYear;
    let dueMonth = cycleEndMonth;
    if (dueDay <= statementDay) {
      dueMonth += 1;
      if (dueMonth > 11) {
        dueMonth = 0;
        dueYear += 1;
      }
    }
    const dueDate = new Date(dueYear, dueMonth, dueDay);

    const fmt = d => d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    const fmtFull = d => d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    const cycleRangeText = `${fmt(cycleStartDate)} – ${fmtFull(cycleEndDate)}`;
    const dueDateText = fmtFull(dueDate);

    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    let dueStatusText = `Jatuh tempo: ${dueDateText}`;
    let isWarning = false;

    if (diffDays < 0) {
      dueStatusText = `⚠️ Terlewat ${Math.abs(diffDays)} hari (${dueDateText})`;
      isWarning = true;
    } else if (diffDays <= 7) {
      dueStatusText = `⏰ Jatuh tempo ${diffDays} hari lagi (${dueDateText})`;
      isWarning = true;
    }

    return {
      cycleStartDate,
      cycleEndDate,
      dueDate,
      cycleRangeText,
      dueDateText,
      dueStatusText,
      isWarning
    };
  }

  // 5. Perhitungan Arus Kas Bulan yang Dipilih
  function calculateMonthCashflow(monthKey) {
    let incomeInBase = 0;
    let expenseInBase = 0;

    appState.transactions.forEach(tx => {
      if (!tx.date || !tx.date.startsWith(monthKey)) return;

      const amt = Number(tx.amount) || 0;
      const txCurr = tx.currency || appState.baseCurrency;
      const inBase = Currency.convert(amt, txCurr, appState.baseCurrency, appState.currencies);

      if (tx.type === "income") {
        incomeInBase += inBase;
      } else if (tx.type === "expense") {
        expenseInBase += inBase;
      }
    });

    return {
      income: incomeInBase,
      expense: expenseInBase,
      net: incomeInBase - expenseInBase
    };
  }

  // 6. RENDER HALAMAN TAB 1: TRANSAKSI (Gaya Money Manager)
  function renderTabTransaksi() {
    const monthKey = getSelectedMonthKey();
    const monthFlow = calculateMonthCashflow(monthKey);

    // Update 3 Kolom Summary Bar Transaksi
    dom.transSumIncome.textContent = Currency.format(monthFlow.income, appState.baseCurrency, appState.currencies);
    dom.transSumExpense.textContent = Currency.format(monthFlow.expense, appState.baseCurrency, appState.currencies);

    const netFormatted = Currency.format(monthFlow.net, appState.baseCurrency, appState.currencies);
    dom.transSumNet.textContent = (monthFlow.net > 0 ? "+" : "") + netFormatted;
    if (monthFlow.net > 0) {
      dom.transSumNet.style.color = "#a7f3d0";
    } else if (monthFlow.net < 0) {
      dom.transSumNet.style.color = "#fecdd3";
    } else {
      dom.transSumNet.style.color = "#ffffff";
    }

    // Filter transaksi berdasarkan bulan & query pencarian
    let txs = appState.transactions.filter(t => t.date && t.date.startsWith(monthKey));

    if (searchQuery.trim() !== "") {
      const q = searchQuery.trim().toLowerCase();
      txs = txs.filter(t => {
        const note = (t.note || "").toLowerCase();
        const cat = appState.categories.find(c => c.id === t.category);
        const catName = cat ? cat.name.toLowerCase() : "";
        const acc = appState.accounts.find(a => a.id === t.account);
        const accName = acc ? acc.name.toLowerCase() : "";
        return note.includes(q) || catName.includes(q) || accName.includes(q);
      });
    }

    dom.transDateGroupsContainer.innerHTML = "";

    if (txs.length === 0) {
      dom.transDateGroupsContainer.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-state-icon">📝</div>
          <div class="empty-state-title">Belum Ada Transaksi</div>
          <div class="empty-state-desc">
            ${searchQuery ? "Tidak ditemukan transaksi sesuai pencarian Anda." : `Belum ada catatan transaksi pada bulan ${escapeHTML(getSelectedMonthDisplay())}. Tekan tombol '+' di bawah untuk mencatat.`}
          </div>
        </div>
      `;
      return;
    }

    // Kelompokkan transaksi per tanggal descending
    const dateGroups = {};
    txs.forEach(t => {
      const d = t.date;
      if (!dateGroups[d]) dateGroups[d] = [];
      dateGroups[d].push(t);
    });

    const sortedDates = Object.keys(dateGroups).sort((a, b) => b.localeCompare(a));
    const frag = document.createDocumentFragment();

    sortedDates.forEach(dateStr => {
      const dayTxs = dateGroups[dateStr];
      const dateObj = new Date(dateStr + "T00:00:00");
      const dayNum = dateObj.getDate();
      const dayOfWeek = dateObj.getDay();
      const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
      const dayName = dayNames[dayOfWeek] || "";

      let dayBadgeClass = "day-weekday";
      if (dayOfWeek === 0) dayBadgeClass = "day-sun";
      if (dayOfWeek === 6) dayBadgeClass = "day-sat";

      const monthYearStr = String(dateObj.getMonth() + 1).padStart(2, "0") + "." + dateObj.getFullYear();

      // Hitung total pemasukan & pengeluaran pada hari ini
      let dayIncome = 0;
      let dayExpense = 0;
      dayTxs.forEach(t => {
        const amt = Number(t.amount) || 0;
        const txCurr = t.currency || appState.baseCurrency;
        const inBase = Currency.convert(amt, txCurr, appState.baseCurrency, appState.currencies);
        if (t.type === "income") dayIncome += inBase;
        if (t.type === "expense") dayExpense += inBase;
      });

      const groupEl = document.createElement("div");
      groupEl.className = "day-group-section";

      const headerEl = document.createElement("div");
      headerEl.className = "day-group-header";
      headerEl.innerHTML = `
        <div class="day-header-left">
          <span class="day-big-date">${dayNum}</span>
          <span class="day-badge ${dayBadgeClass}">${dayName}</span>
          <span class="day-month-year">${monthYearStr}</span>
        </div>
        <div class="day-header-right">
          ${dayIncome > 0 ? `<span class="day-income-total tabular-nums">+${escapeHTML(Currency.format(dayIncome, appState.baseCurrency, appState.currencies))}</span>` : ""}
          ${dayExpense > 0 ? `<span class="day-expense-total tabular-nums">-${escapeHTML(Currency.format(dayExpense, appState.baseCurrency, appState.currencies))}</span>` : ""}
        </div>
      `;
      groupEl.appendChild(headerEl);

      dayTxs.forEach(tx => {
        const rowEl = document.createElement("div");
        rowEl.className = "tx-flat-item";

        const cat = appState.categories.find(c => c.id === tx.category);
        let catIcon = "💸";
        let catColor = "#ef4444";
        let catName = "Pengeluaran";

        if (tx.type === "income") {
          catIcon = "💰";
          catColor = "#10b981";
          catName = "Pemasukan";
        } else if (tx.type === "transfer") {
          catIcon = "🔄";
          catColor = "#3b82f6";
          catName = "Transfer";
        }

        if (cat) {
          catIcon = cat.icon || catIcon;
          catColor = cat.color || catColor;
          catName = cat.name || catName;
        }

        const fromAcc = appState.accounts.find(a => a.id === tx.account);
        const toAcc = appState.accounts.find(a => a.id === tx.accountTo);

        let accountText = fromAcc ? fromAcc.name : "Akun";
        if (tx.type === "transfer" && toAcc) {
          accountText = `${fromAcc ? fromAcc.name : "?"} → ${toAcc.name}`;
        }

        const amtStr = Currency.format(tx.amount, tx.currency, appState.currencies);
        let sign = "-";
        let amtClass = "expense";

        if (tx.type === "income") {
          sign = "+";
          amtClass = "income";
        } else if (tx.type === "transfer") {
          sign = "";
          amtClass = "transfer";
        }

        rowEl.innerHTML = `
          <div class="tx-flat-icon-wrap" style="background-color: ${escapeHTML(catColor)}18; color: ${escapeHTML(catColor)};">
            ${escapeHTML(catIcon)}
          </div>
          <div class="tx-flat-info">
            <div class="tx-flat-title-row">
              <span class="tx-flat-cat-name">${escapeHTML(catName)}</span>
              ${tx.note ? `<span class="tx-flat-note">${escapeHTML(tx.note)}</span>` : ""}
            </div>
            <div class="tx-flat-account-name">${escapeHTML(accountText)}</div>
          </div>
          <div class="tx-flat-right">
            <div class="tx-flat-amount ${amtClass} tabular-nums">${sign}${escapeHTML(amtStr)}</div>
            <button type="button" class="btn-del-tx-flat" data-id="${escapeHTML(tx.id)}" title="Hapus Transaksi">×</button>
          </div>
        `;

        groupEl.appendChild(rowEl);
      });

      frag.appendChild(groupEl);
    });

    dom.transDateGroupsContainer.appendChild(frag);
  }

  // Event Delegation untuk Hapus Transaksi
  dom.transDateGroupsContainer.addEventListener("click", e => {
    const delBtn = e.target.closest(".btn-del-tx-flat");
    if (delBtn) {
      e.stopPropagation();
      deleteTransaction(delBtn.dataset.id);
    }
  });

  // 7. RENDER HALAMAN TAB 2: STATISTIK & DONUT CHART
  function renderTabStatistik() {
    const monthKey = getSelectedMonthKey();

    const txs = appState.transactions.filter(
      t => t.date && t.date.startsWith(monthKey) && t.type === currentStatType
    );

    const categorySums = {};
    let totalInBase = 0;

    txs.forEach(t => {
      const amt = Number(t.amount) || 0;
      const txCurr = t.currency || appState.baseCurrency;
      const inBase = Currency.convert(amt, txCurr, appState.baseCurrency, appState.currencies);

      const catId = t.category || "uncategorized";
      categorySums[catId] = (categorySums[catId] || 0) + inBase;
      totalInBase += inBase;
    });

    dom.donutCenterLabel.textContent = currentStatType === "expense" ? "Total Pengeluaran" : "Total Pendapatan";
    dom.donutCenterVal.textContent = Currency.format(totalInBase, appState.baseCurrency, appState.currencies);

    drawDonutChart(categorySums, totalInBase);

    dom.statRankingList.innerHTML = "";

    const catIds = Object.keys(categorySums);
    if (totalInBase <= 0 || catIds.length === 0) {
      dom.statRankingList.innerHTML = `
        <div style="padding: 2rem 1rem; text-align: center; color: var(--color-gray-400); font-size: 0.85rem;">
          Belum ada catatan ${currentStatType === "expense" ? "pengeluaran" : "pemasukan"} pada bulan ini.
        </div>
      `;
      return;
    }

    const sortedCats = catIds
      .map(id => {
        const cat = appState.categories.find(c => c.id === id) || {
          name: "Lainnya",
          icon: "🏷️",
          color: "#9ca3af"
        };
        const sum = categorySums[id];
        const pct = Math.max(1, Math.round((sum / totalInBase) * 100));
        return { id, ...cat, sum, pct };
      })
      .sort((a, b) => b.sum - a.sum);

    const frag = document.createDocumentFragment();
    sortedCats.forEach(item => {
      const row = document.createElement("div");
      row.className = "stat-cat-row";
      row.innerHTML = `
        <div class="stat-pct-badge" style="background-color: ${escapeHTML(item.color)};">
          ${item.pct}%
        </div>
        <div class="stat-cat-body">
          <div class="stat-cat-title-row">
            <span class="stat-cat-name">${escapeHTML(item.icon)} ${escapeHTML(item.name)}</span>
            <span class="stat-cat-val tabular-nums">${escapeHTML(Currency.format(item.sum, appState.baseCurrency, appState.currencies))}</span>
          </div>
          <div class="stat-cat-bar-bg">
            <div class="stat-cat-bar-fill" style="width: ${item.pct}%; background-color: ${escapeHTML(item.color)};"></div>
          </div>
        </div>
      `;
      frag.appendChild(row);
    });
    dom.statRankingList.appendChild(frag);
  }

  function drawDonutChart(categorySums, total) {
    const canvas = dom.statDonutCanvas;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const size = 220;

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = 80;
    const lineWidth = 26;

    if (total <= 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = "#e5e7eb";
      ctx.stroke();
      return;
    }

    let startAngle = -0.5 * Math.PI;

    Object.keys(categorySums).forEach(catId => {
      const sum = categorySums[catId];
      if (sum <= 0) return;

      const sliceAngle = (sum / total) * (2 * Math.PI);
      const cat = appState.categories.find(c => c.id === catId);
      const color = cat && cat.color ? cat.color : "#10b981";

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = color;
      ctx.stroke();

      startAngle += sliceAngle;
    });
  }

  // 8. RENDER HALAMAN TAB 3: ASET & LIABILITAS (6 Kelompok Akun)
  function renderTabAset() {
    const { balances, creditDebts, loanBalances } = calculateAccountBalances();

    let totalLiquidInBase = 0;
    let totalInvestInBase = 0;
    let totalCreditDebtInBase = 0;
    let totalLoanInBase = 0;

    appState.accounts.forEach(acc => {
      const accCurr = acc.currency || appState.baseCurrency;

      if (acc.type === "credit") {
        const debt = creditDebts[acc.id] || 0;
        totalCreditDebtInBase += Currency.convert(debt, accCurr, appState.baseCurrency, appState.currencies);
      } else if (acc.type === "loan") {
        const loanBal = loanBalances[acc.id] || 0;
        totalLoanInBase += Currency.convert(loanBal, accCurr, appState.baseCurrency, appState.currencies);
      } else if (acc.type === "investment") {
        const bal = balances[acc.id] || 0;
        totalInvestInBase += Currency.convert(bal, accCurr, appState.baseCurrency, appState.currencies);
      } else {
        const bal = balances[acc.id] || 0;
        totalLiquidInBase += Currency.convert(bal, accCurr, appState.baseCurrency, appState.currencies);
      }
    });

    const totalAssetsInBase = totalLiquidInBase + totalInvestInBase;
    const totalLiabilitiesInBase = totalCreditDebtInBase + totalLoanInBase;
    const netWorthInBase = totalAssetsInBase - totalLiabilitiesInBase;

    dom.assetSumAssets.textContent = Currency.format(totalAssetsInBase, appState.baseCurrency, appState.currencies);
    dom.assetSumLiabilities.textContent = Currency.format(totalLiabilitiesInBase, appState.baseCurrency, appState.currencies);
    dom.assetSumNetworth.textContent = Currency.format(netWorthInBase, appState.baseCurrency, appState.currencies);

    dom.assetFlatGroupsList.innerHTML = "";

    const groupsOrder = [
      { id: "cash", name: "Uang Tunai / Cash", icon: "💵" },
      { id: "bank", name: "Rekening Bank", icon: "🏦" },
      { id: "ewallet", name: "E-Wallet", icon: "📱" },
      { id: "credit", name: "Kartu Kredit & PayLater", icon: "💳" },
      { id: "loan", name: "Pinjaman & Cicilan Pokok", icon: "🤝" },
      { id: "investment", name: "Investasi & Aset", icon: "📈" }
    ];

    const frag = document.createDocumentFragment();

    groupsOrder.forEach(grp => {
      const accs = appState.accounts.filter(a => a.type === grp.id);
      if (accs.length === 0) return;

      let groupSubtotalInBase = 0;
      accs.forEach(acc => {
        const accCurr = acc.currency || appState.baseCurrency;
        let val = 0;
        if (acc.type === "credit") val = creditDebts[acc.id] || 0;
        else if (acc.type === "loan") val = loanBalances[acc.id] || 0;
        else val = balances[acc.id] || 0;

        groupSubtotalInBase += Currency.convert(val, accCurr, appState.baseCurrency, appState.currencies);
      });

      const sectionEl = document.createElement("div");
      sectionEl.className = "asset-group-section";

      const hdrEl = document.createElement("div");
      hdrEl.className = "asset-group-hdr";
      hdrEl.innerHTML = `
        <div class="asset-group-hdr-left">
          <span>${grp.icon}</span>
          <span>${escapeHTML(grp.name)} (${accs.length})</span>
        </div>
        <div class="asset-group-subtotal tabular-nums">
          ${escapeHTML(Currency.format(groupSubtotalInBase, appState.baseCurrency, appState.currencies))}
        </div>
      `;
      sectionEl.appendChild(hdrEl);

      accs.forEach(acc => {
        const rowEl = document.createElement("div");
        rowEl.className = "asset-item-flat";

        const accCurr = acc.currency || appState.baseCurrency;
        const isBase = accCurr === appState.baseCurrency;

        if (acc.type === "credit") {
          const debt = creditDebts[acc.id] || 0;
          const limit = Number(acc.creditLimit) || 0;
          const availLimit = Math.max(0, limit - debt);
          const cycle = calculateCCBillingCycle(acc);

          rowEl.innerHTML = `
            <div class="asset-item-icon" style="background-color: #fee2e2; color: #ef4444;">
              ${escapeHTML(acc.icon || "💳")}
            </div>
            <div class="asset-item-details">
              <div class="asset-item-title">${escapeHTML(acc.name)}</div>
              <div class="asset-item-meta">Cetak Tgl ${acc.statementDay || 15} • Jth Tempo Tgl ${acc.dueDay || 5}</div>
              <div class="asset-cc-cycle-tag ${cycle.isWarning ? "warning" : "normal"}">
                ${escapeHTML(cycle.dueStatusText)} • Periode: ${escapeHTML(cycle.cycleRangeText)}
              </div>
            </div>
            <div class="asset-item-right">
              <div class="asset-item-amount text-expense tabular-nums">
                ${escapeHTML(Currency.format(debt, accCurr, appState.currencies))} <span class="cc-tagihan-lbl">(Tagihan)</span>
              </div>
              <div class="asset-cc-limit tabular-nums">
                Sisa Limit: ${escapeHTML(Currency.format(availLimit, accCurr, appState.currencies))}
              </div>
              <div class="asset-item-btn-group">
                <button type="button" class="btn-acc-action btn-edit-account" data-id="${escapeHTML(acc.id)}">✏️</button>
                <button type="button" class="btn-acc-action btn-delete-account" data-id="${escapeHTML(acc.id)}">🗑️</button>
              </div>
            </div>
          `;
        } else if (acc.type === "loan") {
          const loanBal = loanBalances[acc.id] || 0;

          rowEl.innerHTML = `
            <div class="asset-item-icon" style="background-color: #fffbeb; color: #b45309;">
              ${escapeHTML(acc.icon || "🤝")}
            </div>
            <div class="asset-item-details">
              <div class="asset-item-title">${escapeHTML(acc.name)}</div>
              <div class="asset-item-meta">Kewajiban Pokok Pinjaman • ${escapeHTML(accCurr)}</div>
            </div>
            <div class="asset-item-right">
              <div class="asset-item-amount text-expense tabular-nums">
                ${escapeHTML(Currency.format(loanBal, accCurr, appState.currencies))}
              </div>
              <div class="asset-item-btn-group">
                <button type="button" class="btn-acc-action btn-edit-account" data-id="${escapeHTML(acc.id)}">✏️</button>
                <button type="button" class="btn-acc-action btn-delete-account" data-id="${escapeHTML(acc.id)}">🗑️</button>
              </div>
            </div>
          `;
        } else {
          const bal = balances[acc.id] || 0;
          const balInBase = Currency.convert(bal, accCurr, appState.baseCurrency, appState.currencies);

          rowEl.innerHTML = `
            <div class="asset-item-icon" style="background-color: ${escapeHTML(acc.color || "#059669")}18; color: ${escapeHTML(acc.color || "#059669")};">
              ${escapeHTML(acc.icon || "🏦")}
            </div>
            <div class="asset-item-details">
              <div class="asset-item-title">${escapeHTML(acc.name)}</div>
              <div class="asset-item-meta">${escapeHTML(accCurr)} • ${acc.type === "investment" ? "Aset Non-Likuid" : "Aset Likuid"}</div>
            </div>
            <div class="asset-item-right">
              <div class="asset-item-amount tabular-nums">
                ${escapeHTML(Currency.format(bal, accCurr, appState.currencies))}
              </div>
              ${!isBase ? `<div class="asset-item-sub-converted tabular-nums">≈ ${escapeHTML(Currency.format(balInBase, appState.baseCurrency, appState.currencies))}</div>` : ""}
              <div class="asset-item-btn-group">
                <button type="button" class="btn-acc-action btn-edit-account" data-id="${escapeHTML(acc.id)}">✏️</button>
                <button type="button" class="btn-acc-action btn-delete-account" data-id="${escapeHTML(acc.id)}">🗑️</button>
              </div>
            </div>
          `;
        }

        sectionEl.appendChild(rowEl);
      });

      frag.appendChild(sectionEl);
    });

    dom.assetFlatGroupsList.appendChild(frag);
  }

  // Event Delegation untuk Edit & Hapus Akun
  dom.assetFlatGroupsList.addEventListener("click", e => {
    const editBtn = e.target.closest(".btn-edit-account");
    if (editBtn) {
      e.stopPropagation();
      openEditAccountModal(editBtn.dataset.id);
      return;
    }
    const delBtn = e.target.closest(".btn-delete-account");
    if (delBtn) {
      e.stopPropagation();
      deleteAccount(delBtn.dataset.id);
    }
  });

  // 9. RENDER HALAMAN TAB 4: LAINNYA
  function renderTabLainnya() {
    dom.btnModeBase.classList.toggle("active", appState.viewMode === "base");
    dom.btnModeCurr.classList.toggle("active", appState.viewMode === "currency");
  }

  // 10. RENDER UTAMA (RENDER ALL)
  function renderAll() {
    const monthText = getSelectedMonthDisplay();
    if (dom.displayCurrentMonth) dom.displayCurrentMonth.textContent = monthText;
    if (dom.displayStatMonth) dom.displayStatMonth.textContent = monthText;

    renderTabTransaksi();
    renderTabStatistik();
    renderTabAset();
    renderTabLainnya();
  }

  // 11. NAVIGASI BOTTOM TAB BAR (4 TABS)
  function switchTab(tabId) {
    currentTab = tabId;

    dom.tabBtnTransaksi.classList.toggle("active", tabId === "transaksi");
    dom.tabBtnStatistik.classList.toggle("active", tabId === "statistik");
    dom.tabBtnAset.classList.toggle("active", tabId === "aset");
    dom.tabBtnLainnya.classList.toggle("active", tabId === "lainnya");

    dom.headerPanelTransaksi.style.display = tabId === "transaksi" ? "flex" : "none";
    dom.headerPanelStatistik.style.display = tabId === "statistik" ? "flex" : "none";
    dom.headerPanelAset.style.display = tabId === "aset" ? "flex" : "none";
    dom.headerPanelLainnya.style.display = tabId === "lainnya" ? "flex" : "none";

    dom.pageTransaksi.style.display = tabId === "transaksi" ? "flex" : "none";
    dom.pageStatistik.style.display = tabId === "statistik" ? "flex" : "none";
    dom.pageAset.style.display = tabId === "aset" ? "flex" : "none";
    dom.pageLainnya.style.display = tabId === "lainnya" ? "flex" : "none";

    dom.fabAddTx.style.display = tabId === "transaksi" ? "flex" : "none";

    if (tabId === "statistik") renderTabStatistik();
    if (tabId === "aset") renderTabAset();
    if (tabId === "transaksi") renderTabTransaksi();
  }

  dom.tabBtnTransaksi.addEventListener("click", () => switchTab("transaksi"));
  dom.tabBtnStatistik.addEventListener("click", () => switchTab("statistik"));
  dom.tabBtnAset.addEventListener("click", () => switchTab("aset"));
  dom.tabBtnLainnya.addEventListener("click", () => switchTab("lainnya"));

  // 12. NAVIGASI BULAN (SEBELUMNYA & BERIKUTNYA)
  function changeMonth(delta) {
    currentMonthDate.setMonth(currentMonthDate.getMonth() + delta);
    renderAll();
  }

  dom.btnPrevMonth.addEventListener("click", () => changeMonth(-1));
  dom.btnNextMonth.addEventListener("click", () => changeMonth(1));
  dom.btnPrevMonthStat.addEventListener("click", () => changeMonth(-1));
  dom.btnNextMonthStat.addEventListener("click", () => changeMonth(1));

  // Switcher Tipe Statistik
  dom.btnStatExpense.addEventListener("click", () => {
    currentStatType = "expense";
    dom.btnStatExpense.classList.add("active");
    dom.btnStatIncome.classList.remove("active");
    renderTabStatistik();
  });

  dom.btnStatIncome.addEventListener("click", () => {
    currentStatType = "income";
    dom.btnStatIncome.classList.add("active");
    dom.btnStatExpense.classList.remove("active");
    renderTabStatistik();
  });

  // Pencarian Cepat Transaksi (dengan Debounce)
  let searchTimeout = null;
  dom.btnToggleSearch.addEventListener("click", () => {
    isSearchOpen = !isSearchOpen;
    dom.searchBarWrap.style.display = isSearchOpen ? "flex" : "none";
    if (isSearchOpen) {
      dom.inputTxSearch.focus();
    } else {
      searchQuery = "";
      dom.inputTxSearch.value = "";
      renderTabTransaksi();
    }
  });

  dom.inputTxSearch.addEventListener("input", e => {
    clearTimeout(searchTimeout);
    const val = e.target.value;
    searchTimeout = setTimeout(() => {
      searchQuery = val;
      renderTabTransaksi();
    }, 200);
  });

  dom.btnClearSearch.addEventListener("click", () => {
    searchQuery = "";
    dom.inputTxSearch.value = "";
    dom.searchBarWrap.style.display = "none";
    isSearchOpen = false;
    renderTabTransaksi();
  });

  // FAB Catat Transaksi
  dom.fabAddTx.addEventListener("click", openTxModal);

  // 13. MODAL 1: CATAT TRANSAKSI
  function openTxModal() {
    dom.formTx.reset();
    activeTxModalType = "expense";
    setTxModalTypeTab("expense");
    dom.txDate.value = new Date().toISOString().slice(0, 10);
    dom.txCurrency.value = appState.baseCurrency;
    updateLiveConversionPreview();
    dom.modalTx.classList.add("open");
  }

  function closeTxModal() {
    dom.modalTx.classList.remove("open");
  }

  function setTxModalTypeTab(type) {
    activeTxModalType = type;
    dom.txModalTabButtons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.type === type);
    });

    if (type === "transfer") {
      dom.labelTxAccount.textContent = "Kirim dari Akun";
      dom.groupTxAccountTo.style.display = "block";
      dom.txAccountTo.required = true;
      dom.groupTxCategory.style.display = "none";
      dom.txCategory.required = false;
    } else {
      dom.labelTxAccount.textContent = type === "income" ? "Terima di Akun" : "Bayar dari Akun";
      dom.groupTxAccountTo.style.display = "none";
      dom.txAccountTo.required = false;
      dom.groupTxCategory.style.display = "block";
      dom.txCategory.required = true;
      populateCategoryDropdown();
    }
    updateLiveConversionPreview();
  }

  dom.txModalTabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      setTxModalTypeTab(btn.dataset.type);
    });
  });

  function updateLiveConversionPreview() {
    const amt = parseFloat(dom.txAmount.value) || 0;
    const txCurr = dom.txCurrency.value;
    const targetAccId = dom.txAccount.value;
    const targetAcc = appState.accounts.find(a => a.id === targetAccId);

    if (activeTxModalType === "transfer") {
      const toAccId = dom.txAccountTo.value;
      const toAcc = appState.accounts.find(a => a.id === toAccId);

      if (toAcc && toAcc.type === "credit") {
        dom.creditPaymentNotice.style.display = "flex";
        dom.loanPaymentNotice.style.display = "none";
      } else if (toAcc && toAcc.type === "loan") {
        dom.creditPaymentNotice.style.display = "none";
        dom.loanPaymentNotice.style.display = "flex";
      } else {
        dom.creditPaymentNotice.style.display = "none";
        dom.loanPaymentNotice.style.display = "none";
      }
    } else {
      dom.creditPaymentNotice.style.display = "none";
      dom.loanPaymentNotice.style.display = "none";
    }

    if (amt > 0 && targetAcc && targetAcc.currency !== txCurr) {
      const converted = Currency.convert(amt, txCurr, targetAcc.currency, appState.currencies);
      dom.txConversionPreview.style.display = "flex";
      dom.txConversionText.textContent = `Konversi: ${Currency.format(amt, txCurr, appState.currencies)} ≈ ${Currency.format(converted, targetAcc.currency, appState.currencies)} pada akun tujuan.`;
    } else {
      dom.txConversionPreview.style.display = "none";
    }
  }

  dom.txAmount.addEventListener("input", updateLiveConversionPreview);
  dom.txCurrency.addEventListener("change", updateLiveConversionPreview);
  dom.txAccount.addEventListener("change", updateLiveConversionPreview);
  dom.txAccountTo.addEventListener("change", updateLiveConversionPreview);

  function populateAccountDropdowns() {
    dom.txAccount.innerHTML = "";
    dom.txAccountTo.innerHTML = "";

    const groupNames = {
      cash: "Uang Tunai / Cash",
      bank: "Rekening Bank",
      ewallet: "E-Wallet",
      credit: "Kartu Kredit",
      loan: "Pinjaman",
      investment: "Investasi / Aset"
    };

    const grouped = {};
    appState.accounts.forEach(acc => {
      const t = acc.type || "bank";
      if (!grouped[t]) grouped[t] = [];
      grouped[t].push(acc);
    });

    Object.keys(groupNames).forEach(typeKey => {
      if (!grouped[typeKey] || grouped[typeKey].length === 0) return;

      const optGroupFrom = document.createElement("optgroup");
      optGroupFrom.label = groupNames[typeKey];

      const optGroupTo = document.createElement("optgroup");
      optGroupTo.label = groupNames[typeKey];

      grouped[typeKey].forEach(acc => {
        const optFrom = document.createElement("option");
        optFrom.value = acc.id;
        optFrom.textContent = `${acc.icon || "🏦"} ${acc.name} (${acc.currency})`;
        optGroupFrom.appendChild(optFrom);

        const optTo = document.createElement("option");
        optTo.value = acc.id;
        optTo.textContent = `${acc.icon || "🏦"} ${acc.name} (${acc.currency})`;
        optGroupTo.appendChild(optTo);
      });

      dom.txAccount.appendChild(optGroupFrom);
      dom.txAccountTo.appendChild(optGroupTo);
    });

    if (dom.txAccountTo.options.length > 1) {
      dom.txAccountTo.selectedIndex = 1;
    }
  }

  function populateCategoryDropdown() {
    dom.txCategory.innerHTML = "";
    const filterType = activeTxModalType === "income" ? "income" : "expense";
    const available = appState.categories.filter(c => c.type === filterType);

    available.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = `${cat.icon || "🏷️"} ${cat.name}`;
      dom.txCategory.appendChild(opt);
    });
  }

  function populateCurrencyDropdowns() {
    dom.txCurrency.innerHTML = "";
    dom.accountCurrency.innerHTML = "";

    Object.keys(appState.currencies).forEach(code => {
      const c = appState.currencies[code];
      const opt1 = document.createElement("option");
      opt1.value = code;
      opt1.textContent = `${code} - ${c.name} (${c.symbol})`;
      dom.txCurrency.appendChild(opt1);

      const opt2 = document.createElement("option");
      opt2.value = code;
      opt2.textContent = `${code} - ${c.name} (${c.symbol})`;
      dom.accountCurrency.appendChild(opt2);
    });
  }

  dom.btnCloseTx.addEventListener("click", closeTxModal);
  dom.btnCancelTx.addEventListener("click", closeTxModal);

  dom.formTx.addEventListener("submit", e => {
    e.preventDefault();

    const amt = parseFloat(dom.txAmount.value);
    const curr = dom.txCurrency.value;
    const accId = dom.txAccount.value;
    const accToId = dom.txAccountTo.value;
    const catId = dom.txCategory.value;
    const dateVal = dom.txDate.value;
    const noteVal = dom.txNote.value.trim();

    if (!amt || amt <= 0) {
      alert("Masukkan nominal transaksi yang valid!");
      return;
    }

    if (activeTxModalType === "transfer" && accId === accToId) {
      alert("Akun sumber dan akun tujuan tidak boleh sama!");
      return;
    }

    const newTx = {
      id: "tx-" + Date.now(),
      type: activeTxModalType,
      amount: amt,
      currency: curr,
      account: accId,
      date: dateVal || new Date().toISOString().slice(0, 10),
      note: noteVal
    };

    if (activeTxModalType === "transfer") {
      newTx.accountTo = accToId;
    } else {
      newTx.category = catId;
    }

    appState.transactions.unshift(newTx);
    Storage.saveData(appState);

    closeTxModal();
    renderAll();
  });

  function deleteTransaction(txId) {
    if (!confirm("Hapus transaksi ini?")) return;
    appState.transactions = appState.transactions.filter(t => t.id !== txId);
    Storage.saveData(appState);
    renderAll();
  }

  // 14. MODAL 2: TAMBAH / EDIT AKUN
  function openAddAccountModal() {
    dom.formAccount.reset();
    dom.accountEditId.value = "";
    dom.modalAccountTitle.textContent = "Tambah Akun Keuangan";
    dom.accountType.value = "bank";
    updateAccountModalFields("bank");
    dom.accountCurrency.value = appState.baseCurrency;
    dom.modalAccount.classList.add("open");
  }

  function openEditAccountModal(accId) {
    const acc = appState.accounts.find(a => a.id === accId);
    if (!acc) return;

    dom.accountEditId.value = acc.id;
    dom.modalAccountTitle.textContent = "Edit Akun Keuangan";
    dom.accountType.value = acc.type;
    updateAccountModalFields(acc.type);
    dom.accountName.value = acc.name;
    dom.accountIcon.value = acc.icon || "🏦";
    dom.accountColor.value = acc.color || "#059669";
    dom.accountCurrency.value = acc.currency || appState.baseCurrency;

    if (acc.type === "credit") {
      dom.accountCreditLimit.value = acc.creditLimit || "";
      dom.accountInitialDebt.value = acc.initialBalance || 0;
      dom.accountStatementDay.value = acc.statementDay || 15;
      dom.accountDueDay.value = acc.dueDay || 5;
    } else if (acc.type === "loan") {
      dom.accountInitialLoan.value = acc.initialBalance || 0;
    } else {
      dom.accountInitialBalance.value = acc.initialBalance || 0;
    }

    dom.modalAccount.classList.add("open");
  }

  function closeAccountModal() {
    dom.modalAccount.classList.remove("open");
  }

  function updateAccountModalFields(type) {
    if (type === "credit") {
      dom.fieldInitialBalance.style.display = "none";
      dom.fieldCreditLimit.style.display = "block";
      dom.fieldLoanInitial.style.display = "none";
      dom.fieldCreditInitialDebt.style.display = "block";
      dom.fieldCreditDates.style.display = "grid";
      dom.accountTypeHint.innerHTML = "Akun Kartu Kredit diperlakukan sebagai <strong>Kewajiban</strong>. Memiliki limit kredit, siklus penagihan, dan tanggal jatuh tempo.";
    } else if (type === "loan") {
      dom.fieldInitialBalance.style.display = "none";
      dom.fieldCreditLimit.style.display = "none";
      dom.fieldLoanInitial.style.display = "block";
      dom.fieldCreditInitialDebt.style.display = "none";
      dom.fieldCreditDates.style.display = "none";
      dom.accountTypeHint.innerHTML = "Akun Pinjaman mencatat sisa pokok utang (KTA/KPR/Cicilan). Saldo utang otomatis berkurang saat menerima Transfer.";
    } else if (type === "investment") {
      dom.fieldInitialBalance.style.display = "block";
      dom.fieldCreditLimit.style.display = "none";
      dom.fieldLoanInitial.style.display = "none";
      dom.fieldCreditInitialDebt.style.display = "none";
      dom.fieldCreditDates.style.display = "none";
      dom.accountTypeHint.innerHTML = "Akun Investasi/Aset dihitung ke dalam Net Worth, tetapi terpisah dari dana siap belanja harian.";
    } else {
      dom.fieldInitialBalance.style.display = "block";
      dom.fieldCreditLimit.style.display = "none";
      dom.fieldLoanInitial.style.display = "none";
      dom.fieldCreditInitialDebt.style.display = "none";
      dom.fieldCreditDates.style.display = "none";
      dom.accountTypeHint.innerHTML = "Akun Cash, Bank, dan E-Wallet otomatis dihitung sebagai <strong>Aset Likuid</strong>.";
    }
  }

  dom.accountType.addEventListener("change", e => {
    updateAccountModalFields(e.target.value);
  });

  dom.btnOpenAccountTab3.addEventListener("click", openAddAccountModal);
  dom.menuBtnAddAccount.addEventListener("click", openAddAccountModal);
  dom.btnCloseAccount.addEventListener("click", closeAccountModal);
  dom.btnCancelAccount.addEventListener("click", closeAccountModal);

  dom.formAccount.addEventListener("submit", e => {
    e.preventDefault();

    const editId = dom.accountEditId.value;
    const type = dom.accountType.value;
    const name = dom.accountName.value.trim();
    const icon = dom.accountIcon.value.trim() || (Config.ACCOUNT_TYPES[type] ? Config.ACCOUNT_TYPES[type].icon : "🏦");
    const color = dom.accountColor.value;
    const currency = dom.accountCurrency.value;

    let initBal = 0;
    let limit = 0;
    let statementDay = 15;
    let dueDay = 5;

    if (type === "credit") {
      limit = parseFloat(dom.accountCreditLimit.value) || 0;
      initBal = parseFloat(dom.accountInitialDebt.value) || 0;
      statementDay = Math.min(31, Math.max(1, parseInt(dom.accountStatementDay.value, 10) || 15));
      dueDay = Math.min(31, Math.max(1, parseInt(dom.accountDueDay.value, 10) || 5));
    } else if (type === "loan") {
      initBal = parseFloat(dom.accountInitialLoan.value) || 0;
    } else {
      initBal = parseFloat(dom.accountInitialBalance.value) || 0;
    }

    if (!name) {
      alert("Nama akun tidak boleh kosong!");
      return;
    }

    if (editId) {
      const acc = appState.accounts.find(a => a.id === editId);
      if (acc) {
        acc.type = type;
        acc.name = name;
        acc.icon = icon;
        acc.color = color;
        acc.currency = currency;
        acc.initialBalance = initBal;

        if (type === "credit") {
          acc.creditLimit = limit;
          acc.statementDay = statementDay;
          acc.dueDay = dueDay;
        } else {
          delete acc.creditLimit;
          delete acc.statementDay;
          delete acc.dueDay;
        }
      }
    } else {
      const newAcc = {
        id: "acc-" + Date.now(),
        type: type,
        name: name,
        icon: icon,
        color: color,
        currency: currency,
        initialBalance: initBal
      };

      if (type === "credit") {
        newAcc.creditLimit = limit;
        newAcc.statementDay = statementDay;
        newAcc.dueDay = dueDay;
      }

      appState.accounts.push(newAcc);
    }

    Storage.saveData(appState);
    closeAccountModal();
    populateAccountDropdowns();
    renderAll();
  });

  function deleteAccount(accId) {
    if (appState.accounts.length <= 1) {
      alert("Aplikasi harus memiliki setidaknya satu akun!");
      return;
    }

    const hasTx = appState.transactions.some(t => t.account === accId || t.accountTo === accId);
    if (hasTx) {
      if (!confirm("Akun ini memiliki riwayat transaksi. Jika dihapus, transaksi terkait mungkin tidak menampilkan akun dengan benar. Lanjutkan?")) {
        return;
      }
    } else {
      if (!confirm("Hapus akun ini?")) return;
    }

    appState.accounts = appState.accounts.filter(a => a.id !== accId);
    Storage.saveData(appState);
    populateAccountDropdowns();
    renderAll();
  }

  // 15. MODAL 3: KELOLA KATEGORI
  function openCategoriesModal() {
    renderCategoryModalList();
    dom.modalCategories.classList.add("open");
  }

  function closeCategoriesModal() {
    dom.modalCategories.classList.remove("open");
  }

  function renderCategoryModalList() {
    dom.listCategoriesExpense.innerHTML = "";
    dom.listCategoriesIncome.innerHTML = "";

    appState.categories.forEach(cat => {
      const pill = document.createElement("div");
      pill.style.cssText = `
        display: inline-flex; align-items: center; gap: 0.35rem;
        padding: 0.35rem 0.65rem; border-radius: var(--radius-full);
        font-size: 0.8rem; font-weight: 700; background-color: var(--color-gray-100);
        border: 1px solid var(--color-gray-200);
      `;
      pill.innerHTML = `
        <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${escapeHTML(cat.color)};"></span>
        <span>${escapeHTML(cat.icon)} ${escapeHTML(cat.name)}</span>
        <button type="button" data-id="${escapeHTML(cat.id)}" class="btn-del-cat" style="background: none; border: none; cursor: pointer; color: var(--color-gray-400); font-size: 0.9rem; line-height: 1;">×</button>
      `;

      if (cat.type === "expense") {
        dom.listCategoriesExpense.appendChild(pill);
      } else {
        dom.listCategoriesIncome.appendChild(pill);
      }
    });
  }

  // Event Delegation untuk Hapus Kategori
  dom.modalCategories.addEventListener("click", e => {
    const delBtn = e.target.closest(".btn-del-cat");
    if (delBtn) {
      deleteCategory(delBtn.dataset.id);
    }
  });

  dom.menuBtnCategories.addEventListener("click", openCategoriesModal);
  dom.btnCloseCategories.addEventListener("click", closeCategoriesModal);
  dom.btnDoneCategories.addEventListener("click", closeCategoriesModal);

  dom.formAddCategory.addEventListener("submit", e => {
    e.preventDefault();

    const type = dom.newCatType.value;
    const icon = dom.newCatIcon.value.trim() || "🏷️";
    const name = dom.newCatName.value.trim();
    const color = dom.newCatColor.value;

    if (!name) {
      alert("Nama kategori tidak boleh kosong!");
      return;
    }

    const newCat = {
      id: "cat-" + Date.now(),
      type: type,
      name: name,
      icon: icon,
      color: color
    };

    appState.categories.push(newCat);
    Storage.saveData(appState);

    dom.formAddCategory.reset();
    dom.newCatIcon.value = "🏷️";
    dom.newCatColor.value = "#10b981";

    renderCategoryModalList();
    populateCategoryDropdown();
    renderAll();
  });

  function deleteCategory(catId) {
    if (appState.categories.length <= 1) {
      alert("Aplikasi harus memiliki setidaknya satu kategori!");
      return;
    }

    if (!confirm("Hapus kategori ini?")) return;

    appState.categories = appState.categories.filter(c => c.id !== catId);
    Storage.saveData(appState);
    renderCategoryModalList();
    populateCategoryDropdown();
    renderAll();
  }

  // 16. MODAL 4: PENGATURAN KURS MANUAL
  function openRatesModal() {
    renderRatesModalList();
    dom.modalRates.classList.add("open");
  }

  function closeRatesModal() {
    dom.modalRates.classList.remove("open");
  }

  function renderRatesModalList() {
    dom.ratesModalList.innerHTML = "";
    dom.ratesModalBaseCode.textContent = appState.baseCurrency;

    Object.keys(appState.currencies).forEach(code => {
      const cur = appState.currencies[code];
      const isBase = code === appState.baseCurrency;

      const row = document.createElement("div");
      row.className = "rate-row-card";
      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span class="rate-badge-code">${escapeHTML(cur.code)}</span>
          <div>
            <div style="font-weight: 700; font-size: 0.85rem;">${escapeHTML(cur.name)} (${escapeHTML(cur.symbol)})</div>
            <div style="font-size: 0.725rem; color: var(--color-gray-500);">${isBase ? "Mata Uang Utama" : `1 ${escapeHTML(cur.code)} =`}</div>
          </div>
        </div>
        <div>
          ${
            isBase
              ? `<span style="font-size: 0.85rem; font-weight: 800; color: var(--color-brand-600);">1.00 (Dasar)</span>`
              : `<input type="number" class="rate-input-field tabular-nums" data-code="${escapeHTML(cur.code)}" value="${escapeHTML(cur.rate)}" step="any" min="0">`
          }
        </div>
      `;
      dom.ratesModalList.appendChild(row);
    });
  }

  // Event Delegation untuk Input Kurs
  dom.ratesModalList.addEventListener("change", e => {
    if (e.target.classList.contains("rate-input-field")) {
      const code = e.target.dataset.code;
      const val = parseFloat(e.target.value);
      if (val && val > 0 && appState.currencies[code]) {
        appState.currencies[code].rate = val;
        Storage.saveData(appState);
        renderAll();
      }
    }
  });

  dom.menuBtnRates.addEventListener("click", openRatesModal);
  dom.btnCloseRates.addEventListener("click", closeRatesModal);
  dom.btnDoneRates.addEventListener("click", closeRatesModal);

  dom.formAddCurrency.addEventListener("submit", e => {
    e.preventDefault();

    const code = dom.newCurrCode.value.trim().toUpperCase();
    const symbol = dom.newCurrSymbol.value.trim();
    const name = dom.newCurrName.value.trim();
    const rate = parseFloat(dom.newCurrRate.value);

    if (!code || !symbol || !name || !rate || rate <= 0) {
      alert("Lengkapi semua field mata uang dengan benar!");
      return;
    }

    if (appState.currencies[code]) {
      alert(`Mata uang ${code} sudah ada.`);
      return;
    }

    appState.currencies[code] = {
      code: code,
      symbol: symbol,
      name: name,
      rate: rate,
      decimals: 2
    };

    Storage.saveData(appState);
    dom.formAddCurrency.reset();
    renderRatesModalList();
    populateCurrencyDropdowns();
    renderAll();
    alert(`Mata uang ${code} berhasil ditambahkan!`);
  });

  // 17. MODAL 5: CADANGAN & PEMULIHAN (BACKUP/RESTORE)
  function openBackupModal() {
    dom.importStatusMsg.textContent = "";
    dom.modalBackup.classList.add("open");
  }

  function closeBackupModal() {
    dom.modalBackup.classList.remove("open");
  }

  dom.menuBtnBackupExport.addEventListener("click", () => {
    Storage.exportBackup(appState);
  });

  dom.menuBtnBackupImport.addEventListener("click", openBackupModal);
  dom.btnCloseBackup.addEventListener("click", closeBackupModal);
  dom.btnDoneBackup.addEventListener("click", closeBackupModal);

  dom.btnExportJson.addEventListener("click", () => {
    Storage.exportBackup(appState);
  });

  if (dom.btnExportBin) {
    dom.btnExportBin.addEventListener("click", () => {
      Storage.exportSqliteBackup(appState);
    });
  }

  dom.btnImportJson.addEventListener("click", () => {
    const file = dom.inputImportFile.files[0];
    if (!file) {
      alert("Pilih file cadangan (.bin atau .json) terlebih dahulu!");
      return;
    }

    const fileName = file.name.toLowerCase();
    const isSqliteFile = fileName.endsWith(".bin") || fileName.endsWith(".db") || fileName.endsWith(".sqlite");

    dom.importStatusMsg.style.color = "var(--color-gray-500)";
    dom.importStatusMsg.textContent = "⏳ Memproses file cadangan...";

    const applyImportedState = result => {
      if (result.success) {
        appState = result.data;
        dom.importStatusMsg.style.color = "var(--color-brand-600)";
        dom.importStatusMsg.textContent = "✅ " + result.message;

        // Otomatis arahkan bulan tampilan ke tanggal transaksi terbaru
        if (appState.transactions && appState.transactions.length > 0 && appState.transactions[0].date) {
          const latestDate = new Date(appState.transactions[0].date + "T00:00:00");
          if (!isNaN(latestDate.getTime())) {
            currentMonthDate = latestDate;
          }
        }

        populateAccountDropdowns();
        populateCategoryDropdown();
        populateCurrencyDropdowns();
        renderAll();
      } else {
        dom.importStatusMsg.style.color = "var(--color-expense)";
        dom.importStatusMsg.textContent = "❌ " + result.message;
      }
    };

    const reader = new FileReader();
    if (isSqliteFile) {
      reader.onload = async function(e) {
        const result = await Storage.importSqliteBackup(e.target.result);
        applyImportedState(result);
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = function(e) {
        const result = Storage.importBackup(e.target.result);
        applyImportedState(result);
      };
      reader.readAsText(file);
    }
  });

  function resetAllData() {
    if (confirm("PERINGATAN: Semua data akun, kategori, dan transaksi akan dihapus dan dikembalikan ke awal. Lanjutkan?")) {
      appState = Storage.resetToDefault();
      populateAccountDropdowns();
      populateCategoryDropdown();
      populateCurrencyDropdowns();
      renderAll();
      closeBackupModal();
      alert("Aplikasi berhasil direset ke pengaturan awal!");
    }
  }

  dom.menuBtnResetData.addEventListener("click", resetAllData);
  dom.btnResetData.addEventListener("click", resetAllData);

  // Switcher Tampilan Saldo di Tab Lainnya (IDR Utama vs Per Mata Uang)
  dom.btnModeBase.addEventListener("click", () => {
    appState.viewMode = "base";
    Storage.saveData(appState);
    renderAll();
  });

  dom.btnModeCurr.addEventListener("click", () => {
    appState.viewMode = "currency";
    Storage.saveData(appState);
    renderAll();
  });

  // Tutup modal jika area backdrop diklik
  window.addEventListener("click", e => {
    if (e.target.classList.contains("modal-backdrop")) {
      e.target.classList.remove("open");
    }
  });

  // 18. INISIALISASI PERTAMA KALI
  populateAccountDropdowns();
  populateCategoryDropdown();
  populateCurrencyDropdowns();
  switchTab("transaksi");
  renderAll();
});
