# Bengo 개발 가이드

## 서버 실행

```bash
# 백엔드 (backend/ 디렉토리에서)
npm run start:dev

# 프론트엔드 (frontend/ 디렉토리에서)
npm run dev
```

---

## 파이프라인 명령어

파이프라인은 정책 데이터를 수집·가공하는 백엔드 프로세스입니다.  
백엔드 서버가 켜진 상태에서 아래 curl 명령어를 터미널에 입력하면 됩니다.  
**명령어를 입력한 뒤 터미널에 결과가 출력될 때까지 대기 — 그 전까지는 계속 실행 중입니다.**

---

### 1. 정책 데이터 수집 + 적재

```bash
curl -X POST http://localhost:4000/pipeline/collect-and-ingest-mvp
```

**무슨 일이 일어나나요?**  
공공 API(온통청년, 서울 열린데이터, data.go.kr 등)에서 정책 목록을 새로 받아와 DB에 저장합니다.  
수집된 데이터로 LLM이 자격 조건 규칙도 자동 생성합니다.

**언제 실행하나요?**
- 정책 데이터를 최신으로 갱신하고 싶을 때 (예: 주 1회 정기 실행)
- 수집기 코드(`collectors/`)가 수정됐을 때
- 정규화 로직(`policy-normalization.service.ts`)이 수정됐을 때

**소요 시간:** 약 10~20분  
(수집된 정책 수가 많을수록 오래 걸립니다. 현재 온통청년 기준 약 400개 이상)

---

### 2. 자격 조건 규칙만 다시 생성

```bash
curl -X POST http://localhost:4000/pipeline/regenerate-rules
```

**무슨 일이 일어나나요?**  
DB에 있는 정책을 대상으로 LLM이 자격 조건 규칙을 다시 생성합니다.  
**변경이 없는 정책은 자동으로 스킵되므로 처음보다 훨씬 빠릅니다.**

**언제 실행하나요?**
- 수동 오버라이드(`policy-manual-overrides.constant.ts`)를 수정했을 때
- 적격성 판단 로직(`eligibility.service.ts`)이 수정됐을 때
- 데이터 재수집 없이 규칙만 업데이트하고 싶을 때

**소요 시간:** 약 5~10분 (스킵된 정책이 많으면 더 빠름)

---

### 3. 자격 조건 규칙 전체 초기화 후 재생성

```bash
curl -X POST "http://localhost:4000/pipeline/regenerate-rules?force=true"
```

**무슨 일이 일어나나요?**  
기존 규칙을 전부 삭제하고 모든 정책에 대해 LLM을 새로 호출합니다.

**언제 실행하나요?**
- LLM 프롬프트 자체를 수정했을 때 (`llm-rule-extractor.service.ts`)
- 규칙을 완전히 초기화하고 처음부터 다시 만들어야 할 때

**소요 시간:** 약 10~20분 (전체 재생성이라 오래 걸립니다)

> **주의:** LLM 토큰을 가장 많이 소모합니다. 꼭 필요할 때만 사용하세요.

---

### 4. 만료된 정책 비활성화

```bash
curl -X POST http://localhost:4000/pipeline/deactivate-expired
```

**무슨 일이 일어나나요?**  
마감일이 지난 정책을 비활성화(INACTIVE)해서 목록에서 제거합니다.

**언제 실행하나요?**
- 주기적으로 실행해서 만료 정책 정리 (예: 주 1회)

**소요 시간:** 수 초

---

## 상황별 실행 순서

### 주기적 데이터 갱신 (예: 매주)

```bash
# 1. 새 정책 수집
curl -X POST http://localhost:4000/pipeline/collect-and-ingest-mvp

# 2. 만료 정책 정리 (1번 끝난 후)
curl -X POST http://localhost:4000/pipeline/deactivate-expired
```

> `collect-and-ingest-mvp`에서 규칙 생성까지 이미 하므로, 일반적인 갱신 시에는 `regenerate-rules`를 별도로 실행할 필요가 없습니다.

---

### 코드 수정 후 반영

| 수정한 파일 | 실행할 명령어 |
|------------|---------------|
| 수집기 코드 (`collectors/`) | `collect-and-ingest-mvp` |
| 정규화 로직 (`policy-normalization.service.ts`) | `collect-and-ingest-mvp` |
| 수동 오버라이드 (`policy-manual-overrides.constant.ts`) | `regenerate-rules` |
| 적격성 판단 로직 (`eligibility.service.ts`) | 재실행 불필요 (즉시 반영) |
| LLM 프롬프트 (`llm-rule-extractor.service.ts`) | `regenerate-rules?force=true` |

---

### 전체 초기화 (처음 세팅 또는 대규모 리셋)

```bash
# 순서대로 실행, 각 명령어가 끝난 후 다음 명령어 실행
curl -X POST http://localhost:4000/pipeline/collect-and-ingest-mvp
curl -X POST "http://localhost:4000/pipeline/regenerate-rules?force=true"
curl -X POST http://localhost:4000/pipeline/deactivate-expired
```

---

## 참고사항

- 모든 파이프라인 명령어는 **백엔드 서버가 실행 중**이어야 합니다.
- 터미널에 JSON 결과가 출력되면 완료입니다. 그 전까지는 계속 실행 중입니다.
- 두 명령어를 동시에 실행하면 충돌할 수 있으니 순차적으로 실행하세요.
- 백엔드 서버 로그(`npm run start:dev` 창)에서 진행 상황을 확인할 수 있습니다.
