#!/bin/bash
set -e

# .env에서 DB 접속 정보 읽기
ENV_FILE="$(dirname "$0")/../.env"
if [ -f "$ENV_FILE" ]; then
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^POSTGRES_ ]] && export "$key=${value%% #*}"
  done < <(grep -E '^POSTGRES_' "$ENV_FILE")
fi

export PGPASSWORD="${POSTGRES_PASSWORD}"

psql \
  -U "${POSTGRES_USER:-postgres}" \
  -h "${POSTGRES_HOST:-localhost}" \
  -p "${POSTGRES_PORT:-5432}" \
  -d "${POSTGRES_DB:-bengo}" \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo ""
echo "DB 초기화 완료. 이제 npm run start:dev 를 실행하세요."
