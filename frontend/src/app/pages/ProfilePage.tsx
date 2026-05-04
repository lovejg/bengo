import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { LockKeyhole, ShieldAlert, User } from 'lucide-react';
import { MainLayout } from '../components/templates/MainLayout';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { getEmailVerificationPath, getStoredUserProfile } from '../api/client';

export function ProfilePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = getStoredUserProfile();
  const userName = user ? user.email.split('@')[0] : '사용자';
  const activeTab = searchParams.get('tab') === 'withdraw' ? 'withdraw' : 'password';

  useEffect(() => {
    if (user && !user.emailVerified) {
      navigate(getEmailVerificationPath(user.email), { replace: true });
      return;
    }

    if (user && !user.profileCompleted) {
      navigate('/onboarding', { replace: true });
    }
  }, [navigate, user]);

  return (
    <MainLayout>
      <div className="bg-[var(--background)] py-8 sm:py-10">
        <div className="container mx-auto px-4">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-[var(--foreground)]">계정 설정</h1>
              <p className="truncate text-sm text-[var(--muted-foreground)]">{userName} · {user?.email ?? ''}</p>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(tab) => setSearchParams({ tab }, { replace: true })}
            className="max-w-2xl"
          >
            <TabsList className="mb-5 grid h-12 w-full grid-cols-2 rounded-2xl bg-white p-1.5 shadow-sm border border-[var(--border)]">
              <TabsTrigger
                value="password"
                className="rounded-xl text-[var(--muted-foreground)] transition-all hover:bg-blue-50 hover:text-blue-700 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                비밀번호 변경
              </TabsTrigger>
              <TabsTrigger
                value="withdraw"
                className="rounded-xl text-[var(--muted-foreground)] transition-all hover:bg-red-50 hover:text-red-700 data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                회원탈퇴
              </TabsTrigger>
            </TabsList>

            <TabsContent value="password">
              <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-6 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                    <LockKeyhole className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--foreground)]">비밀번호 변경</h2>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">백엔드 API가 준비되면 연결할 예정입니다.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <Input type="password" placeholder="현재 비밀번호" disabled />
                  <Input type="password" placeholder="새 비밀번호" disabled />
                  <Input type="password" placeholder="새 비밀번호 확인" disabled />
                  <Button disabled className="w-full sm:w-auto">변경하기</Button>
                </div>
              </section>
            </TabsContent>

            <TabsContent value="withdraw">
              <section className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-6 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
                    <ShieldAlert className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--foreground)]">회원탈퇴</h2>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">탈퇴 API가 준비되면 확인 절차와 연결할 예정입니다.</p>
                  </div>
                </div>
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  저장한 정책, 맞춤 정보, 계정 데이터 삭제 안내 영역입니다.
                </div>
                <div className="mt-4 space-y-4">
                  <Input placeholder="탈퇴 확인 문구 입력" disabled />
                  <Button variant="danger" disabled className="w-full sm:w-auto">탈퇴하기</Button>
                </div>
              </section>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}

export default ProfilePage;
