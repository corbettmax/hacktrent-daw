import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement> & { className?: string };

export const Card: React.FC<CardProps> = ({ children, className = '', ...rest }) => {
  return (
    <div className={`rounded-lg shadow-sm bg-card ${className}`} {...rest}>
      {children}
    </div>
  );
};

export default Card;
