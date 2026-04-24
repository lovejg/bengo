import { Link } from 'react-router';
import { User, MapPin, Sparkles, Edit2, Bookmark, ChevronRight, Gift, Settings } from 'lucide-react';
import { MainLayout } from '../components/templates/MainLayout';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { getStoredUserProfile } from '../api/client';
import { formatRegionCode } from '../lib/regions';

const interestLabels: Record<string, string> = {
  youth_policy: '청년정책',
  childcare_policy: '육아정책',
};

export function ProfilePage() {
  const user = getStoredUserProfile();
  const userName = user ? user.email.split('@')[0] : '사용자';
  const region = user ? formatRegionCode(user.regionCode) : null;
  const interests = user ? user.interests.map((i) => interestLabels[i] ?? i) : [];

  return (
    <MainLayout>
      {/* 헤더 배너 */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 h-36 sm:h-44 relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvc3ZnPg==')] opacity-60" />
      </div>

      <div className="container mx-auto px-4">
        {/* 아바타 + 이름 영역 */}
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-14 mb-6">
          <div className="flex items-end gap-4">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-200 border-4 border-white shadow-lg flex items-center justify-center flex-shrink-0">
              <User className="h-12 w-12 sm:h-14 sm:h-14 text-blue-500" />
            </div>
            <div className="pb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">{userName}</h1>
              <p className="text-sm text-[var(--muted-foreground)]">{user?.email ?? ''}</p>
            </div>
          </div>
          <div className="flex gap-2 sm:pb-1">
            <Link to="/me">
              <Button variant="secondary" size="sm" className="gap-1.5">
                <Bookmark className="h-4 w-4" />
                저장 정책
              </Button>
            </Link>
            <Button variant="secondary" size="sm" className="gap-1.5">
              <Edit2 className="h-4 w-4" />
              프로필 수정
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
          {/* 왼쪽: 기본 정보 */}
          <div className="lg:col-span-1 space-y-4">
            {/* 기본 정보 카드 */}
            <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-4">기본 정보</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted-foreground)]">나이</p>
                    <p className="text-sm font-medium">{user?.age ? `${user.age}세` : '미입력'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted-foreground)]">거주 지역</p>
                    <p className="text-sm font-medium">{region ?? '미입력'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 관심사 카드 */}
            <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-4">관심사</h2>
              {interests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest) => (
                    <Badge key={interest} variant="default" className="bg-blue-50 text-blue-700 border-blue-200">
                      {interest}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">등록된 관심사가 없습니다</p>
              )}
            </div>

            {/* 설정 링크 */}
            <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
              <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--muted)] transition-colors">
                <div className="flex items-center gap-3">
                  <Settings className="h-4 w-4 text-[var(--muted-foreground)]" />
                  <span className="text-sm font-medium">계정 설정</span>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />
              </button>
            </div>
          </div>

          {/* 오른쪽: 활동 / 빠른 링크 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 프로필 완성도 */}
            <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">프로필 완성도</h2>
                <span className="text-sm font-bold text-[var(--accent)]">
                  {Math.round(((user?.age ? 1 : 0) + (user?.regionCode ? 1 : 0) + ((user?.interests.length ?? 0) > 0 ? 1 : 0)) / 3 * 100)}%
                </span>
              </div>
              <div className="w-full bg-[var(--muted)] rounded-full h-2 mb-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.round(((user?.age ? 1 : 0) + (user?.regionCode ? 1 : 0) + ((user?.interests.length ?? 0) > 0 ? 1 : 0)) / 3 * 100)}%` }}
                />
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">프로필을 완성하면 더 정확한 맞춤 정책을 추천받을 수 있어요</p>
            </div>

            {/* 빠른 이동 */}
            <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-2">
                <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">바로가기</h2>
              </div>
              <Link to="/me" className="flex items-center justify-between px-5 py-4 hover:bg-[var(--muted)] transition-colors border-t border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Bookmark className="h-4 w-4 text-blue-500" />
                  </div>
                  <span className="text-sm font-medium">저장한 정책 관리</span>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />
              </Link>
              <Link to="/personalized" className="flex items-center justify-between px-5 py-4 hover:bg-[var(--muted)] transition-colors border-t border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Gift className="h-4 w-4 text-purple-500" />
                  </div>
                  <span className="text-sm font-medium">나를 위한 맞춤 정책</span>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default ProfilePage;
