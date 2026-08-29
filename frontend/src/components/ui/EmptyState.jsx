import React from 'react';

/**
 * GenHealth AI - Clinical EmptyState Primitive
 * Restrained empty state on clean white canvas with clear primary action.
 */
export function EmptyState({
  icon = null,
  title = 'No records found',
  description = 'There is currently no data available for this section.',
  action = null,
  isDashed = false,
  className = '',
}) {
  return (
    <div
      className={`p-8 sm:p-10 rounded-[12px] text-center flex flex-col items-center justify-center space-y-3 bg-white dark:bg-[#1E1E1E] ${
        isDashed
          ? 'border border-dashed border-[#D8D5D1] dark:border-[#404040]'
          : 'border border-[#E7E5E2] dark:border-[#303030] shadow-xs'
      } ${className}`}
    >
      {icon && (
        <div className="w-10 h-10 rounded-[8px] flex items-center justify-center bg-[#F5F5F3] dark:bg-[#252525] text-[#171717] dark:text-[#F0F0F0] mb-0.5">
          {icon}
        </div>
      )}
      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm font-semibold text-[#171717] dark:text-[#F0F0F0]">
          {title}
        </h4>
        <p className="text-xs text-[#666666] dark:text-[#A0A0A0] leading-relaxed">
          {description}
        </p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export default EmptyState;
