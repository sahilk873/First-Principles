'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
  error?: string;
  hint?: string;
  colorScale?: 'default' | 'appropriateness' | 'severity';
  markers?: { value: number; label: string }[];
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      label,
      min = 0,
      max = 100,
      step = 1,
      value,
      onChange,
      showValue = true,
      valueFormatter,
      error,
      hint,
      colorScale = 'default',
      markers,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const percentage = ((value - min) / (max - min)) * 100;

    const getColorClass = () => {
      if (colorScale === 'appropriateness') {
        // 1-3 = inappropriate (red), 4-6 = uncertain (amber), 7-9 = appropriate (green)
        if (value >= 7) return 'from-emerald-400 to-emerald-500';
        if (value >= 4) return 'from-amber-400 to-amber-500';
        return 'from-rose-400 to-rose-500';
      }
      if (colorScale === 'severity') {
        // Low severity = green, high = red
        const ratio = (value - min) / (max - min);
        if (ratio <= 0.33) return 'from-emerald-400 to-emerald-500';
        if (ratio <= 0.66) return 'from-amber-400 to-amber-500';
        return 'from-rose-400 to-rose-500';
      }
      return 'from-blue-500 to-blue-600';
    };

    const getValueBgClass = () => {
      if (colorScale === 'appropriateness') {
        if (value >= 7) return 'bg-emerald-100 text-emerald-700';
        if (value >= 4) return 'bg-amber-100 text-amber-700';
        return 'bg-rose-100 text-rose-700';
      }
      if (colorScale === 'severity') {
        const ratio = (value - min) / (max - min);
        if (ratio <= 0.33) return 'bg-emerald-100 text-emerald-700';
        if (ratio <= 0.66) return 'bg-amber-100 text-amber-700';
        return 'bg-rose-100 text-rose-700';
      }
      return 'bg-blue-100 text-blue-700';
    };

    const displayValue = valueFormatter ? valueFormatter(value) : value;

    return (
      <div className={clsx('w-full', className)}>
        {label && (
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-slate-700">{label}</label>
            {showValue && (
              <span className={clsx('px-3 py-1 rounded-lg text-sm font-bold', getValueBgClass())}>
                {displayValue}
              </span>
            )}
          </div>
        )}

        <div className="relative">
          {/* Track background */}
          <div className="relative h-3 rounded-full bg-slate-200 overflow-hidden">
            {/* Filled track */}
            <div
              className={clsx(
                'absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-all duration-150',
                getColorClass()
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Input */}
          <input
            ref={ref}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={clsx(
              'absolute inset-0 w-full h-3 appearance-none bg-transparent cursor-pointer',
              'focus:outline-none',
              '[&::-webkit-slider-thumb]:appearance-none',
              '[&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6',
              '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white',
              '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-300',
              '[&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-slate-200/50',
              '[&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing',
              '[&::-webkit-slider-thumb]:hover:border-blue-400 [&::-webkit-slider-thumb]:transition-colors',
              '[&::-moz-range-thumb]:appearance-none',
              '[&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6',
              '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white',
              '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-slate-300',
              '[&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:cursor-grab',
              disabled && 'opacity-50 cursor-not-allowed [&::-webkit-slider-thumb]:cursor-not-allowed'
            )}
            {...props}
          />
        </div>

        {/* Markers */}
        {markers && markers.length > 0 && (
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            {markers.map((marker) => (
              <span key={marker.value} className="text-center">
                {marker.label}
              </span>
            ))}
          </div>
        )}

        {hint && !error && <p className="mt-2 text-sm text-slate-500">{hint}</p>}
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      </div>
    );
  }
);

Slider.displayName = 'Slider';

