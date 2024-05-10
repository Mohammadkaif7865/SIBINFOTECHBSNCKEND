// const fileUpload = require('express-fileupload');
var express = require('express');
var cookieParser = require('cookie-parser');
var dateFormat = require('dateformat');
const paginate = require('express-paginate');
var moment = require('moment-timezone');
const cors = require('cors');
var bodyParser = require('body-parser')

moment().tz("Asia/Kolkata").format();

require('dotenv').config()

const app = express();
app.use(cors());

// app.use(fileUpload());

// app.use(bodyParser.urlencoded({
//     extended: true
// }));

app.use(express.json())
// app.use(express.urlencoded({ extended: true }))

// keep this before all routes that will use pagination
app.use(paginate.middleware(10, 50));

app.use(cookieParser());
app.set('view engine', 'ejs');
app.use('/public', express.static('assets'));
app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: true }));

// console.log('dirname = ' + __dirname);

let adminRoute = require(__dirname + '/routes/api/adminRoute');
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.gmail.com',  // Your SMTP host
    port: 587,                 // Your SMTP port
    secure: false,             // Whether your SMTP server uses SSL
    auth: {
        user: 'contact@sibinfotech.com', // SMTP username
        pass: 'mdpevggqewngmhnx'          // SMTP password
    }
});
app.get('/', (req, res) => {
    res.send("Express server is running");
});

app.post('/send-email', (req, res) => {
    const { name,company,website,email,phone } = req.body;
    console.log("DSSDFSDFSDFSDF", name, company, website, email, email);
    const mailOptions = {
        from: 'contact@sibinfotech.com',
        to:"sib.zaroon@gmail.com",
        subject: "New Inquiry from Digital Marketing Services Mumbai Landing Page",
        text: `
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
        </table>`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).send(error.toString());
        }
        res.status(200).send('Email sent: ' + info.response);
    });
});
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

