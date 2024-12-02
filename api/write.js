import mariadb from "mariadb";

const pool = mariadb.createPool({
  host: "192.168.1.44", // Database server IP
  user: "Admin",     // Your MariaDB username
  password: "qwaszxqw", // Your MariaDB password
  database: "5crowns",
});

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { name, score } = req.body;

    if (!name || typeof score !== "number") {
      res.status(400).json({ error: "Invalid input" });
      return;
    }

    try {
      const conn = await pool.getConnection();
      const result = await conn.query("INSERT INTO players (name, score) VALUES (?, ?)", [name, score]);
      conn.end();

      res.status(201).json({ success: true, id: result.insertId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
