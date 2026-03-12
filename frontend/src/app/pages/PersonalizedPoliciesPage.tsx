import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, MapPin, User as UserIcon, LogIn, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { getPoliciesRecommended } from '../api/policies';
import { ApiClientError, getAccessToken, getStoredUserProfile, setStoredUserProfile } from '../api/client';
import { MainLayout } from '../components/templates/MainLayout';
import { PolicyList } from '../components/organisms/PolicyList';
import { PolicyCardSkeleton } from '../components/molecules/PolicyCardSkeleton';
import { EmptyState } from '../components/molecules/EmptyState';
import { Button } from '../components/atoms/Button';
import { MatchSummaryCard } from '../components/organisms/MatchSummaryCard';
import type { PolicyListItem } from '../types';
const regionLabels: Record<string, string> = {
  seoul: '서울',
  seoul_gangnam: '서울 강남구',
  seoul_mapo: '서울 마포구',
  seoul_songpa: '서울 송파구',
};

const regionCodeByLabel: Record<string, string> = Object.fromEntries(
  Object.entries(regionLabels).map(([code, label]) => [label, code]),
);

export function PersonalizedPoliciesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [personalizedPolicies, setPersonalizedPolicies] = useState<PolicyListItem[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const isAuthenticated = Boolean(getAccessToken() && getStoredUserProfile());
  const user = getStoredUserProfile();

  useEffect(() => {
    const loadPersonalizedPolicies = async () => {
      const currentUser = getStoredUserProfile();

      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setHasError(false);

      try {
        const response = await getPoliciesRecommended({
          regionCode: currentUser.regionCode,
          interest: currentUser.interests.length > 0 ? currentUser.interests[0] : undefined,
          sortBy: 'relevance',
          order: 'desc',
          onlyAvailable: true,
        });

        setPersonalizedPolicies(response.items);
      } catch (error) {
        setHasError(true);
        const message = error instanceof ApiClientError ? error.message : '맞춤 정책을 불러오는데 실패했습니다';
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadPersonalizedPolicies();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  const handleRetry = () => {
    setReloadKey((current) => current + 1);
  };

  if (!isLoading && !isAuthenticated) {
    return (
      <MainLayout>
        <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-blue-50/50 to-white flex items-center justify-center px-4 py-12">
          <div className="max-w-lg w-full">
            <div className="bg-white rounded-2xl shadow-xl shadow-blue-500/10 p-8 md:p-12 text-center border border-[var(--border)]">
              <div className="relative inline-flex items-center justify-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                  <Gift className="h-10 w-10 text-[var(--accent)]" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <ArrowRight className="h-3 w-3 text-white" strokeWidth={3} />
                </div>
              </div>

              <h2 className="mb-4 leading-snug">나에게 딱 맞는<br />정책을 찾아보세요</h2>

              <p className="text-[var(--muted-foreground)] mb-8 leading-relaxed">
                로그인하면 연령, 지역 등 회원님의 조건에 맞는<br />
                맞춤형 정책만 모아서 제공해드립니다
              </p>

              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 mb-8 space-y-4">
                <div className="flex items-start gap-3 text-left">
                  <div className="p-2.5 bg-white rounded-xl shadow-sm">
                    <UserIcon className="h-5 w-5 text-[var(--accent)]" />
                  </div>
                  <div>
                    <p className="font-medium mb-1 text-sm">개인화된 정책 추천</p>
                    <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                      나이, 지역, 관심사 기반 추천
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-left">
                  <div className="p-2.5 bg-white rounded-xl shadow-sm">
                    <MapPin className="h-5 w-5 text-[var(--accent)]" />
                  </div>
                  <div>
                    <p className="font-medium mb-1 text-sm">지역별 맞춤 정책</p>
                    <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                      거주 지역의 정책만 선별
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <Link to="/login" className="flex-1">
                  <Button className="w-full gap-2">
                    <LogIn className="h-4 w-4" />
                    로그인하고 시작하기
                  </Button>
                </Link>
                <Link to="/signup" className="flex-1">
                  <Button variant="secondary" className="w-full">
                    회원가입
                  </Button>
                </Link>
              </div>

              <div className="pt-6 border-t border-[var(--border)]">
                <Link to="/policies">
                  <Button variant="ghost" size="sm">
                    모든 정책 둘러보기
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-b border-blue-100 py-8 sm:py-10 md:py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 lg:gap-8 items-start">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <Gift className="h-5 w-5 text-[var(--accent)]" />
                </div>
                <span className="text-sm font-medium text-[var(--muted-foreground)]">맞춤정책</span>
              </div>
              <h1 className="text-[var(--foreground)] mb-2 text-2xl sm:text-3xl md:text-4xl">
                <span className="inline-block">{user ? `${user.email.split('@')[0]}님을 위한 정책` : '맞춤 정책'}</span>
              </h1>
              <p className="text-[var(--muted-foreground)] text-sm sm:text-base">
                회원님의 조건에 맞는 정책 <span className="font-semibold text-[var(--accent)]">{personalizedPolicies.length}개</span>를 찾았습니다
              </p>
            </div>

            <div className="w-full lg:w-[420px]">
              <MatchSummaryCard
                userCondition={{
                  age: user?.age,
                  region: user ? regionLabels[user.regionCode] ?? user.regionCode : undefined,
                  interests: user?.interests,
                }}
                completionPercentage={
                  user
                    ? Math.round(
                        ((user.age ? 1 : 0) +
                          (user.regionCode ? 1 : 0) +
                          (user.interests.length > 0 ? 1 : 0)) /
                          3 *
                          100,
                      )
                    : 0
                }
                onUpdate={(field, value) => {
                  const storedUser = getStoredUserProfile();

                  if (!storedUser) {
                    return;
                  }

                  const nextUser = { ...storedUser };
                  if (field === 'age') {
                    nextUser.age = Number(value) || storedUser.age;
                  } else if (field === 'region') {
                    const code = regionCodeByLabel[value];
                    if (code) {
                      nextUser.regionCode = code as typeof storedUser.regionCode;
                    }
                  } else if (field === 'interests') {
                    try {
                      nextUser.interests = JSON.parse(value) as typeof storedUser.interests;
                    } catch {
                      return;
                    }
                  }

                  setStoredUserProfile(nextUser);
                  toast.success('프로필이 업데이트되었습니다.');
                  setReloadKey((current) => current + 1);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-blue-50/50 border border-blue-200/50 rounded-xl p-4 mb-8 flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Gift className="h-4 w-4 text-blue-600 flex-shrink-0" />
          </div>
          <div className="text-sm">
            <p className="text-blue-900 font-medium mb-1">이 정책들을 확인해보세요!</p>
            <p className="text-blue-700">
              회원님의 연령과 지역 조건에 맞는 정책만 선별했습니다.
              <Link to="/me" className="underline ml-1 hover:text-blue-900 font-medium">
                프로필을 수정
              </Link>
              하면 더 정확한 추천을 받을 수 있습니다.
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" role="status" aria-label="맞춤 정책 로딩 중">
            {[...Array(4)].map((_, i) => (
              <PolicyCardSkeleton key={i} />
            ))}
          </div>
        )}

        {hasError && (
          <EmptyState type="error" onAction={handleRetry} actionLabel="다시 시도" />
        )}

        {!isLoading && !hasError && personalizedPolicies.length === 0 && (
          <div className="bg-white rounded-xl p-12 text-center">
            <Gift className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-4" />
            <h3 className="mb-2">현재 조건에 맞는 정책이 없습니다</h3>
            <p className="text-[var(--muted-foreground)] mb-6">
              프로필 정보를 업데이트하거나 전체 정책을 둘러보세요
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/me">
                <Button variant="secondary">프로필 수정</Button>
              </Link>
              <Link to="/policies">
                <Button>전체 정책 보기</Button>
              </Link>
            </div>
          </div>
        )}

        {!isLoading && !hasError && personalizedPolicies.length > 0 && (
          <PolicyList policies={personalizedPolicies} hasMore={false} />
        )}
      </div>
    </MainLayout>
  );
}

export default PersonalizedPoliciesPage;
