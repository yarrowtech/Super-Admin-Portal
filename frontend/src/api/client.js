// Re-export shim. The real HTTP client lives in services/client.js; this file exists only
// so src/api/legalDocument.js keeps its `./client` import working.
//
// src/api/ used to hold a second, parallel API layer (admin, ceo, employee, finance, hr,
// it, law, manager) that duplicated services/*.js. Nothing imported it, and it had drifted
// out of sync — services/finance.js gained methods its api/ twin never did, so a component
// that reached for the wrong one crashed on a missing function. Those 8 files were deleted
// on 6 October 2026. Add new API methods to services/, never here.
export { apiClient } from '../services/client';
