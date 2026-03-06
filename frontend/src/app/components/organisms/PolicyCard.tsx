import { Link } from 'react-router';
import { Bookmark, ExternalLink } from 'lucide-react';
import { Badge } from '../atoms/Badge';
import { PolicyMetaRow } from '../molecules/PolicyMetaRow';
import { cn } from '../../lib/utils';

export interface PolicyCardProps {
  id: string;
  title: string;
  summary: string;
  agency: string;
  region: string;
  period: string;
  status: 'recruiting' | 'always' | 'closed';
  eligibility?: 'eligible' | 'needsReview' | 'infoLacking';
  source: 'SSIS' | '온통청년' | '서울청년몽땅' | '크롤링';
  categories?: string[]; // 카테고리 필드 (optional)
  bookmarked?: boolean;
  onBookmark?: () => void;
  className?: string;
}

export function PolicyCard({
  id,
  title,
  summary,
  agency,
  region,
  period,
  status,
  eligibility,
  source,
  categories = [], // 기본값 빈 배열
  bookmarked,
  onBookmark,
  className,
}: PolicyCardProps) {
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
    housing: '주거',
    employment: '취업·창업',
    education: '교육',
    culture: '문화',
    welfare: '복지·생활',
  };

  return (
    <Link to={`/policies/${id}`}>
      <article
        className={cn(
          'group relative bg-white border border-[var(--border)] rounded-2xl p-6 sm:p-7',
          'hover:border-[var(--accent)] hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1',
          'transition-all duration-300',
          className
        )}
        aria-label={title}
      >
        {/* Header */}
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
              <Badge variant="default" aria-label={`출처: ${source}`}>{source}</Badge>
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

        {/* Summary */}
        <p className="text-[var(--muted-foreground)] text-sm line-clamp-2 mb-5 leading-relaxed">{summary}</p>

        {/* Meta */}
        <PolicyMetaRow agency={agency} region={region} period={period} />

        {/* View More Indicator */}
        <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-200" aria-hidden="true">
          <ExternalLink className="h-4 w-4 text-[var(--accent)]" />
        </div>
      </article>
    </Link>
  );
}