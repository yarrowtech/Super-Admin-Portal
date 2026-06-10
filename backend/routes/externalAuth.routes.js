const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const router = express.Router();
const externalAuthController = require('../controllers/externalAuth.controller');

router.post('/login', externalAuthController.login);
router.post('/verify', externalAuthController.verify);
router.post('/sso-login', externalAuthController.ssoLogin);
router.post('/token', authenticate, externalAuthController.issueEecSsoToken);
router.get('/user-access', externalAuthController.userAccess);

module.exports = router;
