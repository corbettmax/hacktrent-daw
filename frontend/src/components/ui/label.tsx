import React from 'react';

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  className?: string;
};

export const Label: React.FC<LabelProps> = ({ children, className = '', ...rest }) => {
  return (
    <label
      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
      {...rest}
    >
      {children}
    </label>
  );
};

export default Label;
