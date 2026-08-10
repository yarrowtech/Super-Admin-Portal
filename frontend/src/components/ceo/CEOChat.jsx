import React, { useCallback } from 'react';
import PortalChat from '../common/PortalChat';
import { ceoApi } from '../../services/ceo';

const ceoQuickReplies = ['Approve', 'Review needed', 'Schedule meeting', 'Noted'];
const allowedRoles = new Set([
  'admin', 'hr',
  'it_manager', 'it_admin', 'it_employee', 'it_hr',
  'finance_manager', 'finance_employee',
  'law_head', 'law_employee',
  'media_head', 'media_sales', 'media_marketing',
]);

const extractCeoTeamMembers = (res = {}) => {
  const base =
    (Array.isArray(res?.data?.members) && res.data.members) ||
    (Array.isArray(res?.data) && res.data) ||
    (Array.isArray(res) && res) ||
    [];

  return base
    .map((member) => {
    const normalizedId =
      member?.id ||
      member?._id?.toString?.() ||
      member?._id ||
      null;
    const normalizedStringId = normalizedId?.toString?.() || normalizedId || null;
    const fullName = [member?.firstName, member?.lastName].filter(Boolean).join(' ').trim();
    return {
      ...member,
      id: member?.id || normalizedStringId,
      name: member?.name || fullName || member?.email || 'Unknown',
      role: member?.role || (member?.department ? `${member.department} team` : 'Employee'),
      department: member?.department || member?.team || '',
    };
    })
    .filter((member) => allowedRoles.has(String(member?.role || '').toLowerCase()));
};

const CEOChat = () => {
  const fetchTeamMembers = useCallback(
    (token) => ceoApi.getAllEmployees(token),
    []
  );

  return (
    <PortalChat
      homePath="/ceo/dashboard"
      headerTitle="Executive Chat"
      storageKeyPrefix="ceo"
      unreadEventName="ceo-chat-unread-changed"
      api={ceoApi}
      fetchTeamMembers={fetchTeamMembers}
      teamMembersExtractor={extractCeoTeamMembers}
      quickReplies={ceoQuickReplies}
    />
  );
};

export default CEOChat;
