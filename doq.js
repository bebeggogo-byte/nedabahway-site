document.addEventListener("DOMContentLoaded", () => {
  // DOM 요소 선택
  const stage = document.getElementById("stage");
  const slides = Array.from(document.querySelectorAll(".slide"));
  const tabs = document.querySelectorAll(".tab");
  const indicator = document.getElementById("pageIndicator");
  const toast = document.getElementById("toast");
  const nextBtn = document.getElementById("nextPageBtn");
  const brandBtn = document.getElementById("brandBtn");

  // === [기능 1] 알림 메시지 (Toast) ===
  const showToast = (message) => {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2000); // 2초 후 사라짐
  };

  // === [기능 2] 페이지 이동 시스템 (가장 중요) ===
  const moveToPage = (targetId) => {
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', inline: 'start' });
    }
  };

  // 1. 하단 탭 클릭
  tabs.forEach(tab => {
    tab.addEventListener("click", (e) => {
      // currentTarget을 써서 아이콘을 눌러도 버튼 전체가 인식되게 함
      const targetId = e.currentTarget.dataset.target;
      moveToPage(targetId);
    });
  });

  // 2. 상단 브랜드명 클릭 -> 홈으로
  brandBtn.addEventListener("click", () => moveToPage("home"));

  // 3. 상단 화살표 클릭 -> 다음 페이지
  nextBtn.addEventListener("click", () => {
    const width = stage.offsetWidth;
    const currentScroll = stage.scrollLeft;
    const currentIndex = Math.round(currentScroll / width);
    const nextIndex = (currentIndex + 1) % slides.length;
    const nextId = slides[nextIndex].id;
    moveToPage(nextId);
  });

  // 4. 스크롤 감지 (현재 위치 표시 업데이트)
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        
        // 모든 탭 비활성화 후 현재 탭 활성화
        tabs.forEach(t => t.classList.remove("active"));
        const activeTab = document.querySelector(`.tab[data-target="${id}"]`);
        if (activeTab) activeTab.classList.add("active");

        // 헤더 텍스트 변경
        const pageNames = {
          home: "홈",
          sbm: "SBM 훈련",
          programs: "프로그램",
          donate: "동행",
          contact: "문의하기"
        };
        if (indicator) indicator.textContent = pageNames[id];
      }
    });
  }, { root: stage, threshold: 0.51 }); // 51% 이상 보이면 인식

  slides.forEach(slide => observer.observe(slide));


  // === [기능 3] 사용자 동선 연결 (UX 최적화) ===
  
  // 1. 프로그램 카드 클릭 -> 문의 탭으로 이동 & 자동 선택
  const programCards = document.querySelectorAll(".card[data-link='contact']");
  programCards.forEach(card => {
    card.addEventListener("click", (e) => {
      const type = e.currentTarget.dataset.type;
      
      // 문의 페이지로 이동
      moveToPage("contact");

      // 약간의 지연 후 버튼 클릭 시뮬레이션 (이동 효과 후 실행)
      setTimeout(() => {
        const targetBtn = document.querySelector(`.catBtn[data-type="${type}"]`);
        if (targetBtn) targetBtn.click();
        showToast("관련 문의 양식이 준비되었습니다.");
      }, 500);
    });
  });

  // 2. SBM 도구 버튼 클릭
  const toolBtns = document.querySelectorAll(".toolBtn");
  toolBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      const msg = e.currentTarget.dataset.msg;
      showToast(msg);
    });
  });

  // 3. 메인 배너 클릭 -> SBM 탭으로 이동
  const quoteCard = document.getElementById("quoteCard");
  if(quoteCard) {
    quoteCard.addEventListener("click", () => {
      moveToPage("sbm");
      showToast("SBM 훈련 과정을 살펴보세요.");
    });
  }


  // === [기능 4] 메일 작성 및 계좌 복사 ===
  
  // 메일 템플릿
  const mailBtns = document.querySelectorAll(".catBtn");
  const subjectEl = document.getElementById("mailSubject");
  const bodyEl = document.getElementById("mailBody");
  const sendBtn = document.getElementById("btnSendMail");

  const templates = {
    sbm: { sub: "[SBM 문의] 참여 신청합니다", body: "1. 성함:\n2. 연락처:\n3. 참여 희망 이유:" },
    church: { sub: "[세미나 문의] 교회 초청 문의", body: "1. 교회명/지역:\n2. 희망 일정:\n3. 예상 인원:" },
    ai: { sub: "[AI 강의] 워크숍 문의", body: "1. 단체명:\n2. 수강 대상:\n3. 요청 사항:" },
    etc: { sub: "[기타 문의] 문의드립니다", body: "자유롭게 내용을 적어주세요." }
  };

  mailBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      // 스타일 변경
      mailBtns.forEach(b => b.classList.remove("active"));
      e.currentTarget.classList.add("active");

      // 내용 채우기
      const type = e.currentTarget.dataset.type;
      const data = templates[type];
      subjectEl.textContent = data.sub;
      bodyEl.textContent = data.body;

      // 버튼 활성화
      sendBtn.classList.remove("disabled");
      sendBtn.href = `mailto:nedabah.way@gmail.com?subject=${encodeURIComponent(data.sub)}&body=${encodeURIComponent(data.body)}`;
    });
  });

  // 계좌 복사
  const copyBtn = document.getElementById("btnCopyAccount");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const acc = "927-910009-77504";
      navigator.clipboard.writeText(acc).then(() => {
        showToast("계좌번호가 복사되었습니다! ✨");
        copyBtn.textContent = "복사 완료";
        setTimeout(() => copyBtn.textContent = "계좌번호 복사", 2000);
      }).catch(() => {
        showToast("복사 실패. 직접 입력해주세요.");
      });
    });
  }


  // === [기능 5] 후기 (로컬 스토리지) ===
  const revContainer = document.getElementById("reviewContainer");
  const revForm = document.getElementById("reviewFormBox");
  const writeReviewBtn = document.getElementById("btnWriteReview");

  const loadReviews = () => {
    const data = JSON.parse(localStorage.getItem("nedabah_reviews") || "[]");
    if (data.length === 0) {
      revContainer.innerHTML = `<div style="text-align:center;color:#94A3B8;font-size:12px;padding:10px;">첫 후기의 주인공이 되어주세요.</div>`;
    } else {
      revContainer.innerHTML = data.map(r => `
        <div class="item">
          <div style="font-weight:700;color:#64748B;font-size:11px;margin-bottom:4px;">${r.name} · ${r.date}</div>
          <div>${r.content}</div>
        </div>
      `).join("");
    }
  };
  loadReviews(); // 시작 시 로드

  // 작성 버튼
  writeReviewBtn.addEventListener("click", () => {
    revForm.hidden = false;
    writeReviewBtn.style.display = "none";
  });

  // 취소 버튼
  document.getElementById("btnCancelReview").addEventListener("click", () => {
    revForm.hidden = true;
    writeReviewBtn.style.display = "block";
  });

  // 저장 버튼
  document.getElementById("btnSaveReview").addEventListener("click", () => {
    const nameInput = document.getElementById("revName");
    const contentInput = document.getElementById("revContent");
    const content = contentInput.value.trim();

    if (!content) return showToast("내용을 입력해주세요.");

    const newReview = {
      name: nameInput.value.trim() || "익명",
      content: content,
      date: new Date().toLocaleDateString()
    };

    const reviews = JSON.parse(localStorage.getItem("nedabah_reviews") || "[]");
    reviews.unshift(newReview); // 최신순
    localStorage.setItem("nedabah_reviews", JSON.stringify(reviews));

    // 초기화
    nameInput.value = "";
    contentInput.value = "";
    revForm.hidden = true;
    writeReviewBtn.style.display = "block";
    loadReviews();
    showToast("후기가 등록되었습니다.");
  });
});
