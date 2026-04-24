import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { NotificationItem, NotificationItemProps } from '../molecules/NotificationItem';
import { NotificationEmpty } from '../molecules/NotificationEmpty';
import { NotificationSkeleton } from '../molecules/NotificationSkeleton';

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItemProps[];
  isLoading: boolean;
  onMarkAllRead: () => void;
  onEmptyAction: () => void;
}

export function NotificationPopover({
  isOpen,
  onClose,
  notifications,
  isLoading,
  onMarkAllRead,
  onEmptyAction,
}: NotificationPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-2 w-[92vw] sm:w-[340px] bg-white rounded-xl shadow-2xl border border-[var(--border)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
      role="dialog"
      aria-label="알림"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h3 className="font-semibold text-[var(--foreground)]">알림</h3>
        {!isLoading && notifications.length > 0 && (
          <button
            onClick={onMarkAllRead}
            className="text-xs text-[var(--accent)] hover:underline font-medium cursor-pointer"
          >
            모두 읽음
          </button>
        )}
      </div>

      {/* Content */}
      <div className="max-h-[520px] overflow-y-auto">
        {isLoading && <NotificationSkeleton />}
        
        {!isLoading && notifications.length === 0 && (
          <NotificationEmpty onAction={onEmptyAction} />
        )}
        
        {!isLoading && notifications.length > 0 && (
          <div className="py-2">
            {notifications.slice(0, 6).map((notification) => (
              <NotificationItem
                key={notification.id}
                {...notification}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {!isLoading && notifications.length > 0 && (
        <div className="border-t border-[var(--border)] px-4 py-3">
          <Link
            to="/me"
            className="flex items-center justify-center gap-1 text-sm text-[var(--accent)] hover:underline font-medium"
            onClick={onClose}
          >
            알림 더보기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
