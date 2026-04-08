import type { ReactNode } from 'react';

type FieldLabelProps = {
  children: ReactNode;
  htmlFor?: string;
  className?: string;
};

export default function FieldLabel({ children, htmlFor, className = '' }: FieldLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={`mb-1 ml-1 block text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on-surface-variant ${className}`.trim()}
    >
      {children}
    </label>
  );
}
