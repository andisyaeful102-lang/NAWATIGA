// Pleasant Web Audio synthesizer chimes for cafe ambiance

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playAdminChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Harmonic double bell (warm marimba-like tone)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    osc2.frequency.setValueAtTime(880, now);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12); // D6

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  } catch {
    // Graceful silent fallback
  }
}

export function playWaiterBell() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Resonant counter bell (two ping chimes)
    [0, 0.14].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, now + offset); // C6

      gain.gain.setValueAtTime(0.12, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.4);
    });
  } catch {
    // Graceful silent fallback
  }
}

export function playOrderSuccessSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Celebratory 3-note arpeggio (F#5, A#5, C#6)
    const notes = [739.99, 932.33, 1108.73];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.1, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.3);
    });
  } catch {
    // Graceful silent fallback
  }
}

// Cafe Buzzer / Digital Pager Ring when customer order is ready for pick-up at the bar
export function playCustomerPickupPager() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Pattern of pulsing bright pager tones (repeated dual chime: C6 - G6 - C7)
    const notes = [
      { freq: 1046.5, time: 0, dur: 0.12 },     // C6
      { freq: 1567.98, time: 0.14, dur: 0.14 }, // G6
      { freq: 2093.0, time: 0.30, dur: 0.25 },  // C7
      // Second burst
      { freq: 1046.5, time: 0.65, dur: 0.12 },
      { freq: 1567.98, time: 0.79, dur: 0.14 },
      { freq: 2093.0, time: 0.95, dur: 0.35 },
    ];

    notes.forEach((item) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(item.freq, now + item.time);

      gain.gain.setValueAtTime(0.2, now + item.time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + item.time + item.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + item.time);
      osc.stop(now + item.time + item.dur);
    });
  } catch {
    // Graceful silent fallback
  }
}

// Device vibration on mobile phone (Web Vibration API)
export function triggerDeviceVibration() {
  try {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      // Pager vibration sequence: buzz, pause, buzz, pause, long buzz
      navigator.vibrate([400, 150, 400, 150, 600]);
    }
  } catch {
    // Unsupported or blocked by browser policy
  }
}

/**
 * Loud, crisp POS cashier & kitchen order alert sound.
 * Plays a double ringing counter bell (ding-dong) followed by urgent two-tone chime
 * designed to be clearly audible in noisy cafe bar environments.
 */
export function playCashierOrderAlert() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Pattern: Bright double bell + kitchen chime
    const tones = [
      { freq: 1318.51, time: 0, dur: 0.35, gain: 0.25 },
      { freq: 1760.00, time: 0.16, dur: 0.45, gain: 0.28 },
      { freq: 2093.00, time: 0.45, dur: 0.50, gain: 0.30 },
      // Secondary echo ding
      { freq: 1760.00, time: 0.85, dur: 0.35, gain: 0.22 },
      { freq: 2093.00, time: 1.05, dur: 0.55, gain: 0.25 },
    ];

    tones.forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(t.freq, now + t.time);

      gain.gain.setValueAtTime(t.gain, now + t.time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t.time + t.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + t.time);
      osc.stop(now + t.time + t.dur);
    });

    triggerDeviceVibration();
  } catch {
    // Graceful silent fallback
  }
}

/**
 * Converts table strings like "01", "1", "04", "T-02", "BAR" into clear spoken Indonesian.
 */
export function formatTableForSpeech(tableNumber: string): string {
  if (!tableNumber) return 'satu';
  if (/bar|kasir/i.test(tableNumber)) {
    return 'Bar dan Kasir';
  }
  const clean = tableNumber.replace(/^T-?/i, '').trim();
  const num = parseInt(clean, 10);
  if (!isNaN(num) && num > 0) {
    return numberToIndonesianWords(num);
  }
  return tableNumber;
}

/**
 * Text-to-Speech (TTS) Voice Announcement for Orders in Indonesian
 */
export function speakIndonesianOrderNotification(tableNumber: string, isReminder = false) {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    // Cancel current speaking if already talking
    window.speechSynthesis.cancel();

    const isDirectBar = /bar|kasir/i.test(tableNumber);
    const spokenTable = formatTableForSpeech(tableNumber);
    const message = isReminder
      ? (isDirectBar
          ? 'Perhatian! Pesanan langsung di Bar atau Kasir masih menunggu diracik!'
          : `Perhatian! Pesanan dari meja ${spokenTable} masih menunggu diracik!`)
      : (isDirectBar
          ? 'Ada pesanan baru langsung di Bar atau Kasir!'
          : `Ada pesanan baru dari meja ${spokenTable}!`);

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    utterance.volume = 1.0;

    // Pick Indonesian voice if available
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find(
      (v) => v.lang.toLowerCase().startsWith('id') || v.lang.toLowerCase().includes('indonesia')
    );
    if (idVoice) {
      utterance.voice = idVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch {
    // Graceful fallback if TTS fails or blocked
  }
}

/**
 * Cancel any ongoing speech synthesis
 */
export function stopSpeaking() {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // ignore
  }
}

/**
 * Combined Cashier Alert: Loud POS Counter Chime + Indonesian Voice Callout
 */
export function playCashierVoiceAlert(tableNumber: string, isReminder = false) {
  // 1. Play loud counter bell & trigger vibration
  playCashierOrderAlert();

  // 2. Play voice announcement after bell chime ring
  setTimeout(() => {
    speakIndonesianOrderNotification(tableNumber, isReminder);
  }, 450);
}

/**
 * Converts numbers into Indonesian spoken words (e.g. 77000 -> tujuh puluh tujuh ribu)
 */
function numberToIndonesianWords(n: number): string {
  if (n === 0) return 'nol';
  const units = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

  if (n < 12) return units[n];
  if (n < 20) return units[n - 10] + ' belas';
  if (n < 100) return units[Math.floor(n / 10)] + ' puluh' + (n % 10 !== 0 ? ' ' + units[n % 10] : '');
  if (n < 200) return 'seratus' + (n % 100 !== 0 ? ' ' + numberToIndonesianWords(n % 100) : '');
  if (n < 1000) return units[Math.floor(n / 100)] + ' ratus' + (n % 100 !== 0 ? ' ' + numberToIndonesianWords(n % 100) : '');
  if (n < 2000) return 'seribu' + (n % 1000 !== 0 ? ' ' + numberToIndonesianWords(n % 1000) : '');
  if (n < 1000000) return numberToIndonesianWords(Math.floor(n / 1000)) + ' ribu' + (n % 1000 !== 0 ? ' ' + numberToIndonesianWords(n % 1000) : '');
  if (n < 1000000000) return numberToIndonesianWords(Math.floor(n / 1000000)) + ' juta' + (n % 1000000 !== 0 ? ' ' + numberToIndonesianWords(n % 1000000) : '');
  return `${n}`;
}

export function formatRupiahForSpeech(amount: number): string {
  if (!amount || isNaN(amount) || amount <= 0) return 'nol rupiah';
  const words = numberToIndonesianWords(Math.round(amount));
  return `${words} rupiah`;
}

/**
 * Bright POS Cash Register Chime ("Cha-ching" double harmonic tone)
 */
export function playCashRegisterChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Harmonic double ding + coin shimmer
    const notes = [
      { freq: 1567.98, time: 0, dur: 0.25, gain: 0.22 },     // G6
      { freq: 2093.00, time: 0.12, dur: 0.40, gain: 0.28 },   // C7
      { freq: 2637.02, time: 0.22, dur: 0.65, gain: 0.30 },   // E7
    ];

    notes.forEach((item) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(item.freq, now + item.time);

      gain.gain.setValueAtTime(item.gain, now + item.time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + item.time + item.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + item.time);
      osc.stop(now + item.time + item.dur);
    });

    triggerDeviceVibration();
  } catch {
    // quiet
  }
}

/**
 * Speaks payment received notification in Indonesian.
 * - KALO CASH / TUNAI: TIDAK memakai notifikasi total uang (hanya konfirmasi pembayaran tunai diterima)
 * - KALO QRIS / REKENING / TRANSFER: MEMAKAI notifikasi total uang lengkap untuk verifikasi dana masuk
 */
export function speakPaymentSuccessNotification(tableNumber: string, amount: number, paymentMethod = 'QRIS') {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const isDirectBar = /bar|kasir/i.test(tableNumber);
    const spokenTable = isDirectBar ? 'Bar atau Kasir' : `Meja ${formatTableForSpeech(tableNumber)}`;
    const isCash = /tunai|cash/i.test(paymentMethod);

    let message = '';
    if (isCash) {
      // CASH / TUNAI: Tidak usah memakai notif total uang
      message = `Pembayaran tunai berhasil diterima! ${spokenTable}.`;
    } else {
      // QRIS, REKENING, TRANSFER BANK: Wajib sebutkan nominal uang untuk validasi anti-salah transfer
      const spokenAmount = formatRupiahForSpeech(amount);
      const isQris = /qris/i.test(paymentMethod);
      const isRekening = /rekening|transfer|bca|mandiri|bri|bni/i.test(paymentMethod);
      const cleanMethod = isQris
        ? 'kris'
        : isRekening
        ? 'transfer rekening'
        : paymentMethod;

      message = `Pembayaran berhasil diterima! ${spokenTable}, sebesar ${spokenAmount}, melalui ${cleanMethod}.`;
    }

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'id-ID';
    utterance.rate = 1.02;
    utterance.pitch = 1.08;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find(
      (v) => v.lang.toLowerCase().startsWith('id') || v.lang.toLowerCase().includes('indonesia')
    );
    if (idVoice) {
      utterance.voice = idVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch {
    // quiet
  }
}

/**
 * Full Cashier Payment Announcement: Register Chime + Device Vibration + Indonesian TTS with exact amount
 */
export function playPaymentSuccessAnnouncement(tableNumber: string, amount: number, paymentMethod = 'QRIS') {
  playCashRegisterChime();

  setTimeout(() => {
    speakPaymentSuccessNotification(tableNumber, amount, paymentMethod);
  }, 400);
}

/**
 * Send HTML5 Desktop/Browser Notification if supported and granted
 */
export function sendBrowserNotification(title: string, options?: NotificationOptions) {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, {
          icon: '/favicon.ico',
          ...options,
        });
      }
    }
  } catch {
    // ignore
  }
}

