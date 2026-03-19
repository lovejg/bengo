import { Link } from 'react-router';
import { Bookmark, ArrowRight } from 'lucide-react';
import { Badge } from '../atoms/Badge';
import { PolicyMetaRow } from '../molecules/PolicyMetaRow';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';
import { useState } from 'react';
import type { PolicyListItem } from '../../types';

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

function formatPolicyPeriod(startsAt: string | null, endsAt: string | null, isAlwaysOpen: boolean): string {
  if (isAlwaysOpen) return '상시모집';
  if (startsAt && endsAt) return `${startsAt.slice(0, 10)} ~ ${endsAt.slice(0, 10)}`;
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
  fitScore,
  categories = [],
  bookmarked,
  onBookmark,
  className,
  applicationStatus,
}: PolicyCardProps) {
  const [isBookmarkAnimating, setIsBookmarkAnimating] = useState(false);
  const status = getDisplayStatus(applicationStatus, endsAt, isAlwaysOpen);
  const eligibility = getEligibility(fitScore ?? null);

  const borderColors = {
    recruiting: 'border-emerald-200 hover:border-emerald-400 hover:shadow-emerald-500/15',
    always: 'border-blue-200 hover:border-blue-400 hover:shadow-blue-500/15',
    closed: 'border-gray-300 hover:border-gray-400 hover:shadow-gray-500/10',
  };

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsBookmarkAnimating(true);
    setTimeout(() => setIsBookmarkAnimating(false), 600);
    onBookmark?.();
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
    <Link to={`/policies/${id}`} className="block h-full">
      <article
        className={cn(
          'group relative bg-white border rounded-3xl p-6 sm:p-8 h-full flex flex-col',
          'shadow-sm hover:shadow-xl',
          status ? borderColors[status] : 'border-amber-200 hover:border-amber-400 hover:shadow-amber-500/15',
          'hover:-translate-y-2',
          'transition-all duration-300 ease-out',
          className
        )}
        aria-label={title}
      >
        <div className="flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h3 className="group-hover:text-[var(--accent)] transition-colors duration-200 line-clamp-2 mb-3 leading-snug">
              {title}
            </h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {status && (
                <Badge variant={status} aria-label={`모집 상태: ${statusLabels[status]}`}>
                  {statusLabels[status]}
                </Badge>
              )}
              {eligibility && (
                <Badge
                  variant={eligibilityVariants[eligibility]}
                  aria-label={`신청 가능성: ${eligibilityLabels[eligibility]}`}
                >
                  {eligibilityLabels[eligibility]}
                </Badge>
              )}
              <Badge variant="default" aria-label={`출처: ${providerName}`}>{providerName}</Badge>
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant="default"
                  className="bg-blue-50 text-blue-700 border-blue-200"
                  aria-label={`카테고리: ${categoryLabels[category] || category}`}
                >
                  {categoryLabels[category] || category}
                </Badge>
              ))}
            </div>
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

        <p className="text-[var(--muted-foreground)] text-sm line-clamp-2 mb-5 leading-relaxed">
          {shortDescription || '요약 정보가 없습니다.'}
        </p>
        </div>

        <div className="flex items-end justify-between gap-2">
          <PolicyMetaRow
            agency={providerName}
            region={regionCodes.map((code) => regionLabels[code] ?? code).join(', ')}
            period={formatPolicyPeriod(startsAt, endsAt, isAlwaysOpen)}
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
