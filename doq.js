// 유틸리티
const $ = (id) => document.getElementById(id);

// 1. 탭 네비게이션 & 스크롤 감지
function initTabs() {
  const stage = $("stage");
  const tabs = document.querySelectorAll(".tab");
  const slides = document.querySelectorAll(".slide");
  const indicator = $("pageIndicator");

  // 탭 클릭 시 해당 슬라이드로 이동
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetId = tab.dataset.target;
      const targetSlide = $(targetId);
      if (targetSlide) {
        targetSlide.scrollIntoView({ behavior: "smooth", inline: "start" });
      }
    });
  });

  // 스크롤 시 현재 탭 활성화 (IntersectionObserver)
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // 탭 활성화
          tabs.forEach((t) => t.classList.remove("active"));
          const activeTab = document.querySelector(`.tab[data-target="${entry.target.id}"]`);
          if (activeTab) activeTab.classList.add("active");

          // 상단 헤더 텍스트 변경
          const labels = {
            home: "홈", sbm: "SBM", programs: "프로그램", donate: "동행", contact: "문의"
          };
          if (indicator) indicator.textContent = labels[entry.target.id] || "네다바웨이";
        }
      });
    },
    { root: stage, threshold: 0.6 } // 60% 이상 보일 때
  );

  slides.forEach((slide) => observer.observe(slide));
}

// 2. 이메일 초안 생성기
function initMailBuilder() {
  const subjectEl = $("mailSubject");
  const bodyEl = $("mailBody");
  const sendBtn = $("btnSendMail");
  const btns = document.querySelectorAll(".catItem");

  const templates = {
    sbm: {
      sub: "[SBM 문의] 참여 관련 문의드립니다.",
      body: "안녕하세요.\nSBM 묵상 훈련에 참여하고 싶어 연락드립니다.\n\n1. 참여 가능 시기:\n2. 궁금한 점:\n\n답변 부탁드립니다."
    },
    church: {
      sub: "[교회 세미나] SBM 세미나 초청 문의",
      body: "안녕하세요.\n저희 교회 청년부/공동체에 SBM 강의를 초청하고 싶습니다.\n\n1. 교회명/지역:\n2. 예상 인원:\n3. 희망 일정:\n\n확인 부탁드립니다."
    },
    ai: {
      sub: "[AI 워크숍] 생성형 AI 강의 문의",
      body: "안녕하세요.\n교육/목회 현장 AI 활용 워크숍 관련하여 문의드립니다.\n\n1. 단체명:\n2. 대상:\n\n연락 기다리겠습니다."
    },
    etc: {
      sub: "[기타 문의] 네다바웨이에 문의드립니다.",
      body: "안녕하세요.\n다음과 같은 내용으로 문의드립니다.\n\n(내용을 적어주세요)"
    }
  };

  btns.forEach(btn => {
    btn.addEventListener("click", () => {
      // 스타일 활성화
      btns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // 내용 채우기
      const type = btn.dataset.type;
      const data = templates[type];
      
      subjectEl.textContent = data.sub;
      bodyEl.textContent = data.body;
      
      // 메일 버튼 활성화
      sendBtn.classList.remove("disabled");
      sendBtn.href = `mailto:nedabah.way@gmail.com?subject=${encodeURIComponent(data.sub)}&body=${encodeURIComponent(data.body)}`;
    });
  });
}

// 3. 계좌 복사
async function initCopy() {
  const btn = $("btnCopyAccount");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const text = "927-910009-77504"; // 하나은행
    try {
      await navigator.clipboard.writeText(text);
      const originalText = btn.textContent;
      btn.textContent = "복사 완료! ✨";
      btn.style.background = "#10B981"; // 녹색 살짝 사용 (성공 피드백용)
      btn.style.color = "#fff";
      
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = ""; 
        btn.style.color = "";
      }, 1500);
    } catch (err) {
      alert("직접 복사해주세요: " + text);
    }
  });
}

// 4. 리뷰 시스템 (localStorage)
function initReviews() {
  const container = $("reviewContainer");
  const formBox = $("reviewFormBox");
  const btnOpen = $("btnWriteReview");
  const btnSave = $("btnSaveReview");
  const btnCancel = $("btnCancelReview");
  const inputName = $("revName");
  const inputContent = $("revContent");

  // 저장된 리뷰 불러오기
  const loadReviews = () => {
    const data = JSON.parse(localStorage.getItem("nedabah_reviews") || "[]");
    if (data.length === 0) {
      container.innerHTML = `<div class="emptyState" style="text-align:center; color:#94A3B8; font-size:13px; padding:20px;">아직 후기가 없습니다.<br>첫 번째 주인공이 되어주세요!</div>`;
      return;
    }
    
    container.innerHTML = data.map(r => `
      <div class="reviewItem">
        <div class="reviewMeta">${r.name} · ${r.date}</div>
        <div class="reviewText">${r.content}</div>
      </div>
    `).reverse().join(""); // 최신순
  };

  btnOpen.addEventListener("click", () => {
    formBox.hidden = false;
    btnOpen.hidden = true;
    inputName.focus();
  });

  btnCancel.addEventListener("click", () => {
    formBox.hidden = true;
    btnOpen.hidden = false;
  });

  btnSave.addEventListener("click", () => {
    const content = inputContent.value.trim();
    if (!content) {
      alert("내용을 입력해주세요.");
      return;
    }
    
    const newReview = {
      name: inputName.value.trim() || "익명",
      content: content,
      date: new Date().toLocaleDateString()
    };

    const data = JSON.parse(localStorage.getItem("nedabah_reviews") || "[]");
    data.push(newReview);
    localStorage.setItem("nedabah_reviews", JSON.stringify(data));

    // 초기화
    inputName.value = "";
    inputContent.value = "";
    formBox.hidden = true;
    btnOpen.hidden = false;
    
    loadReviews();
  });

  loadReviews();
}

// 초기화 실행
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initMailBuilder();
  initCopy();
  initReviews();
});
