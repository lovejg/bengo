import { useState } from 'react';
import { Calendar, MapPin, Briefcase, DollarSign, Users, Sparkles } from 'lucide-react';
import { EditableProfileItem } from '../molecules/EditableProfileItem';
import { ProfileEditDialog } from './ProfileEditDialog';

export interface UserCondition {
  age?: number;
  region?: string;
  status?: string;
  income?: boolean;
  household?: boolean;
}

interface MatchSummaryCardProps {
  userCondition: UserCondition;
  completionPercentage: number;
  state?: 'complete' | 'partial' | 'empty';
  onUpdate?: (field: string, value: string) => void;
}

type EditField = 'age' | 'region' | 'status' | 'income' | 'household' | null;

export function MatchSummaryCard({
  userCondition,
  completionPercentage,
  state = 'partial',
  onUpdate,
}: MatchSummaryCardProps) {
  const [editingField, setEditingField] = useState<EditField>(null);

  const handleSave = (field: string, value: string) => {
    onUpdate?.(field, value);
    // 실제로는 API 호출 등으로 저장
    console.log(`Saving ${field}:`, value);
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
      field: 'status' as const,
      icon: <Briefcase className="w-3.5 h-3.5" />,
      label: '상태',
      value: userCondition.status || '미입력',
      isEmpty: !userCondition.status,
    },
    {
      field: 'income' as const,
      icon: <DollarSign className="w-3.5 h-3.5" />,
      label: '소득',
      value: userCondition.income ? '입력완료' : '미입력',
      isEmpty: !userCondition.income,
    },
    {
      field: 'household' as const,
      icon: <Users className="w-3.5 h-3.5" />,
      label: '가구원',
      value: userCondition.household ? '입력완료' : '미입력',
      isEmpty: !userCondition.household,
    },
  ];

  // 청년 여부는 나이에 따라 자동 계산
  const isYouth = userCondition.age && userCondition.age >= 19 && userCondition.age <= 34;

  return (
    <div className="relative">
      {/* 메인 카드 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 relative overflow-hidden">
        {/* 배경 그라데이션 장식 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-50 via-purple-50/30 to-transparent rounded-full blur-2xl opacity-60"></div>
        
        <div className="relative z-10">
          {/* 헤더 - 완성도 */}
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
            
            {/* 프로그레스 바 */}
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[var(--accent)] via-blue-500 to-purple-600 transition-all duration-500 ease-out rounded-full relative overflow-hidden"
                style={{ width: `${completionPercentage}%` }}
              >
                {/* 반짝이는 애니메이션 효과 */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
              </div>
            </div>
          </div>

          {/* 프로필 항목 리스트 - 2열 그리드 */}
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

          {/* 청년 배지 */}
          {isYouth && (
            <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200/50">
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

      {/* 편집 다이얼로그 */}
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
              : editingField === 'status'
              ? userCondition.status || ''
              : ''
          }
          onSave={(value) => handleSave(editingField, value)}
        />
      )}
    </div>
  );
}
