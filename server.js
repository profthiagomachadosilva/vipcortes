// server.js - Backend + Servidor de arquivos estáticos
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";
import bcrypt from "bcrypt";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// ---------- PostgreSQL ----------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Render exige SSL
});

// ---------- Servir Frontend ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir arquivos estáticos da pasta Main
app.use(express.static(path.join(__dirname)));

// Rota raiz -> index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ---------- Rotas da API ----------
app.get("/api/appointments", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM appointments ORDER BY date, time");
    res.json({ appointments: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar agendamentos" });
  }
});

app.post("/api/appointments", async (req, res) => {
  const { name, age, phone, service, date, time } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO appointments (name, age, phone, service, date, time) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [name, age, phone, service, date, time]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar agendamento" });
  }
});

app.delete("/api/appointments/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM appointments WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erro ao excluir agendamento" });
  }
});

// ---------- Avaliações ----------
app.get("/api/reviews", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM reviews ORDER BY created_at DESC");
    res.json({ reviews: result.rows });
  } catch {
    res.status(500).json({ error: "Erro ao carregar avaliações" });
  }
});

app.post("/api/reviews", async (req, res) => {
  const { author_name, content } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO reviews (author_name, content) VALUES ($1,$2) RETURNING *",
      [author_name, content]
    );
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Erro ao salvar avaliação" });
  }
});

// ---------- Autenticação ----------
app.post("/api/signup", async (req, res) => {
  const { name, email, password, phone } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (name, email, password_hash, phone) VALUES ($1,$2,$3,$4) RETURNING id,name,email",
      [name, email, hash, phone]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar conta" });
  }
});

// ---------- Fidelidade ----------
app.post("/api/fidelities/:userId/cancel", async (req, res) => {
  try {
    await pool.query("UPDATE fidelities SET active=false WHERE user_id=$1", [req.params.userId]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erro ao cancelar fidelidade" });
  }
});

// ---------- Iniciar Servidor ----------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
