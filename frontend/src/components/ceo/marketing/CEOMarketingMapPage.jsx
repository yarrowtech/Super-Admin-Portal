import { useSearchParams } from 'react-router-dom';
import MarketingMapExperience from './MarketingMapExperience';
import CrmMap from './CrmMap';

export default function CEOMarketingMapPage() {
  const [params, setParams] = useSearchParams();
  const outreachLink = ['projectId', 'location', 'record', 'marketingStage'].some(key => params.has(key));
  const outreach = params.get('view') === 'outreach' || (params.get('view') !== 'crm' && outreachLink);

  return outreach
    ? <MarketingMapExperience onShowCrm={() => setParams({ view: 'crm' })} />
    : <CrmMap onShowOutreach={() => setParams({ view: 'outreach' })} />;
}
