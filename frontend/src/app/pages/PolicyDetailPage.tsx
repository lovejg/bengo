import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import {
  Bookmark,
  ExternalLink,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronRight,
  Clock,
  FileText,
  Target,
  Award,
  Sparkles,
  TrendingUp,
  ClipboardList,
  Eye,
  CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { ApiClientError, getAccessToken, getStoredUserProfile } from '../api/client';
import { checkEligibility, getPolicies, getPolicyDetail, getPolicyDetailWithUser } from '../api/policies';
import { updateMyPolicyState, removeMyPolicy } from '../api/me';
import { MainLayout } from '../components/templates/MainLayout';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Input } from '../components/atoms/Input';
import { PolicyMetaRow } from '../components/molecules/PolicyMetaRow';
import { PolicyDetailSkeleton } from '../components/molecules/PolicyDetailSkeleton';
import { EmptyState } from '../components/molecules/EmptyState';
import { PolicyCard } from '../components/organisms/PolicyCard';
import type { EligibilityResponse, PolicyDetail as ApiPolicyDetail, PolicyListItem } from '../types';
import { cn } from '../lib/utils';

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

function formatPolicyPeriod(startsAt?: string | null, endsAt?: string | null, isAlwaysOpen?: boolean) {
  if (isAlwaysOpen) return '상시모집';
  if (startsAt && endsAt) return `${startsAt.slice(0, 10)} ~ ${endsAt.slice(0, 10)}`;
  return '기간확인불가';
}

function mapStatus(endsAt?: string | null, isAlwaysOpen?: boolean): 'recruiting' | 'always' | 'closed' | null {
  if (isAlwaysOpen) return 'always';
  if (!endsAt) return null;
  return new Date(endsAt).getTime() < Date.now() ? 'closed' : 'recruiting';
}

function getDaysLeft(endsAt?: string | null): number | null {
  if (!endsAt) return null;
  const days = Math.ceil((new Date(endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return days > 0 ? days : null;
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

function getSourceUrl(sourceUrl: string | null | undefined, title: string): string {
  if (sourceUrl) return sourceUrl;
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(title)}`;
}

function getEvidence(
  policy: ApiPolicyDetail,
  eligibilityResult?: EligibilityResponse | null,
  eligibilityAnswers?: Record<string, string>,
) {
  if (eligibilityResult) {
    const answerItems = (policy.requirements ?? [])
      .filter((req, i, arr) => arr.findIndex((r) => r.key === req.key) === i)
      .filter((req) => eligibilityAnswers?.[req.key])
      .map((req) => ({ text: `${req.label ?? req.key}: ${eligibilityAnswers![req.key]}`, source: '입력한 정보' }));
    const reasonItems =
      eligibilityResult.reasons.length > 0
        ? eligibilityResult.reasons.map((reason) => ({ text: reason, source: '자격 확인 결과' }))
        : [{ text: eligibilityResult.explanation, source: '자격 확인 결과' }];
    return [...answerItems, ...reasonItems];
  }
  const requirementItems = (policy.requirements ?? [])
    .filter((req, i, arr) => arr.findIndex((r) => r.key === req.key) === i)
    .map((req) => ({ text: `${req.label ?? req.key}${req.description ? `: ${req.description}` : ''}`, source: '요건 정보' }));
  const lastItems = policy.lastEligibility
    ? (policy.lastEligibility.reasons.length > 0 ? policy.lastEligibility.reasons : [policy.lastEligibility.explanation]).map((text) => ({
        text,
        source: '최근 자격 판정',
      }))
    : [];
  return [...requirementItems, ...lastItems];
}

export function PolicyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bookmarked, setBookmarked] = useState(false);
  const [showEligibilityForm, setShowEligibilityForm] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [policy, setPolicy] = useState<ApiPolicyDetail | null>(null);
  const [eligibilityAnswers, setEligibilityAnswers] = useState<Record<string, string>>({});
  const [reloadKey, setReloadKey] = useState(0);
  const [activeSection, setActiveSection] = useState('summary');
  const [relatedPolicies, setRelatedPolicies] = useState<PolicyListItem[]>([]);
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const mockViews = useMemo(() => Math.floor(Math.random() * 1500) + 500, []);

  useEffect(() => {
    const loadPolicy = async () => {
      if (!id) { setHasError(true); setIsLoading(false); return; }
      setIsLoading(true);
      setHasError(false);
      try {
        const response = getAccessToken() ? await getPolicyDetailWithUser(id) : await getPolicyDetail(id);
        setPolicy(response);
        setBookmarked(!!getAccessToken() && response.userState === 'saved');

        // 연관 정책 로드
        if (response.categories?.length) {
          const category = response.categories[0] as 'youth_policy' | 'childcare_policy';
          const related = await getPolicies({ interest: category });
          const filtered = related.items.filter((p) => p.id !== id);
          const shuffled = [...filtered].sort(() => Math.random() - 0.5);
          setRelatedPolicies(shuffled.slice(0, 2));
        }
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

  // 섹션 스크롤 추적 - 모션 애니메이션 이후 연결
  useEffect(() => {
    if (!policy) return;
    let observer: IntersectionObserver;
    const timer = setTimeout(() => {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => { if (entry.isIntersecting) setActiveSection(entry.target.id); });
        },
        { rootMargin: '-80px 0px -60%', threshold: 0 }
      );
      Object.values(sectionRefs.current).forEach((ref) => { if (ref) observer.observe(ref); });
    }, 600);
    return () => { clearTimeout(timer); observer?.disconnect(); };
  }, [policy]);

  const handleCheckEligibility = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) return;
    try {
      const missingRequired = (policy?.requirements ?? []).filter((req) => req.isRequired && !eligibilityAnswers[req.key]);
      if (missingRequired.length > 0) {
        toast.error(`필수 항목을 모두 입력해주세요: ${missingRequired.map((r) => r.label ?? r.key).join(', ')}`);
        return;
      }
      const answers: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(eligibilityAnswers)) {
        if (value === '') continue;
        const req = policy?.requirements?.find((r) => r.key === key);
        if (req?.type === 'number') answers[key] = Number(value);
        else if (req?.type === 'boolean') answers[key] = value === 'true';
        else answers[key] = value;
      }
      const response = await checkEligibility(id, { answers });
      setEligibilityResult(response);
      toast.success('자격 확인이 완료되었습니다');
      setTimeout(() => { document.getElementById('evidence')?.scrollIntoView({ behavior: 'smooth' }); }, 300);
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : '자격 확인에 실패했습니다';
      toast.error(message);
    }
  };

  const handleBookmark = async () => {
    if (!id) return;
    if (!getAccessToken()) { toast.error('로그인이 필요합니다'); return; }
    const next = !bookmarked;
    try {
      if (next) await updateMyPolicyState(id, { state: 'saved' });
      else await removeMyPolicy(id);
      setBookmarked(next);
      toast.success(next ? '정책이 저장되었습니다' : '저장을 취소했습니다');
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : '저장에 실패했습니다';
      toast.error(message);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: policy?.title, text: policy?.shortDescription ?? policy?.description, url: window.location.href }); }
      catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('링크가 클립보드에 복사되었습니다');
    }
  };

  const handleRetry = () => setReloadKey((c) => c + 1);

  const rawCriteria = policy?.eligibilityInfo?.selectionCriteria?.trim();
  // 마크다운 기호, 공백, 불릿 제거 후 실제 텍스트가 있을 때만 표시
  const selectionCriteria = rawCriteria && rawCriteria.replace(/[\s\-*•·]/g, '').length > 0 ? rawCriteria : null;

  const sections = [
    { id: 'summary', label: '요약', icon: FileText },
    { id: 'target', label: '지원대상', icon: Target },
    ...(selectionCriteria ? [{ id: 'criteria', label: '선정기준', icon: ClipboardList }] : []),
    { id: 'evidence', label: '근거', icon: Info },
  ];

  if (isLoading) {
    return (
      <MainLayout>
        <div className="bg-[var(--muted)] py-8">
          <div className="container mx-auto px-4">
            <div className="bg-white rounded-2xl p-6 md:p-8 space-y-4">
              <div className="h-8 bg-[var(--muted)] rounded w-3/4 animate-pulse" />
              <div className="flex gap-2">
                <div className="h-6 bg-[var(--muted)] rounded w-20 animate-pulse" />
                <div className="h-6 bg-[var(--muted)] rounded w-24 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2"><PolicyDetailSkeleton /></div>
            <div className="lg:col-span-1">
              <div className="bg-white border border-[var(--border)] rounded-xl p-6 space-y-3">
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
          <EmptyState type="error" onAction={handleRetry} actionLabel="다시 시도" />
        </div>
      </MainLayout>
    );
  }

  const status = mapStatus(policy.endsAt, policy.isAlwaysOpen ?? false);
  const daysLeft = getDaysLeft(policy.endsAt);
  const supportContent = policy.eligibilityInfo?.supportContent ?? policy.description;

  return (
    <MainLayout>
      {/* Hero */}
      <div className="bg-white border-b border-[var(--border)]">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] mb-5 overflow-x-auto" aria-label="탐색 경로">
            <Link to="/policies" className="hover:text-[var(--accent)] transition-colors whitespace-nowrap">정책찾기</Link>
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate text-[var(--foreground)]">{policy.title}</span>
          </nav>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="max-w-4xl">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {status && <Badge variant={status}>{statusLabels[status]}</Badge>}
              <Badge>{policy.providerName ?? '공식 출처'}</Badge>
              {daysLeft !== null && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-600 border border-red-200">
                  <Clock className="h-3 w-3" />
                  D-{daysLeft}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-bold leading-snug mb-3 text-[var(--foreground)]">{policy.title}</h1>

            {/* Meta */}
            <PolicyMetaRow
              agency={policy.providerName}
              region={policy.regionCodes?.map((code) => regionLabels[code] ?? code).join(', ')}
              period={formatPolicyPeriod(policy.startsAt, policy.endsAt, policy.isAlwaysOpen)}
              periodClassName={!policy.isAlwaysOpen && !(policy.startsAt && policy.endsAt) ? 'text-red-500' : undefined}
            />

            {/* 혜택 하이라이트 */}
            {supportContent && (
              <div className="mt-4 flex items-start gap-3 px-4 py-3.5 bg-blue-50 rounded-xl border border-blue-100">
                <Award className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-blue-500 mb-0.5">지원 혜택</p>
                  <div className="prose prose-sm max-w-none text-blue-900 text-sm">
                    <ReactMarkdown remarkPlugins={[remarkBreaks, remarkGfm]}>{supportContent}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Sticky Section Nav */}
            <motion.nav
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="sticky top-20 z-10 bg-white/95 backdrop-blur-sm border border-[var(--border)] rounded-2xl p-2 shadow-sm"
              aria-label="섹션 네비게이션"
            >
              <div className="flex overflow-x-auto gap-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all duration-200 ${
                        activeSection === section.id
                          ? 'bg-[var(--accent)] text-white shadow-md'
                          : 'hover:bg-[var(--muted)] text-[var(--foreground)]'
                      }`}
                      onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      <Icon className="h-4 w-4" />
                      {section.label}
                    </button>
                  );
                })}
              </div>
            </motion.nav>

            {/* Summary */}
            <motion.section
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              id="summary"
              ref={(el) => { sectionRefs.current.summary = el; }}
              className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200"
              style={{ scrollMarginTop: '120px' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold">요약</h2>
              </div>
              <div className="prose prose-sm max-w-none text-[var(--muted-foreground)]">
                <ReactMarkdown remarkPlugins={[remarkBreaks, remarkGfm]}>{policy.shortDescription ?? policy.description ?? '요약 정보가 없습니다.'}</ReactMarkdown>
              </div>
            </motion.section>

            {/* Target */}
            <motion.section
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              id="target"
              ref={(el) => { sectionRefs.current.target = el; }}
              className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200"
              style={{ scrollMarginTop: '120px' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Target className="h-5 w-5 text-purple-600" />
                </div>
                <h2 className="text-xl font-semibold">지원대상</h2>
              </div>
              <div className="prose prose-sm max-w-none text-[var(--muted-foreground)]">
                <ReactMarkdown remarkPlugins={[remarkBreaks, remarkGfm]}>{getTargetText(policy)}</ReactMarkdown>
              </div>
            </motion.section>

            {/* Selection Criteria */}
            {selectionCriteria && (
              <motion.section
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                id="criteria"
                ref={(el) => { sectionRefs.current.criteria = el; }}
                className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200"
                style={{ scrollMarginTop: '120px' }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                    <ClipboardList className="h-5 w-5 text-orange-600" />
                  </div>
                  <h2 className="text-xl font-semibold">선정기준</h2>
                </div>
                <div className="prose prose-sm max-w-none text-[var(--foreground)]">
                  <ReactMarkdown remarkPlugins={[remarkBreaks, remarkGfm]}>{selectionCriteria}</ReactMarkdown>
                </div>
              </motion.section>
            )}

            {/* Eligibility Check */}
            <motion.section
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
              className={cn(
                'border rounded-2xl p-6 shadow-sm transition-colors duration-300',
                eligibilityResult?.result === 'conditional'
                  ? 'bg-amber-50 border-amber-200'
                  : eligibilityResult?.result === 'ineligible'
                    ? 'bg-rose-50 border-rose-200'
                    : 'bg-emerald-50 border-emerald-200',
              )}
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  eligibilityResult?.result === 'conditional' ? 'bg-amber-100' : eligibilityResult?.result === 'ineligible' ? 'bg-rose-100' : 'bg-emerald-100',
                )}>
                  {eligibilityResult?.result === 'conditional' || eligibilityResult?.result === 'ineligible'
                    ? <AlertTriangle className={cn('h-4 w-4', eligibilityResult.result === 'conditional' ? 'text-amber-600' : 'text-rose-600')} />
                    : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                </div>
                <div>
                  <h2 className={cn(
                    'text-base font-semibold',
                    eligibilityResult?.result === 'conditional' ? 'text-amber-900' : eligibilityResult?.result === 'ineligible' ? 'text-rose-900' : 'text-emerald-900',
                  )}>내가 맞는지 확인하기</h2>
                  <p className={cn(
                    'text-xs',
                    eligibilityResult?.result === 'conditional' ? 'text-amber-700/70' : eligibilityResult?.result === 'ineligible' ? 'text-rose-700/70' : 'text-emerald-700/70',
                  )}>간단한 정보를 입력하면 신청 가능 여부를 확인할 수 있어요</p>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {!showEligibilityForm && !eligibilityResult && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {getAccessToken() ? (
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-sm h-9 px-5"
                        onClick={() => {
                          const profile = getStoredUserProfile();
                          if (profile) {
                            const prefilled: Record<string, string> = {};
                            if (profile.age) prefilled['age'] = String(profile.age);
                            setEligibilityAnswers(prefilled);
                          }
                          setShowEligibilityForm(true);
                        }}
                      >
                        <Sparkles className="h-4 w-4 mr-1.5" />
                        지금 바로 확인하기
                      </Button>
                    ) : (
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-sm h-9 px-5" onClick={() => navigate('/login')}>
                        <Sparkles className="h-4 w-4 mr-1.5" />
                        로그인하고 자격 확인하기
                      </Button>
                    )}
                  </motion.div>
                )}

                {showEligibilityForm && !eligibilityResult && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleCheckEligibility}
                    className="space-y-3 bg-white/70 rounded-xl p-4 border border-emerald-200"
                  >
                    {(policy?.requirements ?? [])
                      .filter((req, i, arr) => arr.findIndex((r) => r.key === req.key) === i)
                      .filter((req) => req.key !== 'selection_criteria' && req.label !== '선정기준')
                      .map((req) => (
                        <div key={req.key}>
                          <label htmlFor={`req-${req.key}`} className="block mb-1.5 text-sm font-medium text-[var(--foreground)]">
                            {req.label ?? req.key}
                            {req.isRequired && <span className="text-[var(--destructive)] ml-1">*</span>}
                          </label>
                          {req.type === 'select' && req.options ? (
                            <select
                              id={`req-${req.key}`}
                              className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              value={eligibilityAnswers[req.key] ?? ''}
                              onChange={(e) => setEligibilityAnswers((prev) => ({ ...prev, [req.key]: e.target.value }))}
                            >
                              <option value="">선택하세요</option>
                              {req.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          ) : req.type === 'boolean' ? (
                            <div className="flex gap-2">
                              {(['true', 'false'] as const).map((val) => (
                                <button
                                  key={val} type="button"
                                  onClick={() => setEligibilityAnswers((prev) => ({ ...prev, [req.key]: val }))}
                                  className={`flex-1 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                                    eligibilityAnswers[req.key] === val
                                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
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
                              className="text-sm h-9"
                            />
                          )}
                        </div>
                      ))}
                    <div className="flex gap-2 pt-1">
                      <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-sm h-9">확인하기</Button>
                      <Button type="button" variant="ghost" className="text-sm h-9" onClick={() => setShowEligibilityForm(false)}>취소</Button>
                    </div>
                  </motion.form>
                )}

                {eligibilityResult?.result === 'eligible' && (
                  <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                    className="bg-emerald-50 border border-emerald-200 rounded-xl p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-emerald-900 mb-1">신청 가능합니다 🎉</p>
                        <p className="text-xs text-emerald-700 mb-3">{eligibilityResult.explanation}</p>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-xs h-8" size="sm"
                          onClick={() => window.open(getSourceUrl(eligibilityResult.policy.applicationUrl ?? policy.applicationUrl ?? policy.sourceUrl, policy.title), '_blank', 'noopener,noreferrer')}
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />신청하러 가기
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {eligibilityResult?.result === 'conditional' && (
                  <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                    className="bg-amber-50 border border-amber-200 rounded-xl p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertTriangle className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-amber-900 mb-1">추가 확인이 필요합니다</p>
                        <p className="text-xs text-amber-700 mb-3">{eligibilityResult.explanation}</p>
                        <Button size="sm" variant="secondary" className="text-xs h-8" onClick={() => window.open(getSourceUrl(policy.sourceUrl, policy.title), '_blank', 'noopener,noreferrer')}>
                          원문 보기
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {eligibilityResult?.result === 'ineligible' && (
                  <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                    className="bg-rose-50 border border-rose-200 rounded-xl p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertTriangle className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-rose-900 mb-1">현재 조건으로는 신청이 어렵습니다</p>
                        <p className="text-xs text-rose-700">{eligibilityResult.explanation}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>

            {/* Evidence */}
            <motion.section
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
              id="evidence"
              ref={(el) => { sectionRefs.current.evidence = el; }}
              className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200"
              style={{ scrollMarginTop: '120px' }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Info className="h-5 w-5 text-amber-600" />
                </div>
                <h2 className="text-xl font-semibold">근거 자료</h2>
              </div>
              <div className="space-y-3">
                {getEvidence(policy, eligibilityResult, eligibilityAnswers).map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + index * 0.05 }}
                    className="bg-[var(--muted)] rounded-xl p-4 hover:bg-amber-50 transition-colors duration-200 border border-transparent hover:border-amber-200"
                  >
                    <div className="prose prose-sm max-w-none mb-2">
                      <ReactMarkdown remarkPlugins={[remarkBreaks, remarkGfm]}>{item.text}</ReactMarkdown>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)] flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />출처: {item.source}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* 원문 */}
              <div className="mt-6 pt-6 border-t border-[var(--border)]">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-[var(--accent)] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">원문 확인하기</h4>
                    <p className="text-sm text-[var(--muted-foreground)] mb-1">이 정보는 공공데이터를 바탕으로 정리된 참고 자료예요.</p>
                    <p className="text-sm text-[var(--muted-foreground)] mb-4">실제 신청 전에는 꼭 공식 출처에서 최신 내용을 확인해 주세요.</p>
                    <a
                      href={getSourceUrl(policy.sourceUrl, policy.title)}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[var(--accent)] hover:underline font-medium"
                    >
                      원문 보러가기<ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* 연관 정책 */}
            {relatedPolicies.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
                className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                  </div>
                  <h2 className="text-xl font-semibold">이런 정책도 있어요</h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 items-stretch">
                  {relatedPolicies.map((related) => (
                    <PolicyCard key={related.id} {...related} className="h-full" />
                  ))}
                </div>
              </motion.section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1" aria-label="빠른 액션">
            <div className="sticky top-24 space-y-4">
              {/* 통계 카드 */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                className="bg-violet-50 border border-violet-100 rounded-2xl p-5 shadow-sm"
              >
                <h3 className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-3">정책 현황</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                      <Eye className="h-4 w-4" />
                      <span>조회수</span>
                    </div>
                    <span className="font-semibold text-sm text-[var(--foreground)]">{mockViews.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                      <CalendarDays className="h-4 w-4" />
                      <span>기간</span>
                    </div>
                    {daysLeft !== null ? (
                      <span className="font-bold text-sm text-rose-500">D-{daysLeft}</span>
                    ) : policy.isAlwaysOpen ? (
                      <span className="font-semibold text-sm text-emerald-600">상시모집</span>
                    ) : (
                      <span className="font-semibold text-sm text-[var(--muted-foreground)]">기간 미정</span>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                className="bg-violet-50 border border-violet-100 rounded-2xl p-5 space-y-3 shadow-sm"
              >
                <Button
                  className="w-full gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm"
                  onClick={() => window.open(getSourceUrl(policy.applicationUrl ?? policy.sourceUrl, policy.title), '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="h-4 w-4" />지금 신청하기
                </Button>
                <Button variant="ghost" className="w-full gap-2" onClick={handleBookmark} aria-pressed={bookmarked}>
                  <Bookmark className={bookmarked ? 'fill-current' : ''} />
                  {bookmarked ? '저장됨' : '저장하기'}
                </Button>
                <Button variant="ghost" className="w-full gap-2" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />공유하기
                </Button>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed px-1 pt-1">
                  이 정보는 참고용이에요. 신청 전 공식 출처에서 꼭 확인해 주세요.
                </p>
              </motion.div>
            </div>
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}

export default PolicyDetailPage;
