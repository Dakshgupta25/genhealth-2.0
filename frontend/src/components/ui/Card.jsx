import React from 'react';

/**
 * GenHealth AI - Card Primitive Collection
 * Standardized 12px/16px radius, 1px border, subtle elevation, clean background
 */
export function Card({
  children,
  radius = 'lg', // 'md' (8px), 'lg' (12px), 'xl' (16px)
  interactive = false,
  className = '',
  ...props
}) {
  const radiusStyles = {
    md: 'rounded-lg',
    lg: 'rounded-xl',
    xl: 'rounded-2xl',
  };

  const interactiveStyles = interactive
    ? 'hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all duration-150 cursor-pointer'
    : '';

  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-xs ${
        radiusStyles[radius] || radiusStyles.lg
      } ${interactiveStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div
      className={`p-5 sm:p-6 pb-3 sm:pb-4 flex flex-col space-y-1.5 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }) {
  return (
    <h3
      className={`text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '', ...props }) {
  return (
    <p
      className={`text-xs text-slate-500 dark:text-slate-400 leading-relaxed ${className}`}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={`p-5 sm:p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }) {
  return (
    <div
      className={`p-5 sm:p-6 pt-0 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-3 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
