import React from 'react';

/**
 * GenHealth AI - Clinical Badge Primitive
 * Restrained status badges with high contrast & soft tint.
 */
export function Badge({
  children,
  status = 'neutral',
  size = 'md',
  dot = false,
  className = '',
}) {
  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 rounded-[4px] gap-1',
    md: 'text-[11px] px-2 py-0.5 rounded-[6px] gap-1.5 font-medium',
  };

  const statusStyles = {
    normal:
      'bg-[#EAF6F0] text-[#247A59] border border-[#B8E4D1] dark:bg-[#13241B] dark:text-[#48BB78] dark:border-[#1E3D2C]',
    warning:
      'bg-[#FFF5DD] text-[#9A6500] border border-[#FCE1A3] dark:bg-[#2B2412] dark:text-[#ECC94B] dark:border-[#4D3F1B]',
    critical:
      'bg-[#FCEBED] text-[#B4232F] border border-[#E8B4B9] dark:bg-[#2D1416] dark:text-[#E04855] dark:border-[#522226]',
    high:
      'bg-[#FCEBED] text-[#B4232F] border border-[#E8B4B9] dark:bg-[#2D1416] dark:text-[#E04855] dark:border-[#522226]',
    low:
      'bg-[#FCEBED] text-[#B4232F] border border-[#E8B4B9] dark:bg-[#2D1416] dark:text-[#E04855] dark:border-[#522226]',
    info:
      'bg-[#EBF4FF] text-[#2B6CB0] border border-[#C3DAFE] dark:bg-[#142230] dark:text-[#63B3ED] dark:border-[#233A52]',
    neutral:
      'bg-[#F4F4F2] text-[#5F6368] border border-[#E3E3DF] dark:bg-[#1A1A1A] dark:text-[#A0A0A0] dark:border-[#303030]',
    purple:
      'bg-[#F4F4F2] text-[#5F6368] border border-[#E3E3DF] dark:bg-[#1A1A1A] dark:text-[#A0A0A0] dark:border-[#303030]',
    brand:
      'bg-[#FCEBED] text-[#B4232F] border border-[#E8B4B9] dark:bg-[#2D1416] dark:text-[#E04855] dark:border-[#522226]',
    juniper:
      'bg-[#FCEBED] text-[#B4232F] border border-[#E8B4B9] dark:bg-[#2D1416] dark:text-[#E04855] dark:border-[#522226]',
    teal:
      'bg-[#FCEBED] text-[#B4232F] border border-[#E8B4B9] dark:bg-[#2D1416] dark:text-[#E04855] dark:border-[#522226]',
  };

  const dotColors = {
    normal: 'bg-[#247A59] dark:bg-[#48BB78]',
    warning: 'bg-[#9A6500] dark:bg-[#ECC94B]',
    critical: 'bg-[#B4232F] dark:bg-[#E04855]',
    high: 'bg-[#B4232F] dark:bg-[#E04855]',
    low: 'bg-[#B4232F] dark:bg-[#E04855]',
    info: 'bg-[#2B6CB0] dark:bg-[#63B3ED]',
    neutral: 'bg-[#858585] dark:bg-[#707070]',
    purple: 'bg-[#858585] dark:bg-[#707070]',
    brand: 'bg-[#B4232F] dark:bg-[#E04855]',
    juniper: 'bg-[#B4232F] dark:bg-[#E04855]',
    teal: 'bg-[#B4232F] dark:bg-[#E04855]',
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
