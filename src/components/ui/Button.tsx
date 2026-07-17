import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  disabled = false,
  children,
  className = '',
  ...props
}) => {
  const baseStyle = 'ripple-btn font-semibold flex items-center justify-center transition-colors duration-200 outline-none select-none';
  
  const variants = {
    primary: 'bg-primary text-white border border-transparent active:bg-primary/95',
    secondary: 'bg-secondary text-white border border-transparent active:bg-secondary/95',
    outline: 'bg-transparent text-primary border border-brand-border hover:bg-light-blue active:bg-light-blue/50',
    ghost: 'bg-transparent text-text-primary border border-transparent hover:bg-slate-100 active:bg-slate-200/50',
    danger: 'bg-danger text-white border border-transparent active:bg-danger/95',
    success: 'bg-success text-white border border-transparent active:bg-success/95',
  };

  const sizes = {
    sm: 'h-10 px-4 text-xs rounded-[14px]',
    md: 'h-12 px-6 text-sm rounded-[18px]', // min 48px tap target
    lg: 'h-14 px-8 text-base rounded-[20px]',
  };

  const widthStyle = fullWidth ? 'w-full' : '';
  const disabledStyle = (disabled || isLoading) ? 'opacity-50 pointer-events-none' : 'cursor-pointer';

  return (
    <motion.button
      whileTap={disabled || isLoading ? undefined : { scale: 0.97 }}
      disabled={disabled || isLoading}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${widthStyle} ${disabledStyle} ${className}`}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <svg className="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </motion.button>
  );
};
