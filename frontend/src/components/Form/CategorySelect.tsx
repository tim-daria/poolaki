interface CategorySelectProps {
  value: string;
  onChange: (category: string) => void;
}

export function CategorySelect({ value, onChange }: CategorySelectProps) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}></select>
  );
}
