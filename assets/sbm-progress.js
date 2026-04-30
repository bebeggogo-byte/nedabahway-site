/* SBM 실시간 진행 카운트 갱신 — 모든 SBM 관련 페이지에서 fetch */
(async function() {
  try {
    const r = await fetch('/sbm-progress.json?v=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();

    const setText = (sel, val) => {
      document.querySelectorAll(sel).forEach(el => { el.textContent = val; });
    };

    setText('[data-stat="completed"]', (data.completed_chapters || 0).toLocaleString());
    setText('[data-stat="total-chapters"]', (data.total_chapters || 0).toLocaleString());
    setText('[data-stat="total-books"]', String(data.total_books || 0));
    setText('[data-stat="started-books"]', (data.started_books || 0) + ' / ' + (data.total_books || 0));
    setText('[data-stat="started-only"]', String(data.started_books || 0));
    setText('[data-stat="stages"]', String(data.stages || 0));
    setText('[data-stat="hebrew"]', String(data.hebrew_terms || 0));
    setText('[data-stat="greek"]', String(data.greek_terms || 0));
    setText('[data-stat="hebrew-greek"]', (data.hebrew_terms || 0) + '·' + (data.greek_terms || 0));
    setText('[data-stat="open-questions"]', String(data.open_questions || 0));

    // 권 카드 갱신: data-book="GEN" 등
    document.querySelectorAll('[data-book]').forEach(card => {
      const code = card.dataset.book;
      const book = data.books && data.books[code];
      if (!book) return;
      const pct = book.total > 0 ? Math.round(book.completed / book.total * 100) : 0;
      const arc = card.querySelector('.book-card__progress-arc');
      if (arc) arc.style.setProperty('--p', pct);
      // 착수된 권(진행률 > 0) 강조
      if (book.completed > 0) card.classList.add('is-started');
      else card.classList.remove('is-started');
      const txt = card.querySelector('[data-book-progress]') || card.querySelector('.book-card__progress');
      if (txt) {
        const arcHtml = '<span class="book-card__progress-arc" style="--p:' + pct + '"></span>';
        txt.innerHTML = arcHtml + book.completed + ' / ' + book.total;
      }
      const pctEl = card.querySelector('[data-book-pct]');
      if (pctEl) pctEl.textContent = pct + '%';
    });

    // 갱신 시각
    document.querySelectorAll('[data-stat="updated"]').forEach(el => {
      try {
        const d = new Date(data.updated);
        el.textContent = d.toLocaleDateString('ko-KR') + ' ' +
          d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      } catch (e) { el.textContent = data.updated || ''; }
    });
  } catch (e) {
    console.warn('SBM progress 갱신 실패:', e);
  }
})();
