// backend/src/server.ts
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001; // Backend runs on a different port

// --- CORS Configuration ---
// Allow requests from the Vite frontend development server
// IMPORTANT: Adjust origin in production if needed!
const corsOptions = {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], // Vite's default port
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions));

// --- Basic Test Route ---
app.get('/api/hello', (req, res) => {
    console.log("Backend: Received request on /api/hello");
    res.json({ message: '👋 Hello from the Backend!' });
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Backend server listening on http://localhost:${PORT}`);
});