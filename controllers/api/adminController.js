const async = require('async');
var connection = require('../../config/connection');
var dateFormat = require('dateformat');
var moment = require('moment');
var md5 = require('md5');

var adminLogin = (req, res) => {

    let email = req.body.email;
    let password = md5(req.body.password);

    let sql = `SELECT * FROM admin WHERE email = '${email}' AND password = '${password}'`;
    connection.query(sql, function (err, admin) {
        if (!err) {
          if(admin.length) {
            res.json({message: 'Login successful', admin: admin});
          } else {
            res.json({message: 'Email or Password is wrong'});
          }
        }
    });
}

module.exports = { adminLogin }
