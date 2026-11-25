/**
 * app.js
 * Logika utama aplikasi SisaUang (6 Kelompok Akun & Kategori Transaksi):
 * - State Management & LocalStorage
 * - 6 Kategori Akun: Cash, Bank, E-Wallet, Credit Card, Pinjaman, Investasi/Aset
 * - Perhitungan Siklus Penagihan (Billing Cycle) & Jatuh Tempo Credit Card
 * - Perhitungan Pokok Pinjaman (Loan Repayment)
 * - Perhitungan Sisa Uang Siap Pakai, Total Kewajiban, dan Net Worth
 * - Grouped Container UI dengan Accordion & Subtotal Kategori
 * - Dropdown Transaksi Terkelompok (<optgroup>) & Konversi Kurs Otomatis
 * - Backup / Restore JSON
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Inisialisasi State Aplikasi
  let appState = window.SisaUang.Storage.loadData();

  const Currency = window.SisaUang.Currency;
  const Storage = window.SisaUang.Storage;
  const Config = window.SisaUang.Config;

  // Filter aktif riwayat transaksi: 'all' | 'expense' | 'income' | 'transfer'
  let activeTxFilter = "all";

  // Tipe transaksi di modal: 'expense' | 'income' | 'transfer'
  let activeTxModalType = "expense";

  // Status accordion per kelompok akun (disimpan di memory)
  const collapsedGroups = {};

  // 2. Elemen DOM
  const dom = {
    // Hero Section Saldo
    liquidBalance: document.getElementById("dash-liquid-balance"),
    creditDebt: document.getElementById("dash-credit-debt"),
    liquidAccountsSummary: document.getElementById("liquid-accounts-summary"),
    liquidPercentBadge: document.getElementById("liquid-percent-badge"),
    netWorth: document.getElementById("dash-net-worth"),
    netWorthSubtext: document.getElementById("dash-net-worth-subtext"),
    breakdownDiv: document.getElementById("dash-currency-breakdown"),
    baseCurrIndicator: document.getElementById("base-curr-indicator"),

    // Cashflow Bulan Berjalan
    statMonthIncome: document.getElementById("stat-month-income"),
    statMonthExpense: document.getElementById("stat-month-expense"),

    // View Switcher Saldo
    btnModeBase: document.getElementById("btn-mode-base"),
    btnModeCurr: document.getElementById("btn-mode-curr"),

    // Containers & Sections
    accountsContainer: document.getElementById("accounts-list-container"),
    catStackedBar: document.getElementById("cat-stacked-bar"),
    catPillsGrid: document.getElementById("cat-pills-grid"),
    txFeedContainer: document.getElementById("tx-feed-container"),
    txFilterButtons: document.querySelectorAll(".tx-filter-btn"),

    // Tombol Buka Modal
    btnOpenTx: document.getElementById("btn-open-tx-modal"),
    btnOpenRates: document.getElementById("btn-open-rates-modal"),
    btnOpenCategories: document.getElementById("btn-open-categories-modal"),
    btnManageCatLink: document.getElementById("btn-manage-cat-link"),
    btnOpenBackup: document.getElementById("btn-open-backup-modal"),
    btnQuickAddAccount: document.getElementById("btn-quick-add-account"),

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
    inputImportFile: document.getElementById("input-import-file"),
    btnImportJson: document.getElementById("btn-import-json"),
    importStatusMsg: document.getElementById("import-status-msg"),
    btnResetData: document.getElementById("btn-reset-data")
  };

  // 3. Logika Perhitungan Keuangan Akun
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

      if (tx.type === "income") {
        const acc = appState.accounts.find(a => a.id === tx.accountId);
        if (acc) {
          const accCurr = acc.currency || appState.baseCurrency;
          const convertedAmt = Currency.convert(amt, tx.currency, accCurr, appState.currencies);

          if (acc.type === "credit") {
            // Pemasukan ke kartu kredit (misal cashback / refund) mengurangi tagihan
            creditDebts[acc.id] = (creditDebts[acc.id] || 0) - convertedAmt;
          } else if (acc.type === "loan") {
            // Pemasukan langsung ke akun pinjaman mengurangi pokok pinjaman
            loanBalances[acc.id] = (loanBalances[acc.id] || 0) - convertedAmt;
          } else {
            balances[acc.id] = (balances[acc.id] || 0) + convertedAmt;
          }
        }
      } else if (tx.type === "expense") {
        const acc = appState.accounts.find(a => a.id === tx.accountId);
        if (acc) {
          const accCurr = acc.currency || appState.baseCurrency;
          const convertedAmt = Currency.convert(amt, tx.currency, accCurr, appState.currencies);

          if (acc.type === "credit") {
            // Belanja kartu kredit menambah tagihan
            creditDebts[acc.id] = (creditDebts[acc.id] || 0) + convertedAmt;
          } else if (acc.type === "loan") {
            // Penarikan pinjaman baru menambah pokok pinjaman
            loanBalances[acc.id] = (loanBalances[acc.id] || 0) + convertedAmt;
          } else {
            balances[acc.id] = (balances[acc.id] || 0) - convertedAmt;
          }
        }
      } else if (tx.type === "transfer") {
        // Keluar dari akun sumber
        const fromAcc = appState.accounts.find(a => a.id === tx.fromAccountId);
        if (fromAcc) {
          const fromCurr = fromAcc.currency || appState.baseCurrency;
          const convertedFrom = Currency.convert(amt, tx.currency, fromCurr, appState.currencies);

          if (fromAcc.type === "credit") {
            creditDebts[fromAcc.id] = (creditDebts[fromAcc.id] || 0) + convertedFrom;
          } else if (fromAcc.type === "loan") {
            loanBalances[fromAcc.id] = (loanBalances[fromAcc.id] || 0) + convertedFrom;
          } else {
            balances[fromAcc.id] = (balances[fromAcc.id] || 0) - convertedFrom;
          }
        }

        // Masuk ke akun tujuan
        const toAcc = appState.accounts.find(a => a.id === tx.toAccountId);
        if (toAcc) {
          const toCurr = toAcc.currency || appState.baseCurrency;
          const convertedTo = Currency.convert(amt, tx.currency, toCurr, appState.currencies);

          if (toAcc.type === "credit") {
            // Transfer ke kartu kredit = Pembayaran tagihan
            creditDebts[toAcc.id] = (creditDebts[toAcc.id] || 0) - convertedTo;
          } else if (toAcc.type === "loan") {
            // Transfer ke pinjaman = Pembayaran cicilan pokok
            loanBalances[toAcc.id] = (loanBalances[toAcc.id] || 0) - convertedTo;
          } else {
            balances[toAcc.id] = (balances[toAcc.id] || 0) + convertedTo;
          }
        }
      }
    });

    return { balances, creditDebts, loanBalances };
  }

  // Hitung Siklus Penagihan & Tanggal Jatuh Tempo Credit Card
  function calculateCreditCardCycle(account, transactions, currencies, baseCurrency) {
    const statementDay = Math.min(31, Math.max(1, parseInt(account.statementDay, 10) || 15));
    const dueDay = Math.min(31, Math.max(1, parseInt(account.dueDay, 10) || 5));

    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();

    function getValidDate(year, month, day) {
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
      return new Date(year, month, Math.min(day, lastDayOfMonth));
    }

    let cycleStartDate;
    let cycleEndDate;

    if (todayDate > statementDay) {
      cycleStartDate = getValidDate(todayYear, todayMonth, statementDay + 1);
      cycleEndDate = getValidDate(todayYear, todayMonth + 1, statementDay);
    } else {
      cycleStartDate = getValidDate(todayYear, todayMonth - 1, statementDay + 1);
      cycleEndDate = getValidDate(todayYear, todayMonth, statementDay);
    }

    const formatDateIso = d => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    const startIso = formatDateIso(cycleStartDate);
    const endIso = formatDateIso(cycleEndDate);

    // Format rentang tanggal ramah (contoh: 16 Nov – 15 Des 2026)
    const startStr = cycleStartDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    const endStr = cycleEndDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    const cycleRangeText = `${startStr} – ${endStr}`;

    // Hitung total transaksi belanja kartu kredit dalam periode aktif ini
    let cycleTotalInAccountCurr = 0;
    const accCurr = account.currency || baseCurrency;

    transactions.forEach(tx => {
      if (tx.accountId === account.id && tx.type === "expense" && tx.date) {
        if (tx.date >= startIso && tx.date <= endIso) {
          const amtInAcc = Currency.convert(tx.amount, tx.currency, accCurr, currencies);
          cycleTotalInAccountCurr += amtInAcc;
        }
      }
    });

    // Hitung Tanggal Jatuh Tempo Berikutnya & Hitung Mundur (H-X)
    const todayMidnight = new Date(todayYear, todayMonth, todayDate);
    const candidateDueThisMonth = getValidDate(todayYear, todayMonth, dueDay);
    const candidateDueNextMonth = getValidDate(todayYear, todayMonth + 1, dueDay);

    let nextDueDate;
    if (candidateDueThisMonth >= todayMidnight) {
      nextDueDate = candidateDueThisMonth;
    } else {
      nextDueDate = candidateDueNextMonth;
    }

    const diffMs = nextDueDate.getTime() - todayMidnight.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    const dueFormatted = nextDueDate.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });

    let dueStatusBadgeClass = "badge-due-indicator badge-due-normal";
    let countdownText = `H-${diffDays}`;
    let icon = "⏰";

    if (diffDays === 0) {
      countdownText = "Hari Ini (Jatuh Tempo)";
    }

    return {
      statementDay,
      dueDay,
      cycleRangeText,
      cycleTotalInAccountCurr,
      nextDueDateFormatted: dueFormatted,
      daysRemaining: diffDays,
      countdownText,
      dueStatusBadgeClass,
      icon
    };
  }

  // Hitung Arus Kas Bulan Berjalan
  function calculateMonthlyCashflow() {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let monthIncome = 0;
    let monthExpense = 0;

    appState.transactions.forEach(tx => {
      if (!tx.date) return;
      const txYearMonth = tx.date.slice(0, 7);

      if (txYearMonth === currentYearMonth) {
        const amtInBase = Currency.convert(tx.amount, tx.currency, appState.baseCurrency, appState.currencies);
        if (tx.type === "income") {
          monthIncome += amtInBase;
        } else if (tx.type === "expense") {
          monthExpense += amtInBase;
        }
      }
    });

    return { income: monthIncome, expense: monthExpense };
  }

  // Hitung Pengeluaran per Kategori
  function calculateCategoryExpenses() {
    const categoryTotals = {};
    let totalExpenseInBase = 0;

    (appState.categories.expense || []).forEach(cat => {
      categoryTotals[cat.id] = {
        name: cat.name,
        icon: cat.icon || "🏷️",
        color: cat.color || "#10b981",
        total: 0
      };
    });

    appState.transactions.forEach(tx => {
      if (tx.type === "expense") {
        const catId = tx.categoryId || "cat-lainnya-exp";
        const amtInBase = Currency.convert(tx.amount, tx.currency, appState.baseCurrency, appState.currencies);
        totalExpenseInBase += amtInBase;

        if (!categoryTotals[catId]) {
          categoryTotals[catId] = {
            name: "Lainnya",
            icon: "📦",
            color: "#64748b",
            total: 0
          };
        }
        categoryTotals[catId].total += amtInBase;
      }
    });

    return { categoryTotals, totalExpenseInBase };
  }

  // 4. Rendering Tampilan Utama
  function renderAll() {
    renderViewControlInfo();
    const { balances, creditDebts, loanBalances } = calculateAccountBalances();
    const monthlyCashflow = calculateMonthlyCashflow();
    renderHeroCards(balances, creditDebts, loanBalances, monthlyCashflow);
    renderAccountGroups(balances, creditDebts, loanBalances);
    renderCategoryBreakdown();
    renderTransactionsFeed();
    populateSelectOptions();
  }

  function renderViewControlInfo() {
    const baseCode = appState.baseCurrency;
    if (dom.baseCurrIndicator) {
      dom.baseCurrIndicator.textContent = `Basis: ${baseCode}`;
    }
    if (dom.ratesModalBaseCode) {
      dom.ratesModalBaseCode.textContent = baseCode;
    }

    if (appState.viewMode === "base") {
      dom.btnModeBase.classList.add("active");
      dom.btnModeCurr.classList.remove("active");
    } else {
      dom.btnModeBase.classList.remove("active");
      dom.btnModeCurr.classList.add("active");
    }
  }

  function renderHeroCards(balances, creditDebts, loanBalances, cashflow) {
    let totalLiquidInBase = 0;
    let totalInvestmentInBase = 0;
    let totalCreditDebtInBase = 0;
    let totalLoanInBase = 0;
    const totalsPerCurrency = {};
    const liquidAccountNames = [];

    Object.keys(appState.currencies).forEach(c => {
      totalsPerCurrency[c] = 0;
    });

    appState.accounts.forEach(acc => {
      const accCurr = acc.currency || appState.baseCurrency;

      if (acc.type === "credit") {
        const debt = creditDebts[acc.id] || 0;
        const debtInBase = Currency.convert(debt, accCurr, appState.baseCurrency, appState.currencies);
        totalCreditDebtInBase += debtInBase;
        totalsPerCurrency[accCurr] = (totalsPerCurrency[accCurr] || 0) - debt;
      } else if (acc.type === "loan") {
        const loan = loanBalances[acc.id] || 0;
        const loanInBase = Currency.convert(loan, accCurr, appState.baseCurrency, appState.currencies);
        totalLoanInBase += loanInBase;
        totalsPerCurrency[accCurr] = (totalsPerCurrency[accCurr] || 0) - loan;
      } else {
        const bal = balances[acc.id] || 0;
        const balInBase = Currency.convert(bal, accCurr, appState.baseCurrency, appState.currencies);
        totalsPerCurrency[accCurr] = (totalsPerCurrency[accCurr] || 0) + bal;

        if (acc.type === "investment") {
          totalInvestmentInBase += balInBase;
        } else {
          // cash, bank, ewallet (likuid)
          totalLiquidInBase += balInBase;
          liquidAccountNames.push(acc.name);
        }
      }
    });

    const totalLiabilitiesInBase = totalCreditDebtInBase + totalLoanInBase;

    // 1. Kartu Hero Sisa Uang Siap Pakai
    dom.liquidBalance.textContent = Currency.format(totalLiquidInBase, appState.baseCurrency, appState.currencies);
    dom.creditDebt.textContent = Currency.format(totalLiabilitiesInBase, appState.baseCurrency, appState.currencies);

    if (liquidAccountNames.length > 0) {
      dom.liquidAccountsSummary.textContent = `Akun Likuid: ${liquidAccountNames.slice(0, 3).join(", ")}${liquidAccountNames.length > 3 ? "..." : ""}`;
    } else {
      dom.liquidAccountsSummary.textContent = "Belum ada akun likuid terdaftar";
    }

    const totalAssets = totalLiquidInBase + totalInvestmentInBase;
    const liquidPercent = totalAssets > 0 ? Math.round((totalLiquidInBase / totalAssets) * 100) : 100;
    dom.liquidPercentBadge.textContent = `${liquidPercent}% Likuiditas`;

    // 2. Kartu Hero Net Worth (Kekayaan Bersih = Total Aset - Total Kewajiban)
    const netWorthInBase = totalAssets - totalLiabilitiesInBase;

    if (appState.viewMode === "base") {
      dom.netWorth.textContent = Currency.format(netWorthInBase, appState.baseCurrency, appState.currencies);
      dom.netWorthSubtext.textContent = `Aset: ${Currency.format(totalAssets, appState.baseCurrency, appState.currencies)} − Kewajiban: ${Currency.format(totalLiabilitiesInBase, appState.baseCurrency, appState.currencies)}`;
      dom.breakdownDiv.style.display = "none";
    } else {
      dom.netWorth.textContent = "Multi-Mata Uang";
      dom.netWorthSubtext.textContent = "Rincian saldo menurut valuta masing-masing akun:";
      dom.breakdownDiv.style.display = "flex";
      dom.breakdownDiv.innerHTML = "";

      Object.keys(totalsPerCurrency).forEach(c => {
        const amt = totalsPerCurrency[c];
        if (amt !== 0 || c === appState.baseCurrency) {
          const row = document.createElement("div");
          row.style.display = "flex";
          row.style.justifyContent = "space-between";
          row.innerHTML = `<span>${c}:</span> <strong class="tabular-nums">${Currency.format(amt, c, appState.currencies)}</strong>`;
          dom.breakdownDiv.appendChild(row);
        }
      });
    }

    // 3. Cashflow Bulan Berjalan
    dom.statMonthIncome.textContent = `+${Currency.format(cashflow.income, appState.baseCurrency, appState.currencies)}`;
    dom.statMonthExpense.textContent = `-${Currency.format(cashflow.expense, appState.baseCurrency, appState.currencies)}`;
  }

  // 5. Render 6 Kelompok Akun Keuangan (Grouped Containers + Accordion)
  function renderAccountGroups(balances, creditDebts, loanBalances) {
    dom.accountsContainer.innerHTML = "";

    const orderedGroupKeys = ["cash", "bank", "ewallet", "credit", "loan", "investment"];

    orderedGroupKeys.forEach(typeKey => {
      const typeConfig = Config.ACCOUNT_TYPES[typeKey];
      if (!typeConfig) return;

      const groupAccounts = appState.accounts.filter(a => a.type === typeKey);
      const isCollapsed = Boolean(collapsedGroups[typeKey]);

      // Hitung Subtotal Kategori dalam Mata Uang Utama
      let groupSubtotalInBase = 0;
      groupAccounts.forEach(acc => {
        const accCurr = acc.currency || appState.baseCurrency;
        if (acc.type === "credit") {
          const debt = creditDebts[acc.id] || 0;
          groupSubtotalInBase += Currency.convert(debt, accCurr, appState.baseCurrency, appState.currencies);
        } else if (acc.type === "loan") {
          const loan = loanBalances[acc.id] || 0;
          groupSubtotalInBase += Currency.convert(loan, accCurr, appState.baseCurrency, appState.currencies);
        } else {
          const bal = balances[acc.id] || 0;
          groupSubtotalInBase += Currency.convert(bal, accCurr, appState.baseCurrency, appState.currencies);
        }
      });

      // Tentukan badge tipe kelompok
      let badgeClass = "badge-liquid";
      if (typeConfig.isLiability) {
        badgeClass = "badge-liability";
      } else if (!typeConfig.isLiquid) {
        badgeClass = "badge-nonliquid";
      }

      // Container Kartu Grup
      const groupCard = document.createElement("div");
      groupCard.className = `account-group-card ${isCollapsed ? "is-collapsed" : ""}`;
      groupCard.dataset.type = typeKey;

      // Header Accordion
      const header = document.createElement("div");
      header.className = "group-header";
      header.innerHTML = `
        <div class="group-header-left">
          <div class="group-icon-badge" style="background-color: ${typeConfig.defaultColor}15; color: ${typeConfig.defaultColor};">
            ${typeConfig.icon}
          </div>
          <div class="group-title-row">
            <span class="group-title">${typeConfig.name}</span>
            <span class="group-badge ${badgeClass}">${typeConfig.groupBadge}</span>
            <span class="group-count-badge">${groupAccounts.length} Akun</span>
          </div>
        </div>

        <div class="group-header-right">
          <div class="group-subtotal-wrap">
            <div class="group-subtotal-label">${typeConfig.isLiability ? "Total Tagihan" : "Subtotal"}</div>
            <div class="group-subtotal-val tabular-nums" style="${typeConfig.isLiability ? 'color: var(--color-expense-text);' : ''}">
              ${Currency.format(groupSubtotalInBase, appState.baseCurrency, appState.currencies)}
            </div>
          </div>
          <button type="button" class="btn-group-add" data-type="${typeKey}" title="Tambah Akun ke kelompok ini">
            <span>➕</span> Tambah
          </button>
          <span class="group-chevron">▼</span>
        </div>
      `;

      // Klik header untuk buka / tutup accordion (kecuali tombol + Tambah)
      header.addEventListener("click", e => {
        if (e.target.closest(".btn-group-add")) return;
        collapsedGroups[typeKey] = !collapsedGroups[typeKey];
        groupCard.classList.toggle("is-collapsed", collapsedGroups[typeKey]);
      });

      // Tombol + Tambah Cepat
      const btnAdd = header.querySelector(".btn-group-add");
      btnAdd.addEventListener("click", e => {
        e.stopPropagation();
        openAddAccountModal(typeKey);
      });

      // Body Accordion
      const body = document.createElement("div");
      body.className = "group-body";

      if (groupAccounts.length === 0) {
        // Empty State jika belum ada akun
        body.innerHTML = `
          <div class="group-empty-state">
            <div style="font-size: 1.5rem;">${typeConfig.icon}</div>
            <div>Belum ada akun di kelompok <strong>${typeConfig.name}</strong>.</div>
            <button type="button" class="btn btn-white btn-sm btn-empty-add" data-type="${typeKey}" style="margin-top: 0.25rem;">
              <span>➕</span> Tambah Akun ${typeConfig.categoryName}
            </button>
          </div>
        `;
        body.querySelector(".btn-empty-add").addEventListener("click", () => {
          openAddAccountModal(typeKey);
        });
      } else {
        const grid = document.createElement("div");
        grid.className = "group-accounts-grid";

        groupAccounts.forEach(acc => {
          const accCurr = acc.currency || appState.baseCurrency;
          const isBase = accCurr === appState.baseCurrency;

          const accCard = document.createElement("div");
          accCard.className = "account-card";

          if (acc.type === "credit") {
            // ================= KARTU KREDIT =================
            const debt = creditDebts[acc.id] || 0;
            const limit = Number(acc.creditLimit) || 0;
            const remaining = Math.max(0, limit - debt);
            const usagePercent = limit > 0 ? Math.min(100, Math.round((debt / limit) * 100)) : 0;

            const cycleData = calculateCreditCardCycle(acc, appState.transactions, appState.currencies, appState.baseCurrency);

            // Indikator peringatan jatuh tempo (kuning/merah bila <= 7 hari & ada tagihan)
            let dueBadgeHtml = "";
            if (debt > 0) {
              if (cycleData.daysRemaining <= 3) {
                dueBadgeHtml = `
                  <div class="badge-due-indicator badge-due-urgent" title="Jatuh tempo sangat dekat!">
                    <span>🚨 Jatuh Tempo: <strong>${cycleData.nextDueDateFormatted}</strong></span>
                    <span>${cycleData.countdownText}</span>
                  </div>
                `;
              } else if (cycleData.daysRemaining <= 7) {
                dueBadgeHtml = `
                  <div class="badge-due-indicator badge-due-warning" title="Segera lakukan pembayaran sebelum jatuh tempo">
                    <span>⚠️ Jatuh Tempo: <strong>${cycleData.nextDueDateFormatted}</strong></span>
                    <span>${cycleData.countdownText}</span>
                  </div>
                `;
              } else {
                dueBadgeHtml = `
                  <div class="badge-due-indicator badge-due-normal">
                    <span>⏰ Jatuh Tempo: <strong>${cycleData.nextDueDateFormatted}</strong></span>
                    <span>${cycleData.countdownText}</span>
                  </div>
                `;
              }
            } else {
              dueBadgeHtml = `
                <div class="badge-due-indicator badge-due-normal" style="color: var(--color-brand-700); background-color: var(--color-brand-50); border-color: var(--color-brand-100);">
                  <span>✅ Tagihan Lunas</span>
                  <span>Due: ${cycleData.nextDueDateFormatted}</span>
                </div>
              `;
            }

            accCard.innerHTML = `
              <div>
                <div class="account-card-header">
                  <div class="account-icon-badge" style="background-color: ${acc.color || '#f43f5e'}18; color: ${acc.color || '#f43f5e'};">
                    ${acc.icon || "💳"}
                  </div>
                  <div class="account-badge-group">
                    <span class="badge-curr">${accCurr}</span>
                    <span class="badge-acc-type badge-credit-type">Credit Card</span>
                  </div>
                </div>

                <div class="account-main-info">
                  <h3 class="account-title" title="${acc.name}">${acc.name}</h3>
                  <p class="account-desc">Limit: ${Currency.format(limit, accCurr, appState.currencies)}</p>
                </div>
              </div>

              <div class="account-bottom-section">
                <div class="account-balance-label">Tagihan Terpakai</div>
                <div class="account-balance-val tabular-nums" style="color: var(--color-expense-text);">
                  ${Currency.format(debt, accCurr, appState.currencies)}
                </div>

                <!-- Info Limit & Sisa Limit -->
                <div class="credit-card-details">
                  <div class="credit-detail-row">
                    <span>Sisa Limit:</span>
                    <strong class="tabular-nums" style="color: var(--color-brand-600);">${Currency.format(remaining, accCurr, appState.currencies)}</strong>
                  </div>
                  <div class="credit-bar-track">
                    <div class="credit-bar-fill" style="width: ${usagePercent}%;"></div>
                  </div>

                  <!-- Siklus Penagihan (Billing Cycle) -->
                  <div class="credit-cycle-box">
                    <div class="cycle-period-row">
                      <span>Periode Aktif:</span>
                      <span class="cycle-period-highlight">${cycleData.cycleRangeText}</span>
                    </div>
                    <div class="cycle-amount-row">
                      <span style="color: var(--color-slate-500);">Transaksi Siklus Ini:</span>
                      <strong class="tabular-nums">${Currency.format(cycleData.cycleTotalInAccountCurr, accCurr, appState.currencies)}</strong>
                    </div>
                  </div>

                  <!-- Indikator Jatuh Tempo & Pengingat -->
                  ${dueBadgeHtml}
                </div>

                <div class="account-actions-row">
                  <button type="button" class="btn btn-ghost btn-sm btn-edit-account" data-id="${acc.id}">✏️ Edit</button>
                  <button type="button" class="btn btn-ghost btn-sm btn-delete-account" data-id="${acc.id}" style="color: var(--color-slate-400);">🗑️</button>
                </div>
              </div>
            `;
          } else if (acc.type === "loan") {
            // ================= PINJAMAN =================
            const loan = loanBalances[acc.id] || 0;
            const initLoan = Number(acc.initialBalance) || 0;
            const paid = Math.max(0, initLoan - loan);
            const percentPaid = initLoan > 0 ? Math.min(100, Math.round((paid / initLoan) * 100)) : 100;

            accCard.innerHTML = `
              <div>
                <div class="account-card-header">
                  <div class="account-icon-badge" style="background-color: ${acc.color || '#d97706'}18; color: ${acc.color || '#d97706'};">
                    ${acc.icon || "🤝"}
                  </div>
                  <div class="account-badge-group">
                    <span class="badge-curr">${accCurr}</span>
                    <span class="badge-acc-type badge-loan-type">Pinjaman</span>
                  </div>
                </div>

                <div class="account-main-info">
                  <h3 class="account-title" title="${acc.name}">${acc.name}</h3>
                  <p class="account-desc">Pokok Awal: ${Currency.format(initLoan, accCurr, appState.currencies)}</p>
                </div>
              </div>

              <div class="account-bottom-section">
                <div class="account-balance-label">Sisa Pokok Pinjaman</div>
                <div class="account-balance-val tabular-nums" style="color: #d97706;">
                  ${Currency.format(loan, accCurr, appState.currencies)}
                </div>

                <div class="loan-details-box">
                  <div style="display: flex; justify-content: space-between; font-size: 0.72rem;">
                    <span>Sudah Terbayar:</span>
                    <strong class="tabular-nums" style="color: var(--color-brand-600);">${Currency.format(paid, accCurr, appState.currencies)} (${percentPaid}%)</strong>
                  </div>
                  <div class="loan-bar-track">
                    <div class="loan-bar-fill" style="width: ${percentPaid}%;"></div>
                  </div>
                  <div style="font-size: 0.7rem; color: var(--color-slate-400); margin-top: 0.15rem;">
                    💡 Berkurang otomatis saat Anda Transfer dari Bank/E-Wallet.
                  </div>
                </div>

                <div class="account-actions-row">
                  <button type="button" class="btn btn-ghost btn-sm btn-edit-account" data-id="${acc.id}">✏️ Edit</button>
                  <button type="button" class="btn btn-ghost btn-sm btn-delete-account" data-id="${acc.id}" style="color: var(--color-slate-400);">🗑️</button>
                </div>
              </div>
            `;
          } else {
            // ================= CASH, BANK, E-WALLET, INVESTASI =================
            const bal = balances[acc.id] || 0;
            const balInBase = Currency.convert(bal, accCurr, appState.baseCurrency, appState.currencies);
            const isLiquid = typeConfig.isLiquid;

            accCard.innerHTML = `
              <div>
                <div class="account-card-header">
                  <div class="account-icon-badge" style="background-color: ${acc.color || typeConfig.defaultColor}18; color: ${acc.color || typeConfig.defaultColor};">
                    ${acc.icon || typeConfig.icon}
                  </div>
                  <div class="account-badge-group">
                    <span class="badge-curr">${accCurr}</span>
                    <span class="badge-acc-type ${badgeClass}">${typeConfig.name}</span>
                  </div>
                </div>

                <div class="account-main-info">
                  <h3 class="account-title" title="${acc.name}">${acc.name}</h3>
                  <p class="account-desc">${isLiquid ? "Dana Lancar Siap Belanja" : "Instrumen Aset / Tabungan"}</p>
                </div>
              </div>

              <div class="account-bottom-section">
                <div class="account-balance-label">Saldo Akun</div>
                <div class="account-balance-val tabular-nums">
                  ${Currency.format(bal, accCurr, appState.currencies)}
                </div>
                ${
                  !isBase
                    ? `<div class="account-converted-sub tabular-nums">≈ ${Currency.format(balInBase, appState.baseCurrency, appState.currencies)} (${appState.baseCurrency})</div>`
                    : `<div class="account-converted-sub">${isLiquid ? "💧 Aset Likuid" : "🔒 Aset Non-Likuid"}</div>`
                }

                <div class="account-actions-row">
                  <button type="button" class="btn btn-ghost btn-sm btn-edit-account" data-id="${acc.id}">✏️ Edit</button>
                  <button type="button" class="btn btn-ghost btn-sm btn-delete-account" data-id="${acc.id}" style="color: var(--color-slate-400);">🗑️</button>
                </div>
              </div>
            `;
          }

          grid.appendChild(accCard);
        });

        body.appendChild(grid);
      }

      groupCard.appendChild(header);
      groupCard.appendChild(body);
      dom.accountsContainer.appendChild(groupCard);
    });

    // Tambah Event Listeners untuk tombol Edit & Hapus
    document.querySelectorAll(".btn-edit-account").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        openEditAccountModal(e.currentTarget.dataset.id);
      });
    });

    document.querySelectorAll(".btn-delete-account").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        deleteAccount(e.currentTarget.dataset.id);
      });
    });
  }

  // Render Breakdown Pengeluaran per Kategori
  function renderCategoryBreakdown() {
    const { categoryTotals, totalExpenseInBase } = calculateCategoryExpenses();

    dom.catStackedBar.innerHTML = "";
    dom.catPillsGrid.innerHTML = "";

    const catKeys = Object.keys(categoryTotals);
    if (totalExpenseInBase <= 0 || catKeys.length === 0) {
      dom.catStackedBar.innerHTML = `<div style="width: 100%; height: 100%; background-color: var(--color-slate-200);"></div>`;
      dom.catPillsGrid.innerHTML = `
        <div style="font-size: 0.8rem; color: var(--color-slate-400); grid-column: 1 / -1;">
          Belum ada catatan pengeluaran.
        </div>
      `;
      return;
    }

    const sortedCats = catKeys
      .map(id => ({ id, ...categoryTotals[id] }))
      .sort((a, b) => b.total - a.total);

    sortedCats.forEach(item => {
      const percentage = Math.max(1, Math.round((item.total / totalExpenseInBase) * 100));

      const segment = document.createElement("div");
      segment.className = "cat-bar-segment";
      segment.style.width = `${percentage}%`;
      segment.style.backgroundColor = item.color;
      segment.title = `${item.name}: ${Currency.format(item.total, appState.baseCurrency, appState.currencies)} (${percentage}%)`;
      dom.catStackedBar.appendChild(segment);

      const pill = document.createElement("div");
      pill.className = "cat-pill-item";
      pill.innerHTML = `
        <span class="cat-pill-dot" style="background-color: ${item.color};"></span>
        <span>${item.icon} ${item.name}</span>
        <span class="cat-pill-amt tabular-nums">${Currency.format(item.total, appState.baseCurrency, appState.currencies)}</span>
      `;
      dom.catPillsGrid.appendChild(pill);
    });
  }

  // Render Feed Riwayat Transaksi
  function renderTransactionsFeed() {
    dom.txFeedContainer.innerHTML = "";

    let filtered = appState.transactions;
    if (activeTxFilter !== "all") {
      filtered = filtered.filter(t => t.type === activeTxFilter);
    }

    const sortedTxs = [...filtered].sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      return dateB.localeCompare(dateA);
    });

    if (sortedTxs.length === 0) {
      dom.txFeedContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <div class="empty-title">Belum ada transaksi</div>
          <div class="empty-desc">Tekan tombol '+ Catat Transaksi' untuk menambahkan mutasi pertama Anda.</div>
        </div>
      `;
      return;
    }

    sortedTxs.forEach(tx => {
      const item = document.createElement("div");
      item.className = "tx-item";

      let icon = "💸";
      let iconBg = "#fee2e2";
      let iconColor = "#ef4444";
      let title = "Pengeluaran";
      let subtitle = "";
      let sign = "-";
      let amountClass = "tx-amount-expense";

      const txDateStr = tx.date
        ? new Date(tx.date + "T00:00:00").toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric"
          })
        : "Tanpa Tanggal";

      if (tx.type === "income") {
        icon = "💰";
        iconBg = "#dcfce7";
        iconColor = "#10b981";
        sign = "+";
        amountClass = "tx-amount-income";

        const cat = (appState.categories.income || []).find(c => c.id === tx.categoryId);
        const acc = appState.accounts.find(a => a.id === tx.accountId);
        title = cat ? `${cat.icon} ${cat.name}` : "Pemasukan";
        subtitle = `${acc ? acc.name : "Akun"} • ${txDateStr}${tx.note ? ` • ${tx.note}` : ""}`;
      } else if (tx.type === "transfer") {
        icon = "🔄";
        iconBg = "#e0f2fe";
        iconColor = "#0284c7";
        sign = "";
        amountClass = "tx-amount-transfer";

        const fromAcc = appState.accounts.find(a => a.id === tx.fromAccountId);
        const toAcc = appState.accounts.find(a => a.id === tx.toAccountId);
        title = `Transfer: ${fromAcc ? fromAcc.name : "?"} ➔ ${toAcc ? toAcc.name : "?"}`;
        subtitle = `${txDateStr}${tx.note ? ` • ${tx.note}` : ""}`;
      } else {
        const cat = (appState.categories.expense || []).find(c => c.id === tx.categoryId);
        const acc = appState.accounts.find(a => a.id === tx.accountId);
        title = cat ? `${cat.icon} ${cat.name}` : "Pengeluaran";
        subtitle = `${acc ? acc.name : "Akun"} • ${txDateStr}${tx.note ? ` • ${tx.note}` : ""}`;
      }

      const formattedAmt = Currency.format(tx.amount, tx.currency, appState.currencies);

      item.innerHTML = `
        <div class="tx-item-left">
          <div class="tx-type-icon" style="background-color: ${iconBg}; color: ${iconColor};">
            ${icon}
          </div>
          <div>
            <div class="tx-item-title">${title}</div>
            <div class="tx-item-sub">${subtitle}</div>
          </div>
        </div>

        <div class="tx-item-right">
          <div class="tx-amount-val ${amountClass} tabular-nums">
            ${sign}${formattedAmt}
          </div>
          <button type="button" class="btn-del-tx" data-id="${tx.id}" title="Hapus Transaksi">✕</button>
        </div>
      `;

      dom.txFeedContainer.appendChild(item);
    });

    document.querySelectorAll(".btn-del-tx").forEach(btn => {
      btn.addEventListener("click", e => {
        const id = e.currentTarget.dataset.id;
        deleteTransaction(id);
      });
    });
  }

  // Populate Dropdown Akun Terkelompok Menggunakan <optgroup> Berdasarkan 6 Kategori
  function populateSelectOptions() {
    // 1. Dropdown Mata Uang Akun
    dom.accountCurrency.innerHTML = "";
    Object.keys(appState.currencies).forEach(code => {
      const cur = appState.currencies[code];
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = `${cur.code} - ${cur.name} (${cur.symbol})`;
      dom.accountCurrency.appendChild(opt);
    });

    // 2. Dropdown Mata Uang Transaksi
    dom.txCurrency.innerHTML = "";
    Object.keys(appState.currencies).forEach(code => {
      const cur = appState.currencies[code];
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = `${cur.code} (${cur.symbol})`;
      dom.txCurrency.appendChild(opt);
    });

    // 3. Dropdown Akun (Sumber & Tujuan) Terkelompok dengan <optgroup>
    dom.txAccount.innerHTML = "";
    dom.txAccountTo.innerHTML = "";

    const orderedGroupKeys = ["cash", "bank", "ewallet", "credit", "loan", "investment"];

    orderedGroupKeys.forEach(typeKey => {
      const typeConfig = Config.ACCOUNT_TYPES[typeKey];
      const accountsInGroup = appState.accounts.filter(a => a.type === typeKey);

      if (accountsInGroup.length > 0) {
        const optgroup1 = document.createElement("optgroup");
        optgroup1.label = `${typeConfig.icon} ${typeConfig.name}`;

        const optgroup2 = document.createElement("optgroup");
        optgroup2.label = `${typeConfig.icon} ${typeConfig.name}`;

        accountsInGroup.forEach(acc => {
          const opt1 = document.createElement("option");
          opt1.value = acc.id;
          opt1.textContent = `${acc.icon || typeConfig.icon} ${acc.name} (${acc.currency || appState.baseCurrency})`;
          optgroup1.appendChild(opt1);

          const opt2 = document.createElement("option");
          opt2.value = acc.id;
          opt2.textContent = `${acc.icon || typeConfig.icon} ${acc.name} (${acc.currency || appState.baseCurrency})`;
          optgroup2.appendChild(opt2);
        });

        dom.txAccount.appendChild(optgroup1);
        dom.txAccountTo.appendChild(optgroup2);
      }
    });

    // 4. Dropdown Kategori di Form Transaksi
    populateCategoryDropdown();
  }

  function populateCategoryDropdown() {
    dom.txCategory.innerHTML = "";
    const list = activeTxModalType === "income"
      ? (appState.categories.income || [])
      : (appState.categories.expense || []);

    list.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = `${cat.icon || "🏷️"} ${cat.name}`;
      dom.txCategory.appendChild(opt);
    });
  }

  // 6. Interaksi Modal & Form
  // Switcher Filter Transaksi
  dom.txFilterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      dom.txFilterButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeTxFilter = btn.dataset.filter;
      renderTransactionsFeed();
    });
  });

  // Switcher Mode Saldo (Utama vs Per Mata Uang)
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

  // Modal 1: Catat Transaksi
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
      dom.labelTxAccount.textContent = "Kirim dari Akun Sumber";
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

    // Deteksi jika transfer ke kartu kredit atau pinjaman
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

      const toCurr = (toAcc && toAcc.currency) || appState.baseCurrency;
      if (toAcc && (txCurr !== toCurr || txCurr !== (targetAcc && targetAcc.currency))) {
        const amtInTarget = Currency.convert(amt, txCurr, toCurr, appState.currencies);
        dom.txConversionText.innerHTML = `Transfer: <strong>${Currency.format(amt, txCurr, appState.currencies)}</strong> akan masuk senilai <strong>${Currency.format(amtInTarget, toCurr, appState.currencies)}</strong> ke akun tujuan.`;
        dom.txConversionPreview.style.display = "flex";
      } else {
        dom.txConversionPreview.style.display = "none";
      }
    } else {
      dom.creditPaymentNotice.style.display = "none";
      dom.loanPaymentNotice.style.display = "none";

      if (!targetAcc || amt <= 0) {
        dom.txConversionPreview.style.display = "none";
        return;
      }
      const accCurr = targetAcc.currency || appState.baseCurrency;
      if (txCurr !== accCurr) {
        const amtInAcc = Currency.convert(amt, txCurr, accCurr, appState.currencies);
        dom.txConversionText.innerHTML = `Valuta berbeda: <strong>${Currency.format(amt, txCurr, appState.currencies)}</strong> setara dengan <strong>${Currency.format(amtInAcc, accCurr, appState.currencies)}</strong> di akun ini.`;
        dom.txConversionPreview.style.display = "flex";
      } else {
        dom.txConversionPreview.style.display = "none";
      }
    }
  }

  dom.txAmount.addEventListener("input", updateLiveConversionPreview);
  dom.txCurrency.addEventListener("change", updateLiveConversionPreview);
  dom.txAccount.addEventListener("change", updateLiveConversionPreview);
  dom.txAccountTo.addEventListener("change", updateLiveConversionPreview);

  dom.btnOpenTx.addEventListener("click", openTxModal);
  dom.btnCloseTx.addEventListener("click", closeTxModal);
  dom.btnCancelTx.addEventListener("click", closeTxModal);

  dom.formTx.addEventListener("submit", e => {
    e.preventDefault();

    const amount = parseFloat(dom.txAmount.value);
    const currency = dom.txCurrency.value;
    const date = dom.txDate.value;
    const note = dom.txNote.value.trim();

    if (!amount || amount <= 0) {
      alert("Masukkan nominal transaksi yang valid!");
      return;
    }

    const newTx = {
      id: "tx-" + Date.now(),
      type: activeTxModalType,
      amount: amount,
      currency: currency,
      date: date,
      note: note
    };

    if (activeTxModalType === "transfer") {
      const fromId = dom.txAccount.value;
      const toId = dom.txAccountTo.value;
      if (fromId === toId) {
        alert("Akun asal dan akun tujuan transfer tidak boleh sama!");
        return;
      }
      newTx.fromAccountId = fromId;
      newTx.toAccountId = toId;
    } else {
      newTx.accountId = dom.txAccount.value;
      newTx.categoryId = dom.txCategory.value;
    }

    appState.transactions.push(newTx);
    Storage.saveData(appState);
    closeTxModal();
    renderAll();
  });

  function deleteTransaction(id) {
    if (confirm("Hapus catatan transaksi ini?")) {
      appState.transactions = appState.transactions.filter(t => t.id !== id);
      Storage.saveData(appState);
      renderAll();
    }
  }

  // Modal 2: Akun Keuangan (Tambah / Edit)
  function handleAccountTypeChange() {
    const type = dom.accountType.value;
    const typeConfig = Config.ACCOUNT_TYPES[type] || Config.ACCOUNT_TYPES.bank;

    if (type === "credit") {
      dom.fieldCreditLimit.style.display = "block";
      dom.fieldCreditInitialDebt.style.display = "block";
      dom.fieldCreditDates.style.display = "grid";
      dom.fieldLoanInitial.style.display = "none";
      dom.fieldInitialBalance.style.display = "none";
      dom.accountTypeHint.innerHTML = "Credit Card dicatat sebagai liabilitas dengan limit kredit, siklus penagihan, dan tanggal jatuh tempo.";
      dom.accountColor.value = "#f43f5e";
      dom.accountIcon.value = "💳";
    } else if (type === "loan") {
      dom.fieldCreditLimit.style.display = "none";
      dom.fieldCreditInitialDebt.style.display = "none";
      dom.fieldCreditDates.style.display = "none";
      dom.fieldLoanInitial.style.display = "block";
      dom.fieldInitialBalance.style.display = "none";
      dom.accountTypeHint.innerHTML = "Pinjaman dicatat sebagai liabilitas dengan sisa pokok yang berkurang saat menerima pembayaran transfer.";
      dom.accountColor.value = "#d97706";
      dom.accountIcon.value = "🤝";
    } else if (type === "investment") {
      dom.fieldCreditLimit.style.display = "none";
      dom.fieldCreditInitialDebt.style.display = "none";
      dom.fieldCreditDates.style.display = "none";
      dom.fieldLoanInitial.style.display = "none";
      dom.fieldInitialBalance.style.display = "block";
      dom.accountTypeHint.innerHTML = "Investasi dihitung dalam Kekayaan Bersih (Net Worth), tetapi tidak dimasukkan dalam Uang Siap Pakai.";
      dom.accountColor.value = "#8b5cf6";
      dom.accountIcon.value = "📈";
    } else {
      // cash, bank, ewallet
      dom.fieldCreditLimit.style.display = "none";
      dom.fieldCreditInitialDebt.style.display = "none";
      dom.fieldCreditDates.style.display = "none";
      dom.fieldLoanInitial.style.display = "none";
      dom.fieldInitialBalance.style.display = "block";
      dom.accountTypeHint.innerHTML = "Akun Cash, Bank, dan E-Wallet otomatis dihitung sebagai <strong>Sisa Uang Siap Pakai</strong>.";
      dom.accountColor.value = typeConfig.defaultColor;
      dom.accountIcon.value = typeConfig.icon;
    }
  }

  dom.accountType.addEventListener("change", handleAccountTypeChange);

  function openAddAccountModal(preselectedType = "bank") {
    dom.formAccount.reset();
    dom.accountEditId.value = "";
    dom.modalAccountTitle.textContent = "Tambah Akun Keuangan";

    if (Config.ACCOUNT_TYPES[preselectedType]) {
      dom.accountType.value = preselectedType;
    } else {
      dom.accountType.value = "bank";
    }

    dom.accountCurrency.value = appState.baseCurrency;
    dom.accountStatementDay.value = "15";
    dom.accountDueDay.value = "5";
    handleAccountTypeChange();
    dom.modalAccount.classList.add("open");
  }

  function openEditAccountModal(id) {
    const acc = appState.accounts.find(a => a.id === id);
    if (!acc) return;

    dom.accountEditId.value = acc.id;
    dom.modalAccountTitle.textContent = "Edit Akun Keuangan";
    dom.accountType.value = acc.type || "bank";
    dom.accountName.value = acc.name;
    dom.accountIcon.value = acc.icon || "🏦";
    dom.accountColor.value = acc.color || "#059669";
    dom.accountCurrency.value = acc.currency || appState.baseCurrency;

    handleAccountTypeChange();

    if (acc.type === "credit") {
      dom.accountCreditLimit.value = acc.creditLimit || 0;
      dom.accountInitialDebt.value = acc.initialBalance || 0;
      dom.accountStatementDay.value = acc.statementDay !== undefined ? acc.statementDay : 15;
      dom.accountDueDay.value = acc.dueDay !== undefined ? acc.dueDay : 5;
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

  dom.btnQuickAddAccount.addEventListener("click", () => openAddAccountModal("bank"));
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
    renderAll();
  });

  function deleteAccount(id) {
    if (appState.accounts.length <= 1) {
      alert("Anda harus memiliki minimal 1 akun keuangan!");
      return;
    }

    if (confirm("Hapus akun ini? Transaksi yang terhubung ke akun ini akan tetap ada dalam riwayat.")) {
      appState.accounts = appState.accounts.filter(a => a.id !== id);
      Storage.saveData(appState);
      renderAll();
    }
  }

  // Modal 3: Kelola Kategori
  function renderCategoriesModalLists() {
    dom.listCategoriesExpense.innerHTML = "";
    dom.listCategoriesIncome.innerHTML = "";

    (appState.categories.expense || []).forEach(cat => {
      const tag = document.createElement("span");
      tag.className = "cat-pill-item";
      tag.style.padding = "0.4rem 0.75rem";
      tag.innerHTML = `
        <span class="cat-pill-dot" style="background-color: ${cat.color};"></span>
        <span>${cat.icon} ${cat.name}</span>
        <button type="button" class="btn-del-cat" data-type="expense" data-id="${cat.id}" style="border:none;background:none;cursor:pointer;color:var(--color-slate-400);margin-left:0.35rem;">✕</button>
      `;
      dom.listCategoriesExpense.appendChild(tag);
    });

    (appState.categories.income || []).forEach(cat => {
      const tag = document.createElement("span");
      tag.className = "cat-pill-item";
      tag.style.padding = "0.4rem 0.75rem";
      tag.innerHTML = `
        <span class="cat-pill-dot" style="background-color: ${cat.color};"></span>
        <span>${cat.icon} ${cat.name}</span>
        <button type="button" class="btn-del-cat" data-type="income" data-id="${cat.id}" style="border:none;background:none;cursor:pointer;color:var(--color-slate-400);margin-left:0.35rem;">✕</button>
      `;
      dom.listCategoriesIncome.appendChild(tag);
    });

    document.querySelectorAll(".btn-del-cat").forEach(btn => {
      btn.addEventListener("click", e => {
        const catId = e.currentTarget.dataset.id;
        const catType = e.currentTarget.dataset.type;
        deleteCategory(catType, catId);
      });
    });
  }

  function openCategoriesModal() {
    renderCategoriesModalLists();
    dom.modalCategories.classList.add("open");
  }

  function closeCategoriesModal() {
    dom.modalCategories.classList.remove("open");
  }

  dom.btnOpenCategories.addEventListener("click", openCategoriesModal);
  if (dom.btnManageCatLink) dom.btnManageCatLink.addEventListener("click", openCategoriesModal);
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

    if (!appState.categories[type]) {
      appState.categories[type] = [];
    }

    appState.categories[type].push({
      id: "cat-" + Date.now(),
      name: name,
      icon: icon,
      color: color
    });

    Storage.saveData(appState);
    dom.formAddCategory.reset();
    renderCategoriesModalLists();
    renderAll();
  });

  function deleteCategory(type, id) {
    if ((appState.categories[type] || []).length <= 1) {
      alert("Minimal harus ada 1 kategori!");
      return;
    }
    appState.categories[type] = appState.categories[type].filter(c => c.id !== id);
    Storage.saveData(appState);
    renderCategoriesModalLists();
    renderAll();
  }

  // Modal 4: Kurs & Valuta
  function renderRatesModalList() {
    dom.ratesModalList.innerHTML = "";
    const baseCode = appState.baseCurrency;

    Object.keys(appState.currencies).forEach(code => {
      const cur = appState.currencies[code];
      const isBase = code === baseCode;

      const row = document.createElement("div");
      row.className = "rate-row-card";
      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span class="rate-badge-code">${code}</span>
          <div>
            <strong style="font-size: 0.875rem;">${cur.name}</strong> (${cur.symbol})
            <div style="font-size: 0.75rem; color: var(--color-slate-400);">
              ${isBase ? "⭐ Mata Uang Utama Aplikasi" : `1 ${code} = kurs terhadap ${baseCode}`}
            </div>
          </div>
        </div>

        <div>
          ${
            isBase
              ? `<span style="font-weight: 700; color: var(--color-brand-600); font-size: 0.85rem;">1 (Utama)</span>`
              : `<div style="display: flex; align-items: center; gap: 0.4rem;">
                   <span style="font-size: 0.8rem; color: var(--color-slate-500);">1 ${code} =</span>
                   <input type="number" step="any" min="0" value="${cur.rate}" data-code="${code}" class="rate-input-field input-live-rate tabular-nums">
                   <span style="font-size: 0.8rem; font-weight: 600;">${baseCode}</span>
                 </div>`
          }
        </div>
      `;

      dom.ratesModalList.appendChild(row);
    });

    document.querySelectorAll(".input-live-rate").forEach(input => {
      input.addEventListener("change", e => {
        const code = e.target.dataset.code;
        const newRate = parseFloat(e.target.value);
        if (newRate > 0 && appState.currencies[code]) {
          appState.currencies[code].rate = newRate;
          Storage.saveData(appState);
          renderAll();
        }
      });
    });
  }

  function openRatesModal() {
    renderRatesModalList();
    dom.modalRates.classList.add("open");
  }

  function closeRatesModal() {
    dom.modalRates.classList.remove("open");
  }

  dom.btnOpenRates.addEventListener("click", openRatesModal);
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
      alert(`Mata uang ${code} sudah ada dalam daftar.`);
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
    renderAll();
    alert(`Mata uang ${code} berhasil ditambahkan!`);
  });

  // Modal 5: Backup & Restore
  function openBackupModal() {
    dom.importStatusMsg.textContent = "";
    dom.modalBackup.classList.add("open");
  }

  function closeBackupModal() {
    dom.modalBackup.classList.remove("open");
  }

  dom.btnOpenBackup.addEventListener("click", openBackupModal);
  dom.btnCloseBackup.addEventListener("click", closeBackupModal);
  dom.btnDoneBackup.addEventListener("click", closeBackupModal);

  dom.btnExportJson.addEventListener("click", () => {
    Storage.exportBackup(appState);
  });

  dom.btnImportJson.addEventListener("click", () => {
    const file = dom.inputImportFile.files[0];
    if (!file) {
      alert("Pilih file backup .json terlebih dahulu!");
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      const result = Storage.importBackup(e.target.result);
      if (result.success) {
        appState = result.data;
        dom.importStatusMsg.style.color = "var(--color-brand-600)";
        dom.importStatusMsg.textContent = "✅ " + result.message;
        renderAll();
      } else {
        dom.importStatusMsg.style.color = "var(--color-expense-text)";
        dom.importStatusMsg.textContent = "❌ " + result.message;
      }
    };
    reader.readAsText(file);
  });

  dom.btnResetData.addEventListener("click", () => {
    if (confirm("PERINGATAN: Semua data akun, kategori, dan transaksi akan dihapus dan dikembalikan ke awal. Lanjutkan?")) {
      appState = Storage.resetToDefault();
      renderAll();
      closeBackupModal();
      alert("Aplikasi berhasil direset ke pengaturan awal!");
    }
  });

  window.addEventListener("click", e => {
    if (e.target.classList.contains("modal-backdrop")) {
      e.target.classList.remove("open");
    }
  });

  // Inisialisasi Pertama Kali
  renderAll();
});
