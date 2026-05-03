import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ArrowRight, CheckCircle2, CircleAlert, Clock } from 'lucide-react';
import { Button } from '../components/atoms/Button';

const statusContent = {
  success: {
    icon: CheckCircle2,
    title: '이메일 인증이 완료되었습니다',
    description: '잠시 후 로그인 페이지로 이동합니다.',
    tone: 'text-emerald-600 bg-emerald-50',
  },
  expired: {
    icon: Clock,
    title: '인증 링크가 만료되었습니다',
    description: '로그인 후 인증 메일을 다시 요청해주세요.',
    tone: 'text-amber-600 bg-amber-50',
  },
  invalid: {
    icon: CircleAlert,
    title: '유효하지 않은 인증 링크입니다',
    description: '링크가 잘못되었거나 이미 사용된 링크일 수 있어요.',
    tone: 'text-red-600 bg-red-50',
  },
};

export function EmailVerifiedPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawStatus = searchParams.get('status') ?? 'invalid';
  const status = rawStatus in statusContent ? rawStatus as keyof typeof statusContent : 'invalid';
  const content = statusContent[status];
  const Icon = content.icon;

  useEffect(() => {
    if (status !== 'success') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      navigate('/login', { replace: true });
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [navigate, status]);

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
          <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${content.tone}`}>
            <Icon className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">{content.title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">{content.description}</p>
          <div className="mt-7 space-y-3">
            <Link to="/login" className="block">
              <Button type="button" className="w-full">
                로그인하기
              </Button>
            </Link>
            <Link to="/policies" className="block text-sm text-[var(--muted-foreground)] hover:text-[var(--accent)]">
              정책 먼저 둘러보기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmailVerifiedPage;
