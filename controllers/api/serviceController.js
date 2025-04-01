const connection = require("../../config/connection");
const slugify = require("slugify");
const dateFormat = require("dateformat");

// GET all services
const servicesData = (req, res) => {
  let sql = "SELECT * FROM services_master ORDER BY id DESC";
  connection.query(sql, (err, services) => {
    if (!err) {
      res.json({ services });
    } else {
      res.json({ error: true, message: "Something went wrong" });
    }
  });
};

// ADD new service
const serviceAdd = (req, res) => {
  const formData = {
    name: req.body.name,
    slug: slugify(req.body.name, {
      lower: true,
      remove: /[*+~.()'"!:@#%^&${}<>?/|]/g,
    }),
    region: req.body.region,
    section_1_description: req.body.section_1_description,
    createdAt: dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
    updatedAt: dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
  };

  const sql = "INSERT INTO services_master SET ?";
  connection.query(sql, formData, (err) => {
    if (!err) {
      res.json({ error: false, message: "Service added successfully" });
    } else {
      res.json({ error: true, message: "Something went wrong" });
    }
  });
};

// GET single service by ID
const serviceEditData = (req, res) => {
  const sql = "SELECT * FROM services_master WHERE id = ?";
  connection.query(sql, [req.params.id], (err, result) => {
    if (!err && result.length > 0) {
      res.json({ service: result[0] });
    } else {
      res.json({ error: true, message: "Service not found" });
    }
  });
};
// GET single service by ID
const serviceGetData = (req, res) => {
  const sql = "SELECT * FROM services_master WHERE slug = ?";
  connection.query(sql, [req.params.slug], (err, result) => {
    if (!err && result.length > 0) {
      res.json({ service: result[0] });
    } else {
      res.json({ error: true, message: "Service not found" });
    }
  });
};

// EDIT service
const serviceEdit = (req, res) => {
  const formData = {
    name: req.body.name,
    slug: slugify(req.body.slug, {
      lower: true,
      remove: /[*+~.()'"!:@#%^&${}<>?/|]/g,
    }),
    region: req.body.region,
    section_1_description: req.body.section_1_description,
    updatedAt: dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
  };

  const sql = "UPDATE services_master SET ? WHERE id = ?";
  connection.query(sql, [formData, req.body.id], (err) => {
    if (!err) {
      res.json({ error: false, message: "Service updated successfully" });
    } else {
      res.json({ error: true, message: "Something went wrong" });
    }
  });
};

// DELETE service
const serviceDeleteData = (req, res) => {
  const sql = "DELETE FROM services_master WHERE id = ?";
  connection.query(sql, [req.body.id], (err) => {
    if (!err) {
      res.json({ error: false, message: "Service deleted successfully" });
    } else {
      res.json({ error: true, message: "Something went wrong" });
    }
  });
};

module.exports = {
  servicesData,
  serviceAdd,
  serviceEditData,
  serviceEdit,
  serviceDeleteData,
  serviceGetData
};
