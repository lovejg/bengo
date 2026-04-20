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
  variant?: 'glass' | 'tag' | 'neo' | 'pill' | 'figma';
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

  const getGridCols = () => {
    const count = options.length;
    if (count === 2) return 'grid-cols-2';
    if (count === 3) return 'grid-cols-3';
    if (count === 4) return 'grid-cols-2';
    return 'grid-cols-2 sm:grid-cols-3';
  };

  // PILL - 피그마 기준 스타일 (rounded-full, 그리드 셀 채움)
  if (variant === 'pill') {
    return (
      <div className={`grid ${getGridCols()} gap-3`}>
        {options.map((option) => {
          const isSelected = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleToggle(option.id)}
              className={`
                w-full flex items-center justify-center gap-2
                px-4 py-3 rounded-full text-sm font-medium
                border transition-all duration-150
                ${isSelected
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'bg-white text-[var(--foreground)] border-[var(--border)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5'
                }
              `}
              aria-pressed={isSelected}
            >
              <span>{option.label}</span>
              {isSelected && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />}
            </button>
          );
        })}
      </div>
    );
  }

  // GLASSMORPHISM
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
                ${isSelected
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

  // TAG/CHIP STYLE
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
                ${isSelected
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

  // NEO BRUTALISM
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
                ${isSelected
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

  // FIGMA — 나이대(3개) 기준 고정 크기: 항상 3열 그리드
  // 2개여도 3열 그리드에 2개만 배치 → 버튼 크기 동일 유지
  if (variant === 'figma') {
    return (
      <div className="grid grid-cols-3 gap-3">
        {options.map((option) => {
          const isSelected = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleToggle(option.id)}
              className={`
                flex items-center justify-center gap-2
                px-4 py-2.5 w-full rounded-xl
                border text-sm font-medium
                transition-all duration-150
                ${isSelected
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'bg-white text-[var(--foreground)] border-[var(--border)] hover:border-[var(--accent)]/50'
                }
              `}
              aria-pressed={isSelected}
            >
              <span>{option.label}</span>
              {isSelected && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />}
            </button>
          );
        })}
      </div>
    );
  }

  return null;
}
