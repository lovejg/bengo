import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  buildOAuthUserProfile,
  setAccessToken,
  setStoredUserProfile,
} from '../api/client';

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const profileCompleted = searchParams.get('profileCompleted') === 'true';

    if (!token) {
      toast.error('OAuth 로그인 정보를 받지 못했습니다.');
      navigate('/login', { replace: true });
      return;
    }

    const profile = buildOAuthUserProfile(token, profileCompleted);
    if (!profile) {
      toast.error('OAuth 로그인 정보를 확인하지 못했습니다.');
      navigate('/login', { replace: true });
      return;
    }

    setAccessToken(token);
    setStoredUserProfile(profile);

    if (!profileCompleted) {
      navigate('/onboarding', { replace: true });
      return;
    }

    toast.success('로그인되었습니다.');
    navigate('/policies', { replace: true });
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-8 py-10 shadow-lg">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--accent)]" aria-hidden="true" />
        <p className="text-sm font-medium text-[var(--foreground)]">로그인 정보를 확인하고 있어요</p>
      </div>
    </div>
  );
}

export default OAuthCallbackPage;
