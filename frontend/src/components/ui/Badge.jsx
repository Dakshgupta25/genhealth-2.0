import React from 'react';

/**
 * GenHealth AI - Badge Primitive
 * Statuses: normal (emerald), warning (amber), critical (red), info (blue), neutral (slate), purple (doctor)
 * Sizes: sm, md
 */
export function Badge({
  children,
  status = 'neutral',
  size = 'md',
  dot = false,
  className = '',
}) {
  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 rounded gap-1',
    md: 'text-[11px] px-2 py-0.5 rounded-md gap-1.5 font-semibold',
  };

  const statusStyles = {
    normal:
      'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50',
    warning:
      'bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50',
    critical:
      'bg-red-50 text-red-700 border border-red-200/80 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/50',
    info:
      'bg-sky-50 text-sky-700 border border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/50',
    neutral:
      'bg-slate-100 text-slate-700 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    purple:
      'bg-purple-50 text-purple-700 border border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50',
    teal:
      'bg-cyan-50 text-cyan-700 border border-cyan-200/80 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/50',
  };

  const dotColors = {
    normal: 'bg-emerald-500',
    warning: 'bg-amber-500',
    critical: 'bg-red-500',
    info: 'bg-sky-500',
    neutral: 'bg-slate-400',
    purple: 'bg-purple-500',
    teal: 'bg-cyan-500',
  };

  return (
    <span
      className={`inline-flex items-center tracking-tight select-none transition-colors uppercase ${
        sizeStyles[size] || sizeStyles.md
      } ${statusStyles[status] || statusStyles.neutral} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            dotColors[status] || dotColors.neutral
          }`}
        />
      )}
      <span>{children}</span>
    </span>
  );
}

export default Badge;
