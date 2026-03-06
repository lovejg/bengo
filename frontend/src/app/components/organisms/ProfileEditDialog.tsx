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

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: 'age' | 'region' | 'status' | 'income' | 'household';
  currentValue: string;
  onSave: (value: string) => void;
}

const fieldConfig = {
  age: {
    title: '나이 수정',
    description: '현재 나이를 입력해주세요',
    label: '나이',
    type: 'number' as const,
    placeholder: '예: 28',
    unit: '세',
  },
  region: {
    title: '지역 수정',
    description: '거주 지역을 선택해주세요',
    label: '지역',
    type: 'select' as const,
    options: [
      '강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구',
      '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구',
      '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구',
    ],
  },
  status: {
    title: '상태 수정',
    description: '현재 상태를 선택해주세요',
    label: '상태',
    type: 'select' as const,
    options: ['구직중', '재직중', '자영업', '학생', '무직', '기타'],
  },
  income: {
    title: '소득 정보 입력',
    description: '월 평균 소득을 입력해주세요',
    label: '월 소득',
    type: 'number' as const,
    placeholder: '예: 3000000',
    unit: '원',
  },
  household: {
    title: '가구원 정보 입력',
    description: '가구원 수를 입력해주세요',
    label: '가구원 수',
    type: 'number' as const,
    placeholder: '예: 3',
    unit: '명',
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
  const config = fieldConfig[field];

  const handleSave = () => {
    onSave(value);
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
            {config.type === 'select' ? (
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger id={field}>
                  <SelectValue placeholder="선택해주세요" />
                </SelectTrigger>
                <SelectContent>
                  {config.options?.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  id={field}
                  type={config.type}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={config.placeholder}
                  className="flex-1"
                />
                {config.unit && (
                  <span className="text-sm text-[var(--muted-foreground)] font-medium">{config.unit}</span>
                )}
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
