var express = require('express');
var homeController = require("../../controllers/api/homeController");
var router = express.Router();

const path = require('path');
let multer = require('multer');
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/career/');
    },
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
var upload = multer({ storage: storage })

var token = require('../../middlewares/token');

router.get('/admin/dashboard', token.validateToken, homeController.dashboardData);

router.get('/career/all', token.validateToken, homeController.careersData);

router.get('/career/single/:id', token.validateToken, homeController.careerEditData);

router.post('/career/delete', token.validateToken, upload.fields([]), homeController.careerDeleteData);

router.get('/enquiry/all', token.validateToken, homeController.enquiriesData);

router.post('/enquiry/delete', token.validateToken, upload.fields([]), homeController.enquiryDeleteData);

router.post('/submit_enquiry', token.validateToken,upload.fields([]), homeController.submit_enquiry);
router.post('/submit_quotes', token.validateToken,upload.fields([]), homeController.submit_quotes);
router.post('/submit_banner_enquiry', token.validateToken,upload.fields([]), homeController.submit_banner_enquiry);

router.post('/career_enquiry', token.validateToken, upload.fields([{
 name: 'resume', maxCount: 1
}]), homeController.career_enquiry);

module.exports = router;
