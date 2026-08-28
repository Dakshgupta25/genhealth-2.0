import React, { useEffect } from 'react';

/**
 * GenHealth AI - Modal Dialog Primitive
 * Features: clean backdrop blur, Esc key listener, accessible close, 16px radius
 */
export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon = null,
  maxWidth = 'max-w-md',
  children,
  footer = null,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Surface */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${maxWidth} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-10 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]`}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 flex items-start justify-between gap-4">
          <div className="flex items-center space-x-3">
            {icon && (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400 shrink-0">
                {icon}
              </div>
            )}
            <div>
              {title && (
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 tracking-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-sm text-slate-700 dark:text-slate-300">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="p-4 sm:p-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30 flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
