import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  required?: boolean;
  children: ReactNode;
}

export function Field({ label, required, children }: FieldProps) {
  return (
    <label>
      {label} {required && <span>*</span>}
      {children}
    </label>
  );
}
