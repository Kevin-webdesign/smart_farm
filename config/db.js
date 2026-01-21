import mysql from "mysql2/promise";
import { config as DotEnv} from 'dotenv';
DotEnv()


if (!process.env.DB_USER) {
  console.log(" Database environment variables not loaded");
}

export const db = mysql.createPool({
  host: process.env.DB_HOST,
  port:process.env.MYSQL_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});