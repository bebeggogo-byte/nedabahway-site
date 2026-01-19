const deck = document.getElementById('deck');
const tabs = document.querySelectorAll('.nav__tab');
const progressBar = document.getElementById('progressBar');

// 1. 스크롤 감지: 사용자가 옆으로 밀었을 때 실행
deck.addEventListener('scroll', () => {
    // 현재 페이지 번호 계산 (0, 1, 2...)
    const index = Math.round(deck.scrollLeft / window.innerWidth);
    
    // 탭 활성화 상태 변경
    tabs.forEach((tab, i) => {
        tab.classList.toggle('is-active', i === index);
    });

    // 프로그레스 바 너비 변경
    const scrollPercent = ((index + 1) / tabs.length) * 100;
    progressBar.style.width = `${scrollPercent}%`;

    // 활성 탭이 화면 중앙에 오도록 스크롤 (탭이 많을 경우 대비)
    const activeTab = tabs[index];
    activeTab.parentElement.scrollTo({
        left: activeTab.offsetLeft - (window.innerWidth / 2) + (activeTab.offsetWidth / 2),
        behavior: 'smooth'
    });
});

// 2. 탭 클릭 시 해당 페이지로 이동 함수
function move(index) {
    deck.scrollTo({
        left: window.innerWidth * index,
        behavior: 'smooth'
    });
}
