import express from "express";
import jwt from "jsonwebtoken";
import pg from "pg";

const { Pool } = pg;
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key";

const pool = new Pool({
  connectionString:
    "postgres://app_pooler:app_pooler_password@localhost:5432/minis",
});

const app = express();
app.use(express.json());

async function executeWithUserContext(token: any, callback: any) {
  const dbClient = await pool.connect();

  try {
    let role = "app_anonymous";
    let claimsJson = "{}";

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        claimsJson = JSON.stringify(decoded);
        role = "app_authenticated";
      } catch (err) {
        throw new Error("Invalid or expired token");
      }
    }

    await dbClient.query("BEGIN");

    await dbClient.query(`SET LOCAL ROLE ${role}`);

    // inject claims into the transaction-scoped GUC
    await dbClient.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
      claimsJson,
    ]);

    const result = await callback(dbClient);

    await dbClient.query("COMMIT");
    return result;
  } catch (error) {
    await dbClient.query("ROLLBACK");
    throw error;
  } finally {
    // Release the client back to the pool
    dbClient.release();
  }
}

app.get("/api/notes", async (req, res) => {
  const authHeader = req.headers.authorization?.split(" ")[1];

  try {
    const data = await executeWithUserContext(authHeader, async (client: any) => {
      const queryResult = await client.query("SELECT * FROM user_notes");
      return queryResult.rows;
    });

    res.json(data);
  } catch (err) {
    res.status(401).json({ error: (err as Error).message });
  }
});

app.post("/api/notes", async (req, res) => {
  const authHeader = req.headers.authorization?.split(" ")[1];
  console.log(req.body);
  const { title, content } = req.body;

  try {
    const data = await executeWithUserContext(authHeader, async (client: any) => {
      const queryResult = await client.query(
        `INSERT INTO user_notes (user_id, title, content) 
         VALUES (current_app_user_id(), $1, $2) 
         RETURNING *`,
        [title, content],
      );
      return queryResult.rows[0];
    });

    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
