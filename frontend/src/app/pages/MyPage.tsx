import { useState } from 'react';
import { User, MapPin, Sparkles, Edit, Trash2, X } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { MainLayout } from '../components/templates/MainLayout';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Input } from '../components/atoms/Input';
import { Chip } from '../components/atoms/Chip';
import { PolicyCard, PolicyCardProps } from '../components/organisms/PolicyCard';
import { EmptyState } from '../components/molecules/EmptyState';

export function MyPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'recruiting' | 'closed'>('all');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<string | null>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  // Mock user data
  const [user, setUser] = useState({
    name: '홍길동',
    age: 28,
    region: '강남구',
    interests: ['청년정책'],
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    age: 0,
    region: '',
    interests: '',
  });

  // Mock saved policies
  const [savedPolicies, setSavedPolicies] = useState<(PolicyCardProps & { applicationStatus: 'upcoming' | 'recruiting' | 'closed' })[]>([
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
      bookmarked: true,
      applicationStatus: 'recruiting',
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
      bookmarked: true,
      applicationStatus: 'upcoming',
    },
    {
      id: '5',
      title: '마포구 청년 문화활동 지원',
      summary: '마포구 거주 청년에게 문화활동비 연 30만원 지원',
      agency: '마포구청',
      region: '마포구',
      period: '2026.01.01 ~ 2026.12.31',
      status: 'recruiting',
      source: '크롤링',
      categories: ['culture'],
      bookmarked: true,
      applicationStatus: 'recruiting',
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
      bookmarked: true,
      applicationStatus: 'closed',
    },
  ]);

  const handleDelete = (id: string) => {
    setSavedPolicies(savedPolicies.filter(p => p.id !== id));
    toast.success('정책이 저장 목록에서 삭제되었습니다');
  };

  const filteredPolicies = savedPolicies.filter((policy) => {
    if (statusFilter === 'all') return true;
    return policy.applicationStatus === statusFilter;
  });

  const statusCounts = {
    all: savedPolicies.length,
    upcoming: savedPolicies.filter((p) => p.applicationStatus === 'upcoming').length,
    recruiting: savedPolicies.filter((p) => p.applicationStatus === 'recruiting').length,
    closed: savedPolicies.filter((p) => p.applicationStatus === 'closed').length,
  };

  return (
    <MainLayout>
      <div className="bg-gradient-to-b from-blue-50 to-white py-8 sm:py-10 md:py-12">
        <div className="container mx-auto px-4">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-6 md:mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="p-4 bg-blue-100 rounded-2xl flex-shrink-0">
                  <User className="h-8 w-8 text-[var(--accent)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="mb-2 text-xl sm:text-2xl md:text-3xl break-words">{user.name}님</h2>
                  <div className="flex flex-wrap gap-3 text-sm text-[var(--muted-foreground)]">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 flex-shrink-0" />
                      <span>{user.age}세</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span>{user.region}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {user.interests.map((interest) => (
                      <Badge key={interest}>{interest}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <Button variant="secondary" className="gap-2 w-full md:w-auto" onClick={() => setEditProfileOpen(true)}>
                <Edit className="h-4 w-4" />
                <span className="whitespace-nowrap">프로필 수정</span>
              </Button>
            </div>
          </div>

          {/* Stats */}
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

          {/* Filter Tabs */}
          <div className="bg-white rounded-xl p-2 mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                statusFilter === 'all'
                  ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                  : 'hover:bg-[var(--muted)]'
              }`}
            >
              전체 ({statusCounts.all})
            </button>
            <button
              onClick={() => setStatusFilter('upcoming')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                statusFilter === 'upcoming'
                  ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                  : 'hover:bg-[var(--muted)]'
              }`}
            >
              예정 ({statusCounts.upcoming})
            </button>
            <button
              onClick={() => setStatusFilter('recruiting')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                statusFilter === 'recruiting'
                  ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                  : 'hover:bg-[var(--muted)]'
              }`}
            >
              모집중 ({statusCounts.recruiting})
            </button>
            <button
              onClick={() => setStatusFilter('closed')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                statusFilter === 'closed'
                  ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                  : 'hover:bg-[var(--muted)]'
              }`}
            >
              마감 ({statusCounts.closed})
            </button>
          </div>

          {/* Policy List */}
          {filteredPolicies.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <p className="text-[var(--muted-foreground)] mb-4">저장된 정책이 없습니다</p>
              <Link to="/policies">
                <Button variant="secondary">정책 찾으러 가기</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredPolicies.map((policy) => (
                <div key={policy.id} className="relative">
                  <PolicyCard {...policy} />
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
                  <div className="absolute top-4 right-4 z-10">
                    <Badge
                      variant={
                        policy.applicationStatus === 'closed'
                          ? 'ineligible'
                          : policy.applicationStatus === 'recruiting'
                          ? 'recruiting'
                          : 'default'
                      }
                    >
                      {policy.applicationStatus === 'upcoming'
                        ? '예정'
                        : policy.applicationStatus === 'recruiting'
                        ? '모집중'
                        : '마감'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
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
              <Button
                variant="secondary"
                className="px-4 py-2"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                취소
              </Button>
              <Button
                variant="danger"
                className="px-4 py-2"
                onClick={() => {
                  handleDelete(policyToDelete);
                  setDeleteConfirmOpen(false);
                }}
              >
                삭제
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
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
                <label className="block text-sm font-medium mb-2">이름</label>
                <Input
                  type="text"
                  value={editForm.name || user.name}
                  onChange={(e) => {
                    setEditForm({ ...editForm, name: e.target.value });
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">나이</label>
                <Input
                  type="number"
                  value={editForm.age || user.age}
                  onChange={(e) => {
                    setEditForm({ ...editForm, age: parseInt(e.target.value, 10) });
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">지역</label>
                <Input
                  type="text"
                  value={editForm.region || user.region}
                  onChange={(e) => {
                    setEditForm({ ...editForm, region: e.target.value });
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">관심사 (쉼표로 구분)</label>
                <Input
                  type="text"
                  placeholder="청년정책, 주거, 취업"
                  value={editForm.interests || user.interests.join(', ')}
                  onChange={(e) => {
                    setEditForm({ ...editForm, interests: e.target.value });
                  }}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="secondary"
                  className="px-4 py-2"
                  onClick={() => setEditProfileOpen(false)}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  className="px-4 py-2"
                  onClick={() => {
                    // Save changes to server or update state
                    const newUser = {
                      name: editForm.name || user.name,
                      age: editForm.age || user.age,
                      region: editForm.region || user.region,
                      interests: editForm.interests ? editForm.interests.split(',').map(i => i.trim()) : user.interests,
                    };
                    setUser(newUser);
                    setEditProfileOpen(false);
                    toast.success('프로필이 저장되었습니다');
                  }}
                >
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