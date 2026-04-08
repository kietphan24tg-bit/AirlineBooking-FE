import type { ReactNode } from 'react';

type CardProps = {
  children: ReactNode;
  className?: string;
};

export default function Card({ children, className = '' }: CardProps) {
  return <div className={`w-full max-w-[25rem] ${className}`.trim()}>{children}</div>;
}
