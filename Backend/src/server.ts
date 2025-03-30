// backend/src/server.ts
import express, { Request, Response, NextFunction } from 'express'; // Import Request, Response, NextFunction
import cors from 'cors';
import https from 'https';
import axios from 'axios';
import { readCredentials, LcuCredentials } from './lcuReader';

const app = express();
const PORT = process.env.PORT || 3001;

// --- CORS Configuration ---
const corsOptions = {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// --- HTTPS Agent for LCU API Calls ---
const httpsAgent = new https.Agent({
    rejectUnauthorized: false, // Allow self-signed certificates
});

// --- API Routes ---

// Test route (keep)
app.get('/api/hello', (req: Request, res: Response) => {
    res.json({ message: '👋 Hello from the Backend!' });
});

// --- LCU Credentials Endpoint (Keep just ONE version) ---
// Used by frontend primarily to check if LCU is connected.
app.get('/api/lcu-credentials', async (req: Request, res: Response, next: NextFunction) => { // Add next for error handling
    console.log("Backend: Received request on /api/lcu-credentials");
    try {
        const credentials = await readCredentials();
        if (credentials) {
            // Only send minimal info needed by frontend (if any) besides connection status
            res.json({ connected: true /* , credentials: { port: credentials.port } */ }); // Sending only 'connected' is often enough
        } else {
            res.json({ connected: false, credentials: null });
        }
    } catch (error: any) {
        // Pass errors to the Express error handler
        console.error("Backend: Error in /api/lcu-credentials:", error);
        // Let a dedicated error handler middleware deal with this
        next(error); // Pass error to default handler or custom one if defined
    }
});

// --- NEW: Proxy Endpoint for Current Summoner ---
// Fetches data FROM LCU API via the backend
app.get('/api/lcu/summoner/current', async (req: Request, res: Response, next: NextFunction) => {
    console.log("Backend: Received proxy request for /lcu/summoner/current");
    try {
        const credentials = await readCredentials();
        if (!credentials) {
            res.status(404).json({ error: 'LCU not connected or credentials not found.' });
            return;
        }

        const { baseUrl, authHeader } = credentials;
        const lcuUrl = `${baseUrl}/lol-summoner/v1/current-summoner`;

        console.log(`Backend: Proxying request to LCU: ${lcuUrl}`);

        const response = await axios.get(lcuUrl, {
            httpsAgent: httpsAgent,
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
            }
        });

        // --- ADD THIS LOG ---
        console.log("Backend: Received summoner data from LCU (Status: %s):", response.status);
        console.log("--- LCU Data Start ---");
        console.log(JSON.stringify(response.data, null, 2)); // Log the actual data structure
        console.log("--- LCU Data End ---");
        // --- END LOG ---

        res.json(response.data); // Send LCU response data back to frontend

    } catch (error: any) {
        // ... (keep existing catch block) ...
        console.error("Backend: Error proxying to LCU:", error.response?.status, error.response?.data || error.message);
        if (axios.isAxiosError(error) && error.response) {
             res.status(error.response.status).json({
                error: 'LCU API Error',
                lcuStatus: error.response.status,
                lcuData: error.response.data
             });
             return;
        }
        next(error);
    }
});


// --- Basic Error Handling Middleware (Optional but Recommended) ---
// Catches errors passed via next(error)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Backend: Unhandled Error:", err.message || err);
    // Avoid sending detailed stack traces in production
    res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: err.message || 'An unexpected error occurred'
    });
});


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Backend server listening on http://localhost:${PORT}`);
});