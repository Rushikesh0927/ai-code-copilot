// TEST VECTOR: XSS, CSRF, and Auth Vulnerabilities
// Ground Truth: 4 CRITICAL bugs, 2 HIGH bugs

const express = require('express');
const app = express();
app.use(express.json());

// BUG-1: Reflected XSS via res.send (CRITICAL)
app.get('/search', (req, res) => {
  const query = req.query.q;
  res.send(`<h1>Results for: ${query}</h1>`);
});

// BUG-2: Stored XSS via innerHTML (CRITICAL)
app.get('/profile', (req, res) => {
  const bio = getUserBio(req.params.id); // from DB
  res.send(`<div>${bio}</div>`); // unescaped user content
});

// BUG-3: No CSRF protection (HIGH)
app.post('/change-password', (req, res) => {
  const { oldPassword, newPassword } = req.body;
  // No CSRF token validation
  updatePassword(req.session.userId, oldPassword, newPassword);
  res.json({ success: true });
});

// BUG-4: JWT secret too weak (CRITICAL)
const jwt = require('jsonwebtoken');
const SECRET = "password123";

app.post('/login', (req, res) => {
  const user = authenticate(req.body.email, req.body.password);
  if (user) {
    // BUG-5: Token never expires (HIGH)
    const token = jwt.sign({ userId: user.id, role: user.role }, SECRET);
    res.json({ token });
  }
});

// BUG-6: Path traversal (CRITICAL)
const fs = require('fs');
const path = require('path');

app.get('/file', (req, res) => {
  const filename = req.query.name;
  const filePath = path.join('/uploads', filename);
  // No validation: filename could be "../../../etc/passwd"
  res.sendFile(filePath);
});

app.listen(3000);
