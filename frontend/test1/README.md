# frontend/test1 - 백엔드 테스트용 MVP 화면

## 목적
실서비스 UI가 아니라, 현재 백엔드 API를 **빠르게 수동 검증**하기 위한 단일 페이지입니다.

- 회원가입/로그인
- 파이프라인 수집/적재
- 데이터 품질 리포트 조회
- 정책 목록/상세/자격판정
- 내 정책 상태 변경/조회

## 실행 방법
`frontend/test1` 폴더에서 정적 서버로 실행하세요.

예시 1) Python
```bash
cd frontend/test1
python3 -m http.server 5174
```

브라우저 접속:
- `http://localhost:5174`

## 사용 순서 (권장)
1. 회원가입 또는 로그인
2. `POST /pipeline/collect-and-ingest-mvp` 실행
3. `GET /policies` 실행 후 목록에서 정책 클릭
4. `GET /policies/{id}`
5. `POST /policies/{id}/check-eligibility`
6. `PATCH /me/policies/{id}/state`
7. `GET /me/policies`

## 참고
- 토큰과 Base URL은 `localStorage`에 저장됩니다.
- `policyId`는 UUID만 유효합니다. 목록에서 클릭하면 자동 입력됩니다.
