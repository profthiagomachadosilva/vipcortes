// server.js - Back-end Vip Cortes

import express from "express";
import cors from "cors";
import pkg from "pg";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

dotenv.config();

const { Pool } = pkg;

// Config DB (Render fornece DATABASE_URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const app = express();
app.use(cors());
app.use(express.json());

// ---------------- ROTAS ---------------- //

// --- AGENDAMENTOS ---
// Criar agendamento
app.post("/api/appointments", async (req, res) => {
  try {
    const { name, age, phone, service, date, time } = req.body;
    if (!name || !service || !date) {
      return res.status(400).json({ error: "Campos obrigatórios faltando." });
    }

    const q = `
      INSERT INTO appointments (name, age, phone, service, date, time)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    const result = await pool.query(q, [name, age, phone, service, date, time]);
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error("Erro ao criar agendamento:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// Listar agendamentos
app.get("/api/appointments", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM appointments ORDER BY date, time");
    res.json({ appointments: result.rows });
  } catch (err) {
    console.error("Erro ao buscar agendamentos:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// Excluir agendamento
app.delete("/api/appointments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM appointments WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao excluir agendamento:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// --- AVALIAÇÕES ---
// Criar avaliação
app.post("/api/reviews", async (req, res) => {
  try {
    const { author_name, content } = req.body;
    if (!content) return res.status(400).json({ error: "Conteúdo obrigatório." });

    await pool.query(
      "INSERT INTO reviews (author_name, content) VALUES ($1, $2)",
      [author_name, content]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao salvar avaliação:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// Listar avaliações
app.get("/api/reviews", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM reviews ORDER BY created_at DESC");
    res.json({ reviews: result.rows });
  } catch (err) {
    console.error("Erro ao buscar avaliações:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// --- USUÁRIOS ---
// Criar conta
app.post("/api/signup", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !password) {
      return res.status(400).json({ error: "Nome e senha obrigatórios." });
    }

    const hashed = await bcrypt.hash(password, 10);
    const q = `
      INSERT INTO users (name, email, password, phone)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    const result = await pool.query(q, [name, email, hashed, phone]);
    res.json({ success: true, userId: result.rows[0].id });
  } catch (err) {
    console.error("Erro ao criar usuário:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// --- FIDELIDADE ---
// Cancelar cartão fidelidade
app.post("/api/fidelities/:userId/cancel", async (req, res) => {
  try {
    const { userId } = req.params;
    await pool.query("UPDATE fidelities SET active = false WHERE user_id = $1", [userId]);
    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao cancelar fidelidade:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// ---------------- START SERVER ---------------- //
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
