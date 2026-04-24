import { useCallback, useEffect, useRef, useState } from 'react';
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
const READ_NOTIFICATION_IDS_KEY = 'bengo_read_notification_ids';

function getReadNotificationIds() {
  const raw = window.localStorage.getItem(READ_NOTIFICATION_IDS_KEY);
  if (!raw) return new Set<string>();

  try {
    const ids = JSON.parse(raw);
    return new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    window.localStorage.removeItem(READ_NOTIFICATION_IDS_KEY);
    return new Set<string>();
  }
}

function setReadNotificationIds(ids: Set<string>) {
  window.localStorage.setItem(READ_NOTIFICATION_IDS_KEY, JSON.stringify([...ids]));
}

function markNotificationIdsRead(ids: string[]) {
  const readIds = getReadNotificationIds();
  ids.forEach((id) => readIds.add(id));
  setReadNotificationIds(readIds);
}

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
  const readIds = getReadNotificationIds();
  const token = getAccessToken();
  const profile = getStoredUserProfile();

  if (!token || !profile) return notifs;

  // Profile completeness notification
  const isProfileIncomplete = !profile.age || !profile.regionCode || !profile.interests?.length;
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

  return notifs.map((notification) => ({
    ...notification,
    isUnread: !readIds.has(notification.id),
  }));
}

export function NotificationButton() {
  const navigate = useNavigate();
  const isAuthenticated = Boolean(getAccessToken() && getStoredUserProfile());
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItemProps[]>([]);
  const hasLoadedRef = useRef(false);

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    const notifs = await buildNotifications(navigate);
    setNotifications(notifs);
    hasLoadedRef.current = true;
    setIsLoading(false);
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  if (!isAuthenticated) return null;

  const handleToggle = async () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    if (nextOpen && !hasLoadedRef.current) {
      await loadNotifications();
    }

    if (nextOpen) {
      markNotificationIdsRead(notifications.map((n) => n.id));
      setNotifications((current) => current.map((n) => ({ ...n, isUnread: false })));
    }
  };

  const handleMarkAllRead = () => {
    markNotificationIdsRead(notifications.map((n) => n.id));
    setNotifications(notifications.map((n) => ({ ...n, isUnread: false })));
    toast.success('모든 알림을 읽음 처리했습니다');
  };

  const visibleNotifications = notifications.map((notification) => ({
    ...notification,
    onClick: () => {
      markNotificationIdsRead([notification.id]);
      setNotifications((current) =>
        current.map((n) => (n.id === notification.id ? { ...n, isUnread: false } : n)),
      );
      notification.onClick();
    },
    onAction: () => {
      markNotificationIdsRead([notification.id]);
      setNotifications((current) =>
        current.map((n) => (n.id === notification.id ? { ...n, isUnread: false } : n)),
      );
      notification.onAction();
    },
  }));

  const handleEmptyAction = () => {
    navigate('/me');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="relative p-2 hover:bg-[var(--muted)] rounded-lg transition-colors duration-150 cursor-pointer"
        aria-label={`알림 ${unreadCount > 0 ? `(${unreadCount}개 읽지 않음)` : ''}`}
        aria-expanded={isOpen}
      >
        <Bell className="h-5 w-5 text-[var(--foreground)]" />
        <NotificationBadge count={unreadCount} />
      </button>

      <NotificationPopover
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        notifications={visibleNotifications}
        isLoading={isLoading}
        onMarkAllRead={handleMarkAllRead}
        onEmptyAction={handleEmptyAction}
      />
    </div>
  );
}
