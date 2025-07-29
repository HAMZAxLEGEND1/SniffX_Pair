import express from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// POST endpoint
app.post('/pair', (req, res) => {
  const { number } = req.body;
  if (!number) return res.status(400).json({ error: 'Number is required.' });

  const pairCode = requestPairCode(number);
  res.json({ pairCode });
});

// GET endpoint
app.get('/pair', (req, res) => {
  const number = req.query.number;
  if (!number) return res.status(400).json({ error: 'Number is required as query param.' });

  const pairCode = requestPairCode(number);
  res.json({ pairCode });
});

// Pair code generation logic
function requestPairCode(number) {
  const cleaned = number.replace(/[^0-9]/g, ''); // optional cleanup
  return 'PAIR-' + cleaned.slice(-4) + '-' + Math.floor(Math.random() * 10000);
}

// Default route
app.get('/', (req, res) => {
  res.send('✅ SniffX API Running. Use POST /pair with JSON { "number": "0300..." } or GET /pair?number=...');
});

app.listen(port, () => {
  console.log(`✅ SniffX API running on port ${port}`);
});
