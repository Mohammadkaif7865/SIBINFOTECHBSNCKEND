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

// Updated blogAdd controller function
var blogAdd = (req, res) => {
    let imagePath = "";
    // Main blog image handling
    if (req.files.image != undefined) {
        let customImageName = req.body.image_name;
        let fileExtension = path.extname(req.files.image[0].originalname);
        let newFileName = `${customImageName}${fileExtension}`;
        imagePath = req.files.image[0].destination + newFileName;
        fs.renameSync(req.files.image[0].path, imagePath);
    }

    // Banner image handling
    let bannerImagePath = "";
    if (req.files.banner_image != undefined) {
        let bannerFileName = `banner_${Date.now()}${path.extname(req.files.banner_image[0].originalname)}`;
        bannerImagePath = req.files.banner_image[0].destination + bannerFileName;
        fs.renameSync(req.files.banner_image[0].path, bannerImagePath);
    }

    // Main blog data
    let formData = {
        category_id: req.body.category_id,
        name: req.body.name,
        slug: slugify(req.body.name, {
        lower: true,
        remove: /[*+~.()'"!:@#%^&${}<>?/|]/g,
        }),
        image: imagePath,
        image_name: req.body.image_name,
        image_alt: req.body.image_alt,
        description: req.body.description,
        bdate: req.body.bdate,
        meta_title: req.body.meta_title,
        meta_keywords: req.body.meta_keywords,
        meta_description: req.body.meta_description,
        publish: req.body.publish,
        // Banner fields
        banner_background_color: req.body.banner_background_color || null,
        banner_text_color: req.body.banner_text_color || null,
        banner_title: req.body.banner_title || null,
        banner_image: bannerImagePath || null,
        createdAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss"),
        updatedAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss"),
    };

    // Start a database transaction
    connection.beginTransaction(function(err) {
        if (err) {
        return res.json({ error: true, message: "Transaction error" });
        }

        // Insert blog post
        let blogSql = "INSERT INTO blog SET ?";
        connection.query(blogSql, formData, (err, blogResult) => {
        if (err) {
            return connection.rollback(function() {
            res.json({ error: true, message: "Failed to create blog post" });
            });
        }

        const blogId = blogResult.insertId;
        
        // Parse sections and FAQs from JSON
        let sections = [];
        let faqs = [];
        
        try {
            if (req.body.sections) {
            sections = JSON.parse(req.body.sections);
            }
            
            if (req.body.faqs) {
            faqs = JSON.parse(req.body.faqs);
            }
        } catch (e) {
            return connection.rollback(function() {
            res.json({ error: true, message: "Error parsing sections or FAQs" });
            });
        }
        
        // Process and insert sections
        if (sections.length > 0) {
            const sectionPromises = sections.map((section, index) => {
            return new Promise((resolve, reject) => {
                // Process section media if available
                let mediaPath = null;
                if (req.files[`section_media_${index}`] !== undefined) {
                const mediaFile = req.files[`section_media_${index}`][0];
                const mediaFileName = `section_${blogId}_${index}_${Date.now()}${path.extname(mediaFile.originalname)}`;
                mediaPath = mediaFile.destination + mediaFileName;
                fs.renameSync(mediaFile.path, mediaPath);
                }
                
                const sectionData = {
                blog_id: blogId,
                title: section.title,
                media: mediaPath,
                media_type: section.media_type,
                description: section.description,
                grey_quote: section.grey_quote,
                order: section.order,
                publish: section.publish,
                createdAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss"),
                updatedAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss")
                };
                
                const sectionSql = "INSERT INTO blog_sections SET ?";
                connection.query(sectionSql, sectionData, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
                });
            });
            });
            
            // Execute all section insert promises
            Promise.all(sectionPromises)
            .then(() => {
                // Process and insert FAQs after sections are done
                if (faqs.length > 0) {
                const faqPromises = faqs.map(faq => {
                    return new Promise((resolve, reject) => {
                    const faqData = {
                        blog_id: blogId,
                        question: faq.question,
                        answer: faq.answer,
                        order: faq.order,
                        publish: faq.publish,
                        createdAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss"),
                        updatedAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss")
                    };
                    
                    const faqSql = "INSERT INTO blog_faqs SET ?";
                    connection.query(faqSql, faqData, (err, result) => {
                        if (err) {
                        reject(err);
                        } else {
                        resolve(result);
                        }
                    });
                    });
                });
                
                // Execute all FAQ insert promises
                Promise.all(faqPromises)
                    .then(() => {
                    // Commit transaction if all operations successful
                    connection.commit(function(err) {
                        if (err) {
                        return connection.rollback(function() {
                            res.json({ error: true, message: "Failed to commit transaction" });
                        });
                        }
                        res.json({ error: false, message: "Successfully created blog with sections and FAQs" });
                    });
                    })
                    .catch(err => {
                    connection.rollback(function() {
                        res.json({ error: true, message: "Failed to insert FAQs" });
                    });
                    });
                } else {
                // If no FAQs, commit after sections are inserted
                connection.commit(function(err) {
                    if (err) {
                    return connection.rollback(function() {
                        res.json({ error: true, message: "Failed to commit transaction" });
                    });
                    }
                    res.json({ error: false, message: "Successfully created blog with sections" });
                });
                }
            })
            .catch(err => {
                connection.rollback(function() {
                res.json({ error: true, message: "Failed to insert sections" });
                });
            });
        } else if (faqs.length > 0) {
            // If there are no sections but there are FAQs
            const faqPromises = faqs.map(faq => {
            return new Promise((resolve, reject) => {
                const faqData = {
                blog_id: blogId,
                question: faq.question,
                answer: faq.answer,
                order: faq.order,
                publish: faq.publish,
                createdAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss"),
                updatedAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss")
                };
                
                const faqSql = "INSERT INTO blog_faqs SET ?";
                connection.query(faqSql, faqData, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
                });
            });
            });
            
            // Execute all FAQ insert promises
            Promise.all(faqPromises)
            .then(() => {
                connection.commit(function(err) {
                if (err) {
                    return connection.rollback(function() {
                    res.json({ error: true, message: "Failed to commit transaction" });
                    });
                }
                res.json({ error: false, message: "Successfully created blog with FAQs" });
                });
            })
            .catch(err => {
                connection.rollback(function() {
                res.json({ error: true, message: "Failed to insert FAQs" });
                });
            });
        } else {
            // If no sections or FAQs, just commit the blog post
            connection.commit(function(err) {
            if (err) {
                return connection.rollback(function() {
                res.json({ error: true, message: "Failed to commit transaction" });
                });
            }
            res.json({ error: false, message: "Successfully created" });
            });
        }
        });
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

const blogEdit = (req, res) => {
  let imagePath = ""
  let previousImagePath = req.body.imageHidden
  let bannerImagePath = ""
  let previousBannerImagePath = req.body.banner_image_hidden

  // If previousImagePath is not provided, fetch it from the database
  if (!previousImagePath) {
    const fetchSql = `SELECT image, banner_image FROM blog WHERE id = '${req.body.id}'`
    connection.query(fetchSql, (err, result) => {
      if (err) {
        console.error("Error fetching previous image path: ", err)
        return res.json({ error: true, message: "Something went wrong" })
      }

      if (result.length > 0) {
        previousImagePath = result[0].image
        previousBannerImagePath = result[0].banner_image
        proceedWithUpdate()
      } else {
        return res.json({ error: true, message: "Blog post not found" })
      }
    })
  } else {
    proceedWithUpdate()
  }

  function proceedWithUpdate() {
    // Handle main blog image
    if (req.files && req.files.find(f => f.fieldname === 'image')) {
      const imageFile = req.files.find(f => f.fieldname === 'image')
      const customImageName = req.body.image_name
      const fileExtension = path.extname(imageFile.originalname)
      const newFileName = `${customImageName}${fileExtension}`
      imagePath = imageFile.destination + newFileName

      // Delete previous image if exists
      if (previousImagePath && fs.existsSync(previousImagePath)) {
        fs.unlinkSync(previousImagePath)
      }

      fs.renameSync(imageFile.path, imagePath)
    } else {
      imagePath = previousImagePath
    }

    // Handle banner image
    if (req.files && req.files.find(f => f.fieldname === 'banner_image')) {
      const bannerFile = req.files.find(f => f.fieldname === 'banner_image')
      const bannerFileName = `banner_${Date.now()}${path.extname(bannerFile.originalname)}`
      bannerImagePath = bannerFile.destination + bannerFileName
      
      // Delete previous banner if exists
      if (previousBannerImagePath && fs.existsSync(previousBannerImagePath)) {
        fs.unlinkSync(previousBannerImagePath)
      }

      fs.renameSync(bannerFile.path, bannerImagePath)
    } else {
      bannerImagePath = previousBannerImagePath
    }

    // Parse sections and handle section media files
    let sections = []
    try {
      sections = JSON.parse(req.body.sections)
      sections = sections.map((section, index) => {
        const mediaFile = req.files && req.files.find(f => f.fieldname === `section_media_${index}`)
        if (mediaFile) {
          const mediaFileName = `section_${req.body.id}_${index}_${Date.now()}${path.extname(mediaFile.originalname)}`
          const mediaPath = mediaFile.destination + mediaFileName
          fs.renameSync(mediaFile.path, mediaPath)
          section.media = mediaPath
        }
        return section
      })
    } catch (e) {
      console.error("Error processing sections:", e)
      sections = []
    }

    // Parse FAQs
    let faqs = []
    try {
      faqs = JSON.parse(req.body.faqs)
    } catch (e) {
      console.error("Error processing FAQs:", e)
      faqs = []
    }

    const formData = {
      category_id: req.body.category_id,
      name: req.body.name,
      slug: slugify(req.body.slug, {
        lower: true,
        remove: /[*+~.()'"!:@#%^&${}<>?/|]/g,
      }),
      image: imagePath,
      image_name: req.body.image_name,
      image_alt: req.body.image_alt,
      description: req.body.description,
      bdate: formatDate(req.body.bdate),
      meta_title: req.body.meta_title,
      meta_keywords: req.body.meta_keywords,
      meta_description: req.body.meta_description,
      publish: req.body.publish,
      banner_background_color: req.body.banner_background_color,
      banner_text_color: req.body.banner_text_color,
      banner_title: req.body.banner_title,
      banner_image: bannerImagePath,
      updatedAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss"),
    }

    // Continue with your existing transaction code...
  }
}


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
