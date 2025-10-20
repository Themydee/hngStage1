# 🧠 String Analyzer API

A simple yet powerful Node.js + Express REST API that takes any input string and breaks it down into detailed metrics — including length, palindrome check, word count, unique characters, and SHA-256 hash generation.  
Built with **pnpm**, **Express**, and **LowDB** for persistent storage.

---

## 🚀 Features

- Analyze any string and get:
  - String length
  - Word count
  - Palindrome detection
  - Unique character count
  - Character frequency map
  - SHA-256 hash (used as unique ID)
- Save analyzed strings in a lightweight local database (`db.json`)
- Retrieve, filter, and delete analyzed strings
- RESTful endpoints with JSON responses

---

## 🧩 Tech Stack

- **Node.js**
- **Express.js**
- **LowDB**
- **pnpm**
- **Nodemon** (for development)

---

## ⚙️ Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/string-analyzer-api.git
   cd string-analyzer-api
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm run dev
   ```

4. The API will be live at:
   ```bash
   http://localhost:3000
   ```

---

## 🧪 API Endpoints

### ➕ Analyze a String
**POST** `/strings`  
Analyze and store a string.

**Request Body:**
```json
{
  "text": "Temidayo"
}
```

**Response Example:**
```json
{
  "id": "b894d9e661b90f7c83bbef556087ed2e60ce054e3d5e008a6c76364aa7a15c36",
  "value": "Temidayo",
  "properties": {
    "length": 8,
    "is_palindrome": false,
    "unique_characters": 8,
    "word_count": 1,
    "sha256_hash": "b894d9e661b90f7c83bbef556087ed2e60ce054e3d5e008a6c76364aa7a15c36",
    "character_frequency_map": {
      "T": 1,
      "e": 1,
      "m": 1,
      "i": 1,
      "d": 1,
      "a": 1,
      "y": 1,
      "o": 1
    }
  },
  "created_at": "2025-10-20T15:15:51.220Z"
}
```

---

### 📜 Get All Strings
**GET** `/strings`

Returns all analyzed strings.

---

### 🔍 Get a Specific String
**GET** `/strings/:text`

Fetch a single analyzed string by its text or hash.

---

### 🗑️ Delete a String
**DELETE** `/strings/:text`

Removes a specific analyzed string from the database.

---

## 🧰 Example (Postman)

1. Open **Postman**
2. Set method to **POST**
3. Enter URL: `http://localhost:3000/strings`
4. Go to **Body → raw → JSON**
5. Enter:
   ```json
   { "text": "Temidayo" }
   ```
6. Send request ✅

---

## 🧑‍💻 Developer

**Author:** Temidayo Akanbi-Bello  
**Stack:** MERN | Node.js | React | Express | TailwindCSS  
**GitHub:** [@Themydee](https://github.com/Themydee)

---

## 🪄 License

This project is open-source and available under the [MIT License](LICENSE).