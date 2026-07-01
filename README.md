# Bengo — 청년 정책, 놓치지 않고 누리다

> **"내가 받을 수 있는 정책이 이렇게 많았다고?"**
> 흩어져 있는 청년 정책을 한곳에 모으고, 복잡한 자격 조건을 **자동으로 판별**해 주는 정책 탐색 서비스입니다.

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white)
![Anthropic](https://img.shields.io/badge/Claude-D97757?style=flat&logo=anthropic&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)

---

## 🌱 왜 만들었나

청년 나이대에 제공되는 정부·지자체 정책은 생각보다 굉장히 다양합니다. 주거, 취업, 창업, 금융 지원까지 —
그런데 정작 **어디에 어떤 정책이 있는지 몰라서**, 혹은 **내가 자격이 되는지 판단하기 어려워서** 그냥 놓치는 경우가 많습니다.

저 역시 청년 당사자로서 "받을 수 있는 걸 못 받고 있다"는 문제를 직접 느꼈고,
**흩어진 정책을 모아 보여주고, 복잡한 자격 조건을 대신 판별해 주는** 서비스를 만들어 실제로 누려보자는 취지에서 시작했습니다.

- **모으기** — 온통청년·복지로·서울 열린데이터광장·data.go.kr 등 여러 공공 API에서 정책을 자동 수집
- **판별하기** — 나이/지역/소득/취업상태 등 조건을 입력하면 신청 가능 여부를 자동 판정
- **놓치지 않기** — 마감 임박·맞춤 추천으로 내게 맞는 정책을 먼저 보여줌

> MVP 범위는 **서울 · 청년정책**으로 한정했고, 지역/카테고리 확장을 염두에 둔 구조로 설계했습니다.

---

## ✨ 핵심 기능

| 기능 | 설명 |
|------|------|
| 🔎 정책 탐색 | 검색·카테고리·지역 필터, 정렬, 맞춤 추천 |
| ✅ 자격 자동 판별 | 프로필/답변 기반으로 **신청 가능 / 조건부 / 불가**를 판정 |
| 🤖 AI 규칙 추출 | 비정형 정책 원문에서 자격 조건을 **구조화된 규칙으로 자동 생성** |
| 🔐 인증 | 이메일 회원가입/인증 + Google·Naver 소셜 로그인 (JWT) |
| 📌 내 정책 관리 | 관심 정책 저장·상태 관리, 판별 이력 |

---

## 🧠 기술적 하이라이트

이 프로젝트에서 가장 공들인, 그리고 이야기하고 싶은 세 가지입니다.

### 1. 규칙 기반 자격 판별 엔진

정책마다 자격 조건이 제각각인데, 이를 `if`문으로 하드코딩하면 정책이 늘 때마다 코드를 고쳐야 합니다.
그래서 자격 조건을 **JSON 규칙 트리(`all` / `any` / `condition`)로 표현하고, 이를 재귀적으로 평가하는 엔진**을 만들었습니다.

```jsonc
{
  "all": [
    { "fact": "answers.housingStatus", "op": "=", "value": "무주택" },
    { "any": [                                  // 유형별 소득 기준 분기
      { "all": [
        { "fact": "answers.tenantType",   "op": "=",  "value": "청년" },
        { "fact": "answers.annualIncome", "op": "<=", "value": 50000000 }
      ]},
      { "all": [
        { "fact": "answers.tenantType",   "op": "=",  "value": "신혼부부" },
        { "fact": "answers.annualIncome", "op": "<=", "value": 75000000 }
      ]}
    ]}
  ]
}
```

핵심 설계 결정:

- **3-state 결과 (`ELIGIBLE` / `CONDITIONAL` / `INELIGIBLE`)** — 소득·서류심사처럼 시스템이 자동으로 확인할 수 없는 조건(`verifiable: false`)을 무조건 "불가"로 처리하면 사용자를 **오탈락**시킵니다. 이런 조건은 "조건부 가능"으로 분리해 신뢰도를 지켰습니다.
- **중첩 분기** — "청년은 5천만원, 신혼부부는 7천5백만원"처럼 유형별로 기준이 다른 경우를 `any` 그룹으로 표현. 평면적인 조건 리스트로는 불가능한 로직입니다.
- **지역 계층 매칭** — `SEOUL`(서울 전체) 정책은 모든 자치구 거주자에게 매칭되지만, `SEOUL_GANGNAM` 정책은 강남구 거주자에게만 매칭됩니다.

📄 [`eligibility.service.ts`](backend/src/eligibility/eligibility.service.ts) · [단위 테스트](backend/src/eligibility/eligibility.service.spec.ts)

### 2. AI(LLM) 기반 비정형 → 구조화 파이프라인

위 규칙 트리는 사람이 일일이 손으로 만들 수 없습니다. 정책 원문은 기관마다 형식이 제각각인 **비정형 텍스트**이기 때문입니다.
그래서 **Claude(Anthropic)로 정책 원문에서 자격 조건을 추출해 위의 규칙 JSON으로 변환**합니다.

여기서 신경 쓴 건 "AI를 썼다"가 아니라 **어떻게 신뢰성을 확보했는가**입니다.

- **LLM 출력을 그대로 믿지 않음** — 반환된 JSON을 스키마 검증(`validateCondition` / `validateRuleNode`)한 뒤, 통과한 규칙만 채택합니다. 최종 판정은 항상 **결정론적 엔진**이 담당하고 LLM은 "추출기" 역할만 합니다.
- **환각(hallucination) 억제** — 나이/지역/성별은 별도 시스템이 처리하므로 추출 금지, "명시되지 않은 조건은 추론하지 말 것" 등 프롬프트로 제약.
- **비용 최적화** — 동일한 system 프롬프트에 **Anthropic prompt caching**을 적용하고, **content-hash로 변경된 정책만 재추출**해 불필요한 LLM 호출을 막았습니다.

📄 [`llm-rule-extractor.service.ts`](backend/src/pipeline/llm-rule-extractor.service.ts)

### 3. 다중 소스 수집 파이프라인

6개 공공 API를 `PolicyCollector` 인터페이스(전략 패턴)로 추상화하고,
**수집 → 정규화 → 검증 → 적재**를 단계로 분리했습니다.

```
공공 API 6종 ──▶ collect ─▶ normalize ─▶ validate ─▶ ingest ─▶ PostgreSQL
 (온통청년,                                             │
  복지로,                                (LLM 규칙 추출 · requirement 생성)
  서울 열린데이터,
  data.go.kr …)
```

- **preview / ingest 분리** — 실제 저장 없이 정규화 결과만 미리 볼 수 있어 부작용을 격리
- **크로스소스 중복 제거** — `code`·`title` 기준으로 중복을 판정하고 **소스 우선순위**로 승자를 결정
- **출처 추적(provenance)** — 원문 URL·수집 시각·적재 이력을 남겨 모든 판정의 근거를 추적 가능

📄 [`pipeline-ingestion.service.ts`](backend/src/pipeline/pipeline-ingestion.service.ts)

### 그 외 운영/신뢰성 고려

- **Graceful degradation** — Redis 캐시가 죽어도 DB로 폴백해 서비스가 멈추지 않음
- **보안** — bcrypt, 전역 `ValidationPipe`(whitelist), 이메일 재발송 쿨다운 + **사용자 존재 여부 비노출**(계정 열거 방지)
- **테스트/품질** — 핵심 로직 단위 테스트 + HTTP E2E, ESLint · Prettier · 환경변수 스키마 검증

---

## 🏗 아키텍처

```
                    ┌─────────────────────────────────────┐
   React (Vite)  ◀──▶            NestJS + Fastify          │
   Tailwind          │  ┌────────┬──────────┬───────────┐  │
                     │  │  auth  │ policies │ pipeline  │  │
                     │  └────────┴────┬─────┴─────┬─────┘  │
                     │        eligibility engine  │        │
                     └──────────┬─────────────────┼────────┘
                                │                 │
                        PostgreSQL           Anthropic API
                        + Redis              (규칙 추출)
```

- **모듈 구조**: `auth`, `users`, `policies`, `eligibility`, `pipeline`, `email`, `config`, `database`
- **데이터 모델**: 정책/규칙/요건, 사용자/프로필/소셜계정, 판별 이력, 수집 원문·적재 이력 등

> 더 자세한 설계는 [`backend/docs/ARCHITECTURE.md`](backend/docs/ARCHITECTURE.md) 참고

---

## 🛠 기술 스택

**Backend** — NestJS · Fastify · TypeScript · PostgreSQL(TypeORM) · Redis(ioredis) · Passport(JWT · Google · Naver OAuth) · Anthropic SDK · Swagger · Jest

**Frontend** — React 18 · Vite · TypeScript · Tailwind CSS · Radix UI · React Router

**Infra/Tooling** — ESLint · Prettier · class-validator · nodemailer

---

## 📂 프로젝트 구조

```
bengo/
├── backend/               # NestJS API 서버 (핵심)
│   ├── src/
│   │   ├── auth/          # 인증 (JWT, OAuth, 이메일 인증)
│   │   ├── policies/      # 정책 조회·추천·자격 판별 API
│   │   ├── eligibility/   # 규칙 기반 자격 판별 엔진
│   │   ├── pipeline/      # 수집·정규화·검증·적재 + LLM 규칙 추출
│   │   ├── users/         # 사용자·프로필
│   │   ├── database/      # TypeORM 엔티티
│   │   └── common/        # enum, 상수, 인터페이스, 데코레이터
│   ├── test/              # E2E 테스트
│   └── docs/              # API 명세, 아키텍처 문서
└── frontend/              # React 데모 클라이언트
```

---

## 🚀 시작하기

> 사전 준비: Node.js 20+, PostgreSQL, Redis

```bash
# 1) 백엔드
cd backend
cp .env.example .env        # 값 채우기 (DB, 공공 API 키, LLM 키 등)
npm install
npm run start:dev           # http://localhost:4000  (Swagger: /docs)

# 2) 프론트엔드
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

정책 데이터 수집·규칙 생성 등 운영 명령어는 [`guide.md`](guide.md)를 참고하세요.

### 테스트 / 코드 품질

```bash
cd backend
npm test          # 단위 테스트
npm run test:e2e  # E2E 테스트 (DB 불필요)
npm run lint      # ESLint
```

---

## 📖 API 문서

- **Swagger UI**: 서버 실행 후 `http://localhost:4000/docs`
- **API 명세서**: [`backend/docs/API_SPEC_KO.md`](backend/docs/API_SPEC_KO.md)

---

## 📌 향후 확장 방향

- 지역/카테고리 확대 (서울 → 전국, 청년 → 육아·노인·장애 등) — 스코프 상수와 `RegionCode` 계층만 확장하면 되도록 설계
- 정책 마감 알림 / 신규 정책 푸시
- 수집 파이프라인 스케줄링 자동화

---

<p align="center"><sub>흩어진 정책을, 놓치지 않고 누리도록 — <b>Bengo</b></sub></p>
