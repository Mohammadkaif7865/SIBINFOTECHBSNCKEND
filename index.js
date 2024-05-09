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
app.use('/uploads', express.static('/var/www/SIBINFOTECHBSNCKEND/uploads'));
app.use(express.urlencoded({ extended: true }));

// console.log('dirname = ' + __dirname);

let adminRoute = require(__dirname + '/routes/api/adminRoute');
app.get('/', (req, res) => {
    res.send("Express server is running");
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

