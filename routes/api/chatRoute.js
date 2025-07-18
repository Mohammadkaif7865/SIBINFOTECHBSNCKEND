var express = require('express');
var chatController = require("../../controllers/api/chatController");
var router = express.Router();

var token = require('../../middlewares/token');

router.post('/', chatController.chatbotHandler); // Single chatbot endpoint

router.post('/redirect-checker', chatController.fetchRedirectChain);

router.post("/paragraph-rewriter", chatController.paragraphRewriter);

router.post("/sentence-rewriter", chatController.sentenceRewriter);

router.post("/serp-fetch", chatController.serpFetch);

router.post('/title-meta-check', chatController.fetchTitleMeta);

router.post("/word-counter", chatController.wordCounter);

module.exports = router;
