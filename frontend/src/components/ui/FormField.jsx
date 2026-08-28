import React from 'react';

/**
 * GenHealth AI - Form Field & Input Primitives
 * Standardized 38-40px height, clean typography, accessible focus rings
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
          className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </span>
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1 mt-0.5">
          <span>⚠️</span>
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
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
  isMono = false,
  error = false,
  leftIcon = null,
  rightIcon = null,
  className = '',
  ...props
}) {
  return (
    <div className="relative flex items-center">
      {leftIcon && (
        <div className="absolute left-3 flex items-center pointer-events-none text-slate-400">
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
        className={`w-full h-10 px-3.5 rounded-lg border text-sm transition-colors duration-150 outline-none
          bg-white text-slate-900 border-slate-200 placeholder:text-slate-400
          focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20
          dark:bg-slate-950 dark:text-slate-100 dark:border-slate-800 dark:placeholder:text-slate-500
          dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20
          disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:cursor-not-allowed
          ${leftIcon ? 'pl-9' : ''}
          ${rightIcon ? 'pr-9' : ''}
          ${isMono ? 'font-mono text-xs' : ''}
          ${
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-800'
              : ''
          }
          ${className}`}
        {...props}
      />
      {rightIcon && (
        <div className="absolute right-3 flex items-center pointer-events-none text-slate-400">
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
  children,
  className = '',
  ...props
}) {
  return (
    <div className="relative flex items-center">
      <select
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`w-full h-10 px-3.5 pr-8 rounded-lg border text-sm font-medium transition-colors duration-150 outline-none appearance-none cursor-pointer
          bg-white text-slate-900 border-slate-200
          focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20
          dark:bg-slate-950 dark:text-slate-100 dark:border-slate-800
          dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20
          disabled:opacity-50 disabled:cursor-not-allowed
          ${
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-800'
              : ''
          }
          ${className}`}
        {...props}
      >
        {children}
      </select>
      <div className="absolute right-3 pointer-events-none text-slate-400">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  );
}

export default FormField;
