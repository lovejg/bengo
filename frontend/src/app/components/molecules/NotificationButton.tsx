import { useState } from 'react';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { NotificationBadge } from '../atoms/NotificationBadge';
import { NotificationPopover } from '../organisms/NotificationPopover';
import { NotificationItemProps } from './NotificationItem';

// Mock notifications data
const mockNotifications: NotificationItemProps[] = [
  {
    id: '1',
    type: 'deadline',
    title: '[D-3] 청년 월세 지원 사업 마감 임박',
    subtitle: '청년 월세 지원 사업 · 2026.03.28',
    actionLabel: '바로 신청',
    isUnread: true,
    onAction: () => toast.success('신청 페이지로 이동합니다'),
    onClick: () => {},
  },
  {
    id: '2',
    type: 'recruitment',
    title: '강남구 청년 일자리 지원 모집 시작',
    subtitle: '강남구 청년 일자리 · 2026.03.01 시작',
    actionLabel: '자세히 보기',
    isUnread: true,
    onAction: () => toast.success('상세 페이지로 이동합니다'),
    onClick: () => {},
  },
  {
    id: '3',
    type: 'document',
    title: '청년 구직활동 지원금 서류 필요',
    subtitle: '청년 구직활동 지원금 · 추가 서류 필요',
    actionLabel: '서류 보기',
    isUnread: false,
    onAction: () => toast.success('서류 페이지로 이동합니다'),
    onClick: () => {},
  },
  {
    id: '4',
    type: 'profile',
    title: '프로필 업데이트로 더 많은 정책 받기',
    subtitle: '조건 보완 시 5개 추가 정책 추천 가능',
    actionLabel: '조건 보완',
    isUnread: false,
    onAction: () => toast.success('프로필 페이지로 이동합니다'),
    onClick: () => {},
  },
];

export function NotificationButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItemProps[]>(mockNotifications);

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  const handleToggle = async () => {
    setIsOpen(!isOpen);
    
    if (!isOpen) {
      // Simulate loading notifications
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsLoading(false);
    }
  };

  const handleMarkAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, isUnread: false })));
    toast.success('모든 알림을 읽음 처리했습니다');
  };

  const handleEmptyAction = () => {
    toast.success('프로필 페이지로 이동합니다');
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
