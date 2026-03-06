# 정책 뽕뽑기 - 프로젝트 개요

## 📋 프로젝트 소개

**정책 뽕뽑기**는 서울시 청년을 위한 국가/지자체 지원정책을 쉽게 탐색하고 신청 가능 여부를 확인할 수 있는 웹 애플리케이션입니다.

### 주요 목표
- 탐색(목록) → 상세 확인 → 추가정보 입력 → 신청 가능성 판정
- 근거(evidence) 확인 → 원문 링크(source_url)로 투명성 확보

## 🎨 디자인 시스템

### Design Tokens
- **Grid**: Desktop 12 cols / Tablet 8 cols / Mobile 4 cols
- **Spacing**: 4 / 8 / 12 / 16 / 24 / 32 / 48px
- **Radius**: 12~16px
- **Shadow**: Soft, 가볍게
- **Colors**: Neutral 기반 + Accent 컬러
- **Animation**: 150~200ms (절제된 micro-interaction)

### Typography
- Title / Subtitle / Body / Caption 위계 명확

## 🏗️ 아키텍처

### Atomic Design Pattern

```
src/app/components/
├── atoms/           # 기본 UI 요소 (Button, Input, Chip, Badge 등)
├── molecules/       # 조합된 컴포넌트 (SearchBar, FilterChipGroup 등)
├── organisms/       # 복잡한 UI 블록 (Header, Footer, PolicyCard 등)
├── templates/       # 레이아웃 (MainLayout)
└── pages/          # 페이지 컴포넌트
```

### 주요 컴포넌트

#### Atoms
- Button (Primary / Secondary / Ghost)
- Input (text / search)
- Chip (selectable 필터용)
- Badge (모집중 / 상시 / 마감)
- IconButton
- Divider
- Skeleton

#### Molecules
- SearchBar
- SortDropdown
- FilterChipGroup
- AppliedFiltersRow
- PolicyMetaRow
- EmptyState
- PolicyCardSkeleton
- PolicyDetailSkeleton

#### Organisms
- Header
- Footer
- PolicyCard
- PolicyList
- FilterDrawer
- PolicyDetailHeader

#### Templates
- MainLayout

## 📄 페이지 구조

### 1. 홈페이지 (`/`)
- Hero Section
- Features Section
- CTA Section

### 2. 회원가입 (`/signup`)
- 2단계 Stepper
  - 기본 정보: 이메일, 비밀번호, 출생연도, 성별
  - 추가 정보: 지역, 관심분야
- 유효성 검사 및 에러 상태

### 3. 로그인 (`/login`)
- 이메일/비밀번호 로그인
- 비회원으로 둘러보기
- 소셜 로그인 UI (동작 미구현)

### 4. 정책 목록 (`/policies`)
- Sticky 필터바
  - SearchBar
  - SortDropdown
  - FilterChipGroup
  - 전체필터 버튼 (FilterDrawer)
- AppliedFiltersRow
- PolicyCard 리스트
- 상태 관리:
  - Loading (Skeleton)
  - Empty/NoResult
  - Error

### 5. 정책 상세 (`/policies/:id`)
- PolicyDetailHeader
- 섹션 앵커 네비게이션
- 본문 섹션:
  - 요약
  - 지원대상
  - 선정기준
  - 지원 혜택
  - 신청 방법
  - 자격 확인 폼
  - 근거 자료
  - 원문 링크
- 우측 Sticky Panel (PC)
- 상태 관리:
  - Loading (Skeleton)
  - Error

### 6. 마이페이지 (`/me`)
- 프로필 요약
- 저장한 정책 리스트
- 상태 필터: 전체 / 저장됨 / 대기중 / 신청완료

## 🔧 기술 스택

- **Framework**: React 18.3.1
- **Routing**: React Router 7.13.0
- **Styling**: Tailwind CSS 4.1.12
- **UI Components**: Radix UI
- **Icons**: Lucide React
- **Animations**: Motion (Framer Motion)
- **Notifications**: Sonner (Toast)
- **Build Tool**: Vite 6.3.5
- **Type Safety**: TypeScript

## ✨ 주요 기능

### 1. 검색 및 필터링
- 키워드 검색
- 빠른 필터 (주거, 취업·창업, 교육, 문화, 복지·생활)
- 상세 필터 (지역, 나이대, 상태, 모집 상태)
- 정렬 (최신순, 마감임박, 추천순)

### 2. 정책 카드
- 제목, 요약, 기관, 지역, 기간
- StatusBadge (모집중/상시/마감)
- EligibilityBadge (가능성 높음 / 추가 확인 필요 / 정보 부족)
- SourceBadge (SSIS/온통청년/서울청년몽땅/크롤링)
- 북마크 기능

### 3. 상태 관리
- Loading 상태 (Skeleton UI)
- Error 상태 (에러 메시지 + 재시도)
- Empty 상태 (빈 결과 안내)

### 4. Toast 알림
- 검색 완료
- 필터 적용/초기화
- 정책 저장/취소
- 로그인 성공/실패
- 자격 확인 완료

### 5. 접근성 (A11y)
- ARIA 레이블
- 키보드 네비게이션
- Focus 관리
- Screen Reader 지원
- Semantic HTML

### 6. 애니메이션
- 150-200ms duration (절제된 애니메이션)
- Hover effects
- Active states
- Drawer slide-in/out
- Loading transitions

### 7. ErrorBoundary
- 전역 에러 처리
- 사용자 친화적 에러 화면
- 새로고침 / 홈으로 이동 옵션

## 🎯 반응형 디자인

- **Desktop**: 12 컬럼 그리드
- **Tablet**: 8 컬럼 그리드
- **Mobile**: 4 컬럼 그리드

모든 페이지와 컴포넌트가 반응형으로 설계되었습니다.

## 📊 데이터 구조

### Policy Interface
```typescript
interface Policy {
  id: string;
  title: string;
  summary: string;
  agency: string;
  region: string;
  period: string;
  status: 'recruiting' | 'always' | 'closed';
  eligibility?: 'eligible' | 'needsReview' | 'infoLacking';
  source: 'SSIS' | '온통청년' | '서울청년몽땅' | '크롤링';
  sourceUrl?: string;
  details?: {
    target: string;
    criteria: string;
    benefits: string;
    applicationPeriod: string;
    applicationMethod: string;
  };
  evidence?: Array<{
    text: string;
    source: string;
  }>;
}
```

### User Interface
```typescript
interface User {
  name: string;
  email: string;
  age: number;
  gender?: 'male' | 'female' | 'other';
  region: string;
  interests: string[];
}
```

## 🚀 개선 사항

### 완료된 개선
✅ ErrorBoundary 추가  
✅ Loading Skeleton 컴포넌트 (PolicyCardSkeleton, PolicyDetailSkeleton)  
✅ Toast 알림 통합 (Sonner)  
✅ 애니메이션 개선 (150-200ms duration)  
✅ 접근성 개선 (ARIA 레이블, 키보드 네비게이션)  
✅ 상태 관리 (Loading/Error/Empty)  
✅ FilterDrawer 애니메이션 및 body scroll lock  
✅ 모든 페이지 import 경로 수정  

### 향후 개선 가능 사항
- 실제 API 연동
- 로그인/회원가입 기능 구현
- 북마크 상태 영구 저장
- 검색 히스토리
- 추천 알고리즘
- PWA 지원
- 다크 모드

## 📝 개발 가이드

### 컴포넌트 추가 시
1. Atomic Design 패턴 준수
2. TypeScript 인터페이스 정의
3. 접근성 고려 (ARIA 속성)
4. 애니메이션 duration: 150-200ms
5. 반응형 디자인 적용

### 스타일 가이드
- Tailwind CSS v4 사용
- CSS 변수 활용 (`var(--accent)` 등)
- 인라인 클래스 우선
- 컴포넌트별 className prop 지원

### 애니메이션 가이드
- duration: 150-200ms
- easing: ease-in-out (기본)
- 과도한 bounce/parallax 금지
- hover, active, focus 상태 필수

## 🎨 디자인 원칙

1. **신뢰감**: 공공 서비스의 신뢰성 표현
2. **접근성**: 누구나 쉽게 사용 가능
3. **명확성**: 정보 전달이 명확하고 투명
4. **효율성**: 빠르고 간편한 UX
5. **일관성**: 일관된 디자인 시스템

## 📄 라이선스

이 프로젝트는 교육 및 참고 목적으로 제작되었습니다.

---

**제작일**: 2026년 2월 28일  
**버전**: 1.0.0  
**상태**: MVP 완료
