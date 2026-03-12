import { Bell, Calendar, FileText, User } from 'lucide-react';
import { Button } from '../atoms/Button';

export type NotificationType = 'deadline' | 'recruitment' | 'document' | 'profile';

export interface NotificationItemProps {
  id: string;
  type: NotificationType;
  title: string;
  subtitle: string;
  actionLabel: string;
  isUnread: boolean;
  onAction: () => void;
  onClick: () => void;
}

const notificationConfig = {
  deadline: {
    icon: Calendar,
    label: '마감 임박',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  recruitment: {
    icon: Bell,
    label: '모집 시작',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  document: {
    icon: FileText,
    label: '서류 필요',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  profile: {
    icon: User,
    label: '조건 업데이트',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
};

export function NotificationItem({
  type,
  title,
  subtitle,
  actionLabel,
  isUnread,
  onAction,
  onClick,
}: NotificationItemProps) {
  const config = notificationConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={`relative px-4 py-3 hover:bg-[var(--muted)] transition-colors duration-150 cursor-pointer ${
        isUnread ? 'bg-blue-50/30' : ''
      }`}
      onClick={onClick}
    >
      {isUnread && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-600 rounded-full"></div>
      )}
      
      <div className="flex items-start gap-3 ml-3">
        <div className={`p-1.5 ${config.bgColor} rounded-lg flex-shrink-0 mt-0.5`}>
          <Icon className={`h-3.5 w-3.5 ${config.color}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--foreground)] mb-0.5 leading-snug">
            {title}
          </p>
          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
            {subtitle}
          </p>
          
          <div className="mt-2">
            <Button
              size="sm"
              variant="secondary"
              className="text-xs h-7"
              onClick={(e) => {
                e.stopPropagation();
                onAction();
              }}
            >
              {actionLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
