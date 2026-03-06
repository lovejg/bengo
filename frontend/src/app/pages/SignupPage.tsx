import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { Chip } from '../components/atoms/Chip';

export function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    birthYear: '',
    gender: '',
    email: '',
    password: '',
    region: '',
    interests: ['청년정책'],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const regions = [
    { id: '강남', label: '강남구' },
    { id: '마포', label: '마포구' },
    { id: '송파', label: '송파구' },
  ];

  const interests = [
    { id: '청년정책', label: '청년정책', enabled: true },
    { id: '육아정책', label: '육아정책 (추후 제공)', enabled: false },
  ];

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다';
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요';
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 8자 이상이어야 합니다';
    }

    if (!formData.birthYear) {
      newErrors.birthYear = '출생연도를 입력해주세요';
    } else if (parseInt(formData.birthYear) < 1900 || parseInt(formData.birthYear) > 2026) {
      newErrors.birthYear = '올바른 출생연도를 입력해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.region) {
      newErrors.region = '지역을 선택해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
      setErrors({});
    }
  };

  const handleSubmit = async () => {
    if (validateStep2()) {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        navigate('/policies');
      } catch (error) {
        toast.error('회원가입에 실패했습니다. 다시 시도해주세요.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
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
          <p className="text-sm sm:text-base text-[var(--muted-foreground)]">맞춤 정책 추천을 받으려면 가입하세요</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--muted-foreground)]">
                {step === 1 ? '기본 정보' : '추가 정보'}
              </span>
              <span className="text-sm text-[var(--muted-foreground)]">{step} / 2</span>
            </div>
            <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-300"
                style={{ width: `${(step / 2) * 100}%` }}
              />
            </div>
          </div>

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
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
                  placeholder="8자 이상"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  error={errors.password}
                />
              </div>

              <div>
                <label className="block mb-2">출생연도</label>
                <Input
                  type="number"
                  placeholder="예: 1995"
                  value={formData.birthYear}
                  onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
                  error={errors.birthYear}
                />
              </div>

              <div>
                <label className="block mb-2">성별 (선택)</label>
                <div className="flex gap-2">
                  <Chip
                    selected={formData.gender === 'male'}
                    onClick={() => setFormData({ ...formData, gender: 'male' })}
                    className="flex-1"
                  >
                    남성
                  </Chip>
                  <Chip
                    selected={formData.gender === 'female'}
                    onClick={() => setFormData({ ...formData, gender: 'female' })}
                    className="flex-1"
                  >
                    여성
                  </Chip>
                  <Chip
                    selected={formData.gender === 'other'}
                    onClick={() => setFormData({ ...formData, gender: 'other' })}
                    className="flex-1"
                  >
                    기타
                  </Chip>
                </div>
              </div>

              <Button onClick={handleNext} className="w-full mt-6">
                다음
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Additional Info */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block mb-3">거주 지역</label>
                <div className="grid grid-cols-3 gap-2">
                  {regions.map((region) => (
                    <Chip
                      key={region.id}
                      selected={formData.region === region.id}
                      onClick={() => setFormData({ ...formData, region: region.id })}
                    >
                      {region.label}
                    </Chip>
                  ))}
                </div>
                {errors.region && (
                  <p className="mt-2 text-sm text-[var(--destructive)]">{errors.region}</p>
                )}
              </div>

              <div>
                <label className="block mb-3">관심 분야</label>
                <div className="space-y-2">
                  {interests.map((interest) => (
                    <div
                      key={interest.id}
                      className={`p-4 border rounded-xl ${
                        interest.enabled
                          ? 'border-[var(--accent)] bg-blue-50'
                          : 'border-[var(--border)] opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{interest.label}</span>
                        {!interest.enabled && (
                          <span className="text-xs text-[var(--muted-foreground)]">추후 제공</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
                  이전
                </Button>
                <Button onClick={handleSubmit} loading={loading} className="flex-1">
                  맞춤 정책 추천 받기
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-[var(--muted-foreground)]">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="text-[var(--accent)] hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignupPage;