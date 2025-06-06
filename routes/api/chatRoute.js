var express = require('express');
var chatController = require("../../controllers/api/chatController");
var router = express.Router();

var token = require('../../middlewares/token');

router.post('/', chatController.chatbotHandler); // Single chatbot endpoint

module.exports = router;
