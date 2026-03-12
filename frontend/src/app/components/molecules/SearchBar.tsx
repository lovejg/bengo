import { useState } from 'react';
import { Input } from '../atoms/Input';

export interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  defaultValue?: string;
}

export function SearchBar({ placeholder = '예: 월세, 취업, 주거, 교육…', onSearch, defaultValue = '' }: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(value);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full" role="search" aria-label="정책 검색">
      <Input
        type="search"
        icon="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onClear={() => {
          setValue('');
          onSearch('');
        }}
        aria-label="정책 검색어 입력"
      />
    </form>
  );
}