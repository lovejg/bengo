import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { ApiClientError, getEmailVerificationPath } from '../api/client';
import { login } from '../api/auth';
import { continueWithOAuth } from '../api/oauth';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import googleLogo from '../../img/google-logo.svg';
import naverLogo from '../../img/naver-logo.svg';

export function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다';
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      setLoading(true);
      try {
        const response = await login({
          email: formData.email,
          password: formData.password,
        });
        toast.success('로그인 성공!');
        if (!response.user.emailVerified) {
          navigate(getEmailVerificationPath(response.user.email));
          return;
        }
        navigate(response.user.profileCompleted ? '/policies' : '/onboarding');
      } catch (error) {
        const message = error instanceof ApiClientError ? error.message : '로그인에 실패했습니다';
        toast.error(message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGuestLogin = () => {
    toast.info('비회원으로 둘러봅니다');
    navigate('/policies');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <a href="/" className="inline-flex items-center gap-2.5 sm:gap-3 mb-4 hover:opacity-80 transition-opacity">
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
          </a>
          <p className="text-sm sm:text-base text-[var(--muted-foreground)]">정책 혜택을 찾아드립니다</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-center mb-6">로그인</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-2">이메일</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={errors.email}
              />
            </div>

            <div>
              <label className="block mb-2">비밀번호</label>
              <Input
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                error={errors.password}
              />
            </div>

            <div className="flex justify-end">
              <Link to="#" className="text-sm text-[var(--accent)] hover:underline">
                비밀번호를 잊으셨나요?
              </Link>
            </div>

            <Button type="submit" loading={loading} className="w-full mt-6">
              로그인
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border)]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-[var(--muted-foreground)]">또는</span>
            </div>
          </div>

          {/* Guest Login */}
          <Button variant="secondary" onClick={handleGuestLogin} className="w-full">
            비회원으로 둘러보기
          </Button>

          {/* Social Login Placeholder */}
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => continueWithOAuth('google')}
              className="relative flex w-full items-center justify-center rounded-xl border border-[var(--border)] bg-white p-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)] cursor-pointer"
            >
              <img src={googleLogo} alt="" className="absolute left-4 h-5 w-5" aria-hidden="true" />
              구글로 계속하기
            </button>
            <button
              type="button"
              onClick={() => continueWithOAuth('naver')}
              className="relative flex w-full items-center justify-center rounded-xl border border-[#03C75A] bg-white p-3 text-sm font-semibold text-[#03C75A] transition-colors hover:bg-green-50 cursor-pointer"
            >
              <img src={naverLogo} alt="" className="absolute left-4 h-5 w-5" aria-hidden="true" />
              네이버로 계속하기
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-[var(--muted-foreground)]">
          계정이 없으신가요?{' '}
          <Link to="/signup" className="text-[var(--accent)] hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
