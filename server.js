import express from "express";
import bodyParser from "body-parser";
import crypto from "crypto";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import _ from "lodash";

const app = express();
app.use(bodyParser.json());

const adapter = new JSONFile("db.json");
const db = new Low(adapter, { strings: [] }); 

await db.read();
db.data ||= { strings: [] }; 

// Helper functions
const analyzeString = (value) => {
  const length = value.length;
  const normalized = value.toLowerCase().replace(/\s+/g, "");
  const is_palindrome = normalized === normalized.split("").reverse().join("");
  const unique_characters = new Set(value).size;
  const word_count = value.trim().split(/\s+/).length;
  const sha256_hash = crypto.createHash("sha256").update(value).digest("hex");
  const character_frequency_map = {};

  for (const char of value) {
    character_frequency_map[char] = (character_frequency_map[char] || 0) + 1;
  }

  return {
    length,
    is_palindrome,
    unique_characters,
    word_count,
    sha256_hash,
    character_frequency_map,
  };
};

// --- POST /strings ---
app.post("/strings", async (req, res) => {
  const { value } = req.body;

  if (!value || typeof value !== "string") {
    return res.status(400).json({ error: 'Invalid "value" field' });
  }

  const sha256_hash = crypto.createHash("sha256").update(value).digest("hex");
  const existing = db.data.strings.find((s) => s.id === sha256_hash);
  if (existing) return res.status(409).json({ error: "String already exists" });

  const properties = analyzeString(value);
  const entry = {
    id: sha256_hash,
    value,
    properties,
    created_at: new Date().toISOString(),
  };

  db.data.strings.push(entry);
  await db.write();

  res.status(201).json(entry);
});

// --- GET /strings/:string_value ---
app.get("/strings/:string_value", (req, res) => {
  const { string_value } = req.params;
  const found = db.data.strings.find((s) => s.value === string_value);
  if (!found) return res.status(404).json({ error: "String not found" });
  res.json(found);
});

// --- GET /strings ---
app.get("/strings", (req, res) => {
  const { is_palindrome, min_length, max_length, word_count, contains_character } = req.query;
  let results = db.data.strings;

  if (is_palindrome !== undefined) {
    results = results.filter((s) => s.properties.is_palindrome === (is_palindrome === "true"));
  }
  if (min_length) results = results.filter((s) => s.properties.length >= Number(min_length));
  if (max_length) results = results.filter((s) => s.properties.length <= Number(max_length));
  if (word_count) results = results.filter((s) => s.properties.word_count === Number(word_count));
  if (contains_character) results = results.filter((s) => s.value.includes(contains_character));

  res.json({
    data: results,
    count: results.length,
    filters_applied: req.query,
  });
});

// --- DELETE /strings/:string_value ---
app.delete("/strings/:string_value", async (req, res) => {
  const { string_value } = req.params;
  const index = db.data.strings.findIndex((s) => s.value === string_value);
  if (index === -1) return res.status(404).json({ error: "String not found" });

  db.data.strings.splice(index, 1);
  await db.write();
  res.status(204).end();
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
