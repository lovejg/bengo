#!/bin/bash
# 서버 시작 전 DB null 값 정리 — TypeORM sync가 NOT NULL 컬럼 마이그레이션에 실패하지 않도록 예방

ENV_FILE="$(dirname "$0")/../.env"
if [ -f "$ENV_FILE" ]; then
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^POSTGRES_ ]] && export "$key=${value%% #*}"
  done < <(grep -E '^POSTGRES_' "$ENV_FILE")
fi

PGPASSWORD="${POSTGRES_PASSWORD}" psql \
  -U "${POSTGRES_USER:-postgres}" \
  -h "${POSTGRES_HOST:-localhost}" \
  -p "${POSTGRES_PORT:-5432}" \
  -d "${POSTGRES_DB:-bengo}" \
  -c "
    UPDATE raw_policy_documents SET title = '제목 없음' WHERE title IS NULL;
    UPDATE policies SET title = '제목 없음' WHERE title IS NULL;
    UPDATE policies SET \"providerName\" = '미상' WHERE \"providerName\" IS NULL;
  " 2>/dev/null || true
# DB가 아직 없거나 테이블이 없으면 무시 (|| true)
