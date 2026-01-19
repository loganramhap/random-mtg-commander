import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'MTG Commander Picker is running!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🎯 MTG Commander Picker running on http://localhost:${PORT}`);
    console.log(`📱 Open your browser and start finding commanders!`);
});

export default app;