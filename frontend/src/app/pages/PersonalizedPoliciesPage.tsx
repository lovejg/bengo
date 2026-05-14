import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ArrowRight, MapPin, User as UserIcon, LogIn, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { updateProfile } from '../api/auth';
import { getPoliciesRecommended } from '../api/policies';
import { ApiClientError, getAccessToken, getEmailVerificationPath, getStoredUserProfile } from '../api/client';
import { MainLayout } from '../components/templates/MainLayout';
import { PolicyList } from '../components/organisms/PolicyList';
import { PolicyCardSkeleton } from '../components/molecules/PolicyCardSkeleton';
import { EmptyState } from '../components/molecules/EmptyState';
import { SignupPromptDialog } from '../components/molecules/SignupPromptDialog';
import { Button } from '../components/atoms/Button';
import { MatchSummaryCard } from '../components/organisms/MatchSummaryCard';
import type { PolicyListItem } from '../types';
import { formatRegionCode, REGION_CODE_BY_LABEL } from '../lib/regions';

const PAGE_SIZE = 12;

export function PersonalizedPoliciesPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [personalizedPolicies, setPersonalizedPolicies] = useState<PolicyListItem[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = Math.max(1, Number(searchParams.get('page') ?? '1'));

  const setCurrentPage = (page: number) => {
    setSearchParams((prev) => { prev.set('page', String(page)); return prev; }, { replace: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const isAuthenticated = Boolean(getAccessToken() && getStoredUserProfile());
  const user = getStoredUserProfile();

  useEffect(() => {
    const loadPersonalizedPolicies = async () => {
      const currentUser = getStoredUserProfile();

      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      if (!currentUser.emailVerified) {
        navigate(getEmailVerificationPath(currentUser.email), { replace: true });
        return;
      }

      if (!currentUser.profileCompleted) {
        navigate('/onboarding', { replace: true });
        return;
      }

      setIsLoading(true);
      setHasError(false);

      try {
        const response = await getPoliciesRecommended({
          interests: currentUser.interests.length > 0 ? currentUser.interests : undefined,
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
  }, [navigate, reloadKey]);

  const handleRetry = () => {
    setReloadKey((current) => current + 1);
  };

  if (!isLoading && !isAuthenticated) {
    return (
      <MainLayout>
        <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-blue-50/50 to-white dark:bg-none dark:bg-[var(--bg-main)] flex items-center justify-center px-4 py-12">
          <div className="max-w-lg w-full">
            <div className="bg-white dark:bg-[rgba(15,23,42,0.72)] dark:backdrop-blur-xl rounded-2xl shadow-xl shadow-blue-500/10 dark:shadow-[0_20px_60px_rgba(0,0,0,0.35)] p-8 md:p-12 text-center border border-[var(--border)] dark:border-[var(--border-default)]">
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

              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:bg-none dark:bg-[rgba(15,23,42,0.5)] dark:border dark:border-[var(--border-subtle)] rounded-xl p-6 mb-8 space-y-4">
                <div className="flex items-start gap-3 text-left">
                  <div className="p-2.5 bg-white dark:bg-[rgba(15,23,42,0.7)] dark:border dark:border-[var(--border-subtle)] rounded-xl shadow-sm">
                    <UserIcon className="h-5 w-5 text-[var(--accent)] dark:text-[#93C5FD]" />
                  </div>
                  <div>
                    <p className="font-medium mb-1 text-sm">개인화된 정책 추천</p>
                    <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                      나이, 지역, 관심사 기반 추천
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-left">
                  <div className="p-2.5 bg-white dark:bg-[rgba(15,23,42,0.7)] dark:border dark:border-[var(--border-subtle)] rounded-xl shadow-sm">
                    <MapPin className="h-5 w-5 text-[var(--accent)] dark:text-[#93C5FD]" />
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
                <div className="flex-1">
                  <SignupPromptDialog>
                    <Button variant="secondary" className="w-full">
                      회원가입
                    </Button>
                  </SignupPromptDialog>
                </div>
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
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-b border-blue-100 dark:bg-none dark:bg-[var(--bg-main)] dark:border-[var(--border-subtle)] py-10 sm:py-12 md:py-14 relative">
        <div
          aria-hidden="true"
          className="hidden dark:block absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 18% 30%, rgba(59,130,246,0.10), transparent 38%), radial-gradient(circle at 82% 60%, rgba(139,92,246,0.10), transparent 42%)',
          }}
        ></div>
        <div className="container mx-auto px-4 max-w-[1200px] relative">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 lg:gap-8 items-start">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-white dark:bg-[rgba(15,23,42,0.7)] dark:border dark:border-[var(--border-subtle)] rounded-xl shadow-sm">
                  <Gift className="h-5 w-5 text-[var(--accent)] dark:text-[#93C5FD]" />
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
                  age: user?.age ?? undefined,
                  region: user ? formatRegionCode(user.regionCode) : undefined,
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

                  void (async () => {
                    try {
                      if (field === 'age') {
                        const age = Number(value);
                        if (!Number.isInteger(age) || age < 14 || age > 120) {
                          toast.error('나이는 14세 이상 120세 이하로 입력해주세요.');
                          return;
                        }
                        await updateProfile({ age });
                      } else if (field === 'region') {
                        const code = REGION_CODE_BY_LABEL[value];
                        if (!code) {
                          toast.error('지역 정보를 확인할 수 없습니다.');
                          return;
                        }
                        await updateProfile({ regionCode: code as NonNullable<typeof storedUser.regionCode> });
                      } else if (field === 'interests') {
                        const interests = JSON.parse(value) as typeof storedUser.interests;
                        if (!Array.isArray(interests) || interests.length === 0) {
                          toast.error('관심사를 1개 이상 선택해주세요.');
                          return;
                        }
                        await updateProfile({ interests });
                      }

                      toast.success('프로필이 업데이트되었습니다.');
                      setReloadKey((current) => current + 1);
                    } catch (error) {
                      const message = error instanceof ApiClientError ? error.message : '프로필 업데이트에 실패했습니다.';
                      toast.error(message);
                    }
                  })();
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-blue-50/50 border border-blue-200/50 dark:bg-[rgba(59,130,246,0.08)] dark:border-[rgba(96,165,250,0.20)] rounded-xl p-3.5 mb-8 flex items-start gap-3">
          <div className="p-2 bg-blue-100 dark:bg-[rgba(96,165,250,0.16)] rounded-lg">
            <Gift className="h-4 w-4 text-blue-600 dark:text-[#93C5FD] flex-shrink-0" />
          </div>
          <div className="text-sm">
            <p className="text-blue-900 dark:text-[var(--text-primary)] font-medium mb-1">이 정책들을 확인해보세요!</p>
            <p className="text-blue-700 dark:text-[var(--text-secondary)]">
              회원님의 연령과 지역 조건에 맞는 정책만 선별했습니다.
              <Link to="/me" className="underline ml-1 hover:text-blue-900 dark:hover:text-white font-medium">
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
          <div className="bg-white dark:bg-transparent dark:border dark:border-dashed dark:border-[rgba(148,163,184,0.22)] rounded-2xl px-6 py-10 text-center max-w-lg mx-auto">
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
          <div className="flex flex-col min-h-[800px]">
            <div className="flex-1">
              <PolicyList
                policies={personalizedPolicies.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)}
                hasMore={false}
              />
            </div>
            {Math.ceil(personalizedPolicies.length / PAGE_SIZE) > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <Button
                  variant="secondary"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  이전
                </Button>
                <span className="text-sm text-[var(--muted-foreground)] px-2">
                  {currentPage} / {Math.ceil(personalizedPolicies.length / PAGE_SIZE)}
                </span>
                <Button
                  variant="secondary"
                  onClick={() => setCurrentPage(Math.min(Math.ceil(personalizedPolicies.length / PAGE_SIZE), currentPage + 1))}
                  disabled={currentPage === Math.ceil(personalizedPolicies.length / PAGE_SIZE)}
                >
                  다음
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default PersonalizedPoliciesPage;
