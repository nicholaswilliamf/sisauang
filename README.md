# SisaUang 💰 - Pencatat Keuangan Pribadi (6 Kelompok Akun & Siklus Credit Card)

Aplikasi pencatat keuangan modern, minimalis, dan elegan terinspirasi dari gaya **Bento Grid**, **Wise**, dan **Notion**. Dirancang **100% *offline-first*** untuk penggunaan pribadi yang privat, aman, dan mandiri langsung di peramban web tanpa koneksi internet atau server pihak ketiga.

---

## 🌟 6 Kategori Akun Keuangan Terstruktur (Grouped Containers)

Seluruh akun keuangan kini dikelompokkan ke dalam tepat **6 kategori** yang rapi dengan tampilan accordion buka/tutup dan subtotal otomatis:

1. **💵 Cash (Aset Likuid):** Kas tunai di tangan, dompet fisik, petty cash. Termasuk ke dalam *Sisa Uang Siap Pakai*.
2. **🏦 Bank (Aset Likuid):** Rekening tabungan, giro, dan payroll (mendukung banyak rekening bank dalam satu kelompok). Termasuk ke dalam *Sisa Uang Siap Pakai*.
3. **📱 E-Wallet (Aset Likuid):** Saldo dompet digital (GoPay, OVO, Dana, ShopeePay, dll.). Termasuk ke dalam *Sisa Uang Siap Pakai*.
4. **💳 Credit Card (Liabilitas):** Kartu kredit dan PayLater dengan fitur khusus:
   * **Limit Kredit, Tagihan Terpakai, dan Sisa Limit.**
   * **Siklus Penagihan Otomatis (Billing Cycle):** Menghitung rentang tanggal tagihan aktif (misal: `16 Nov – 15 Des 2026`) berdasarkan *Tanggal Cetak Tagihan (Statement Date)* bulanan (1–31) serta menjumlahkan transaksi belanja dalam periode tersebut.
   * **Tanggal Jatuh Tempo (Due Date) & Indikator Pengingat:** Menampilkan tanggal jatuh tempo berikutnya dengan hitung mundur hari (misal `Jatuh Tempo: 5 Des 2026 • H-10`) dan **badge peringatan visual (kuning/merah)** bila jatuh tempo $\le 7$ hari dan masih ada tagihan belum terbayar.
   * **Pembayaran Otomatis:** Transfer dari Bank/E-Wallet/Cash ke Credit Card otomatis memotong tagihan dan mengembalikan sisa limit.
5. **🤝 Pinjaman (Liabilitas):** Fasilitas pinjaman, KTA, cicilan gadget, atau utang pokok.
   * Menampilkan **Sisa Pokok Pinjaman**, total yang sudah dibayar, serta persentase pelunasan dengan progress bar.
   * Transfer dari akun likuid (Bank/E-Wallet/Cash) ke akun Pinjaman otomatis dicatat sebagai pembayaran angsuran pokok yang mengurangi sisa utang.
6. **📈 Investasi/Aset (Aset Non-Likuid):** Instrumen reksadana, saham, SBN, emas, dan deposito berjangka.
   * Dihitung penuh ke dalam **Net Worth**, tetapi tidak tercampur ke dalam **Sisa Uang Siap Pakai** belanja harian.

---

## 📊 Dashboard Hero Pintar

1. **Kartu Utama: Sisa Uang Siap Pakai (Gradien Hijau Gelap Elegan)**
   * Menampilkan total dana likuid (**Cash + Bank + E-Wallet**) dalam mata uang utama (IDR).
   * Callout indikator: **Total Kewajiban Aktif (Credit Card + Pinjaman)**.
   * Persentase rasio likuiditas terhadap total aset portofolio.

2. **Kartu Kedua: Total Kekayaan Bersih (Net Worth)**
   $$\text{Net Worth} = (\text{Total Akun Likuid} + \text{Total Investasi/Aset}) - (\text{Total Tagihan CC} + \text{Sisa Pokok Pinjaman})$$
   * Dilengkapi ringkasan arus kas (*Cashflow*) bulan berjalan: **↗️ Pemasukan** dan **↘️ Pengeluaran**.
   * Dukungan peninjauan multi-mata uang (*View Mode*) per valuta.

3. **Breakdown Pengeluaran per Kategori:**
   * Stacked bar multi-warna yang memvisualisasikan alokasi anggaran belanja.
   * Rincian pengeluaran per kategori: Kebutuhan Harian, Tagihan & Cicilan, Transportasi, Belanja, dll.

4. **Dropdown Transaksi Terkelompok (`<optgroup>`):**
   * Pilihan akun pada formulir transaksi (Pengeluaran, Pemasukan, dan Transfer) dikelompokkan rapi berdasarkan 6 kategori akun.
   * Notifikasi otomatis saat mentransfer dana untuk melunasi tagihan kartu kredit atau membayar angsuran pinjaman.

5. **Riwayat Transaksi Bergaya Feed (Modern & Bersih):**
   * Feed baris modern dengan filter instan: **Semua**, **💸 Pengeluaran**, **💰 Pemasukan**, dan **🔄 Transfer**.
   * Nilai konversi otomatis jika mata uang transaksi berbeda dengan mata uang akun.

---

## 📂 Struktur Berkas Proyek

```text
SisaUang/
├── index.html          # Antarmuka Bento Grid, Grouped Accordion, Feed Transaksi, dan Modal
├── manifest.json       # Web App Manifest PWA (instalasi ke Home Screen Android/iOS)
├── sw.js               # Service Worker (Cache-First offline support)
├── README.md           # Dokumentasi fitur dan panduan lengkap
├── icons/
│   ├── icon-192.png    # Ikon PWA resolusi 192x192
│   └── icon-512.png    # Ikon PWA resolusi 512x512
├── css/
│   └── style.css       # Desain modern, Plus Jakarta Sans, Grouped Accordion, dan Bento Cards
└── js/
    ├── config.js       # Definisi 6 kategori akun, akun awal, kategori transaksi, dan kurs default
    ├── currency.js     # Formatter angka & kalkulator konversi valuta manual
    ├── storage.js      # Pengelola LocalStorage, migrasi skema data, dan ekspor/impor JSON
    └── app.js          # Controller aplikasi, siklus penagihan CC, perhitungan pinjaman & net worth
```

---

## 🚀 Cara Menjalankan & Menginstal PWA (Home Screen)

1. **Jalankan Langsung (Offline Lokal):**
   * Buka folder `SisaUang`, lalu klik ganda berkas **`index.html`** pada peramban web pilihan Anda (Google Chrome, Microsoft Edge, Mozilla Firefox, Safari).
   * Aplikasi dapat digunakan 100% offline tanpa instalasi maupun koneksi internet.

2. **Instal sebagai Progressive Web App (PWA) di HP / Desktop:**
   * Jika di-host atau dijalankan lewat web server lokal (misalnya `localhost` atau hosting HTTPS):
     * **Android (Chrome):** Tekan menu titik tiga (⋮) > pilih **"Tambahkan ke Layar Utama"** atau **"Instal Aplikasi"**.
     * **iOS / iPhone (Safari):** Tekan tombol **Share** (kotak panah ke atas) > pilih **"Add to Home Screen"** (*Tambahkan ke Layar Utama*).
     * **Desktop (Chrome/Edge):** Klik ikon install (+) pada bilah alamat (URL bar) untuk menjadikannya aplikasi mandiri (*standalone window*).
   * Service Worker akan secara otomatis men-cache seluruh aset penting sehingga aplikasi dapat dibuka dan berfungsi penuh walau tanpa internet sama sekali.
