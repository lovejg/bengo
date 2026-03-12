import { Link, useNavigate } from 'react-router';
import { Bookmark, ExternalLink } from 'lucide-react';
import { Badge } from '../atoms/Badge';
import { PolicyMetaRow } from '../molecules/PolicyMetaRow';
import { cn } from '../../lib/utils';
import { getAccessToken } from '../../api/client';
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

function formatPolicyPeriod(startsAt: string | null, endsAt: string | null) {
  if (!startsAt && !endsAt) {
    return '상시 모집';
  }

  if (startsAt && endsAt) {
    return `${startsAt.slice(0, 10)} ~ ${endsAt.slice(0, 10)}`;
  }

  return startsAt ? `${startsAt.slice(0, 10)}부터` : `${endsAt?.slice(0, 10)}까지`;
}

function getDisplayStatus(
  applicationStatus: PolicyCardProps['applicationStatus'],
  endsAt: string | null,
): 'recruiting' | 'always' | 'closed' {
  if (applicationStatus) {
    if (applicationStatus === 'upcoming') {
      return 'always';
    }

    return applicationStatus;
  }

  if (!endsAt) {
    return 'always';
  }

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
  fitScore,
  categories = [],
  bookmarked,
  onBookmark,
  className,
  applicationStatus,
}: PolicyCardProps) {
  const navigate = useNavigate();
  const status = getDisplayStatus(applicationStatus, endsAt);
  const eligibility = getEligibility(fitScore ?? null);

  const handleClick = (e: React.MouseEvent) => {
    if (!getAccessToken()) {
      e.preventDefault();
      navigate('/login');
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
    <Link to={`/policies/${id}`} onClick={handleClick}>
      <article
        className={cn(
          'group relative bg-white border border-[var(--border)] rounded-2xl p-6 sm:p-7',
          'hover:border-[var(--accent)] hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1',
          'transition-all duration-300',
          className
        )}
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h3 className="group-hover:text-[var(--accent)] transition-colors duration-200 line-clamp-2 mb-3 leading-snug">
              {title}
            </h3>
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant={status} aria-label={`모집 상태: ${statusLabels[status]}`}>
                {statusLabels[status]}
              </Badge>
              {eligibility && (
                <Badge 
                  variant={eligibilityVariants[eligibility]}
                  aria-label={`신청 가능성: ${eligibilityLabels[eligibility]}`}
                >
                  {eligibilityLabels[eligibility]}
                </Badge>
              )}
              <Badge variant="default" aria-label={`출처: ${providerName}`}>{providerName}</Badge>
              <div className="flex-1"></div>
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
            <button
              onClick={(e) => {
                e.preventDefault();
                onBookmark();
              }}
              className="flex-shrink-0 p-2.5 hover:bg-[var(--muted)] rounded-xl transition-all duration-200 active:scale-95"
              aria-label={bookmarked ? '저장 취소' : '정책 저장'}
              aria-pressed={bookmarked}
            >
              <Bookmark
                className={cn('h-5 w-5 transition-all duration-200', bookmarked ? 'fill-[var(--accent)] text-[var(--accent)]' : 'text-[var(--muted-foreground)] group-hover:text-[var(--accent)]')}
                aria-hidden="true"
              />
            </button>
          )}
        </div>

        <p className="text-[var(--muted-foreground)] text-sm line-clamp-2 mb-5 leading-relaxed">
          {shortDescription || '요약 정보가 없습니다.'}
        </p>

        <PolicyMetaRow
          agency={providerName}
          region={regionCodes.map((code) => regionLabels[code] ?? code).join(', ')}
          period={formatPolicyPeriod(startsAt, endsAt)}
        />

        <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-200" aria-hidden="true">
          <ExternalLink className="h-4 w-4 text-[var(--accent)]" />
        </div>
      </article>
    </Link>
  );
}
