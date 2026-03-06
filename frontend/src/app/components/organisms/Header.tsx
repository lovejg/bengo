import { Link, useLocation } from 'react-router';
import { ArrowRight, User, Menu, X } from 'lucide-react';
import { Button } from '../atoms/Button';
import { useState } from 'react';
import { cn } from '../../lib/utils';
import { NotificationButton } from '../molecules/NotificationButton';

export function Header() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-[var(--border)]">
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 sm:gap-2.5 hover:opacity-80 transition-opacity group" aria-label="뱅고 홈">
          {/* Bengo Logo */}
          <div className="relative">
            <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-all duration-200">
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-white -rotate-45" strokeWidth={2.5} aria-hidden="true" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-[17px] sm:text-[19px] font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-none">bengo</span>
            <span className="text-[9px] sm:text-[10px] text-[var(--muted-foreground)] tracking-wide leading-none mt-0.5">benefit + go</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8" aria-label="주요 메뉴">
          <Link
            to="/policies"
            className={cn(
              'text-[14px] font-medium transition-all duration-200 relative',
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
              'text-[14px] font-medium transition-all duration-200 relative',
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
          <Link
            to="/me"
            className={cn(
              'text-[14px] font-medium transition-all duration-200 relative',
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
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <NotificationButton />
          </div>
          <Link to="/login" className="hidden sm:block">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <User className="h-4 w-4" aria-hidden="true" />
              로그인
            </Button>
          </Link>
          <Link to="/signup" className="hidden sm:block">
            <Button size="sm">회원가입</Button>
          </Link>
          
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-[var(--muted)] rounded-lg transition-colors duration-150"
            aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div id="mobile-menu" className="md:hidden border-t border-[var(--border)] bg-white">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-3" aria-label="모바일 메뉴">
            <Link
              to="/policies"
              className={cn(
                'px-4 py-2 rounded-lg hover:bg-[var(--muted)] transition-colors duration-150',
                isActive('/policies') && 'bg-[var(--muted)]'
              )}
              onClick={() => setMobileMenuOpen(false)}
              aria-current={isActive('/policies') ? 'page' : undefined}
            >
              정책찾기
            </Link>
            <Link
              to="/personalized"
              className={cn(
                'px-4 py-2 rounded-lg hover:bg-[var(--muted)] transition-colors duration-150',
                isActive('/personalized') && 'bg-[var(--muted)]'
              )}
              onClick={() => setMobileMenuOpen(false)}
              aria-current={isActive('/personalized') ? 'page' : undefined}
            >
              맞춤정책
            </Link>
            <Link
              to="/me"
              className={cn(
                'px-4 py-2 rounded-lg hover:bg-[var(--muted)] transition-colors duration-150',
                isActive('/me') && 'bg-[var(--muted)]'
              )}
              onClick={() => setMobileMenuOpen(false)}
              aria-current={isActive('/me') ? 'page' : undefined}
            >
              MY
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 rounded-lg hover:bg-[var(--muted)] transition-colors duration-150"
              onClick={() => setMobileMenuOpen(false)}
            >
              로그인
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 transition-opacity duration-150 text-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              회원가입
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}