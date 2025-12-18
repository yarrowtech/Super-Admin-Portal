import React from 'react';

/**
 * Reusable Button Component with multiple variants
 * @param {string} variant - Button style variant: 'primary', 'secondary', 'danger', 'success', 'outline'
 * @param {string} size - Button size: 'sm', 'md', 'lg'
 * @param {boolean} disabled - Disabled state
 * @param {string} className - Additional custom classes
 * @param {function} onClick - Click handler
 * @param {string} type - Button type: 'button', 'submit', 'reset'
 * @param {React.ReactNode} children - Button content
 * @param {React.ReactNode} icon - Optional icon element
 * @param {boolean} fullWidth - Make button full width
 * @param {boolean} loading - Show loading state
 */
const Button = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  children,
  icon,
  fullWidth = false,
  loading = false,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-primary text-white hover:bg-primary/90 focus:ring-primary/50 shadow-sm',
    secondary: 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50 focus:ring-neutral-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-sm',
    outline: 'bg-transparent text-primary border-2 border-primary hover:bg-primary/10 focus:ring-primary/50',
    ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100 focus:ring-neutral-300',
    warning: 'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-400 shadow-sm',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  const buttonClasses = `${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={buttonClasses}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </>
      ) : (
        <>
          {icon && <span className="inline-flex">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;
