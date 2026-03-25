import { createBrowserRouter } from 'react-router';
import { SignupPage } from './pages/SignupPage';
import { LoginPage } from './pages/LoginPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { PolicyDetailPage } from './pages/PolicyDetailPage';
import { MyPage } from './pages/MyPage';
import { HomePage } from './pages/HomePage';
import { PersonalizedPoliciesPage } from './pages/PersonalizedPoliciesPage';
import { ProfilePage } from './pages/ProfilePage';

export const router = createBrowserRouter([
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
]);