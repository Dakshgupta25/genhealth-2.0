import React from 'react';

/**
 * GenHealth AI - Clinical Form Field & Input Primitives
 * Clean 40-44px inputs, 8px radius, #D8D5D1 borders, #B4232F focus rings
 */
export function FormField({
  label,
  htmlFor,
  required = false,
  error = '',
  helperText = '',
  children,
  className = '',
}) {
  return (
    <div className={`flex flex-col space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-xs font-semibold uppercase tracking-wider text-[#666666] dark:text-[#A0A0A0] flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-[#B4232F] dark:text-[#E04855] ml-0.5">*</span>}
          </span>
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-[#B4232F] dark:text-[#E04855] font-medium flex items-center gap-1 mt-0.5">
          <span>⚠️</span>
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-[#8A8A8A] dark:text-[#707070] leading-tight">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

export function Input({
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  mono = false,
  isMono = false,
  error = false,
  leftIcon = null,
  rightIcon = null,
  density = 'normal', // 'normal' (h-10) vs 'compact' (h-8)
  className = '',
  ...props
}) {
  const useMono = mono || isMono;
  const heightClass = density === 'compact' ? 'h-8 px-2.5 text-xs' : 'h-10.5 px-3.5 text-sm';

  return (
    <div className="relative flex items-center">
      {leftIcon && (
        <div className={`absolute ${density === 'compact' ? 'left-2.5' : 'left-3'} flex items-center pointer-events-none text-[#8A8A8A]`}>
          {leftIcon}
        </div>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`w-full ${heightClass} rounded-[8px] border transition-colors duration-150 outline-none
          bg-white text-[#171717] border-[#D8D5D1] placeholder:text-[#8A8A8A]
          focus:border-[#B4232F] focus:ring-2 focus:ring-[#B4232F]/15
          dark:bg-[#181818] dark:text-[#F0F0F0] dark:border-[#404040] dark:placeholder:text-[#707070]
          dark:focus:border-[#E04855] dark:focus:ring-[#E04855]/20
          disabled:opacity-50 disabled:bg-[#F5F5F3] dark:disabled:bg-[#1A1A1A] disabled:cursor-not-allowed
          ${leftIcon ? (density === 'compact' ? 'pl-8' : 'pl-9') : ''}
          ${rightIcon ? (density === 'compact' ? 'pr-8' : 'pr-9') : ''}
          ${useMono ? 'font-mono text-xs' : ''}
          ${
            error
              ? 'border-[#B4232F] focus:border-[#B4232F] focus:ring-[#B4232F]/20 dark:border-[#E04855]'
              : ''
          }
          ${className}`}
        {...props}
      />
      {rightIcon && (
        <div className={`absolute ${density === 'compact' ? 'right-2.5' : 'right-3'} flex items-center pointer-events-none text-[#8A8A8A]`}>
          {rightIcon}
        </div>
      )}
    </div>
  );
}

export function Select({
  id,
  value,
  onChange,
  disabled = false,
  required = false,
  error = false,
  density = 'normal',
  children,
  className = '',
  ...props
}) {
  const heightClass = density === 'compact' ? 'h-8 px-2.5 pr-7 text-xs' : 'h-10.5 px-3.5 pr-8 text-sm';

  return (
    <div className="relative flex items-center">
      <select
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`w-full ${heightClass} rounded-[8px] border font-medium transition-colors duration-150 outline-none appearance-none cursor-pointer
          bg-white text-[#171717] border-[#D8D5D1]
          focus:border-[#B4232F] focus:ring-2 focus:ring-[#B4232F]/15
          dark:bg-[#181818] dark:text-[#F0F0F0] dark:border-[#404040]
          dark:focus:border-[#E04855] dark:focus:ring-[#E04855]/20
          disabled:opacity-50 disabled:cursor-not-allowed
          ${
            error
              ? 'border-[#B4232F] focus:border-[#B4232F] focus:ring-[#B4232F]/20 dark:border-[#E04855]'
              : ''
          }
          ${className}`}
        {...props}
      >
        {children}
      </select>
      <div className={`absolute ${density === 'compact' ? 'right-2' : 'right-3'} pointer-events-none text-[#8A8A8A]`}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  );
}

export default FormField;
