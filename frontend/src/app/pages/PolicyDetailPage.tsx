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
import { MainLayout } from '../components/templates/MainLayout';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Input } from '../components/atoms/Input';
import { PolicyMetaRow } from '../components/molecules/PolicyMetaRow';
import { PolicyDetailSkeleton } from '../components/molecules/PolicyDetailSkeleton';
import { EmptyState } from '../components/molecules/EmptyState';

interface PolicyDetail {
  id: string | undefined;
  title: string;
  agency: string;
  region: string;
  period: string;
  status: 'recruiting' | 'always' | 'closed';
  source: string;
  sourceUrl: string;
  summary: string;
  details: {
    target: string;
    criteria: string;
    benefits: string;
    applicationPeriod: string;
    applicationMethod: string;
  };
  evidence: Array<{ text: string; source: string }>;
}

const statusLabels: Record<string, string> = {
  recruiting: '모집중',
  always: '상시모집',
  closed: '마감',
};

export function PolicyDetailPage() {
  const { id } = useParams();
  const [bookmarked, setBookmarked] = useState(false);
  const [showEligibilityForm, setShowEligibilityForm] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<'eligible' | 'notEligible' | 'needsReview' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [policy, setPolicy] = useState<PolicyDetail | null>(null);

  useEffect(() => {
    const loadPolicy = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        // Mock data
        setPolicy({
          id,
          title: '청년 월세 지원 사업',
          agency: '서울시 주택정책실',
          region: '서울 전역',
          period: '2026.01.01 ~ 2026.12.31',
          status: 'recruiting' as const,
          source: '서울청년몽땅',
          sourceUrl: 'https://example.com/policy',
          summary: '만 19~34세 청년에게 월 최대 20만원, 최대 12개월간 월세를 지원합니다.',
          details: {
            target: '만 19~34세 서울시 거주 청년 중 무주택자',
            criteria: '중위소득 150% 이하, 보증금 5천만원·월세 60만원 이하 거주자',
            benefits: '월 최대 20만원 (최대 12개월)',
            applicationPeriod: '2026년 1월 1일 ~ 12월 31일',
            applicationMethod: '서울주거포털(http://housing.seoul.go.kr)에서 온라인 신청',
          },
          evidence: [
            {
              text: '만 19세 이상 34세 이하의 청년이 대상입니다.',
              source: '지원 대상 기준 (공고문 p.2)',
            },
            {
              text: '중위소득 150% 이하 가구에 한하여 지원합니다.',
              source: '소득 기준 (공고문 p.3)',
            },
            {
              text: '월세 60만원 이하 거주자만 신청 가능합니다.',
              source: '주거 조건 (공고문 p.4)',
            },
          ],
        });
      } catch (error) {
        setHasError(true);
        toast.error('정책 정보를 불러오는데 실패했습니다');
      } finally {
        setIsLoading(false);
      }
    };

    loadPolicy();
  }, [id]);

  const handleCheckEligibility = (e: React.FormEvent) => {
    e.preventDefault();
    setEligibilityResult('eligible');
    toast.success('자격 확인이 완료되었습니다');
  };

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    toast.success(bookmarked ? '저장을 취소했습니다' : '정책이 저장되었습니다');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: policy?.title,
          text: policy?.summary,
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
    window.location.reload();
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
                  <Badge variant={policy.status}>{statusLabels[policy.status]}</Badge>
                  <Badge>{policy.source}</Badge>
                </div>
                <PolicyMetaRow agency={policy.agency} region={policy.region} period={policy.period} />
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
              <p className="text-[var(--muted-foreground)] leading-relaxed text-sm sm:text-base">{policy.summary}</p>
            </section>

            {/* Target */}
            <section id="target" className="bg-white border border-[var(--border)] rounded-xl p-4 sm:p-6" style={{ scrollMarginTop: '100px' }}>
              <h3 className="mb-4 text-lg sm:text-xl">지원대상</h3>
              <p className="text-[var(--muted-foreground)] leading-relaxed text-sm sm:text-base">{policy.details.target}</p>
            </section>

            {/* Criteria */}
            <section id="criteria" className="bg-white border border-[var(--border)] rounded-xl p-4 sm:p-6" style={{ scrollMarginTop: '100px' }}>
              <h3 className="mb-4 text-lg sm:text-xl">선정기준</h3>
              <p className="text-[var(--muted-foreground)] leading-relaxed text-sm sm:text-base">{policy.details.criteria}</p>
            </section>

            {/* Benefits */}
            <section className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6" style={{ scrollMarginTop: '100px' }}>
              <h3 className="mb-4 text-lg sm:text-xl">지원 혜택</h3>
              <p className="text-lg">{policy.details.benefits}</p>
            </section>

            {/* Application */}
            <section id="application" className="bg-white border border-[var(--border)] rounded-xl p-4 sm:p-6" style={{ scrollMarginTop: '100px' }}>
              <h3 className="mb-4 text-lg sm:text-xl">신청 방법</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium">신청 기간: </span>
                  <span className="text-[var(--muted-foreground)]">{policy.details.applicationPeriod}</span>
                </div>
                <div>
                  <span className="font-medium">신청 방법: </span>
                  <span className="text-[var(--muted-foreground)]">{policy.details.applicationMethod}</span>
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
                <Button onClick={() => setShowEligibilityForm(true)}>자격 확인하기</Button>
              )}

              {showEligibilityForm && !eligibilityResult && (
                <form onSubmit={handleCheckEligibility} className="space-y-4">
                  <div>
                    <label htmlFor="age-input" className="block mb-2">나이</label>
                    <Input id="age-input" type="number" placeholder="예: 28" aria-label="나이 입력" />
                  </div>
                  <div>
                    <label htmlFor="income-input" className="block mb-2">
                      월 소득{' '}
                      <span className="text-sm text-[var(--muted-foreground)]">(중위소득 기준)</span>
                    </label>
                    <Input id="income-input" type="number" placeholder="예: 250" aria-label="월 소득 입력" />
                  </div>
                  <div>
                    <label htmlFor="rent-input" className="block mb-2">월세 금액</label>
                    <Input id="rent-input" type="number" placeholder="예: 50" aria-label="월세 금액 입력" />
                  </div>
                  <Button type="submit">확인하기</Button>
                </form>
              )}

              {eligibilityResult === 'eligible' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6" role="alert">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <h4 className="text-emerald-900 mb-2">신청 가능합니다!</h4>
                      <p className="text-emerald-700 text-sm mb-4">
                        입력하신 정보로 볼 때, 이 정책의 신청 자격을 충족합니다.
                      </p>
                      <Button size="sm">신청하러 가기</Button>
                    </div>
                  </div>
                </div>
              )}

              {eligibilityResult === 'needsReview' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6" role="alert">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <h4 className="text-amber-900 mb-2">추가 확인이 필요합니다</h4>
                      <p className="text-amber-700 text-sm mb-4">
                        일부 조건이 명확하지 않습니다. 원문을 확인하시거나 해당 기관에 문의해주세요.
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary">
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
            </section>

            {/* Evidence */}
            <section id="evidence" className="bg-white border border-[var(--border)] rounded-xl p-4 sm:p-6">
              <h3 className="mb-4 text-lg sm:text-xl">근거 자료</h3>
              <div className="space-y-3">
                {policy.evidence.map((item: any, index: number) => (
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
                    href={policy.sourceUrl}
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
                <Button className="w-full gap-2">
                  <ExternalLink className="h-4 w-4" />
                  신청하러 가기
                </Button>
                <Button variant="secondary" className="w-full gap-2">
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