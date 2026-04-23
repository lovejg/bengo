# Bengo 백엔드 (Nest + Fastify)

## 기술 스택
- NestJS
- Fastify 어댑터
- Swagger
- PostgreSQL (TypeORM)
- Redis (캐시)

## 빠른 시작
1. 환경 변수 파일 복사:
```bash
cp .env.example .env
```
2. 의존성 설치:
```bash
npm install
```
3. 개발 서버 실행:
```bash
npm run start:dev
```

## API 문서
- Swagger: `http://localhost:4000/docs`
- 헬스체크: `GET /health`
- 프론트 연동용 API 명세서: `docs/API_SPEC_KO.md`

## 주요 엔드포인트
- `POST /auth/signup`
- `POST /auth/login`
- `GET /policies` / `GET /policies/:id`
- `GET /policies/:id/my` (로그인 시 사용자 상태·판별 이력 포함)
- `POST /policies/:id/check-eligibility`
- `PATCH /me/policies/:id/state` / `GET /me/policies`
- `POST /pipeline/preview` / `POST /pipeline/ingest`
- `POST /pipeline/collect-and-ingest-mvp` / `POST /pipeline/collect-and-ingest/:source`
- `POST /pipeline/regenerate-rules?force=true` (requirements·LLM rule 재생성)
- `POST /pipeline/enrich-policies` (sourceUrl 보완)
- `GET /pipeline/sources` / `GET /pipeline/quality-report`
- `POST /pipeline/prune-mvp`

## 참고 사항
- 첫 실행 시 MVP 샘플 정책 2건이 자동으로 시드됩니다.
- 로컬 개발 환경에서는 `POSTGRES_SYNC=true`로 빠르게 시작할 수 있습니다.
- SQL 마이그레이션 템플릿: `db/migrations/0001_init.sql`
- `pipeline` 흐름은 `미리보기(preview)`와 `실제 적재(ingest)`를 분리해 운영합니다.
- 현재 MVP 범위는 `청년정책 + 서울 전체`로 강제됩니다.
- 범위 밖 데이터는 적재 시 `action=skipped`로 기록됩니다.
- 개별 정책 예외 처리는 `src/common/constants/policy-manual-overrides.constant.ts`에 선언합니다.

## 실수집 설정
- 아래 4개 키를 `.env`에 입력합니다.
  - `DATA_GO_KR_API_KEY`
  - `YOUTHCENTER_POLICY_API_KEY`
  - `YOUTHCENTER_CENTER_API_KEY`
  - `SEOUL_OPEN_API_KEY`
- 각 소스별 수집 URL도 함께 입력해야 실제 수집이 동작합니다.
  - `DATA_GO_KR_API_URL`
  - `YOUTHCENTER_POLICY_API_URL`
  - `YOUTHCENTER_CENTER_API_URL`
  - `SEOUL_OPEN_API_URL` 또는 (`SEOUL_OPEN_API_HOST` + `SEOUL_OPEN_API_SERVICE_NAME`)
- 서울 전체 수집량을 늘리려면 페이지/서비스 설정을 함께 조정합니다.
  - `DATA_GO_KR_MAX_PAGES`
  - `YOUTHCENTER_POLICY_MAX_PAGES`, `YOUTHCENTER_POLICY_REGION_VALUE=11000`
  - `SEOUL_OPEN_API_SERVICE_NAMES`(쉼표 구분), `SEOUL_OPEN_API_MAX_PAGES`
- `GET /pipeline/sources`에서 소스별 `configured` 상태를 확인할 수 있습니다.
- `POST /pipeline/collect-and-ingest-mvp`로 MVP 대상 소스를 한 번에 적재할 수 있습니다.
- 백엔드 수동 테스트용 프론트: `../frontend/test1`
