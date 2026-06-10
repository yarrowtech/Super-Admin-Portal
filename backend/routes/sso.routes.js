const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const externalAuthController = require('../controllers/externalAuth.controller');

const router = express.Router();

router.post('/token', authenticate, externalAuthController.issueEecSsoToken);

module.exports = router;
