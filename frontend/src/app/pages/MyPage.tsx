import { useEffect, useState } from 'react';
import { User, MapPin, Sparkles, Edit, Trash2, X } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { updateProfile } from '../api/auth';
import { getPolicyDetail } from '../api/policies';
import { ApiClientError, getEmailVerificationPath, getStoredUserProfile, isEmailVerificationRequiredError } from '../api/client';
import { getMyPolicies, removeMyPolicy } from '../api/me';
import { MainLayout } from '../components/templates/MainLayout';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Input } from '../components/atoms/Input';
import { PolicyCard, PolicyCardProps } from '../components/organisms/PolicyCard';
import { CustomSelect } from '../components/atoms/CustomSelect';
import { EmptyState } from '../components/molecules/EmptyState';
import type { MyPolicyItem, PolicyDetail, UserProfileSummary } from '../types';
import { formatRegionCode, REGION_OPTIONS } from '../lib/regions';

type StatusFilter = 'all' | 'upcoming' | 'recruiting' | 'closed';
type SavedPolicy = PolicyCardProps & {
  applicationStatus: 'upcoming' | 'recruiting' | 'closed';
  stateId: string;
};

interface UserProfileView {
  name: string;
  age: number | null;
  region: string;
  interests: string[];
}

interface EditFormState {
  displayName: string;
  age: string;
  regionCode: string;
  interests: string[];
}

function calculateProfileCompletion(user: UserProfileSummary | null): number {
  if (!user) {
    return 0;
  }

  const completed =
    (user.age ? 1 : 0) +
    (user.regionCode ? 1 : 0) +
    (user.interests.length > 0 ? 1 : 0);

  return Math.round((completed / 3) * 100);
}

const INTEREST_OPTIONS: { value: UserProfileSummary['interests'][number]; label: string }[] = [
  { value: 'youth_policy', label: '청년정책' },
  { value: 'childcare_policy', label: '육아정책' },
  { value: 'senior_policy', label: '노인정책' },
  { value: 'disability_policy', label: '장애인정책' },
];

const interestLabels: Record<string, string> = {
  youth_policy: '청년정책',
  childcare_policy: '육아정책',
  senior_policy: '노인정책',
  disability_policy: '장애인정책',
};

function mapApplicationStatus(detail: PolicyDetail, state: MyPolicyItem['state']): SavedPolicy['applicationStatus'] {
  if (state === 'applied' || (detail.endsAt && new Date(detail.endsAt).getTime() < Date.now())) {
    return 'closed';
  }

  if (!detail.startsAt) {
    return 'recruiting';
  }

  return new Date(detail.startsAt).getTime() > Date.now() ? 'upcoming' : 'recruiting';
}

function mapSavedPolicy(item: MyPolicyItem, detail: PolicyDetail): SavedPolicy {
  return {
    id: item.policyId,
    stateId: item.policyId,
    title: item.title,
    code: detail.code ?? item.policyId,
    shortDescription: detail.shortDescription ?? detail.description ?? item.note ?? '정책 요약 정보가 없습니다.',
    providerName: detail.providerName ?? item.providerName,
    categories: detail.categories ?? [],
    regionCodes: detail.regionCodes ?? [],
    minAge: detail.minAge ?? null,
    maxAge: detail.maxAge ?? null,
    startsAt: detail.startsAt ?? null,
    endsAt: detail.endsAt ?? null,
    isAlwaysOpen: detail.isAlwaysOpen ?? false,
    periodRaw: detail.periodRaw ?? null,
    fitScore: null,
    userState: item.state,
    bookmarked: item.state === 'saved',
    applicationStatus: mapApplicationStatus(detail, item.state),
  };
}

function mapStoredUserToView(user: UserProfileSummary | null): UserProfileView | null {
  if (!user) {
    return null;
  }

  return {
    name: user.displayName || user.email.split('@')[0],
    age: user.age,
    region: formatRegionCode(user.regionCode),
    interests: user.interests.map((interest) => interestLabels[interest] ?? interest),
  };
}

const PAGE_SIZE = 12;
const MAX_INTERESTS = 2;

export function MyPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = Math.max(1, Number(searchParams.get('page') ?? '1'));

  const setCurrentPage = (page: number) => {
    setSearchParams((prev) => { prev.set('page', String(page)); return prev; }, { replace: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<string | null>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editProfileLoading, setEditProfileLoading] = useState(false);
  const [user, setUser] = useState<UserProfileView | null>(mapStoredUserToView(getStoredUserProfile()));
  const [editForm, setEditForm] = useState<EditFormState>(() => {
    const stored = getStoredUserProfile();
    return {
      displayName: stored?.displayName ?? '',
      age: stored?.age != null ? String(stored.age) : '',
      regionCode: stored?.regionCode ?? '',
      interests: stored?.interests ?? [],
    };
  });
  const [savedPolicies, setSavedPolicies] = useState<SavedPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadMyPolicies = async () => {
      setIsLoading(true);
      setHasError(false);

      const storedUser = getStoredUserProfile();
      if (storedUser && !storedUser.emailVerified) {
        navigate(getEmailVerificationPath(storedUser.email), { replace: true });
        return;
      }

      if (storedUser && !storedUser.profileCompleted) {
        navigate('/onboarding', { replace: true });
        return;
      }

      setUser(mapStoredUserToView(storedUser));

      try {
        const response = await getMyPolicies();
        const visibleItems = response.items;
        const results = await Promise.allSettled(
          visibleItems.map(async (item) => {
            const detail = await getPolicyDetail(item.policyId);
            return mapSavedPolicy(item, detail);
          }),
        );
        const details = results
          .filter((r): r is PromiseFulfilledResult<SavedPolicy> => r.status === 'fulfilled')
          .map((r) => r.value);

        setSavedPolicies(details);
      } catch (error) {
        if (isEmailVerificationRequiredError(error)) {
          const email = getStoredUserProfile()?.email;
          navigate(getEmailVerificationPath(email), { replace: true });
          return;
        }
        setHasError(true);
        const message = error instanceof ApiClientError ? error.message : '내 정책 정보를 불러오는데 실패했습니다';
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadMyPolicies();
  }, [navigate, reloadKey]);

  const handleDelete = async (id: string) => {
    try {
      await removeMyPolicy(id);
      setSavedPolicies((current) => current.filter((policy) => policy.id !== id));
      toast.success('정책이 저장 목록에서 삭제되었습니다');
    } catch (error) {
      if (isEmailVerificationRequiredError(error)) {
        const email = getStoredUserProfile()?.email;
        navigate(getEmailVerificationPath(email));
        return;
      }
      const message = error instanceof ApiClientError ? error.message : '정책 삭제에 실패했습니다';
      toast.error(message);
    }
  };

  const filteredPolicies = savedPolicies.filter((policy) => {
    if (statusFilter === 'all') {
      return true;
    }

    return policy.applicationStatus === statusFilter;
  });

  const statusCounts = {
    all: savedPolicies.length,
    upcoming: savedPolicies.filter((policy) => policy.applicationStatus === 'upcoming').length,
    recruiting: savedPolicies.filter((policy) => policy.applicationStatus === 'recruiting').length,
    closed: savedPolicies.filter((policy) => policy.applicationStatus === 'closed').length,
  };

  const handleSaveProfile = async () => {
    const storedUser = getStoredUserProfile();

    if (!storedUser) {
      toast.error('로그인 정보가 없습니다');
      return;
    }

    const age = editForm.age ? Number(editForm.age) : undefined;
    if (age !== undefined && (!Number.isInteger(age) || age < 14 || age > 120)) {
      toast.error('나이는 14세 이상 120세 이하로 입력해주세요.');
      return;
    }

    const interests = editForm.interests
      .filter((interest) => INTEREST_OPTIONS.some((option) => option.value === interest)) as typeof storedUser.interests;
    if (interests.length === 0) {
      toast.error('관심사를 1개 이상 선택해주세요.');
      return;
    }
    if (interests.length > MAX_INTERESTS) {
      toast.error(`관심사는 최대 ${MAX_INTERESTS}개까지 선택할 수 있습니다.`);
      return;
    }
    const regionCode = (editForm.regionCode || storedUser.regionCode || undefined) as
      | NonNullable<UserProfileSummary['regionCode']>
      | undefined;

    setEditProfileLoading(true);
    try {
      const response = await updateProfile({
        displayName: editForm.displayName.trim() || undefined,
        age,
        regionCode,
        interests,
      });

      setUser(mapStoredUserToView(response.user));
      setEditProfileOpen(false);
      setReloadKey((current) => current + 1);
      toast.success('프로필이 저장되었습니다');
    } catch (error) {
      if (isEmailVerificationRequiredError(error)) {
        navigate(getEmailVerificationPath(storedUser.email));
        return;
      }
      const message = error instanceof ApiClientError ? error.message : '프로필 저장에 실패했습니다';
      toast.error(message);
    } finally {
      setEditProfileLoading(false);
    }
  };

  const handleRetry = () => {
    setReloadKey((current) => current + 1);
  };

  const storedUser = getStoredUserProfile();
  const profileCompletion = calculateProfileCompletion(storedUser);
  const ringRadius = 28;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - profileCompletion / 100);

  return (
    <MainLayout>
      <div className="bg-gradient-to-b from-blue-50 to-white dark:bg-none dark:bg-[var(--bg-main)] py-8 sm:py-10 md:py-12">
        <div className="container mx-auto px-4 max-w-[1200px]">
          <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-100 shadow-lg dark:bg-none dark:bg-[rgba(15,23,42,0.72)] dark:border-[var(--border-default)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.25)] dark:backdrop-blur-xl rounded-2xl p-5 md:p-6 mb-6 md:mb-8">
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_auto] gap-6 xl:gap-8 items-center">
              <div className="flex items-start gap-4">
                <div className="p-4 bg-blue-100 dark:bg-[rgba(59,130,246,0.16)] rounded-2xl flex-shrink-0">
                  <User className="h-8 w-8 text-[var(--accent)] dark:text-[#93C5FD]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="mb-2 text-xl sm:text-2xl md:text-3xl break-words">
                    {user ? `${user.name}님` : '내 정보'}
                  </h2>
                  <p className="text-sm text-[var(--muted-foreground)] mb-3">
                    저장한 정책과 프로필 정보를 한곳에서 정리하고 관리할 수 있어요.
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm text-[var(--muted-foreground)]">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 flex-shrink-0" />
                      <span>{user?.age ? `${user.age}세` : '나이 정보 없음'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span>{user?.region ?? '지역 정보 없음'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white/70 dark:bg-[rgba(15,23,42,0.58)] backdrop-blur-sm border border-white/80 dark:border-[var(--border-default)] px-4 py-4 shadow-sm">
                  <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1">저장한 정책</p>
                  <p className="text-2xl font-semibold text-[var(--foreground)]">{statusCounts.all}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">전체 저장 수</p>
                </div>
                <div className="rounded-2xl bg-white/70 dark:bg-[rgba(15,23,42,0.58)] backdrop-blur-sm border border-white/80 dark:border-[var(--border-default)] px-4 py-4 shadow-sm">
                  <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1">모집중</p>
                  <p className="text-2xl font-semibold text-emerald-600">{statusCounts.recruiting}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">신청 가능한 정책</p>
                </div>
                <div className="rounded-2xl bg-white/70 dark:bg-[rgba(15,23,42,0.58)] backdrop-blur-sm border border-white/80 dark:border-[var(--border-default)] px-4 py-4 shadow-sm">
                  <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1">관심사</p>
                  <div className="flex flex-wrap gap-2 mt-3 min-h-[2.5rem]">
                    {(user?.interests ?? []).length > 0 ? (
                      (user?.interests ?? []).map((interest) => (
                        <Badge key={interest}>{interest}</Badge>
                      ))
                    ) : (
                      <p className="text-xs text-[var(--muted-foreground)]">설정된 관심사가 없습니다</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white/75 dark:bg-[rgba(15,23,42,0.62)] backdrop-blur-sm border border-white/80 dark:border-[var(--border-default)] p-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 flex-shrink-0">
                    <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
                      <circle
                        cx="32"
                        cy="32"
                        r={ringRadius}
                        fill="none"
                        stroke="rgba(59, 130, 246, 0.14)"
                        strokeWidth="6"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r={ringRadius}
                        fill="none"
                        stroke="url(#my-profile-completion-gradient)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={ringOffset}
                      />
                      <defs>
                        <linearGradient id="my-profile-completion-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#2563eb" />
                          <stop offset="100%" stopColor="#7c3aed" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-semibold text-[var(--foreground)]">{profileCompletion}%</span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--foreground)]">프로필 완성도</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-blue-100/80 dark:border-[var(--border-subtle)]">
                  <Button variant="secondary" className="gap-2 w-full justify-center bg-white hover:bg-blue-50" onClick={() => {
                    const stored = getStoredUserProfile();
                    setEditForm({
                      displayName: stored?.displayName ?? '',
                      age: stored?.age != null ? String(stored.age) : '',
                      regionCode: stored?.regionCode ?? '',
                      interests: stored?.interests ?? [],
                    });
                    setEditProfileOpen(true);
                  }}>
                    <Edit className="h-4 w-4" />
                    <span className="whitespace-nowrap">프로필 수정</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[rgba(15,23,42,0.6)] dark:border dark:border-[var(--border-subtle)] rounded-2xl p-1.5 mb-6 flex flex-wrap gap-1 w-fit">
            <button
              onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
              className={`group inline-flex items-center px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                statusFilter === 'all' ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              <span>전체</span>
              <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover:ml-1.5 group-hover:max-w-16 group-hover:opacity-100 group-focus-visible:ml-1.5 group-focus-visible:max-w-16 group-focus-visible:opacity-100">
                {statusCounts.all}
              </span>
            </button>
            <button
              onClick={() => { setStatusFilter('upcoming'); setCurrentPage(1); }}
              className={`group inline-flex items-center px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                statusFilter === 'upcoming' ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              <span>예정</span>
              <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover:ml-1.5 group-hover:max-w-16 group-hover:opacity-100 group-focus-visible:ml-1.5 group-focus-visible:max-w-16 group-focus-visible:opacity-100">
                {statusCounts.upcoming}
              </span>
            </button>
            <button
              onClick={() => { setStatusFilter('recruiting'); setCurrentPage(1); }}
              className={`group inline-flex items-center px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                statusFilter === 'recruiting' ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              <span>모집중</span>
              <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover:ml-1.5 group-hover:max-w-16 group-hover:opacity-100 group-focus-visible:ml-1.5 group-focus-visible:max-w-16 group-focus-visible:opacity-100">
                {statusCounts.recruiting}
              </span>
            </button>
            <button
              onClick={() => { setStatusFilter('closed'); setCurrentPage(1); }}
              className={`group inline-flex items-center px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                statusFilter === 'closed' ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              <span>마감</span>
              <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover:ml-1.5 group-hover:max-w-16 group-hover:opacity-100 group-focus-visible:ml-1.5 group-focus-visible:max-w-16 group-focus-visible:opacity-100">
                {statusCounts.closed}
              </span>
            </button>
          </div>

          {isLoading ? (
            <div className="bg-white dark:bg-[rgba(15,23,42,0.58)] dark:border dark:border-[var(--border-subtle)] rounded-2xl p-12 text-center text-[var(--muted-foreground)]">불러오는 중...</div>
          ) : hasError ? (
            <EmptyState type="error" onAction={handleRetry} actionLabel="다시 시도" />
          ) : filteredPolicies.length === 0 ? (
            <div className="bg-white dark:bg-transparent dark:border dark:border-dashed dark:border-[rgba(148,163,184,0.22)] rounded-2xl px-6 py-10 text-center max-w-md mx-auto">
              <p className="text-[var(--muted-foreground)] mb-4">저장된 정책이 없습니다</p>
              <Link to="/policies">
                <Button variant="secondary">정책 찾으러 가기</Button>
              </Link>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredPolicies.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((policy) => (
                <div key={policy.id} className="group relative">
                  <PolicyCard {...policy} applicationStatus={!policy.startsAt && !policy.endsAt && !policy.isAlwaysOpen ? undefined : policy.applicationStatus} />
                  <div className="absolute top-4 right-4 z-10 transition-transform duration-300 ease-out group-hover:-translate-y-2">
                    <button
                      className="p-2 bg-white/95 dark:bg-[rgba(15,23,42,0.85)] hover:bg-gray-50 dark:hover:bg-[rgba(30,41,59,0.9)] border border-gray-300 dark:border-[var(--border-default)] hover:border-gray-400 dark:hover:border-[var(--border-strong)] rounded-xl shadow-sm transition-all duration-200 active:scale-95 backdrop-blur-sm cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPolicyToDelete(policy.id);
                        setDeleteConfirmOpen(true);
                      }}
                      aria-label="정책 삭제"
                    >
                      <Trash2 className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                </div>
                ))}
              </div>
              {Math.ceil(filteredPolicies.length / PAGE_SIZE) > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    이전
                  </Button>
                  <span className="text-sm text-[var(--muted-foreground)] px-2">
                    {currentPage} / {Math.ceil(filteredPolicies.length / PAGE_SIZE)}
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentPage(Math.min(Math.ceil(filteredPolicies.length / PAGE_SIZE), currentPage + 1))}
                    disabled={currentPage === Math.ceil(filteredPolicies.length / PAGE_SIZE)}
                  >
                    다음
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {deleteConfirmOpen && policyToDelete && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[rgba(15,23,42,0.95)] dark:backdrop-blur-xl dark:border dark:border-[var(--border-default)] rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">정책 삭제 확인</h3>
              <button
                className="p-1 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-[rgba(30,41,59,0.6)] dark:hover:text-white transition-colors cursor-pointer"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">정말로 이 정책을 삭제하시겠습니까?</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" className="px-4 py-2" onClick={() => setDeleteConfirmOpen(false)}>
                취소
              </Button>
              <Button
                variant="danger"
                className="px-4 py-2"
                onClick={() => {
                  void handleDelete(policyToDelete);
                  setDeleteConfirmOpen(false);
                }}
              >
                삭제
              </Button>
            </div>
          </div>
        </div>
      )}

      {editProfileOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[rgba(15,23,42,0.95)] dark:backdrop-blur-xl dark:border dark:border-[var(--border-default)] rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">프로필 수정</h3>
              <button
                className="p-1 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-[rgba(30,41,59,0.6)] dark:hover:text-white transition-colors cursor-pointer"
                onClick={() => setEditProfileOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSaveProfile();
              }}
            >
              <div>
                <label className="block text-sm font-medium mb-2">표시 이름</label>
                <Input
                  value={editForm.displayName}
                  onChange={(e) => setEditForm((current) => ({ ...current, displayName: e.target.value }))}
                  placeholder="예: 홍길동"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">나이</label>
                <Input
                  type="number"
                  min={14}
                  max={120}
                  value={editForm.age}
                  onChange={(e) => setEditForm((current) => ({ ...current, age: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">지역</label>
                <CustomSelect
                  value={editForm.regionCode}
                  onChange={(v) => setEditForm((current) => ({ ...current, regionCode: v }))}
                  options={REGION_OPTIONS}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">관심사</label>
                <p className="mb-2 text-xs text-[var(--muted-foreground)]">최대 {MAX_INTERESTS}개까지 선택할 수 있어요.</p>
                <div className="flex flex-col gap-2">
                  {INTEREST_OPTIONS.map((opt) => {
                    const isSelected = editForm.interests.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setEditForm((current) => ({
                            ...current,
                            interests: isSelected
                              ? current.interests.filter((i) => i !== opt.value)
                              : current.interests.length >= MAX_INTERESTS
                                ? current.interests
                                : [...current.interests, opt.value],
                          }));
                          if (!isSelected && editForm.interests.length >= MAX_INTERESTS) {
                            toast.info(`관심사는 최대 ${MAX_INTERESTS}개까지 선택할 수 있어요.`);
                          }
                        }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-colors text-left cursor-pointer ${
                          isSelected
                            ? 'border-[var(--accent)] bg-blue-50 text-[var(--accent)] dark:bg-[rgba(59,130,246,0.12)] dark:text-[#93C5FD]'
                            : 'border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-[var(--muted)] dark:bg-[rgba(30,41,59,0.4)] dark:hover:bg-[rgba(30,41,59,0.7)]'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-gray-300'
                          }`}
                        >
                          {isSelected && (
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                              <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                          )}
                        </div>
                        <span className="flex-1">{opt.label}</span>
                        <span className="text-xs text-[var(--muted-foreground)]">선택 가능</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="secondary" className="px-4 py-2" onClick={() => setEditProfileOpen(false)}>
                  취소
                </Button>
                <Button type="submit" variant="primary" className="px-4 py-2" loading={editProfileLoading}>
                  저장
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

export default MyPage;
