import { Link, useLocation } from 'react-router';
import { Home, Search, Sparkles, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEffect, useState } from 'react';
import { getAccessToken, getStoredUserProfile } from '../../api/client';

export function BottomNav() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    const profile = getStoredUserProfile();
    setIsAuthenticated(Boolean(token && profile));
  }, [location.pathname]);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const items = [
    { to: '/', icon: Home, label: '홈' },
    { to: '/policies', icon: Search, label: '정책찾기' },
    { to: '/personalized', icon: Sparkles, label: '맞춤정책' },
    { to: isAuthenticated ? '/me' : '/login', icon: User, label: isAuthenticated ? 'MY' : '로그인' },
  ] as const;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-[rgba(8,13,23,0.86)] backdrop-blur-xl border-t border-[var(--border)] dark:border-[var(--border-subtle)] md:hidden"
      aria-label="하단 네비게이션"
    >
      <div className="flex items-stretch h-16">
        {items.map(({ to, icon: Icon, label }) => {
          const active = isActive(to);
          return (
            <Link
              key={label}
              to={to}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 transition-colors duration-150',
                active
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                className="h-5 w-5"
                strokeWidth={active ? 2.5 : 2}
                aria-hidden="true"
              />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
