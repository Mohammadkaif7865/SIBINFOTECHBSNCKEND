// const fileUpload = require('express-fileupload');
var express = require('express');
var cookieParser = require('cookie-parser');
var dateFormat = require('dateformat');
const paginate = require('express-paginate');
var moment = require('moment-timezone');
const cors = require('cors');
const nodemailer = require("nodemailer");

var bodyParser = require('body-parser')

moment().tz("Asia/Kolkata").format();

require('dotenv').config()

const app = express();
app.use(cors());

// app.use(fileUpload());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());

app.use(express.json())
// app.use(express.urlencoded({ extended: true }))
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST, // Your SMTP host
    port: 587, // Your SMTP port
    secure: false, // Whether your SMTP server uses SSL
    auth: {
      user: process.env.MAIL_USER, // SMTP username
      pass: process.env.MAIL_PASS, // SMTP password
    },
  });
  app.use((req, res, next) => {
    console.log("Request URL:", req.originalUrl); // Log the incoming request URL
    next();
  });
// keep this before all routes that will use pagination
app.use(paginate.middleware(10, 50));
// Add a base route for '/api' to handle generic API requests
app.get('/api', (req, res) => {
    res.status(200).json({ message: "Welcome to the API" });
});
app.post("/api/send-email", (req, res) => {
    const { name, company, website, email, phone } = req.body;
    console.log("DSSDFSDFSDFSDF", name, company, website, email);
    const mailOptions = {
      from: "SIB Infotech <contact@sibinfotech.com>",
      to: "contact@sibinfotech.com",
      cc: "radhey@sibinfotech.com",
      subject: "New Inquiry from Digital Marketing Services Mumbai Landing Page",
      html: `
              <p>Dear Admin,</p>
              <p>You have received an enquiry from:</p>
              <table width='500' border='1' cellspacing='0'>
                  <tr>
                      <td style='padding:10px;' width='250'>Full Name</td>
                      <td style='padding:10px;'>${name}</td>
                  </tr>
                  <tr>
                      <td style='padding:10px;' width='250'>Company Name</td>
                      <td style='padding:10px;'>${company}</td>
                  </tr>
                  <tr>
                      <td style='padding:10px;' width='250'>Website url</td>
                      <td style='padding:10px;'>${website}</td>
                  </tr>
                  <tr>
                      <td style='padding:10px;' width='250'>Email</td>
                      <td style='padding:10px;'>${email}</td>
                  </tr>
                  <tr>
                      <td style='padding:10px;' width='250'>Phone Number</td>
                      <td style='padding:10px;'>${phone}</td>
                  </tr>
              </table>`,
    };
  
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        // Return an HTML page with a script for delayed redirection
        res.send(`
                  <html>
                      <head><title>Submission Failed</title></head>
                      <body>
                          <h1>Failed to process your request</h1>
                          <p>We encountered an error. You will be redirected shortly.</p>
                          <script>
                              setTimeout(function() {
                                  window.location.href = 'https://sibinfotech.com/thanks';
                              }, 5000); // Change 5000 to however many milliseconds you want
                          </script>
                      </body>
                  </html>
              `);
      }
      res.redirect("https://sibinfotech.com/thanks");
    });
  });
  app.post("/api/send-email-any", (req, res) => {
    const { html, fromWhere } = req.body;
    console.log("DSSDFSDFSDFSDF", html);
    const mailOptions = {
      from: "SIB Infotech <contact@sibinfotech.com>",
      to:"mohammadkaif051197@gmail.com",
    //   to: "contact@sibinfotech.com",
    //   cc: "radhey@sibinfotech.com",
      subject: `Website Enquiry from ${fromWhere}`,
      html: html,
    };
  
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        // Return an HTML page with a script for delayed redirection
        res.send(`
                  <html>
                      <head><title>Submission Failed</title></head>
                      <body>
                          <h1>Failed to process your request</h1>
                          <p>We encountered an error. You will be redirected shortly.</p>
                          <script>
                              setTimeout(function() {
                                  window.location.href = 'https://sibinfotech.com/thanks';
                              }, 5000); // Change 5000 to however many milliseconds you want
                          </script>
                      </body>
                  </html>
              `);
      }
      res.status(200).json({ message: "Email sent successfully" });  });
  });
app.use(cookieParser());
app.set('view engine', 'ejs');
app.use('/public', express.static('assets'));
app.use('/api/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: true }));

// console.log('dirname = ' + __dirname);

let adminRoute = require(__dirname + '/routes/api/adminRoute');
app.use('/api/admin', adminRoute);

let categoryRoute = require(__dirname + '/routes/api/categoryRoute');
app.use('/api/category', categoryRoute);

let blogRoute = require(__dirname + '/routes/api/blogRoute');
app.use('/api/blog', blogRoute);

let homeRoute = require(__dirname + '/routes/api/homeRoute');
app.use('/api/home', homeRoute);

app.listen(4001,  () => {
    console.log('Server is running on port 4001');
});

