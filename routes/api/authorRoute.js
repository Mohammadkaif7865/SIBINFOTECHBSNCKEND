var express = require('express');
var authorController = require("../../controllers/api/authorController");
var router = express.Router();

var token = require('../../middlewares/token');

// GET all authors
router.get('/all', token.validateToken, authorController.authorsData);

// ADD new author
router.post('/add', token.validateToken, authorController.authorAdd);

// GET single author by ID
router.get('/single/:id', token.validateToken, authorController.authorEditData);

// UPDATE author
router.post('/edit', token.validateToken, authorController.authorEdit);

// DELETE author
router.post('/delete', token.validateToken, authorController.authorDeleteData);

module.exports = router;
