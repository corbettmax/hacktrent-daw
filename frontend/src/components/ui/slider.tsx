import React from 'react';

type SliderProps = {
  value: number[];
  onValueChange: (v: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
};

export const Slider: React.FC<SliderProps> = ({ value, onValueChange, min = 0, max = 100, step = 1, className = '' }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value);
    onValueChange([n]);
  };

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0]}
      onChange={handleChange}
      className={className}
    />
  );
};

export default Slider;
