-- create_tables.sql
-- Script para criar as tabelas usadas pelo projeto Vip Cortes

-- extensão para UUID (opcional)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS: clientes / administradores (simples)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT, -- pode ser NULL se login social
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_admin BOOLEAN DEFAULT FALSE
);

-- APPOINTMENTS: agendamentos
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  age INTEGER,
  phone TEXT,
  service TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- REVIEWS: avaliações / depoimentos
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- FIDELITY: cartão fidelidade / pontos simples
CREATE TABLE IF NOT EXISTS fidelities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);
