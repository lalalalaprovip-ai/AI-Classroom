// speechService: nghe (liên tục, KHÔNG tự tắt) + đọc tiếng Việt.
import { toSpeech } from './math.js';
const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
export const canListen = () => !!SR;

export class Listener {
  constructor({ onText, onState, onError, lang = 'vi-VN' }) { Object.assign(this, { onText, onState, onError, lang, base: '', sess: '', stopped: true, rec: null, fails: 0 }); }
  start(initial = '') {
    if (!SR) { this.onError?.('NOT_SUPPORTED', 'Trình duyệt này chưa hỗ trợ nhận giọng nói. Hãy dùng Chrome hoặc Edge, hoặc gõ chữ trực tiếp.'); return false; }
    this.base = initial ? initial.replace(/\s*$/, ' ') : ''; this.sess = ''; this.stopped = false; this.fails = 0; this._open(); return true;
  }
  _open() {
    const r = new SR(); this.rec = r; r.lang = this.lang; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    r.onstart = () => this.onState?.('listening');
    r.onresult = e => {
      let fin = '', itm = '';
      for (let i = 0; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) fin += t; else itm += t; }
      this.sess = fin; this.fails = 0; this.onText?.(this.base + fin, itm);
    };
    r.onerror = e => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { this.stopped = true; this.onState?.('idle'); this.onError?.('NO_PERMISSION', 'Bạn chưa cho phép dùng micro. Hãy bật quyền micro trong cài đặt trình duyệt, hoặc gõ chữ trực tiếp.'); }
      else if (e.error === 'network' && ++this.fails > 4) { this.stopped = true; this.onState?.('idle'); this.onError?.('NETWORK', 'Mất kết nối dịch vụ nhận giọng nói. Hãy kiểm tra mạng rồi bấm micro lại.'); }
      // 'no-speech' / 'aborted': bỏ qua, onend sẽ tự mở lại
    };
    r.onend = () => { // Chrome tự ngắt sau một lúc im lặng -> mở lại cho tới khi người dùng bấm tắt
      this.base += this.sess ? this.sess.replace(/\s*$/, ' ') : ''; this.sess = '';
      if (!this.stopped) setTimeout(() => { if (!this.stopped) { try { this._open(); } catch { setTimeout(() => !this.stopped && this._open(), 500); } } }, 150);
      else this.onState?.('idle');
    };
    try { r.start(); } catch { /* đã chạy */ }
  }
  stop() { this.stopped = true; try { this.rec?.stop(); } catch { } this.onState?.('idle'); }
  get active() { return !this.stopped; }
}

let voices = [], warned = false;
const loadVoices = () => { voices = speechSynthesis.getVoices(); };
if (typeof speechSynthesis !== 'undefined') { loadVoices(); speechSynthesis.addEventListener?.('voiceschanged', loadVoices); }
const viVoice = () => voices.find(v => /^vi/i.test(v.lang) && /google|online|natural/i.test(v.name)) || voices.find(v => /^vi/i.test(v.lang));
let token = 0;
export function stopSpeak() { token++; try { speechSynthesis.cancel(); } catch { } }
export function speak(text, { rate = .95, onend, onWarn } = {}) {
  if (typeof speechSynthesis === 'undefined') { onWarn?.('Trình duyệt chưa hỗ trợ đọc thành tiếng.'); return; }
  stopSpeak(); const my = token;
  const plain = toSpeech(text); if (!plain) return;
  const v = viVoice(); if (!v && !warned) { warned = true; onWarn?.('Thiết bị chưa có giọng đọc tiếng Việt; hãy cài giọng "Tiếng Việt" trong cài đặt hệ thống để nghe chuẩn nhất.'); }
  const chunks = plain.match(/[^.!?;:]+[.!?;:]?/g)?.flatMap(s => s.length > 180 ? s.match(/.{1,170}(\s|$)/g) : [s]) || [plain];
  let i = 0;
  const next = () => {
    if (my !== token) return; if (i >= chunks.length) { onend?.(); return; }
    const u = new SpeechSynthesisUtterance(chunks[i++].trim()); u.lang = 'vi-VN'; if (v) u.voice = v; u.rate = rate;
    u.onend = next; u.onerror = next; speechSynthesis.speak(u);
  };
  next();
}
