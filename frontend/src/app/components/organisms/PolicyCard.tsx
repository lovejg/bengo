import { Link, useLocation } from 'react-router';
import { Bookmark, ArrowRight } from 'lucide-react';
import { Badge } from '../atoms/Badge';
import { PolicyMetaRow } from '../molecules/PolicyMetaRow';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';
import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { PolicyListItem } from '../../types';

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
          className="fixed flex flex-col gap-1.5 bg-white border border-[var(--border)] rounded-xl px-3 py-2.5 shadow-lg z-[9999] pointer-events-none whitespace-nowrap"
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

const regionLabels: Record<string, string> = {
  seoul: '서울',
  seoul_gangnam: '서울 강남구',
  seoul_mapo: '서울 마포구',
  seoul_songpa: '서울 송파구',
};

function formatPolicyPeriod(startsAt: string | null, endsAt: string | null, isAlwaysOpen: boolean, periodRaw?: string | null): string {
  if (isAlwaysOpen) return '상시모집';
  if (startsAt && endsAt) return `${startsAt.slice(0, 10)} ~ ${endsAt.slice(0, 10)}`;
  if (periodRaw) return periodRaw;
  return '기간확인불가';
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
  bookmarked,
  onBookmark,
  className,
  applicationStatus,
}: PolicyCardProps) {
  const location = useLocation();
  const [isBookmarkAnimating, setIsBookmarkAnimating] = useState(false);
  const status = getDisplayStatus(applicationStatus, endsAt, isAlwaysOpen);
  const eligibility = getEligibility(fitScore ?? null);

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

  const statusLabels = {
    recruiting: '모집중',
    always: '상시',
    closed: '마감',
  };

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
  };

  return (
    <Link to={`/policies/${id}`} className="block h-full" onClick={handleCardClick}>
      <article
        className={cn(
          'group relative border rounded-3xl p-6 sm:p-8 h-full flex flex-col',
          'shadow-sm hover:shadow-xl',
          status ? borderColors[status] : periodRaw ? 'border-amber-500 hover:border-amber-600 hover:shadow-amber-500/25 bg-amber-50/40' : 'border-red-500 hover:border-red-600 hover:shadow-red-500/30 bg-red-100/70',
          'hover:-translate-y-2',
          'transition-all duration-300 ease-out',
          className
        )}
        aria-label={title}
      >
        <div className="flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h3 className="group-hover:text-[var(--accent)] transition-colors duration-200 line-clamp-2 leading-snug mb-3 min-h-[2.75em]">
              {title}
            </h3>
            <BadgeRow badges={[
              ...(status ? [{ key: 'status', label: statusLabels[status], el: <Badge variant={status}>{statusLabels[status]}</Badge> }] : []),
              { key: 'provider', label: providerName, el: <Badge variant="default"><span className="max-w-[120px] truncate block">{providerName}</span></Badge> },
              ...categories.map((c) => ({ key: c, label: categoryLabels[c] || c, el: <Badge variant="default" className="bg-blue-50 text-blue-700 border-blue-200">{categoryLabels[c] || c}</Badge> })),
              ...(eligibility ? [{ key: 'eligibility', label: eligibilityLabels[eligibility], el: <Badge variant={eligibilityVariants[eligibility]}>{eligibilityLabels[eligibility]}</Badge> }] : []),
            ]} />
          </div>
          {onBookmark && (
            <motion.button
              onClick={handleBookmarkClick}
              className="flex-shrink-0 p-2.5 hover:bg-[var(--muted)] rounded-xl transition-all duration-200"
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
            region={regionCodes.map((code) => regionLabels[code] ?? code).join(', ')}
            period={formatPolicyPeriod(startsAt, endsAt, isAlwaysOpen, periodRaw)}
            periodClassName={!isAlwaysOpen && !(startsAt && endsAt) ? 'text-red-500' : undefined}
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
