# Bengo 백엔드 아키텍처 (MVP)

## 핵심 원칙
- 자격 판정의 최종 결정권은 규칙 엔진이 가진다.
- LLM은 정규화 보조와 사용자 설명 생성 보조 계층으로 사용한다.
- 모든 판정에는 출처 추적 정보(원문 URL, 수집 시각, 규칙 버전, 판정 이력)를 남긴다.

## 데이터 파이프라인
1. 공공 API/크롤링으로 원문 정책 데이터를 수집한다.
2. 통합 스키마로 정규화한다. (규칙 우선, LLM 보조)
3. 스키마 및 비즈니스 규칙 검증을 수행한다.
4. 검증 완료된 정책/규칙을 저장한다.
5. 추천 결과와 자격 판정 설명을 제공한다.

### 파이프라인 API 운영 방식
- `POST /pipeline/preview`: 저장 없이 정규화/검증 결과만 확인
- `POST /pipeline/ingest`: 원문 저장 + 정규화 + 검증 + 정책 업서트
- `POST /pipeline/collect-and-ingest-mvp`: MVP 대상 소스 일괄 수집/적재
- `POST /pipeline/collect-and-ingest/:source`: 수집 어댑터 실행 후 배치 적재
- `POST /pipeline/regenerate-rules?force=true`: 모든 활성 정책의 requirements·LLM rule 재생성
- `POST /pipeline/enrich-policies`: sourceUrl 보완·제공기관 URL 검증
- `GET /pipeline/sources`: 소스별 설정 여부 + MVP 대상 포함 여부 확인
- `GET /pipeline/quality-report`: 소스별 데이터 품질/범위 적합도 점검
- `POST /pipeline/prune-mvp`: 과거 적재된 범위 밖 활성 정책 일괄 정리
- MVP 범위(청년정책 + 서울) 밖 데이터는 `skipped` 처리
- 이력 테이블:
  - `raw_policy_documents`: 수집 원문 저장
  - `pipeline_ingestion_runs`: 적재 실행 결과/검증 결과 저장

### 수동 Override 시스템
- `src/common/constants/policy-manual-overrides.constant.ts`에 개별 정책의 예외 처리를 선언한다.
- 주요 override 유형:
  - `disableRule`: LLM 규칙 무시 + 힌트만 표시 (복수 신청층 등 단일 규칙 표현 불가한 정책)
  - `overrideRule`: LLM 규칙을 수동 정의 규칙으로 교체
  - `appendConditionalHints`: LLM 규칙 유지, 힌트만 추가
  - `regionCodes`, `minAge`, `maxAge`, `policyType`: 수집기 오류 필드 강제 교정

## 런타임 플로우
1. 사용자는 나이/지역/성별/관심 분야로 회원가입한다.
2. 정책 목록 API가 후보 정책을 반환한다. (검색/필터/정렬)
3. 사용자가 상세 페이지에서 추가 정보를 입력한다.
4. 자격 판정 엔진이 규칙을 평가하고 판정 이력을 저장한다.
5. 사용자는 상태를 `in_review`, `applied`, `hidden`으로 관리한다.

## 모듈 구성
- `auth`: 회원가입, 로그인, JWT 인증
- `users`: 사용자 프로필 저장/조회
- `policies`: 목록/상세/자격 판정/상태 관리
- `eligibility`: 규칙 평가 및 설명 생성
- `pipeline`: 수집 어댑터 + 정규화 + 검증 + 적재 + requirement·rule 생성

### pipeline 파일 구조
- `policy-normalization.service.ts`: raw 데이터 → 정규화된 문서 (regex 기반)
- `llm-rule-extractor.service.ts`: Anthropic SDK로 조건 트리·요약 추출
- `policy-requirement-generator.service.ts`: 정책별 requirement·rule 생성 오케스트레이션
- `requirement-generator.helper.ts`: 규칙 트리 → requirement 변환, 힌트 추출, 해시 계산
- `requirement-labels.constant.ts`: answers.* 키 → 한국어 레이블 매핑

## LLM 안전 장치
- 정규화 결과는 JSON Schema 제약으로 강제한다.
- 신뢰도 점수와 운영 검수 큐를 함께 유지한다.
- LLM이 하드 규칙 판정을 뒤집지 못하도록 제한한다.
