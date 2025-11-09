import React from 'react';

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  className?: string;
};

export const Select: React.FC<SelectProps> = ({ children, className = '', ...rest }) => {
  return (
    <select
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
};

type SelectTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string;
};

export const SelectTrigger: React.FC<SelectTriggerProps> = ({ children, className = '', ...rest }) => {
  return (
    <button
      className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};

type SelectValueProps = {
  placeholder?: string;
  children?: React.ReactNode;
  className?: string;
};

export const SelectValue: React.FC<SelectValueProps> = ({ placeholder, children, className = '' }) => {
  return <span className={className}>{children || placeholder}</span>;
};

type SelectContentProps = React.HTMLAttributes<HTMLDivElement> & {
  className?: string;
};

export const SelectContent: React.FC<SelectContentProps> = ({ children, className = '', ...rest }) => {
  return (
    <div
      className={`relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

type SelectItemProps = React.OptionHTMLAttributes<HTMLOptionElement> & {
  className?: string;
};

export const SelectItem: React.FC<SelectItemProps> = ({ children, className = '', ...rest }) => {
  return (
    <option
      className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${className}`}
      {...rest}
    >
      {children}
    </option>
  );
};

export default Select;
