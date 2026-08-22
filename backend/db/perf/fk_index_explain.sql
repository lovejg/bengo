-- 외래키 컬럼 인덱스 측정 재현 스크립트
--
-- 사용법:
--   psql -U postgres -d bengo -f db/perf/fk_index_explain.sql
--
-- 파라미터로 쓰는 UUID 4개는 아래 [0]에서 뽑은 고정값이다. 다른 데이터셋에서
-- 재현하려면 [0]을 먼저 실행해 그 출력으로 \set 값을 교체한다.
-- 인덱스 적용 전과 후에 같은 값으로 실행해야 대조가 성립한다.

\echo '===== [0] 파라미터 재산출 (다른 데이터셋에서 재현할 때만 사용) ====='
SELECT 'P_RAW_DOC_ID' AS name,
       (SELECT "rawDocumentId"::text FROM pipeline_ingestion_runs
         ORDER BY "rawDocumentId" OFFSET 13000 LIMIT 1) AS value
UNION ALL
SELECT 'P_RUNS_POLICY_ID',
       (SELECT "policyId"::text FROM pipeline_ingestion_runs
         WHERE "policyId" IS NOT NULL ORDER BY "policyId" OFFSET 300 LIMIT 1)
UNION ALL
SELECT 'P_REQ_POLICY_ID',
       (SELECT "policyId"::text FROM policy_requirements
         ORDER BY "policyId" OFFSET 1300 LIMIT 1)
UNION ALL
SELECT 'P_RULE_POLICY_ID',
       (SELECT "policyId"::text FROM policy_rules
         ORDER BY "policyId" OFFSET 300 LIMIT 1);

\set QUIET on
\set raw   '7e166261-399c-4b97-b4b6-e322df6de5d2'
\set pol   '091aec34-c072-4a14-9feb-9452bef3141a'
\set req   '787e540e-3699-4a2c-8805-a0add7172055'
\set rule  '5efaf844-793b-466a-a92f-6c9c5c049c96'
\set QUIET off

\echo ''
\echo '===== [A] FK 제약이 있으나 선두 컬럼 인덱스가 없는 컬럼 전수 ====='
SELECT
  c.conrelid::regclass::text  AS table_name,
  a.attname                   AS fk_column,
  c.confrelid::regclass::text AS references_table,
  COALESCE((
    SELECT string_agg(i.indexrelid::regclass::text, ', ')
    FROM pg_index i
    WHERE i.indrelid = c.conrelid
      AND i.indkey[0] = c.conkey[1]
  ), '(none)')                AS leading_index
FROM pg_constraint c
JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON k.ord = 1
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
WHERE c.contype = 'f'
  AND c.connamespace = 'public'::regnamespace
ORDER BY 1, 2;

\echo ''
\echo '===== [B] 대상 테이블 행 수 ====='
SELECT 'policy_requirements' AS t, count(*) FROM policy_requirements
UNION ALL SELECT 'policy_rules', count(*) FROM policy_rules
UNION ALL SELECT 'pipeline_ingestion_runs', count(*) FROM pipeline_ingestion_runs
UNION ALL SELECT 'raw_policy_documents', count(*) FROM raw_policy_documents
UNION ALL SELECT 'policies', count(*) FROM policies
ORDER BY 1;

-- 아래 Q1~Q4는 각각 5회 실행한다. 매 실행 직전에 ANALYZE를 돌려
-- 통계 갱신 시점을 일치시킨다. 보고에는 5회의 중앙값을 쓴다.

\echo ''
\echo '################ Q1  pipeline_ingestion_runs("rawDocumentId") ################'
\echo '# 애플리케이션에 이 형태의 SELECT는 없다. ON DELETE CASCADE 제약 검사'
\echo '# 경로를 재현한 합성 쿼리다. jsonb 컬럼 TOAST 접근을 배제하려고'
\echo '# SELECT id 로 좁혔다.'
ANALYZE pipeline_ingestion_runs;
EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM pipeline_ingestion_runs WHERE "rawDocumentId" = :'raw';
ANALYZE pipeline_ingestion_runs;
EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM pipeline_ingestion_runs WHERE "rawDocumentId" = :'raw';
ANALYZE pipeline_ingestion_runs;
EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM pipeline_ingestion_runs WHERE "rawDocumentId" = :'raw';
ANALYZE pipeline_ingestion_runs;
EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM pipeline_ingestion_runs WHERE "rawDocumentId" = :'raw';
ANALYZE pipeline_ingestion_runs;
EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM pipeline_ingestion_runs WHERE "rawDocumentId" = :'raw';

\echo ''
\echo '################ Q2  pipeline_ingestion_runs("policyId") ################'
\echo '# 역시 애플리케이션 SELECT가 없다. ON DELETE SET NULL 제약 검사 경로'
\echo '# 재현용 합성 쿼리다.'
ANALYZE pipeline_ingestion_runs;
EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM pipeline_ingestion_runs WHERE "policyId" = :'pol';
ANALYZE pipeline_ingestion_runs;
EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM pipeline_ingestion_runs WHERE "policyId" = :'pol';
ANALYZE pipeline_ingestion_runs;
EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM pipeline_ingestion_runs WHERE "policyId" = :'pol';
ANALYZE pipeline_ingestion_runs;
EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM pipeline_ingestion_runs WHERE "policyId" = :'pol';
ANALYZE pipeline_ingestion_runs;
EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM pipeline_ingestion_runs WHERE "policyId" = :'pol';

\echo ''
\echo '################ Q3  policy_requirements("policyId") ################'
\echo '# src/policies/policies.service.ts 의 relations: [requirements] 로딩과'
\echo '# 같은 형태다. 정책 상세 조회마다 실행된다.'
ANALYZE policy_requirements;
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM policy_requirements WHERE "policyId" = :'req';
ANALYZE policy_requirements;
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM policy_requirements WHERE "policyId" = :'req';
ANALYZE policy_requirements;
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM policy_requirements WHERE "policyId" = :'req';
ANALYZE policy_requirements;
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM policy_requirements WHERE "policyId" = :'req';
ANALYZE policy_requirements;
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM policy_requirements WHERE "policyId" = :'req';

\echo ''
\echo '################ Q4  policy_rules("policyId") ################'
\echo '# src/policies/policies.service.ts 의 자격 판정용 활성 규칙 조회와'
\echo '# 같은 형태다.'
ANALYZE policy_rules;
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM policy_rules WHERE "policyId" = :'rule' AND "isActive" = true;
ANALYZE policy_rules;
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM policy_rules WHERE "policyId" = :'rule' AND "isActive" = true;
ANALYZE policy_rules;
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM policy_rules WHERE "policyId" = :'rule' AND "isActive" = true;
ANALYZE policy_rules;
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM policy_rules WHERE "policyId" = :'rule' AND "isActive" = true;
ANALYZE policy_rules;
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM policy_rules WHERE "policyId" = :'rule' AND "isActive" = true;
