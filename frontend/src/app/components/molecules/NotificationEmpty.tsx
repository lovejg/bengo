import { Bell } from 'lucide-react';
import { Button } from '../atoms/Button';

interface NotificationEmptyProps {
  onAction: () => void;
}

export function NotificationEmpty({ onAction }: NotificationEmptyProps) {
  return (
    <div className="py-12 px-6 text-center">
      <div className="w-12 h-12 bg-[var(--muted)] rounded-full flex items-center justify-center mx-auto mb-4">
        <Bell className="h-6 w-6 text-[var(--muted-foreground)]" />
      </div>
      <p className="text-sm font-medium text-[var(--foreground)] mb-1">
        새 알림이 없어요
      </p>
      <p className="text-xs text-[var(--muted-foreground)] mb-6 leading-relaxed">
        조건을 채우면 더 정확한 알림을 받을 수 있어요
      </p>
      <Button size="sm" onClick={onAction}>
        조건 보완하기
      </Button>
    </div>
  );
}
