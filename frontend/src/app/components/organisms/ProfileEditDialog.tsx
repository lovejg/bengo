import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../atoms/Button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from '../../lib/utils';

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: 'age' | 'region' | 'interests';
  currentValue: string;
  onSave: (value: string) => void;
}

const REGION_OPTIONS = ['서울'];

const INTEREST_OPTIONS = [
  { value: 'youth_policy', label: '청년정책' },
  { value: 'childcare_policy', label: '육아/보육정책' },
];

const fieldConfig = {
  age: {
    title: '나이 수정',
    description: '현재 나이를 입력해주세요',
    label: '나이',
  },
  region: {
    title: '지역 수정',
    description: '거주 지역을 선택해주세요',
    label: '지역',
  },
  interests: {
    title: '관심사 수정',
    description: '관심 있는 정책 분야를 선택해주세요',
    label: '관심사',
  },
};

export function ProfileEditDialog({
  open,
  onOpenChange,
  field,
  currentValue,
  onSave,
}: ProfileEditDialogProps) {
  const [value, setValue] = useState(currentValue);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(() => {
    if (field !== 'interests') return [];
    try {
      return JSON.parse(currentValue) as string[];
    } catch {
      return [];
    }
  });

  const config = fieldConfig[field];

  const toggleInterest = (interestValue: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interestValue)
        ? prev.filter((i) => i !== interestValue)
        : [...prev, interestValue],
    );
  };

  const handleSave = () => {
    if (field === 'interests') {
      onSave(JSON.stringify(selectedInterests));
    } else {
      onSave(value);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor={field}>{config.label}</Label>

            {field === 'age' && (
              <div className="flex items-center gap-2">
                <Input
                  id={field}
                  type="number"
                  min={1}
                  max={140}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="예: 28"
                  className="flex-1"
                />
                <span className="text-sm text-[var(--muted-foreground)] font-medium">세</span>
              </div>
            )}

            {field === 'region' && (
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger id={field}>
                  <SelectValue placeholder="선택해주세요" />
                </SelectTrigger>
                <SelectContent>
                  {REGION_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {field === 'interests' && (
              <div className="flex flex-col gap-2">
                {INTEREST_OPTIONS.map((option) => {
                  const isSelected = selectedInterests.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleInterest(option.value)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-colors text-left cursor-pointer',
                        isSelected
                          ? 'border-[var(--accent)] bg-blue-50 text-[var(--accent)]'
                          : 'border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-[var(--muted)]',
                      )}
                    >
                      <div
                        className={cn(
                          'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0',
                          isSelected ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-gray-300',
                        )}
                      >
                        {isSelected && (
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                            <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                          </svg>
                        )}
                      </div>
                      {option.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSave}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
