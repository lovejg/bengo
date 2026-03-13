import { motion, AnimatePresence } from 'motion/react';
import { Check } from 'lucide-react';

interface FilterOption {
  id: string;
  label: string;
}

interface FilterOptionGridProps {
  options: FilterOption[];
  selected?: string[];
  onChange: (selected: string[]) => void;
  multiSelect?: boolean;
  variant?: 'glass' | 'tag' | 'neo';
}

export function FilterOptionGrid({
  options,
  selected = [],
  onChange,
  multiSelect = false,
  variant = 'glass',
}: FilterOptionGridProps) {
  const handleToggle = (id: string) => {
    if (multiSelect) {
      const newSelected = selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id];
      onChange(newSelected);
    } else {
      onChange([id]);
    }
  };

  // 옵션 개수에 따라 동적으로 컬럼 수 결정
  const getGridCols = () => {
    const count = options.length;
    if (count === 3) return 'grid-cols-3';
    if (count === 4) return 'grid-cols-2'; // 4개는 2x2 그리드
    return 'grid-cols-2 sm:grid-cols-3';
  };

  // GLASSMORPHISM - 투명하고 블러 처리된 유리 느낌
  if (variant === 'glass') {
    return (
      <div className={`grid ${getGridCols()} gap-3`}>
        {options.map((option) => {
          const isSelected = selected.includes(option.id);
          return (
            <motion.button
              key={option.id}
              onClick={() => handleToggle(option.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className={`
                relative px-4 py-3.5 rounded-[12px] text-sm font-medium
                border transition-all duration-200
                ${
                  isSelected
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-md'
                    : 'bg-white text-[var(--foreground)] border-[var(--border)] hover:border-[var(--accent)]/30 hover:shadow-sm'
                }
              `}
              aria-pressed={isSelected}
            >
              <div className="flex items-center justify-center gap-2">
                <span>{option.label}</span>
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    >
                      <Check className="h-4 w-4 text-white" strokeWidth={2.5} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.button>
          );
        })}
      </div>
    );
  }

  // TAG/CHIP STYLE - 작고 귀여운 태그 느낌
  if (variant === 'tag') {
    return (
      <div className={`grid ${getGridCols()} gap-2`}>
        {options.map((option) => {
          const isSelected = selected.includes(option.id);
          
          return (
            <motion.button
              key={option.id}
              onClick={() => handleToggle(option.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className={`
                relative px-4 py-2.5 rounded-[12px] text-sm font-medium
                border transition-all duration-200
                ${
                  isSelected
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-md'
                    : 'bg-white text-[var(--foreground)] border-[var(--border)] hover:border-[var(--accent)]/30 hover:shadow-sm'
                }
              `}
              aria-pressed={isSelected}
            >
              <div className="flex items-center justify-center gap-2">
                <span>{option.label}</span>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  >
                    <Check className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                  </motion.div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    );
  }

  // NEO BRUTALISM - 강한 테두리, 오프셋 그림자
  if (variant === 'neo') {
    return (
      <div className={`grid ${getGridCols()} gap-3`}>
        {options.map((option) => {
          const isSelected = selected.includes(option.id);
          return (
            <motion.button
              key={option.id}
              onClick={() => handleToggle(option.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className={`
                relative px-4 py-3 text-sm font-medium rounded-[12px]
                border transition-all duration-200
                ${
                  isSelected
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-md'
                    : 'bg-white text-[var(--foreground)] border-[var(--border)] hover:border-[var(--accent)]/30 hover:shadow-sm'
                }
              `}
              aria-pressed={isSelected}
            >
              <div className="flex items-center justify-center gap-2">
                <span>{option.label}</span>
                
                {/* Checkmark */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    >
                      <Check className="h-4 w-4 text-white" strokeWidth={2.5} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.button>
          );
        })}
      </div>
    );
  }

  return null;
}