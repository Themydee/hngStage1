import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import crypto from 'crypto'
import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())

// --- Database setup ---
const adapter = new JSONFile('db.json')

// Provide default structure here 👇
const defaultData = { strings: [] }

const db = new Low(adapter, defaultData)
await db.read()
db.data ||= { strings: [] }

// --- Helper function ---
const analyzeString = (value) => {
  const clean = value.toLowerCase()
  const is_palindrome = clean === clean.split('').reverse().join('')
  const length = value.length
  const word_count = value.trim().split(/\s+/).length
  const unique_characters = new Set(clean).size
  const character_frequency_map = {}
  for (const char of clean) {
    character_frequency_map[char] = (character_frequency_map[char] || 0) + 1
  }

  const sha256_hash = crypto.createHash('sha256').update(value).digest('hex')

  return {
    id: sha256_hash,
    value,
    properties: {
      length,
      is_palindrome,
      unique_characters,
      word_count,
      sha256_hash,
      character_frequency_map,
    },
    created_at: new Date().toISOString(),
  }
}

// --- POST /strings ---
app.post('/strings', async (req, res) => {
  const { value } = req.body
  if (!value) return res.status(422).json({ error: "Missing 'value' field" })

  const existing = db.data.strings.find((s) => s.value === value)
  if (existing) return res.status(409).json({ error: 'Duplicate string' })

  const analyzed = analyzeString(value)
  db.data.strings.push(analyzed)
  await db.write()
  res.status(201).json(analyzed)
})

// --- GET /strings/:value ---
app.get('/strings/:value', (req, res) => {
  const { value } = req.params
  const string = db.data.strings.find((s) => s.value === value)
  if (!string) return res.status(404).json({ error: 'String not found' })
  res.json(string)
})

// --- GET /strings (all or with filters) ---
app.get("/strings", (req, res) => {
  let results = db.data.strings;

  const { is_palindrome, min_length, max_length } = req.query;

  if (is_palindrome !== undefined)
    results = results.filter(
      (s) => s.properties.is_palindrome === (is_palindrome === "true")
    );

  if (min_length) results = results.filter((s) => s.properties.length >= +min_length);
  if (max_length) results = results.filter((s) => s.properties.length <= +max_length);

  res.json(results);
});

// --- DELETE /strings/:value ---
app.delete('/strings/:value', async (req, res) => {
  const { value } = req.params
  const index = db.data.strings.findIndex((s) => s.value === value)
  if (index === -1) return res.status(404).json({ error: 'String not found' })
  db.data.strings.splice(index, 1)
  await db.write()
  res.json({ message: 'Deleted successfully' })
})

// --- Start server ---
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`))
