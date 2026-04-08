import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: ReactNode;
};

const baseClass =
  'inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold transition-all';

const variantClass: Record<ButtonVariant, string> = {
  primary:
    'auth-primary-btn font-headline text-xs uppercase tracking-[0.15em] text-on-primary duration-200',
  ghost:
    'border border-[color:rgba(230,189,184,0.15)] bg-transparent text-on-surface hover:bg-surface-low',
};

export default function Button({
  variant = 'primary',
  className = '',
  icon,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button className={`${baseClass} ${variantClass[variant]} ${className}`.trim()} {...rest}>
      {icon}
      <span>{children}</span>
    </button>
  );
}
