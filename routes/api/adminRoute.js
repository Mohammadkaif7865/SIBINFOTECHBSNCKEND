var express = require('express');
var adminController = require("../../controllers/api/adminController");
var router = express.Router();

var token = require('../../middlewares/token');

router.post('/login', token.validateToken, adminController.adminLogin);

module.exports = router;
