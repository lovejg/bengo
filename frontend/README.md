# 정책 뽕뽑기 - 국가/지자체 지원정책 모아보기

서울시 청년을 위한 지원정책을 쉽게 찾고, 신청 가능 여부를 확인할 수 있는 웹 애플리케이션입니다.

## 주요 기능

- **정책 검색**: 키워드와 필터로 맞춤 정책 검색
- **자격 확인**: 간단한 정보 입력으로 신청 가능 여부 확인
- **저장 & 관리**: 관심 정책 저장 및 신청 상태 관리
- **투명성**: 모든 정보의 출처(원문) 링크 제공

## 기술 스택

- **Framework**: React 18.3.1
- **Routing**: React Router 7.13.0
- **Styling**: Tailwind CSS 4.1.12
- **Icons**: Lucide React
- **Toast**: Sonner
- **Build Tool**: Vite

## 프로젝트 구조

```
src/
├── app/
│   ├── components/
│   │   ├── atoms/          # 기본 컴포넌트 (Button, Input, Chip 등)
│   │   ├── molecules/      # 조합 컴포넌트 (SearchBar, FilterChipGroup 등)
│   │   ├── organisms/      # 복잡한 컴포넌트 (Header, PolicyCard 등)
│   │   └── templates/      # 레이아웃 컴포넌트
│   ├── pages/              # 페이지 컴포넌트
│   ├── lib/                # 유틸리티 함수
│   ├── types/              # TypeScript 타입 정의
│   ├── App.tsx            # 메인 앱 컴포넌트
│   └── routes.ts          # 라우팅 설정
└── styles/                # 전역 스타일 및 테마

```

## 페이지 구성

1. **홈페이지** (`/`) - 랜딩 페이지
2. **회원가입** (`/signup`) - 2단계 회원가입 폼
3. **로그인** (`/login`) - 로그인 및 소셜 로그인
4. **정책 목록** (`/policies`) - 검색, 필터, 정렬 기능
5. **정책 상세** (`/policies/:id`) - 상세 정보, 자격 확인, 근거 자료
6. **마이페이지** (`/me`) - 저장한 정책 및 신청 상태 관리

## 디자인 시스템

### Color Tokens
- **Primary**: 기본 텍스트 및 UI 요소
- **Accent**: 주요 CTA, 활성 필터, 링크 (#3b82f6)
- **Success**: 성공 상태 및 모집중 배지 (#10b981)
- **Warning**: 경고 및 추가 확인 필요 (#f59e0b)
- **Destructive**: 에러 및 마감 상태 (#d4183d)

### Spacing
4px, 8px, 12px, 16px, 24px, 32px, 48px

### Border Radius
- **Cards/Inputs/Modals**: 12px (rounded-xl)
- **Chips/Badges**: 9999px (rounded-full)

### Typography
- **Title**: h1, h2 (font-weight: 500)
- **Subtitle**: h3, h4 (font-weight: 500)
- **Body**: p (font-weight: 400)
- **Caption**: small text (font-weight: 400)

## 개발 가이드

### Atomic Design 패턴

이 프로젝트는 Atomic Design 패턴을 따릅니다:

- **Atoms**: 재사용 가능한 최소 단위 컴포넌트
- **Molecules**: Atoms를 조합한 컴포넌트
- **Organisms**: Molecules와 Atoms를 조합한 복잡한 컴포넌트
- **Templates**: 페이지 레이아웃
- **Pages**: 실제 페이지 컴포넌트

### 컴포넌트 명명 규칙

- 파일명: PascalCase (예: `Button.tsx`, `PolicyCard.tsx`)
- 컴포넌트명: PascalCase
- Props 타입: ComponentNameProps (예: `ButtonProps`)

### 상태 관리

현재는 로컬 상태(useState)만 사용하며, 추후 필요시 Context API 또는 상태 관리 라이브러리 도입 예정

## 향후 개발 계획

- [ ] 백엔드 API 연동 (Supabase)
- [ ] 사용자 인증 구현
- [ ] 실제 정책 데이터베이스 연동
- [ ] 알림 기능 (마감 임박 정책)
- [ ] 다크 모드 지원
- [ ] 접근성 개선
- [ ] 성능 최적화

## 데이터 출처

- SSIS (사회보장정보시스템)
- 온통청년 포털
- 서울청년몽땅 포털
- 각 지자체 웹사이트 (크롤링)

## 라이선스

© 2026 정책 뽕뽑기. All rights reserved.
