import React from 'react';

/**
 * GenHealth AI - Button Primitive
 * Variants: primary, secondary, outline, ghost, danger, teal
 * Sizes: sm (32px), md (40px), lg (48px)
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  leftIcon = null,
  rightIcon = null,
  className = '',
  onClick,
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold transition-all duration-150 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]';

  const sizeStyles = {
    sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
    md: 'h-10 px-4 text-xs font-semibold gap-2 rounded-lg',
    lg: 'h-12 px-6 text-sm font-semibold gap-2.5 rounded-xl',
  };

  const variantStyles = {
    primary:
      'bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-700 dark:border dark:border-slate-700',
    secondary:
      'bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
    outline:
      'border border-slate-200 text-slate-800 bg-white hover:bg-slate-50 hover:border-slate-300 focus-visible:ring-slate-400 shadow-xs dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/80',
    ghost:
      'text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus-visible:ring-slate-400 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800',
    danger:
      'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600 shadow-xs dark:bg-red-600 dark:hover:bg-red-700',
    dangerSubtle:
      'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 focus-visible:ring-red-500 dark:bg-red-950/40 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-900/60',
    teal:
      'bg-cyan-600 text-white hover:bg-cyan-700 focus-visible:ring-cyan-600 shadow-xs dark:bg-cyan-600 dark:hover:bg-cyan-500',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${
        variantStyles[variant] || variantStyles.primary
      } ${className}`}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin -ml-0.5 h-3.5 w-3.5 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!loading && rightIcon}
    </button>
  );
}

export default Button;
