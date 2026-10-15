/**
 * Audio Feedback System for POS SMPIT Al Qalam
 * - Web Audio API Synthesizer for Barcode Beeps (Zero external assets needed)
 * - Web Speech API for Indonesian Voice Confirmation ("Pembayaran melalui QRIS, nominal Rp... masuk ke sistem")
 */

let audioCtx: AudioContext | null = null;
const playedSpeechSet = new Set<string>();

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
 * Suara konfirmasi QRIS menggunakan Web Speech API Bahasa Indonesia
 * Format wajib: "Pembayaran melalui QRIS, nominal Rp[nominal] masuk ke sistem."
 */
export function playQrisConfirmationVoice(transactionId: string, amount: number) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  // Idempotensi suara: jangan putar dua kali untuk transaksi yang sama
  if (playedSpeechSet.has(transactionId)) {
    return;
  }
  playedSpeechSet.add(transactionId);

  try {
    const formattedAmount = new Intl.NumberFormat('id-ID').format(amount);
    const speechText = `Pembayaran melalui QRIS, nominal Rp ${formattedAmount} masuk ke sistem.`;

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Cari suara bahasa Indonesia jika tersedia di browser pengguna
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find((v) => v.lang.startsWith('id') || v.lang.includes('ID'));
    if (idVoice) {
      utterance.voice = idVoice;
    }

    window.speechSynthesis.cancel(); // batalkan ucapan yang belum selesai
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Gagal memutar ucapan QRIS:', err);
  }
}
