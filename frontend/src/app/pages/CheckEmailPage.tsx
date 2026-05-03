import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ArrowRight, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { resendVerification } from '../api/auth';
import { ApiClientError, getStoredUserProfile } from '../api/client';
import { Button } from '../components/atoms/Button';

export function CheckEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storedUser = getStoredUserProfile();
  const email = searchParams.get('email') ?? storedUser?.email ?? '';
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    if (!email) {
      toast.error('이메일 정보가 없습니다. 다시 회원가입 또는 로그인해주세요.');
      return;
    }

    setLoading(true);
    try {
      await resendVerification(email);
      toast.success('인증 메일을 다시 보냈습니다.');
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : '인증 메일 재발송에 실패했습니다.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 sm:gap-3 mb-4 hover:opacity-80 transition-opacity">
            <div className="relative">
              <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg shadow-blue-500/30">
                <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 text-white" strokeWidth={2.5} aria-hidden="true" />
              </div>
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full"></div>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-none">bengo</span>
              <span className="text-[10px] sm:text-xs text-[var(--muted-foreground)] tracking-wide leading-none mt-0.5 sm:mt-1">benefit + go</span>
            </div>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[var(--accent)]">
            <MailCheck className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">인증 메일을 확인해주세요</h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
            {email ? <><span className="font-medium text-[var(--foreground)]">{email}</span>로 인증 링크를 보냈습니다.</> : '가입한 이메일로 인증 링크를 보냈습니다.'}
            <br />
            링크를 눌러야 자격확인, 정책 저장, MY 기능을 이용할 수 있어요.
          </p>

          <div className="mt-7 space-y-3">
            <Button type="button" className="w-full" onClick={() => navigate('/login')}>
              로그인하러 가기
            </Button>
            <Button type="button" variant="secondary" className="w-full" loading={loading} onClick={handleResend}>
              인증 메일 재발송
            </Button>
            <Link to="/policies" className="block text-sm text-[var(--muted-foreground)] hover:text-[var(--accent)]">
              가입 없이 정책 둘러보기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckEmailPage;
