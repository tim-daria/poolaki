import type { ReactNode } from "react";

interface ActionsProps {
  children: ReactNode;
}

export default function Actions({ children }: ActionsProps) {
  return <div>{children}</div>;
}
