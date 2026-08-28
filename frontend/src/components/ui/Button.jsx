import React from 'react';

/**
 * GenHealth AI - Button Primitive
 * Variants: primary (clinical evergreen), secondary, outline, ghost, danger, teal
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
      'bg-[#0D5446] text-white hover:bg-[#0A4337] focus-visible:ring-[#0D5446] shadow-xs dark:bg-[#227D6B] dark:text-white dark:hover:bg-[#2A947F] dark:border dark:border-[#3BB298]/30',
    secondary:
      'bg-[#EDF1ED] text-[#11231E] hover:bg-[#E3EFE9] focus-visible:ring-[#1D7A68] dark:bg-[#1A2421] dark:text-[#ECF2EE] dark:hover:bg-[#23312B] dark:border dark:border-[#2A3B34]',
    outline:
      'border border-[#D0D9D0] text-[#11231E] bg-white hover:bg-[#F5F7F5] hover:border-[#B2C2B8] focus-visible:ring-[#1D7A68] shadow-xs dark:bg-[#141C19] dark:border-[#2A3B34] dark:text-[#ECF2EE] dark:hover:bg-[#1A2421]',
    ghost:
      'text-[#334740] hover:text-[#11231E] hover:bg-[#EDF1ED] focus-visible:ring-[#1D7A68] dark:text-[#B2C2B8] dark:hover:text-white dark:hover:bg-[#1A2421]',
    danger:
      'bg-[#991B1B] text-white hover:bg-[#7F1D1D] focus-visible:ring-[#991B1B] shadow-xs dark:bg-[#991B1B] dark:hover:bg-[#B91C1C]',
    dangerSubtle:
      'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA] hover:bg-[#FCD2D2] focus-visible:ring-[#991B1B] dark:bg-[#2B1212] dark:border-[#4C1D1D] dark:text-[#F87171] dark:hover:bg-[#3B1919]',
    teal:
      'bg-[#1D7A68] text-white hover:bg-[#166052] focus-visible:ring-[#1D7A68] shadow-xs dark:bg-[#227D6B] dark:hover:bg-[#2A947F]',
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
