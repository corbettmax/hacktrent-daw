import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement> & { className?: string };

export const Card: React.FC<CardProps> = ({ children, className = '', ...rest }) => {
  return (
    <div className={`rounded-lg shadow-sm bg-card ${className}`} {...rest}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<CardProps> = ({ children, className = '', ...rest }) => {
  return (
    <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...rest}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<CardProps> = ({ children, className = '', ...rest }) => {
  return (
    <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`} {...rest}>
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<CardProps> = ({ children, className = '', ...rest }) => {
  return (
    <p className={`text-sm text-muted-foreground ${className}`} {...rest}>
      {children}
    </p>
  );
};

export const CardContent: React.FC<CardProps> = ({ children, className = '', ...rest }) => {
  return (
    <div className={`p-6 pt-0 ${className}`} {...rest}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<CardProps> = ({ children, className = '', ...rest }) => {
  return (
    <div className={`flex items-center p-6 pt-0 ${className}`} {...rest}>
      {children}
    </div>
  );
};

export default Card;
