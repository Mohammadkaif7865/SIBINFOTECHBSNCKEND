var express = require('express');
var categoryController = require("../../controllers/api/categoryController");
var router = express.Router();

var token = require('../../middlewares/token');

router.get('/all', token.validateToken, categoryController.categorysData);

router.post('/add', token.validateToken, categoryController.categoryAdd);

router.get('/single/:id', token.validateToken, categoryController.categoryEditData);

router.post('/edit', token.validateToken, categoryController.categoryEdit);

router.post('/delete', token.validateToken, categoryController.categoryDeleteData);

module.exports = router;
