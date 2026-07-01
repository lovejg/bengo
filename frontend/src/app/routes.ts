import { createElement, Fragment } from 'react';
import { createBrowserRouter, Outlet, ScrollRestoration } from 'react-router';
import { SignupPage } from './pages/SignupPage';
import { LoginPage } from './pages/LoginPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { PolicyDetailPage } from './pages/PolicyDetailPage';
import { MyPage } from './pages/MyPage';
import { HomePage } from './pages/HomePage';
import { PersonalizedPoliciesPage } from './pages/PersonalizedPoliciesPage';
import { ProfilePage } from './pages/ProfilePage';
import { OAuthCallbackPage } from './pages/OAuthCallbackPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { CheckEmailPage } from './pages/CheckEmailPage';
import { EmailVerifiedPage } from './pages/EmailVerifiedPage';
import { RouteErrorFallback } from './components/RouteErrorFallback';

function RootLayout() {
  return createElement(
    Fragment,
    null,
    createElement(ScrollRestoration),
    createElement(Outlet),
  );
}

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    ErrorBoundary: RouteErrorFallback,
    children: [
      {
        path: '/',
        Component: HomePage,
      },
      {
        path: '/signup',
        Component: SignupPage,
      },
      {
        path: '/login',
        Component: LoginPage,
      },
      {
        path: '/oauth/callback',
        Component: OAuthCallbackPage,
      },
      {
        path: '/check-email',
        Component: CheckEmailPage,
      },
      {
        path: '/email-verified',
        Component: EmailVerifiedPage,
      },
      {
        path: '/onboarding',
        Component: OnboardingPage,
      },
      {
        path: '/policies',
        Component: PoliciesPage,
      },
      {
        path: '/policies/:id',
        Component: PolicyDetailPage,
      },
      {
        path: '/personalized',
        Component: PersonalizedPoliciesPage,
      },
      {
        path: '/me',
        Component: MyPage,
      },
      {
        path: '/profile',
        Component: ProfilePage,
      },
    ],
  },
]);
