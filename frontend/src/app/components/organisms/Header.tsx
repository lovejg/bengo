import { Link, useLocation } from 'react-router';
import { ArrowRight, User, LogOut, ChevronDown, LockKeyhole, ShieldAlert, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '../atoms/Button';
import { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { NotificationButton } from '../molecules/NotificationButton';
import { SignupPromptDialog } from '../molecules/SignupPromptDialog';
import { getAccessToken, getAuthMethod, getStoredUserProfile, clearAccessToken, clearStoredUserProfile } from '../../api/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export function Header() {
  const location = useLocation();
  const { resolvedTheme, setTheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [isOAuthUser, setIsOAuthUser] = useState(false);
  const [themeMounted, setThemeMounted] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    const profile = getStoredUserProfile();
    setIsAuthenticated(Boolean(token && profile));
    setUserName(profile ? profile.displayName || profile.email.split('@')[0] : null);
    setIsOAuthUser(getAuthMethod() === 'oauth');
  }, [location.pathname]);

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  const handleLogout = () => {
    clearAccessToken();
    clearStoredUserProfile();
    setIsAuthenticated(false);
    setUserName(null);
    setIsOAuthUser(false);
  };

  const isActive = (path: string) => location.pathname === path;
  const navLinkBaseClass = 'text-[14px] font-medium transition-all duration-200 relative inline-block hover:scale-105';
  const isDarkTheme = themeMounted && resolvedTheme === 'dark';
  const themeToggleLabel = isDarkTheme ? '라이트 모드로 전환' : '다크 모드로 전환';

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-[rgba(8,13,23,0.78)] backdrop-blur-xl border-b border-[var(--border)] dark:border-[var(--border-subtle)]">
      <div className="container mx-auto px-4 sm:px-6 h-[68px] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 sm:gap-2.5 hover:opacity-80 transition-opacity group" aria-label="뱅고 홈">
          {/* Bengo Logo */}
          <div className="relative">
            <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-all duration-200">
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-white -rotate-45" strokeWidth={2.5} aria-hidden="true" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-[17px] sm:text-[19px] font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 dark:from-[#60A5FA] dark:to-[#A78BFA] bg-clip-text text-transparent leading-none">bengo</span>
            <span className="text-[9px] sm:text-[10px] text-[var(--muted-foreground)] tracking-wide leading-none mt-0.5">benefit + go</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8" aria-label="주요 메뉴">
          <Link
            to="/policies"
            className={cn(
              navLinkBaseClass,
              isActive('/policies') 
                ? 'text-[var(--accent)]' 
                : 'text-[var(--foreground)] hover:text-[var(--accent)]'
            )}
            aria-current={isActive('/policies') ? 'page' : undefined}
          >
            정책찾기
            {isActive('/policies') && (
              <span className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-[var(--accent)]"></span>
            )}
          </Link>
          <Link
            to="/personalized"
            className={cn(
              navLinkBaseClass,
              isActive('/personalized') 
                ? 'text-[var(--accent)]' 
                : 'text-[var(--foreground)] hover:text-[var(--accent)]'
            )}
            aria-current={isActive('/personalized') ? 'page' : undefined}
          >
            맞춤정책
            {isActive('/personalized') && (
              <span className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-[var(--accent)]"></span>
            )}
          </Link>
          {isAuthenticated && (
            <Link
              to="/me"
              className={cn(
                navLinkBaseClass,
                isActive('/me')
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--foreground)] hover:text-[var(--accent)]'
              )}
              aria-current={isActive('/me') ? 'page' : undefined}
            >
              MY
              {isActive('/me') && (
                <span className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-[var(--accent)]"></span>
              )}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={themeToggleLabel}
            title={themeToggleLabel}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] dark:bg-[rgba(15,23,42,0.6)] text-[var(--foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--accent)] dark:hover:bg-[rgba(30,41,59,0.78)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30"
            onClick={() => setTheme(isDarkTheme ? 'light' : 'dark')}
          >
            {isDarkTheme ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
          </button>
          {isAuthenticated && (
            <div className="hidden sm:block">
              <NotificationButton />
            </div>
          )}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="hidden sm:flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30"
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                  <span className="max-w-28 truncate">{userName}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-[var(--muted-foreground)]" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={10} className="w-48 rounded-xl p-1.5 shadow-xl">
                <DropdownMenuLabel className="px-3 py-2">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">{userName}</p>
                  <p className="text-xs font-normal text-[var(--muted-foreground)]">계정 메뉴</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isOAuthUser ? (
                  <DropdownMenuItem
                    disabled
                    className="cursor-not-allowed rounded-lg px-3 py-2.5"
                  >
                    <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                    비밀번호 변경
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-3 py-2.5">
                    <Link to="/profile?tab=password">
                      <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                      비밀번호 변경
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-3 py-2.5">
                  <Link to="/profile?tab=withdraw">
                    <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                    회원탈퇴
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer rounded-lg px-3 py-2.5 text-red-600 focus:bg-red-50 focus:text-red-600"
                  onSelect={handleLogout}
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link to="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <User className="h-4 w-4" aria-hidden="true" />
                  로그인
                </Button>
              </Link>
              <div className="hidden sm:block">
                <SignupPromptDialog>
                  <Button size="sm">회원가입</Button>
                </SignupPromptDialog>
              </div>
            </>
          )}
          
        </div>
      </div>
    </header>
  );
}
