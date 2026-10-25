'use strict';
/* ===== AI: gọi Gemini trực tiếp bằng API key CỦA TỪNG NGƯỜI DÙNG (lấy từ Google AI Studio) ===== */
(function () {
  const C = window.AIC_CONFIG;
  class AIError extends Error { constructor(msg, status) { super(msg); this.status = status; } }

  function friendly(status, body) {
    const m = (body && body.error && body.error.message) || '';
    if (status === 400 && /API key/i.test(m)) return 'API key không hợp lệ. Hãy kiểm tra lại key lấy từ Google AI Studio.';
    if (status === 400 && /location|not supported|User location/i.test(m)) return 'Khu vực hiện tại chưa được hỗ trợ cho model/API này: ' + m;
    if (status === 400) return 'Yêu cầu không hợp lệ: ' + m;
    if (status === 401 || status === 403) return 'API key bị từ chối hoặc chưa được cấp quyền (' + (m || status) + ').';
    if (status === 404) return 'Model này không dùng được với key của bạn. Hãy vào Cài đặt AI → Tải danh sách model và chọn model khác.';
    if (status === 429) return 'Đã chạm giới hạn lượt dùng (quota) của key/model này. Hãy chờ ít phút hoặc đổi sang model khác (Cài đặt AI).';
    if (status >= 500) return 'Máy chủ AI đang bận (' + status + '). Hãy thử lại sau ít giây.';
    return m || 'Lỗi không xác định (' + status + ')';
  }
  async function errFrom(res) { let b = null; try { b = await res.json(); } catch (e) { } return new AIError(friendly(res.status, b), res.status); }

  const AI = window.AI = {
    get key() { return SS.get('aic_key') || LS.get('aic_key') || ''; },
    get model() { return LS.get('aic_model') || C.DEFAULT_MODEL; },
    get ready() { return !!this.key; },
    save(key, model, remember = true) {
      if (remember) { LS.set('aic_key', key); SS.del('aic_key'); } else { SS.set('aic_key', key); LS.del('aic_key'); }
      if (model) LS.set('aic_model', model);
    },
    clear() { LS.del('aic_key'); SS.del('aic_key'); },

    async listModels(key) {
      const out = []; let token = '';
      for (let i = 0; i < 5; i++) {
        const res = await fetch(`${C.GEMINI_BASE}/models?pageSize=100${token ? '&pageToken=' + token : ''}`, { headers: { 'x-goog-api-key': key } });
        if (!res.ok) throw await errFrom(res);
        const j = await res.json(); out.push(...(j.models || [])); token = j.nextPageToken; if (!token) break;
      }
      return out.filter(m => (m.supportedGenerationMethods || []).includes('generateContent') && !/embedding|aqa|imagen|veo|tts|image-generation|live|robotics|computer-use/i.test(m.name))
        .map(m => ({ name: m.name, label: m.displayName || m.name, desc: m.description || '', inTok: m.inputTokenLimit, outTok: m.outputTokenLimit }))
        .sort((a, b) => (/flash/.test(b.name) - /flash/.test(a.name)) || b.name.localeCompare(a.name));
    },

    _body({ system, history = [], parts, text, json, maxTokens, temperature }) {
      const contents = history.map(h => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.text }] }));
      contents.push({ role: 'user', parts: parts || [{ text }] });
      const b = { contents, generationConfig: { temperature: temperature ?? .4 } };
      if (maxTokens) b.generationConfig.maxOutputTokens = maxTokens;
      if (json) b.generationConfig.responseMimeType = 'application/json';
      if (system) b.systemInstruction = { parts: [{ text: system }] };
      return b;
    },
    _textOf(j) {
      const c = j.candidates && j.candidates[0];
      if (!c) { const br = j.promptFeedback && j.promptFeedback.blockReason; throw new AIError(br ? 'Yêu cầu bị chặn bởi bộ lọc an toàn (' + br + '). Hãy diễn đạt lại.' : 'AI không trả về nội dung.'); }
      return ((c.content && c.content.parts) || []).map(p => p.text || '').join('');
    },
    async generate(opts, key = this.key, model = opts.model || this.model) {
      if (!key) throw new AIError('Chưa có API key. Hãy nhập key ở Cài đặt AI.');
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(`${C.GEMINI_BASE}/${model}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(this._body(opts)), signal: opts.signal });
        if (res.status === 503 && attempt === 0) { await sleep(1500); continue; }
        if (!res.ok) throw await errFrom(res);
        return this._textOf(await res.json());
      }
    },
    // Stream từng phần (SSE). onDelta(chunk, fullText)
    async stream(opts, onDelta, key = this.key, model = opts.model || this.model) {
      if (!key) throw new AIError('Chưa có API key. Hãy nhập key ở Cài đặt AI.');
      const res = await fetch(`${C.GEMINI_BASE}/${model}:streamGenerateContent?alt=sse`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(this._body(opts)), signal: opts.signal });
      if (!res.ok) throw await errFrom(res);
      const reader = res.body.getReader(), dec = new TextDecoder(); let buf = '', full = '', block = null;
      for (; ;) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true }); let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (!line.startsWith('data:')) continue; const js = line.slice(5).trim(); if (!js || js === '[DONE]') continue;
          try { const j = JSON.parse(js); if (j.promptFeedback && j.promptFeedback.blockReason) block = j.promptFeedback.blockReason; const t = ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).map(p => p.text || '').join(''); if (t) { full += t; onDelta && onDelta(t, full); } } catch (e) { /* bỏ qua dòng lỗi JSON */ }
        }
      }
      if (!full) throw new AIError(block ? 'Yêu cầu bị chặn bởi bộ lọc an toàn (' + block + ').' : 'AI không trả về nội dung. Thử lại hoặc đổi model.');
      return full;
    },
    imgPart: async blob => ({ inlineData: { mimeType: blob.type || 'image/jpeg', data: await Img.b64(blob) } }),

    // ---- Nhận dạng đề từ ảnh (vision → LaTeX). Trả về { type, quality, problems[], work, uncertain[] } ----
    async ocr(blob, extraHint = '') {
      const img = await Img.process(blob, { max: 1800, q: .9 }).catch(() => blob);
      const parts = [await this.imgPart(img), { text: AI.prompts.ocr + (extraHint ? '\n' + extraHint : '') }];
      const raw = await this.generate({ parts, temperature: .1 });
      return AI.parseOcr(raw);
    },
    parseOcr(raw) {
      const type = (raw.match(/LOAI:\s*([a-z_]+)/i) || [])[1] || 'de_bai', quality = (raw.match(/CHAT_LUONG:\s*([a-z_]+)/i) || [])[1] || 'tot';
      const sec = s => (raw.match(new RegExp('---' + s + '---([\\s\\S]*?)(?=---[A-Z_]+---|$)', 'g')) || []).map(x => x.replace(new RegExp('^---' + s + '---'), '').trim()).filter(Boolean);
      const problems = sec('BAI'), work = sec('BAI_LAM').join('\n'), uncertain = sec('KHONG_CHAC').join('\n').split('\n').map(x => x.replace(/^[-*•\s]+/, '').trim()).filter(Boolean);
      if (!problems.length) { const body = raw.replace(/^(LOAI|CHAT_LUONG):.*$/gim, '').trim(); if (body && type !== 'khong_lien_quan') problems.push(body); }
      return { type, quality, problems, work, uncertain, raw };
    },
    // Dự phòng khi không có AI: Tesseract.js (chỉ văn bản, KHÔNG nhận dạng công thức)
    async ocrFallback(blob, onProgress) {
      if (!window.Tesseract) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'; s.onload = res; s.onerror = () => rej(new Error('Không tải được bộ OCR dự phòng.')); document.head.appendChild(s); });
      const r = await Tesseract.recognize(blob, 'vie+eng', { logger: m => onProgress && m.progress != null && onProgress(m.progress) });
      return r.data.text.trim();
    },
    // Chuyển giọng nói (âm thanh) → chữ bằng Gemini (dự phòng khi trình duyệt không có Web Speech API)
    async transcribe(blob) {
      const data = await Img.b64(blob);
      return (await this.generate({ parts: [{ inlineData: { mimeType: (blob.type || 'audio/webm').split(';')[0], data } }, { text: 'Chép lại chính xác lời nói tiếng Việt trong đoạn âm thanh này (có thể xen thuật ngữ tiếng Anh). Chỉ trả về văn bản đã chép, không giải thích, không giải bài.' }], temperature: 0 })).trim();
    },
    parseMeta(text) {
      const m = text.match(/<<META>>([\s\S]*?)<<END>>/); let meta = null;
      if (m) { try { meta = JSON.parse(m[1]); } catch (e) { meta = null; } }
      return { body: text.replace(/<<META>>[\s\S]*?(<<END>>|$)/, '').trim(), meta };
    }
  };

  // ---------- Prompts ----------
  const CORE = String.raw`Bạn là trợ lý của website AI CLASSROOM, hỗ trợ sinh viên đại học học môn Lý thuyết Xác suất và Thống kê.
PHẠM VI: chỉ Xác suất thống kê và nội dung liên quan trực tiếp (đại số, giải tích, tổ hợp nền tảng, cách học Toán, cách trình bày lời giải). Chủ đề khác: từ chối lịch sự và mời quay lại Toán.
NGÔN NGỮ: trả lời bằng tiếng Việt, giọng thân thiện, khích lệ nhưng chính xác, không nịnh. Thuật ngữ tiếng Anh phải kèm giải thích dễ hiểu. Người học sai thì nói rõ sai ở đâu, vì sao, không chê bai.
CÔNG THỨC: viết LaTeX, nội dòng trong \( ... \), độc lập trong \[ ... \]. Luôn dùng ký hiệu chuẩn: \alpha, \sigma, \mu, \bar{x}, \Phi(z), \Phi_0(z)... TUYỆT ĐỐI không viết chữ "alpha/sigma/mu" thay cho ký hiệu và không dùng $...$. Chỉ phần là công thức mới đặt trong LaTeX; câu chữ tiếng Việt để ngoài công thức.
ĐỘ CHÍNH XÁC: tính từng bước, hiển thị phép tính, viết công thức tổng quát trước khi thay số, không làm tròn trung gian quá sớm, tự kiểm tra kết quả một lần (thay ngược/ước lượng/cách khác). Không chắc thì nói rõ mức độ chưa chắc. Phát hiện mình sai thì thừa nhận và sửa ngay. Không bịa định lý, công thức, nguồn. Đề thiếu dữ kiện/mơ hồ/có vẻ sai: hỏi lại hoặc nêu rõ giả định đang dùng. Phân biệt: xác suất biến cố và mật độ xác suất; phương sai tổng thể và phương sai mẫu (s^2 và \hat{s}^2); phân phối chuẩn và chuẩn tắc; quy ước bảng \Phi(z) (hàm phân phối) và \Phi_0(z) (hàm Laplace, \Phi_0(z)=\Phi(z)-0{,}5). Không tuyên bố "chính xác tuyệt đối" hay "đã kiểm chứng" nếu chưa có cơ chế kiểm tra.
MỤC ĐÍCH: giúp người học hiểu và làm được, không chỉ chép đáp án; nếu họ chỉ muốn chép, nhẹ nhàng nhắc mục tiêu học tập.`;

  const MODE = {
    goi_y: 'CHẾ ĐỘ GỢI Ý: KHÔNG đưa đáp án số và không giải trọn vẹn. Trong khối BƯỚC 3 hãy đưa 3 cấp gợi ý: **Cấp 1** (câu hỏi định hướng/nhắc kiến thức), **Cấp 2** (nêu công thức/phương pháp phù hợp, chưa thay số), **Cấp 3** (phân tích dữ kiện, cách chọn công thức, cách thay số; để người học tự làm bước cuối). BƯỚC 4 chỉ hướng dẫn cách tự kiểm tra kết quả.',
    huong_dan: 'CHẾ ĐỘ HƯỚNG DẪN: phân tích đề, xác định dữ kiện và đại lượng cần tìm, hướng dẫn từng bước, giải thích LÝ DO chọn mỗi công thức; có thể dừng ở bước tính cuối cùng và mời người học tự tính rồi đối chiếu.',
    kiem_tra: 'CHẾ ĐỘ KIỂM TRA: người học cung cấp lời giải/đáp án của họ. Kiểm tra TỪNG BƯỚC: bước nào đúng, bước nào sai, nguyên nhân, cách sửa. Gắn nhãn lỗi (Khái niệm / Công thức / Tính toán / Đọc đề / Thiếu bước / Trình bày). Nếu phần viết tay không đọc được, hỏi lại thay vì đoán.',
    day_du: 'CHẾ ĐỘ GIẢI ĐẦY ĐỦ: lời giải chi tiết từ đầu đến cuối, viết công thức tổng quát trước khi thay số, giải thích từng phép tính, nêu đáp án cuối rõ ràng.'
  };
  const UNDERSTAND = { chua_hieu_de: 'Người học CHƯA HIỂU ĐỀ: ở BƯỚC 1 hãy giải thích kỹ từng dữ kiện và yêu cầu cần tìm bằng ngôn ngữ đời thường.', chua_biet_cach: 'Người học hiểu đề nhưng CHƯA BIẾT CÁCH LÀM: nhấn mạnh gợi ý kiến thức và phương pháp ở BƯỚC 2.', lam_thu: 'Người học ĐÃ LÀM THỬ nhưng chưa chắc chắn: ưu tiên phát hiện lỗi sai.', xem_day_du: 'Người học muốn xem lời giải đầy đủ.' };

  AI.prompts = {
    core: CORE,
    ocr: String.raw`Bạn là bộ nhận dạng đề bài Xác suất Thống kê. Hãy chép lại CHÍNH XÁC nội dung trong ảnh. KHÔNG giải bài, KHÔNG tự đoán dữ kiện bị mất hay mờ.
- Công thức viết bằng LaTeX chuẩn: nội dòng \( ... \), độc lập \[ ... \]. Dùng \alpha, \sigma, \mu, \bar{x}, \Phi_0(z), \frac{a}{b}, \sqrt{x}... TUYỆT ĐỐI không viết chữ "alpha/sigma/mu" thay cho ký hiệu.
- Số thập phân giữ đúng như trong ảnh (dấu phẩy hoặc dấu chấm).
- Bảng số liệu: chép lại thành bảng Markdown (| cột | cột |).
- Phần chữ mờ/bị che/khó đọc: đặt trong [?...?] (ví dụ [?0,35?]) và liệt kê ở mục KHONG_CHAC.
- Nếu ảnh không phải bài Xác suất Thống kê hoặc nội dung liên quan: LOAI: khong_lien_quan.
Trả về ĐÚNG định dạng sau (không thêm lời dẫn):
LOAI: de_bai | bai_lam | bang_du_lieu | khong_lien_quan
CHAT_LUONG: tot | mo | bi_cat
---BAI---
(đề bài thứ nhất, chép đầy đủ)
---BAI---
(đề bài thứ hai nếu ảnh có nhiều bài; không có thì bỏ mục này)
---BAI_LAM---
(nếu ảnh có bài làm viết tay của người học: chép lại từng dòng; không có thì bỏ mục này)
---KHONG_CHAC---
(mỗi dòng một phần không chắc chắn; không có thì bỏ mục này)`,
    chat: CORE + String.raw`
NHÂN CÁCH CHATBOT: bạn là một bạn nữ người Việt học giỏi Toán, thân thiện, kiên nhẫn; xưng "mình – bạn"; câu ngắn gọn, đúng ngữ cảnh, có thể dùng cảm thán nhẹ, đồng cảm khi bạn ấy rối hoặc nản; không máy móc, không lặp khuôn mẫu, không thuyết giáo. Nhớ ngữ cảnh nhiều lượt, hiểu đại từ và câu hỏi nối tiếp; thiếu thông tin thì hỏi lại MỘT câu làm rõ; chủ động gợi ý bước tiếp theo. Trò chuyện xã giao bình thường được nhưng khéo kéo về học tập; điều chỉnh độ sâu theo trình độ người hỏi. Trung thực: không bịa; nói rõ khi không chắc hoặc ngoài phạm vi; nếu được hỏi thì nói rõ mình là trợ lý AI, không giả vờ là người thật.
Giải thích khái niệm bằng ví dụ gần gũi trước, công thức sau. Trả lời được MỌI câu hỏi liên quan đến Toán: xác suất thống kê, đại số, giải tích, tổ hợp, số học. Bài tập ngắn: vẫn theo tinh thần 4 bước (hiểu đề → kế hoạch → giải → kiểm tra). Bài dài: gợi ý bấm "Giải Đề Ngay" để dùng AI BUDDY – SOLVE.
Khi người dùng nói bằng giọng nói: trả lời ngắn (2–4 câu mỗi lượt), mỗi lượt một ý chính, dùng câu chữ dễ đọc thành tiếng; nếu một từ/số có vẻ bất thường do nhận dạng giọng nói, hãy hỏi xác nhận.`,
    solve(mode, understand) {
      return CORE + `
NHIỆM VỤ: hướng dẫn giải bài Xác suất Thống kê theo QUY TRÌNH GIẢI TOÁN 4 BƯỚC bắt buộc. ${MODE[mode] || MODE.day_du} ${UNDERSTAND[understand] || ''}
ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (đúng bốn tiêu đề sau, không thêm tiêu đề khác):
## BƯỚC 1 — Tìm hiểu nội dung bài toán
(dữ kiện đã cho, điều kiện, yêu cầu cần tìm; ký hiệu hóa đề bằng công thức)
## BƯỚC 2 — Xây dựng chương trình giải
(kiến thức áp dụng: định nghĩa, định lý, công thức, điều kiện áp dụng; kế hoạch giải; phân tích thành bài toán đơn giản hơn)
## BƯỚC 3 — Trình bày lời giải
(các bước giải chi tiết đánh số; công thức tổng quát trước khi thay số; cuối cùng ghi dòng **Kết quả:** ... phân biệt kết quả chính xác và làm tròn, có đơn vị nếu có)
## BƯỚC 4 — Kiểm tra và nghiên cứu lời giải
(kiểm tra tính hợp lý và điều kiện áp dụng, lỗi thường gặp, cách giải khác nếu có, bài toán tương tự hoặc khái quát hóa)
Sau cùng, thêm đúng MỘT dòng siêu dữ liệu (không giải thích): <<META>>{"chu_de":"tên chủ đề ngắn","chuong":"Chương 1..7","ket_qua":"dung|can_goi_y|sai_mot_phan|sai|khong_ap_dung","nhan_loi":"Khái niệm|Công thức|Tính toán|Đọc đề|Thiếu bước|Trình bày|","dang_bai":"dạng bài ngắn gọn"}<<END>>
(ket_qua chỉ đánh giá bài làm của người học ở chế độ kiểm tra; các chế độ khác ghi "khong_ap_dung"; nhan_loi để rỗng nếu không có lỗi.)
Nếu đề thiếu dữ kiện hoặc mơ hồ: ở BƯỚC 1 hỏi lại rõ ràng hoặc nêu giả định đang dùng; không tự ý bịa dữ kiện.`;
    },
    speech2math: String.raw`Bạn là bộ chuyển lời nói thành văn bản toán cho môn Xác suất Thống kê. Đầu vào là văn bản thô từ nhận dạng giọng nói, có thể chứa lỗi nghe nhầm. Hãy: (1) giữ nguyên lời dẫn tiếng Việt; (2) nhận ra cụm đọc ký hiệu, công thức, số và chuyển chính xác sang LaTeX đặt trong \( ... \); (3) dùng ngữ cảnh môn học để chọn ký hiệu đúng và sửa lỗi nghe nhầm có hệ thống (ví dụ "xích ma" → \sigma, "phương xai" → "phương sai"); (4) nếu một cụm có nhiều cách hiểu hợp lý, giữ phương án khả dĩ nhất, gắn cờ [?] kèm tối đa 3 phương án thay thế; (5) tuyệt đối không bịa số liệu, ký hiệu, không nối ghép phần bị thiếu, không giải bài; (6) chỉ trả về nội dung đã chuyển đổi (và dòng "NGHI NGỜ: ..." nếu có cờ), không giải thích thêm.`
  };
})();
