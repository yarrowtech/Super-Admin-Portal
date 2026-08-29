import { Link } from 'react-router-dom';

// Digital Portfolios / {group} / {category} — replaces the old "Back to
// portfolio" button (spec §3). Every crumb except the last is a link; the
// last is the current page.
const PortfolioBreadcrumb = ({ items = [] }) => (
  <nav className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400" aria-label="Breadcrumb">
    {items.map((item, index) => {
      const isLast = index === items.length - 1;
      return (
        <span key={item.label} className="flex items-center gap-1.5">
          {index > 0 && <span className="material-symbols-outlined text-[14px]">chevron_right</span>}
          {item.to && !isLast ? (
            <Link to={item.to} className="transition hover:text-primary">{item.label}</Link>
          ) : (
            <span className={isLast ? 'text-neutral-600 dark:text-neutral-300' : ''}>{item.label}</span>
          )}
        </span>
      );
    })}
  </nav>
);

export default PortfolioBreadcrumb;
