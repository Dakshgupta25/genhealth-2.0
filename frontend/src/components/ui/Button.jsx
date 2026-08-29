import React from 'react';

/**
 * GenHealth AI - Clinical Button Primitive
 * Primary: Brand Red (#B4232F), Secondary: Crisp White (#FFFFFF) with #D4D2CE border
 * Radius: 8px, Heights: sm (32px), md (40px), lg (44px)
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
    'inline-flex items-center justify-center font-medium transition-all duration-150 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.99]';

  const sizeStyles = {
    sm: 'h-8 px-3 text-xs gap-1.5 rounded-[8px]',
    md: 'h-10 px-4 text-xs font-semibold gap-2 rounded-[8px]',
    lg: 'h-11 px-5 text-sm font-semibold gap-2.5 rounded-[8px]',
  };

  const variantStyles = {
    primary:
      'bg-[#B4232F] text-white hover:bg-[#961D28] focus-visible:ring-[#B4232F] shadow-xs border-0',
    secondary:
      'bg-white text-[#252525] hover:bg-[#F7F7F5] focus-visible:ring-[#B4232F] border border-[#D4D2CE] shadow-xs dark:bg-[#1E1E1E] dark:text-[#F0F0F0] dark:hover:bg-[#282828] dark:border-[#404040]',
    outline:
      'border border-[#D4D2CE] text-[#252525] bg-white hover:bg-[#F7F7F5] hover:border-[#B4232F]/50 focus-visible:ring-[#B4232F] shadow-xs dark:bg-[#1E1E1E] dark:border-[#404040] dark:text-[#F0F0F0] dark:hover:bg-[#282828]',
    ghost:
      'text-[#5F6368] hover:text-[#171717] hover:bg-[#F4F4F2] focus-visible:ring-[#B4232F] dark:text-[#A0A0A0] dark:hover:text-white dark:hover:bg-[#282828]',
    danger:
      'bg-[#B4232F] text-white hover:bg-[#961D28] focus-visible:ring-[#B4232F] shadow-xs border-0',
    dangerSubtle:
      'bg-[#FCEBED] text-[#B4232F] border border-[#E8B4B9] hover:bg-[#FAD9DC] focus-visible:ring-[#B4232F] dark:bg-[#2D1416] dark:border-[#522226] dark:text-[#E04855]',
    teal:
      'bg-[#B4232F] text-white hover:bg-[#961D28] focus-visible:ring-[#B4232F] shadow-xs border-0',
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
