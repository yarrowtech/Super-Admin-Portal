import { cn } from '../../lib/cn';

const variants = {
  primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary/30',
  secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 focus:ring-neutral-300 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-300',
  ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100 focus:ring-neutral-300 dark:text-neutral-200 dark:hover:bg-neutral-800',
};

const sizes = {
  sm: 'min-h-9 px-3 text-xs',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-12 px-5 text-base',
};

const Button = ({ as: Component = 'button', type = 'button', variant = 'primary', size = 'md', icon, children, className, disabled, ...props }) => (
  <Component
    type={Component === 'button' ? type : undefined}
    disabled={disabled}
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-lg font-bold transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60',
      variants[variant] || variants.primary,
      sizes[size] || sizes.md,
      className
    )}
    {...props}
  >
    {icon}
    {children}
  </Component>
);

export default Button;
