import { cn } from '../../lib/cn';
import PortalHeader from '../common/PortalHeader';

const PageShell = ({ title, subtitle, actions, children, className }) => (
  <main className={cn('portal-page', className)}>
    <div className="portal-page-inner">
      {(title || subtitle) && (
        <PortalHeader title={title} subtitle={subtitle} actions={actions} />
      )}
      {children}
    </div>
  </main>
);

export default PageShell;
