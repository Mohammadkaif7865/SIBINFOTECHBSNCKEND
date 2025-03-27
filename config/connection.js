// Old
// var mysql = require('mysql');

// New
const mysql = require('mysql2');
const conn_obj = require('./conn_obj');

const connection = mysql.createConnection(conn_obj);

connection.connect((err) => {
  if (err) {
    console.error('MySQL connection failed: ' + err.stack);
    return;
  }
  console.log('MySQL connected as ID ' + connection.threadId);
});

module.exports = connection;
