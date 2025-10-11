const async = require("async");
var connection = require("../../config/connection");
var dateFormat = require("dateformat");
var moment = require("moment");
var md5 = require("md5");

var conn_obj = require("../../config/conn_obj");
const mysql = require("mysql-await");

var dashboardData = async (req, res) => {
  const pool = mysql.createPool(conn_obj);
  const conn = await pool.awaitGetConnection();

  let dashboardCount = {};

  let category = await conn.awaitQuery(
    `SELECT COUNT(id) as count FROM category`
  );
  dashboardCount.category = category[0].count;

  let author = await conn.awaitQuery(
    `SELECT COUNT(id) as count FROM authors`
  );
  dashboardCount.author = author[0].count;

  let blog = await conn.awaitQuery(`SELECT COUNT(id) as count FROM blog`);
  dashboardCount.blog = blog[0].count;

  let contact_enquiry = await conn.awaitQuery(
    `SELECT COUNT(id) as count FROM contact_enquiry`
  );
  dashboardCount.contact_enquiry = contact_enquiry[0].count;

  let career = await conn.awaitQuery(`SELECT COUNT(id) as count FROM career`);
  dashboardCount.career = career[0].count;

  res.json({ dashboardCount: dashboardCount });

  await pool.awaitEnd();
};

var enquiriesData = (req, res) => {
  let sql = `SELECT * FROM contact_enquiry`;
  connection.query(sql, function (err, enquiries) {
    if (!err) {
      if (enquiries.length) {
        res.json({ enquiries: enquiries });
      } else {
        res.json({ message: "No enquiries found" });
      }
    }
  });
};
var enquiriesDataBanner = (req, res) => {
  let sql = `SELECT * FROM banner_enquiry`;
  connection.query(sql, function (err, enquiries) {
    if (!err) {
      if (enquiries.length) {
        res.json({ enquiries: enquiries });
      } else {
        res.json({ message: "No enquiries found" });
      }
    }
  });
};

var enquiryDeleteData = (req, res) => {
  console.log(req.body.id);

  let sql = `DELETE FROM contact_enquiry WHERE id = '${req.body.id}'`;
  connection.query(sql, function (err) {
    if (!err) {
      res.json({ error: false, message: "Successfully deleted" });
    } else {
      res.json({ error: true, message: "Something went wrong" });
    }
  });
};

var submit_enquiry = (req, res) => {
  let formData = {
    name: req.body.name,
    cname: req.body.cname,
    email: req.body.email,
    phone: req.body.phone,
    details: req.body.details,
    createdAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss"),
    updatedAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss"),
  };

  let sql = "INSERT INTO contact_enquiry SET ?";
  connection.query(sql, formData, (err) => {
    if (!err) {
      res.json({ error: false, message: "Successfully sent" });
    } else {
      res.json({ error: true, message: "Something went wrong" });
    }
  });
};


  // Replace your existing handler with this complete function.
  // It verifies reCAPTCHA v2 token server-side before inserting into DB.
  // Requires environment variable: RECAPTCHA_SECRET
  // If your Node < 18, install node-fetch: npm i node-fetch
  var submit_quotes = async (req, res) => {
    try {
        // === GOOGLE RECAPTCHA VERIFICATION START ===
        const token = req.body.recaptchaToken;
        if (!token) {
        return res.json({ error: true, message: "reCAPTCHA token missing" });
        }

        const verifyUrl = "https://www.google.com/recaptcha/api/siteverify";
        const params = `secret=${encodeURIComponent("6LeWu-IrAAAAAJ0czPF94_mE5hF8wQMUBrbIDQPm")}&response=${encodeURIComponent(token)}${
        req.ip ? `&remoteip=${encodeURIComponent(req.ip)}` : ""
        }`;

        const verifyResp = await fetch(verifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
        });

        const data = await verifyResp.json();
        if (!data.success) {
        return res.json({ error: true, message: "reCAPTCHA verification failed" });
        }
        // === GOOGLE RECAPTCHA VERIFICATION END ===

        // === EXISTING ENQUIRY INSERT LOGIC ===
        let formData = {
            name: req.body.name,
            email: req.body.email,
            message: req.body.message,
            created_at: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss"),
            updated_at: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss"),
        };

        let sql = "INSERT INTO messages SET ?";
        connection.query(sql, formData, (err) => {
        if (!err) {
            res.json({ error: false, message: "Successfully sent" });
        } else {
            console.error("DB insert error:", err);
            res.json({ error: true, message: "Something went wrong" });
        }
        });
    } catch (err) {
        console.error("submit_quotes error:", err);
        res.json({ error: true, message: "Server error" });
    }
  };


var submit_banner_enquiry = async (req, res) => {
  try {
    // === GOOGLE RECAPTCHA VERIFICATION START ===
    const token = req.body.recaptchaToken;
    if (!token) {
      return res.json({ error: true, message: "reCAPTCHA token missing" });
    }

    const verifyUrl = "https://www.google.com/recaptcha/api/siteverify";
    const params = `secret=${encodeURIComponent("6LeWu-IrAAAAAJ0czPF94_mE5hF8wQMUBrbIDQPm")}&response=${encodeURIComponent(token)}${
      req.ip ? `&remoteip=${encodeURIComponent(req.ip)}` : ""
    }`;

    const verifyResp = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    const data = await verifyResp.json();
    if (!data.success) {
      return res.json({ error: true, message: "reCAPTCHA verification failed" });
    }
    // === GOOGLE RECAPTCHA VERIFICATION END ===

    // === EXISTING ENQUIRY INSERT LOGIC ===
    let formData = {
      name: req.body.name,
      cname: req.body.cname,
      email: req.body.email,
      phone: req.body.phone,
      details: req.body.details,
      service: req.body.service,
      website: req.body.website,
      pageUrl: req.body.pageUrl,
      createdAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss"),
      updatedAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss"),
    };

    let sql = "INSERT INTO banner_enquiry SET ?";
    connection.query(sql, formData, (err) => {
      if (!err) {
        res.json({ error: false, message: "Successfully sent" });
      } else {
        res.json({ error: true, message: "Something went wrong" });
      }
    });
  } catch (err) {
    console.error("submit_banner_enquiry error:", err);
    res.json({ error: true, message: "Server error" });
  }
};

var careersData = async (req, res) => {
  const pool = mysql.createPool(conn_obj);
  const conn = await pool.awaitGetConnection();

  let sql = `SELECT * FROM career`;
  let careers = await conn.awaitQuery(sql);

  if (careers.length) {
    res.json({ careers: careers });
  } else {
    res.json({ message: "No careers found" });
  }

  await pool.awaitEnd();
};

var careerEditData = async (req, res) => {
  const pool = mysql.createPool(conn_obj);
  const conn = await pool.awaitGetConnection();

  let sql = `SELECT * FROM career WHERE id = '${req.params.id}'`;
  let career = await conn.awaitQuery(sql);

  let sql2 = `SELECT * FROM career_experience WHERE career_id = '${req.params.id}'`;
  let careerExperiences = await conn.awaitQuery(sql2);

  if (career.length) {
    res.json({ career: career, careerExperiences: careerExperiences });
  } else {
    res.json({ message: "No career found" });
  }

  await pool.awaitEnd();
};

var careerDeleteData = (req, res) => {
  console.log(req.body.id);

  let sql = `DELETE FROM career WHERE id = '${req.body.id}'`;
  connection.query(sql, function (err) {
    if (!err) {
      res.json({ error: false, message: "Successfully deleted" });
    } else {
      res.json({ error: true, message: "Something went wrong" });
    }
  });
};

var career_enquiry = (req, res) => {
  let resumePath = "";
  if (req.files.resume != undefined) {
    resumePath = req.files.resume[0].destination + req.files.resume[0].filename;
    console.log("this the change", req.files.resume[0].originalname);
  }

  let inputs = JSON.parse(req.body.inputs);
  let experienceFields = JSON.parse(req.body.experienceFields);

  if (inputs.same_address == "Yes") {
    inputs.perm_add = inputs.pre_add;
    inputs.perm_city = inputs.pre_city;
    inputs.perm_state = inputs.pre_state;
    inputs.perm_pincode = inputs.pre_pincode;
  }

  let formData = {
    resume: resumePath,
    jobtype: inputs.jobtype,
    postapplied: inputs.postapplied,
    job_location: inputs.job_location,
    fname: inputs.fname,
    lname: inputs.lname,
    email: inputs.email,
    phone: inputs.phone,
    pre_add: inputs.pre_add,
    pre_city: inputs.pre_city,
    pre_state: inputs.pre_state,
    pre_pincode: inputs.pre_pincode,
    gender: inputs.gender,
    dob: inputs.dob,
    category: inputs.category,
    marital: inputs.marital,
    mobile: inputs.mobile,
    fax: inputs.fax,
    perm_add: inputs.perm_add,
    perm_city: inputs.perm_city,
    perm_state: inputs.perm_state,
    perm_pincode: inputs.perm_pincode,
    same_address: inputs.same_address,
    qualification: inputs.qualification,
    total_ye: inputs.total_ye,
    total_me: inputs.total_me,
    it_ye: inputs.it_ye,
    it_me: inputs.it_me,
    expect_salary: inputs.expect_salary,
    current_salary: inputs.current_salary,
    notice_period: inputs.notice_period,
    join_date: inputs.join_date,
    cur_jobsts: inputs.cur_jobsts,
    anyOtherskills: inputs.anyOtherskills,
    remarks: inputs.remarks,
    from_source: inputs.from_source,
    createdAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss"),
    updatedAt: dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss"),
  };
  console.log("FDSSDFSDF thisd ithe rendom");
  async.waterfall(
    [
      function (callback) {
        let sql = "INSERT INTO career SET ?";
        connection.query(sql, formData, (err, result) => {
          if (!err) {
            let career_id = result.insertId;
            callback(null, career_id);
          } else {
            callback(err, null);
          }
        });
      },
      function (career_id, callback) {
        if (career_id) {
          let values = [];

          experienceFields.forEach(function (arrayItem) {
            if (arrayItem.acomp_name_exp) {
              values.push([
                career_id,
                arrayItem.acomp_name_exp,
                arrayItem.acomp_level_exp,
                arrayItem.acomp_ind_exp,
                arrayItem.acomp_jtitle_exp,
                arrayItem.acomp_fyear_exp,
                arrayItem.acomp_fmonth_exp,
                arrayItem.acomp_tyear_exp,
                arrayItem.acomp_tmonth_exp,
                arrayItem.acomp_jdesc_exp,
                dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss"),
                dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss"),
              ]);
            }
          });

          if (values.length) {
            let sql =
              "INSERT INTO career_experience (career_id, acomp_name_exp, acomp_level_exp, acomp_ind_exp, acomp_jtitle_exp, acomp_fyear_exp, acomp_fmonth_exp, acomp_tyear_exp, acomp_tmonth_exp, acomp_jdesc_exp, createdAt, updatedAt) VALUES ?";

            connection.query(sql, [values], function (err) {
              if (!err) {
                callback(null, career_id);
              } else {
                callback(err, null);
              }
            });
          } else {
            callback(null, career_id);
          }
        }
      },
    ],
    function (err, result) {
      if (result) {
        console.log("this is the file path", resumePath);
        res.json({
          error: false,
          message: "Successfully sent",
          resumePath,
          resumeName: req.files.resume[0].originalname,
        });
      } else {
        console.log("Thsi is hte error I can get ", err);
        res.json({ error: true, message: "Something went wrong1" });
      }
    }
  );
};

module.exports = {
  dashboardData,
  enquiriesData,
  enquiriesDataBanner,
  enquiryDeleteData,
  careersData,
  careerEditData,
  careerDeleteData,
  submit_enquiry,
  career_enquiry,
  submit_banner_enquiry,
  submit_quotes,
};
