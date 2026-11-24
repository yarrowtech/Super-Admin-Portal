import Drawer from '../ui/Drawer';
import { useMediaQuery } from '../../hooks/useMediaQuery';

// The shared drawer provides Escape handling, focus restoration and scroll locking.
const FilterDrawer = ({ open, onClose, title = 'Filters', subtitle = 'Refine results', children, hiddenAbove = 'md:hidden' }) => {
  const breakpoint = { sm: 640, md: 768, lg: 1024, xl: 1280 }[hiddenAbove.split(':')[0]] || 768;
  const desktop = useMediaQuery(`(min-width: ${breakpoint}px)`);
  return <Drawer open={open && !desktop} onClose={onClose} title={title} closeOnBackdrop className="max-w-sm">
    {subtitle && <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
    {children}
  </Drawer>;
};

export default FilterDrawer;
