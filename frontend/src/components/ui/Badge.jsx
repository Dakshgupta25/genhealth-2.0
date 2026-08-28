import React from 'react';

/**
 * GenHealth AI - Badge Primitive
 * Statuses: normal (clinical evergreen/sage), warning (amber), critical (crimson), info (navy blue), neutral (warm stone), purple (doctor)
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
      'bg-[#E3EFE9] text-[#0D5446] border border-[#C6DFD2] dark:bg-[rgba(74,222,128,0.12)] dark:text-[#4ADE80] dark:border-[rgba(74,222,128,0.28)]',
    warning:
      'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] dark:bg-[rgba(251,191,36,0.12)] dark:text-[#FBBF24] dark:border-[rgba(251,191,36,0.28)]',
    critical:
      'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA] dark:bg-[rgba(248,113,113,0.12)] dark:text-[#F87171] dark:border-[rgba(248,113,113,0.28)]',
    info:
      'bg-[#EFF6FF] text-[#1E40AF] border border-[#DBEAFE] dark:bg-[rgba(96,165,250,0.12)] dark:text-[#60A5FA] dark:border-[rgba(96,165,250,0.28)]',
    neutral:
      'bg-[#EDF1ED] text-[#334740] border border-[#D6DDD6] dark:bg-[#1A2421] dark:text-[#B2C2B8] dark:border-[#23312B]',
    purple:
      'bg-[#F3E8FF] text-[#6B21A8] border border-[#E9D5FF] dark:bg-[rgba(168,85,247,0.12)] dark:text-[#C084FC] dark:border-[rgba(168,85,247,0.28)]',
    teal:
      'bg-[#E3EFE9] text-[#0D5446] border border-[#C6DFD2] dark:bg-[rgba(59,178,152,0.14)] dark:text-[#3BB298] dark:border-[rgba(59,178,152,0.3)]',
  };

  const dotColors = {
    normal: 'bg-[#0D5446] dark:bg-[#4ADE80]',
    warning: 'bg-[#D97706] dark:bg-[#FBBF24]',
    critical: 'bg-[#DC2626] dark:bg-[#F87171]',
    info: 'bg-[#2563EB] dark:bg-[#60A5FA]',
    neutral: 'bg-[#586D66] dark:bg-[#7C9184]',
    purple: 'bg-[#9333EA] dark:bg-[#C084FC]',
    teal: 'bg-[#1D7A68] dark:bg-[#3BB298]',
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
