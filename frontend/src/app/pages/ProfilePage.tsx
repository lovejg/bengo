import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { LockKeyhole, ShieldAlert, User } from 'lucide-react';
import { toast } from 'sonner';
import { changePassword, deleteAccount } from '../api/auth';
import { MainLayout } from '../components/templates/MainLayout';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  ApiClientError,
  clearAuthMethod,
  clearAccessToken,
  clearStoredUserProfile,
  getAuthMethod,
  getEmailVerificationPath,
  getStoredUserProfile,
} from '../api/client';

export function ProfilePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = getStoredUserProfile();
  const isOAuthUser = getAuthMethod() === 'oauth';
  const userName = user ? user.displayName || user.email.split('@')[0] : '사용자';
  const activeTab = isOAuthUser || searchParams.get('tab') === 'withdraw' ? 'withdraw' : 'password';
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [deleteForm, setDeleteForm] = useState({
    confirmText: '',
    password: '',
  });
  const [requiresDeletePassword, setRequiresDeletePassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const shouldShowDeletePassword = !isOAuthUser || requiresDeletePassword;

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (user && !user.emailVerified) {
      navigate(getEmailVerificationPath(user.email), { replace: true });
      return;
    }

    if (user && !user.profileCompleted) {
      navigate('/onboarding', { replace: true });
    }
  }, [navigate, user]);

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error('현재 비밀번호와 새 비밀번호를 입력해주세요.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('새 비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('비밀번호가 변경되었습니다.');
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : '비밀번호 변경에 실패했습니다.';
      toast.error(message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async (event: React.FormEvent) => {
    event.preventDefault();

    if (deleteForm.confirmText.trim() !== '탈퇴') {
      toast.error('확인 문구를 정확히 입력해주세요.');
      return;
    }

    setDeleteLoading(true);
    try {
      await deleteAccount(shouldShowDeletePassword && deleteForm.password ? { password: deleteForm.password } : {});
      clearAccessToken();
      clearAuthMethod();
      clearStoredUserProfile();
      toast.success('회원탈퇴가 완료되었습니다.');
      navigate('/', { replace: true });
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        error.status === 400 &&
        error.message.includes('비밀번호')
      ) {
        setRequiresDeletePassword(true);
        toast.error('계정 확인을 위해 현재 비밀번호를 입력해주세요.');
        return;
      }
      const message = error instanceof ApiClientError ? error.message : '회원탈퇴에 실패했습니다.';
      toast.error(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="bg-[var(--background)] py-10 sm:py-14">
        <div className="container mx-auto px-4 sm:px-8 max-w-[1080px]">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 dark:bg-[rgba(59,130,246,0.14)]">
              <User className="h-5 w-5 text-blue-600 dark:text-[#93C5FD]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-[var(--foreground)]">계정 설정</h1>
              <p className="truncate text-sm text-[var(--muted-foreground)]">{userName} · {user?.email ?? ''}</p>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(tab) => {
              if (isOAuthUser && tab === 'password') return;
              setSearchParams({ tab }, { replace: true });
            }}
            className="max-w-[760px]"
          >
            <TabsList className="mb-5 grid h-12 w-full grid-cols-2 rounded-2xl bg-white dark:bg-[rgba(15,23,42,0.56)] p-1.5 shadow-sm dark:shadow-none border border-[var(--border)] dark:border-[var(--border-subtle)]">
              <TabsTrigger
                value="password"
                disabled={isOAuthUser}
                className="rounded-xl text-[var(--muted-foreground)] transition-all hover:bg-blue-50 hover:text-blue-700 disabled:pointer-events-none disabled:opacity-40 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
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
              <section className="rounded-2xl border border-[var(--border)] dark:border-[var(--border-default)] bg-white dark:bg-[rgba(15,23,42,0.72)] dark:backdrop-blur-xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.20)] p-5 shadow-sm sm:p-6">
                <div className="mb-6 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-[rgba(59,130,246,0.14)]">
                    <LockKeyhole className="h-5 w-5 text-blue-600 dark:text-[#93C5FD]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--foreground)]">비밀번호 변경</h2>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">새 비밀번호는 8자 이상이어야 합니다.</p>
                  </div>
                </div>
                <form className="space-y-4" onSubmit={handleChangePassword}>
                  <Input
                    type="password"
                    placeholder="현재 비밀번호"
                    value={passwordForm.currentPassword}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                    autoComplete="current-password"
                  />
                  <Input
                    type="password"
                    placeholder="새 비밀번호"
                    value={passwordForm.newPassword}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                    autoComplete="new-password"
                  />
                  <Input
                    type="password"
                    placeholder="새 비밀번호 확인"
                    value={passwordForm.confirmPassword}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                    autoComplete="new-password"
                  />
                  <Button type="submit" loading={passwordLoading} className="w-full sm:w-auto">변경하기</Button>
                </form>
              </section>
            </TabsContent>

            <TabsContent value="withdraw">
              <section className="rounded-2xl border border-red-100 dark:border-[rgba(248,113,113,0.22)] bg-white dark:bg-[rgba(15,23,42,0.72)] dark:backdrop-blur-xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.20)] p-5 shadow-sm sm:p-6">
                <div className="mb-6 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-[rgba(248,113,113,0.14)]">
                    <ShieldAlert className="h-5 w-5 text-red-600 dark:text-[#FCA5A5]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--foreground)]">회원탈퇴</h2>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">탈퇴 후 계정 데이터는 복구할 수 없습니다.</p>
                  </div>
                </div>
                <div className="rounded-xl border border-red-100 bg-red-50 dark:bg-[rgba(248,113,113,0.10)] dark:border-[rgba(248,113,113,0.24)] px-4 py-3 text-sm text-red-700 dark:text-[#FCA5A5]">
                  저장한 정책, 맞춤 정보, 계정 데이터가 함께 삭제됩니다.
                </div>
                <form className="mt-4 space-y-4" onSubmit={handleDeleteAccount}>
                  <Input
                    placeholder='탈퇴를 원하시면 "탈퇴"라고 작성해 주십시오'
                    value={deleteForm.confirmText}
                    onChange={(event) => setDeleteForm((current) => ({ ...current, confirmText: event.target.value }))}
                  />
                  {shouldShowDeletePassword && (
                    <Input
                      type="password"
                      placeholder="현재 비밀번호"
                      value={deleteForm.password}
                      onChange={(event) => setDeleteForm((current) => ({ ...current, password: event.target.value }))}
                      autoComplete="current-password"
                      helperText={isOAuthUser ? '이 이메일에 일반 가입 이력이 있어 비밀번호 확인이 필요합니다.' : undefined}
                    />
                  )}
                  <Button type="submit" variant="danger" loading={deleteLoading} className="w-full sm:w-auto">탈퇴하기</Button>
                </form>
              </section>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}

export default ProfilePage;
