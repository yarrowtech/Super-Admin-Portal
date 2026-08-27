// Canonical backend-role-code → display-label mapping, shared by every sidebar's role badge
// and the admin User Directory. Keeping one map avoids the same role rendering as
// "MEDIA_MARKETING" in one place, "media marketing" in another, and "Media Marketing" in a third.
export const ROLE_LABELS = {
  admin: 'Super Admin',
  ceo: 'CEO',
  hr: 'HR',
  it_manager: 'IT Manager',
  it_admin: 'IT Admin',
  it_employee: 'IT Employee',
  it_hr: 'IT HR',
  finance_manager: 'Finance Manager',
  finance_employee: 'Finance Employee',
  media_head: 'Media Head',
  media_sales: 'Media Sales',
  media_marketing: 'Media Marketing',
  law_head: 'Law Head',
  law_employee: 'Law Employee',
  freelancer: 'Freelancer',
};

export const getRoleLabel = (role) => ROLE_LABELS[role] || role?.replace(/_/g, ' ') || 'N/A';
