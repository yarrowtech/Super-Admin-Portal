import EmployeeChat from '../employee/EmployeeChat';

const ManagerChat = () => {
  return (
    <EmployeeChat
      homePath="/manager/dashboard"
      headerTitle="Manager Chat"
      storageKeyPrefix="manager"
      unreadEventName="manager-chat-unread-changed"
    />
  );
};

export default ManagerChat;
