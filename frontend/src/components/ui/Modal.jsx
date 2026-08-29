import React, { useEffect } from 'react';

/**
 * GenHealth AI - Clinical Modal Dialog Primitive
 * Clean white dialog, subtle backdrop, 12px radius, shadow-modal
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
        className="fixed inset-0 bg-[#171717]/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Surface */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${maxWidth} bg-white dark:bg-[#1E1E1E] border border-[#E7E5E2] dark:border-[#303030] rounded-[12px] shadow-2xl z-10 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]`}
      >
        {/* Header */}
        <div className="p-5 pb-4 border-b border-[#E7E5E2] dark:border-[#303030] flex items-start justify-between gap-4">
          <div className="flex items-center space-x-3">
            {icon && (
              <div className="w-8 h-8 rounded-[6px] flex items-center justify-center bg-[#F5F5F3] text-[#171717] dark:bg-[#252525] dark:text-[#F0F0F0] shrink-0">
                {icon}
              </div>
            )}
            <div>
              {title && (
                <h3 className="text-base font-semibold text-[#171717] dark:text-[#F0F0F0] tracking-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-[#666666] dark:text-[#A0A0A0] mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-[6px] text-[#8A8A8A] hover:text-[#171717] hover:bg-[#F5F5F3] dark:hover:text-white dark:hover:bg-[#282828] transition-colors shrink-0 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-sm text-[#171717] dark:text-[#F0F0F0]">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="p-4 pt-3 border-t border-[#E7E5E2] dark:border-[#303030] bg-[#FAFAF9] dark:bg-[#181818] flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
