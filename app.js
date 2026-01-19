(() => {
  const deck = document.getElementById("deck");
  const slides = Array.from(deck.querySelectorAll(".slide"));
  const navBtns = Array.from(document.querySelectorAll("[data-nav]"));
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  // Donate
  const accountEl = document.getElementById("donationAccount");
  const copyAccountBtn = document.getElementById("copyAccountBtn");

  // Contact
  const mailSubject = document.getElementById("mailSubject");
  const mailBody = document.getElementById("mailBody");
  const copySubjectBtn = document.getElementById("copySubjectBtn");
  const copyBodyBtn = document.getElementById("copyBodyBtn");
  const openMailBtn = document.getElementById("openMailBtn");
  const chips = Array.from(document.querySelectorAll(".chip"));

  // Toast
  const toast = document.getElementById("toast");
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 1200);
  };

  // Slide index
  let idx = 0;
  const clamp = (n) => Math.max(0, Math.min(slides.length - 1, n));

  const getIndexById = (id) => slides.findIndex(s => s.dataset.slide === id);
  const setActiveNav = (slideId) => {
    navBtns.forEach(btn => {
      const isActive = btn.dataset.nav === slideId;
      btn.classList.toggle("is-active", isActive);
    });
  };

  const goTo = (n, smooth = true) => {
    idx = clamp(n);
    const x = idx * deck.clientWidth;
    deck.scrollTo({ left: x, behavior: smooth ? "smooth" : "auto" });
    setActiveNav(slides[idx].dataset.slide);
  };

  // Initial
  setActiveNav("home");

  // Nav click
  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.nav;
      const targetIndex = getIndexById(target);
      if (targetIndex >= 0) goTo(targetIndex);
    });
  });

  // Arrows
  prevBtn.addEventListener("click", () => goTo(idx - 1));
  nextBtn.addEventListener("click", () => goTo(idx + 1));

  // Keyboard
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") goTo(idx - 1);
    if (e.key === "ArrowRight") goTo(idx + 1);
  });

  // Keep idx synced when user resizes or scrolls (혹시라도)
  const syncIdx = () => {
    const w = deck.clientWidth || 1;
    const current = Math.round(deck.scrollLeft / w);
    idx = clamp(current);
    setActiveNav(slides[idx].dataset.slide);
  };
  deck.addEventListener("scroll", () => {
    // debounce-ish
    clearTimeout(syncIdx._t);
    syncIdx._t = setTimeout(syncIdx, 80);
  });
  window.addEventListener("resize", () => goTo(idx, false));

  // Copy util
  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast("복사 완료");
    } catch {
      // fallback
      const temp = document.createElement("textarea");
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      document.body.removeChild(temp);
      showToast("복사 완료");
    }
  };

  // Donate copy
  if (copyAccountBtn && accountEl) {
    copyAccountBtn.addEventListener("click", () => copyText(accountEl.textContent.trim()));
  }

  // Email templates (6)
  const TO = "nedabah.way@gmail.com";
  const templates = {
    church: {
      subject: "[문의] 교회 세미나/훈련 진행 요청",
      body:
`안녕하세요. 네다바웨이 담당자님께,

저는 (교회/기관명) (이름)입니다.
교회 내에서 말씀 읽기/묵상 적용/공동체 성숙을 위한 세미나 또는 훈련을 검토 중입니다.

가능하다면 아래 내용을 안내 부탁드립니다.
1) 진행 가능 주제/구성
2) 예상 소요 시간(예: 60/90/120분)
3) 준비물 및 진행 방식
4) 일정 후보

감사합니다.
- 이름:
- 연락처:
- 교회/기관:
`
    },
    sbm: {
      subject: "[문의] SBM 모임/가이드 자료 관련",
      body:
`안녕하세요. 네다바웨이 팀께,

저는 (이름)입니다.
SBM(Self Bible Meditation) 방식으로 말씀을 스스로 읽는 훈련을 더 배우고 싶어 문의드립니다.

가능하다면 아래 내용을 공유해주실 수 있을까요?
1) 모임(훈련) 참여 방법
2) 추천하는 시작 방식(개인/소그룹)
3) 가이드/노트/자료 제공 여부
4) 진행 일정 또는 안내 링크

감사합니다.
- 이름:
- 연락처:
`
    },
    partner: {
      subject: "[제안] 협업/파트너십 논의 요청",
      body:
`안녕하세요. 네다바웨이 담당자님께,

저는 (기관/단체명) (이름)입니다.
말씀 읽기 중심의 성숙 훈련과 관련하여 협업 가능성을 논의하고 싶습니다.

저희가 생각하는 협업 방향은 다음과 같습니다.
- 목적:
- 대상:
- 기간/형태:
- 기대하는 결과(과정 중심):

미팅 가능 일정 후보가 있다면 알려주시면 감사하겠습니다.
- 이름:
- 연락처:
- 기관/단체:
`
    },
    lecture: {
      subject: "[요청] 강의/워크숍 진행 가능 여부 문의",
      body:
`안녕하세요. 네다바웨이 팀께,

저는 (기관/학교/단체명) (이름)입니다.
현장 상황에 맞춘 강의/워크숍 진행을 요청드리고자 연락드립니다.

아래 정보를 전달드립니다.
1) 대상(인원/연령/특성):
2) 주제(희망 방향):
3) 날짜/시간:
4) 장소(지역):
5) 준비 가능한 환경(빔/마이크 등):

검토 후 가능 여부와 제안 구성을 안내해주시면 감사하겠습니다.
- 이름:
- 연락처:
`
    },
    donate: {
      subject: "[문의] 후원 관련 안내 요청",
      body:
`안녕하세요. 네다바웨이 팀께,

저는 (이름)입니다.
네다바웨이 사역을 후원하고 싶어 문의드립니다.

확인하고 싶은 내용은 아래와 같습니다.
1) 후원 방식(일시/정기)
2) 후원금 사용 범위
3) 추후 기부금 영수증 관련 계획

감사합니다.
- 이름:
- 연락처:
`
    },
    etc: {
      subject: "[문의] 네다바웨이 관련 문의드립니다",
      body:
`안녕하세요. 네다바웨이 담당자님께,

저는 (이름)입니다.
아래 내용으로 문의드립니다.

(문의 내용 작성)

감사합니다.
- 이름:
- 연락처:
`
    }
  };

  const applyTemplate = (key) => {
    const t = templates[key];
    if (!t) return;
    mailSubject.value = t.subject;
    mailBody.value = t.body;
    chips.forEach(c => c.classList.toggle("is-active", c.dataset.template === key));
  };

  // default template
  applyTemplate("church");

  // chips click
  chips.forEach(chip => {
    chip.addEventListener("click", () => applyTemplate(chip.dataset.template));
  });

  // copy buttons
  if (copySubjectBtn) copySubjectBtn.addEventListener("click", () => copyText(mailSubject.value));
  if (copyBodyBtn) copyBodyBtn.addEventListener("click", () => copyText(mailBody.value));

  // open mail app (mailto)
  if (openMailBtn) {
    openMailBtn.addEventListener("click", () => {
      const subject = encodeURIComponent(mailSubject.value || "");
      const body = encodeURIComponent(mailBody.value || "");
      window.location.href = `mailto:${TO}?subject=${subject}&body=${body}`;
    });
  }

  // start at home without jump
  goTo(0, false);
})();
