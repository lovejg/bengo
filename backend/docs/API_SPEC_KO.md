# Bengo MVP API 명세서 (프론트 연동용)

## 1) 목적
이 문서는 **프론트에서 백엔드 MVP를 빠르게 붙여서 검증**하기 위한 실무용 명세입니다.

- 기준 URL: `http://localhost:4000`
- Swagger: `http://localhost:4000/docs`
- 인증 방식: `Authorization: Bearer <accessToken>`
- 공통 응답 포맷: 엔드포인트별 상이 (아래 예시 기준)

## 2) MVP 범위
현재 서버는 아래 범위를 강제합니다.

- 정책 분야: `youth_policy` (청년정책)
- 지역: `seoul_gangnam`, `seoul_mapo`, `seoul_songpa`
- 범위 밖 데이터: 파이프라인 적재 시 `action = skipped`

---

## 3) enum 값

### Gender
- `male`
- `female`
- `other`
- `unspecified`

### RegionCode
- `seoul_gangnam`
- `seoul_mapo`
- `seoul_songpa`

### InterestCategory
- `youth_policy`
- `childcare_policy`

### UserPolicyState
- `discovered`
- `in_review`
- `applied`
- `hidden`

### EligibilityResult
- `eligible`
- `conditional`
- `ineligible`

---

## 4) 인증(Auth)

### 4.1 회원가입
`POST /auth/signup`

요청 예시:
```json
{
  "email": "demo1@bengo.app",
  "password": "P@ssw0rd!",
  "age": 26,
  "gender": "unspecified",
  "regionCode": "seoul_mapo",
  "interests": ["youth_policy"]
}
```

응답 예시:
```json
{
  "accessToken": "<JWT>",
  "user": {
    "userId": "uuid",
    "email": "demo1@bengo.app",
    "age": 26,
    "gender": "unspecified",
    "regionCode": "seoul_mapo",
    "interests": ["youth_policy"]
  }
}
```

### 4.2 로그인
`POST /auth/login`

요청 예시:
```json
{
  "email": "demo1@bengo.app",
  "password": "P@ssw0rd!"
}
```

응답은 회원가입과 동일한 포맷입니다.

---

## 5) 파이프라인(Pipeline)

### 5.1 수집 소스 목록
`GET /pipeline/sources`

응답 예시:
```json
[
  {
    "source": "data-go-kr",
    "description": "data.go.kr 공공서비스 혜택 API 수집기",
    "configured": true,
    "mvpEnabled": true,
    "mvpReason": null
  }
]
```

필드 설명:
- `configured`: .env 키/URL 설정 여부
- `mvpEnabled`: MVP 일괄 수집 대상 여부
- `mvpReason`: 제외 사유

### 5.2 MVP 일괄 수집/적재
`POST /pipeline/collect-and-ingest-mvp`

설명:
- MVP 기본 소스(data-go-kr, youthcenter-policy, seoul-open-api) 중 설정 완료 소스를 순차 실행
- 소스별 페이지네이션은 `.env`의 `*_MAX_PAGES` 설정을 따릅니다.

응답 예시:
```json
{
  "mode": "mvp",
  "targets": ["data-go-kr", "youthcenter-policy", "seoul-open-api"],
  "skipped": [
    {
      "source": "mock-seoul",
      "reason": "MVP 기본 배치 대상 소스가 아닙니다."
    }
  ],
  "results": [
    {
      "source": "data-go-kr",
      "ingest": {
        "total": 100,
        "persisted": 12,
        "failed": 0,
        "skipped": 88,
        "items": []
      }
    }
  ],
  "failedSources": []
}
```

### 5.3 데이터 품질 리포트
`GET /pipeline/quality-report`

설명:
- 현재 DB에 적재된 정책을 기준으로 품질을 요약합니다.
- 소스별 적재 수, MVP 범위 적합도, 신청 URL/방법 누락 건수를 제공합니다.

응답 주요 필드:
- `totals.total`: 전체 활성 정책 수
- `totals.inMvpScope`: MVP 범위 적합 정책 수
- `totals.outOfMvpScope`: 범위 외 정책 수
- `totals.missingBoth`: 신청 URL/방법 동시 누락 수
- `bySource`: 소스별 요약
- `outOfScopeSamples`: 범위 외 정책 샘플(최대 20건)

### 5.4 MVP 범위 밖 정책 정리
`POST /pipeline/prune-mvp`

설명:
- 현재 `ACTIVE` 상태 정책 중 MVP 범위를 벗어난 데이터를 `INACTIVE`로 변경합니다.
- 과거 적재 데이터(초기 테스트 중 들어간 정책) 정리에 사용합니다.

응답 주요 필드:
- `totalActiveBefore`: 정리 전 활성 정책 수
- `deactivatedCount`: 비활성화된 정책 수
- `deactivatedByReason`: 사유별 집계
- `sample`: 변경 샘플(최대 20건)

### 5.5 소스 단건 수집/적재
`POST /pipeline/collect-and-ingest/{source}`

- path 예시: `data-go-kr`, `youthcenter-policy`, `youthcenter-center`, `seoul-open-api`, `mock-seoul`

### 5.6 원문 프리뷰(저장 안 함)
`POST /pipeline/preview`

요청 바디(RawPolicyDocument):
```json
{
  "source": "manual-test",
  "sourceUrl": "https://example.go.kr/policies/1",
  "title": "2026 청년 지원",
  "body": "서울 강남구 청년 대상 ...",
  "fetchedAt": "2026-03-04T00:00:00.000Z",
  "metadata": {
    "providerName": "테스트기관"
  }
}
```

### 5.7 원문 단건 적재
`POST /pipeline/ingest`

요청 바디는 `/pipeline/preview`와 동일합니다.

---

## 6) 정책(Policies) - 인증 필요
아래 API는 모두 `Bearer Token` 필요합니다.

### 6.1 정책 목록
`GET /policies`

쿼리 파라미터:
- `search` (string)
- `interest` (`youth_policy` | `childcare_policy`)
- `regionCode` (`seoul_gangnam` | `seoul_mapo` | `seoul_songpa`)
- `sortBy` (`relevance` | `deadline` | `latest`) 기본 `relevance`
- `order` (`asc` | `desc`) 기본 `desc`
- `onlyAvailable` (boolean) 기본 `true`

예시:
`GET /policies?onlyAvailable=true&sortBy=relevance&order=desc`

응답 예시:
```json
{
  "total": 2,
  "items": [
    {
      "id": "policy-uuid",
      "code": "youthcenter-policy-...",
      "title": "청년 정책명",
      "shortDescription": "요약",
      "providerName": "기관명",
      "categories": ["youth_policy"],
      "regionCodes": ["seoul_mapo"],
      "minAge": 19,
      "maxAge": 34,
      "startsAt": null,
      "endsAt": null,
      "fitScore": 70,
      "userState": "discovered"
    }
  ]
}
```

### 6.2 정책 상세
`GET /policies/{id}`

- `id`는 UUID 형식만 허용
- 반드시 **목록에서 받은 id**를 사용

응답 주요 필드:
- 정책 본문/신청 링크/신청 방법
- `requirements`: 추가 입력 폼 생성용 스키마
- `lastEligibility`: 최근 판정 결과

### 6.3 신청 가능 여부 판정
`POST /policies/{id}/check-eligibility`

요청 예시:
```json
{
  "answers": {
    "monthlyIncome": 280,
    "employmentStatus": "취준"
  }
}
```

응답 예시:
```json
{
  "result": "eligible",
  "reasons": ["연령 조건 충족"],
  "explanation": "...",
  "policy": {
    "title": "정책명",
    "applicationUrl": "https://...",
    "applicationMethod": "온라인 신청",
    "sourceUrl": "https://..."
  },
  "checkedAt": "2026-03-04T10:00:00.000Z"
}
```

주의:
- `id=1` 같은 값은 UUID가 아니라서 실패합니다.

### 6.4 내 정책 상태 변경
`PATCH /me/policies/{id}/state`

요청 예시:
```json
{
  "state": "applied",
  "note": "서류 제출 완료"
}
```

### 6.5 내 정책 상태 목록
`GET /me/policies`

응답 예시:
```json
{
  "total": 1,
  "items": [
    {
      "policyId": "policy-uuid",
      "title": "정책명",
      "providerName": "기관명",
      "state": "applied",
      "note": "서류 제출 완료",
      "appliedAt": "2026-03-04T10:30:00.000Z",
      "updatedAt": "2026-03-04T10:30:00.000Z"
    }
  ]
}
```

---

## 7) 프론트 연동 권장 순서
1. 회원가입 또는 로그인으로 `accessToken` 확보
2. `POST /pipeline/collect-and-ingest-mvp`로 데이터 적재
3. `GET /policies`로 정책 목록 표시
4. 정책 클릭 -> `GET /policies/{id}`로 상세/요건 표시
5. 사용자 추가 입력 -> `POST /policies/{id}/check-eligibility`
6. 신청 진행 시 `PATCH /me/policies/{id}/state`
7. 내역 탭에서 `GET /me/policies` 표시

---

## 8) 자주 발생하는 이슈
- 401 Unauthorized: Authorization 헤더 누락/만료 토큰
- 404 Not Found(정책): UUID 형식 오류 또는 MVP 범위 외 정책
- 400 Bad Request: 필수 입력 누락(판정 answers)
- `/me/policies`가 0건: 아직 상태 변경(`PATCH`) 안 했거나 in-scope 항목이 없는 경우
