import type { InputHTMLAttributes } from 'react';

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  hasError?: boolean;
};

export default function TextInput({ className = '', hasError = false, ...rest }: TextInputProps) {
  return (
    <input
      className={`auth-input w-full rounded-md border-0 bg-surface-highest px-[1.125rem] py-4 text-[0.9375rem] text-on-surface outline-none transition-shadow ${
        hasError ? 'ring-2 ring-red-400' : ''
      } ${className}`.trim()}
      aria-invalid={hasError || undefined}
      {...rest}
    />
  );
}
