const departmentTeamController = require('../controllers/department/departmentTeam.controller');
const employeeChatController = require('../controllers/employee/employeeChat.controller');

// Mounts the department-only Team directory + Messages endpoints (GET /team, /chat/*) on a router.
// `gate` restricts them to the department's roles; the chat services additionally reject any
// outsider recipient/conversation for department users (utils/departmentChatScope.js).
module.exports = (router, dept, gate) => {
  router.get('/team', gate, departmentTeamController.getTeamFor(dept));
  router.get('/chat/threads', gate, employeeChatController.getThreads);
  router.get('/chat/threads/:threadId/messages', gate, employeeChatController.getMessages);
  router.post('/chat/threads/:threadId/messages', gate, employeeChatController.postMessage);
  router.post('/chat/threads', gate, employeeChatController.createThread);
  router.post('/chat/groups', gate, employeeChatController.createGroupThread);
};
