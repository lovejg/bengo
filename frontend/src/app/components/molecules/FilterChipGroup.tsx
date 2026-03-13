import { Chip } from '../atoms/Chip';

export interface FilterChipGroupProps {
  filters: Array<{ id: string; label: string }>;
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function FilterChipGroup({ filters, selected, onChange }: FilterChipGroupProps) {
  const toggleFilter = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((f) => f !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <Chip
          key={filter.id}
          selected={selected.includes(filter.id)}
          onClick={() => toggleFilter(filter.id)}
        >
          {filter.label}
        </Chip>
      ))}
    </div>
  );
}
