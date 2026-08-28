import React from 'react';

/**
 * GenHealth AI - EmptyState Primitive
 * Standardized empty data visualization with icon, title, description, and action button
 */
export function EmptyState({
  icon = null,
  title = 'No records found',
  description = 'There is currently no data available for this section.',
  action = null,
  isDashed = true,
  className = '',
}) {
  return (
    <div
      className={`p-8 sm:p-10 rounded-xl text-center flex flex-col items-center justify-center space-y-3 bg-white dark:bg-[#141C19] ${
        isDashed
          ? 'border border-dashed border-[#D0D9D0] dark:border-[#2A3B34]'
          : 'border border-[#D0D9D0] dark:border-[#2A3B34] shadow-xs'
      } ${className}`}
    >
      {icon && (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#E3EFE9] dark:bg-[#1A332B] text-[#0D5446] dark:text-[#3BB298] mb-1">
          {icon}
        </div>
      )}
      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm font-bold text-[#11231E] dark:text-[#ECF2EE]">
          {title}
        </h4>
        <p className="text-xs text-[#586D66] dark:text-[#7C9184] leading-relaxed">
          {description}
        </p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export default EmptyState;
