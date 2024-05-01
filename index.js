// Importing required modules
const express = require('express');
const cookieParser = require('cookie-parser');
const dateFormat = require('dateformat');
const paginate = require('express-paginate');
const moment = require('moment-timezone');
const cors = require('cors');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');

// Configure time zone
moment().tz("Asia/Kolkata").format();

// Load environment variables
require('dotenv').config();

// Create an Express app
const app = express();

// Define CORS options
const allowedOrigins = [
    'http://157.245.98.188',
    'https://www.sibinfotech.com',
    'http://localhost:3000',
    'http://localhost:4000'
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
    credentials: true, 
    optionsSuccessStatus: 200 
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Apply middleware
app.use(fileUpload());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static assets
app.use('/public', express.static('assets'));
app.use('/uploads', express.static('uploads'));

// Pagination middleware
app.use(paginate.middleware(10, 50));

// Cookie parser middleware
app.use(cookieParser());

// Set view engine
app.set('view engine', 'ejs');

// Import routes
let adminRoute = require(__dirname + '/routes/api/adminRoute');
let categoryRoute = require(__dirname + '/routes/api/categoryRoute');
let blogRoute = require(__dirname + '/routes/api/blogRoute');
let homeRoute = require(__dirname + '/routes/api/homeRoute');

// Use routes
app.use('/api/admin', adminRoute);
app.use('/api/category', categoryRoute);
app.use('/api/blog', blogRoute);
app.use('/api/home', homeRoute);

// Start the server
app.listen(4000, () => {
    console.log('Server is running on port 4000');
});
