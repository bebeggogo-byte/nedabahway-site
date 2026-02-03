document.addEventListener("DOMContentLoaded", () => {
  const stage = document.getElementById("stage");
  const tabs = document.querySelectorAll(".tab");
  const indicator = document.getElementById("pageIndicator");

  // --- 1. 탭 네비게이션 기능 ---
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetId = tab.dataset.target;
      const targetSection = document.getElementById(targetId);
      
      if (targetSection) {
        // 부드럽게 해당 섹션으로 스크롤 이동
        targetSection.scrollIntoView({ behavior: 'smooth', inline: 'start' });
      }
    });
  });

  // --- 2. 스크롤 감지 (현재 페이지 활성화) ---
  const observerOptions = {
    root: stage, // stage 영역 안에서의 스크롤 감지
    threshold: 0.6 // 60% 이상 보이면 활성화
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        
        // 탭 스타일 업데이트
        tabs.forEach(t => t.classList.remove("active"));
        const activeTab = document.querySelector(`.tab[data-target="${id}"]`);
        if (activeTab) activeTab.classList.add("active");

        // 상단 텍스트 업데이트
        const names = { home: "홈", sbm: "SBM", programs: "프로그램", donate: "동행", contact: "문의" };
        if (indicator) indicator.textContent = names[id];
      }
    });
  }, observerOptions);

  document.querySelectorAll(".slide").forEach(section => {
    observer.observe(section);
  });

  // --- 3. 메일 초안 작성기 ---
  const mailBtns = document.querySelectorAll(".catBtn");
  const subjectEl = document.getElementById("mailSubject");
  const bodyEl = document.getElementById("mailBody");
  const sendBtn = document.getElementById("btnSendMail");

  const templates = {
    sbm: { sub: "[SBM 문의] 참여 신청합니다", body: "1. 성함:\n2. 연락처:\n3. 궁금한 점:" },
    church: { sub: "[세미나 문의] 교회 초청 문의", body: "1. 교회명/지역:\n2. 희망 일정:\n3. 예상 인원:" },
    ai: { sub: "[AI 강의] 워크숍 문의", body: "1. 단체명:\n2. 대상:\n3. 요청 사항:" },
    etc: { sub: "[기타 문의] 문의드립니다", body: "문의 내용을 자유롭게 적어주세요." }
  };

  mailBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      mailBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const type = btn.dataset.type;
      const data = templates[type];

      subjectEl.textContent = data.sub;
      bodyEl.textContent = data.body;

      sendBtn.classList.remove("disabled");
      sendBtn.href = `mailto:nedabah.way@gmail.com?subject=${encodeURIComponent(data.sub)}&body=${encodeURIComponent(data.body)}`;
    });
  });

  // --- 4. 계좌 복사 ---
  const copyBtn = document.getElementById("btnCopyAccount");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText("927-910009-77504").then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = "복사 완료! ✨";
        copyBtn.style.borderColor = "#2563EB";
        copyBtn.style.color = "#2563EB";
        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.style.borderColor = "";
          copyBtn.style.color = "";
        }, 1500);
      }).catch(() => alert("직접 복사해주세요: 927-910009-77504"));
    });
  }

  // --- 5. 리뷰 (로컬 저장소) ---
  const revContainer = document.getElementById("reviewContainer");
  const revForm = document.getElementById("reviewFormBox");
  const writeBtn = document.getElementById("btnWriteReview");
  
  // 로드
  const loadReviews = () => {
    const data = JSON.parse(localStorage.getItem("reviews") || "[]");
    if(data.length === 0) {
      revContainer.innerHTML = `<div style="text-align:center; color:#999; font-size:13px; padding:10px;">작성된 후기가 없습니다.</div>`;
    } else {
      revContainer.innerHTML = data.map(r => `
        <div class="item">
          <div class="meta">${r.name} · ${r.date}</div>
          <div>${r.content}</div>
        </div>
      `).join("");
    }
  };
  loadReviews();

  // 토글
  writeBtn.addEventListener("click", () => {
    revForm.hidden = false;
    writeBtn.style.display = 'none';
  });

  document.getElementById("btnCancelReview").addEventListener("click", () => {
    revForm.hidden = true;
    writeBtn.style.display = 'block';
  });

  // 저장
  document.getElementById("btnSaveReview").addEventListener("click", () => {
    const name = document.getElementById("revName").value;
    const content = document.getElementById("revContent").value;
    if(!content) return alert("내용을 입력해주세요.");

    const reviews = JSON.parse(localStorage.getItem("reviews") || "[]");
    reviews.unshift({ name: name || "익명", content, date: new Date().toLocaleDateString() });
    localStorage.setItem("reviews", JSON.stringify(reviews));

    document.getElementById("revName").value = "";
    document.getElementById("revContent").value = "";
    revForm.hidden = true;
    writeBtn.style.display = 'block';
    loadReviews();
  });
});
