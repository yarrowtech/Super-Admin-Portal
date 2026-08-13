// Shared by OutsourcingPages.jsx (Profile page) and FreelancerDashboard.jsx
// (profile-completion nudge banner) — both previously computed this with
// byte-identical inline logic. Extracted here so Individual/Team/Agency
// account types share one definition instead of drifting apart.

export const getEntityType = (profile) => profile?.metadata?.entityType || 'individual';

export const computeProfileCompletion = (profile) => {
  const m = profile?.metadata || {};
  const entityType = getEntityType(profile);
  const skills = m.skills || [];
  const common = [profile?.firstName, profile?.lastName, profile?.email, m.city, m.country, m.bio];
  // Individual's field list is identical (same 10 items, same order) to the
  // pre-existing inline calc, so existing users see the exact same %.
  // Team/Agency swap phone/hourlyRate (not relevant to a business account)
  // for businessName/website — the fields that actually matter for those.
  const fields = entityType === 'individual'
    ? [...common, m.phone, m.title, m.hourlyRate, skills.length > 0]
    : [...common, m.businessName, m.title, m.website, skills.length > 0];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
};
