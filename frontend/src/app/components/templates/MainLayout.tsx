import { ReactNode } from 'react';
import { Header } from '../organisms/Header';
import { Footer } from '../organisms/Footer';
import { BottomNav } from '../organisms/BottomNav';

export interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <Footer />
      <BottomNav />
    </div>
  );
}
