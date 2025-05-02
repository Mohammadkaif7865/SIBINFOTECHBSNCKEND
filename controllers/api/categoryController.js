const async = require('async');
var connection = require('../../config/connection');
var dateFormat = require('dateformat');
var moment = require('moment');

var slugify = require('slugify')

var categorysData = (req, res) => {

  let sql = `SELECT * FROM category`;
  connection.query(sql, function (err, categories) {
      if (!err) {
        if(categories.length) {
          res.json({categories: categories});
        } else {
          res.json({message: 'No categories found'});
        }
      }
  });

}

var categoryAdd = (req, res) => {

    let formData = {
       name: req.body.name,
       slug: slugify(req.body.name, {
          lower: true,
        }),
       publish: req.body.publish,
       createdAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss"),
       updatedAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss")
    }

    let sql = 'INSERT INTO category SET ?';
    connection.query(sql, formData, (err) => {
      if (!err) {
        res.json({error: false, message: 'Successfully created'});
      } else {
        res.json({error: true, message: 'Something went wrong'});
      }
    });

}

var categoryEditData = (req, res) => {

  let sql = `SELECT * FROM category WHERE id = '${req.params.id}'`;
  connection.query(sql, function (err, category) {
      if (!err) {
        if(category.length) {
          res.json({category: category});
        } else {
          res.json({message: 'No category found'});
        }
      }
  });

}

var categoryEdit = (req, res) => {

    let formData = {
       name: req.body.name,
       slug: slugify(req.body.name, {
          lower: true,
        }),
       publish: req.body.publish,
       updatedAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss")
    }

    let sql = `UPDATE category SET ? WHERE id = '${req.body.id}'`;

    connection.query(sql, formData, function (err) {
      if (!err) {
        res.json({error: false, message: 'Successfully updated'});
      } else {
        res.json({error: true, message: 'Something went wrong'});
      }
    });


}

var categoryDeleteData = (req, res) => {

    let sql = `DELETE FROM category WHERE id = '${req.body.id}'`;
    connection.query(sql, function (err) {
        if (!err) {
          res.json({error: false, message: 'Successfully deleted'});
        } else {
          res.json({error: true, message: 'Something went wrong'});
        }
    });


}


module.exports = { categoryAdd, categorysData, categoryEditData, categoryEdit, categoryDeleteData }
