import { Link, useLocation } from 'react-router';
import { Bookmark, ArrowRight } from 'lucide-react';
import { Badge } from '../atoms/Badge';
import { PolicyMetaRow } from '../molecules/PolicyMetaRow';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';
import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { PolicyListItem } from '../../types';
import { formatRegionCodes } from '../../lib/regions';

interface BadgeItem { key: string; label: string; el: React.ReactNode; }

function BadgeRow({ badges }: { badges: BadgeItem[] }) {
  const measureRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const plusRef = useRef<HTMLSpanElement>(null);
  const [maxVisible, setMaxVisible] = useState(badges.length);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const measureEl = measureRef.current;
      if (!container || !measureEl) return;
      const spans = Array.from(measureEl.querySelectorAll<HTMLElement>('[data-b]'));
      const containerW = container.clientWidth;
      const GAP = 8;
      const PLUS_W = 28;
      let w = 0, count = 0;
      for (let i = 0; i < spans.length; i++) {
        const sw = spans[i].offsetWidth + (i > 0 ? GAP : 0);
        if (w + sw + (i === spans.length - 1 ? 0 : PLUS_W + GAP) > containerW) break;
        w += sw; count++;
      }
      setMaxVisible(Math.max(1, count));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [badges.length]);

  const hiddenBadges = badges.slice(maxVisible);

  const showTooltip = () => {
    const el = plusRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setTooltipPos({ x: rect.right + 8, y: rect.top + rect.height / 2 });
  };

  const hideTooltip = () => setTooltipPos(null);

  useEffect(() => {
    const onScroll = () => setTooltipPos(null);
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, []);

  return (
    <div ref={containerRef} className="relative flex gap-2 mb-3 items-center h-6">
      <div ref={measureRef} className="absolute invisible flex gap-2 items-center pointer-events-none" aria-hidden="true">
        {badges.map(b => <span key={b.key} data-b className="flex-shrink-0">{b.el}</span>)}
      </div>
      {badges.slice(0, maxVisible).map(b => (
        <span key={b.key} className="flex-shrink-0">{b.el}</span>
      ))}
      {hiddenBadges.length > 0 && (
        <span
          ref={plusRef}
          className="text-xs text-[var(--muted-foreground)] font-medium cursor-default select-none flex-shrink-0"
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
        >
          +{hiddenBadges.length}
        </span>
      )}
      {tooltipPos && hiddenBadges.length > 0 && createPortal(
        <div
          className="fixed flex flex-col gap-1.5 bg-white dark:bg-[rgba(15,23,42,0.95)] dark:backdrop-blur-xl border border-[var(--border)] dark:border-[var(--border-default)] rounded-xl px-3 py-2.5 shadow-lg z-[9999] pointer-events-none whitespace-nowrap"
          style={{ left: tooltipPos.x, top: tooltipPos.y, transform: 'translateY(-50%)' }}
        >
          {hiddenBadges.map(b => <span key={b.key}>{b.el}</span>)}
        </div>,
        document.body
      )}
    </div>
  );
}

export interface PolicyCardProps extends PolicyListItem {
  applicationStatus?: 'upcoming' | 'recruiting' | 'closed';
  bookmarked?: boolean;
  onBookmark?: () => void;
  className?: string;
}

function formatPolicyPeriod(startsAt: string | null, endsAt: string | null, isAlwaysOpen: boolean, periodRaw?: string | null): string {
  if (isAlwaysOpen) return '상시모집';
  if (startsAt && endsAt) return `${startsAt.slice(0, 10)} ~ ${endsAt.slice(0, 10)}`;
  if (periodRaw) return periodRaw;
  return '기간확인불가';
}

function getDaysUntilEnd(endsAt: string | null): number | null {
  if (!endsAt) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(endsAt);
  deadline.setHours(0, 0, 0, 0);

  return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getUrgentDeadlineLabel(endsAt: string | null): string | null {
  const daysLeft = getDaysUntilEnd(endsAt);
  if (daysLeft === null || daysLeft < 0 || daysLeft > 7) return null;
  return daysLeft === 0 ? 'D-day' : `D-${daysLeft}`;
}

function getDisplayStatus(
  applicationStatus: PolicyCardProps['applicationStatus'],
  endsAt: string | null,
  isAlwaysOpen: boolean,
): 'recruiting' | 'always' | 'closed' | null {
  if (applicationStatus) {
    if (applicationStatus === 'upcoming') return 'always';
    return applicationStatus;
  }

  if (isAlwaysOpen) return 'always';
  if (!endsAt) return null;
  return new Date(endsAt).getTime() < Date.now() ? 'closed' : 'recruiting';
}

function getEligibility(fitScore: number | null): 'eligible' | 'needsReview' | 'infoLacking' | undefined {
  if (fitScore === null) {
    return 'infoLacking';
  }

  if (fitScore >= 80) {
    return 'eligible';
  }

  if (fitScore >= 50) {
    return 'needsReview';
  }

  return 'infoLacking';
}

export function PolicyCard({
  id,
  title,
  shortDescription,
  providerName,
  regionCodes,
  startsAt,
  endsAt,
  isAlwaysOpen,
  periodRaw,
  fitScore,
  categories = [],
  policyType,
  sourceType,
  bookmarked,
  onBookmark,
  className,
  applicationStatus,
}: PolicyCardProps) {
  const location = useLocation();
  const [isBookmarkAnimating, setIsBookmarkAnimating] = useState(false);
  const status = getDisplayStatus(applicationStatus, endsAt, isAlwaysOpen);
  const policyCardStatus = status === 'recruiting'
    ? 'open'
    : status === 'always'
      ? 'always'
      : status === 'closed'
        ? 'closed'
        : periodRaw
          ? 'check'
          : 'unknown';
  const eligibility = getEligibility(fitScore ?? null);
  const urgentDeadlineLabel = status === 'recruiting' ? getUrgentDeadlineLabel(endsAt) : null;

  const borderColors = {
    recruiting: 'border-emerald-500 hover:border-emerald-600 hover:shadow-emerald-500/25 bg-emerald-50/40',
    always: 'border-blue-500 hover:border-blue-600 hover:shadow-blue-500/25 bg-blue-50/40',
    closed: 'border-gray-500 hover:border-gray-600 hover:shadow-gray-500/20 bg-gray-50/60',
  };

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsBookmarkAnimating(true);
    setTimeout(() => setIsBookmarkAnimating(false), 600);
    onBookmark?.();
  };

  const handleCardClick = () => {
    if (location.pathname === '/policies') {
      const key = `scroll:${location.pathname}${location.search}`;
      window.sessionStorage.setItem(key, String(window.scrollY));
    }
  };

  const policyStatusLabels = {
    open: '모집중',
    always: '상시',
    check: '정책별 확인',
    unknown: '기간확인불가',
    closed: '마감',
  } as const;
  const policyStatusVariants = {
    open: 'recruiting',
    always: 'always',
    check: 'default',
    unknown: 'default',
    closed: 'closed',
  } as const;

  const eligibilityLabels = {
    eligible: '가능성 높음',
    needsReview: '추가 확인 필요',
    infoLacking: '정보 부족',
  };

  const eligibilityVariants = {
    eligible: 'eligible' as const,
    needsReview: 'needsReview' as const,
    infoLacking: 'default' as const,
  };

  const categoryLabels: Record<string, string> = {
    youth_policy: '청년정책',
    childcare_policy: '육아정책',
    senior_policy: '노인정책',
    disability_policy: '장애인정책',
  };

  const policyTypeLabels = {
    application: '신청형',
    info: '정보형',
  } as const;

  const sourceTypeLabels = {
    official: '공식',
    blog: '비공식',
    none: '출처없음',
  } as const;

  return (
    <Link to={`/policies/${id}`} className="block h-full cursor-pointer" onClick={handleCardClick}>
      <article
        data-policy-card
        data-policy-status={policyCardStatus}
        data-policy-urgent={urgentDeadlineLabel ? 'true' : undefined}
        className={cn(
          'group relative border rounded-2xl p-5 sm:p-7 h-full flex flex-col',
          'shadow-sm hover:shadow-xl',
          'dark:bg-[rgba(15,23,42,0.72)] dark:backdrop-blur-md dark:shadow-[0_18px_48px_rgba(0,0,0,0.22)] dark:hover:bg-[rgba(30,41,59,0.86)] dark:hover:shadow-[0_24px_60px_rgba(0,0,0,0.32)]',
          status ? borderColors[status] : periodRaw ? 'border-[#00D9D9] hover:border-[#00BDBD] hover:shadow-[#00FFFF]/25 bg-[#00FFFF]/10' : 'border-amber-500 hover:border-amber-600 hover:shadow-amber-500/25 bg-amber-50/60',
          urgentDeadlineLabel && 'border-red-500 hover:border-red-600',
          'hover:-translate-y-1',
          'transition-all duration-300 ease-out',
          className
        )}
        aria-label={title}
      >
        {urgentDeadlineLabel && (
          <div className="absolute right-5 top-5 text-sm font-bold text-red-600" aria-label={`마감 임박 ${urgentDeadlineLabel}`}>
            {urgentDeadlineLabel}
          </div>
        )}
        <div className="flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h3 className={cn('group-hover:text-[var(--accent)] transition-colors duration-200 line-clamp-2 leading-snug mb-3 min-h-[2.75em]', urgentDeadlineLabel && 'pr-14')}>
              {title}
            </h3>
            <BadgeRow badges={[
              {
                key: 'status',
                label: policyStatusLabels[policyCardStatus],
                el: (
                  <Badge
                    variant={policyStatusVariants[policyCardStatus]}
                    className={`policy-status-badge status-${policyCardStatus}`}
                  >
                    {policyStatusLabels[policyCardStatus]}
                  </Badge>
                ),
              },
              { key: 'provider', label: providerName, el: <Badge variant="default"><span className="max-w-[120px] truncate block">{providerName}</span></Badge> },
              ...(policyType ? [{ key: `type-${policyType}`, label: policyTypeLabels[policyType], el: <Badge variant="default" className={policyType === 'application' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-orange-50 text-orange-700 border-orange-200'}>{policyTypeLabels[policyType]}</Badge> }] : []),
              ...(sourceType ? [{ key: `source-${sourceType}`, label: sourceTypeLabels[sourceType], el: <Badge variant="default" className={sourceType === 'official' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : sourceType === 'blog' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-700 border-slate-200'}>{sourceTypeLabels[sourceType]}</Badge> }] : []),
              ...categories.map((c) => ({ key: c, label: categoryLabels[c] || c, el: <Badge variant="default" className="bg-blue-50 text-blue-700 border-blue-200">{categoryLabels[c] || c}</Badge> })),
              ...(eligibility ? [{ key: 'eligibility', label: eligibilityLabels[eligibility], el: <Badge variant={eligibilityVariants[eligibility]}>{eligibilityLabels[eligibility]}</Badge> }] : []),
            ]} />
          </div>
          {onBookmark && (
            <motion.button
              onClick={handleBookmarkClick}
              className="flex-shrink-0 p-2.5 hover:bg-[var(--muted)] dark:hover:bg-[rgba(30,41,59,0.6)] rounded-xl transition-all duration-200 cursor-pointer"
              aria-label={bookmarked ? '저장 취소' : '정책 저장'}
              aria-pressed={bookmarked}
              whileTap={{ scale: 0.9 }}
            >
              <motion.div
                animate={isBookmarkAnimating ? { scale: [1, 1.3, 1], rotate: [0, -10, 10, 0] } : {}}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              >
                <Bookmark
                  className={cn('h-5 w-5 transition-all duration-200', bookmarked ? 'fill-[var(--accent)] text-[var(--accent)]' : 'text-[var(--muted-foreground)] group-hover:text-[var(--accent)]')}
                  aria-hidden="true"
                />
              </motion.div>
            </motion.button>
          )}
        </div>

        <p className="text-[var(--muted-foreground)] text-sm leading-relaxed mb-5">
          {shortDescription || '요약 정보가 없습니다.'}
        </p>
        </div>

        <div className="flex items-end justify-between gap-2">
          <PolicyMetaRow
            region={formatRegionCodes(regionCodes)}
            period={formatPolicyPeriod(startsAt, endsAt, isAlwaysOpen, periodRaw)}
            periodClassName={!isAlwaysOpen && !(startsAt && endsAt) ? periodRaw ? 'text-[#007A7A]' : 'text-amber-600' : undefined}
          />
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0" aria-hidden="true">
            <span className="text-xs font-medium text-[var(--accent)]">자세히</span>
            <ArrowRight className="h-4 w-4 text-[var(--accent)] group-hover:translate-x-0.5 transition-transform duration-200" />
          </div>
        </div>
      </article>
    </Link>
  );
}
