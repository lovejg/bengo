import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { ArrowRight, MapPin, User as UserIcon, LogIn, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '../components/templates/MainLayout';
import { PolicyList } from '../components/organisms/PolicyList';
import { PolicyCardSkeleton } from '../components/molecules/PolicyCardSkeleton';
import { EmptyState } from '../components/molecules/EmptyState';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { PolicyCardProps } from '../components/organisms/PolicyCard';
import { MatchSummaryCard } from '../components/organisms/MatchSummaryCard';

// Mock data - 실제 구현 시 API 또는 Context에서 가져옴
const mockPolicies: PolicyCardProps[] = [
  {
    id: '1',
    title: '청년 월세 지원 사업',
    summary: '만 19~34세 청년에게 월 최대 20만원, 최대 12개월간 월세를 지원합니다.',
    agency: '서울시 주택정책실',
    region: '서울 전역',
    period: '2026.01.01 ~ 2026.12.31',
    status: 'recruiting',
    eligibility: 'eligible',
    source: '서울청년몽땅',
    categories: ['housing'],
  },
  {
    id: '2',
    title: '청년 구직활동 지원금',
    summary: '구직 중인 청년에게 월 50만원씩 최대 6개월간 지원합니다.',
    agency: '고용노동부',
    region: '전국',
    period: '상시 모집',
    status: 'always',
    eligibility: 'needsReview',
    source: 'SSIS',
    categories: ['employment'],
  },
  {
    id: '3',
    title: '강남구 청년 일자리 지원 프로그램',
    summary: '강남구 거주 청년의 취업을 위한 교육 및 인턴십 프로그램',
    agency: '강남구청',
    region: '강남구',
    period: '2026.03.01 ~ 2026.03.31',
    status: 'recruiting',
    eligibility: 'eligible',
    source: '크롤링',
    categories: ['employment', 'education'],
  },
  {
    id: '4',
    title: '서울시 청년 창업 지원금',
    summary: '예비 창업자 및 초기 창업자를 대상으로 최대 1천만원 지원',
    agency: '서울시 경제정책실',
    region: '서울 전역',
    period: '2026.02.01 ~ 2026.02.28',
    status: 'closed',
    source: '온통청년',
    categories: ['employment'],
  },
  {
    id: '5',
    title: '마포구 청년 문화활동 지원',
    summary: '마포구 거주 청년에게 문화활동비 연 30만원 지원',
    agency: '마포구청',
    region: '마포구',
    period: '2026.01.01 ~ 2026.12.31',
    status: 'recruiting',
    eligibility: 'infoLacking',
    source: '크롤링',
    categories: ['culture'],
  },
  {
    id: '6',
    title: '청년 전월세 보증금 대출',
    summary: '무주택 청년의 전월세 보증금 대출 이자 지원',
    agency: '주택도시보증공사',
    region: '전국',
    period: '상시 모집',
    status: 'always',
    eligibility: 'needsReview',
    source: 'SSIS',
    categories: ['housing', 'welfare'],
  },
];

export function PersonalizedPoliciesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [personalizedPolicies, setPersonalizedPolicies] = useState<PolicyCardProps[]>([]);
  
  // Mock auth state - 실제 구현 시 Context 또는 Auth Provider에서 가져옴
  // 테스트용: true로 설정하면 로그인 상태, false로 설정하면 로그아웃 상태
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  
  // Mock user data
  const user = {
    name: '홍길동',
    age: 28,
    region: '강남구',
    interests: ['청년정책', '주거', '취업'],
  };

  useEffect(() => {
    const loadPersonalizedPolicies = async () => {
      setIsLoading(true);
      setHasError(false);
      
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        // 로그인된 경우 사용자 정보 기반 필터링
        if (isAuthenticated) {
          // 연령대 필터링 (19-34세 청년 정책)
          // 지역 필터링 (사용자 지역 + 전국)
          const filtered = mockPolicies.filter((policy) => {
            const matchesRegion = 
              policy.region === '전국' || 
              policy.region.includes('서울') || 
              policy.region.includes(user.region);
            
            // 모집 중이거나 상시 모집인 정책만
            const isAvailable = policy.status === 'recruiting' || policy.status === 'always';
            
            return matchesRegion && isAvailable;
          });
          
          setPersonalizedPolicies(filtered);
        }
      } catch (error) {
        setHasError(true);
        toast.error('맞춤 정책을 불러오는데 실패했습니다');
      } finally {
        setIsLoading(false);
      }
    };

    loadPersonalizedPolicies();
  }, [isAuthenticated]);

  const handleRetry = () => {
    window.location.reload();
  };

  // 로그인하지 않은 경우 안내 화면
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

  // 로그인한 경우 맞춤 정책 목록
  return (
    <MainLayout>
      {/* Hero Section - 2 Column Layout */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-b border-blue-100 py-8 sm:py-10 md:py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 lg:gap-8 items-start">
            {/* Left Column - Title & Description */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <Gift className="h-5 w-5 text-[var(--accent)]" />
                </div>
                <span className="text-sm font-medium text-[var(--muted-foreground)]">맞춤정책</span>
              </div>
              <h1 className="text-[var(--foreground)] mb-2 text-2xl sm:text-3xl md:text-4xl">
                <span className="inline-block">{user.name}님을 위한 정책</span>
              </h1>
              <p className="text-[var(--muted-foreground)] text-sm sm:text-base">
                회원님의 조건에 맞는 정책 <span className="font-semibold text-[var(--accent)]">{personalizedPolicies.length}개</span>를 찾았습니다
              </p>
            </div>

            {/* Right Column - Match Summary Card */}
            <div className="w-full lg:w-[420px]">
              <MatchSummaryCard
                userCondition={{
                  age: user.age,
                  region: user.region,
                  status: '구직중',
                  income: false,
                  household: false,
                }}
                completionPercentage={60}
                state="partial"
                onUpdate={(field, value) => {
                  toast.success(`${field} 정보가 "${value}"(으)로 업데이트되었습니다.`);
                  console.log(`Updated ${field} to ${value}`);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Info Banner */}
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

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" role="status" aria-label="맞춤 정책 로딩 중">
            {[...Array(4)].map((_, i) => (
              <PolicyCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <EmptyState
            type="error"
            onAction={handleRetry}
            actionLabel="다시 시도"
          />
        )}

        {/* Empty State */}
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

        {/* Policy List */}
        {!isLoading && !hasError && personalizedPolicies.length > 0 && (
          <PolicyList
            policies={personalizedPolicies}
            hasMore={false}
          />
        )}
      </div>
    </MainLayout>
  );
}

export default PersonalizedPoliciesPage;