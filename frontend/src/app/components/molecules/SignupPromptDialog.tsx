import { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import googleLogo from '../../../img/google-logo.svg';
import naverLogo from '../../../img/naver-logo.svg';
import { continueWithOAuth } from '../../api/oauth';

interface SignupPromptDialogProps {
  children: ReactNode;
}

export function SignupPromptDialog({ children }: SignupPromptDialogProps) {
  const navigate = useNavigate();

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[min(calc(100vw-2rem),340px)] gap-3 border border-[var(--border)] bg-white p-5 shadow-2xl sm:p-6">
        <DialogHeader className="pr-6 text-left">
          <DialogTitle className="text-lg font-bold text-[var(--foreground)]">
            가입 방식 선택
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-[var(--muted-foreground)]">
            기존 회원가입 또는 소셜 계정으로 빠르게 시작하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-1 space-y-2.5">
          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="flex h-11 w-full items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--secondary)] text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
          >
            회원가입하기
          </button>

          <button
            type="button"
            onClick={() => continueWithOAuth('google')}
            className="relative flex h-11 w-full items-center justify-center rounded-lg border border-[var(--border)] bg-white text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
          >
            <img src={googleLogo} alt="" className="absolute left-4 h-4.5 w-4.5" aria-hidden="true" />
            구글로 가입
          </button>

          <button
            type="button"
            onClick={() => continueWithOAuth('naver')}
            className="relative flex h-11 w-full items-center justify-center rounded-lg border border-[#03c75a] bg-white text-sm font-semibold text-[#03c75a] transition-colors hover:bg-green-50"
          >
            <img src={naverLogo} alt="" className="absolute left-4 h-4.5 w-4.5" aria-hidden="true" />
            네이버로 가입
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
