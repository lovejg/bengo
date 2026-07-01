import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { completeProfile } from '../api/auth';
import { ApiClientError, getAccessToken, getStoredUserProfile } from '../api/client';
import { Button } from '../components/atoms/Button';
import { Chip } from '../components/atoms/Chip';
import { Input } from '../components/atoms/Input';
import { REGION_OPTIONS } from '../lib/regions';
import type { Gender, InterestCategory, RegionCode } from '../types';

const CURRENT_YEAR = 2026;
const MAX_INTERESTS = 2;

const interestOptions: Array<{ id: string; value?: InterestCategory; label: string }> = [
  { id: 'youth_policy', value: 'youth_policy', label: '청년정책' },
  { id: 'childcare_policy', value: 'childcare_policy', label: '육아정책' },
  { id: 'senior_policy', value: 'senior_policy', label: '노인정책' },
  { id: 'disability_policy', value: 'disability_policy', label: '장애인정책' },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    birthYear: '',
    gender: 'unspecified' as Gender,
    regionCode: 'seoul' as RegionCode,
    interests: ['youth_policy'],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const token = getAccessToken();
    const user = getStoredUserProfile();

    if (!token || !user) {
      navigate('/login', { replace: true });
      return;
    }

    if (user.profileCompleted) {
      navigate('/policies', { replace: true });
    }
  }, [navigate]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    const birthYear = Number(formData.birthYear);

    if (!formData.birthYear) {
      nextErrors.birthYear = '출생연도를 입력해주세요';
    } else if (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > CURRENT_YEAR) {
      nextErrors.birthYear = '올바른 출생연도를 입력해주세요';
    }

    if (!formData.regionCode) {
      nextErrors.regionCode = '거주 지역을 선택해주세요';
    }

    if (formData.interests.length === 0) {
      nextErrors.interests = '관심 분야를 1개 이상 선택해주세요';
    } else if (formData.interests.length > MAX_INTERESTS) {
      nextErrors.interests = `관심 분야는 최대 ${MAX_INTERESTS}개까지 선택할 수 있습니다`;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const birthYear = Number(formData.birthYear);
      await completeProfile({
        age: Math.max(0, CURRENT_YEAR - birthYear),
        gender: formData.gender,
        regionCode: formData.regionCode,
        interests: formData.interests
          .map((interest) => interestOptions.find((option) => option.id === interest)?.value)
          .filter(Boolean) as InterestCategory[],
      });

      toast.success('프로필이 완성되었습니다.');
      navigate('/policies', { replace: true });
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : '프로필 저장에 실패했습니다.';
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
          <p className="text-sm sm:text-base text-[var(--muted-foreground)]">맞춤 추천에 필요한 정보를 조금만 더 알려주세요</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-5">
          <div>
            <label className="block mb-2">출생연도</label>
            <Input
              type="number"
              placeholder="예: 1995"
              value={formData.birthYear}
              onChange={(event) => setFormData({ ...formData, birthYear: event.target.value })}
              error={errors.birthYear}
            />
          </div>

          <div>
            <label className="block mb-2">성별</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['male', '남성'],
                ['female', '여성'],
                ['unspecified', '선택 안 함'],
              ].map(([value, label]) => (
                <Chip
                  key={value}
                  selected={formData.gender === value}
                  onClick={() => setFormData({ ...formData, gender: value as Gender })}
                  className="px-2 text-xs"
                >
                  {label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <label className="block mb-2">거주 지역</label>
            <select
              value={formData.regionCode}
              onChange={(event) => setFormData({ ...formData, regionCode: event.target.value as RegionCode })}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            >
              {REGION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.regionCode && <p className="mt-1 text-sm text-red-500">{errors.regionCode}</p>}
          </div>

          <div>
            <label className="block mb-3">관심 분야</label>
            <p className="mb-3 text-xs text-[var(--muted-foreground)]">최대 {MAX_INTERESTS}개까지 선택할 수 있어요.</p>
            <div className="space-y-2">
              {interestOptions.map((interest) => {
                const selected = formData.interests.includes(interest.id);
                return (
                  <button
                    key={interest.id}
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        interests: selected
                          ? formData.interests.filter((item) => item !== interest.id)
                          : formData.interests.length >= MAX_INTERESTS
                            ? formData.interests
                            : [...formData.interests, interest.id],
                      });
                      if (!selected && formData.interests.length >= MAX_INTERESTS) {
                        setErrors((current) => ({
                          ...current,
                          interests: `관심 분야는 최대 ${MAX_INTERESTS}개까지 선택할 수 있습니다`,
                        }));
                      } else {
                        setErrors((current) => ({ ...current, interests: '' }));
                      }
                    }}
                    className={`w-full rounded-xl border p-4 text-left transition-colors ${
                      selected
                        ? 'border-[var(--accent)] bg-blue-50'
                        : 'border-[var(--border)] hover:bg-[var(--muted)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{interest.label}</span>
                      <span className="text-xs text-[var(--muted-foreground)]">선택 가능</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.interests && <p className="mt-1 text-sm text-red-500">{errors.interests}</p>}
          </div>

          <Button type="submit" loading={loading} className="w-full">
            맞춤 정책 추천 받기
          </Button>
        </form>
      </div>
    </div>
  );
}

export default OnboardingPage;
