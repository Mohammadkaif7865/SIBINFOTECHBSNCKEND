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

  let sql = `SELECT b.*, 
             bs.id as section_id, bs.title as section_title, bs.media, bs.media_type, 
             bs.description as section_description, bs.grey_quote, bs.order as section_order, 
             bs.publish as section_publish,
             bf.id as faq_id, bf.question, bf.answer, bf.order as faq_order, 
             bf.publish as faq_publish
             FROM blog b 
             LEFT JOIN blog_sections bs ON b.id = bs.blog_id
             LEFT JOIN blog_faqs bf ON b.id = bf.blog_id
             WHERE 1 ${condition}
             ORDER BY bs.order, bf.order`;

  connection.query(sql, function (err, results) {
    if (err) {
      console.error("Error fetching blog data:", err);
      return res.json({ error: true, message: "Error fetching blog data" });
    }

    if (results.length > 0) {
      // Initialize the blog object with the first row
      const blog = [{
        ...results[0],
        id: results[0].id,
        category_id: results[0].category_id,
        name: results[0].name,
        slug: results[0].slug,
        image: results[0].image,
        description: results[0].description,
        meta_title: results[0].meta_title,
        meta_keywords: results[0].meta_keywords,
        meta_description: results[0].meta_description,
        bdate: results[0].bdate,
        publish: results[0].publish,
        image_name: results[0].image_name,
        image_alt: results[0].image_alt,
        banner_background_color: results[0].banner_background_color,
        banner_text_color: results[0].banner_text_color,
        banner_title: results[0].banner_title,
        banner_image: results[0].banner_image
      }];

      // Process sections
      const blog_sections = results
        .filter(row => row.section_id)
        .map(row => ({
          id: row.section_id,
          title: row.section_title,
          media: row.media,
          media_type: row.media_type,
          description: row.section_description,
          grey_quote: row.grey_quote,
          order: row.section_order,
          publish: row.section_publish
        }));

      // Process FAQs
      const blog_faqs = results
        .filter(row => row.faq_id)
        .map(row => ({
          id: row.faq_id,
          question: row.question,
          answer: row.answer,
          order: row.faq_order,
          publish: row.faq_publish
        }));

      res.json({
        blog: blog,
        blog_sections: blog_sections,
        blog_faqs: blog_faqs
      });
    } else {
      res.json({ message: "No blog found" });
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
  try {
    // Get previous image paths first
    const fetchSql = `SELECT image, banner_image FROM blog WHERE id = ?`;
    connection.query(fetchSql, [req.body.id], (err, result) => {
      if (err) {
        console.error("Error fetching previous data:", err);
        return res.json({ error: true, message: "Error fetching previous data" });
      }

      if (!result.length) {
        return res.json({ error: true, message: "Blog not found" });
      }

      const previousImagePath = result[0].image;
      const previousBannerImagePath = result[0].banner_image;

      // Handle main image
      let imagePath = previousImagePath;
      if (req.files && req.files.find(f => f.fieldname === 'image')) {
        const imageFile = req.files.find(f => f.fieldname === 'image');
        const fileExtension = path.extname(imageFile.originalname);
        const newFileName = `${req.body.image_name}${fileExtension}`;
        imagePath = path.join('uploads/blog/', newFileName);

        // Delete previous image if exists
        if (previousImagePath && fs.existsSync(previousImagePath)) {
          fs.unlinkSync(previousImagePath);
        }

        fs.renameSync(imageFile.path, imagePath);
      }

      // Handle banner image
      let bannerImagePath = previousBannerImagePath;
      if (req.files && req.files.find(f => f.fieldname === 'banner_image')) {
        const bannerFile = req.files.find(f => f.fieldname === 'banner_image');
        const bannerFileName = `banner_${Date.now()}${path.extname(bannerFile.originalname)}`;
        bannerImagePath = path.join('uploads/blog/', bannerFileName);

        // Delete previous banner if exists
        if (previousBannerImagePath && fs.existsSync(previousBannerImagePath)) {
          fs.unlinkSync(previousBannerImagePath);
        }

        fs.renameSync(bannerFile.path, bannerImagePath);
      }

      // Start transaction
      connection.beginTransaction(err => {
        if (err) {
          console.error("Transaction error:", err);
          return res.json({ error: true, message: "Transaction error" });
        }

        // Update main blog data
        const blogData = {
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
          updatedAt: dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss")
        };

        connection.query('UPDATE blog SET ? WHERE id = ?', [blogData, req.body.id], (err) => {
          if (err) {
            return connection.rollback(() => {
              console.error("Blog update error:", err);
              res.json({ error: true, message: "Error updating blog" });
            });
          }

          // Delete existing sections and FAQs
          connection.query('DELETE FROM blog_sections WHERE blog_id = ?', [req.body.id], (err) => {
            if (err) {
              return connection.rollback(() => {
                console.error("Error deleting sections:", err);
                res.json({ error: true, message: "Error deleting sections" });
              });
            }

            connection.query('DELETE FROM blog_faqs WHERE blog_id = ?', [req.body.id], (err) => {
              if (err) {
                return connection.rollback(() => {
                  console.error("Error deleting FAQs:", err);
                  res.json({ error: true, message: "Error deleting FAQs" });
                });
              }

              // Insert sections
              let sections = [];
              try {
                sections = JSON.parse(req.body.sections || '[]');
              } catch (e) {
                console.error("Error parsing sections:", e);
                return connection.rollback(() => {
                  res.json({ error: true, message: "Invalid sections data" });
                });
              }

              const sectionPromises = sections.map((section, index) => {
                return new Promise((resolve, reject) => {
                  let mediaPath = section.media;
                  
                  // Handle section media file if exists
                  const sectionFile = req.files && req.files.find(f => f.fieldname === `section_media_${index}`);
                  if (sectionFile) {
                    const mediaFileName = `section_${req.body.id}_${index}_${Date.now()}${path.extname(sectionFile.originalname)}`;
                    mediaPath = path.join('uploads/blog/', mediaFileName);
                    fs.renameSync(sectionFile.path, mediaPath);
                  }

                  const sectionData = {
                    blog_id: req.body.id,
                    title: section.title,
                    media: mediaPath,
                    media_type: section.media_type,
                    description: section.description,
                    grey_quote: section.grey_quote,
                    order: section.order,
                    publish: section.publish,
                    createdAt: dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
                    updatedAt: dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss")
                  };

                  connection.query('INSERT INTO blog_sections SET ?', sectionData, (err) => {
                    if (err) reject(err);
                    else resolve();
                  });
                });
              });

              // Insert FAQs
              let faqs = [];
              try {
                faqs = JSON.parse(req.body.faqs || '[]');
              } catch (e) {
                console.error("Error parsing FAQs:", e);
                return connection.rollback(() => {
                  res.json({ error: true, message: "Invalid FAQs data" });
                });
              }

              const faqPromises = faqs.map(faq => {
                return new Promise((resolve, reject) => {
                  const faqData = {
                    blog_id: req.body.id,
                    question: faq.question,
                    answer: faq.answer,
                    order: faq.order,
                    publish: faq.publish,
                    createdAt: dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
                    updatedAt: dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss")
                  };

                  connection.query('INSERT INTO blog_faqs SET ?', faqData, (err) => {
                    if (err) reject(err);
                    else resolve();
                  });
                });
              });

              // Execute all promises
              Promise.all([...sectionPromises, ...faqPromises])
                .then(() => {
                  connection.commit(err => {
                    if (err) {
                      return connection.rollback(() => {
                        console.error("Commit error:", err);
                        res.json({ error: true, message: "Error committing transaction" });
                      });
                    }
                    res.json({ error: false, message: "Blog updated successfully" });
                  });
                })
                .catch(err => {
                  connection.rollback(() => {
                    console.error("Error in promises:", err);
                    res.json({ error: true, message: "Error updating blog details" });
                  });
                });
            });
          });
        });
      });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    res.json({ error: true, message: "An unexpected error occurred" });
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
