var express = require('express');
var blogController = require("../../controllers/api/blogController");
var router = express.Router();

const path = require('path');
let multer = require('multer');
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/blog/');
    },
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
var upload = multer({ storage: storage })

var token = require('../../middlewares/token');

router.get('/all', token.validateToken, blogController.blogsData);

router.post('/add', token.validateToken, upload.fields([{
 name: 'image', maxCount: 1
}]), blogController.blogAdd);

router.get('/single/:id', token.validateToken, blogController.blogEditData);

router.post('/edit', token.validateToken, upload.fields([{
 name: 'image', maxCount: 1
}]), blogController.blogEdit);

router.post('/delete', token.validateToken, blogController.blogDeleteData);

module.exports = router;
