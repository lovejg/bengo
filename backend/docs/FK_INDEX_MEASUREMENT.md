# 외래키 컬럼 인덱스 — 측정과 적용 근거

`policy_requirements("policyId")`와 `policy_rules("policyId")`에 인덱스를 추가했다.
아래는 그 근거가 된 측정과, 인덱스를 추가하지 않기로 한 컬럼의 이유다.

재현 스크립트: `db/perf/fk_index_explain.sql`

## 측정 조건

조건 없는 수치는 이 문서에 남기지 않는다.

| 항목 | 값 |
|---|---|
| 측정일 | 2026-08-22 (적용 전 08:17 UTC / 적용 후 09:40 UTC) |
| 머신 | WSL2 Ubuntu-22.04, 커널 5.15.167.4-microsoft-standard-WSL2, 12 vCPU, 15 GiB RAM |
| PostgreSQL | 16.11 (Debian 16.11-1.pgdg13+1) on x86_64-pc-linux-gnu |
| 컨테이너 | 도커 컨테이너에서 구동. 컨테이너 내부에서 `psql`로 접속 |
| 반복 | 각 쿼리 5회 실행, **중앙값** 사용. 매 실행 직전 `ANALYZE` |
| 플래너 설정 | `shared_buffers=128MB`, `work_mem=4MB`, `effective_cache_size=4GB`, `random_page_cost=4`, `seq_page_cost=1`, `max_parallel_workers_per_gather=2`, `enable_seqscan=on` |
| 행 수 | `policy_requirements` 2,766 / `policy_rules` 677 / `policies` 743 / `raw_policy_documents` 26,079 / `pipeline_ingestion_runs` 26,077 |

적용 전후 사이에 행 수 변화는 없었다. 파라미터로 쓴 UUID 4개도 적용 전후 동일하다.

## 배경 — FK 제약은 있으나 인덱스가 없었다

TypeORM `synchronize`는 FK 제약을 만들지만 FK 컬럼에 인덱스를 만들지 않는다.
카탈로그 조회 결과 FK 제약 10개 중 8개에 선두 컬럼 인덱스가 없었다.

```
       table_name        |   fk_column   |   references_table   |          leading_index
-------------------------+---------------+----------------------+----------------------------------
 eligibility_checks      | policyId      | policies             | (none)
 eligibility_checks      | userId        | users                | (none)
 oauth_accounts          | userId        | users                | (none)
 pipeline_ingestion_runs | policyId      | policies             | (none)
 pipeline_ingestion_runs | rawDocumentId | raw_policy_documents | (none)
 policy_requirements     | policyId      | policies             | (none)
 policy_rules            | policyId      | policies             | (none)
 user_policy_states      | policyId      | policies             | (none)
 user_policy_states      | userId        | users                | "IDX_a40e48ba4e54e1b76bf968d986"
 user_profiles           | userId        | users                | "UQ_8481388d6325e752cd4d7e26c6d"
(10 rows)
```

조회 쿼리는 `db/perf/fk_index_explain.sql`의 `[A]` 절에 있다.

## 적용한 인덱스 2개

| 인덱스 | 대상 | 인덱스 크기 | 테이블 크기 |
|---|---|---|---|
| `IDX_5106c0f52b4253ed85fc0f0241` | `policy_requirements("policyId")` | 64 kB | 840 kB |
| `IDX_7c4c521b8ce5a36a385b766e46` | `policy_rules("policyId")` | 40 kB | 800 kB |

엔티티의 `@Index()`로 선언했고, 이름은 TypeORM이 생성하는 값과 같다.

### 측정 결과

**Q3 — `policy_requirements WHERE "policyId" = $1`**
정책 상세 조회에서 `relations: ['requirements']`로 매번 실행되는 형태다.

| 항목 | 적용 전 | 적용 후 |
|---|---|---|
| 계획 노드 | `Seq Scan` | `Bitmap Heap Scan` + `Bitmap Index Scan` |
| 버퍼 | 105 | 3 |
| 실행 시간 (5회 중앙값) | 0.252 ms | 0.019 ms |
| 폐기 행 (`Rows Removed by Filter`) | 2,756 | 0 |

5회 원시값 — 전 `0.252 / 0.234 / 0.259 / 0.241 / 0.257` · 후 `0.029 / 0.019 / 0.017 / 0.017 / 0.019`

```
-- 적용 전
 Seq Scan on policy_requirements  (cost=0.00..139.57 rows=10 width=369) (actual time=0.094..0.244 rows=10 loops=1)
   Filter: ("policyId" = '787e540e-3699-4a2c-8805-a0add7172055'::uuid)
   Rows Removed by Filter: 2756
   Buffers: shared hit=105
 Planning Time: 0.105 ms
 Execution Time: 0.252 ms

-- 적용 후
 Bitmap Heap Scan on policy_requirements  (cost=4.36..35.22 rows=10 width=369) (actual time=0.007..0.008 rows=10 loops=1)
   Recheck Cond: ("policyId" = '787e540e-3699-4a2c-8805-a0add7172055'::uuid)
   Heap Blocks: exact=1
   Buffers: shared hit=3
   ->  Bitmap Index Scan on "IDX_5106c0f52b4253ed85fc0f0241"  (cost=0.00..4.36 rows=10 width=0) (actual time=0.004..0.004 rows=10 loops=1)
         Index Cond: ("policyId" = '787e540e-3699-4a2c-8805-a0add7172055'::uuid)
         Buffers: shared hit=2
 Planning Time: 0.097 ms
 Execution Time: 0.019 ms
```

**Q4 — `policy_rules WHERE "policyId" = $1 AND "isActive" = true`**
자격 판정에서 활성 규칙을 찾는 형태다.

| 항목 | 적용 전 | 적용 후 |
|---|---|---|
| 계획 노드 | `Seq Scan` | `Index Scan` |
| 버퍼 | 100 | 3 |
| 실행 시간 (5회 중앙값) | 0.106 ms | 0.014 ms |
| 폐기 행 | 676 | 0 (`isActive`는 `Filter`로 남음) |

5회 원시값 — 전 `0.103 / 0.083 / 0.114 / 0.106 / 0.106` · 후 `0.025 / 0.014 / 0.011 / 0.009 / 0.016`

```
-- 적용 전
 Seq Scan on policy_rules  (cost=0.00..108.46 rows=1 width=962) (actual time=0.040..0.096 rows=1 loops=1)
   Filter: ("isActive" AND ("policyId" = '5efaf844-793b-466a-a92f-6c9c5c049c96'::uuid))
   Rows Removed by Filter: 676
   Buffers: shared hit=100
 Planning Time: 0.082 ms
 Execution Time: 0.103 ms

-- 적용 후
 Index Scan using "IDX_7c4c521b8ce5a36a385b766e46" on policy_rules  (cost=0.28..8.29 rows=1 width=962) (actual time=0.006..0.006 rows=1 loops=1)
   Index Cond: ("policyId" = '5efaf844-793b-466a-a92f-6c9c5c049c96'::uuid)
   Filter: "isActive"
   Buffers: shared hit=3
 Planning Time: 0.091 ms
 Execution Time: 0.014 ms
```

### 개선 폭의 크기에 대해

| | 버퍼 | 시간 |
|---|---|---|
| Q3 `policy_requirements` | 105 → 3 (35.0배) | 0.252 → 0.019 ms (13.3배) |
| Q4 `policy_rules` | 100 → 3 (33.3배) | 0.106 → 0.014 ms (7.6배) |

절대 시간 감소폭은 쿼리당 0.23 ms와 0.09 ms다. 순차 스캔 비용은 테이블 페이지
수에 비례하고 인덱스 조회는 3버퍼로 수렴하므로, 배수는 테이블 크기를 따라간다.
두 테이블은 각각 105페이지와 100페이지로 작다.

## 인덱스를 추가하지 않은 컬럼과 그 이유

### `pipeline_ingestion_runs("rawDocumentId")` / `pipeline_ingestion_runs("policyId")`

**이 컬럼들을 읽는 코드 경로가 없다.** 이것이 추가하지 않은 유일한 이유다.

근거 두 가지:

**(a) 이 컬럼들의 부모 행을 삭제하는 코드가 없다.**
두 컬럼은 각각 `ON DELETE CASCADE`와 `ON DELETE SET NULL`을 걸고 있어, 부모
테이블(`raw_policy_documents`, `policies`)의 행이 삭제될 때 제약 검사로 조회된다.
그런데 `src/` 전체에서 삭제성 호출(`.delete(`, `.remove(`, `.clear(`,
`.softDelete(`, `.softRemove(`, `TRUNCATE`, `DELETE FROM`)은 네 곳뿐이고 대상이
`users`, `policy_requirements`, `policy_rules`, `user_policy_states`다. 두 부모
테이블을 삭제하는 코드는 없다. 원시 SQL(`.query(`) 사용도 없다.
`POST /pipeline/prune-mvp`와 `POST /pipeline/deactivate-expired`는 삭제가 아니라
`status`를 `INACTIVE`로 바꾸는 소프트 처리다.

**(b) 재수집이 delete-insert가 아니라 upsert 구조다.**
`src/pipeline/pipeline-ingestion.service.ts`는 `code`로 기존 정책을 찾아
`create({ id: existing?.id, ... })` 후 `save()` 한다. 기존 행이 있으면 UPDATE,
없으면 INSERT다. `raw_policy_documents`는 매 수집마다 새 행을 추가하기만 하며
UPDATE도 DELETE도 하지 않는다. 실제로 4일간의 수집 이력이 줄어든 적이 없다.

```
    day     | raw_docs_inserted
------------+-------------------
 2026-05-01 |              5826
 2026-05-02 |              9550
 2026-05-03 |              6636
 2026-05-04 |              4067      합계 26,079 = 현재 행 수
```

이 컬럼들에 대해서도 실행계획을 재봤다. 다만 **애플리케이션이 실제로 쏘는
쿼리가 아니라 제약 검사 경로를 재현한 합성 쿼리이므로, 아래 수치는 이 테이블
구조가 가진 잠재 비용이지 애플리케이션이 겪고 있는 비용이 아니다.**

| 합성 쿼리 | 계획 노드 | 버퍼 | 실행 시간 (5회 중앙값) | 폐기 행 |
|---|---|---|---|---|
| `WHERE "rawDocumentId" = $1` | `Seq Scan` | 2,955 | 3.051 ms | 26,076 |
| `WHERE "policyId" = $1` | `Seq Scan` | 2,955 | 2.874 ms | 26,063 |

이 두 컬럼을 읽는 코드가 생기면 그때 다시 측정해 판단한다.

### `eligibility_checks("userId")` / `eligibility_checks("policyId")` / `user_policy_states("policyId")`

두 테이블 모두 **행이 0개**라 실행계획을 비교할 대상이 없다. 측정하지 않았고
수치를 만들지 않았다. `user_policy_states`는 애플리케이션 쿼리가 항상
`{userId, policyId}` 쌍이라 기존 복합 UNIQUE 인덱스가 선두 컬럼을 덮는다.

### `oauth_accounts("userId")`

행이 2개다. 순차 스캔이 인덱스 조회보다 유리한 크기라 추가하지 않았다.

## 테스트

39개 = `npm test` 34개 + `npm run test:e2e` 5개. 두 설정의 `rootDir`와
`testRegex`가 서로 배타적이라 `npm test` 하나만으로는 34개만 실행된다.
39개 전부 DB를 타지 않으므로 인덱스 동작의 증거가 아니다.

확인 방법 — 두 설정 파일의 값:

```jsonc
// package.json 의 "jest" 블록  (npm test / npm run test:cov 가 사용)
{
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$"
}
```

```jsonc
// test/jest-e2e.json  (npm run test:e2e 가 --config 로 지정)
{
  "rootDir": ".",
  "testRegex": ".e2e-spec.ts$"
}
```

`rootDir`가 `src`인 쪽은 `test/` 디렉터리를 탐색하지 않는다. 또한
`.*\.spec\.ts$`는 `spec` 앞에 점을 요구하는데 파일명이
`test/policies.e2e-spec.ts`라 하이픈이 와서 매칭되지 않는다. 두 조건 각각으로
이미 제외되므로 `npm test`는 이 파일을 실행하지 않는다.

실행 결과:

```
$ npm test
Test Suites: 4 passed, 4 total
Tests:       34 passed, 34 total

$ npm run test:e2e
PASS test/policies.e2e-spec.ts
  Policies (e2e)
    GET /policies
      ✓ 유효한 요청이면 200과 목록을 반환한다
      ✓ 정의되지 않은 enum 값(interest)이면 400
      ✓ 화이트리스트에 없는 쿼리 파라미터면 400
    GET /policies/:id
      ✓ UUID가 아닌 id면 400 (ParseUUIDPipe)
      ✓ 유효한 UUID면 200
Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```

두 스위트를 자동으로 함께 실행하는 CI 설정은 저장소에 없다. `.github`,
`.circleci`, `.gitlab-ci.yml`, `Jenkinsfile`, `.travis.yml` 어느 것도 존재하지
않으며 git 히스토리에도 없다.

인덱스가 실제로 생성됐다는 근거는 테스트가 아니라 카탈로그 조회다.

```
 public | IDX_5106c0f52b4253ed85fc0f0241 | index | postgres | policy_requirements
 public | IDX_7c4c521b8ce5a36a385b766e46 | index | postgres | policy_rules
 public | PK_30327e4ad6c665645e8c62b94fb | index | postgres | policy_requirements
 public | PK_64c7f7b8bb8abd8351075e774b9 | index | postgres | policy_rules
```
