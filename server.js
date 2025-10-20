
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
  const original = value
  // For palindrome check: ignore spaces and case
  const cleanForPalindrome = value.replace(/\s+/g, '').toLowerCase()
  const is_palindrome =
    cleanForPalindrome === cleanForPalindrome.split('').reverse().join('')

  const length = original.length
  const word_count = original.trim() === '' ? 0 : original.trim().split(/\s+/).length
  const unique_characters = new Set(original).size

  const character_frequency_map = {}
  for (const char of original) {
    character_frequency_map[char] = (character_frequency_map[char] || 0) + 1
  }

  const sha256_hash = crypto.createHash('sha256').update(original).digest('hex')

  return {
    id: sha256_hash,
    value: original,
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

  if (value === undefined) {
    return res.status(400).json({ error: "Missing 'value' field" })
  }
  if (typeof value !== 'string') {
    return res.status(422).json({ error: "'value' must be a string" })
  }
  if (value.trim() === '') {
    return res.status(422).json({ error: "'value' must not be empty" })
  }

  const existing = db.data.strings.find((s) => s.value === value || s.id === value)
  if (existing) return res.status(409).json({ error: 'Duplicate string' })

  const analyzed = analyzeString(value)
  db.data.strings.push(analyzed)
  await db.write()
  res.status(201).json(analyzed)
})

// --- GET /strings/:value ---
app.get('/strings/:value', (req, res) => {
  const { value } = req.params
  const string = db.data.strings.find((s) => s.value === value || s.id === value)
  if (!string) return res.status(404).json({ error: 'String not found' })
  res.json(string)
})

// --- GET /strings (all or with filters) ---
function parseBooleanParam(val) {
  if (val === undefined) return undefined
  if (val === 'true') return true
  if (val === 'false') return false
  return null
}

app.get('/strings', (req, res) => {
  let results = db.data.strings.slice()
  const appliedFilters = {}

  const { is_palindrome, min_length, max_length, word_count, contains_character } = req.query

  if (is_palindrome !== undefined) {
    const parsed = parseBooleanParam(is_palindrome)
    if (parsed === null) return res.status(400).json({ error: 'is_palindrome must be true or false' })
    appliedFilters.is_palindrome = parsed
    results = results.filter((s) => s.properties.is_palindrome === parsed)
  }

  if (min_length !== undefined) {
    const n = Number(min_length)
    if (!Number.isInteger(n) || n < 0) return res.status(400).json({ error: 'min_length must be a non-negative integer' })
    appliedFilters.min_length = n
    results = results.filter((s) => s.properties.length >= n)
  }

  if (max_length !== undefined) {
    const n = Number(max_length)
    if (!Number.isInteger(n) || n < 0) return res.status(400).json({ error: 'max_length must be a non-negative integer' })
    appliedFilters.max_length = n
    results = results.filter((s) => s.properties.length <= n)
  }

  if (word_count !== undefined) {
    const n = Number(word_count)
    if (!Number.isInteger(n) || n < 0) return res.status(400).json({ error: 'word_count must be a non-negative integer' })
    appliedFilters.word_count = n
    results = results.filter((s) => s.properties.word_count === n)
  }

  if (contains_character !== undefined) {
    if (typeof contains_character !== 'string' || contains_character.length !== 1) {
      return res.status(400).json({ error: 'contains_character must be a single character' })
    }
    appliedFilters.contains_character = contains_character
    const chLower = contains_character.toLowerCase()
    results = results.filter((s) => s.value.toLowerCase().includes(chLower))
  }

  res.json({
    data: results,
    count: results.length,
    filters_applied: appliedFilters,
  })
})

// --- Natural language filter endpoint ---
function parseNaturalLanguage(query) {
  if (!query || typeof query !== 'string') return null
  const q = query.toLowerCase()

  const filters = {}

  // single word / single-word
  if (q.includes('single word') || q.includes('single-word') || q.match(/\bone-word\b/)) {
    filters.word_count = 1
  }

  // palindromic
  if (q.includes('palindrom') || q.includes('palindrome')) {
    filters.is_palindrome = true
  }

  // "strings longer than N" -> min_length = N + 1
  const longerMatch = q.match(/longer than\s+(\d+)/)
  if (longerMatch) {
    const n = parseInt(longerMatch[1], 10)
    if (!Number.isFinite(n)) return null
    filters.min_length = n + 1
  }

  // "strings containing the letter X" or "containing x"
  const containsLetterMatch = q.match(/(?:containing|contain|contains|that contain|that contains)(?: the letter)?\s+([a-z])/)
  if (containsLetterMatch) {
    filters.contains_character = containsLetterMatch[1]
  } else {
    // alternative "strings containing the letter z"
    const simpleContains = q.match(/containing\s+([a-z])/)
    if (simpleContains) filters.contains_character = simpleContains[1]
  }

  // heuristic: "first vowel" -> 'a'
  if (q.includes('first vowel')) {
    filters.contains_character = filters.contains_character || 'a'
  }

  // If nothing parsed, return null (unable)
  if (Object.keys(filters).length === 0) return null
  return filters
}

app.get('/strings/filter-by-natural-language', (req, res) => {
  const { query } = req.query
  const parsed = parseNaturalLanguage(query)
  if (!parsed) return res.status(400).json({ error: 'Unable to parse natural language query' })

  // Validate for conflicting filters (simple heuristic)
  if (parsed.min_length !== undefined && parsed.max_length !== undefined && parsed.min_length > parsed.max_length) {
    return res.status(422).json({ error: 'Conflicting filters (min_length > max_length)' })
  }

  // Reuse the /strings filter logic by applying parsed filters
  let results = db.data.strings.slice()

  if (parsed.is_palindrome !== undefined) results = results.filter((s) => s.properties.is_palindrome === parsed.is_palindrome)
  if (parsed.min_length !== undefined) results = results.filter((s) => s.properties.length >= parsed.min_length)
  if (parsed.max_length !== undefined) results = results.filter((s) => s.properties.length <= parsed.max_length)
  if (parsed.word_count !== undefined) results = results.filter((s) => s.properties.word_count === parsed.word_count)
  if (parsed.contains_character !== undefined) {
    const chLower = parsed.contains_character.toLowerCase()
    results = results.filter((s) => s.value.toLowerCase().includes(chLower))
  }

  res.json({
    data: results,
    count: results.length,
    interpreted_query: {
      original: query,
      parsed_filters: parsed,
    },
  })
})

// --- DELETE /strings/:value ---
app.delete('/strings/:value', async (req, res) => {
  const { value } = req.params
  const index = db.data.strings.findIndex((s) => s.value === value || s.id === value)
  if (index === -1) return res.status(404).json({ error: 'String not found' })
  db.data.strings.splice(index, 1)
  await db.write()
  res.status(204).end()
})

// --- Start server ---
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`))
