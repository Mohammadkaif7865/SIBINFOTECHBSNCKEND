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

  let sql = `SELECT blog.*, category.name as category_name, authors.name as author_name FROM blog LEFT JOIN category ON category.id = blog.category_id LEFT JOIN authors ON authors.id = blog.author_id WHERE 1 ${condition} ORDER BY bdate DESC ${limit}`;

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

// Updated blogAdd function to properly handle file uploads
var blogAdd = (req, res) => {
  try {
    console.log("Files received:", req.files)

    let imagePath = ""
    // Main blog image handling - fixed to match the edit function's approach
    if (req.files && req.files.length > 0) {
      const imageFile = req.files.find((f) => f.fieldname === "image")
      if (imageFile) {
        const customImageName = req.body.image_name || `blog_${Date.now()}`
        const fileExtension = path.extname(imageFile.originalname)
        const newFileName = `${customImageName}${fileExtension}`
        imagePath = path.join("uploads/blog/", newFileName)

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

    // Banner image handling
    let bannerImagePath = ""
    if (req.files && req.files.length > 0) {
      const bannerFile = req.files.find((f) => f.fieldname === "banner_image")
      if (bannerFile) {
        const bannerFileName = `banner_${Date.now()}${path.extname(bannerFile.originalname)}`
        bannerImagePath = path.join("uploads/blog/", bannerFileName)

        // Ensure directory exists
        const dir = path.dirname(bannerImagePath)
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }

        fs.renameSync(bannerFile.path, bannerImagePath)
        console.log("Banner image saved to:", bannerImagePath)
      }
    }

    // Main blog data
    const formData = {
      category_id: req.body.category_id,
      author_id: req.body.author_id,
      name: req.body.name,
      slug:
        req.body.slug ||
        slugify(req.body.name, {
          lower: true,
          remove: /[*+~.()'"!:@#%^&${}<>?/|]/g,
        }),
      image: imagePath,
      image_name: req.body.image_name,
      image_alt: req.body.image_alt,
      description: req.body.description,
      bdate: req.body.bdate,
      action_title: req.body.action_title,
      action_btn_1_text: req.body.action_btn_1_text,
      action_btn_1_link: req.body.action_btn_1_link,
      action_btn_2_text: req.body.action_btn_2_text,
      action_btn_2_link: req.body.action_btn_2_link,
      action_subtitle_1: req.body.action_subtitle_1,
      action_description_1: req.body.action_description_1,
      action_subtitle_2: req.body.action_subtitle_2,
      action_description_2: req.body.action_description_2,
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
    }

    console.log("Form data prepared:", formData)

    // Start a database transaction
    connection.beginTransaction((err) => {
      if (err) {
        console.error("Transaction error:", err)
        return res.json({ error: true, message: "Transaction error" })
      }

      // Insert blog post
      const blogSql = "INSERT INTO blog SET ?"
      connection.query(blogSql, formData, (err, blogResult) => {
        if (err) {
          console.error("Blog insert error:", err)
          return connection.rollback(() => {
            res.json({ error: true, message: "Failed to create blog post" })
          })
        }

        const blogId = blogResult.insertId
        console.log("Blog inserted with ID:", blogId)

        // Parse sections and FAQs from JSON
        let sections = []
        let faqs = []

        try {
          if (req.body.sections) {
            sections = JSON.parse(req.body.sections)
            console.log("Parsed sections:", sections.length)
          }

          if (req.body.faqs) {
            faqs = JSON.parse(req.body.faqs)
            console.log("Parsed FAQs:", faqs.length)
          }
        } catch (e) {
          console.error("Error parsing JSON:", e)
          return connection.rollback(() => {
            res.json({ error: true, message: "Error parsing sections or FAQs" })
          })
        }

        // Process and insert sections
        if (sections.length > 0) {
          
          const sectionPromises = sections.map((section, index) => {
            return new Promise((resolve, reject) => {
              let mediaPath = null;

              // For image or video, check if a file is uploaded for this section
              const mediaFile = req.files?.find((f) => f.fieldname === `section_media_${index}`);
              if (mediaFile && (section.media_type === "image" || section.media_type === "video")) {
                const mediaFileName = `section_${blogId}_${index}_${Date.now()}${path.extname(mediaFile.originalname)}`;
                mediaPath = path.join("uploads/blog/", mediaFileName);

                // Ensure directory exists
                const dir = path.dirname(mediaPath);
                if (!fs.existsSync(dir)) {
                  fs.mkdirSync(dir, { recursive: true });
                }

                fs.renameSync(mediaFile.path, mediaPath);
                console.log(`Section ${index} media saved to:`, mediaPath);
              }

              // For YouTube, assign the YouTube URL directly
              if (section.media_type === "youtube" && typeof section.media === "string") {
                mediaPath = section.media;
              }

              // If no new file is uploaded for image/video but an existing path is present
              if (
                (section.media_type === "image" || section.media_type === "video") &&
                !mediaFile &&
                typeof section.media === "string"
              ) {
                mediaPath = section.media;
              }

              const sectionData = {
                blog_id: blogId,
                title: section.title,
                section_link_title: section.section_link_title,
                media: mediaPath,
                media_type: section.media_type,
                description: section.description,
                grey_quote: section.grey_quote,
                grey_quote_bg_color: section.grey_quote_bg_color,
                grey_quote_border_color: section.grey_quote_border_color,
                section_bg_color: section.section_bg_color,
                section_border_color: section.section_border_color,
                order: section.order,
                publish: section.publish,
                createdAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss"),
                updatedAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss"),
              };

              const sectionSql = "INSERT INTO blog_sections SET ?";
              connection.query(sectionSql, sectionData, (err, result) => {
                if (err) {
                  console.error("Section insert error:", err);
                  reject(err);
                } else {
                  console.log(`Section ${index} inserted`);
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
                const faqPromises = faqs.map((faq, index) => {
                  return new Promise((resolve, reject) => {
                    const faqData = {
                      blog_id: blogId,
                      question: faq.question,
                      answer: faq.answer,
                      order: faq.order,
                      publish: faq.publish,
                      createdAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss"),
                      updatedAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss"),
                    }

                    const faqSql = "INSERT INTO blog_faqs SET ?"
                    connection.query(faqSql, faqData, (err, result) => {
                      if (err) {
                        console.error("FAQ insert error:", err)
                        reject(err)
                      } else {
                        console.log(`FAQ ${index} inserted`)
                        resolve(result)
                      }
                    })
                  })
                })

                // Execute all FAQ insert promises
                Promise.all(faqPromises)
                  .then(() => {
                    // Commit transaction if all operations successful
                    connection.commit((err) => {
                      if (err) {
                        console.error("Commit error:", err)
                        return connection.rollback(() => {
                          res.json({ error: true, message: "Failed to commit transaction" })
                        })
                      }
                      console.log("Transaction committed successfully")
                      res.json({ error: false, message: "Successfully created blog with sections and FAQs" })
                    })
                  })
                  .catch((err) => {
                    console.error("FAQ promises error:", err)
                    connection.rollback(() => {
                      res.json({ error: true, message: "Failed to insert FAQs" })
                    })
                  })
              } else {
                // If no FAQs, commit after sections are inserted
                connection.commit((err) => {
                  if (err) {
                    console.error("Commit error:", err)
                    return connection.rollback(() => {
                      res.json({ error: true, message: "Failed to commit transaction" })
                    })
                  }
                  console.log("Transaction committed successfully")
                  res.json({ error: false, message: "Successfully created blog with sections" })
                })
              }
            })
            .catch((err) => {
              console.error("Section promises error:", err)
              connection.rollback(() => {
                res.json({ error: true, message: "Failed to insert sections" })
              })
            })
        } else if (faqs.length > 0) {
          // If there are no sections but there are FAQs
          const faqPromises = faqs.map((faq, index) => {
            return new Promise((resolve, reject) => {
              const faqData = {
                blog_id: blogId,
                question: faq.question,
                answer: faq.answer,
                order: faq.order,
                publish: faq.publish,
                createdAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss"),
                updatedAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss"),
              }

              const faqSql = "INSERT INTO blog_faqs SET ?"
              connection.query(faqSql, faqData, (err, result) => {
                if (err) {
                  console.error("FAQ insert error:", err)
                  reject(err)
                } else {
                  console.log(`FAQ ${index} inserted`)
                  resolve(result)
                }
              })
            })
          })

          // Execute all FAQ insert promises
          Promise.all(faqPromises)
            .then(() => {
              connection.commit((err) => {
                if (err) {
                  console.error("Commit error:", err)
                  return connection.rollback(() => {
                    res.json({ error: true, message: "Failed to commit transaction" })
                  })
                }
                console.log("Transaction committed successfully")
                res.json({ error: false, message: "Successfully created blog with FAQs" })
              })
            })
            .catch((err) => {
              console.error("FAQ promises error:", err)
              connection.rollback(() => {
                res.json({ error: true, message: "Failed to insert FAQs" })
              })
            })
        } else {
          // If no sections or FAQs, just commit the blog post
          connection.commit((err) => {
            if (err) {
              console.error("Commit error:", err)
              return connection.rollback(() => {
                res.json({ error: true, message: "Failed to commit transaction" })
              })
            }
            console.log("Transaction committed successfully")
            res.json({ error: false, message: "Successfully created blog" })
          })
        }
      })
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    res.json({ error: true, message: "An unexpected error occurred" })
  }
}


var blogEditData = (req, res) => {
  let condition = "";

  if (req.query.slug != undefined) {
    condition += ` AND b.slug = "${req.params.id}"`;
  } else {
    condition += ` AND b.id = "${req.params.id}"`;
  }

  // First, get the main blog data
  let blogSql = `SELECT * FROM blog b WHERE 1 ${condition}`;
  
  connection.query(blogSql, function (err, blog) {
    if (err) {
      console.error("Error fetching blog:", err);
      return res.json({ error: true, message: "Error fetching blog data" });
    }

    if (blog.length === 0) {
      return res.json({ message: "No blog found" });
    }

    // Get sections for this blog
    const sectionsSql = `SELECT * FROM blog_sections WHERE blog_id = ${blog[0].id} ORDER BY \`order\``;
    connection.query(sectionsSql, (sectionsErr, sections) => {
      if (sectionsErr) {
        console.error("Error fetching sections:", sectionsErr);
        return res.json({ error: true, message: "Error fetching sections" });
      }

      // Get FAQs for this blog
      const faqsSql = `SELECT * FROM blog_faqs WHERE blog_id = ${blog[0].id} ORDER BY \`order\``;
      connection.query(faqsSql, (faqsErr, faqs) => {
        if (faqsErr) {
          console.error("Error fetching FAQs:", faqsErr);
          return res.json({ error: true, message: "Error fetching FAQs" });
        }

        // Return all data
        res.json({
          blog: blog,
          blog_sections: sections || [],
          blog_faqs: faqs || []
        });
      });
    });
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
          author_id: req.body.author_id,
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
          action_title: req.body.action_title,
          action_btn_1_text: req.body.action_btn_1_text,
          action_btn_1_link: req.body.action_btn_1_link,
          action_btn_2_text: req.body.action_btn_2_text,
          action_btn_2_link: req.body.action_btn_2_link,
          action_subtitle_1: req.body.action_subtitle_1,
          action_description_1: req.body.action_description_1,
          action_subtitle_2: req.body.action_subtitle_2,
          action_description_2: req.body.action_description_2,
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
                let mediaPath = null;

                const sectionFile = req.files && req.files.find(f => f.fieldname === `section_media_${index}`);

                // If new file is uploaded and media type is image or video
                if ((section.media_type === "image" || section.media_type === "video") && sectionFile) {
                  const mediaFileName = `section_${req.body.id}_${index}_${Date.now()}${path.extname(sectionFile.originalname)}`;
                  mediaPath = path.join("uploads/blog/", mediaFileName);

                  const dir = path.dirname(mediaPath);
                  if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                  }

                  fs.renameSync(sectionFile.path, mediaPath);
                  console.log(`Section ${index} media saved to:`, mediaPath);
                }

                // If media type is YouTube
                else if (section.media_type === "youtube" && typeof section.media === "string") {
                  mediaPath = section.media;
                }

                // If no new file uploaded but existing image/video path is available, keep it
                else if (
                  (section.media_type === "image" || section.media_type === "video") &&
                  !sectionFile &&
                  typeof section.media === "string"
                ) {
                  mediaPath = section.media;
                }

                const sectionData = {
                  blog_id: req.body.id,
                  title: section.title,
                  section_link_title: section.section_link_title,
                  media: mediaPath,
                  media_type: section.media_type,
                  description: section.description,
                  grey_quote: section.grey_quote,
                  grey_quote_bg_color: section.grey_quote_bg_color,
                  grey_quote_border_color: section.grey_quote_border_color,
                  section_bg_color: section.section_bg_color,
                  section_border_color: section.section_border_color,
                  order: section.order,
                  publish: section.publish,
                  createdAt: dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
                  updatedAt: dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
                };

                connection.query("INSERT INTO blog_sections SET ?", sectionData, (err) => {
                  if (err) {
                    console.error(`Error inserting section ${index}:`, err);
                    reject(err);
                  } else {
                    resolve();
                  }
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
