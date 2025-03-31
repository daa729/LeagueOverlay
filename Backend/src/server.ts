// backend/src/server.ts
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import https from 'https';
import http from 'http'; // Import http
import axios from 'axios';
import WebSocket, { WebSocketServer } from 'ws'; // Import WebSocket classes
import { readCredentials, LcuCredentials } from './lcuReader';

const app = express();
const PORT = process.env.PORT || 3001;
// --- Config ---
const LCU_CONNECTION_CHECK_INTERVAL = 5000; // Check every 5 seconds

// --- Create HTTP Server ---
const server = http.createServer(app);

// --- State ---
let lcuSocket: WebSocket | null = null; // Reference to the connection *to* LCU
let lcuCreds: LcuCredentials | null = null; // Store current credentials
let isConnectingToLcu = false; // Flag to prevent simultaneous connection attempts
let lcuCheckInterval: NodeJS.Timeout | null = null; // Timer handle

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

// --- WebSocket Server Setup ---
const wss = new WebSocketServer({ server }); // Attach WebSocket server to the HTTP server
console.log("Backend: WebSocket server created.");

// --- Helper Functions ---
/** Broadcasts a message object to all connected frontend WebSocket clients. */
function broadcastToFrontend(message: object) {
    const messageString = JSON.stringify(message);
    // console.log("Backend: Broadcasting to frontend:", messageString); // Verbose log
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(messageString);
            } catch (error: any) {
                console.error("Backend: Error sending message to a frontend client:", error.message);
            }
        }
    });
}

// --- LCU WebSocket Connection Logic ---
/** Attempts to establish and maintain a WebSocket connection to the LCU API. */
async function connectToLcuSocket() {
    // Prevent multiple concurrent connection attempts
    if (isConnectingToLcu) {
        // console.log('LCU Connect Fn: Connection attempt already in progress.');
        return;
    }
    // If already connected and socket is open, do nothing
    if (lcuSocket && lcuSocket.readyState === WebSocket.OPEN) {
        // console.log('LCU Connect Fn: Already connected.');
        return;
    }

    isConnectingToLcu = true;
    console.log("LCU Connect Fn: Attempting connection...");

    try {
        const credentials = await readCredentials();
        if (!credentials) {
            // console.log("LCU Connect Fn: Credentials not found.");
             // Only broadcast disconnect if we were previously connected or thought we were
            if (lcuCreds || lcuSocket) {
                console.log("LCU Connect Fn: Credentials lost or not found, broadcasting disconnect.");
                broadcastToFrontend({ type: 'LcuDisconnect' });
            }
            lcuCreds = null;
            if (lcuSocket && lcuSocket.readyState !== WebSocket.CLOSED) lcuSocket.close();
            lcuSocket = null;
            return; // Exit, wait for next interval check
        }

        // Credentials found. Check if they changed or if socket is dead.
        const needsNewSocket = !lcuSocket || lcuSocket.readyState === WebSocket.CLOSED || lcuSocket.readyState === WebSocket.CLOSING ||
                              (lcuCreds && (lcuCreds.port !== credentials.port || lcuCreds.token !== credentials.token));

        if (!needsNewSocket) {
            console.log("LCU Connect Fn: Socket exists and credentials unchanged.");
            isConnectingToLcu = false; // No action needed, reset flag
            return;
        }

        // Close old socket if it exists and we need a new one
        if (lcuSocket && lcuSocket.readyState !== WebSocket.CLOSED) {
            console.log("LCU Connect Fn: Credentials changed or socket closed, closing old socket.");
            lcuSocket.close();
        }

        lcuCreds = credentials; // Store current credentials
        const { port, token } = lcuCreds;
        const wsUrl = `wss://127.0.0.1:${port}`;
        const authHeader = 'Basic ' + Buffer.from(`riot:${token}`).toString('base64');

        console.log(`LCU Connect Fn: Creating new LCU WebSocket connection (Port: ${port})...`);
        const newLcuSocket = new WebSocket(wsUrl, {
            headers: { Authorization: authHeader },
            rejectUnauthorized: false // Bypass self-signed certificate
        });

        // Assign to global scope *before* adding listeners
        lcuSocket = newLcuSocket;

        // --- LCU WebSocket Event Handlers ---
        lcuSocket.on('open', () => {
            console.log("LCU Connect Fn: WebSocket to LCU OPENED.");
            isConnectingToLcu = false; // Connection successful, reset flag

            // Subscribe to LCU events
            lcuSocket?.send(JSON.stringify([5, "OnJsonApiEvent_lol-gameflow_v1_gameflow-phase"]));
            lcuSocket?.send(JSON.stringify([5, "OnJsonApiEvent_lol-champ-select_v1_session"]));
            console.log("LCU Connect Fn: Subscribed to Gameflow and ChampSelect events.");

            // Notify frontend clients
            broadcastToFrontend({ type: 'LcuConnect', data: { port: lcuCreds?.port } });
        });

        lcuSocket.on('message', (data) => {
            const rawString = data.toString();
            try {
                if (!rawString || rawString.trim() === '') return; // Ignore empty messages
                const message = JSON.parse(rawString);

                // Check for LCU event format [opcode, eventName, payload]
                if (Array.isArray(message) && message.length >= 3 && message[0] === 8) { // Opcode 8 for events
                    const eventData = message[2]; // Payload = { data, eventType, uri }
                    if (eventData && eventData.uri) {
                        // Log specific events for debugging if needed
                        // if (eventData.uri.includes('gameflow')) console.log(`LCU Msg: Gameflow: ${eventData.data}`);
                        // if (eventData.uri.includes('champ-select')) console.log(`LCU Msg: ChampSelect: ${eventData.eventType}`);

                        // Forward the entire event payload
                        broadcastToFrontend({ type: 'LcuEvent', data: eventData });
                    }
                } else {
                     console.log('LCU Connect Fn: Received non-event message format:', message);
                }
            } catch (e: any) {
                console.error('LCU Connect Fn: Error parsing LCU message:', e.message);
                console.error('LCU Connect Fn: Failed raw string:', rawString);
            }
        });

        lcuSocket.on('close', (code, reason) => {
            console.log(`LCU Connect Fn: WebSocket to LCU CLOSED. Code: ${code}, Reason: ${reason.toString()}`);
             // Check if this socket is still the active one before broadcasting disconnect
             if (lcuSocket === newLcuSocket) {
                if (lcuCreds) { // Only broadcast if we thought we were connected
                    broadcastToFrontend({ type: 'LcuDisconnect' });
                }
                lcuSocket = null;
                lcuCreds = null;
             }
             isConnectingToLcu = false; // Allow connection checks again
        });

        lcuSocket.on('error', (error) => {
            console.error('LCU Connect Fn: WebSocket to LCU ERROR:', error.message);
             // Check if this socket is still the active one
             if (lcuSocket === newLcuSocket) {
                 if (lcuCreds) { // Only broadcast if we thought we were connected
                    broadcastToFrontend({ type: 'LcuDisconnect', error: error.message });
                 }
                 // Ensure state reset, close might not fire reliably after error
                 if (lcuSocket && lcuSocket.readyState !== WebSocket.CLOSED) {
                    lcuSocket.close();
                 }
                 lcuSocket = null;
                 lcuCreds = null;
             }
             isConnectingToLcu = false; // Allow connection checks again
        });

    } catch (error: any) {
         // Catch errors during credential reading or initial WebSocket constructor call
        console.error("LCU Connect Fn: Critial error during connection attempt:", error.message);
        broadcastToFrontend({ type: 'LcuDisconnect', error: `Backend LCU connection failed: ${error.message}` });
        lcuCreds = null;
        if (lcuSocket && lcuSocket.readyState !== WebSocket.CLOSED) lcuSocket.close();
        lcuSocket = null;
        isConnectingToLcu = false; // Reset flag after failure
    }
    // Note: No 'finally' needed here as error/close handlers reset the flag
}

// --- Backend WebSocket Connection Handler (Frontend <-> Backend) ---
wss.on('connection', (ws) => {
    console.log('Backend WS: Frontend client connected.');

    // Immediately inform the new client about the *current* LCU status
    if (lcuSocket && lcuSocket.readyState === WebSocket.OPEN && lcuCreds) {
        console.log("Backend WS: LCU already connected, notifying new client.");
        ws.send(JSON.stringify({ type: 'LcuConnect', data: { port: lcuCreds.port } }));
    } else {
         // If not connected, tell the client we are disconnected
         // Optional: Could send 'LcuConnecting' if isConnectingToLcu is true
        console.log("Backend WS: LCU not connected, notifying new client.");
        ws.send(JSON.stringify({ type: 'LcuDisconnect' }));
    }

    // Handle messages from this specific frontend client (optional)
    ws.on('message', (message) => {
        console.log('Backend WS: Received message from frontend client:', message.toString());
        // Example: Handle requests from frontend if needed in the future
        // try {
        //     const parsedMessage = JSON.parse(message.toString());
        //     if (parsedMessage.action === 'getStatus') {
        //         // Send back current status
        //     }
        // } catch(e) { console.error("Error parsing frontend message"); }
    });

    ws.on('close', (code, reason) => {
        console.log(`Backend WS: Frontend client disconnected. Code: ${code}, Reason: ${reason.toString()}`);
    });

    ws.on('error', (error) => {
        console.error('Backend WS: Frontend client error:', error.message);
    });
});

// --- Periodic LCU Connection Check ---
/** Starts an interval timer to periodically check and attempt LCU connection if disconnected. */
function startLcuCheckInterval() {
    console.log(`Backend: Starting LCU connection check interval (${LCU_CONNECTION_CHECK_INTERVAL}ms)`);
    if (lcuCheckInterval) clearInterval(lcuCheckInterval); // Clear existing interval if any

    lcuCheckInterval = setInterval(() => {
        // Check if LCU socket is missing, closed, or closing
        if (!lcuSocket || lcuSocket.readyState === WebSocket.CLOSED || lcuSocket.readyState === WebSocket.CLOSING) {
             // Attempt connection only if not already trying
            if (!isConnectingToLcu) {
                // console.log("Backend Interval: LCU disconnected, attempting connection...");
                connectToLcuSocket();
            }
        }
    }, LCU_CONNECTION_CHECK_INTERVAL);
}

// --- HTTP API Routes ---
app.get('/api/hello', (req: Request, res: Response) => {
    res.json({ message: '👋 Hello from the Backend!' });
});

// Provides a basic HTTP check for LCU connection status
app.get('/api/lcu-credentials', (req: Request, res: Response, next: NextFunction) => {
    try {
        // Check based on the WebSocket state managed by the interval/handlers
        const isConnected = !!(lcuSocket && lcuSocket.readyState === WebSocket.OPEN && lcuCreds);
        res.json({ connected: isConnected });
    } catch (error) {
        console.error("API Error (/api/lcu-credentials):", error);
        next(error);
    }
});

// Proxy endpoint for fetching current summoner info
app.get('/api/lcu/summoner/current', async (req: Request, res: Response, next: NextFunction) => {
    console.log("Backend: Received proxy request for /lcu/summoner/current");
    try {
        // Prioritize cached credentials from active WebSocket connection
        const credentials = lcuCreds || await readCredentials();
        if (!credentials) {
            res.status(404).json({ error: 'LCU not connected or credentials not found.' });
            return;
        }
        // Update cache if we just read them successfully
        if (!lcuCreds) lcuCreds = credentials;

        const { baseUrl, authHeader } = credentials;
        const lcuUrl = `${baseUrl}/lol-summoner/v1/current-summoner`;

        console.log(`Backend: Proxying summoner request to LCU: ${lcuUrl}`);
        const response = await axios.get(lcuUrl, {
            httpsAgent: httpsAgent,
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
            }
        });
        console.log("Backend: Received summoner data from LCU (Status: %s)", response.status);
        res.json(response.data);
    } catch (error: any) {
        console.error("Backend: Error proxying to LCU for summoner:", error.response?.status, error.message);
        // Clear cached creds if the request fails (they might be stale)
        if (lcuCreds && error.response?.status === 401 || error.response?.status === 403) {
             console.warn("Backend: Clearing cached LCU creds due to auth error during proxy.");
             lcuCreds = null;
             if(lcuSocket) lcuSocket.close(); // Close socket if creds are bad
        }

        if (axios.isAxiosError(error) && error.response) {
             res.status(error.response.status).json({
                error: 'LCU API Error',
                lcuStatus: error.response.status,
                lcuData: error.response.data
             });
             return;
        }
        next(error); // Pass other errors to generic handler
    }
});

// --- Basic Error Handling Middleware ---
// Catches errors passed via next(error)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Backend: Unhandled Error Middleware:", err.stack || err.message || err);
    if (res.headersSent) {
        return next(err); // Delegate if headers already sent
    }
    res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: err.message || 'An unexpected error occurred'
    });
});

// --- Start Server & LCU Check Interval ---
server.listen(PORT, () => {
    console.log(`Backend server listening on http://localhost:${PORT}`);
    // Start the periodic check *after* the server is listening
    startLcuCheckInterval();
    // Optional: Trigger an immediate check on startup
    // connectToLcuSocket();
});