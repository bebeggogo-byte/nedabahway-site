(function () {
  const deck = document.getElementById("deck");
  const slides = Array.from(document.querySelectorAll(".slide"));
  const navBtns = Array.from(document.querySelectorAll(".nav__btn"));
  const drawerItems = Array.from(document.querySelectorAll(".drawer__item"));
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const drawer = document.getElementById("drawer");
  const drawerClose = document.getElementById("drawerClose");
  const drawerBackdrop = document.getElementById("drawerBackdrop");

  const toast = document.getElementById("toast");

  let currentIndex = 0;

  // ---------- Helpers ----------
  function showToast(msg = "복사되었습니다") {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 900);
  }

  function clampIndex(i) {
    return Math.max(0, Math.min(slides.length - 1, i));
  }

  function goTo(index) {
    currentIndex = clampIndex(index);
    const x = currentIndex * deck.clientWidth;
    deck.scrollTo({ left: x, behavior: "smooth" });
    setActiveNav(currentIndex);
  }

  function setActiveNav(index) {
    navBtns.forEach((b) => b.classList.remove("is-active"));
    const found = navBtns.find((b) => Number(b.dataset.go) === index);
    if (found) found.classList.add("is-active");
  }

  // ---------- Navigation Events ----------
  navBtns.forEach((btn) => {
    btn.addEventListener("click", () => goTo(Number(btn.dataset.go)));
  });

  drawerItems.forEach((btn) => {
    btn.addEventListener("click", () => {
      goTo(Number(btn.dataset.go));
      closeDrawer();
    });
  });

  prevBtn?.addEventListener("click", () => goTo(currentIndex - 1));
  nextBtn?.addEventListener("click", () => goTo(currentIndex + 1));

  // Keyboard navigation
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") goTo(currentIndex - 1);
    if (e.key === "ArrowRight") goTo(currentIndex + 1);
  });

  // Update index on manual swipe/scroll
  deck.addEventListener("scroll", () => {
    const idx = Math.round(deck.scrollLeft / deck.clientWidth);
    if (idx !== currentIndex) {
      currentIndex = clampIndex(idx);
      setActiveNav(currentIndex);
    }
  });

  // Touch swipe (improve on iOS)
  let touchStartX = 0;
  let touchEndX = 0;

  deck.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });

  deck.addEventListener("touchend", (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const delta = touchStartX - touchEndX;
    if (Math.abs(delta) > 55) {
      if (delta > 0) goTo(currentIndex + 1);
      else goTo(currentIndex - 1);
    }
  });

  // ---------- Drawer ----------
  function openDrawer() {
    drawer.classList.add("open");
    drawerBackdrop.classList.add("show");
    hamburgerBtn.setAttribute("aria-expanded", "true");
    drawer.setAttribute("aria-hidden", "false");
  }

  function closeDrawer() {
    drawer.classList.remove("open");
    drawerBackdrop.classList.remove("show");
    hamburgerBtn.setAttribute("aria-expanded", "false");
    drawer.setAttribute("aria-hidden", "true");
  }

  hamburgerBtn?.addEventListener("click", openDrawer);
  drawerClose?.addEventListener("click", closeDrawer);
  drawerBackdrop?.addEventListener("click", closeDrawer);

  // ---------- Donate: Copy account only ----------
  const copyAccountBtn = document.getElementById("copyAccountBtn");
  const donateAccount = document.getElementById("donateAccount");

  copyAccountBtn?.addEventListener("click", async () => {
    const text = donateAccount?.textContent?.trim() || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast("계좌번호가 복사되었습니다");
    } catch {
      // fallback
      const temp = document.createElement("textarea");
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      document.body.removeChild(temp);
      showToast("계좌번호가 복사되었습니다");
    }
  });

  // ---------- Contact: Email drafts ----------
  const TO_EMAIL = "nedabah.way@gmail.com";

  const categoryButtons = document.getElementById("categoryButtons");
  const mailSubject = document.getElementById("mailSubject");
  const mailBody = document.getElementById("mailBody");

  const copySubjectBtn = document.getElementById("copySubjectBtn");
  const copyBodyBtn = document.getElementById("copyBodyBtn");
  const openMailBtn = document.getElementById("openMailBtn");

  const drafts = {
    seminar: {
      subject: "[교회 세미나 문의] 네다바웨이 세미나 진행 요청",
      body:
`안녕하세요. 네다바웨이 담당자님께 문의드립니다.

저희 교회(또는 공동체)에서 ‘말씀 읽기가 사귐으로 이어지도록 돕는’ 세미나 진행을 요청드리고 싶습니다.

가능하다면 아래 내용을 기준으로 안내 부탁드립니다.
- 희망 일정/시간:
- 대상(연령/인원):
- 세미나 주제(예: 말씀읽기/묵상/공동체 적용):
- 진행 장소(지역):
- 문의자 연락처:

감사합니다.
(이름/교회 또는 공동체명)`
    },
    sbm: {
      subject: "[SBM 문의] 참여/진행 방식 안내 요청",
      body:
`안녕하세요. 네다바웨이 담당자님께 문의드립니다.

SBM(Self Bible Meditation Maturity) 묵상 훈련에 관심이 있어 참여 또는 진행 방식 안내를 요청드립니다.

확인하고 싶은 내용입니다.
- 현재 운영 형태(개인/소그룹/코호트 등):
- 참여 조건 및 준비물:
- 진행 일정/기간:
- 온라인/오프라인 여부:

감사합니다.
(이름/연락처)`
    },
    resource: {
      subject: "[자료 요청] SBM/말씀읽기 가이드 자료 문의",
      body:
`안녕하세요. 네다바웨이 담당자님께 문의드립니다.

말씀읽기 및 SBM 관련 자료(가이드/노트/추천 자료)를 요청드리고 싶습니다.
가능한 범위 내에서 공유 가능한 자료가 있다면 안내 부탁드립니다.

- 사용 목적(개인/소그룹/교회):
- 필요한 자료 유형(가이드/노트/PDF 등):
- 받는 방법(메일/링크):

감사합니다.
(이름/연락처)`
    },
    collab: {
      subject: "[협력 제안] 네다바웨이와 협력 논의 요청",
      body:
`안녕하세요. 네다바웨이 담당자님께 협력 제안을 드립니다.

저희는 (기관/교회/단체명)이며, ‘말씀 읽기 → 사귐 → 삶의 연결’이라는 방향에 공감하여 협력 가능성을 논의하고 싶습니다.

가능하다면 아래 내용을 기준으로 미팅/통화 일정을 제안드립니다.
- 간단한 소개:
- 협력 아이디어:
- 희망 일정:

감사합니다.
(이름/직함/연락처)`
    },
    invite: {
      subject: "[초청 강의 요청] 말씀읽기/묵상 세미나 초청 문의",
      body:
`안녕하세요. 네다바웨이 담당자님께 문의드립니다.

저희 기관(또는 공동체)에서 네다바웨이의 강의/세미나를 초청하고 싶습니다.
가능하다면 진행 가능한 주제와 범위, 일정 조율 방법을 안내 부탁드립니다.

- 대상/인원:
- 장소/지역:
- 희망 일정:
- 요청 주제:

감사합니다.
(이름/연락처)`
    },
    etc: {
      subject: "[문의] 네다바웨이 관련 기타 문의",
      body:
`안녕하세요. 네다바웨이 담당자님께 문의드립니다.

문의 내용:
(여기에 내용을 작성해주세요)

감사합니다.
(이름/연락처)`
    }
  };

  function setDraft(catKey) {
    const d = drafts[catKey] || drafts.seminar;
    mailSubject.value = d.subject;
    mailBody.value = d.body;
  }

  function setActiveChip(catKey) {
    const chips = Array.from(document.querySelectorAll(".chip"));
    chips.forEach(c => c.classList.remove("is-active"));
    const target = chips.find(c => c.dataset.cat === catKey);
    if (target) target.classList.add("is-active");
  }

  categoryButtons?.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    const cat = btn.dataset.cat;
    setActiveChip(cat);
    setDraft(cat);
  });

  copySubjectBtn?.addEventListener("click", async () => {
    const text = mailSubject.value.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast("제목이 복사되었습니다");
    } catch {
      showToast("복사에 실패했습니다");
    }
  });

  copyBodyBtn?.addEventListener("click", async () => {
    const text = mailBody.value.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast("본문이 복사되었습니다");
    } catch {
      showToast("복사에 실패했습니다");
    }
  });

  openMailBtn?.addEventListener("click", () => {
    const subject = encodeURIComponent(mailSubject.value.trim());
    const body = encodeURIComponent(mailBody.value.trim());
    const mailto = `mailto:${TO_EMAIL}?subject=${subject}&body=${body}`;
    window.location.href = mailto;
  });

  // Init draft
  setDraft("seminar");
  setActiveChip("seminar");

  // Init position
  goTo(0);
})();