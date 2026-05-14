import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ArrowRight, CheckCircle2, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { resendVerification } from '../api/auth';
import { ApiClientError, getStoredUserProfile } from '../api/client';
import { Button } from '../components/atoms/Button';

const EMAIL_VERIFIED_EVENT_KEY = 'bengo:email-verified';

type EmailVerificationMessage = {
  status?: string;
};

function parseEmailVerificationMessage(value: unknown): EmailVerificationMessage | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as EmailVerificationMessage;
    } catch {
      return null;
    }
  }

  if (typeof value === 'object' && 'status' in value) {
    return value as EmailVerificationMessage;
  }

  return null;
}

export function CheckEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storedUser = getStoredUserProfile();
  const email = searchParams.get('email') ?? storedUser?.email ?? '';
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [cooldown]);

  useEffect(() => {
    let handled = false;

    const handleVerified = () => {
      if (handled) {
        return;
      }

      handled = true;
      setVerified(true);
      toast.success('이메일 인증이 완료되었습니다. 인증 탭에서 로그인해주세요.');
    };

    const handleStorage = (event: StorageEvent) => {
      const message = parseEmailVerificationMessage(event.newValue);
      if (event.key === EMAIL_VERIFIED_EVENT_KEY && message?.status === 'success') {
        handleVerified();
      }
    };

    window.addEventListener('storage', handleStorage);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(EMAIL_VERIFIED_EVENT_KEY);
      channel.onmessage = (event) => {
        const message = parseEmailVerificationMessage(event.data);
        if (message?.status === 'success') {
          handleVerified();
        }
      };
    } catch {
      channel = null;
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      channel?.close();
    };
  }, []);

  const handleResend = async () => {
    if (cooldown > 0) {
      return;
    }

    if (!email) {
      toast.error('이메일 정보가 없습니다. 다시 회원가입 또는 로그인해주세요.');
      return;
    }

    setLoading(true);
    try {
      await resendVerification(email);
      setCooldown(60);
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
          <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${verified ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-[var(--accent)]'}`}>
            {verified ? <CheckCircle2 className="h-7 w-7" aria-hidden="true" /> : <MailCheck className="h-7 w-7" aria-hidden="true" />}
          </div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">
            {verified ? '이메일 인증이 완료되었습니다' : '이메일 인증이 필요합니다'}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
            {verified ? (
              <>
                메일 링크로 열린 탭에서 로그인 화면으로 이동합니다.
                <br />
                이 탭은 닫아도 됩니다.
              </>
            ) : (
              <>
                {email ? <><span className="font-medium text-[var(--foreground)]">{email}</span>로 인증 링크를 보냈습니다.</> : '가입한 이메일로 인증 링크를 보냈습니다.'}
                <br />
                메일의 인증 링크를 눌러야 회원가입이 완료됩니다.
              </>
            )}
          </p>

          <div className="mt-7 space-y-3">
            {verified ? (
              <Button type="button" className="w-full" onClick={() => navigate('/login')}>
                로그인하기
              </Button>
            ) : (
              <>
                <Button type="button" className="w-full" onClick={() => navigate('/login')}>
                  인증 후 로그인하기
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  loading={loading}
                  disabled={cooldown > 0}
                  onClick={handleResend}
                >
                  {cooldown > 0 ? `인증 메일 재발송 ${cooldown}초` : '인증 메일 재발송'}
                </Button>
              </>
            )}
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
