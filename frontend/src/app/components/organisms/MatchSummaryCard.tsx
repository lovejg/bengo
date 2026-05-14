import { useState } from 'react';
import { Calendar, MapPin, Heart, Sparkles } from 'lucide-react';
import { EditableProfileItem } from '../molecules/EditableProfileItem';
import { ProfileEditDialog } from './ProfileEditDialog';

export interface UserCondition {
  age?: number;
  region?: string;
  interests?: string[];
}

interface MatchSummaryCardProps {
  userCondition: UserCondition;
  completionPercentage: number;
  onUpdate?: (field: string, value: string) => void;
}

type EditField = 'age' | 'region' | 'interests' | null;

const interestLabels: Record<string, string> = {
  youth_policy: '청년정책',
  childcare_policy: '육아정책',
  senior_policy: '노인정책',
  disability_policy: '장애인정책',
};

export function MatchSummaryCard({
  userCondition,
  completionPercentage,
  onUpdate,
}: MatchSummaryCardProps) {
  const [editingField, setEditingField] = useState<EditField>(null);

  const handleSave = (field: string, value: string) => {
    onUpdate?.(field, value);
  };

  const profileItems = [
    {
      field: 'age' as const,
      icon: <Calendar className="w-3.5 h-3.5" />,
      label: '나이',
      value: userCondition.age ? `${userCondition.age}세` : '미입력',
      isEmpty: !userCondition.age,
    },
    {
      field: 'region' as const,
      icon: <MapPin className="w-3.5 h-3.5" />,
      label: '지역',
      value: userCondition.region || '미입력',
      isEmpty: !userCondition.region,
    },
    {
      field: 'interests' as const,
      icon: <Heart className="w-3.5 h-3.5" />,
      label: '관심사',
      value:
        userCondition.interests && userCondition.interests.length > 0
          ? userCondition.interests.map((i) => interestLabels[i] ?? i).join(', ')
          : '미입력',
      isEmpty: !userCondition.interests || userCondition.interests.length === 0,
    },
  ];

  const isYouth = userCondition.age && userCondition.age >= 19 && userCondition.age <= 34;

  return (
    <div className="relative">
      <div className="bg-white dark:bg-[rgba(15,23,42,0.72)] dark:backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-[var(--border-default)] shadow-sm dark:shadow-[0_18px_48px_rgba(0,0,0,0.22)] p-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-50 via-purple-50/30 to-transparent dark:from-[rgba(59,130,246,0.18)] dark:via-[rgba(139,92,246,0.12)] dark:to-transparent rounded-full blur-2xl opacity-60"></div>

        <div className="relative z-10">
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="text-xs font-semibold text-[var(--foreground)]">프로필 완성도</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-[var(--accent)] to-purple-600 bg-clip-text text-transparent">
                {completionPercentage}%
              </span>
            </div>

            <div className="h-1.5 bg-gray-100 dark:bg-[rgba(148,163,184,0.18)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--accent)] via-blue-500 to-purple-600 transition-all duration-500 ease-out rounded-full relative overflow-hidden"
                style={{ width: `${completionPercentage}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {profileItems.map((item) => (
              <EditableProfileItem
                key={item.field}
                icon={item.icon}
                label={item.label}
                value={item.value}
                isEmpty={item.isEmpty}
                onClick={() => setEditingField(item.field)}
              />
            ))}
          </div>

          {isYouth && (
            <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-[rgba(59,130,246,0.10)] dark:to-[rgba(139,92,246,0.10)] border border-blue-200/50 dark:border-[rgba(96,165,250,0.22)]">
              <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-[var(--accent)] to-purple-600 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="text-[10px] font-semibold bg-gradient-to-r from-[var(--accent)] to-purple-600 bg-clip-text text-transparent">
                청년 정책 이용 가능
              </span>
            </div>
          )}
        </div>
      </div>

      {editingField && (
        <ProfileEditDialog
          open={!!editingField}
          onOpenChange={(open) => !open && setEditingField(null)}
          field={editingField}
          currentValue={
            editingField === 'age' && userCondition.age
              ? String(userCondition.age)
              : editingField === 'region'
              ? userCondition.region || ''
              : editingField === 'interests'
              ? JSON.stringify(userCondition.interests ?? [])
              : ''
          }
          onSave={(value) => handleSave(editingField, value)}
        />
      )}
    </div>
  );
}
