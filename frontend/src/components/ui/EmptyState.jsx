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
      className={`p-8 sm:p-10 rounded-xl text-center flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 ${
        isDashed
          ? 'border border-dashed border-slate-200 dark:border-slate-800'
          : 'border border-slate-200 dark:border-slate-800 shadow-xs'
      } ${className}`}
    >
      {icon && (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mb-1">
          {icon}
        </div>
      )}
      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          {title}
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export default EmptyState;
