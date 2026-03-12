import { useState } from 'react';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { NotificationBadge } from '../atoms/NotificationBadge';
import { NotificationPopover } from '../organisms/NotificationPopover';
import { NotificationItemProps } from './NotificationItem';
import { getMyPolicies } from '../../api/me';
import { getPolicyDetail } from '../../api/policies';
import { getAccessToken, getStoredUserProfile } from '../../api/client';

type NavigateFn = (path: string) => void;

function getDaysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

async function buildNotifications(navigate: NavigateFn): Promise<NotificationItemProps[]> {
  const notifs: NotificationItemProps[] = [];

  // Profile completeness notification
  const profile = getStoredUserProfile();
  const isProfileIncomplete = !profile || !profile.age || !profile.regionCode || !profile.interests?.length;
  if (isProfileIncomplete) {
    notifs.push({
      id: 'profile',
      type: 'profile',
      title: '프로필 업데이트로 더 많은 정책 받기',
      subtitle: profile ? '조건 보완 시 더 많은 정책 추천 가능' : '프로필을 등록하면 맞춤 정책을 받을 수 있어요',
      actionLabel: '조건 보완',
      isUnread: true,
      onAction: () => navigate('/me'),
      onClick: () => navigate('/me'),
    });
  }

  // Deadline & upcoming notifications from saved policies
  const token = getAccessToken();
  if (!token) return notifs;

  try {
    const res = await getMyPolicies();
    const activePolicies = res.items;

    const details = await Promise.allSettled(activePolicies.map((p) => getPolicyDetail(p.policyId)));

    for (let i = 0; i < activePolicies.length; i++) {
      const result = details[i];
      if (result.status !== 'fulfilled') continue;

      const detail = result.value;
      const policy = activePolicies[i];

      // Ending within 7 days
      const daysUntilEnd = getDaysUntil(detail.endsAt);
      if (daysUntilEnd !== null && daysUntilEnd >= 0 && daysUntilEnd <= 7) {
        notifs.push({
          id: `deadline-${policy.policyId}`,
          type: 'deadline',
          title: `[D-${daysUntilEnd}] ${policy.title} 마감 임박`,
          subtitle: `${policy.providerName} · ${detail.endsAt?.slice(0, 10)}`,
          actionLabel: '바로 신청',
          isUnread: true,
          onAction: () => {
            if (detail.applicationUrl) {
              window.open(detail.applicationUrl, '_blank');
            } else {
              navigate(`/policies/${policy.policyId}`);
            }
          },
          onClick: () => navigate(`/policies/${policy.policyId}`),
        });
      }

      // Starting within 7 days
      const daysUntilStart = getDaysUntil(detail.startsAt);
      if (daysUntilStart !== null && daysUntilStart >= 0 && daysUntilStart <= 7) {
        notifs.push({
          id: `recruitment-${policy.policyId}`,
          type: 'recruitment',
          title: `${policy.title} 모집 시작`,
          subtitle: `${policy.providerName} · ${detail.startsAt?.slice(0, 10)} 시작`,
          actionLabel: '자세히 보기',
          isUnread: true,
          onAction: () => navigate(`/policies/${policy.policyId}`),
          onClick: () => navigate(`/policies/${policy.policyId}`),
        });
      }
    }
  } catch {
    // API error - skip policy notifications
  }

  return notifs;
}

export function NotificationButton() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItemProps[]>([]);

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  const handleToggle = async () => {
    setIsOpen(!isOpen);

    if (!isOpen) {
      setIsLoading(true);
      const notifs = await buildNotifications(navigate);
      setNotifications(notifs);
      setIsLoading(false);
    }
  };

  const handleMarkAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, isUnread: false })));
    toast.success('모든 알림을 읽음 처리했습니다');
  };

  const handleEmptyAction = () => {
    navigate('/me');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="relative p-2 hover:bg-[var(--muted)] rounded-lg transition-colors duration-150"
        aria-label={`알림 ${unreadCount > 0 ? `(${unreadCount}개 읽지 않음)` : ''}`}
        aria-expanded={isOpen}
      >
        <Bell className="h-5 w-5 text-[var(--foreground)]" />
        <NotificationBadge count={unreadCount} />
      </button>

      <NotificationPopover
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        notifications={notifications}
        isLoading={isLoading}
        onMarkAllRead={handleMarkAllRead}
        onEmptyAction={handleEmptyAction}
      />
    </div>
  );
}
