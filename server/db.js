const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config();

const pool = mysql.createPool({
  host: "localhost", 
  port: 3306,
  user: "root",
  password: "",
  database: "InveSmart",
  waitForConnections: true,
  connectionLimit: 10, // max liczba jednoczesnych połączeń
  queueLimit: 0
});

module.exports = pool;
