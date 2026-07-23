interface ButtonProps {
  label: string;
  disabled?: boolean;
}

export default function Button({ label, disabled }: ButtonProps) {
  return <button disabled={disabled}>{label}</button>;
}
