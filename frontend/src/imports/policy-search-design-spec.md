프로젝트: “정책 뽕뽑기” — 국가/지자체 지원정책 모아보기 (MVP: 서울 + 청년)
목표: 탐색(목록) → 상세 확인 → 추가정보 입력 → 신청 가능성 판정/근거(evidence) 확인 → 원문 링크(source_url)로 투명성 확보
톤: 라이트, 신뢰감 있으면서 딱딱하지 않게. 애니메이션은 과하지 않게(150~200ms micro-interaction).
중요: 컴포넌트는 Atomic Design(Atoms → Molecules → Organisms → Templates) 로 먼저 만들고, 그 다음 페이지를 조립한다.
반응형: Desktop / Tablet / Mobile 모두 제작.

A) Design Tokens (Styles)

Grid: Desktop 12 cols / Tablet 8 cols / Mobile 4 cols

Spacing: 4 / 8 / 12 / 16 / 24 / 32 / 48

Radius: 12~16px (카드/인풋/모달)

Shadow: soft, 가볍게

Typography: Title / Subtitle / Body / Caption 위계 명확

Colors: Neutral 기반 + Accent 1개(주요 CTA/활성 필터/링크에만)

States: default / hover / active / focus ring / disabled / loading / error / empty

B) Components (먼저 제작, Atomic Design)
1) Atoms

Button: Primary / Secondary / Ghost (sm/md/lg, loading 포함)

IconButton

Input: text / search (helper, error, clear 포함)

Select / Dropdown

Chip: selectable (필터용, multi-select)

Badge / Tag: 모집중 / 상시 / 마감 / “추가 확인 필요”

Checkbox, Radio

Divider

Skeleton

Tooltip

Toast(간단)

2) Molecules

SearchBar (search input + clear + submit icon)

SortDropdown (최신/마감임박/추천순)

FilterChipGroup (핵심 필터 3~5개)

AppliedFiltersRow (선택된 필터 요약 + 전체 초기화)

PolicyMetaRow (기관/지역/기간)

ConfidenceIndicator (0~1 → 높음/보통/낮음 라벨)

EvidenceSnippet (근거 문장 박스 + “원문 보기”)

EmptyState / ErrorState / NoResultState

3) Organisms

Header (로고 + nav: 정책찾기/맞춤추천/저장목록/로그인)

Footer (이용약관/개인정보 + 데이터 출처 고지)

PolicyCard

title, summary 1~2줄, 기간, 기관, tags

StatusBadge(모집중/상시/마감)

EligibilityBadge: “가능성 높음 / 추가 확인 필요 / 정보 부족”

Bookmark icon(로그인 시)

SourceBadge: SSIS/온통청년/서울청년몽땅/크롤링

PolicyList (리스트 + skeleton + pagination 또는 더보기)

FilterDrawer (전체 필터 드로어)

지역(강남/마포/송파), 나이대, 상태(학생/구직/재직 등), 모집상태

적용/초기화 버튼

PolicyDetailHeader (제목, 기관, 배지, 북마크, 공유)

DetailStickyPanel (PC 우측 sticky)

신청하러가기(외부 링크), 원문보기(source_url), 북마크

SectionNav(앵커): 요약/자격/혜택/신청/근거/원문

EligibilityForm (추가 정보 입력 폼)

어려운 용어는 쉬운 라벨 + tooltip

ResultBanner (판정 결과)

신청 가능/불가/추가 확인 필요(needs_review) + 이유 요약

4) Templates / Layouts

MainLayout: Header / Content / Footer

AuthLayout: 중앙 카드형 + 신뢰 문구 영역

ListLayout(A안): 상단 고정 필터바 + 리스트

DetailLayout: 본문 + 우측 sticky (모바일은 하단 sticky CTA)

C) Pages (MVP 필수 3 + 권장 2)

프레임 네이밍 규칙

Pages/Desktop/…, Pages/Tablet/…, Pages/Mobile/…

Components/Atoms/…, Components/Molecules/…, Components/Organisms/…

States/Loading, States/Empty, States/Error

1) Pages: 회원가입 (/signup)

Stepper 2단계:

기본: 출생연도(또는 나이), 성별(선택)

지역 선택: 강남/마포/송파 (MVP 고정)
관심분야: 청년정책(기본 선택), 육아정책(“추후” 뱃지/비활성)

CTA: “맞춤 정책 추천 받기”

에러/유효성 상태 디자인 포함

2) Pages: 로그인 (/login)

이메일/비밀번호

링크: 비밀번호 찾기

버튼: 로그인

비회원으로 둘러보기 버튼(중요)

소셜 로그인 버튼 영역(동작은 고려하지 않아도 됨)

로딩/에러 상태 포함

3) Pages: 정책 목록 (/policies) ✅ 결정2=A안

상단 고정 필터바 구조

Sticky Filter Bar:

SearchBar (“예: 월세, 취업, 주거, 교육…”)

SortDropdown (최신/마감임박/추천순)

FilterChipGroup (핵심 필터 3~5개)

“전체필터” 버튼 → FilterDrawer 오픈

AppliedFiltersRow (선택된 필터 + 초기화)

결과 영역:

PolicyCard 리스트

카드에서 EligibilityBadge 표시(가능성 높음/추가 확인 필요/정보 부족)

SourceBadge(SSIS/온통청년/서울청년몽땅/크롤링)

상태 프레임:

Loading(Skeleton list)

Empty/NoResult(필터 초기화 CTA)

Error(재시도)

4) Pages: 정책 상세 (/policies/:id) ✅ 결정3=B안(스크롤+섹션 앵커)

상단: PolicyDetailHeader

섹션 앵커 네비: 요약 / 지원대상 / 선정기준 / 신청기간 / 신청방법 / 근거 / 원문

본문 섹션:

요약(핵심 혜택)

지원대상/선정기준/신청기간/신청방법(가독성 좋게 카드 섹션)

ConfidenceIndicator + EvidenceSnippet(2~4개)

원문 링크(source_url) 강조 섹션 (크롤링이면 특히 강조)

우측 sticky panel(PC):

신청하러가기(외부 링크), 원문보기, 북마크

“내가 맞는지 확인” 클릭 시 EligibilityForm으로 스크롤

EligibilityForm:

정책별로 추가 입력 필요 항목이 달라질 수 있으므로 “동적 폼”처럼 디자인

tooltip으로 용어 설명(예: 중위소득)

결과:

ResultBanner: 신청 가능 / 불가 / 추가 확인 필요(needs_review)

추가 확인 필요일 때는 “불가”처럼 보이지 않게, 다음 행동 CTA(원문 확인/추가 정보 입력) 포함

상태 프레임:

Loading(상세 skeleton)

Error(재시도)

5) Pages: 마이페이지 (/me) ✅ 결정5=B안 포함

프로필 요약(나이/지역/관심분야) + 수정

저장한 정책 리스트(PolicyCard 재사용)

상태 토글: 신청 완료 / 대기중 / 저장됨

데이터 출처/원문 링크 접근 유지

D) Interaction 규칙 (절제된 애니메이션)

150~200ms: hover, chip select, drawer open/close

Toast: 저장됨, 필터 적용됨

과한 바운스/스크롤 패럴랙스 금지

E) Deliverables

Design System (Tokens + States)

Components Library (Atomic 단계별)

Pages 5개 (Desktop/Tablet/Mobile)

각 페이지에 Loading/Empty/Error 상태 프레임 포함