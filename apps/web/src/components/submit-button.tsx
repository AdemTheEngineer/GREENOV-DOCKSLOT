"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { primaryButtonClass } from "./ui";

interface SubmitButtonProps {
  children: ReactNode;
  className?: string;
  name?: string;
  value?: string;
}

export function SubmitButton({ children, className = primaryButtonClass, name, value }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} disabled={pending} className={className}>
      {pending ? "Envoi…" : children}
    </button>
  );
}
