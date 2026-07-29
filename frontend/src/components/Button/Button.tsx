interface ButtonProps {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "submit" | "reset" | "button";
}

export function Button({ label, disabled, onClick, type }: ButtonProps) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}
