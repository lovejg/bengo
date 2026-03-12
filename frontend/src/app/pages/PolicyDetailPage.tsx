import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import {
  Bookmark,
  ExternalLink,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiClientError, getAccessToken, getStoredUserProfile } from '../api/client';
import { checkEligibility, getPolicyDetail } from '../api/policies';
import { updateMyPolicyState, removeMyPolicy } from '../api/me';
import { MainLayout } from '../components/templates/MainLayout';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Input } from '../components/atoms/Input';
import { PolicyMetaRow } from '../components/molecules/PolicyMetaRow';
import { PolicyDetailSkeleton } from '../components/molecules/PolicyDetailSkeleton';
import { EmptyState } from '../components/molecules/EmptyState';
import type { EligibilityResponse, PolicyDetail as ApiPolicyDetail } from '../types';

const statusLabels: Record<string, string> = {
  recruiting: '모집중',
  always: '상시모집',
  closed: '마감',
};

const regionLabels: Record<string, string> = {
  seoul: '서울',
  seoul_gangnam: '서울 강남구',
  seoul_mapo: '서울 마포구',
  seoul_songpa: '서울 송파구',
};

function formatPolicyPeriod(startsAt?: string | null, endsAt?: string | null) {
  if (!startsAt && !endsAt) {
    return '상시 모집';
  }

  if (startsAt && endsAt) {
    return `${startsAt.slice(0, 10)} ~ ${endsAt.slice(0, 10)}`;
  }

  return startsAt ? `${startsAt.slice(0, 10)}부터` : `${endsAt?.slice(0, 10)}까지`;
}

function mapStatus(_startsAt?: string | null, endsAt?: string | null): 'recruiting' | 'always' | 'closed' {
  if (!endsAt) {
    return 'always';
  }

  return new Date(endsAt).getTime() < Date.now() ? 'closed' : 'recruiting';
}

function getTargetText(policy: ApiPolicyDetail) {
  const target = [
    policy.minAge !== null && policy.minAge !== undefined ? `최소 ${policy.minAge}세` : null,
    policy.maxAge !== null && policy.maxAge !== undefined ? `최대 ${policy.maxAge}세` : null,
    policy.regionCodes?.length ? policy.regionCodes.map((code) => regionLabels[code] ?? code).join(', ') : null,
  ]
    .filter(Boolean)
    .join(' / ');

  return target || '세부 지원 대상 정보가 없습니다.';
}

function getEvidence(
  policy: ApiPolicyDetail,
  eligibilityResult?: EligibilityResponse | null,
  eligibilityAnswers?: Record<string, string>,
) {
  if (eligibilityResult) {
    // 결과 있을 때: 실제 입력한 답변 + 결과 근거
    const answerItems = (policy.requirements ?? [])
      .filter((req, i, arr) => arr.findIndex((r) => r.key === req.key) === i)
      .filter((req) => eligibilityAnswers?.[req.key])
      .map((req) => ({
        text: `${req.label ?? req.key}: ${eligibilityAnswers![req.key]}`,
        source: '입력한 정보',
      }));

    const reasonItems =
      eligibilityResult.reasons.length > 0
        ? eligibilityResult.reasons.map((reason) => ({ text: reason, source: '자격 확인 결과' }))
        : [{ text: eligibilityResult.explanation, source: '자격 확인 결과' }];

    return [...answerItems, ...reasonItems];
  }

  // 결과 없을 때: 요건 안내 + 이전 판정 (있으면)
  const requirementItems = (policy.requirements ?? []).filter((req, i, arr) => arr.findIndex((r) => r.key === req.key) === i).map((req) => ({
    text: `${req.label ?? req.key}${req.description ? `: ${req.description}` : ''}`,
    source: '요건 정보',
  }));

  const lastItems = policy.lastEligibility
    ? (policy.lastEligibility.reasons.length > 0
        ? policy.lastEligibility.reasons
        : [policy.lastEligibility.explanation]
      ).map((text) => ({ text, source: '최근 자격 판정' }))
    : [];

  return [...requirementItems, ...lastItems];
}

export function PolicyDetailPage() {
  const { id } = useParams();
  const [bookmarked, setBookmarked] = useState(false);
  const [showEligibilityForm, setShowEligibilityForm] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [policy, setPolicy] = useState<ApiPolicyDetail | null>(null);
  const [eligibilityAnswers, setEligibilityAnswers] = useState<Record<string, string>>({});
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadPolicy = async () => {
      if (!id) {
        setHasError(true);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setHasError(false);
      try {
        const response = await getPolicyDetail(id);
        setPolicy(response);
        setBookmarked(!!getAccessToken() && response.userState === 'saved');
      } catch (error) {
        setHasError(true);
        const message = error instanceof ApiClientError ? error.message : '정책 정보를 불러오는데 실패했습니다';
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadPolicy();
  }, [id, reloadKey]);

  const handleCheckEligibility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) {
      return;
    }

    try {
      const missingRequired = (policy?.requirements ?? []).filter(
        (req) => req.isRequired && !eligibilityAnswers[req.key],
      );
      if (missingRequired.length > 0) {
        toast.error(`필수 항목을 모두 입력해주세요: ${missingRequired.map((r) => r.label ?? r.key).join(', ')}`);
        return;
      }

      const answers: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(eligibilityAnswers)) {
        if (value === '') continue;
        const req = policy?.requirements?.find((r) => r.key === key);
        if (req?.type === 'number') {
          answers[key] = Number(value);
        } else if (req?.type === 'boolean') {
          answers[key] = value === 'true';
        } else {
          answers[key] = value;
        }
      }

      const response = await checkEligibility(id, { answers });

      setEligibilityResult(response);
      toast.success('자격 확인이 완료되었습니다');
      setTimeout(() => {
        document.getElementById('evidence')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : '자격 확인에 실패했습니다';
      toast.error(message);
    }
  };

  const handleBookmark = async () => {
    if (!id) return;
    if (!getAccessToken()) {
      toast.error('로그인이 필요합니다');
      return;
    }
    const next = !bookmarked;
    try {
      if (next) {
        await updateMyPolicyState(id, { state: 'saved' });
      } else {
        await removeMyPolicy(id);
      }
      setBookmarked(next);
      toast.success(next ? '정책이 저장되었습니다' : '저장을 취소했습니다');
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : '저장에 실패했습니다';
      toast.error(message);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: policy?.title,
          text: policy?.shortDescription ?? policy?.description,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success('링크가 클립보드에 복사되었습니다');
    }
  };

  const handleRetry = () => {
    setReloadKey((current) => current + 1);
  };

  const sections = [
    { id: 'summary', label: '요약' },
    { id: 'target', label: '지원대상' },
    { id: 'criteria', label: '선정기준' },
    { id: 'application', label: '신청방법' },
    { id: 'evidence', label: '근거' },
    { id: 'source', label: '원문' },
  ];

  if (isLoading) {
    return (
      <MainLayout>
        <div className="bg-[var(--muted)] py-8">
          <div className="container mx-auto px-4">
            <div className="bg-white rounded-2xl p-6 md:p-8">
              <div className="space-y-4">
                <div className="h-8 bg-[var(--muted)] rounded w-3/4 animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-6 bg-[var(--muted)] rounded w-20 animate-pulse" />
                  <div className="h-6 bg-[var(--muted)] rounded w-24 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <PolicyDetailSkeleton />
            </div>
            <div className="lg:col-span-1">
              <div className="bg-white border border-[var(--border)] rounded-xl p-6 space-y-3">
                <div className="h-10 bg-[var(--muted)] rounded animate-pulse" />
                <div className="h-10 bg-[var(--muted)] rounded animate-pulse" />
                <div className="h-10 bg-[var(--muted)] rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (hasError || !policy) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16">
          <EmptyState
            type="error"
            onAction={handleRetry}
            actionLabel="다시 시도"
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="bg-[var(--muted)] py-6 sm:py-8">
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs sm:text-sm text-[var(--muted-foreground)] mb-4 sm:mb-6 overflow-x-auto" aria-label="탐색 경로">
            <Link to="/policies" className="hover:text-[var(--accent)] transition-colors whitespace-nowrap">
              정책찾기
            </Link>
            <ChevronRight className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{policy.title}</span>
          </nav>

          {/* Header */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <h1 className="mb-4 text-xl sm:text-2xl md:text-3xl break-words">{policy.title}</h1>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant={mapStatus(policy.startsAt, policy.endsAt)}>{statusLabels[mapStatus(policy.startsAt, policy.endsAt)]}</Badge>
                  <Badge>{policy.providerName ?? '공식 출처'}</Badge>
                </div>
                <PolicyMetaRow
                  agency={policy.providerName}
                  region={policy.regionCodes?.map((code) => regionLabels[code] ?? code).join(', ')}
                  period={formatPolicyPeriod(policy.startsAt, policy.endsAt)}
                />
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBookmark}
                  className="gap-1.5"
                  aria-label={bookmarked ? '저장 취소' : '정책 저장'}
                  aria-pressed={bookmarked}
                >
                  <Bookmark className={bookmarked ? 'fill-current' : ''} />
                  <span className="hidden sm:inline">저장</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-1.5"
                  onClick={handleShare}
                  aria-label="정책 공유"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">공유</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            {/* Section Nav */}
            <nav className="bg-white border border-[var(--border)] rounded-xl p-2 flex flex-wrap gap-2" aria-label="섹션 네비게이션">
              {sections.map((section) => (
                <button
                  key={section.id}
                  className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm hover:bg-[var(--muted)] transition-colors duration-150 whitespace-nowrap"
                  onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })}
                  aria-label={`${section.label} 섹션으로 이동`}
                >
                  {section.label}
                </button>
              ))}
            </nav>

            {/* Summary */}
            <section id="summary" className="bg-white border border-[var(--border)] rounded-xl p-4 sm:p-6" style={{ scrollMarginTop: '100px' }}>
              <h3 className="mb-4 text-lg sm:text-xl">요약</h3>
              <p className="text-[var(--muted-foreground)] leading-relaxed text-sm sm:text-base">
                {policy.shortDescription ?? policy.description ?? '요약 정보가 없습니다.'}
              </p>
            </section>

            {/* Target */}
            <section id="target" className="bg-white border border-[var(--border)] rounded-xl p-4 sm:p-6" style={{ scrollMarginTop: '100px' }}>
              <h3 className="mb-4 text-lg sm:text-xl">지원대상</h3>
              <p className="text-[var(--muted-foreground)] leading-relaxed text-sm sm:text-base">{getTargetText(policy)}</p>
            </section>

            {/* Criteria */}
            <section id="criteria" className="bg-white border border-[var(--border)] rounded-xl p-4 sm:p-6" style={{ scrollMarginTop: '100px' }}>
              <h3 className="mb-4 text-lg sm:text-xl">선정기준</h3>
              <p className="text-[var(--muted-foreground)] leading-relaxed text-sm sm:text-base">
                {policy.eligibilityInfo?.selectionCriteria ?? '선정 기준 정보가 없습니다.'}
              </p>
            </section>

            {/* Benefits */}
            <section className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6" style={{ scrollMarginTop: '100px' }}>
              <h3 className="mb-4 text-lg sm:text-xl">지원 혜택</h3>
              <p className="text-lg">{policy.eligibilityInfo?.supportContent ?? policy.description ?? '지원 내용 정보가 없습니다.'}</p>
            </section>

            {/* Application */}
            <section id="application" className="bg-white border border-[var(--border)] rounded-xl p-4 sm:p-6" style={{ scrollMarginTop: '100px' }}>
              <h3 className="mb-4 text-lg sm:text-xl">신청 방법</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium">신청 기간: </span>
                  <span className="text-[var(--muted-foreground)]">
                    {policy.eligibilityInfo?.applicationDeadline ?? formatPolicyPeriod(policy.startsAt, policy.endsAt)}
                  </span>
                </div>
                <div>
                  <span className="font-medium">신청 방법: </span>
                  <span className="text-[var(--muted-foreground)]">{policy.applicationMethod ?? '신청 방법 정보가 없습니다.'}</span>
                </div>
              </div>
            </section>

            {/* Eligibility Check */}
            <section className="bg-white border border-[var(--border)] rounded-xl p-4 sm:p-6" style={{ scrollMarginTop: '100px' }}>
              <h3 className="mb-4 text-lg sm:text-xl">내가 맞는지 확인하기</h3>
              <p className="text-[var(--muted-foreground)] mb-6">
                간단한 정보를 입력하면 신청 가능 여부를 확인할 수 있습니다.
              </p>

              {!showEligibilityForm && (
                <Button onClick={() => {
                  const profile = getStoredUserProfile();
                  if (profile) {
                    const prefilled: Record<string, string> = {};
                    if (profile.age) prefilled['age'] = String(profile.age);
                    setEligibilityAnswers(prefilled);
                  }
                  setShowEligibilityForm(true);
                }}>자격 확인하기</Button>
              )}

              {showEligibilityForm && !eligibilityResult && (
                <form onSubmit={handleCheckEligibility} className="space-y-4">
                  {(policy?.requirements ?? []).filter((req, i, arr) => arr.findIndex((r) => r.key === req.key) === i).map((req) => (
                    <div key={req.key}>
                      <label htmlFor={`req-${req.key}`} className="block mb-2">
                        {req.label ?? req.key}
                        {req.isRequired && <span className="text-[var(--destructive)] ml-1">*</span>}
                        {req.description && (
                          <span className="text-sm text-[var(--muted-foreground)] ml-1">({req.description})</span>
                        )}
                      </label>
                      {req.type === 'select' && req.options ? (
                        <select
                          id={`req-${req.key}`}
                          className="w-full border border-[var(--border)] rounded-xl px-3 py-2 text-sm bg-white"
                          value={eligibilityAnswers[req.key] ?? ''}
                          onChange={(e) => setEligibilityAnswers((prev) => ({ ...prev, [req.key]: e.target.value }))}
                        >
                          <option value="">선택하세요</option>
                          {req.options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : req.type === 'boolean' ? (
                        <div className="flex gap-2">
                          {(['true', 'false'] as const).map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setEligibilityAnswers((prev) => ({ ...prev, [req.key]: val }))}
                              className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                                eligibilityAnswers[req.key] === val
                                  ? 'border-[var(--accent)] bg-blue-50 text-[var(--accent)]'
                                  : 'border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-[var(--muted)]'
                              }`}
                            >
                              {val === 'true' ? '예' : '아니오'}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <Input
                          id={`req-${req.key}`}
                          type={req.type === 'number' ? 'number' : 'text'}
                          value={eligibilityAnswers[req.key] ?? ''}
                          onChange={(e) => setEligibilityAnswers((prev) => ({ ...prev, [req.key]: e.target.value }))}
                        />
                      )}
                    </div>
                  ))}
                  <Button type="submit">확인하기</Button>
                </form>
              )}

              {eligibilityResult?.result === 'eligible' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6" role="alert">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <h4 className="text-emerald-900 mb-2">신청 가능합니다!</h4>
                      <p className="text-emerald-700 text-sm mb-4">
                        {eligibilityResult.explanation}
                      </p>
                      <Button
                        size="sm"
                        onClick={() => window.open(eligibilityResult.policy.applicationUrl ?? policy.applicationUrl ?? policy.sourceUrl ?? '#', '_blank', 'noopener,noreferrer')}
                      >
                        신청하러 가기
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {eligibilityResult?.result === 'conditional' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6" role="alert">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <h4 className="text-amber-900 mb-2">추가 확인이 필요합니다</h4>
                      <p className="text-amber-700 text-sm mb-4">
                        {eligibilityResult.explanation}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => window.open(policy.sourceUrl ?? '#', '_blank', 'noopener,noreferrer')}
                        >
                          원문 보기
                        </Button>
                        <Button size="sm" variant="secondary">
                          문의하기
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {eligibilityResult?.result === 'ineligible' && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-6" role="alert">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-6 w-6 text-rose-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <h4 className="text-rose-900 mb-2">현재 조건으로는 신청이 어렵습니다</h4>
                      <p className="text-rose-700 text-sm mb-4">{eligibilityResult.explanation}</p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Evidence */}
            <section id="evidence" className="bg-white border border-[var(--border)] rounded-xl p-4 sm:p-6">
              <h3 className="mb-4 text-lg sm:text-xl">근거 자료</h3>
              <div className="space-y-3">
                {getEvidence(policy, eligibilityResult, eligibilityAnswers).map((item, index) => (
                  <div key={index} className="bg-[var(--muted)] rounded-lg p-4">
                    <p className="mb-2">{item.text}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">출처: {item.source}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Source */}
            <section id="source" className="bg-white border border-[var(--border)] rounded-xl p-4 sm:p-6">
              <div className="flex items-start gap-3">
                <Info className="h-6 w-6 text-[var(--accent)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1">
                  <h4 className="mb-2">원문 확인하기</h4>
                  <p className="text-sm text-[var(--muted-foreground)] mb-4">
                    정확한 정보는 항상 공식 출처를 통해 확인하세요.
                  </p>
                  <a
                    href={policy.sourceUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[var(--accent)] hover:underline"
                  >
                    원문 보러가기
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1" aria-label="빠른 액션">
            <div className="sticky top-24 space-y-4">
              <div className="bg-white border border-[var(--border)] rounded-xl p-6 space-y-3">
                <Button
                  className="w-full gap-2"
                  onClick={() => window.open(policy.applicationUrl ?? policy.sourceUrl ?? '#', '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="h-4 w-4" />
                  신청하러 가기
                </Button>
                <Button
                  variant="secondary"
                  className="w-full gap-2"
                  onClick={() => window.open(policy.sourceUrl ?? '#', '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="h-4 w-4" />
                  원문 보기
                </Button>
                <Button
                  variant="ghost"
                  className="w-full gap-2"
                  onClick={handleBookmark}
                  aria-pressed={bookmarked}
                >
                  <Bookmark className={bookmarked ? 'fill-current' : ''} />
                  {bookmarked ? '저장됨' : '저장하기'}
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}

export default PolicyDetailPage;
