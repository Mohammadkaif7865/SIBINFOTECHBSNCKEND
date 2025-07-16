const async = require('async');
var connection = require('../../config/connection');
var dateFormat = require('dateformat');
var moment = require('moment');
var slugify = require('slugify');

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
  let formData = {
    name: req.body.name,
    slug: slugify(req.body.name, { lower: true }),
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
  let formData = {
    name: req.body.name,
    slug: slugify(req.body.name, { lower: true }),
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
