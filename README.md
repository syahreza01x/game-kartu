# Ruang Sidang

Permainan deduksi sosial untuk browser: satu pemain menghadapi empat bot dalam sidang lima peserta. Siapa yang bisa dipercaya ketika setiap kebijakan diputuskan di balik pintu tertutup?

## Status

Mode **Lawan Bot** sudah dapat dimainkan. Mode **Mabar LAN** baru tersedia sebagai menu dan belum mendukung koneksi antarperangkat. Progres permainan belum disimpan; memuat ulang halaman akan memulai dari awal.

## Fitur

- Peran acak: tiga Reformis, satu Otoritarian, satu Pemimpin Otoritarian.
- Bot dengan tingkat kesulitan Santai, Waspada, dan Tajam.
- Pencalonan wakil, pemungutan suara, pemilihan kebijakan, kegagalan pemerintahan, kekuasaan ketua sidang, veto, dan kondisi menang.
- Antarmuka responsif berbahasa Indonesia dengan visual arsip dan 17 kartu dokumen bernama serta berornamen berbeda. Nama dan ilustrasi tidak mengubah efek kebijakan.
- Musik latar instrumental orisinal yang dihasilkan secara sintetis di browser, tanpa berkas audio pihak ketiga. Musik mati secara default; nyalakan lewat tombol di layar sidang.
- Pengujian aturan dan simulasi permainan bot.

## Menjalankan

Memerlukan Node.js 22 atau lebih baru dan npm.

```powershell
npm ci
npm run dev
```

Buka URL lokal yang ditampilkan Vite (biasanya `http://localhost:5173/`). Jika port sudah digunakan, Vite akan menampilkan port lain.

## Menguji dan membangun

```powershell
npm test
npm run build
npm run preview
```

`npm test` menjalankan pengujian mesin aturan dan simulasi permainan pada ketiga tingkat kesulitan. `npm run build` memeriksa TypeScript dan menghasilkan aplikasi produksi di `dist/`.

## Cara bermain singkat

1. Buka berkas pribadi untuk melihat peran. Reformis tidak mengetahui peran pemain lain; anggota Otoritarian saling mengenal.
2. Ketua sidang mencalonkan wakil. Semua peserta memilih setuju atau menolak. Pemerintahan lolos bila suara setuju melebihi setengah peserta yang masih hidup.
3. Ketua menarik tiga kebijakan dari dek berisi enam Reformasi dan sebelas Kendali, lalu membuang satu secara rahasia. Wakil memilih satu dari dua sisanya untuk disahkan.
4. Tiga pemerintahan gagal berturut-turut mengesahkan kebijakan teratas secara otomatis, tanpa kekuasaan ketua sidang. Kendali ketiga memberi kesempatan mengintip tiga kartu teratas; Kendali keempat dan kelima memungkinkan ketua mengeluarkan seorang pemain. Setelah Kendali kelima, wakil bisa meminta veto; ketua harus menyetujuinya.
5. Reformis menang dengan lima Reformasi atau mengeluarkan Pemimpin Otoritarian. Otoritarian menang dengan enam Kendali, atau ketika Pemimpin Otoritarian terpilih menjadi wakil setelah sedikitnya tiga Kendali disahkan.

## Teknologi dan struktur

- React, TypeScript, Vite; permainan bot berjalan lokal di browser tanpa server.
- `src/game.ts`: keadaan permainan, aturan, dan keputusan bot.
- `src/App.tsx`: layar, interaksi, dan informasi pribadi pemain.
- `src/style.css`: kartu dan tata letak responsif.
- `src/game.test.mjs`: pengujian aturan dan simulasi.

Rencana mabar LAN memerlukan server tepercaya untuk menyimpan dek, peran, dan keputusan rahasia; menu saat ini tidak mengaktifkan jaringan atau ruang permainan.
