import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col space-y-1.5 text-left">
        {label && (
          <label className="text-xs font-semibold text-text-secondary px-1">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-4 text-text-secondary pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full h-12 bg-brand-surface border rounded-[18px] text-sm text-text-primary px-4 transition-all duration-200
              ${leftIcon ? 'pl-11' : ''} 
              ${rightIcon ? 'pr-11' : ''} 
              ${error 
                ? 'border-danger focus:border-danger focus:ring-1 focus:ring-danger/20' 
                : 'border-brand-border focus:border-primary focus:ring-1 focus:ring-primary/10'
              }
              placeholder:text-text-secondary/50
              disabled:opacity-50 disabled:bg-slate-50
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-4 text-text-secondary flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <span className="text-xs text-danger font-medium px-2">{error}</span>
        ) : helperText ? (
          <span className="text-xs text-text-secondary/70 px-2">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  leftIcon?: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, leftIcon, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col space-y-1.5 text-left">
        {label && (
          <label className="text-xs font-semibold text-text-secondary px-1">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-4 text-text-secondary pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <select
            ref={ref}
            className={`w-full h-12 bg-brand-surface border rounded-[18px] text-sm text-text-primary px-4 transition-all duration-200 appearance-none
              ${leftIcon ? 'pl-11' : ''} 
              ${error 
                ? 'border-danger focus:border-danger' 
                : 'border-brand-border focus:border-primary'
              }
              disabled:opacity-50
              ${className}
            `}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-4 pointer-events-none text-text-secondary flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && <span className="text-xs text-danger font-medium px-2">{error}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
