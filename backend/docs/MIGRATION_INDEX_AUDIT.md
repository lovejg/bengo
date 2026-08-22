# `0001_init.sql` 선언 인덱스와 실 스키마 대조

`db/migrations/0001_init.sql`이 선언한 인덱스가 실 데이터베이스에 존재하는지 카탈로그로 대조한 결과다.

## 확인 조건

| 항목 | 값 |
|---|---|
| 확인 시점 | 2026-08-22 08:17 UTC |
| 대상 데이터베이스 | `bengo` |
| 서버 | PostgreSQL 16.11 (Debian 16.11-1.pgdg13+1) on x86_64-pc-linux-gnu, 도커 컨테이너 |
| 접속 방식 | 컨테이너 내부 `psql -U postgres -d bengo` |
| 행 수 | `raw_policy_documents` 26,079 / `pipeline_ingestion_runs` 26,077 / `policies` 743 |

**이 확인은 인덱스를 추가하기 이전 시점의 상태다.** 이후 인덱스가 추가되면 아래 "실재 여부" 열의 값은 달라질 수 있다.
이 확인 이후 외래키 컬럼 인덱스 2개가 추가됐다. 그 내역과 측정은 `FK_INDEX_MEASUREMENT.md`에 있다.

## 대조 결과

선언 위치는 `db/migrations/0001_init.sql`의 `CREATE INDEX` 6개다.

| # | 인덱스 이름 | 선언 내용 | 실재 여부 |
|---|---|---|---|
| 1 | `idx_policies_status` | `ON policies(status)` | **없음** |
| 2 | `idx_policies_categories` | `ON policies USING GIN (categories)` | **없음** |
| 3 | `idx_policies_regions` | `ON policies USING GIN ("regionCodes")` | **없음** |
| 4 | `idx_eligibility_checks_user_policy` | `ON eligibility_checks("userId", "policyId")` | **없음** |
| 5 | `idx_raw_policy_documents_source` | `ON raw_policy_documents(source)` | **없음** |
| 6 | `idx_pipeline_ingestion_runs_raw` | `ON pipeline_ingestion_runs("rawDocumentId")` | **없음** |

**선언 6개 중 실재 0개.**

## 확인 방법

### 1. 선언된 6개의 실재 여부

```sql
SELECT n.name AS declared_in_0001_init,
       (SELECT indexname
          FROM pg_indexes p
         WHERE p.schemaname = 'public'
           AND p.indexname = n.name) AS found_in_db
FROM (VALUES
  ('idx_policies_status'),
  ('idx_policies_categories'),
  ('idx_policies_regions'),
  ('idx_eligibility_checks_user_policy'),
  ('idx_raw_policy_documents_source'),
  ('idx_pipeline_ingestion_runs_raw')
) AS n(name);
```

출력:

```
       declared_in_0001_init        | found_in_db
------------------------------------+-------------
 idx_policies_status                |
 idx_policies_categories            |
 idx_policies_regions               |
 idx_eligibility_checks_user_policy |
 idx_raw_policy_documents_source    |
 idx_pipeline_ingestion_runs_raw    |
(6 rows)
```

`found_in_db`가 6행 모두 NULL이다.

### 2. 마이그레이션 이력 테이블 존재 여부

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('migrations', 'typeorm_metadata',
                     'schema_migrations', 'flyway_schema_history');
```

출력:

```
 table_name
------------
(0 rows)
```

네 가지 이름 중 어느 것도 존재하지 않는다.

### 3. 실 데이터베이스에 존재하는 인덱스 전체

```sql
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

출력 (15행):

```
        tablename        |           indexname            |                                             indexdef
-------------------------+--------------------------------+--------------------------------------------------------------------------------------------------
 eligibility_checks      | PK_d83758376c2909966ac1c400bab | CREATE UNIQUE INDEX "PK_d83758376c2909966ac1c400bab" ON public.eligibility_checks USING btree (id)
 oauth_accounts          | IDX_c2d536981fc2eade0e01e774d0 | CREATE UNIQUE INDEX "IDX_c2d536981fc2eade0e01e774d0" ON public.oauth_accounts USING btree (provider, "providerId")
 oauth_accounts          | PK_710a81523f515b78f894e33bb10 | CREATE UNIQUE INDEX "PK_710a81523f515b78f894e33bb10" ON public.oauth_accounts USING btree (id)
 pipeline_ingestion_runs | PK_8b0fff42ecd539d1f3d2d4bba9c | CREATE UNIQUE INDEX "PK_8b0fff42ecd539d1f3d2d4bba9c" ON public.pipeline_ingestion_runs USING btree (id)
 policies                | PK_603e09f183df0108d8695c57e28 | CREATE UNIQUE INDEX "PK_603e09f183df0108d8695c57e28" ON public.policies USING btree (id)
 policies                | UQ_3c259f680659c66b13087cc85ae | CREATE UNIQUE INDEX "UQ_3c259f680659c66b13087cc85ae" ON public.policies USING btree (code)
 policy_requirements     | PK_30327e4ad6c665645e8c62b94fb | CREATE UNIQUE INDEX "PK_30327e4ad6c665645e8c62b94fb" ON public.policy_requirements USING btree (id)
 policy_rules            | PK_64c7f7b8bb8abd8351075e774b9 | CREATE UNIQUE INDEX "PK_64c7f7b8bb8abd8351075e774b9" ON public.policy_rules USING btree (id)
 raw_policy_documents    | PK_4e630fe9f26035deff83e56ff9e | CREATE UNIQUE INDEX "PK_4e630fe9f26035deff83e56ff9e" ON public.raw_policy_documents USING btree (id)
 user_policy_states      | IDX_a40e48ba4e54e1b76bf968d986 | CREATE UNIQUE INDEX "IDX_a40e48ba4e54e1b76bf968d986" ON public.user_policy_states USING btree ("userId", "policyId")
 user_policy_states      | PK_4b65b3a83f7e52117680ede390b | CREATE UNIQUE INDEX "PK_4b65b3a83f7e52117680ede390b" ON public.user_policy_states USING btree (id)
 user_profiles           | PK_1ec6662219f4605723f1e41b6cb | CREATE UNIQUE INDEX "PK_1ec6662219f4605723f1e41b6cb" ON public.user_profiles USING btree (id)
 user_profiles           | UQ_8481388d6325e752cd4d7e26c6d | CREATE UNIQUE INDEX "UQ_8481388d6325e752cd4d7e26c6d" ON public.user_profiles USING btree ("userId")
 users                   | PK_a3ffb1c0c8416b9fc6f907b7433 | CREATE UNIQUE INDEX "PK_a3ffb1c0c8416b9fc6f907b7433" ON public.users USING btree (id)
 users                   | UQ_97672ac88f789774dd47f7c8be3 | CREATE UNIQUE INDEX "UQ_97672ac88f789774dd47f7c8be3" ON public.users USING btree (email)
```

15개 전부 TypeORM이 생성하는 명명 규칙(`PK_` / `UQ_` / `IDX_` + 해시)을 따른다. `idx_` 접두사 인덱스는 0개다.

## 스키마 자체의 차이

인덱스 외에도 차이가 있다. 왼쪽 열은 `0001_init.sql` 파일에서 직접 센 값이고, 오른쪽 열은 실 `bengo` 데이터베이스를 카탈로그로 조회한 값이다.

| 항목 | `0001_init.sql`이 선언한 값 | 실 `bengo` |
|---|---|---|
| 테이블 수 (`CREATE TABLE`) | 9 | 10 (`oauth_accounts`가 더 있음) |
| `policies` 컬럼 수 | 20 (파일 72–91행) | 24 |
| `users` 컬럼 수 | 5 (파일 53–57행) | 10 |
| `policy_rules` 컬럼 수 | 7 (파일 108–114행) | 8 |
| enum 타입 수 (`CREATE TYPE`) | 7 | 12 |
| enum 타입명 | `gender_enum`, `region_code_enum` 등 | `user_profiles_gender_enum`, `policies_regioncodes_enum` 등 |
| 지역 enum 라벨 수 | 3 (`region_code_enum`, 파일 23행) | 26 (`policies_regioncodes_enum`) |
| 카테고리 enum 라벨 수 | 2 (`interest_category_enum`, 파일 17행) | 4 (`policies_categories_enum`) |

오른쪽 열 확인에 사용한 쿼리:

```sql
SELECT table_name, count(*) AS columns
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;

SELECT t.typname AS enum_type, count(e.enumlabel) AS labels
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY t.typname;
```
