import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline';
  size?: 'sm' | 'lg' | 'default';
  className?: string;
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'default',
  className = '',
  children,
  ...rest
}) => {
  const base = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none';
  const variants: Record<string, string> = {
    default: 'bg-primary text-white border-transparent',
    outline: 'bg-transparent border border-border',
  };
  const sizes: Record<string, string> = {
    sm: 'h-8 px-3 text-sm',
    lg: 'h-12 px-4 text-lg',
    default: 'h-10 px-4',
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>
      {children}
    </button>
  );
};

export default Button;
