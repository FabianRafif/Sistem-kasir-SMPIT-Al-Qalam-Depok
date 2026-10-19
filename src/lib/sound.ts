/**
 * Audio Feedback System for POS SMPIT Al Qalam
 * - Web Audio API Synthesizer for Barcode Beeps (Zero external assets needed)
 * - Web Speech API for Indonesian Voice Confirmation dengan artikulasi alami dan jelas
 */

let audioCtx: AudioContext | null = null;
let lastPlayedTxId: string | null = null;
let lastPlayedTimestamp: number = 0;
let cachedIndonesianVoice: SpeechSynthesisVoice | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Cari dan simpan suara Bahasa Indonesia alami yang tersedia di browser (Chrome / Edge / Windows / Android)
 */
function findIndonesianVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // 1. Prioritas Suara Indonesia Resmi (Google Bahasa Indonesia / Microsoft Andika / Gadis)
  const idVoice = voices.find((v) => {
    const lang = (v.lang || '').toLowerCase();
    const name = (v.name || '').toLowerCase();
    return (
      lang.startsWith('id') ||
      lang.includes('indonesia') ||
      name.includes('indonesia') ||
      name.includes('gadis') ||
      name.includes('andika') ||
      name.includes('damayanti')
    );
  });

  return idVoice || null;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cachedIndonesianVoice = findIndonesianVoice();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedIndonesianVoice = findIndonesianVoice();
  };
}

/**
 * Konversi angka rupiah ke kalimat bahasa Indonesia (Terbilang)
 * Contoh: 1000 -> "seribu", 15000 -> "lima belas ribu"
 * Menghilangkan kesalahan artikulasi robot yang membaca "Er Pe satu titik nol nol nol"
 */
function angkaTerbilang(angka: number): string {
  const bilangan = [
    '',
    'satu',
    'dua',
    'tiga',
    'empat',
    'lima',
    'enam',
    'tujuh',
    'delapan',
    'sembilan',
    'sepuluh',
    'sebelas',
  ];

  angka = Math.floor(Math.abs(angka));

  if (angka === 0) return 'nol';
  if (angka < 12) return bilangan[angka];
  if (angka < 20) return `${bilangan[angka - 10]} belas`;
  if (angka < 100) {
    const sisa = angka % 10;
    return `${bilangan[Math.floor(angka / 10)]} puluh${sisa ? ' ' + bilangan[sisa] : ''}`;
  }
  if (angka < 200) {
    return `seratus${angka - 100 ? ' ' + angkaTerbilang(angka - 100) : ''}`;
  }
  if (angka < 1000) {
    const sisa = angka % 100;
    return `${bilangan[Math.floor(angka / 100)]} ratus${sisa ? ' ' + angkaTerbilang(sisa) : ''}`;
  }
  if (angka < 2000) {
    return `seribu${angka - 1000 ? ' ' + angkaTerbilang(angka - 1000) : ''}`;
  }
  if (angka < 1000000) {
    const ribu = Math.floor(angka / 1000);
    const sisa = angka % 1000;
    return `${angkaTerbilang(ribu)} ribu${sisa ? ' ' + angkaTerbilang(sisa) : ''}`;
  }
  if (angka < 1000000000) {
    const juta = Math.floor(angka / 1000000);
    const sisa = angka % 1000000;
    return `${angkaTerbilang(juta)} juta${sisa ? ' ' + angkaTerbilang(sisa) : ''}`;
  }
  return angka.toString();
}

/**
 * Beep nada tinggi saat scan barcode sukses
 */
export function playScanSuccessSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, ctx.currentTime); // A6 beep nada tinggi kasir
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (err) {
    console.warn('Audio scan beep gagal diputar:', err);
  }
}

/**
 * Nada peringatan/kesalahan saat barcode tidak ditemukan atau stok kurang
 */
export function playScanErrorSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now); // Nada rendah peringatan
    osc.frequency.setValueAtTime(180, now + 0.1);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  } catch (err) {
    console.warn('Audio scan error gagal diputar:', err);
  }
}

/**
 * Suara konfirmasi pelunasan QRIS berbahasa Indonesia yang jelas, fasih, dan tidak belibet
 * Menggunakan pengucapan resmi Bank Indonesia: "Kris" (bukan kiu-er-i-es)
 * Dan membacakan nominal uang secara terbilang ("seribu rupiah", "lima belas ribu rupiah")
 */
export function playQrisConfirmationVoice(transactionId: string, amount: number) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  // Cegah pemutaran ganda dalam rentang 3 detik untuk transaksi yang sama
  const now = Date.now();
  if (lastPlayedTxId === transactionId && now - lastPlayedTimestamp < 3000) {
    return;
  }
  lastPlayedTxId = transactionId;
  lastPlayedTimestamp = now;

  try {
    // 1. Ubah nominal ke kata terbilang agar dibaca halus dan fasih
    const nominalTeks = angkaTerbilang(amount);

    // 2. Kalimat ucapan standar soundbox kasir Indonesia:
    // "Kris" diucapkan fasih /kris/, bukan dieja huruf-per-huruf
    const speechText = `Pembayaran Kris berhasil diterima, sebesar ${nominalTeks} rupiah. Terima kasih.`;

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = 'id-ID';
    utterance.rate = 0.95; // Artikulasi tenang, santai, dan jelas
    utterance.pitch = 1.0;

    // 3. Gunakan suara Bahasa Indonesia terbaik yang tersedia
    if (!cachedIndonesianVoice) {
      cachedIndonesianVoice = findIndonesianVoice();
    }
    if (cachedIndonesianVoice) {
      utterance.voice = cachedIndonesianVoice;
    }

    // Pastikan antrean ucapan bersih sebelum bicara
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Gagal memutar ucapan QRIS:', err);
  }
}
