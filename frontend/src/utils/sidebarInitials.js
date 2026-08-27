// One shared "1-2 initials from a signed-in user" helper for the sidebar user card, replacing
// the near-identical `{user.firstName?.[0]}{user.lastName?.[0]}` copies that existed independently
// in PortalSidebar, SectionSidebar, MediaHeadSidebar, and CEOSidebar.
export const getInitials = (user) => {
  const first = user?.firstName?.[0] || '';
  const last = user?.lastName?.[0] || '';
  return `${first}${last}`.toUpperCase() || '?';
};
