interface ProfileChipProps {
  label: string;
  isEmpty?: boolean;
}

export function ProfileChip({ label, isEmpty = false }: ProfileChipProps) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-150 ${
        isEmpty
          ? 'bg-gray-100/80 text-gray-500 border border-gray-200/60'
          : 'bg-white/90 text-blue-700 border border-blue-200/60 shadow-sm'
      }`}
    >
      {label}
    </span>
  );
}