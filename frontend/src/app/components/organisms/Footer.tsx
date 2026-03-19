import { ArrowRight } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-white mt-auto">
      <div className="container mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                  <ArrowRight className="h-4 w-4 text-white -rotate-45" strokeWidth={2.5} aria-hidden="true" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full"></div>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">bengo</span>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed max-w-xs">
              서울시 청년을 위한 모든 지원정책을<br />
              한눈에 확인하고 빠르게 찾아보세요.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-6 text-sm">
            <a href="#" className="text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors font-medium">
              이용약관
            </a>
            <a href="#" className="text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors font-medium">
              개인정보처리방침
            </a>
            <a href="#" className="text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors font-medium">
              문의하기
            </a>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed mb-3">
            벵고에서 제공하는 정책 정보는 참고용이에요. 신청 전에는 반드시 공식 기관에서 최신 내용을 확인해 주세요.
          </p>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs text-[var(--muted-foreground)]">
            <p className="leading-relaxed">
              데이터 출처: SSIS, 온통청년, 서울청년몽땅, 각 지자체 웹사이트
            </p>
            <p>© 2026 bengo. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}