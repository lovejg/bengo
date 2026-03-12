import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';

interface EditableProfileItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  isEmpty?: boolean;
  onClick: () => void;
}

export function EditableProfileItem({
  icon,
  label,
  value,
  isEmpty = false,
  onClick,
}: EditableProfileItemProps) {
  return (
    <motion.button
      onClick={onClick}
      className="group w-full flex items-center gap-2 p-2.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 hover:border-[var(--accent)] transition-all duration-200 text-left"
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
        isEmpty 
          ? 'bg-gray-100 text-gray-400' 
          : 'bg-gradient-to-br from-[var(--accent)] to-purple-600 text-white'
      }`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-[var(--muted-foreground)] leading-tight">{label}</div>
        <div className={`text-xs font-semibold truncate leading-tight ${
          isEmpty 
            ? 'text-gray-400' 
            : 'text-[var(--foreground)]'
        }`}>
          {value}
        </div>
      </div>
      <ChevronRight className="flex-shrink-0 w-3.5 h-3.5 text-gray-400 group-hover:text-[var(--accent)] transition-colors" />
    </motion.button>
  );
}
