import mariadb from "mariadb";

const pool = mariadb.createPool({
  host: "192.168.1.44", // Database server IP
  user: "Admin",     // Your MariaDB username
  password: "qwaszxqw", // Your MariaDB password
  database: "5crowns",
});

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const conn = await pool.getConnection();
      const rows = await conn.query("SELECT * FROM players");
      conn.end();

      res.status(200).json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
