import React from 'react';

/**
 * GenHealth AI - Clinical Card Primitives
 * Crisp white surfaces, thin red/neutral borders, and dark typography
 */
export function Card({
  children,
  radius = 'lg', // 'sm' (6px), 'md' (8px), 'lg' (12px), 'xl' (14px)
  interactive = false,
  className = '',
  ...props
}) {
  const radiusStyles = {
    sm: 'rounded-[6px]',
    md: 'rounded-[8px]',
    lg: 'rounded-[12px]',
    xl: 'rounded-[14px]',
  };

  const interactiveStyles = interactive
    ? 'hover:border-[#B4232F] hover:shadow-sm transition-all duration-150 cursor-pointer'
    : '';

  return (
    <div
      className={`bg-white dark:bg-[#1E1E1E] text-[#171717] dark:text-[#F0F0F0] border border-[#D98A91]/80 dark:border-[#422225] shadow-xs ${
        radiusStyles[radius] || radiusStyles.lg
      } ${interactiveStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, density = 'spacious', className = '', ...props }) {
  const paddingStyles =
    density === 'compact'
      ? 'p-4 pb-3'
      : 'p-5 sm:p-6 pb-3 sm:pb-4';

  return (
    <div
      className={`${paddingStyles} flex flex-col space-y-1 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, density = 'spacious', className = '', ...props }) {
  const sizeStyles =
    density === 'compact'
      ? 'text-sm sm:text-base font-semibold'
      : 'text-base sm:text-lg font-semibold';

  return (
    <h3
      className={`${sizeStyles} tracking-tight text-[#171717] dark:text-[#F0F0F0] ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '', ...props }) {
  return (
    <p
      className={`text-xs text-[#5F6368] dark:text-[#A0A0A0] leading-relaxed ${className}`}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({ children, density = 'spacious', className = '', ...props }) {
  const paddingStyles =
    density === 'compact'
      ? 'p-4 pt-0'
      : 'p-5 sm:p-6 pt-0';

  return (
    <div className={`${paddingStyles} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, density = 'spacious', className = '', ...props }) {
  const paddingStyles =
    density === 'compact'
      ? 'p-4 pt-3'
      : 'p-5 sm:p-6 pt-4';

  return (
    <div
      className={`${paddingStyles} border-t border-[#E3E3DF] dark:border-[#303030] flex items-center justify-between gap-3 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
