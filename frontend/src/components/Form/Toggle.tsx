interface ToggleProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

export default function Toggle({ label, value, onChange }: ToggleProps) {
  return (
    <label>
      <span>{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => {
          onChange(e.target.checked);
        }}
      ></input>
    </label>
  );
}
