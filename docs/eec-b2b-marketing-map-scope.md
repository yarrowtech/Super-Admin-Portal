# EEC-B2B marketing map scope

`/ceo/marketing-map` is an EEC-B2B workspace. Its selector lists only the actual EEC-B2B project returned by the server. There is no cross-project option on this page. General marketing analytics, imports, and other project workspaces retain their existing APIs and data.

The server resolves the project from the Projects collection using its canonical `EEC_B2B` identity. Missing or ambiguous identities fail explicitly; no arbitrary project, fabricated dataset, or renamed EdifyEight data is substituted. A read-only audit on 8 October 2026 found EEC-B2B project `6a86f878c07bde7ef985eb4f`, with 5,998 imported records. Another 5,998 records were outside that project and are excluded from this map. These are audit-time counts, not UI constants.

The map uses `/api/ceo/marketing-analytics/map/*` endpoints. Each request is resolved to the EEC-B2B database ID before the existing controller runs. Requests explicitly naming another project or `all` are rejected. Records, search, geographic rollups, pipeline counts, journey updates, and platform analytics share this scope. General `/import/*` and analytics APIs remain available to their existing authorized consumers.

Responses include project provenance. Individual records return their real database relationship; geographic points carry the project IDs of their underlying records. The client rejects missing or mismatched relationships before rendering points, details, search results, or analytics. Platform filtering gives an explicit identifier precedence over a project-name label, preventing a foreign ID with a matching name from entering the map. Map responses bypass the general response cache to avoid stale project context.

The URL is normalized to `?projectId=<actual database ID>`. A bare route resolves EEC-B2B before any data fetch. Stale foreign project routes clear the previous selection, record, viewport, and filters while replacing the URL. A stale global `activeProjectId` in local storage cannot choose the map project. The UI gates retained data by its project ID, clears foreign markers immediately, and displays a loading state until the authorized project resolves.

Verification includes isolated API/database tests with the same school under EEC-B2B and EdifyEight, forbidden cross-project reads and status writes, unchanged foreign records, ambiguous-project rejection, platform filtering, defensive client rejection, and headless browser checks for default selection, stale storage/URLs, the restricted selector, project-aware requests, details, refresh, navigation, and mobile display.

Read-only real-data audit: `node backend/scripts/auditMarketingMapProject.cjs` (run from `backend` as `node scripts/auditMarketingMapProject.cjs` so its environment file is loaded). This script disables automatic index/collection creation and does not update records.
