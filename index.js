// const fileUpload = require('express-fileupload');
var express = require("express");
var cookieParser = require("cookie-parser");
var dateFormat = require("dateformat");
const paginate = require("express-paginate");
var moment = require("moment-timezone");
const cors = require("cors");
const nodemailer = require("nodemailer");
const fs = require("fs");
const { validateToken } = require("./middlewares/token");
var bodyParser = require("body-parser");
const axios = require("axios");
const cheerio = require("cheerio");
moment().tz("Asia/Kolkata").format();

require("dotenv").config();

const app = express();
// app.use(cors());

app.use(cors({
  origin: '*', // Be more specific in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// app.use(fileUpload());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());

app.use(express.json());
// app.use(express.urlencoded({ extended: true }))
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST, // Your SMTP host
  port: 2525, // Your SMTP port
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
app.get("/api", (req, res) => {
  res.status(200).json({ message: "Welcome to the API" });
});
app.post("/api/send-email", (req, res) => {
  const { name, company, website, email, phone, fromWhere, service, message } =
    req.body;
  const mailOptions = {
    from: "SIB Infotech <website@sibinfotech.com>",
    to: "radhey@sibinfotech.com",
    // to: "mohammadkaif051197@gmail.com",
    subject: `Enquiry Landing Page - ${fromWhere} `,
    html: `
              <p>Dear Admin,</p>
              <p>You have received an enquiry from:</p>
              <table style='width: 100%;' border='1' cellspacing='0'>
                  <tr>
                      <td style='padding:10px;'>Full Name</td>
                      <td style='padding:10px;'>${name}</td>
                  </tr>
                  <tr>
                      <td style='padding:10px;'>Company Name</td>
                      <td style='padding:10px;'>${company}</td>
                  </tr>
                  <tr>
                      <td style='padding:10px;'>Website url</td>
                      <td style='padding:10px;'>${website}</td>
                  </tr>
                  <tr>
                      <td style='padding:10px;'>Email</td>
                      <td style='padding:10px;'>${email}</td>
                  </tr>
                  <tr>
                      <td style='padding:10px;'>Service</td>
                      <td style='padding:10px;'>${service}</td>
                  </tr>
                  <tr>
                      <td style='padding:10px;'>Phone Number</td>
                      <td style='padding:10px;'>${phone}</td>
                  </tr>
                  <tr>
                    <td colspan="2">
                        <p style='padding:10px; font-weight: 700;' >Message</p>
                        <p style='padding:10px; margin-top: 8px'>${message}</p>
                    </td>
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
    res.status(200).json({ message: "Email sent successfully" });
  });
});
app.post("/api/send-ppc-results", validateToken, (req, res) => {
  const { html, fromWhere, userEmail, userName } = req.body;
  const mailOptions = {
    from: "SIB Infotech <website@sibinfotech.com>",
    to: userEmail, // 👈 sent to the user
    // cc: ["contact@sibinfotech.com", "radhey@sibinfotech.com"], // 👈 CC to both admins
    subject: `${fromWhere}`,
    html: `
      <p>Hi ${userName || "there"},</p>
      <p>Thanks for using our PPC Calculator. Below are your submitted results:</p>
      ${html}
      <p style="margin-top:20px;">Best regards,<br />SIB Infotech Team</p>
    `,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to send email" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Email sent successfully" });
  });
});
app.post("/api/fetch-html", async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'url' in request body" });
  }

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "KeywordDensityBot/1.0"
      }
    });

    const $ = cheerio.load(response.data);
    const content = $("body").html() || "";

    return res.status(200).json({ content });
  } catch (err) {
    console.error("❌ Error fetching HTML:", err.message);
    return res.status(500).json({ error: "Could not fetch HTML" });
  }
});
app.post("/api/robotsSitemapCheck", async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'url' in request body" });
  }

  const robotsUrl = `${url}/robots.txt`;
  const sitemapUrl = `${url}/sitemap.xml`;

  try {
    const [robotsRes, sitemapRes] = await Promise.all([
      fetch(robotsUrl),
      fetch(sitemapUrl),
    ]);

    const robotsExists = robotsRes.ok;
    const sitemapExists = sitemapRes.ok;

    return res.status(200).json({
      robotsExists,
      sitemapExists,
      robotsUrl,
      sitemapUrl,
    });
  } catch (err) {
    console.error("Error fetching robots/sitemap:", err.message);
    return res.status(500).json({
      error: "Failed to fetch robots/sitemap",
      details: err.message,
    });
  }
});

app.post("/api/send-email-any", (req, res) => {
  const { html, fromWhere } = req.body;

  const mailOptions = {
    from: "SIB Infotech <website@sibinfotech.com>",
    to: "contact@sibinfotech.com",
    // to: "sibinfotech101@gmail.com",
    cc: "radhey@sibinfotech.com",
    subject: `${fromWhere}`,
    html: html,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("❌ Error sending email:", error.message);

      return res.status(500).json({
        success: false,
        message: "Failed to send email. Please try again later.",
        error: error.message,
      });
    }
    console.log("TTTTTTTTTTTTTTTTTTTTTTTTT");
    res.status(200).json({
      success: true,
      message: "Email sent successfully.",
    });
  });
});

app.post("/api/send-email-application", (req, res) => {
  const { html, fromWhere, resumePath, resumeName } = req.body;
  let pdfBuffer = fs.readFileSync(resumePath);

  const mailOptions = {
    from: "SIB Infotech <website@sibinfotech.com>",
    attachments: [
      {
        filename: resumeName, // Filename of the attachment
        content: pdfBuffer, // Buffer of the file
        contentType: "application/pdf", // Mime type of the file
      },
    ],
    to: "career@sibinfotech.com",
    subject: `${fromWhere}`,
    html: html,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to send application email. Please try again later.",
        error: error.message, // You can omit this in prod if you don't want to expose it
      });
    }
    res.status(200).json({ message: "Email sent successfully" });
  });
});

app.use(cookieParser());
app.set("view engine", "ejs");
app.use("/public", express.static("assets"));
app.use("/api/uploads", express.static("uploads"));
app.use(express.urlencoded({ extended: true }));

// console.log('dirname = ' + __dirname);

let adminRoute = require(__dirname + "/routes/api/adminRoute");
app.use("/api/admin", adminRoute);

let categoryRoute = require(__dirname + "/routes/api/categoryRoute");
app.use("/api/category", categoryRoute);

let blogRoute = require(__dirname + "/routes/api/blogRoute");
app.use("/api/blog", blogRoute);
let serviceRoute = require(__dirname + "/routes/api/serviceRoute");
app.use("/api/service", serviceRoute);

let chatRoute = require(__dirname + "/routes/api/chatRoute");
app.use("/api/chat", chatRoute);

let homeRoute = require(__dirname + "/routes/api/homeRoute");
app.use("/api/home", homeRoute);

app.listen(4001, () => {
  console.log("Server is running on port 4001");
});
