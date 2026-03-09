const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory store
let risultati = [];
let clients = []; // SSE clients

// ——— SSE endpoint ———
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Send current state immediately
  res.write(`data: ${JSON.stringify(risultati)}\n\n`);

  clients.push(res);

  req.on('close', () => {
    clients = clients.filter(c => c !== res);
  });
});

// Broadcast to all SSE clients
function broadcast() {
  const payload = `data: ${JSON.stringify(risultati)}\n\n`;
  clients.forEach(c => c.write(payload));
}

// ——— API ———
app.get('/api/risultati', (req, res) => {
  res.json(risultati);
});

app.post('/api/risultati', (req, res) => {
  const { categoria, punteggio } = req.body;
  if (!categoria || punteggio === undefined) {
    return res.status(400).json({ error: 'Dati mancanti' });
  }
  const entry = {
    id: Date.now(),
    categoria,
    punteggio: parseInt(punteggio),
    ts: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };
  risultati.unshift(entry);
  broadcast();
  res.json({ ok: true, entry });
});

app.delete('/api/risultati', (req, res) => {
  risultati = [];
  broadcast();
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
