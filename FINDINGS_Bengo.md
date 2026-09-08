<!-- 2026.09.06 작성 · 대상 저장소 bengo · GATE 1~6 조사 결과 -->

# FINDINGS — Bengo 재분석 (2026.09.06)

> 조사 대상: `https://github.com/lovejg/bengo` (로컬 HEAD `058a1fe`, 브랜치 `be/develop`)
> 함께 읽은 것: `면접준비_04_Bengo.md`(1차 분석, 2026.08) · `TASKS_재분석_Bengo.md`(지시서)
> 이 문서는 **사실과 관찰만** 기록합니다. 서류 문장을 어떻게 고칠지는 제안하지 않습니다.
>
> **구간 표기** — **[팀]** = 팀 프로젝트 기간(2026-03-06 ~ 2026-07-01) · **[단독]** = 2026.08 단독 작업(2026-08-22)

---

## 1. 저장소 기본 정보

### 1-1. 원격 · 공개 여부

```
$ git remote -v
origin  git@github.com:lovejg/bengo.git (fetch/push)
```
`https://github.com/lovejg/bengo` **공개 저장소, 정상 로드 확인** (404 아님).

### 1-2. 커밋 수와 작성자

```
$ git log --oneline | wc -l                       → 70
$ git log --oneline --no-merges | wc -l           → 42
$ git log --no-merges --format='%an <%ae>' | sort | uniq -c | sort -rn
     29 tmakdrl <tmakdrl@naver.com>
     12 nicephj95-crypto <https://github.com/nicephj95-crypto/homework4>
      1 박찬영 Park Chan Young <118319100+lovejg@...>     ← 0dbdf8a Initial commit
```

**백엔드 한정:**
```
$ git log --no-merges --format='%H' -- backend | wc -l              → 28
$ git log --no-merges --format='%an <%ae>' -- backend | sort | uniq -c
     28 tmakdrl <tmakdrl@naver.com>
$ git log --no-merges --format='%h %an' -- backend | grep -v tmakdrl → (none)
```
**`backend/`를 건드린 비-tmakdrl 커밋 0건.**

### 1-3. 첫 커밋 · 마지막 커밋 · 구간 경계 (해시 특정)

| 구간 | 범위 | 커밋 수 |
|---|---|---|
| (팀원) 초기화 | `0dbdf8a` 2026-02-25 "Initial commit" | 1 |
| **[팀] 백엔드** | `918e959` (2026-03-06) … `8464b3d` (2026-07-01 "최종본") | **26** |
| **[단독] 2026.08** | `020fef7` (2026-08-22 18:07) · `058a1fe` (2026-08-22 20:22) | **2** |

**경계 커밋 = `8464b3d` → `020fef7`.** 두 구간 사이 공백 **52일**. 단독 구간은 같은 날 2시간 15분 안에 완료.

```
$ git log --format='%ad %h %an %s' --date=iso 8464b3d..HEAD
2026-08-22 18:07:08 +0900 020fef7 tmakdrl docs: 0001_init.sql이 실 스키마에 적용되지 않았음을 표시하고 대조 결과 기록
2026-08-22 20:22:13 +0900 058a1fe tmakdrl perf(db): 외래키 컬럼 policy_requirements.policyId, policy_rules.policyId에 인덱스 추가
```

### 1-4. 브랜치 상태 — 로컬 참조가 원격보다 오래됐습니다

```
$ for b in main dev be/develop origin/main …; do echo "$b : $(git log --oneline $b | wc -l)"; done
main : 1          be/develop : 70        origin/main : 1
dev : 70          origin/be/develop : 70 origin/fe/develop : 69
$ git log -1 --format='%h %ad %s' --date=short main
0dbdf8a 2026-02-25 Initial commit
```
로컬 `origin/main`은 커밋 1개짜리입니다. **원격 `main`은 그렇지 않습니다** — GitHub 조회 결과 HEAD는 `31c8e47 "Merge pull request #46 from lovejg/be/develop"` (2026-08-22)이고, `058a1fe`가 병합돼 있습니다. 저장소를 처음 여는 사람은 **최신 상태의 main**을 보게 됩니다. 저장소를 건드리지 않기 위해 `git fetch`는 실행하지 않았습니다.

### 1-5. 빌드 · 테스트

환경: `node v20.11.0` / `npm 10.2.4`

```
$ cd backend && npx tsc -p tsconfig.build.json --noEmit
(출력 없음 = 오류 0)   real 0m4.088s
```
※ `dist/`를 덮어쓰지 않기 위해 `nest build` 대신 emit 없이 검증했습니다.

**테스트는 정적 카운트가 아니라 실행 결과입니다.**
```
$ npm test
PASS src/common/enums/region-code.enum.spec.ts
PASS src/common/constants/mvp-policy-scope.constant.spec.ts
PASS src/eligibility/eligibility.service.spec.ts
PASS src/auth/auth.service.spec.ts
Test Suites: 4 passed, 4 total
Tests:       34 passed, 34 total       Time: 5.243 s

$ npm run test:e2e
PASS test/policies.e2e-spec.ts
Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total         Time: 4.966 s
```
**34 + 5 = 39개 전부 통과. `npm test` 하나로는 34개만 실행.**
배타 구조: `package.json` `jest.rootDir="src"` / `testRegex=".*\.spec\.ts$"` vs `test/jest-e2e.json` `rootDir="."`(=`backend/test`) / `testRegex=".e2e-spec.ts$"`.

### 1-6. Docker · CI — 파일 자체가 존재한 적이 없습니다

```
$ git ls-files | grep -iE 'docker|compose|Dockerfile'                     → (없음)
$ find . -type f \( -iname '*docker*' -o -iname '*compose*' \)             → (없음, node_modules 제외)
$ git log --all --pretty=format: --name-only --diff-filter=A | sort -u \
    | grep -iE 'docker|compose|\.github/|\.gitlab|jenkins|Procfile|vercel|netlify|fly\.toml|railway|render\.yaml|k8s|helm|terraform'
(none)
```
**전 브랜치 이력 전체에서 컨테이너·CI·배포 설정이 추가된 적이 0건.** 따라서 "`docker compose`로 스택이 뜨는지"는 **해당 없음(파일 부재 확정)**입니다.

DB는 compose가 아니라 수동 컨테이너로 운영된 흔적이 있습니다:
```
$ docker ps -a
8a79a53ffc8d redis:7      bengo-redis      Exited (255) 3 months ago
784dd406e025 postgres:16  bengo-postgres   Exited (0) 2 weeks ago
```

---

## 2. 서류 단정 검증 (11개)

| # | 서류 단정 | 판정 | 실제 확인 결과 | 근거 (명령·출력·파일:줄) |
|---|---|---|---|---|
| 1 | 엔드포인트 32 · 도메인 모듈 9 · 백엔드 약 10,000줄 | **일치** | 엔드포인트 32 / 모듈 파일 9 / 엔티티 10 / DTO 13. 줄 수는 아래 §2 병기표 참조 | `git ls-files \| grep 'controller\.ts$' \| xargs grep -hE '^\s*@(Get\|Post\|Put\|Patch\|Delete\|All\|Head\|Options)\(' \| wc -l` → 32 |
| 2 | 백엔드 커밋 **26개** 전부 본인 | **수치 병기 필요 (귀속은 일치)** | **총 28** = [팀] 26 + [단독] 2. 28개 전부 tmakdrl, 타인 커밋 0건 | §1-2, §1-3 |
| 3 | 배포하지 않았다 | **일치** | 컨테이너·CI·배포 설정이 전 브랜치 이력에 0건 | §1-6 |
| 4 | 판정을 2값 → **"조건부"를 넣어 3값**으로 바꿨다 | **전환 지점 없음 / 이전 단계는 확인 불가** | git 이력상 **최초 백엔드 커밋부터 3-state**. enum 파일은 생성 후 한 번도 수정 안 됨 | 아래 상세 |
| 5 | 최종 판정 서비스에 LLM 의존 자체가 없다 | **일치** | `constructor` 없음, DI 메타데이터 없음, import는 enum·interface·엔티티 타입뿐 | 실행: `EligibilityService.length = 0`, `design:paramtypes = undefined`, 소스 정규식 검사 `false` |
| 6 | 판정 경로에 네트워크 호출이 하나도 없어 같은 입력이면 항상 같은 결과 | **일치 (실행 재현)** | 호출 그래프에 HTTP·LLM 0건. 동일 입력 100회 결과 동일 | `policies.service.ts:302-392` / 실행: `100 calls identical = true` |
| 7 | LLM 출력은 구조 검증을 통과한 것만 채택 | **일치** | 수기 타입 가드. 필수 필드·금지 key·`answers.` 접두사·연산자 화이트리스트 8종 | `llm-rule-extractor.service.ts:486-598`, 화이트리스트 `:515` |
| 8 | 호출 실패 시 규칙 없이 남아 엔진이 "조건부"로 떨어뜨린다 | **일치 (실패 주입 재현)** | 3가지 실패 모드 전부 `null` 수렴 → 엔진 `conditional` | 아래 상세 |
| 9 | 985배 쿼리를 부르는 코드가 소스 전체에 없다 | **일치 (전수 재확인)** | 두 테이블 읽기 호출 0건, 부모 삭제 코드 0건, `relations` 로딩 0건, 원시 SQL 0건 | 아래 상세 |
| 10 | 실제로 호출되는 두 경로에만 인덱스를 적용했다 | **일치** | `@Index()` 두 줄. 커밋 `058a1fe`의 소스 변경은 정확히 4줄 | `policy-requirement.entity.ts:18`, `policy-rule.entity.ts:18` |
| 11 | 측정 조건과 미적용 사유를 저장소에 남겼다 | **부분 일치** | 문서 실재·조건 상세. **다만 "985배"·"148배"는 저장소 문서에 없음** | 아래 상세 + §3-A |

### #4 상세 — 2-state → 3-state 전환

```
$ git log --all -S'CONDITIONAL' --format='%ad %h %s' --date=short --reverse -- backend
2026-03-06 918e959 지금까지 한 것들 싹 다 push(backend)      ← 백엔드 최초 커밋
2026-03-10 b956bce / 2026-03-13 0399c9d / 2026-03-30 711e8e0 / 2026-04-06 50cb085 / 2026-07-01 8464b3d

$ git log --all --follow --format='%ad %h %s' --date=short -- backend/src/common/enums/eligibility-result.enum.ts
2026-03-06 918e959 지금까지 한 것들 싹 다 push(backend)      ← 이 한 건이 전부

$ git show 918e959:backend/src/common/enums/eligibility-result.enum.ts
export enum EligibilityResult {
  ELIGIBLE = 'eligible',
  CONDITIONAL = 'conditional',
  INELIGIBLE = 'ineligible',
}
```
선언만이 아니라 **최초 커밋 시점의 `eligibility.service.ts`(265줄)에 CONDITIONAL 반환 경로가 4개** 있었습니다(`conditionalHints` 있음 / `unverifiedConditions` 있음 / 자동판별 데이터 없음 / `reasons` 남음).

리비전별 `CONDITIONAL` 등장 횟수는 **11 → 9 → 5 → 9 → 9 → 9** 로 오르내립니다. 도입이 아니라 판정 규칙 조정의 흔적입니다.

**사유** — 최초 백엔드 커밋의 메시지가 **"지금까지 한 것들 싹 다 push(backend)"** 인 일괄 투입이므로, **git이 커버하지 않는 그 이전 구간에서 2-state였는지는 저장소로 확인할 수 없습니다.** 확인 가능한 것은 ① git 이력에 2-state 시점이 없다 ② 최초 커밋 시점에 3-state가 완전히 구현돼 있었다, 두 가지뿐입니다.

### #8 상세 — 실패 주입 재현

구조: `policy-requirement-generator.service.ts:147`이 `llmResult`가 null이면 `saveLlmRule`을 호출하지 않음 → `policy_rules` 행 없음 → `checkEligibility`의 `activeRule` undefined → `eligibility.service.ts:145-155`의 `if (!input.rule) return CONDITIONAL`.

실제 실행 결과:
```
(1) API 키 없음            -> extractRules returned: null
    [WARN] LLM rule extractor disabled: ANTHROPIC_API_KEY missing or LLM_ENABLED=false
(2) 429 예외 throw         -> extractRules returned: null
    [ERROR] LLM extraction failed for policy TEST-2: 429 Too Many Requests
(3) max_tokens로 잘린 JSON -> extractRules returned: null
    [WARN] LLM response contains no JSON block

engine with rule=undefined -> result = conditional | is CONDITIONAL = true
reasons = ["기본 조건(나이/지역)은 충족하지만, 추가 자격 조건은 공식 공고문에서 확인이 필요합니다."]
```

### #9 상세 — 호출처 전수 재확인

```
$ grep -n 'runRepository' src/pipeline/pipeline-ingestion.service.ts
54: (주입) / 78,114,150,180,214,274,349: runRepository.save( runRepository.create(   ← 전부 쓰기
$ grep -n 'rawRepository' src/pipeline/pipeline-ingestion.service.ts
52: (주입) / 63: rawRepository.save( rawRepository.create(                            ← 쓰기 1곳
```
`find`/`findOne`/`count`/`createQueryBuilder`/`where`가 두 리포지터리에 **0건**.

```
$ grep -rn "relations" src/ | grep -v spec        → 7곳 전부, runs·rawDocument 로딩 0건
$ grep -rnE '\.delete\(|\.remove\(|\.clear\(|\.softDelete\(|\.softRemove\(|TRUNCATE|DELETE FROM|\.query\(' src/ | grep -v spec
users/users.service.ts:273                            userRepository.delete(userId)
pipeline/policy-requirement-generator.service.ts:174  requirementRepository … .delete()
pipeline/policy-requirement-generator.service.ts:177  ruleRepository … .delete()
policies/policies.service.ts:475                      userPolicyStateRepository.remove(existing)
```
네 곳뿐이고 대상은 `users`·`policy_requirements`·`policy_rules`·`user_policy_states`. **`raw_policy_documents`·`policies`를 삭제하는 코드 없음. 원시 SQL 0건.** `rawDocumentId`가 등장하는 16곳은 전부 run 레코드 생성 시 대입(쓰기)이며 `where` 절이 아닙니다.

### #11 상세 — 문서는 실재, 배수 수치는 없음

**실재하는 산출물 (전부 [단독] 구간):**

| 파일 | 줄 수 | 커밋 |
|---|---|---|
| `backend/docs/MIGRATION_INDEX_AUDIT.md` | 153 | `020fef7` |
| `backend/docs/FK_INDEX_MEASUREMENT.md` | 247 | `058a1fe` |
| `backend/db/perf/fk_index_explain.sql` | 124 | `058a1fe` |
| `backend/db/migrations/0001_init.sql` 상단 주석 4줄 + `backend/README.md` 1줄 | — | `020fef7` |

측정 조건은 매우 상세합니다(`FK_INDEX_MEASUREMENT.md:8-22`) — 측정일·시각(UTC), 커널 버전, vCPU/RAM, PostgreSQL 16.11, 컨테이너 구동, 5회 중앙값·매회 직전 `ANALYZE`, 플래너 파라미터 7개, 테이블별 행 수, "적용 전후 행 수 변화 없음·파라미터 UUID 동일". 문서 첫머리(`:10`)에 **"조건 없는 수치는 이 문서에 남기지 않는다"**.

미적용 사유도 있습니다(`:132-184`) — `pipeline_ingestion_runs` 두 컬럼은 "읽는 코드 경로가 없다" 단일 사유 + 근거 (a)삭제 코드 부재 (b)upsert 구조 + 4일간 적재 이력 표. `eligibility_checks`·`user_policy_states`는 "행이 0개라 비교 대상이 없어 측정하지 않았고 수치를 만들지 않았다". `oauth_accounts`는 "행 2개".

**★ 그러나 서류가 인용하는 배수는 저장소에 없습니다.**

```
$ git grep -n '985' -- . ':!*package-lock.json'
frontend/src/styles/theme.css:34,37,75,77,79,80,83,87,101,103,105:  oklch(0.985 0 0)   ← CSS 색상값뿐
$ git grep -n '985배\|148배'  → (출력 없음)
$ git grep -n '0.23 ms\|0.09 ms'
backend/docs/FK_INDEX_MEASUREMENT.md:128: 절대 시간 감소폭은 쿼리당 0.23 ms와 0.09 ms다. …
```

| 서류/1차 분석 수치 | 저장소 문서 |
|---|---|
| **985배 (2,955→3 버퍼)** | **없음.** `:171`에 "인덱스 없음" 쪽 원자료(`Seq Scan`·버퍼 2,955·폐기 행 26,076)만 있고 **대조군(인덱스 있음) 행이 없어 배수가 문서에서 계산되지 않습니다** |
| **148배 / 4.008 ms** | **없음.** 문서의 합성 쿼리 실행시간은 3.051 ms(`rawDocumentId`) / 2.874 ms(`policyId`) |
| **0.23 ms · 0.09 ms** | **있음** (`:128`) |
| "잠재 비용이지 실현 비용이 아니다" | **있음** (`:165-167`) |
| 35.0배 / 33.3배 / 13.3배 / 7.6배 (실제 적용한 두 인덱스) | **있음** (`:123-126`) |

### ★ 985배의 출처 — 커밋되지 않는 `TASKS.md`

저장소 루트의 `TASKS.md`(10,835자)에 그 수치가 있습니다. **이 파일은 git에 커밋된 적이 없습니다.**

```
$ git log --all -- TASKS.md          → (빈 출력)
$ git check-ignore -v TASKS.md
.git/info/exclude:8:TASKS.md    TASKS.md
$ cat .git/info/exclude | tail -1
TASKS.md
```

파일 헤더: `<!-- 2026.08 작성 · 대상 저장소 bengo · 작업자 Claude Code -->`
파일 스스로가 그렇게 지시하고 있고, 실제로 그대로 됐습니다:
> ⚠️ **이 파일은 저장소에 커밋하지 않는다.**
> `.gitignore`가 아니라 `.git/info/exclude`로 제외한다
> (`.gitignore`는 변경 자체가 커밋되면서 이 파일의 존재가 히스토리에 남는다).

그 안의 "전제 — 이전 조사에서 확인된 사실" 표에 대조군이 있습니다:
```
| FK 1행 조회 실측 | 인덱스 없음 **2,955 버퍼 / 4.008 ms** → 있음 **3 버퍼 / 0.027 ms** |
```

**즉 985배·148배는 2026.08 작업의 *입력*(선행 조사 결과)이었지 *산출물*이 아니었고, 저장소에 남긴 문서(`FK_INDEX_MEASUREMENT.md`)에는 그 대조군을 옮기지 않았습니다.** 저장소만 열어보는 사람은 2,955 버퍼라는 한쪽 값만 볼 수 있고, 985라는 배수는 문서에서 계산되지 않습니다. GATE 3에서 그 대조군을 실제로 다시 재서 재현했습니다(§3 참조).

### 수치 인용 시 반드시 병기할 내역

| 수치 | 정확한 값 | 반드시 함께 적을 것 | 측정 명령 |
|---|---|---|---|
| **백엔드 커밋** | **28** | **[팀] 26 + [단독] 2**. 28개 전부 본인, 타인 커밋 0건 | `git log --no-merges --format='%H' -- backend \| wc -l` |
| 전체 커밋 | 70 (머지 포함) / 42 (머지 제외) | 프론트 12 + 초기화 1 포함 | `git log --oneline \| wc -l` |
| **백엔드 줄 수** | **`src/**/*.ts` = 10,611** | **실코드(공백·주석 제외) 8,683 / 테스트 566 / 락파일 10,888은 별도** | 아래 표 |
| 엔드포인트 | 32 | 그중 **파이프라인 11개 무인증**, `GET /health` 1개 포함 | 컨트롤러 4개 데코레이터 카운트 |
| 모듈 | 9 (`*.module.ts` 파일 수) | 그중 `app`·`database`·`config/redis` 3개는 인프라 모듈 | `git ls-files -- 'src/**/*.module.ts'` |
| 테스트 | **39 (실행 결과)** | **`npm test` 하나로는 34개만 실행.** 전부 최종 커밋에서 일괄 추가, DB·Redis 미접속 | `npm test` + `npm run test:e2e` |
| 오버라이드 | **30 (배열 항목)** | **유니크 code 29 / 죽은 설정 1건.** "31"은 정적 grep 값 | 실행 카운트, §3-A |
| **985배** | **버퍼 2,955 → 3 = 985.0배** | **버퍼 기준이고 결정적**(= 힙 페이지 2,955 ÷ 3). **시간 배수는 결정적이지 않음** — 1차 148배, 재현 81.8배 | §3 |
| 148배 (시간) | **재현 안 됨** | 재현값 **81.8배** (3.026 ms → 0.037 ms, 5회 중앙값) | §3, §6 |
| 활성 정책 | 723 (전체 743, 비활성 20) | `regenerate-rules?force=true` 1회 = 최대 723회 LLM 호출 | 실 DB 복제본 조회 |
| 공공데이터 소스 | 구현 6종 | **API 5 + HTML 크롤러 1**, 배치 기본 실행은 **5종**(`MVP_DEFAULT_BATCH_SOURCES`) | 컬렉터 파일 + 상수 |

**줄 수 상세** — 전부 `git ls-files` 기준이며 `node_modules`·`dist`는 애초에 포함되지 않습니다.

| 대상 | 줄 수 | 명령 |
|---|---|---|
| 백엔드 추적 파일 전체 | 23,059 | `git ls-files -- . \| xargs wc -l` |
| ↳ **`package-lock.json`(락파일)** | **10,888** | `wc -l package-lock.json` |
| 락파일 제외 전체 | 12,171 | 위 두 값의 차 |
| `.ts` 전부 (src + test) | 10,688 | `git ls-files \| grep '\.ts$' \| xargs wc -l` |
| **`src/**/*.ts` (spec 포함)** | **10,611** | `git ls-files -- src \| grep '\.ts$' \| xargs wc -l` |
| `src/**/*.ts` (spec 제외) | 10,122 | 〃 `grep -v '\.spec\.ts$'` |
| 테스트 코드 (src spec 489 + e2e 77) | 566 | |
| **공백·주석 제외 `src` 실코드** | **8,683** | `… \| xargs cat \| grep -vE '^\s*$' \| grep -vE '^\s*(//\|/\*\|\*)' \| wc -l` |

※ 1차 분석의 10,607줄과 `src/**/*.ts` 10,611줄 사이에 **4줄 차이**가 있습니다. 원인은 특정하지 못했습니다.

---

## 3. 1차 분석 항목의 현재 상태

### ★ 985배 실측 재현 — **재현됨. 버퍼 배수는 985.0배로 정확히 일치**

**작업 방법 (원본 무변경 절차)**

| 단계 | 명령 | 결과 |
|---|---|---|
| 원본 확인 | `docker inspect bengo-postgres` | `exited`, 익명 볼륨 `97d0155c…` |
| 복제 | `docker run --rm -v 97d0155c…:/src:ro -v bengo-repro-vol:/dst alpine cp -a /src/. /dst/` | **원본은 `:ro`로만 마운트.** 331.2M |
| 기동 | `docker run -d --name bengo-repro-pg -v bengo-repro-vol:/var/lib/postgresql/data postgres:16` | 호스트 포트 미바인딩 |
| 정리 | `docker rm -f bengo-repro-pg` · `docker volume rm bengo-repro-vol` | 제거 완료 |

원본 무변경 근거: ① 파일 수 1,379 / 용량 331.2M 전후 동일 ② `docker inspect bengo-postgres` → `startedAt=2026-08-22T08:13:23Z`, `restartCount=0` **불변(한 번도 기동 안 함)** ③ 원본 볼륨을 항상 `:ro`로만 마운트(도커가 강제).
※ 파일 단위 md5 지문 대조는 alpine의 busybox `find`에 `-printf`가 없어 **실패했습니다**(빈 문자열의 md5가 나옴). 위 세 가지가 무변경 근거의 전부입니다.

복제본 행 수는 1차 분석과 정확히 일치: `policies` 743 / `policy_rules` 677 / `policy_requirements` 2,766 / `raw_policy_documents` 26,079 / `pipeline_ingestion_runs` 26,077 / `users` 3 / `user_policy_states` 0 / `eligibility_checks` 0 / `oauth_accounts` 2.

**측정 조건** — PostgreSQL 16.11, `work_mem=4MB`, `effective_cache_size=4GB`, `random_page_cost=4`, `seq_page_cost=1`, `max_parallel_workers_per_gather=2`, `enable_seqscan=on`. 5회 실행, 매회 직전 `ANALYZE`. 인덱스는 트랜잭션 안에서 생성 후 `ROLLBACK`.
**파라미터 결정적 선정** — `SELECT "rawDocumentId" FROM pipeline_ingestion_runs GROUP BY 1 HAVING count(*)=1 ORDER BY 1 LIMIT 1` → `00002b0e-d34b-4401-8d7e-f2baa474e8ae` (매칭 1행, 선택도 0.0038%).

| | 인덱스 없음 | 인덱스 있음 (tx 내 생성 → 롤백) |
|---|---|---|
| 계획 노드 | `Seq Scan` | `Index Scan using tmp_idx_pir_rawdoc` |
| **버퍼** | **2,955** (5회 전부 동일) | **3** (`shared hit=1 read=2`, 5회 전부 동일) |
| 실행 시간 5회 원시값 | 3.149 / 3.128 / 2.929 / 3.026 / 2.939 | 0.037 / 0.032 / 0.057 / 0.033 / 0.038 |
| **중앙값** | **3.026 ms** | **0.037 ms** |
| 폐기 행 | 26,076 | 0 |
| 추정 비용 | `cost=0.00..3280.96` | `cost=0.29..8.30` |

| | 1차 분석(2026.08) | 이번 재현 | 판정 |
|---|---|---|---|
| **버퍼** | 2,955 → 3 = **985배** | 2,955 → 3 = **985.0배** | **정확히 재현** |
| 실행 시간 | 4.008 → 0.027 ms = 148배 | 3.026 → 0.037 ms = **81.8배** | **재현 안 됨(값 다름)** |

**버퍼 배수가 결정적인 이유를 실측했습니다.** 힙 페이지 수를 직접 셌더니 **2,955**입니다.
```
         relname         | n_live_tup |  heap  | heap_pages
-------------------------+------------+--------+------------
 pipeline_ingestion_runs |      26077 | 23 MB  |       2955
 raw_policy_documents    |          — | 30 MB  |       3852
 policy_requirements     |       2766 | 840 kB |        105
 policy_rules            |        677 | 800 kB |        100
```
985 = 2,955 ÷ 3. `FK_INDEX_MEASUREMENT.md:128-130`의 *"배수는 테이블 크기를 따라간다"* 가 그대로 성립합니다. **버퍼 배수는 기계 상태와 무관한 결정적 값이고, 시간 배수는 그렇지 않습니다.**

롤백 확인: `SELECT indexname FROM pg_indexes WHERE tablename='pipeline_ingestion_runs';` → `PK_8b0fff42ecd539d1f3d2d4bba9c` 만 (tmp 인덱스 없음).

### 통제 실험(선택도) 재현 + 1차 분석이 못 본 전환점

같은 테이블(`raw_policy_documents` 26,079행)·같은 인덱스에서 **조회 값만** 바꿈. 각 3회, 중앙값.

| `source` 값 | 행 수 | 선택도 | 계획 (무→유) | 버퍼 (무→유) | 시간 (무→유) | 버퍼 배수 |
|---|---|---|---|---|---|---|
| `youth-seoul` | 2,184 | **8.37%** | Seq → **Bitmap** | 3,852 → **411** | 4.027 → 0.485 ms | **9.4배** |
| `bokjiro-local` | 2,522 | 9.67% | Seq → **Bitmap** | 3,852 → 599 | 3.683 → 0.588 ms | 6.4배 |
| `bokjiro-central` | 3,173 | 12.16% | Seq → **Bitmap** | 3,852 → 724 | 3.779 → 0.726 ms | 5.3배 |
| `youthcenter-policy` | 6,328 | **24.26%** | **Seq → Seq (전환 없음)** | 3,852 → 3,852 | 4.003 → 4.165 ms | 1.0배 |
| `data-go-kr` | 11,872 | 45.52% | **Seq → Seq (전환 없음)** | 3,852 → 3,852 | 4.445 → 4.092 ms | 1.0배 |

- 1차 분석의 **8.4% → 411버퍼**가 **버퍼 단위까지 정확히 재현**(407 heap + 4 index = 411). "원문 문서 소스 컬럼은 희소 값에서만 9.4배"도 3,852÷411 = 9.37로 일치.
- 45.5% 전환 없음도 재현.
- **새로 확인 — 전환점이 12.16%와 24.26% 사이에 있습니다.** 1차 분석은 8.4%·45.5% 두 점만 봐서 이 구간을 몰랐습니다.

### 나머지 항목

| 항목 | 판정 | 근거 |
|---|---|---|
| **파이프라인 11개 무인증** | **그대로 (11 실측)** | `pipeline.controller.ts` `@UseGuards` **0**, endpoints **11**. `auth` 6/12, `policies` 6/8. `main.ts`·`app.module.ts`에 `APP_GUARD`·`useGlobalGuards` 0건 |
| **규칙 재생성 = 호출 1회로 전체 정책 LLM** | **그대로. 비용 직접 발생 구조 맞음** | `pipeline.controller.ts:159-169` → `regenerateAll(force)`. `:173-183` `clearLlmArtifacts()`가 해시 스킵 무력화. **실 DB 활성 정책 723건** |
| **규칙 트리 fail-open · 재귀 깊이 제한 없음** | **그대로** | `eligibility.service.ts:242-246` 미매칭 노드는 `{passed:true}`. `depth`/`maxDepth`/`MAX_DEPTH` 소스 전체 0건 |
| **마이그레이션 미적용** | **그대로 (실 DB 전 항목 재확인)** | 아래 표 |
| **`isPolicyInMvpScope` 무력화** | **그대로 (104조합 전수)** | 아래 |
| **`verifiable` 강제 덮어쓰기** | **그대로 + 범위가 더 넓음** | 아래 |
| **검증 실패 조건 조용히 드롭** | **그대로 + 우회 경로 실증** | 아래 |
| **LLM timeout·백오프·429·비용 상한 없음** | **그대로** | `grep 'timeout\|maxRetries\|retry\|backoff\|429\|rate\|limit\|budget\|cost' llm-rule-extractor.service.ts` → **0건**. `new Anthropic({ apiKey })` 옵션 없음(`:273`), 단일 catch(`:327-332`) |
| **파이프라인 동시 실행 방지 없음** | **그대로** | `lock`/`mutex`/`semaphore`/`isRunning`/`inProgress`/`advisory` 전수 → 동시성 제어 코드 **0건** |
| **오버라이드 31건** | **수치 다름 → 30건(유니크 29)** | §3-A |
| **테스트 39개 / `npm test` 34개** | **그대로** | §1-5 |

**마이그레이션 미적용 — 실 DB 복제본 재확인**

| 확인 항목 | 결과 |
|---|---|
| `migrations`/`typeorm_metadata`/`schema_migrations`/`flyway_schema_history` | **0 rows** |
| `0001_init.sql` 선언 인덱스 6개의 실재 | **6행 전부 NULL** |
| `idx_` 접두사 인덱스 개수 | **0** |
| 테이블 수 | 파일 9 (`CREATE TABLE`) vs 실 DB **10** |
| enum 타입 수 | 파일 7 (`CREATE TYPE`) vs 실 DB **12** |
| 지역 enum 라벨 | 파일 **3** (`region_code_enum`: seoul_gangnam/mapo/songpa) vs 실 DB **26** |
| 카테고리 enum 라벨 | 파일 **2** vs 실 DB **4** |
| `policies` 컬럼 수 | 실 DB **24** |

**`isPolicyInMvpScope` 무력화 — 실행 전수**
```
InterestCategory enum 원소 = 4      MVP_ALLOWED_CATEGORIES = 4
카테고리 허용목록 == enum 전체 ?  true
RegionCode enum 원소 = 26           MVP_ALLOWED_REGIONS = ['seoul']
RegionCode 전원이 'seoul'로 시작 ?  true  | 아닌 것 = []
MVP_EXCLUDED_SOURCES = []  length = 0

조합 4 x 26 = 104,  inScope=true 개수 = 104
통과하지 못한 조합 = (없음)
배치 소스 5종 x 전 조합 : 520개 중 520개 통과
```
실질 의미가 빈 배열 검사임도 실행 확인:
```
categories=[], regions=[SEOUL]        -> inScope:false  "MVP 카테고리 불일치"
categories=[YOUTH], regions=[]        -> inScope:false  "MVP 지역(서울) 불일치"
categories=[YOUTH], regions=['busan'] -> inScope:false  "MVP 지역(서울) 불일치"
```

**`verifiable` 강제 덮어쓰기 — `validateCondition` 직접 호출**
```
SELECT   + verifiable:false                 -> verifiable=true   ← 덮어씀
NUMBER   + verifiable:false                 -> verifiable=true   ← 덮어씀
BOOLEAN  + verifiable:false                 -> verifiable=true   ← 덮어씀
STRING op '='        + verifiable:false     -> verifiable=true   ← 덮어씀 (1차 분석에 없던 경로)
STRING op 'contains' + verifiable:false     -> verifiable=false  ← 유일하게 존중됨
STRING op 'contains' + key=housingStatus    -> verifiable=true   ← alwaysVerifiableKeys로 덮어씀
```
`:549-556`의 `stringWithDirectOp` 때문에 STRING + `=`/`!=`/`in` 도 강제 true입니다. **LLM의 `verifiable:false`가 살아남는 경우는 "STRING 타입 + `>`,`>=`,`<`,`<=`,`contains` + `alwaysVerifiableKeys` 11개에 없는 key" 뿐입니다.**

**검증 실패 조건의 조용한 드롭 — `parseResponse` 직접 호출**
```
입력 조건 6개 -> 채택된 조건 = 2 (ok1, ok2)
드롭 = 4건
반환 객체 키 = conditions, root, conditionalHints, summary, detectedAge, policyType, detectedPeriod, targetDescription
```
드롭 수를 담는 필드가 없고, `validateCondition`이 `null`을 반환하는 6개 지점(`:487,497,508,510,513,516`) 어디에도 로그가 없습니다. 재시도도 없습니다.

---

## 3-A. ★ 1차 분석 정정 4건

1차 분석(`면접준비_04_Bengo.md`)에 적힌 것 중 이번 재확인에서 **사실과 다른 것**으로 확인된 항목입니다.

### 정정 ① 오버라이드 **31건 → 실제 30건 (유니크 code 29건, 죽은 설정 1건)**

1차 분석 3장: *"⚠️ 오버라이드는 31건 · 내역: `overrideRule` 16 / `policyType` 7 / `appendConditionalHints` 7 / `disableRule` 6 / `regionCodes` 3"*

```
$ npx ts-node …   (POLICY_MANUAL_OVERRIDES 를 직접 로드)
배열 길이 = 30
code 개수 = 30 | 유니크 = 29
중복 code = ['youthcenter-policy-미취업-청년-어학-및-자격증-응시료-지원성북구']   ← 454행, 880행
```

**"31"이 나온 이유를 특정했습니다.**
```
$ grep -cE '^\s+code:' policy-manual-overrides.constant.ts   = 31
배열 실제 항목 수 (실행)                                      = 30
```
31번째 `code:` 는 배열 원소가 아니라 **`PolicyManualOverride` 인터페이스의 `code: string;` 선언**입니다. 지시서 절대규칙 2가 경고한 정적 카운트 오차가 실제로 발생한 사례입니다.

| 필드 | 1차 분석 | 실행 결과 |
|---|---|---|
| `overrideRule` | 16 | **16** ✓ |
| `policyType` | 7 | **7** ✓ |
| `appendConditionalHints` | 7 | **7** ✓ |
| `regionCodes` | 3 | **3** ✓ |
| `disableRule` | **6** | **5** ✗ |
| `minAge` / `maxAge` / `conditionalHints` | (미기재) | 5 / 8 / 1 |

**그리고 조회가 `POLICY_MANUAL_OVERRIDES.find((o) => o.code === code)`(`:912`)라 먼저 나온 항목이 이깁니다.** 중복 code 중 뒤쪽(880행, `appendConditionalHints` + `overrideRule` 지정)은 **절대 적용되지 않는 죽은 설정**입니다. 앞쪽(454행)은 `appendConditionalHints`만 지정하므로 의도한 `overrideRule`이 적용되지 않고 있습니다. → **실효 오버라이드 29건.**

### 정정 ② **`synchronize: true` 라는 코드는 존재하지 않습니다**

1차 분석 5-4: *"TypeORM `synchronize` — ✅ **확인 완료: `true`입니다.**"* / 7장 표: *"TypeORM `synchronize` 확인 · ✅ `true`"*

```ts
// backend/src/database/database.module.ts:19  — 최초 커밋 918e959부터 단 한 번도 안 바뀜
synchronize: configService.get<boolean>('POSTGRES_SYNC', false),
```
```
$ grep -n 'POSTGRES_SYNC' backend/.env.example      (추적됨)
16:POSTGRES_SYNC=false   # 프로덕션에서는 반드시 false (마이그레이션 사용)
$ grep -n 'POSTGRES_SYNC' backend/.env              (추적 안 됨, gitignore)
9:POSTGRES_SYNC=true # 프로덕션 단계에서는 무조건 false로!
$ git log --all --format='%h' -- backend/src/database/database.module.ts
918e959                                              ← 이 파일은 첫 커밋 이후 수정 0회
```
**코드 기본값도 `false`, 커밋된 예시 파일도 `false`이고, `true`인 것은 git이 추적하지 않는 로컬 `.env` 한 줄뿐입니다.**
실 스키마가 `synchronize`로 만들어졌다는 **결론 자체는 그대로 성립**합니다(§3 대조표가 증거). 다만 "코드에 `synchronize: true`라고 적혀 있다"는 서술은 사실과 다릅니다. 저장소를 클론한 사람이 `.env.example`을 복사해 그대로 실행하면 `synchronize`는 꺼지고, 스키마를 만들 것이 아무것도 없게 됩니다.

### 정정 ③ **시간 배수 148배는 재현되지 않습니다 (재현값 81.8배)**

1차 분석 4-4④: *"실행 시간 4.008 ms → **0.027 ms (148배)**"*

동일 조건(실 DB 복제본, 트랜잭션 내 인덱스 생성 후 롤백, 5회 중앙값)에서:
```
인덱스 없음: 3.149 / 3.128 / 2.929 / 3.026 / 2.939  → 중앙값 3.026 ms
인덱스 있음: 0.037 / 0.032 / 0.057 / 0.033 / 0.038  → 중앙값 0.037 ms
→ 81.8배
```
**버퍼 배수(985.0)는 정확히 재현됐고 시간 배수만 재현되지 않았습니다.** 버퍼는 힙 페이지 수(2,955)로 결정되는 값이라 기계 상태와 무관하고, 실행 시간은 그렇지 않기 때문입니다. `FK_INDEX_MEASUREMENT.md:128-130`이 이미 이 성질을 적어두었습니다.

### 정정 ④ **"트랜잭션이 아예 없다"는 틀립니다 — `users.service.ts` 2곳에 있습니다**

1차 분석 4-2: *"파이프라인 전체에 `DataSource.transaction()`이 **0개**입니다."* → **맞습니다.**
같은 절의 보너스: *"신중히 설계해서가 아니라 **트랜잭션이 아예 없기 때문**입니다."* → **틀립니다.**

```
$ grep -rn 'DataSource|\.transaction\(' backend/src --include='*.ts' | grep -v spec
users/users.service.ts:5    import { DataSource, Repository } from 'typeorm';
users/users.service.ts:20   private readonly dataSource: DataSource,
users/users.service.ts:44   return this.dataSource.transaction(async (manager) => {   ← 회원가입: User + UserProfile
users/users.service.ts:139  return this.dataSource.transaction(async (manager) => {   ← OAuth 가입: User + OAuthAccount
```
**트랜잭션은 2곳에 있고, 둘 다 "두 행이 함께 생겨야 하는" 지점에 정확히 걸려 있습니다.** 트랜잭션을 쓸 줄 알았고 필요한 곳을 판단했는데 파이프라인에만 안 붙인 것입니다. **가드가 `policies`·`auth`에 6개씩 있고 `pipeline`에만 0개인 것과 정확히 같은 모양**입니다.

---

## 4. 새로 발견한 것

심각도는 매기지 않았습니다.

### 4-1. 인증·인가

| # | 내용 | 파일:줄 | 구간 |
|---|---|---|---|
| a | **`POST /auth/resend-verification`이 인증 없이 임의 이메일로 메일 발송을 트리거**합니다. 60초 쿨다운이 **이메일 주소별**이라 주소를 바꾸면 무제한. 응답 문구가 고정이라 계정 열거는 막혀 있으나 제3자 주소로 메일을 보내게 하는 경로는 열려 있습니다. rate limiting 부재와 결합 | `auth/auth.controller.ts:85-91` | [팀] |
| b | **OAuth `state`를 생성만 하고 검증하지 않습니다.** 네이버 로그인 시작에서 `randomBytes(16)`으로 `state`를 만들어 붙이지만 **저장·비교하는 코드가 없습니다.** 콜백은 `NaverAuthGuard`만 통과시킵니다. 구글 쪽은 `state` 자체가 없습니다 → OAuth 콜백 CSRF 미차단. `state`를 넣은 흔적이 있어 **의도는 있었으나 절반만 구현된 곳**입니다 | `auth/auth.controller.ts:180` / 콜백 `:164-170`, `:188-193` | [팀] |
| c | **Swagger `/docs`가 환경 구분 없이 항상 노출**됩니다. `NODE_ENV` 분기 없이 `SwaggerModule.setup('docs', …)`. 무인증 파이프라인 11개를 포함한 32개 명세가 공개됩니다 | `main.ts:29-30` | [팀] |
| d | **일반 사용자 API에 IDOR은 없습니다 (전수 확인).** `policies.controller.ts` 8개, `auth.controller.ts` 인증 4개 전부 `@CurrentUser()`의 `user.sub`만 사용. 본문·경로·쿼리에서 `userId`를 받는 엔드포인트 0건 | — | [팀] |

### 4-2. 비밀정보 — 유출 없음. 다만 이름 기반 스캔이 통과할 뻔한 파일이 있었습니다

**전 리비전(70개) × 전 파일, 파일명 무관 `KEY=VALUE` 스캔:**
```
$ for c in $(git rev-list --all); do
    git grep -I -n -E '^[[:space:]]*(export[[:space:]]+)?[A-Z][A-Z0-9_]{3,}=[^[:space:]#]{6,}' $c \
      -- ':!*package-lock.json' ':!frontend/src/styles/*'
  done | sort -u
```
값이 들어간 곳은 **`backend/.env.example`(플레이스홀더)** 와 **`backend/scripts/db-*.sh`(변수 참조 `${POSTGRES_PASSWORD}`)** 뿐입니다.
```
$ … git grep -E '(AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9_-]{20,}|ghp_…|xox[baprs]-|BEGIN PRIVATE KEY|eyJ…)'   → 0건
```

**`ANTHROPIC_API_KEY` 이력 추적:**
```
$ git log --all -S'ANTHROPIC_API_KEY' --format='%ad %h %s' --date=short --reverse
2026-03-06 918e959 지금까지 한 것들 싹 다 push(backend)
2026-07-01 8464b3d 최종본
$ git grep -l 'ANTHROPIC_API_KEY' 918e959 → env.validation.ts, llm-rule-extractor.service.ts
$ git grep -l 'ANTHROPIC_API_KEY' 8464b3d → 위 2개 + .env.example (키 이름만)
```
**전부 변수 이름으로만 등장합니다. 실제 키 값이 커밋된 적은 없습니다.** 다른 키 9종(`DATA_GO_KR_API_KEY`, `BOKJIRO_API_KEY`, `YOUTHCENTER_POLICY_API_KEY`, `SEOUL_OPEN_API_KEY`, `JWT_SECRET`, `SMTP_PASS`, `GOOGLE_CLIENT_SECRET`, `NAVER_CLIENT_SECRET`, `POSTGRES_PASSWORD`)도 동일했습니다.

**★ 확장자 무시 스캔에서 `temp.txt`가 걸렸습니다** — 7개 리비전 전부 내용을 확인했고 **비밀정보는 없습니다.** 팀원용 운영 안내문입니다(§5-2에서 상술).

**`backend/.env`는 디스크에 실제 키를 담고 있으나 한 번도 추적된 적이 없습니다.**
```
$ git check-ignore -v backend/.env                → .gitignore:69:.env
$ git log --all --diff-filter=A --pretty=format: --name-only | sort -u | grep -E '\.env'
backend/.env.example        ← 이것뿐
```

### 4-3. N+1 — 없습니다. 대신 그 자리에 전량 로드가 있습니다

**실제 발행 SQL을 세었습니다** (실 데이터 복제본 + TypeORM `DataSource` + 커스텀 로거로 쿼리 카운트).

| 호출 지점 | 발행 SQL | 결과 |
|---|---|---|
| `policies.service.ts:44` `find({where:{status:ACTIVE}})` | **1** | 723행 |
| `policies.service.ts:121` `find({relations:['requirements']})` | **1** | 723 정책 + 2,766 requirements |
| `policies.service.ts:246` `findOne({relations:['requirements','rules']})` | **2** (`SELECT DISTINCT id` + JOIN) | 1건 |
| `policies.service.ts:440` `find({relations:['policy']})` | **1** | — |
| `users.service.ts:204` `findOne({relations:['profile']})` | **2** (동일 패턴) | 1건 |

`relations` 로딩은 전부 `LEFT JOIN` 한 방입니다. `findOne`의 2개는 TypeORM이 join+limit 조합에 쓰는 고정 2단계이며 **행 수에 비례하지 않는 상수**입니다. 관계를 루프에서 재조회하는 코드는 없습니다. → **요청 경로에 N+1 없음.**

**대신 페이징이 한 곳도 없습니다.**
```
$ grep -rnE '\btake\b|\bskip\b|\.limit\(|\.offset\(|LIMIT' backend/src --include='*.ts'
config/env.validation.ts:35   BOKJIRO_ENRICH_LIMIT?: number;            ← 무관
policy-requirement-generator.service.ts:62  '…hash-based skip mode…'    ← 문자열
bokjiro-*.collector.ts        BOKJIRO_ENRICH_LIMIT 읽기                 ← 무관
```
**리포지터리 호출에 `take`/`skip`이 붙은 곳이 0건**이고, 목록 API는 예외 없이 전량 로드 후 JS에서 `filter`/`sort`/`map` 합니다(`policies.service.ts:48-84`, `:129-…`).

**전량 로드의 크기 — 그중 78%는 응답에 쓰이지 않습니다.**

| | 크기 |
|---|---|
| `GET /policies` 1회(캐시 미스)가 DB에서 끌어오는 양 | **2,611 kB** (723행) |
| `GET /policies/recommended` (= policies + requirements) | **3,403 kB** |
| 그중 **응답에 실제로 쓰이는 컬럼** (`id,code,title,shortDescription,providerName,categories,regionCodes`) | **308 kB** |
| 로드만 되고 버려지는 `description` | 544 kB |
| 로드만 되고 버려지는 `extraMeta` | **1,501 kB** |

`listPoliciesPublic`의 응답 매핑(`:88-105`)은 `description`·`extraMeta`를 쓰지 않는데 엔티티 전체를 select합니다.

**배치 경로에는 반복문 안 쿼리가 있습니다(요청 경로 아님).** `policy-requirement-generator.service.ts:81` 루프가 정책 1건마다 `generateForPolicy`를 호출하고, 그 안에서 `requirementRepository.count`(`:120`)와 `ruleRepository.findOne`(`:287`)이 실행됩니다 → **활성 723건 × 최소 2쿼리 = 1,446쿼리 이상**이 무인증 POST 한 번에 나갑니다. `:210` 중복 제거 루프도 건당 `save`입니다.

### 4-4. 동시성 — "중복이 곧 손해"인 경로

| 경로 | DB 최종 방어선 | 판정 |
|---|---|---|
| `updateUserPolicyState` (`policies.service.ts:406-422`) `findOne` → `create({id: current?.id})` → `save` | `IDX_a40e48ba4e54e1b76bf968d986` **UNIQUE (userId, policyId)** 존재 | TOCTOU이지만 **유니크 인덱스가 중복 행을 막습니다** |
| 정책 title 중복 제거 (`pipeline-ingestion.service.ts:246`) `findOne({title})` → `save` | `policies` 제약은 `PRIMARY KEY(id)` + `UNIQUE(code)` **뿐 — title 유니크 없음** | **진짜 TOCTOU. 막는 것이 없습니다** |
| `regenerate-rules` 동시 호출 | 없음 | LLM 중복 호출 |

```
$ SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='policies'::regclass;
 PK_603e09f183df0108d8695c57e28 | PRIMARY KEY (id)
 UQ_3c259f680659c66b13087cc85ae | UNIQUE (code)
```

### 4-5. 에러 처리 — 응답으로 새는 내부 정보는 찾지 못했습니다

전역 예외 필터가 없어 NestJS 기본 동작을 씁니다(`@Catch`/`useGlobalFilters` 0건). 에러 메시지를 응답에 담는 경로 11곳을 전부 따라갔습니다.

- `pipeline.controller.ts:123`, `pipeline-collection.service.ts:130-142`가 실패 사유를 HTTP 응답에 넣습니다. 그 출처인 `collector.utils.ts:161-195` `fetchJson`은:
  ```ts
  if (!response.ok) throw new BadGatewayException(`수집 API 호출 실패: ${response.status} ${response.statusText}`);
  …
  catch (error) { if (error instanceof BadGatewayException) throw error;
                  throw new BadGatewayException('수집 API 요청 중 오류가 발생했습니다.'); }
  ```
  **URL이 메시지에 들어가지 않습니다.** `data-go-kr.collector.ts:61`이 API 키를 쿼리스트링에 붙이지만 그 URL이 예외 메시지로 새는 경로는 없습니다. 스택도 응답에 나가지 않습니다.
- 부수 확인: **`fetchJson`에는 `AbortController` 기반 20초 타임아웃이 있습니다**(`:162-163`). **외부 공공 API에는 타임아웃을 걸었고 LLM 호출에만 안 걸었습니다.**
- 개인정보: 로그에 `user.email`이 들어가는 곳이 `auth.service.ts:163`, `email.service.ts:44` 두 곳이나 둘 다 메일 발송 실패 시 서버 로그이며 응답으로 나가지 않습니다.

### 4-6. 입력 검증

- **LLM 프롬프트로 사용자 입력이 들어가는 경로는 없습니다.** 프롬프트는 `buildUserMessage`(`llm-rule-extractor.service.ts:335-369`)가 `normalized.title/description/extraMeta`로만 만들고, 이는 수집된 정책 원문입니다. → 프롬프트 인젝션 노출면은 외부 공공데이터뿐.
- **SQL로 들어가는 사용자 입력은 전부 TypeORM 파라미터 바인딩**입니다. `.query(` 원시 SQL 0건.
- `PublicListPoliciesQueryDto.search`는 `@IsOptional() @IsString()` 뿐 — **길이 제한이 없습니다.** `GET /policies`는 무인증·무제한이고 캐시 키가 `policies:public:${JSON.stringify(query)}`(`policies.service.ts:37`)라 **`?search=` 값마다 별개 Redis 키가 TTL 120초로 생성**됩니다. 응답 1건이 수백 kB입니다.
- `CheckEligibilityDto.answers`는 `@IsObject()` 하나뿐입니다. 키·값·크기 제한 없이 `eligibility_checks.inputAnswers` jsonb에 저장됩니다(`policies.service.ts:373`).

### 4-7. ★ "선언은 있는데 실행되지 않는 설정" 전수

| # | 무엇 | 근거 | 구간 |
|---|---|---|---|
| 1 | **오버라이드 중복 `code`** — 30개 중 2개가 같은 code, `find()`가 앞것만 반환. 뒤것의 `overrideRule`은 영영 적용 안 됨 | `policy-manual-overrides.constant.ts:454, 880` / 조회 `:912` | [팀] |
| 2 | **`MVP_EXCLUDED_SOURCES = []`** — `includes`가 항상 false. 소스 제외 검사가 죽어 있음 | `mvp-policy-scope.constant.ts:14, 35` | [팀] |
| 3 | **`0001_init.sql`** — 한 번도 적용된 적 없음. 선언 인덱스 6개 실재 0개 | §3 | [팀] → [단독]에서 주석 표시 |
| 4 | **`YOUTHCENTER_CENTER_*` 환경변수 10개** — `.env`에 실제 API 키까지 있는데 **코드 참조 0건, `env.validation.ts` 선언 0건**. 원인은 §5-2 (컬렉터가 최종본에서 삭제됨) | `grep -rn 'YOUTHCENTER_CENTER' backend/src` → 0건 | [팀] |
| 5 | **`POSTGRES_SYNC`** — 코드 기본값 `false`, 커밋된 `.env.example`도 `false`, 동작을 결정하는 `true`는 추적되지 않는 `.env` 한 줄 | §3-A ② | [팀] |

부수 확인 — `MVP_DEFAULT_BATCH_SOURCES`는 5종이고 등록된 컬렉터는 6종(`pipeline-collection.service.ts:47-60`)이라 **`seoul-open-api`가 배치에서 빠져 있습니다.**

### 4-8. `validateRuleNode` 우회 — 차단된 key가 다른 문으로 들어옵니다

`validateCondition`(`:500-510`)에는 금지 key 집합과 `/residen|거주|지역/` 정규식이 있는데 **`validateRuleNode`(`:654-664`)에는 없습니다.** `conditions`에서 차단되는 `residenceRegion`을 `root` 안에 넣고 실행한 결과:
```
root       = {"all":[{"fact":"answers.residenceRegion","op":"=","value":"서울",…,"verifiable":true}]}
conditions = [{"key":"residenceRegion", … "verifiable":true}]     ← :444-466 자동 보완으로 되살아남
```
**`root`로 들어온 fact가 `:444-466`의 자동 보완 로직을 타고 `conditions`에 추가됩니다.** 1차 분석 2-3 표의 "검증하지 않는 것: `validateRuleNode`의 금지 key 차단"이 실제 우회로 성립하는 것을 실행으로 확인했습니다.

### 4-9. ★ 테스트가 무력화를 정답으로 고정했습니다

`mvp-policy-scope.constant.spec.ts`(`8464b3d`에서 추가)의 "범위 밖" 검증 두 개:
```ts
it('허용 카테고리가 없으면 범위 밖', () => {
  evaluateMvpScope('youth-seoul', [], [RegionCode.SEOUL])          // 빈 배열
});
it('서울 지역이 아니면 범위 밖', () => {
  evaluateMvpScope('youth-seoul', [InterestCategory.YOUTH], ['busan' as RegionCode])
                                                              //  ↑ RegionCode enum에 없는 값
});
```
**"범위 밖"으로 고른 입력 두 개가 모두 enum 밖의 값입니다.** enum 안의 실제 값으로는 104조합 전부 통과하는데 테스트는 그 조합을 하나도 검사하지 않습니다. 테스트가 사후 작성이라 **이미 무력화된 동작을 통과 상태로 고정**했습니다.

---

## 5. 개발 과정에서 있었던 일

### 5-1. 커밋 이력에서

**커밋 메시지의 성격 — [팀] 26개 중 본문(`%b`)이 있는 것 0개**

```
2026-03-06 918e959  지금까지 한 것들 싹 다 push(backend)   77 files, 15555 insertions(+)
2026-03-10 b956bce  백엔드 목표치까지 MVP 구현 완료        19 files, 796+/269-
2026-03-13 0399c9d  이슈리스트 사항들 모두 수정            17 files, 488+/69-
2026-03-24 37574b7  예외 케이스 모두 수정                   9 files, 206+/16-
2026-03-30 711e8e0  오류 모두 수정                         12 files, 845+/75-
2026-04-03 a591f8f  예외 케이스 모두 수정                  10 files, 452+/31-
2026-04-23 cc5ba1b  실수로 dev에서 예외 수정을 해서...      4 files, 70+/11-
2026-04-24 b49a24c  사소한 리팩토링                         7 files, 886+/828-
2026-04-27 be7b939  OAuth 및 인증 추가                     24 files, 883+/65-
2026-07-01 8464b3d  최종본                                 44 files, 2147+/961-
2026-08-22 020fef7  docs: 0001_init.sql이 …                 3 files, 158+/1-
2026-08-22 058a1fe  perf(db): 외래키 컬럼 …                 5 files, 376+
```
"예외 케이스 모두 수정"이 4회, "이슈 모두 수정" 계열이 5회 반복됩니다. 무엇을 고쳤는지가 메시지에 없습니다. **[단독]의 두 커밋만 본문이 있고**(148자·120자) 측정 조건·수치·미적용 사유까지 들어 있습니다. **같은 사람의 커밋인데 메시지 규범이 두 구간 사이에서 완전히 바뀌었습니다.**

메시지와 규모가 어긋나는 것 둘 — `b49a24c "사소한 리팩토링"`이 **886+/828-**, `1e682cb "수정 및 전체적인 최적화, 구조 변경"`이 오히려 **108+/161-**(순감소).

**★ 되돌린 것 — 3일 만에 지운 지역 처리 [팀]**
```diff
--- a591f8f (2026-04-03 예외 케이스 모두 수정) ---
+    // regionCode가 boolean(서울 거주 여부)으로 오는 경우 처리
+    if (input.answers.regionCode === true)      effectiveRegion = RegionCode.SEOUL;
+    else if (input.answers.regionCode === false) effectiveRegion = 'non_seoul' as RegionCode;
--- 50cb085 (2026-04-06 백엔드 이슈 수정) ---
-    (위 블록 전부 삭제)
```
LLM이 `regionCode`를 boolean으로 뱉는 경우를 만나 판정 엔진에 존재하지 않는 enum 값(`'non_seoul'`)을 캐스팅해 넣었다가 3일 만에 통째로 되돌렸습니다. 판정 엔진의 유일한 되돌림입니다.

**반복 수정 파일 — 상위 4개가 전부 파이프라인**
```
$ git log --no-merges --name-only --format='' -- backend | sort | uniq -c | sort -rn | head
  19 backend/src/pipeline/policy-requirement-generator.service.ts
  14 backend/src/pipeline/pipeline-ingestion.service.ts
  14 backend/src/pipeline/llm-rule-extractor.service.ts
  12 backend/src/pipeline/policy-normalization.service.ts
  11 backend/src/policies/policies.service.ts
   8 backend/src/eligibility/eligibility.service.ts
```

**삭제된 파일 — 만들었다가 버린 것 [팀]**
```
$ git log --all --diff-filter=D --name-only -- backend
COMMIT 2026-07-01 8464b3d 최종본
  backend/src/pipeline/collectors/mock-seoul.collector.ts
  backend/src/pipeline/collectors/youthcenter-center.collector.ts
COMMIT 2026-03-10 b956bce 백엔드 목표치까지 MVP 구현 완료
  backend/.env.example        ← 이후 다시 추가됨
```
- `mock-seoul.collector.ts` — *"공공 API/크롤링 어댑터 연결 전 개발용 샘플 수집기"*. 하드코딩 샘플 정책. **최초 커밋부터 최종본 직전까지 4개월간 프로바이더로 등록된 채** 있었습니다.
- `youthcenter-center.collector.ts` — 106줄, `sourceName = 'youthcenter-center'`, *"온통청년 청년센터 API 수집기"*. 최초 커밋부터 존재하다 최종본에서 삭제. **§4-7 ④의 `.env` 잔여 설정 10개가 이 컬렉터의 것입니다.**

→ **"6종"은 최종본에서 8종 → 6종으로 정리한 결과입니다.**

**마감 직전에 몰린 커밋** — `8464b3d "최종본"` 한 건에 **44 files / 2,147+ / 961-**. 여기에 **테스트 6개 파일 전부**(4 spec + `jest-e2e.json` + e2e-spec), 컬렉터 2개 삭제, prettier 전면 포매팅이 함께 있습니다.

### 5-1-A. ★ `918e959` "지금까지 한 것들 싹 다 push" 분해

```
$ git show --stat 918e959   →  77 files changed, 15555 insertions(+)
```
15,555줄 중 **9,597줄이 `package-lock.json`**, **1,349줄이 `frontend/test1/`**(프로토타입) → **백엔드 소스 약 4,600줄.**

**이미 완성돼 있던 것:**

| 영역 | 파일 | 줄 | 상태 |
|---|---|---|---|
| **3-state 판정 enum** | `eligibility-result.enum.ts` | 5 | **완성. 이후 한 번도 수정 안 됨** |
| **판정 엔진** | `eligibility.service.ts` | 265 | `all`/`any`/`condition` 재귀 평가, `region_match` 포함 9개 연산자, CONDITIONAL 반환 경로 4개 — **완성** |
| **LLM 추출기** | `llm-rule-extractor.service.ts` | 257 | `SYSTEM_PROMPT`(228줄) + `parseResponse` + `validateCondition`(`excludedKeys` 포함) + `temperature:0` + `max_tokens:2048` — **동작하는 형태로 완성** |
| 규칙 트리 타입 | `rule-expression.interface.ts` | — | 존재 |
| 파이프라인 | `pipeline/` 10 + `collectors/` 6 | — | 컨트롤러 139줄, 수집·정규화·적재·품질 서비스 전부 |
| 엔티티 | 9개 (`oauth-account` 제외) | — | 완성 |
| API 명세 | `docs/API_SPEC_KO.md` | 344 | 이미 작성돼 있음 |
| **죽은 마이그레이션** | `db/migrations/0001_init.sql` | 164 | **첫 커밋부터 존재** |
| MVP 범위 필터 | `mvp-policy-scope.constant.ts` | — | 존재 |

**첫 커밋 이후에 들어온 것:**

| 언제 | 무엇 |
|---|---|
| 03-13 `0399c9d` | `verifiable` 필드 (프롬프트 + 코드) |
| 03-24 `37574b7` | `summary` / `detectedAge` / `SUMMARY_ONLY_PROMPT` |
| 03-25 `f92b87b` | `alwaysVerifiableKeys` 11개 (코드) |
| 03-25 `409eb01` | `policyType` / `detectedPeriod` |
| 03-30 `711e8e0` | `root` 중첩 트리 · `validateRuleNode` · `targetDescription` · `refinePolicyType` · `stringWithDirectOp` |
| 04-03 `a591f8f` | `collectFactsFromRuleNode` |
| 04-24 `b49a24c` | `policy-manual-overrides.constant.ts`, 크롤러 |
| 04-27 `be7b939` | **OAuth·이메일 인증** (24 files), `oauth-account.entity.ts` |
| 07-01 `8464b3d` | 테스트 39개, 컬렉터 2개 삭제 |

**3-state·판정 엔진·LLM 추출기는 셋 다 첫 커밋에 이미 완성돼 있었습니다.** git이 기록한 4개월은 그 뼈대를 만든 기간이 아니라 **LLM 출력을 길들이고 예외를 메운 기간**입니다.

### 5-1-B. ★ 프롬프트 파일의 변천

`llm-rule-extractor.service.ts`는 **14개 커밋**에서 수정됐고 파일의 대부분이 프롬프트입니다.

| 커밋 | 날짜 | 파일 줄 | `SYSTEM_PROMPT` 블록 |
|---|---|---|---|
| 918e959 | 03-06 | 257 | 228 |
| 0399c9d | 03-13 | 263 | 235 |
| 37574b7 | 03-24 | 340 | 310 |
| 409eb01 | 03-25 | 385 | 353 |
| **711e8e0** | **03-30** | **578** | **543** |
| a591f8f | 04-03 | 636 | 601 |
| 31f2a7e | 04-09 | 649 | 614 |
| a0671c3 | 05-08 | 658 | 623 |
| 8464b3d | 07-01 | 693 | 658 |

**프롬프트가 228줄 → 658줄로 2.9배.** `temperature: 0`과 모델(`claude-haiku-4-5-20251001`)은 처음부터 끝까지 불변.

**LLM 출력이 기대와 달라서 고친 흔적 — 있습니다:**

**① 지시가 두 번 뒤집힘**
```diff
03-13 0399c9d:
-1. 정책 텍스트에서 **사용자에게 질문하여 판별 가능한 자격 조건**만 추출하세요.
+1. 정책 텍스트에서 **모든 자격 조건**을 추출하세요.
03-24 37574b7:
-1. 정책 텍스트에서 **모든 자격 조건**을 추출하세요.
+1. 정책 텍스트에서 **신청 자격/지원 자격 조건만** 추출하세요. "지원대상","신청자격","선정기준" 섹션에 명시된 조건만 포함합니다.
```

**② 오추출 사례를 하나씩 이름 붙여 금지 (03-24 `37574b7`)**
```diff
+4. **서비스 이용 세부사항은 자격 조건이 아닙니다.** 다음은 절대 추출하지 마세요:
+   - 시험 종류, 시험 응시 시기 (어떤 시험을 봤는지는 자격이 아님)
+   - 이삿짐 양, 가구 크기 등 서비스 제약사항
+   - 창업 업종/아이템 제한 (불건전업종 제외 등)
+   - 센터 유형 선택
+   - 신청 금액/보증금 범위
+5. **조건이 텍스트에 명시적으로 적혀있지 않으면 추론하지 마세요.**
```
동시에 누락 사례도 6개 카테고리로 나열합니다. **과추출과 누락을 같은 날 양쪽 다 겪고 양쪽을 다 적었습니다.**

**③ 프롬프트를 믿지 않고 코드로 덮기 시작 (03-25 `f92b87b`)**
```diff
-    const verifiable = obj.verifiable !== false;
+    // 사용자가 본인 상황을 명확히 알 수 있는 key는 항상 verifiable
+    const alwaysVerifiableKeys = new Set(['householdType','employmentStatus', … 11개]);
+    const verifiable = alwaysVerifiableKeys.has(key) || obj.verifiable !== false;
```
1차 분석이 지적한 `verifiable` 강제 덮어쓰기의 시작점입니다.

**④ ★ LLM이 금지를 우회한 것을 목격하고 막음 (03-25 `409eb01`)**
```diff
-    const excludedKeys = new Set(['age', 'region', 'regionCode', 'gender']);
+    const excludedKeys = new Set(['age','region','regionCode','gender','residenceRegion','residence']);
+    // 거주지 관련 key를 다양한 이름으로 우회하는 경우도 제외
+    if (/residen|거주|지역/.test(key.toLowerCase())) return null;
```
주석이 **"우회하는 경우도"** 라고 말합니다. 1차 분석 2-2의 *"지시가 무시될 것을 전제로 코드에서 다시 막았다"* 가 추정이 아니라 **실제 관찰 기록**임이 확인됩니다. (그리고 §4-8대로 `validateRuleNode`에는 이 방어가 없어 여전히 뚫립니다.)

**⑤ LLM이 선택지를 자격 값만 넣는 것을 목격 (03-30 `711e8e0`)**
```diff
+## options 규칙 (매우 중요)
+options는 사용자가 선택할 수 있는 **모든 현실적인 선택지**를 포함해야 합니다.
+자격에 해당하는 값만 넣으면 안 됩니다 — 자격이 안 되는 값도 포함해야 "판별"이 가능합니다.
```
같은 커밋에서 `root` 중첩 트리 규칙과 3분기 소득 기준 예시를 통째로 추가. 프롬프트가 353→543줄로 뛴 지점입니다.

**⑥ 단위를 잘못 뱉는 것을 고침 (04-09 `31f2a7e`)**
```diff
-  - 예: "연소득 5천만원 이하" → label: "연소득 (원)", value: 50000000
+  - 예: "연소득 5천만원 이하" → label: "연소득 (만원)", value: 5000 (만원 단위)
```

**⑦ 라벨 문체를 두 번 고침 (04-09 → 04-15)**
```
04-09:  label: "가구 소득이 기준 중위소득 150% 이하인가요?"   ← 의문문으로
04-15:  label: "기준 중위소득 150% 이하 해당 여부"            ← 다시 명사형으로 되돌림
        + "한국어 라벨 — 반드시 간결한 명사형으로 작성 … 평서문·의문문 금지."
```

**⑧ 기간 판정을 계속 틀려서 반례 추가 (04-23 `cc5ba1b`)**
```diff
+  - **"수시 모집"**은 상시가 아닙니다. 수시 = 비정기, 즉 때에 따라 진행됨
+  - **운영시간** (예: "평일 09:00~18:00")은 신청기간이 아닙니다
+  - **입주일/개인 일정 기준** (예: "입주 3주 전까지")은 시점이 사용자마다 달라 상시가 아닙니다
```

**⑨ 출력이 잘려서 한도를 올림 (05-08 `a0671c3`)**
```diff
-정책의 핵심 내용을 **1~2문장, 80자 이내**로 요약하세요.
+정책의 핵심 내용을 **최대 3문장, 200자 이내**로 요약하세요.
+본문에 명시된 정보만 사용하고, 추측이나 일반적 진술로 길이를 채우지 마세요. 무리하게 늘리지 마세요.
-        max_tokens: summaryOnly ? 256 : 2048,
+        max_tokens: summaryOnly ? 512 : 2048,
```
**한도를 올리면서 동시에 "무리하게 늘리지 마세요"를 넣었습니다.** `max_tokens`가 바뀐 것은 요약 경로뿐이고 **본 추출 경로의 `2048`은 끝까지 그대로**입니다.

**⑩ 비용 대응 (04-07 `cdd800a`)**
```diff
-        system: systemPrompt,
+        // system prompt는 모든 호출에서 동일 → Anthropic prompt caching으로 토큰 비용 절감
+        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
```
**같은 커밋에서 `guide.md`에 "LLM 토큰을 가장 많이 소모합니다" 경고를 썼습니다.** 비용을 의식한 날이 하루로 겹치는데, 그 대응이 prompt caching이었지 호출 상한이나 인증이 아니었습니다.

**⑪ `region_match`는 프롬프트에 단 한 번도 등장하지 않습니다**
```
$ git log --all -S'region_match' -- backend/src/pipeline/llm-rule-extractor.service.ts   → (출력 없음)
```
엔진에는 처음부터 구현돼 있고 LLM에게는 처음부터 끝까지 준 적이 없습니다.

### 5-2. 저장소에 남은 기록

#### ★ `temp.txt` (`6cc8310` 추가 2026-03-19 → `cdd800a` 삭제 2026-04-07)

7개 리비전 전부 확인했습니다. **비밀정보 없음.** 팀원용 운영 안내문이며 **5회에 걸쳐 자랍니다** — 387B → 413B → 613B → 905B → **1,094B(15줄)**.

최초(`6cc8310`):
```
백 키는 법: backend 가서 npm run start:dev
프론트 키는 법: frontend 가서 npm run dev

백엔드의 경우 서버랑 별개로 크롤링 돌려야 되는데(청년 몽땅 정보통), 서버 켜준 뒤에 npm run collect 입력(이 방식은 추후 수정 예정)
크롤링 하는데 1분 정도 걸리니까 여유 있게 2분 정도 있다가 프론트 확인하기!
추가로 어차피 DB에 데이터 저장되니까 1회만 해주면 됨(대신 새로 갱신 원하면 collect 다시 해주면 됨)
```

최종(`711e8e0`):
```
curl -X POST http://localhost:4000/pipeline/collect-and-ingest-mvp
청년 몽땅 때문에 따로 쓰는 명령어인데 나중에 합치고 그럴 예정
정확히 설명하자면 정책 데이터를 새롭게 크롤링(크롤러 수정되거나 했을 때 하면 되는 것)
LLM rule 추출 때문에 시간이 좀 걸리니까(5~10분...?) 서버 키고 명령어 입력해두고 대기하다가 프론트 확인해보면 됨
이번에 크롤러 추가되면서 거의 10분 넘게 걸릴겁니다!

curl -X POST http://localhost:4000/pipeline/regenerate-rules
이거는 이제 코드 로직 수정됐을 때 씀.
정확히 설명하자면 기존 정책 규칙 초기화하고 다시 만들기
얘도 한 5~10분 정도 걸립니다

순서는 collect-and-ingest-mvp 먼저 하고 regenerate-rules 하는 겁니다(웬만하면 둘 다 하는 게 좋을거 같네요)
그리고 둘 다 터미널에 뭔가 출력이 돼야 끝이 난 겁니다. 그전까지는 계속 돌아가는 거에요.
```

**왜 3주 만에 지웠는가 — 버린 것이 아니라 승격시킨 것입니다.**
```
$ git show --stat cdd800a          (2026-04-07 "각종 수정 및 가이드 추가")
 guide.md   | 141 ++++++++++++++++++    ← 새로 추가
 temp.txt   |  16 ---                    ← 삭제
 (+ 백엔드 6개 파일)
$ git show --diff-filter=A --name-only cdd800a  →  guide.md
```
**같은 커밋에서 `temp.txt`를 지우고 `guide.md` 141줄을 추가했습니다.** `guide.md`는 같은 내용을 목차·소요시간·"언제 실행하나요?"로 재구성했고 여기서 비용을 명시적으로 경고합니다:
```
curl -X POST "http://localhost:4000/pipeline/regenerate-rules?force=true"
**언제 실행하나요?** - LLM 프롬프트 자체를 수정했을 때
**소요 시간:** 약 10~20분
> **주의:** LLM 토큰을 가장 많이 소모합니다. 꼭 필요할 때만 사용하세요.
```

**파이프라인이 내부 도구로 쓰였다는 근거로서의 의미:**
1. 2인 팀 **양쪽이** 인증 없는 `curl`로 이 엔드포인트를 상시 호출했습니다. 프론트 담당자에게 `POST /pipeline/*` 실행을 안내하는 문서가 저장소에 커밋돼 있습니다.
2. `?force=true`의 **비용을 알고 있었고 문서에 경고까지 적었습니다.** 그런데 가드는 붙이지 않았습니다.
3. `package.json`에 `"collect": "curl -s -X POST http://localhost:4000/pipeline/collect-and-ingest-mvp"` 스크립트가 지금도 남아 있습니다.

→ 가드가 없는 이유가 "몰라서"가 아니라 **"이 경로로 매일 썼기 때문"** 이라는 것이 문서로 남아 있습니다. (§3-A ④의 트랜잭션 패턴과 같은 모양입니다.)

#### PR과 원격 main

```
GitHub: closed 37건 / open 0건 / 최대 번호 #46
로컬 머지 커밋 31개, 브랜치 방향 3종: fe/develop→dev, be/develop→dev, dev→main
```

**리뷰가 오갔는가 — 사실상 없습니다.**
- 37개 PR 중 **코멘트가 표시된 것은 2개뿐**: **#19**(2 comments, 프론트 PR), **#45**(1 comment).
- **#45의 그 1건은 사람이 아니라 GitGuardian 봇**입니다 — *"2 secrets following the scan of your pull request"*. 실체를 확인했습니다:
  ```
  backend/docs/API_SPEC_KO.md:59   "password": "P@ssw0rd!"     ← 회원가입 요청 예시
  backend/docs/API_SPEC_KO.md:89   "password": "P@ssw0rd!"     ← 로그인 요청 예시
  ```
  **API 명세서의 문서 예시값이며 실제 자격증명이 아닙니다(오탐).** 다만 자동 시크릿 스캐너가 최종 PR에서 경고를 띄웠고 그에 대한 응답이 저장소에 없습니다.
- PR 제목이 브랜치명 그대로인 것이 다수(`Be/develop`, `Dev`)이고 백엔드 PR 제목은 커밋 메시지와 동일합니다.
- PR #45 본문: *"최종본입니다. 추가적인 merge는 없을 예정입니다."* → **2026.08에 #46이 한 번 더 열렸습니다.**

**저장소를 처음 여는 사람이 main에서 보는 것** — 원격 `main` HEAD는 `31c8e47 "Merge pull request #46 from lovejg/be/develop"`(2026-08-22)로 **정상적인 최신 상태**입니다. 루트 `README.md`(10,864자, 배지·아키텍처 다이어그램·규칙 트리 JSON 예시)가 첫 화면이고 인덱스 측정 문서 2개까지 포함된 트리가 보입니다. 단, **로컬 클론의 `origin/main`은 `0dbdf8a` 1개짜리로 멈춰 있어** 로컬만 보고 판단하면 틀립니다.

#### `git stash` 커밋이 이력에 남아 있습니다 [팀]

```
289144c  parents: 0aa656b 16f5256   author: tmakdrl   2026-04-23 17:23:23 +0900
subject: WIP on dev: 0aa656b Merge pull request #29 from lovejg/fe/develop
$ git stash list
stash@{0}: WIP on dev: 0aa656b Merge pull request #29 from lovejg/fe/develop
$ git branch -a --contains 289144c
(출력 없음 — 어느 브랜치에서도 도달하지 않음)
```
**`git stash` 커밋이고 로컬 `refs/stash`에만 존재합니다. 원격에는 없습니다.** 9분 뒤 커밋된 `cc5ba1b "실수로 dev에서 예외 수정을 해서..."`(17:32)와 **변경 파일 4개·변경량이 완전히 동일**합니다. `dev`에서 작업한 것을 알아채고 `stash`로 옮겨 `be/develop`에 다시 커밋한 과정이 그대로 남았고, **1년 반 뒤에도 pop되지 않았습니다.**

#### TODO·FIXME·주석 처리된 코드 — 둘 다 0건
```
$ grep -rnE 'TODO|FIXME|HACK|XXX' backend/src --include='*.ts' | grep -v spec                      → 0건
$ grep -rnE '^\s*//\s*(const|let|return|await|if|for|this\.|import )' backend/src --include='*.ts'  → 0건
```
"임시/나중에/추후" 매칭 20건은 전부 **"우선순위"** 라는 단어이거나 프롬프트 안의 정책 원문 표현(`추후 공고`)이었습니다. **주석으로 막아둔 코드가 한 줄도 없습니다.** 되돌린 것은 주석이 아니라 삭제로 처리했습니다(위 `non_seoul` 사례).

#### 문서와 코드가 어긋나는 곳

| # | 문서 | 코드 실측 |
|---|---|---|
| 1 | `backend/README.md`: **"현재 MVP 범위는 `청년정책 + 서울 전체`로 강제됩니다."** | **강제되지 않습니다.** 카테고리 4 × 지역 26 = **104조합 전부 통과** |
| 2 | `backend/README.md` "주요 엔드포인트"에 파이프라인 9개 기재 | 실제 **11개**. `deactivate-expired`·`validate-urls` 누락 |
| 3 | 루트 `README.md`: **"6개 공공 API"**, "공공 API 6종" | API 5 + HTML 크롤러 1. 배치 기본 실행은 5종 |
| 4 | 루트 `README.md`: "핵심 로직 단위 테스트 + **HTTP E2E**" | DB를 타지 않음. 단 `backend/README.md`는 **"E2E는 …실제 DB 없이 검증합니다"라고 정확히 밝혀놨습니다** |
| 5 | 어느 문서도 **파이프라인 무인증**을 언급하지 않음 | `grep -rniE 'UseGuards\|무인증\|인증 없' backend/docs backend/README.md README.md guide.md` → **0건** |

### 5-3. 코드에서 읽히는 판단

#### ① 자격 조건을 코드가 아니라 데이터(규칙 트리)로
- **무엇을 하려 했나** — 정책이 늘 때마다 배포하지 않기.
- **어떻게 풀었나** — `all`/`any`/`condition` JSON 트리 + 재귀 평가(`eligibility.service.ts:200-247`). 최초 커밋부터 완성형.
- **대가** — 타입 안전성 상실, 그리고 **규칙 자체를 검증할 부담이 새로 생겼습니다.** 그 부담이 `validateCondition`(112줄)과 `validateRuleNode`(35줄)인데 **둘의 방어 수준이 다릅니다**(§4-8). 검증 부담을 두 곳에 나눠 지면서 한쪽이 뒤처졌습니다.

#### ② LLM을 빌드 타임에만
- **무엇을 하려 했나** — 판정을 결정적으로, 비용을 조회량과 무관하게.
- **어떻게 풀었나** — 주입 지점 1곳(`policy-requirement-generator.service.ts:52`), 판정 서비스는 constructor 없는 순수 함수. **성립합니다**(§2 #5·#6).
- **대가** — 원문이 바뀌면 재추출 필요 → content-hash 증분. 그런데 **그 재추출 트리거가 인증 없는 HTTP POST 하나**입니다. 빌드 타임으로 옮긴 비용이 "운영 엔드포인트를 지켜야 하는 부담"으로 이동했고, 그 부담은 지불되지 않았습니다.

#### ③ 파이프라인을 별도 엔드포인트로 노출 (무인증 문제의 뿌리)
- **무엇을 하려 했나** — 2인 팀에서 프론트 담당자도 데이터를 갱신할 수 있게.
- **어떻게 풀었나** — `POST /pipeline/*` 11개 + `temp.txt`/`guide.md`로 `curl` 사용법 공유 + `package.json`의 `"collect"` 스크립트.
- **대가** — **가드를 붙이는 순간 이 워크플로가 깨집니다.** 무인증은 이 설계의 직접적 귀결입니다. 그리고 `policies`·`auth` 컨트롤러에 가드가 6개씩, `users.service`에 트랜잭션이 2곳 있으므로 **"쓸 줄 몰라서"가 아니라 "이 경로에만 안 붙인 것"** 이 두 방향에서 확인됩니다.

#### ④ Redis 캐시 장애 시 DB 폴백
- **무엇을 하려 했나** — 캐시가 죽어도 서비스는 살리기.
- **어떻게 풀었나** — `safeRedisGet`/`safeRedisSet`, TTL 60/120초.
- **대가** — 캐시 키가 `policies:public:${JSON.stringify(query)}`라 **`?search=` 값마다 새 키**입니다. `search`에 길이 제한이 없고 엔드포인트는 무인증·무제한이라 폴백은 안전해졌지만 **캐시 키 카디널리티는 무방비**입니다.

#### ⑤ 오버라이드 파일로 예외를 사람이 덮게 함
- **무엇을 하려 했나** — LLM이 못 푸는 케이스(신청자 유형 2개 이상 등)를 사람이 못 박기.
- **어떻게 풀었나** — 36KB 상수 파일 30건, `find(o => o.code === code)`.
- **대가** — 확장성뿐 아니라 **정합성 검사가 없습니다.** 같은 code가 두 번 들어가도 아무도 모르고, 실제로 그렇게 됐습니다(§3-A ①). 상수 배열이라 테스트도 없습니다.

#### ⑥ 전량 로드 후 인메모리 필터링
- **무엇을 하려 했나** — 확인 불가(§5-5 8번).
- **어떻게 풀었나** — `find({where:{status:ACTIVE}})` 후 JS `filter`.
- **대가** — 요청당 **2,611 kB**(추천 경로 3,403 kB)를 끌어오고 응답에 쓰이는 것은 308 kB입니다. 그리고 **카테고리·지역 술어가 DB에 도달하지 않아 GIN 인덱스가 원리적으로 무의미해집니다.**

#### ⑦ 상수와 enum을 함께 키움
- 지역 enum 3 → 26, 카테고리 enum 2 → 4로 자라는 동안 `MVP_ALLOWED_CATEGORIES`가 함께 자라 **enum 전체와 같아졌고**, `r.startsWith('seoul')` 폴백은 26개 전부를 통과시킵니다.
- **대가** — 필터가 조용히 사라졌고 **문서(`backend/README.md`)와 테스트가 둘 다 "필터가 있다"고 말합니다**(§4-9). 사라진 것을 알려주는 장치가 하나도 없었습니다.

#### ⑧ NestJS + Fastify + TypeORM
- **무엇을 하려 했나** — 처리량과 개발 속도.
- **어떻게 풀었나** — `@nestjs/platform-fastify`, `@fastify/cors`. TypeORM은 엔티티 우선.
- **대가** — `main.ts:11`의 `cors, { origin: true, credentials: true }`는 Origin을 그대로 반사하며 credentials를 허용합니다. helmet·rate limiting·전역 예외 필터 없음. 스키마 소유권이 `synchronize` 쪽에 있게 된 것도 이 선택의 연장선입니다(§3-A ②).

### 5-4. 2026.08 단독 작업 구간 분해

#### 시각 단위로 복원한 하루

| 시각 (KST) | 사건 | 근거 |
|---|---|---|
| **17:13** | `bengo-postgres` 컨테이너 기동 | `docker inspect` StartedAt `2026-08-22T08:13:23Z` |
| **17:17** | 마이그레이션 대조 실행 | `MIGRATION_INDEX_AUDIT.md:9` "2026-08-22 08:17 UTC" |
| 18:04 | `0001_init.sql` 주석 4줄 추가 | 파일 mtime `18:04:52` |
| **18:07** | 커밋 `020fef7` (문서화) | 커밋 시각 |
| **18:40** | 인덱스 적용 후 재측정 | `FK_INDEX_MEASUREMENT.md:14` "적용 후 09:40 UTC" |
| 20:20~20:21 | `fk_index_explain.sql`·측정 문서 2개 저장 | 파일 mtime |
| **20:22** | 커밋 `058a1fe` (인덱스 + 측정) | 커밋 시각 |
| **20:27** | 컨테이너 종료 | `docker inspect` FinishedAt `2026-08-22T11:27:56Z` |

**총 3시간 14분.** `TASKS.md`의 예상("조사 30분 / 수정 1시간 / 재측정 30분")과 대체로 맞습니다.

#### 그날의 지시서가 저장소 디렉터리에 있습니다 — 단, 추적되지 않게

§2 #11 상세에 적은 대로 `TASKS.md`는 `.git/info/exclude`로 제외돼 있고 커밋된 적이 없습니다. **985배·148배의 출처가 이 파일입니다.**

#### 무엇을 고쳤고 무엇을 고치지 않았나

| 고친 것 | 방법 |
|---|---|
| FK 인덱스 2개 | `@Index()` 두 줄 (소스 변경은 정확히 4줄) |
| 죽은 마이그레이션 | **삭제가 아니라 표시** — 파일 상단 주석 4줄 + `README.md` 1줄 + 대조 문서 153줄 |
| 근거 남기기 | 측정 문서 247줄 + 재현 SQL 124줄 |

| 고치지 않은 것 | 알고 있었는가 |
|---|---|
| `pipeline_ingestion_runs` FK 인덱스 | **알고 있었고, 안 붙인 이유를 문서에 씀** (`FK_INDEX_MEASUREMENT.md:132-174`) |
| 스키마 소유권 (`synchronize`) | **알고 있었음** — `TASKS.md` 규칙 5 *"스키마 소유권 관련 결정은 전부 사람이 한다"*. 결정을 보류한 것 |
| 테스트가 DB를 안 탄다 / CI 없음 | **알고 있었고 문서에 씀** (`FK_INDEX_MEASUREMENT.md:186-238`) |
| **파이프라인 11개 무인증** | **저장소 문서에 언급 0건** |
| **MVP 필터 무력화** | **저장소 문서에 언급 0건** — 1차 분석에서 발견했으나 저장소에는 남기지 않음 |
| 전량 로드 / 페이징 부재 | 언급 0건 |
| 오버라이드 중복 code | 미발견 |
| **985배 대조군** | 원자료(2,955버퍼)만 옮기고 대조군은 옮기지 않음 |

#### 1차 분석 문서와 저장소 커밋의 시간 순서
- `TASKS.md` mtime **2026-08-22 15:31** → 두 커밋(18:07, 20:22)보다 **먼저**. 지시서가 작업보다 앞섭니다.
- `면접준비_04_Bengo.md`의 mtime은 **2026-09-06**(이번 세션에 배치된 것)이라 원 작성 시각은 파일에서 확인할 수 없습니다. 내용상 985배·148배를 인용하고 커밋 `058a1fe`의 결과("두 곳에만 적용")까지 반영하므로 **커밋 이후에 갱신된 것**입니다.

### 5-5. 질문 목록 (판단 보류)

읽다가 의도를 알 수 없어 추측하지 않고 남긴 것들입니다.

1. **`YOUTHCENTER_CENTER_*` 10개 변수가 왜 `.env`에 남아 있나?** — `youthcenter-center.collector.ts`는 `8464b3d`(최종본)에서 삭제됐는데 `.env`에는 그 설정이 실제 API 키까지 포함해 그대로 있습니다. 컬렉터를 지운 이유(API가 정책이 아니라 센터 목록이어서? 쿼터? 품질?)와, 설정만 남긴 것이 의도인지 정리 누락인지 알 수 없습니다. *(코드는 있었다가 지워진 것이 맞고 설정만 남았습니다. 지운 이유는 커밋 메시지가 "최종본" 한 단어라 알 수 없습니다.)*
2. **`mock-seoul.collector.ts`가 왜 4개월간 프로바이더로 등록된 채 남아 있었나?** — `MVP_DEFAULT_BATCH_SOURCES`에는 없어 배치로는 안 돌지만 `POST /pipeline/collect-and-ingest/mock-seoul`로는 호출 가능했습니다. 의도적으로 남긴 것인지 잊은 것인지.
3. **`88716a9 "작은 수정"`(04-13)에서 INFO 정책 단락 평가를 `evaluate()` 맨 위로 옮긴 이유** — 그 결과 INFO 정책은 **나이·지역 검사도 건너뛰고 무조건 `ELIGIBLE`** 이 됩니다. 의도된 동작인지 위치만 바꾼 부작용인지 커밋 메시지로는 알 수 없습니다.
4. **오버라이드 중복 code(454행/880행)가 의도인가 실수인가** — 뒤 항목이 `overrideRule`을 갖고 있어 "앞 항목을 덮으려던" 것처럼 보이지만 `find()`는 앞것을 반환합니다. 두 항목을 합치려던 것인지 붙여넣기 사고인지.
5. **`git stash@{0}`(289144c)를 왜 pop하지 않고 남겼나** — 내용이 `cc5ba1b`로 커밋됐으니 불필요한데 1년 반째 남아 있습니다.
6. **PR #45의 GitGuardian 경고에 대해 어떤 판단을 했나** — 문서 예시값이라 오탐이지만, 무시하기로 결정한 것인지 못 본 것인지 저장소에 흔적이 없습니다.
7. **`backend/README.md`의 "MVP 범위는 청년정책 + 서울 전체로 강제됩니다"를 2026.08에 왜 안 고쳤나** — 같은 파일의 마이그레이션 문구는 그때 고쳤습니다. 필터 무력화를 1차 분석에서 발견했는데 이 문장은 남겨둔 이유.
8. **전량 로드를 SQL로 내리지 않은 이유가 `startsWith('seoul')` 폴백 때문인가** — 코드만으로는 확정할 수 없습니다. MVP 필터가 SQL로 표현하기 까다로운 형태이긴 하지만, 그것이 실제 이유였는지 단순히 행이 적어서였는지.
9. **`temp.txt`를 `.gitignore`에 넣지 않고 커밋한 이유** — 팀원과 공유하려면 커밋이 필요했던 것으로 보이지만, 3주 뒤 `guide.md`로 옮길 때도 동일하게 커밋했으므로 처음부터 문서로 만들지 않은 이유가 불분명합니다.
10. **`max_tokens`를 요약 경로만 256→512로 올리고 본 추출 경로 2048은 그대로 둔 이유** — 요약이 잘리는 것은 관찰했는데 본 추출이 잘리는 것은 관찰하지 못한 것인지, 2048이면 충분하다고 판단한 것인지.

---

## 6. 재현하지 못한 것

| 항목 | 상태 | 사유 |
|---|---|---|
| **2-state → 3-state 전환 커밋** | **확인 불가** | git 이력에 전환 지점이 없습니다. 최초 백엔드 커밋 `918e959`가 "지금까지 한 것들 싹 다 push"인 일괄 투입이라 **그 이전 단계는 저장소로 확인할 수 없습니다.** 확인된 것은 ① git 이력에 2-state 시점 없음 ② 최초 커밋에 3-state 완전 구현, 두 가지뿐입니다 |
| **시간 배수 148배** | **재현 불가 (값 다름)** | 동일 조건에서 **81.8배**(3.026 ms → 0.037 ms, 5회 중앙값). 버퍼 배수 985.0은 정확히 재현. 실행 시간은 기계 상태에 의존하는 값입니다 |
| **원본 볼륨 md5 지문 대조** | **실패** | alpine의 busybox `find`에 `-printf`가 없어 빈 출력이 나왔고 전후 지문이 둘 다 빈 문자열의 md5(`d41d8cd9…`)였습니다. 무변경 근거는 ① 파일 수 1,379·용량 331.2M 동일 ② 원본 컨테이너 `startedAt` 불변·`restartCount=0` ③ 항상 `:ro` 마운트, 세 가지로 대체했습니다 |
| **`docker compose` 스택 기동** | **해당 없음** | compose·Dockerfile이 전 브랜치 이력에 존재한 적이 없습니다(§1-6) |
| **`YOUTHCENTER_CENTER_*` 컬렉터를 지운 이유** | **확인 불가** | 커밋 메시지가 "최종본" 한 단어. §5-5 1번 |
| **`면접준비_04_Bengo.md` 원 작성 시각** | **확인 불가** | 파일이 git 추적 대상이 아니고 mtime이 이번 세션 배치 시각으로 갱신돼 있습니다. 내용 기준으로 `058a1fe` 커밋 이후 갱신본이라는 것만 확정됩니다 |
| **`src/**/*.ts` 10,611줄 vs 1차 분석 10,607줄의 4줄 차이** | **원인 미특정** | 측정 명령과 값은 §2 병기표에 기록 |
| **1차 분석의 `disableRule` 6건** | **재현 불가 (값 다름)** | 실행 결과 5건. 정적 grep(`^\s+disableRule:`)도 5. 6이 나온 경로를 특정하지 못했습니다 |
| **로컬 `origin/*` 참조의 최신화** | **미실행 (의도적)** | 저장소를 건드리지 않기 위해 `git fetch`를 실행하지 않았습니다. 원격 상태는 GitHub 웹 조회로 확인했습니다 |

---

## 7. 작업 후 저장소 상태

### 추적 파일 변경 0건
```
$ git status --short
?? "TASKS_재분석_Bengo.md"      ← 조사 시작 시점에 이미 있던 것
?? "면접준비_04_Bengo.md"       ← 조사 시작 시점에 이미 있던 것
?? "FINDINGS_Bengo.md"          ← 이 문서 (추적 안 됨)
```
`git add`·`git commit`·`git fetch`·`git stash` 어느 것도 실행하지 않았습니다. `.gitignore`와 `.git/info/exclude`도 수정하지 않았습니다.
(`TASKS.md`는 `.git/info/exclude`에 등재돼 있어 `git status`에 나타나지 않습니다. 이 문서는 등재하지 않았습니다.)

### 부수효과 1건
`backend/dist/tsconfig.build.tsbuildinfo` — GATE 1의 `npx tsc --noEmit`이 갱신했습니다. `.gitignore:83`의 `dist` 대상이라 추적되지 않으며, **삭제하지 않고 남겨뒀습니다.**

### 컨테이너·DB
| 만든 것 | 정리 |
|---|---|
| `bengo-repro-vol` / `bengo-repro-pg` (GATE 3) | `docker volume rm` / `docker rm -f` **완료** |
| `bengo-repro-vol2` / `bengo-repro-pg2` (GATE 4) | 동일 **완료** |

```
$ docker ps -a --format '{{.Names}} {{.Status}}' | grep -i bengo
bengo-redis     Exited (255) 3 months ago
bengo-postgres  Exited (0) 2 weeks ago
$ docker volume ls | grep -i repro          → (없음)
$ docker inspect bengo-postgres --format 'status={{.State.Status}} startedAt={{.State.StartedAt}} restartCount={{.RestartCount}}'
status=exited startedAt=2026-08-22T08:13:23.758862741Z restartCount=0
```
**기존 컨테이너 `bengo-postgres`·`bengo-redis`는 한 번도 기동하지 않았습니다.** 원본 볼륨(`97d0155c…`)은 항상 `:ro`로만 마운트했고 그대로 존재합니다. 실 DB에 대한 모든 쓰기(인덱스 생성)는 복제본에서, 그것도 트랜잭션 내부에서 수행하고 `ROLLBACK` 했습니다.

### 조사용 스크립트
전부 세션 스크래치패드(`…/scratchpad/`)에 두었고 저장소 디렉터리에는 파일을 만들지 않았습니다.

---

## 완료 조건 대조

- [x] GATE 1~6을 순서대로 통과했고, 각 게이트에서 멈추고 보고했다
- [x] 저장소 코드를 수정하지 않았다. 만든 컨테이너·DB는 정리했다
- [x] 모든 수치에 실행 명령과 출력이 붙어 있다. **테스트 개수는 실행 결과(39 = 34 + 5), 줄 수는 제외분 병기(§2 병기표)**
- [x] 확인 못 한 항목이 `재현 불가` / `확인 불가` / `해당 없음`으로 명시돼 있다 (§6)
- [x] 실패한 검증을 통과시키려고 단정문을 고치지 않았다 — 148배·오버라이드 31건·`synchronize: true`·"트랜잭션이 아예 없다" 네 건은 **정정으로 기록**했습니다(§3-A)
- [x] GATE 5-5 질문 목록이 비어 있지 않다 (10건)
