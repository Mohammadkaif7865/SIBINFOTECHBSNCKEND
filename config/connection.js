var mysql = require('mysql');
var conn_obj = require('./conn_obj');

var connection = mysql.createConnection(conn_obj);

connection.connect();

module.exports = connection;
