const async = require('async');
var connection = require('../../config/connection');
var dateFormat = require('dateformat');
var moment = require('moment');
const fs = require("fs");
var slugify = require("slugify");
const path = require("path");

// Get all authors
var authorsData = (req, res) => {
  let sql = `SELECT * FROM authors ORDER BY id DESC`;
  connection.query(sql, function (err, authors) {
    if (!err) {
      if (authors.length) {
        res.json({ authors: authors });
      } else {
        res.json({ message: 'No authors found' });
      }
    } else {
      res.json({ error: true, message: 'Database error' });
    }
  });
};

// Add new author
var authorAdd = (req, res) => {

    let imagePath = ""
    // Main author image handling - fixed to match the edit function's approach
    if (req.files && req.files.length > 0) {
      const imageFile = req.files.find((f) => f.fieldname === "image")
      if (imageFile) {
        const customImageName = req.body.image_name || `author_${Date.now()}`
        const fileExtension = path.extname(imageFile.originalname)
        const newFileName = `${customImageName}${fileExtension}`
        imagePath = path.join("uploads/author/", newFileName)

        // Ensure directory exists
        const dir = path.dirname(imagePath)
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }

        fs.renameSync(imageFile.path, imagePath)
        console.log("Image saved to:", imagePath)
      } else {
        console.log("No image file found in request")
      }
    } else {
      console.log("No files in request")
    }

  let formData = {
    name: req.body.name,
    slug: slugify(req.body.name, { lower: true }),
    image: imagePath,
    description: req.body.description || '',
    createdAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss"),
    updatedAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss")
  };

  let sql = 'INSERT INTO authors SET ?';
  connection.query(sql, formData, (err) => {
    if (!err) {
      res.json({ error: false, message: 'Author successfully created' });
    } else {
      res.json({ error: true, message: 'Something went wrong' });
    }
  });
};

// Get single author by ID
var authorEditData = (req, res) => {
  let sql = `SELECT * FROM authors WHERE id = '${req.params.id}'`;
  connection.query(sql, function (err, author) {
    if (!err) {
      if (author.length) {
        res.json({ author: author[0] });
      } else {
        res.json({ message: 'Author not found' });
      }
    } else {
      res.json({ error: true, message: 'Database error' });
    }
  });
};

// Update author
var authorEdit = (req, res) => {

  // Get previous image paths first
    const fetchSql = `SELECT image FROM author WHERE id = ?`;
    connection.query(fetchSql, [req.body.id], (err, result) => {
      if (err) {
        console.error("Error fetching previous data:", err);
        return res.json({ error: true, message: "Error fetching previous data" });
      }

      if (!result.length) {
        return res.json({ error: true, message: "Author not found" });
      }

      const previousImagePath = result[0].image;

      // Handle main image
      let imagePath = previousImagePath;
      if (req.files && req.files.find(f => f.fieldname === 'image')) {
        const imageFile = req.files.find(f => f.fieldname === 'image');
        const fileExtension = path.extname(imageFile.originalname);
        const newFileName = `${req.body.image_name}${fileExtension}`;
        imagePath = path.join('uploads/author/', newFileName);

        // Delete previous image if exists
        if (previousImagePath && fs.existsSync(previousImagePath)) {
          fs.unlinkSync(previousImagePath);
        }

        fs.renameSync(imageFile.path, imagePath);
      }

      let formData = {
        name: req.body.name,
        slug: slugify(req.body.name, { lower: true }),
        image: imagePath,
        description: req.body.description || '',
        updatedAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss")
      };

      let sql = `UPDATE authors SET ? WHERE id = '${req.body.id}'`;

      connection.query(sql, formData, function (err) {
        if (!err) {
          res.json({ error: false, message: 'Author successfully updated' });
        } else {
          res.json({ error: true, message: 'Something went wrong' });
        }
      });
      
  });
};

// Delete author
var authorDeleteData = (req, res) => {
  let sql = `DELETE FROM authors WHERE id = '${req.body.id}'`;
  connection.query(sql, function (err) {
    if (!err) {
      res.json({ error: false, message: 'Author successfully deleted' });
    } else {
      res.json({ error: true, message: 'Something went wrong' });
    }
  });
};

module.exports = {
  authorsData,
  authorAdd,
  authorEditData,
  authorEdit,
  authorDeleteData
};
