const async = require("async");
var connection = require("../../config/connection");
var dateFormat = require("dateformat");
var moment = require("moment");

var slugify = require("slugify");

var blogsData = (req, res) => {
  let condition = "";
  let limit = "";

  if (req.query.publish != undefined) {
    condition += " AND blog.publish = 1";
  }

  if (req.query.limit != undefined && req.query.limit != 10) {
    limit += " LIMIT " + req.query.limit;
  }

  let sql = `SELECT blog.*, category.name as category_name FROM blog LEFT JOIN category ON category.id = blog.category_id WHERE 1 ${condition} ORDER BY bdate DESC ${limit}`;

  connection.query(sql, function (err, blogs) {
    if (!err) {
      if (blogs.length) {
        res.json({ blogs: blogs });
      } else {
        res.json({ message: "No blogs found" });
      }
    } else {
      res.send(err);
    }
  });
};

var blogAdd = (req, res) => {
  let imagePath = "";

  if (req.files.image != undefined) {
    imagePath = req.files.image[0].destination + req.files.image[0].filename;
  }

  let formData = {
    category_id: req.body.category_id,
    name: req.body.name,
    slug: slugify(req.body.name, {
      lower: true,
    }),
    image: imagePath,
    description: req.body.description,
    bdate: req.body.bdate,
    meta_title: req.body.meta_title,
    meta_keywords: req.body.meta_keywords,
    meta_description: req.body.meta_description,
    publish: req.body.publish,
    createdAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss"),
    updatedAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss"),
  };

  let sql = "INSERT INTO blog SET ?";
  connection.query(sql, formData, (err) => {
    if (!err) {
      res.json({ error: false, message: "Successfully created" });
    } else {
      res.json({ error: true, message: "Something went wrong" });
    }
  });
};

var blogEditData = (req, res) => {
  let condition = "";

  if (req.query.slug != undefined) {
    condition += ` AND slug = "${req.params.id}"`;
  } else {
    condition += ` AND id = "${req.params.id}"`;
  }

  let sql = `SELECT * FROM blog WHERE 1 ${condition}`;
  connection.query(sql, function (err, blog) {
    if (!err) {
      if (blog.length) {
        res.json({ blog: blog });
      } else {
        res.json({ message: "No blog found" });
      }
    }
  });
};

var blogEdit = (req, res) => {
  let imagePath = "";

  if (req.files.image != undefined) {
    imagePath = req.files.image[0].destination + req.files.image[0].filename;
  } else {
    imagePath = req.body.imageHidden;
  }

  let formData = {
    category_id: req.body.category_id,
    name: req.body.name,
    slug: slugify(req.body.name, {
      lower: true,
    }),
    image: imagePath,
    description: req.body.description,
    bdate: req.body.bdate,
    meta_title: req.body.meta_title,
    meta_keywords: req.body.meta_keywords,
    meta_description: req.body.meta_description,
    publish: req.body.publish,
    updatedAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss"),
  };
  let sql = `UPDATE blog SET ? WHERE id = '${req.body.id}'`;

  connection.query(sql, formData, function (err) {
    if (!err) {
      res.json({ error: false, message: "Successfully updated" });
    } else {
      console.log("This is the error ", err);
      res.json({ error: true, message: "Something went wrong" });
    }
  });
};

var blogDeleteData = (req, res) => {
  let sql = `DELETE FROM blog WHERE id = '${req.body.id}'`;
  connection.query(sql, function (err) {
    if (!err) {
      res.json({ error: false, message: "Successfully deleted" });
    } else {
      res.json({ error: true, message: "Something went wrong" });
    }
  });
};

module.exports = { blogAdd, blogsData, blogEditData, blogEdit, blogDeleteData };
