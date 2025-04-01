// routes/api/serviceRoute.js
const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");
const token = require("../../middlewares/token");
const serviceController = require("../../controllers/api/serviceController");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/service/");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

router.get("/all", token.validateToken, serviceController.servicesData);
router.post("/add", token.validateToken, upload.none(), serviceController.serviceAdd);
router.get("/single/:id", token.validateToken, serviceController.serviceEditData);
router.get("/single-service/:slug", token.validateToken, serviceController.serviceGetData);
router.post("/edit", token.validateToken, upload.none(), serviceController.serviceEdit);
router.post("/delete", token.validateToken, serviceController.serviceDeleteData);

module.exports = router;
