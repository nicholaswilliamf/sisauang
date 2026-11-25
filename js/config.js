/**
 * config.js
 * Konfigurasi bawaan aplikasi SisaUang:
 * - Penyimpanan lokal (localStorage)
 * - Mata uang utama bawaan (IDR) & daftar kurs manual
 * - 6 Kategori Akun Keuangan (Cash, Bank, E-Wallet, Credit Card, Pinjaman, Investasi)
 * - Kategori pengeluaran & pemasukan bawaan
 */

window.SisaUang = window.SisaUang || {};

window.SisaUang.Config = {
  STORAGE_KEY: "sisauang_data_v1",
  DATA_VERSION: 2,

  DEFAULT_BASE_CURRENCY: "IDR",

  // Kurs manual awal terhadap 1 unit mata uang = X IDR
  DEFAULT_CURRENCIES: {
    IDR: {
      code: "IDR",
      name: "Rupiah Indonesia",
      symbol: "Rp",
      rate: 1,
      decimals: 0
    },
    USD: {
      code: "USD",
      name: "US Dollar",
      symbol: "$",
      rate: 16000,
      decimals: 2
    },
    SGD: {
      code: "SGD",
      name: "Singapore Dollar",
      symbol: "S$",
      rate: 12000,
      decimals: 2
    },
    EUR: {
      code: "EUR",
      name: "Euro",
      symbol: "€",
      rate: 17500,
      decimals: 2
    }
  },

  // Tepat 6 Kategori Akun Keuangan
  ACCOUNT_TYPES: {
    cash: {
      id: "cash",
      name: "Uang Tunai / Cash",
      categoryName: "Cash",
      isLiquid: true,
      isLiability: false,
      groupBadge: "Aset Likuid",
      icon: "💵",
      defaultColor: "#10b981",
      order: 1
    },
    bank: {
      id: "bank",
      name: "Bank",
      categoryName: "Bank",
      isLiquid: true,
      isLiability: false,
      groupBadge: "Aset Likuid",
      icon: "🏦",
      defaultColor: "#059669",
      order: 2
    },
    ewallet: {
      id: "ewallet",
      name: "E-Wallet",
      categoryName: "E-Wallet",
      isLiquid: true,
      isLiability: false,
      groupBadge: "Aset Likuid",
      icon: "📱",
      defaultColor: "#0284c7",
      order: 3
    },
    credit: {
      id: "credit",
      name: "Kartu Kredit / PayLater",
      categoryName: "Credit Card",
      isLiquid: false,
      isLiability: true,
      groupBadge: "Liabilitas",
      icon: "💳",
      defaultColor: "#f43f5e",
      order: 4
    },
    loan: {
      id: "loan",
      name: "Pinjaman",
      categoryName: "Pinjaman",
      isLiquid: false,
      isLiability: true,
      groupBadge: "Liabilitas",
      icon: "🤝",
      defaultColor: "#d97706",
      order: 5
    },
    investment: {
      id: "investment",
      name: "Investasi / Aset",
      categoryName: "Investasi/Aset",
      isLiquid: false,
      isLiability: false,
      groupBadge: "Aset Non-Likuid",
      icon: "📈",
      defaultColor: "#8b5cf6",
      order: 6
    }
  },

  // Akun Bawaan Awal (Mencakup contoh dari kelompok akun)
  DEFAULT_ACCOUNTS: [
    {
      id: "acc-dompet-tunai",
      name: "Dompet Tunai",
      type: "cash",
      currency: "IDR",
      initialBalance: 500000,
      icon: "💵",
      color: "#10b981"
    },
    {
      id: "acc-bank-utama",
      name: "BCA Tabungan Payroll",
      type: "bank",
      currency: "IDR",
      initialBalance: 7500000,
      icon: "🏦",
      color: "#059669"
    },
    {
      id: "acc-bank-kedua",
      name: "Mandiri Tabungan",
      type: "bank",
      currency: "IDR",
      initialBalance: 3000000,
      icon: "🏦",
      color: "#0284c7"
    },
    {
      id: "acc-ewallet",
      name: "GoPay & OVO",
      type: "ewallet",
      currency: "IDR",
      initialBalance: 450000,
      icon: "📱",
      color: "#0284c7"
    },
    {
      id: "acc-kartu-kredit",
      name: "BCA Everyday Card",
      type: "credit",
      currency: "IDR",
      creditLimit: 15000000,
      initialBalance: 1250000, // Tagihan berjalan awal
      statementDay: 15,        // Tanggal cetak tagihan bulanan (1-31)
      dueDay: 5,               // Tanggal jatuh tempo bulanan (1-31)
      icon: "💳",
      color: "#f43f5e"
    },
    {
      id: "acc-pinjaman",
      name: "Cicilan Elektronik 0%",
      type: "loan",
      currency: "IDR",
      initialBalance: 4000000, // Pokok pinjaman awal
      icon: "🤝",
      color: "#d97706"
    },
    {
      id: "acc-investasi",
      name: "Bibit Reksadana & SBN",
      type: "investment",
      currency: "IDR",
      initialBalance: 12000000,
      icon: "📈",
      color: "#8b5cf6"
    }
  ],

  // Kategori Bawaan Transaksi
  DEFAULT_CATEGORIES: {
    expense: [
      { id: "cat-kebutuhan-harian", name: "Kebutuhan Harian", icon: "🛒", color: "#10b981" },
      { id: "cat-tagihan-cicilan", name: "Tagihan & Cicilan", icon: "🧾", color: "#f59e0b" },
      { id: "cat-transportasi", name: "Transportasi", icon: "🚗", color: "#0ea5e9" },
      { id: "cat-belanja", name: "Belanja", icon: "🛍️", color: "#ec4899" },
      { id: "cat-hiburan", name: "Hiburan", icon: "🍿", color: "#8b5cf6" },
      { id: "cat-kesehatan", name: "Kesehatan", icon: "💊", color: "#ef4444" },
      { id: "cat-pendidikan", name: "Pendidikan & Karir", icon: "📚", color: "#3b82f6" },
      { id: "cat-lainnya-exp", name: "Lainnya", icon: "📦", color: "#64748b" }
    ],
    income: [
      { id: "cat-gaji", name: "Gaji Utama", icon: "💰", color: "#10b981" },
      { id: "cat-bonus", name: "Bonus & Freelance", icon: "🎁", color: "#f59e0b" },
      { id: "cat-investasi-in", name: "Imbal Hasil Investasi", icon: "📈", color: "#8b5cf6" },
      { id: "cat-hibah", name: "Pemberian / Hadiah", icon: "🧧", color: "#ec4899" },
      { id: "cat-lainnya-inc", name: "Pemasukan Lainnya", icon: "💵", color: "#64748b" }
    ]
  }
};
