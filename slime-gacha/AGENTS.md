<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Slime Gacha — Dokumentasi Gameplay Lengkap

## Konsep Utama

Slime Gacha adalah game browser berbasis web yang menggabungkan dua mekanik utama: **gacha collection system** dan **action arcade game**. Pemain mengumpulkan karakter slime lewat sistem gacha menggunakan mata uang bernama **Souls**, lalu membawa karakter pilihan mereka ke dalam arena pertarungan. Setiap karakter yang dimiliki memberikan bonus pasif permanen, dan karakter yang dipilih aktif menghadirkan kemampuan khusus yang bisa diaktifkan dalam game.

---

## Sistem Mata Uang: Souls

Souls adalah satu-satunya mata uang dalam game. Semua aktivitas ekonomi berpusat pada souls.

Cara mendapatkan souls:
- Bermain game: setiap 10 poin skor menghasilkan 1 soul, dibatasi oleh durasi permainan
- Daily login: reward bertambah sesuai streak login berturut-turut, mulai dari 15 souls di hari pertama hingga 75 souls di hari ke-7 ke atas
- Achievement: setiap pencapaian yang terbuka pertama kali memberikan bonus souls langsung
- Redeem voucher: pembelian paket premium dari admin/seller resmi

Pemain mulai dengan 150 souls saat pertama kali mendaftar.

---

## Sistem Gacha

### Single Pull
Biaya 10 souls per pull (8 souls untuk member premium). Ada jeda 3 detik antar pull untuk mencegah spam.

### Multi Pull (10x)
Biaya 90 souls untuk 10 pull sekaligus (72 souls untuk premium). Lebih hemat 10% dibanding pull satu per satu. Dijamin minimal 1 karakter tier 3 ke atas dari 10 hasil.

### Tier dan Peluang
Ada 10 tier karakter dari yang paling umum hingga paling langka:

- Tier 1 — Common: peluang 35%
- Tier 2 — Uncommon: peluang 25%
- Tier 3 — Rare: peluang 18%
- Tier 4 — Epic: peluang 10%
- Tier 5 — Legendary: peluang 6%
- Tier 6 — Mythic: peluang 3.5%
- Tier 7 — Mythic+: peluang 1.5%
- Tier 8 — Ancient: peluang 0.5%
- Tier 9 — Eternal: peluang 0.2%
- Tier 10 — GOD: peluang 0.05%

### Sistem Pity
Pity counter naik 1 setiap pull yang tidak menghasilkan Mythic+ (tier 7 ke atas). Ketika counter reset ke 0 setelah mendapat Mythic+.

**Soft pity** aktif di pull ke-40: rate Mythic+ mulai naik bertahap, bisa mencapai 3,2× lipat dari rate normal pada pull ke-49.

**Hard pity** di pull ke-50: dijamin mendapat Mythic+ (tier 7 ke atas) tanpa pengecualian.

Member premium mendapat hard pity di pull ke-40, bukan ke-50.

---

## Roster Karakter (10 Karakter)

### Slime Hijau — Tier 3 (Rare)
Karakter dasar yang gesit. Pasif: bonus kecepatan dash. Ability: **Slime Rush** — kecepatan dash 3× selama 3 detik, cooldown 12 detik. Manifestasi boss kill: gelombang shockwave hijau + speed streak melesat ke segala arah.

### Slime Awan — Tier 4 (Epic)
Slime berbentuk awan yang melayang. Pasif: bonus sedikit skor. Ability: **Cloud Veil** — invincible selama 3 detik, cooldown 15 detik. Manifestasi boss kill: cloud puff biru naik ke atas layar + shimmer ring memudar.

### Slime Petir — Tier 5 (Legendary)
Slime bermuatan listrik. Pasif: bonus drop rate pickup. Ability: **Thunder Strike** — hancurkan semua musuh dalam radius 180px sekaligus, cooldown 10 detik. Manifestasi boss kill: 8 petir zig-zag menyambar dari titik ledakan + electric ring berdenyut.

### Slime Baja — Tier 5 (Legendary)
Slime berlapis baja. Pasif: +1 HP maksimum. Ability: **Iron Fortress** — serap 3 serangan berikutnya tanpa damage, cooldown 12 detik. Manifestasi boss kill: 12 shard besi meledak berputar keluar + cincin baja konsentris.

### Naga Lumpur — Tier 6 (Mythic)
Naga purba dari rawa. Pasif: passive score per detik lebih tinggi. Ability: **Mud Swamp** — perlambat semua musuh 70% selama 4 detik, cooldown 15 detik. Manifestasi boss kill: 5 ripple lumpur coklat melebar lambat + 14 percikan mud drops tersebar.

### Mecha Bot — Tier 7 (Mythic+)
Robot tempur mekanis. Pasif: skor multiplier ringan. Ability: **Laser Sweep** — hancurkan semua musuh dalam garis horizontal ±60px, cooldown 10 detik. Manifestasi boss kill: laser horizontal + vertikal menyapu seluruh layar + kotak mekanis mengembang.

### Slime Phoenix — Tier 7 (Mythic+)
Slime yang bangkit dari api. Pasif: revive sekali per game saat HP akan habis. Ability: **Blaze Heal** — pulihkan 2 HP sekaligus, cooldown 20 detik. Manifestasi boss kill: kolom api oranye naik penuh dari bawah ke puncak layar + 20 partikel api terbang ke atas.

### Slime Emas — Tier 8 (Ancient)
Slime bertabur emas. Pasif: soulsMultiplier 1,5× dari semua game. Ability: **Gold Fever** — skor 4× selama 5 detik, cooldown 20 detik. Manifestasi boss kill: 16 koin emas meledak ke segala arah + hujan emas turun dari atas layar.

### Dewa Slime — Tier 9 (Eternal)
Perwujudan dewa dari dimensi lain. Pasif: start invincible 2 detik di awal setiap game. Ability: **Divine Grace** — invincible 5 detik sekaligus pulihkan 1 HP, cooldown 25 detik. Manifestasi boss kill: pilar cahaya putih setinggi layar + 5 holy ring turun dari langit + full white flash.

### APEX — Tier 10 (GOD)
Entitas di luar pemahaman. Pasif: semua bonus digabung, skor multiplier tinggi. Ability: **ABSOLUTE ZERO** — hancurkan SEMUA musuh di layar + skor 5× selama 8 detik, cooldown 30 detik. Manifestasi boss kill: layar membeku putih → 16 kristal es meledak → screen shatter → bass drop digital.

---

## Sistem Pasif Karakter

Setiap karakter yang dimiliki (tidak perlu dipilih sebagai karakter aktif) memberikan bonus pasif permanen. Semakin banyak karakter yang dikumpulkan, semakin kuat bonus gabungannya.

Jenis bonus pasif yang bisa menumpuk:
- **scoreMultiplier** — pengali skor akhir, stacking secara multiplikatif
- **soulsMultiplier** — souls yang diperoleh dari game lebih banyak
- **maxHp** — HP maksimum bertambah
- **pickupDropRate** — peluang musuh menjatuhkan pickup lebih tinggi
- **extraPassivePerSec** — poin bonus otomatis tiap detik selama game
- **startInvincibleMs** — durasi invincible di awal game
- **reviveOnce** — kebangkitan sekali saat HP akan habis

Semua bonus ini berlaku otomatis tanpa perlu melakukan apapun, hanya dengan memiliki karakternya.

---

## Sistem Ability (Karakter Aktif)

Pemain memilih satu karakter sebelum masuk game. Karakter tersebut membawa ability aktif yang bisa diaktifkan dengan **klik kanan** selama permainan.

HUD menampilkan:
- Nama ability di bagian bawah layar
- Progress bar cooldown yang mengisi kembali secara real-time
- Status "CD" ketika sedang dalam cooldown

Jenis ability yang ada:
- **dash_boost** — boost kecepatan gerak sementara
- **invincible** — kebal serangan untuk durasi tertentu
- **aoe_kill** — ledakkan semua musuh dalam radius lingkaran
- **shield** — serap sejumlah hit tanpa damage
- **slow_enemies** — perlambat semua musuh aktif
- **line_kill** — hancurkan semua musuh dalam garis horizontal
- **heal** — pulihkan HP langsung
- **score_mult** — gandakan skor untuk durasi tertentu
- **nuke_all** — hancurkan semua musuh di layar sekaligus
- **soul_burst** — bonus souls instan

---

## Mekanik Gameplay Utama

### Arena
Ukuran arena 800×600 pixel dengan batas margin 30px di setiap sisi. Latar belakang grid gelap khas sci-fi. Pemain selalu dimulai di tengah arena.

### Kontrol
- **Klik kiri** di mana saja di layar: player melakukan dash ke arah kursor
- **Klik kanan**: aktifkan ability karakter yang sedang dipilih
- Tidak ada tombol keyboard yang digunakan selama gameplay

### Sistem Dash
Dash adalah cara satu-satunya untuk membunuh musuh. Saat melakukan dash dan kecepatan player melewati threshold tertentu saat menabrak musuh, musuh akan terkena damage. Dash yang terlalu lambat atau tidak dalam posisi dashing justru akan menyebabkan player terkena damage.

Player memiliki drag fisika sehingga kecepatan berkurang setelah dash. Ability dash_boost meningkatkan threshold ini.

### Sistem Wave
Game berlangsung selama 30 detik per sesi (38 detik jika item time_extend dipakai). Setiap 9 detik, wave baru dimulai secara otomatis. Setiap wave menambah jumlah dan kekuatan musuh. Saat wave selesai tanpa game over, pemain mendapat bonus skor.

### Jenis Musuh
- **Basic Slime** — musuh standar, HP 1, bergerak kecepatan menengah, skor 10
- **Spike Slime** — lebih cepat, HP 1, skor 25, berbentuk segitiga
- **Golem** — lambat tapi tangguh, HP 3, skor 80, memiliki HP bar
- **Boss** — muncul di akhir setiap wave, HP meningkat per wave (wave×15), memiliki HP bar, skor besar
- **Mutant** — muncul setelah boss mati, kecil-kecil tapi cepat, dalam jumlah besar

### Mutasi Boss
Ketika boss mati, ia tidak langsung hilang begitu saja. Boss **bermutasi** — meledak menjadi gerombolan klon kecil (mutant) sebanyak wave×5, dengan maksimum 25 klon. Klon ini lebih cepat dari boss aslinya dan bermunculan dari titik ledakan ke segala arah. Inilah momen paling kacau dan berbahaya dalam setiap wave.

### Pickup
Ketika musuh mati (bukan boss), ada peluang menjatuhkan pickup. Dua jenis pickup:
- **Heart** (55% dari drop): pulihkan 1 HP jika HP belum penuh, melayang naik-turun, hilang setelah 7 detik
- **Multi Star** (45% dari drop): bonus skor instan berdasarkan skor saat itu

---

## Sistem Combo

Membunuh musuh dalam jendela waktu 1,5 detik secara beruntun membangun combo counter. Setiap kill yang masuk dalam window tersebut menambah 1 combo, maksimum 8 combo.

Pengganda skor dari combo:
- Combo 1: 1× (tidak ada bonus)
- Combo 2: 1,25×
- Combo 3: 1,5×
- Combo 4: 1,75×
- Combo 5: 2×
- Combo 6–7: 2,25–2,5×
- Combo 8: 3× (maksimum)

Jika lebih dari 1,5 detik berlalu tanpa kill, combo reset ke 0. Terkena damage juga mereset combo. Teks combo ditampilkan di tengah layar dengan animasi bounce.

---

## Sistem Rank

Rank ditentukan oleh **high score terbaik** sepanjang masa pemain. Rank ditampilkan di navbar, profil, dan leaderboard.

- **Bronze** — 0 hingga 999 poin
- **Silver** — 1.000 hingga 2.999 poin
- **Gold** — 3.000 hingga 7.999 poin
- **Platinum** — 8.000 hingga 19.999 poin
- **Diamond** — 20.000 hingga 49.999 poin
- **Legend** — 50.000 poin ke atas

---

## Soul Shop (Item Sekali Pakai)

Pemain bisa membeli item dari Soul Shop sebelum masuk game. Item dikonsumsi otomatis saat game selesai (tidak bisa dibawa ke game berikutnya kecuali dibeli lagi).

- **+2 Max HP** — 40 souls: tambah 2 HP maksimum untuk game tersebut
- **Score 2×** — 60 souls: gandakan skor selama 15 detik pertama game
- **Soul Amplifier** — 50 souls: +50% souls yang diperoleh dari game tersebut
- **+8 Detik** — 80 souls: perpanjang durasi game menjadi 38 detik
- **Start Shield** — 45 souls: mulai game dengan 5 detik invincible

---

## Daily Login & Streak

Setiap hari pertama login, pemain mendapat reward souls otomatis. Reward bertambah sesuai streak login berturut-turut:

- Hari 1: 15 souls
- Hari 2: 20 souls
- Hari 3: 25 souls
- Hari 4: 30 souls
- Hari 5: 40 souls
- Hari 6: 55 souls
- Hari 7: 70 souls
- Hari 8 ke atas: 75 souls

Member premium mendapat 2× dari semua reward daily login ini.

Jika satu hari terlewat, streak reset ke 1.

---

## Sistem Achievement (25 Pencapaian)

Achievement dibagi 4 kategori:

**Game (⚔)**
- First Blood: selesaikan game pertama kali
- Survive Full: bertahan hingga waktu habis tanpa mati
- Wave 3 Reached, Wave 5 Reached, Wave 10 Reached: capai wave tersebut
- Kill 50, Kill 500, Kill 2000: total kills kumulatif semua game

**Gacha (✨)**
- First Pull: lakukan pull pertama kali
- Mythic Pull: dapatkan karakter Mythic+ atau lebih tinggi
- APEX Obtained: dapatkan karakter APEX (tier 10)
- Pity Trigger: dapatkan karakter dari hard pity
- Pull 10, Pull 50: lakukan sejumlah pull tersebut
- Multi Pull Master: lakukan 10× pull pertama kali

**Koleksi (📚)**
- Collect 3, Collect 5: miliki 3 atau 5 karakter unik
- Collect All: miliki semua 10 karakter dalam game

**Login (🔥)**
- Streak 3 Days, Streak 7 Days, Streak 30 Days: pertahankan login streak
- Skor 1K, 5K, 10K: capai skor tersebut dalam satu game

Setiap achievement memberikan bonus souls saat pertama kali terbuka. Setiap achievement hanya bisa diperoleh sekali.

---

## Leaderboard Global

Leaderboard menampilkan 10 pemain dengan high score tertinggi dari seluruh database. Setiap entri menampilkan:
- Nama pemain
- Badge premium (💎) jika aktif
- Badge rank (Bronze hingga Legend) sesuai skor mereka
- High score
- Jumlah game dimainkan
- Total kills

Leaderboard di-refresh setiap kali tab leaderboard dibuka.

---

## Sistem Premium

Premium adalah status berlangganan yang diperoleh lewat redeem voucher. Tidak ada pembayaran langsung di dalam aplikasi — pembelian dilakukan lewat admin/seller di luar platform, kemudian kode voucher diberikan kepada pembeli.

Keuntungan premium:
- Pull hanya 8 souls (hemat 2 dari harga normal 10)
- Multi pull hanya 72 souls (hemat 18)
- Hard pity di pull ke-40, bukan ke-50
- Daily login reward 2× lipat
- Badge premium di leaderboard dan profil

Durasi premium bisa ditumpuk — membeli premium lagi sebelum habis akan menambah hari ke ekspirasi yang ada.

---

## Paket Voucher

Lima paket yang tersedia:
- 100 Souls Pack — Rp 5.000
- 300 Souls Pack — Rp 10.000
- 1.000 Souls Mega Pack — Rp 25.000
- Premium 30 Hari + 500 Souls — Rp 20.000
- Premium 90 Hari + 1.500 Souls — Rp 50.000

Voucher diinput di halaman /redeem. Setiap kode hanya bisa digunakan satu kali oleh satu akun.

---

## Manifestasi Boss Kill (Per Karakter)

Ketika boss dari setiap wave berhasil dikalahkan, karakter aktif pemain menampilkan **manifestasi unik** — efek visual spektakuler yang menjadi ciri khas karakter tersebut — disertai **suara sintetis eksklusif** yang di-generate langsung di browser tanpa file audio.

- **Slime Hijau** — 5 shockwave ring hijau melebar cepat + 8 speed streak melesat. Suara: ascending sawtooth whoosh.
- **Slime Awan** — Cloud puff biru naik ke atas + shimmer ring memudar + layar cyan sejenak. Suara: triple sine bell chord ethereal.
- **Slime Petir** — 8 petir zig-zag menyambar dari pusat + electric ring berdenyut + camera flash kuning. Suara: noise burst + low thunder rumble.
- **Slime Baja** — 12 shard besi meledak berputar keluar + 3 cincin baja konsentris. Suara: FM synthesis metallic CLANG.
- **Naga Lumpur** — 5 ripple lumpur coklat melebar lambat + 14 mud drops tersebar. Suara: lowpass noise splosh + sine thud berat.
- **Mecha Bot** — Laser horizontal + vertikal menyapu seluruh layar + kotak mekanis mengembang. Suara: dual square wave laser descending.
- **Slime Phoenix** — Kolom api oranye naik penuh setinggi layar + 20 partikel api terbang. Suara: bandpass noise screech + sawtooth sweep.
- **Slime Emas** — 16 koin emas meledak ke segala arah + hujan emas dari atas layar. Suara: C major arpeggio C5-E5-G5-C6-E6.
- **Dewa Slime** — Pilar cahaya putih setinggi layar + 5 holy ring turun dari langit + full white flash. Suara: 5-note heavenly choir chord, slow attack.
- **APEX** — Layar membeku putih → 16 kristal es meledak → screen shatter → reality break. Suara: bass drop + icy screech + 3× digital glitch burst.

---

## Alur Sesi Bermain

1. Pemain login dengan username
2. Daily login reward muncul otomatis jika belum login hari ini
3. Di hub, pemain bisa: pull gacha, beli item shop, pilih karakter aktif, lihat koleksi, achievements, leaderboard
4. Pilih karakter aktif dari koleksi yang dimiliki (atau default tanpa ability)
5. Tekan Mulai Game
6. Arena dimulai, wave pertama spawn setelah 1,2 detik
7. Klik untuk dash, klik kanan untuk ability
8. Setiap 9 detik: wave baru, musuh makin banyak, boss muncul di akhir setiap wave
9. Boss mati → manifestasi karakter + suara + boss bermutasi jadi klon
10. Saat waktu habis atau HP habis: game over, layar hasil muncul
11. Souls + skor tersimpan ke database, achievements terbuka jika ada
12. Kembali ke hub otomatis setelah 1,2 detik

