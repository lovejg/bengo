import { useEffect, useState } from 'react';
import { User, MapPin, Sparkles, Edit, Trash2, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { getPolicyDetail } from '../api/policies';
import { ApiClientError, getStoredUserProfile, setStoredUserProfile } from '../api/client';
import { getMyPolicies, removeMyPolicy } from '../api/me';
import { MainLayout } from '../components/templates/MainLayout';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Input } from '../components/atoms/Input';
import { PolicyCard, PolicyCardProps } from '../components/organisms/PolicyCard';
import { CustomSelect } from '../components/atoms/CustomSelect';
import { EmptyState } from '../components/molecules/EmptyState';
import type { MyPolicyItem, PolicyDetail, UserProfileSummary } from '../types';

type StatusFilter = 'all' | 'upcoming' | 'recruiting' | 'closed';
type SavedPolicy = PolicyCardProps & {
  applicationStatus: 'upcoming' | 'recruiting' | 'closed';
  stateId: string;
};

interface UserProfileView {
  name: string;
  age: number;
  region: string;
  interests: string[];
}

interface EditFormState {
  age: string;
  regionCode: string;
  interests: string[];
}

const REGION_OPTIONS: { value: string; label: string }[] = [
  { value: 'seoul', label: '서울' },
];

const INTEREST_OPTIONS: { value: string; label: string }[] = [
  { value: 'youth_policy', label: '청년정책' },
  { value: 'childcare_policy', label: '육아/보육정책' },
];

const regionLabels: Record<string, string> = {
  seoul: '서울',
};

const interestLabels: Record<string, string> = {
  youth_policy: '청년정책',
  childcare_policy: '육아정책',
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
    name: user.email.split('@')[0],
    age: user.age,
    region: regionLabels[user.regionCode] ?? user.regionCode,
    interests: user.interests.map((interest) => interestLabels[interest] ?? interest),
  };
}

const PAGE_SIZE = 12;

export function MyPage() {
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
  const [user, setUser] = useState<UserProfileView | null>(mapStoredUserToView(getStoredUserProfile()));
  const [editForm, setEditForm] = useState<EditFormState>(() => {
    const stored = getStoredUserProfile();
    return {
      age: stored ? String(stored.age) : '',
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
      setUser(mapStoredUserToView(storedUser));

      try {
        const response = await getMyPolicies();
        const visibleItems = response.items;
        const details = await Promise.all(
          visibleItems.map(async (item) => {
            const detail = await getPolicyDetail(item.policyId);
            return mapSavedPolicy(item, detail);
          }),
        );

        setSavedPolicies(details);
      } catch (error) {
        setHasError(true);
        const message = error instanceof ApiClientError ? error.message : '내 정책 정보를 불러오는데 실패했습니다';
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadMyPolicies();
  }, [reloadKey]);

  const handleDelete = async (id: string) => {
    try {
      await removeMyPolicy(id);
      setSavedPolicies((current) => current.filter((policy) => policy.id !== id));
      toast.success('정책이 저장 목록에서 삭제되었습니다');
    } catch (error) {
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

  const handleSaveProfile = () => {
    const storedUser = getStoredUserProfile();

    if (!storedUser) {
      toast.error('로그인 정보가 없습니다');
      return;
    }

    const nextStoredUser = {
      ...storedUser,
      age: editForm.age ? Number(editForm.age) : storedUser.age,
      regionCode: (editForm.regionCode || storedUser.regionCode) as typeof storedUser.regionCode,
      interests: editForm.interests.length > 0 ? editForm.interests as typeof storedUser.interests : storedUser.interests,
    };

    setStoredUserProfile(nextStoredUser);
    setUser(mapStoredUserToView(nextStoredUser));
    setEditProfileOpen(false);
    toast.success('프로필이 저장되었습니다');
  };

  const handleRetry = () => {
    setReloadKey((current) => current + 1);
  };

  return (
    <MainLayout>
      <div className="bg-gradient-to-b from-blue-50 to-white py-8 sm:py-10 md:py-12">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-6 md:mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="p-4 bg-blue-100 rounded-2xl flex-shrink-0">
                  <User className="h-8 w-8 text-[var(--accent)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="mb-2 text-xl sm:text-2xl md:text-3xl break-words">
                    {user ? `${user.name}님` : '내 정보'}
                  </h2>
                  <div className="flex flex-wrap gap-3 text-sm text-[var(--muted-foreground)]">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 flex-shrink-0" />
                      <span>{user ? `${user.age}세` : '나이 정보 없음'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span>{user?.region ?? '지역 정보 없음'}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {(user?.interests ?? []).map((interest) => (
                      <Badge key={interest}>{interest}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <Button variant="secondary" className="gap-2 w-full md:w-auto" onClick={() => {
                const stored = getStoredUserProfile();
                setEditForm({
                  age: stored ? String(stored.age) : '',
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 md:mb-8">
            <div className="bg-white rounded-xl p-4 text-center">
              <p className="text-xl sm:text-2xl font-semibold text-[var(--accent)] mb-1">{statusCounts.all}</p>
              <p className="text-xs sm:text-sm text-[var(--muted-foreground)]">전체 저장</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center">
              <p className="text-xl sm:text-2xl font-semibold text-blue-600 mb-1">{statusCounts.upcoming}</p>
              <p className="text-xs sm:text-sm text-[var(--muted-foreground)]">예정</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center">
              <p className="text-xl sm:text-2xl font-semibold text-amber-600 mb-1">{statusCounts.recruiting}</p>
              <p className="text-xs sm:text-sm text-[var(--muted-foreground)]">모집중</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center">
              <p className="text-xl sm:text-2xl font-semibold text-emerald-600 mb-1">{statusCounts.closed}</p>
              <p className="text-xs sm:text-sm text-[var(--muted-foreground)]">마감</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-2 mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                statusFilter === 'all' ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'hover:bg-[var(--muted)]'
              }`}
            >
              전체 ({statusCounts.all})
            </button>
            <button
              onClick={() => { setStatusFilter('upcoming'); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                statusFilter === 'upcoming' ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'hover:bg-[var(--muted)]'
              }`}
            >
              예정 ({statusCounts.upcoming})
            </button>
            <button
              onClick={() => { setStatusFilter('recruiting'); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                statusFilter === 'recruiting' ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'hover:bg-[var(--muted)]'
              }`}
            >
              모집중 ({statusCounts.recruiting})
            </button>
            <button
              onClick={() => { setStatusFilter('closed'); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                statusFilter === 'closed' ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'hover:bg-[var(--muted)]'
              }`}
            >
              마감 ({statusCounts.closed})
            </button>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-xl p-12 text-center text-[var(--muted-foreground)]">불러오는 중...</div>
          ) : hasError ? (
            <EmptyState type="error" onAction={handleRetry} actionLabel="다시 시도" />
          ) : filteredPolicies.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <p className="text-[var(--muted-foreground)] mb-4">저장된 정책이 없습니다</p>
              <Link to="/policies">
                <Button variant="secondary">정책 찾으러 가기</Button>
              </Link>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredPolicies.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((policy) => (
                <div key={policy.id} className="relative">
                  <PolicyCard {...policy} applicationStatus={!policy.startsAt && !policy.endsAt && !policy.isAlwaysOpen ? undefined : policy.applicationStatus} />
                  <div className="absolute bottom-4 right-4 z-10">
                    <button
                      className="p-2 bg-white/95 hover:bg-gray-50 border border-gray-300 hover:border-gray-400 rounded-xl shadow-sm transition-all duration-200 active:scale-95 backdrop-blur-sm"
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
                  {(() => {
                    const s = policy.isAlwaysOpen ? 'always'
                      : !policy.endsAt ? null
                      : new Date(policy.endsAt).getTime() < Date.now() ? 'closed'
                      : 'recruiting';
                    const labels = { recruiting: '모집중', always: '상시', closed: '마감' } as const;
                    return s ? (
                      <div className="absolute top-4 right-4 z-10">
                        <Badge variant={s}>{labels[s]}</Badge>
                      </div>
                    ) : null;
                  })()}
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
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">정책 삭제 확인</h3>
              <button
                className="p-1 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
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
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">프로필 수정</h3>
              <button
                className="p-1 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => setEditProfileOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">나이</label>
                <Input
                  type="number"
                  min={1}
                  max={140}
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
                <div className="flex flex-col gap-2">
                  {INTEREST_OPTIONS.map((opt) => {
                    const isSelected = editForm.interests.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setEditForm((current) => ({
                            ...current,
                            interests: isSelected
                              ? current.interests.filter((i) => i !== opt.value)
                              : [...current.interests, opt.value],
                          }))
                        }
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-colors text-left ${
                          isSelected
                            ? 'border-[var(--accent)] bg-blue-50 text-[var(--accent)]'
                            : 'border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-[var(--muted)]'
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
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="secondary" className="px-4 py-2" onClick={() => setEditProfileOpen(false)}>
                  취소
                </Button>
                <Button variant="primary" className="px-4 py-2" onClick={handleSaveProfile}>
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
