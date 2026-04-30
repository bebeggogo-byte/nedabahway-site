# Pull Request

## 요약
<!-- 1~3줄로 무엇을 왜 바꿨는지 -->

## 종류
- [ ] feat — 새 기능
- [ ] fix — 버그 수정
- [ ] chore — 리팩토링·도구·잡일
- [ ] docs — 문서
- [ ] style — 디자인·CSS
- [ ] perf — 성능
- [ ] test — 테스트

## 영향 범위
- [ ] 메인 페이지 (.html)
- [ ] 자료실 (resources/)
- [ ] 관점 노트 (blog/perspective/)
- [ ] 디자인 시스템 (assets/)
- [ ] 빌드 (`_build/`·`resources/_build/`)
- [ ] 문서 (.md)
- [ ] CI (.github/workflows/)
- [ ] LaunchAgent

## 검증 체크리스트

### 필수
- [ ] `python3 _build/publish_v2.py` 통과
- [ ] `python3 scripts/lighthouse_local_v2.py` 95점 이상
- [ ] `python3 scripts/check_private_keywords.py --strict` 통과
- [ ] 비공개 키워드(클라이언트명·금액·계약) 노출 0건
- [ ] D25 3계층 분리 룰 준수 (public/internal/draft)

### 선택
- [ ] `lychee resources/ blog/` 죽은 링크 0건
- [ ] `htmlhint "*.html"` 통과
- [ ] 모바일 반응형 검증
- [ ] 다크모드 비활성화 상태 유지

## SPEC·이슈 참조
<!-- Closes #N · SPEC-XXX-001 -->

## 스크린샷 (UI 변경 시)
<!-- before / after -->

## 외부영향 7종 (해당 시)
- [ ] 이메일 발송
- [ ] 메시지 발송
- [ ] 공개 게시 (외부 노출 변화)
- [ ] 결제·정산
- [ ] 계약·협약
- [ ] 실물 배송
- [ ] 문서 권한 공유

→ 위 중 하나라도 해당하면 본문에 사용자 명시 승인 인용 첨부.
