var express = require('express');
var authorController = require("../../controllers/api/authorController");
var router = express.Router();

const path = require('path');

let multer = require('multer');

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/author/');
    },
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

var upload = multer({ storage: storage })
const cpUpload = upload.any(); // Accept any number of files with any field name

var token = require('../../middlewares/token');

// GET all authors
router.get('/all', token.validateToken, authorController.authorsData);

// ADD new author
router.post('/add', token.validateToken, cpUpload, authorController.authorAdd);

// GET single author by ID
router.get('/single/:id', token.validateToken, authorController.authorEditData);

// UPDATE author
router.post('/edit', token.validateToken, cpUpload, authorController.authorEdit);

// DELETE author
router.post('/delete', token.validateToken, authorController.authorDeleteData);

module.exports = router;
