const async = require("async");
var connection = require("../../config/connection");
var dateFormat = require("dateformat");
var moment = require("moment");
const fs = require("fs");
var slugify = require("slugify");
const path = require("path");

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
  // if (req.files.image != undefined) {
  //   imagePath = req.files.image[0].destination + req.files.image[0].filename;
  // }
  if (req.files.image != undefined) {
    console.log(req.body);
    let customImageName = req.body.image_name;
    let fileExtension = path.extname(req.files.image[0].originalname);
    let newFileName = `${customImageName}${fileExtension}`;
    imagePath = req.files.image[0].destination + newFileName;
    fs.renameSync(req.files.image[0].path, imagePath);
  }
  let formData = {
    category_id: req.body.category_id,
    name: req.body.name,
    slug: slugify(req.body.name, {
      lower: true,
      remove: /[*+~.()'"!:@#%^&${}<>?/|]/g,
    }),
    image: imagePath,
    image_name: req.body.image_name, //need to add in table first
    image_alt: req.body.image_alt, //need to add in table first
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
// Function to format date to YYYY-MM-DD
function formatDate(dateString) {
  let date = new Date(dateString);
  let year = date.getFullYear();
  let month = ("0" + (date.getMonth() + 1)).slice(-2); // Months are zero based
  let day = ("0" + date.getDate()).slice(-2);
  return `${year}-${month}-${day}`;
}

var blogEdit = (req, res) => {
  let imagePath = "";
  let previousImagePath = req.body.imageHidden;

  // If previousImagePath is not provided, fetch it from the database
  if (!previousImagePath) {
    let fetchSql = `SELECT image FROM blog WHERE id = '${req.body.id}'`;
    connection.query(fetchSql, function (err, result) {
      if (err) {
        console.error("Error fetching previous image path: ", err);
        return res.json({ error: true, message: "Something went wrong" });
      }

      if (result.length > 0) {
        previousImagePath = result[0].image;
        proceedWithUpdate();
      } else {
        return res.json({ error: true, message: "Blog post not found" });
      }
    });
  } else {
    proceedWithUpdate();
  }

  function proceedWithUpdate() {
    if (req.files.image != undefined) {
      let customImageName = req.body.image_name;
      let fileExtension = path.extname(req.files.image[0].originalname);
      let newFileName = `${customImageName}${fileExtension}`;
      imagePath = req.files.image[0].destination + newFileName;

      // Delete the previous image
      if (previousImagePath && fs.existsSync(previousImagePath)) {
        fs.unlinkSync(previousImagePath);
      }

      fs.renameSync(req.files.image[0].path, imagePath);
    } else {
      // Rename the previous image with the new name
      if (previousImagePath && fs.existsSync(previousImagePath)) {
        let customImageName = req.body.image_name;
        let fileExtension = path.extname(previousImagePath);
        let newFileName = `${customImageName}${fileExtension}`;
        let newImagePath = path.join(
          path.dirname(previousImagePath),
          newFileName
        );

        console.log("Previous Image Path: ", previousImagePath);
        console.log("New Image Path: ", newImagePath);

        try {
          fs.renameSync(previousImagePath, newImagePath);
          imagePath = newImagePath;
          console.log("Image renamed successfully");
        } catch (err) {
          console.error("Error renaming the previous image: ", err);
          imagePath = previousImagePath; // Fallback to the original path if renaming fails
        }
      } else {
        imagePath = previousImagePath;
      }
    }

    let formData = {
      category_id: req.body.category_id,
      name: req.body.name,
      slug: slugify(req.body.slug, {
        lower: true,
        remove: /[*+~.()'"!:@#%^&${}<>?/|]/g,
      }),
      image: imagePath,
      image_name: req.body.image_name, // need to add in table first
      image_alt: req.body.image_alt, // need to add in table first
      description: req.body.description,
      bdate: formatDate(req.body.bdate), // Format the date here
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
  }
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
