// backend/src/lcuReader.ts
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface LcuCredentials {
    port: string;
    token: string;
    baseUrl: string;
    authHeader: string;
}

// --- Lockfile Path Detection ---
function getLockfilePath(): string | null {
    const platform = os.platform();
    if (platform === 'win32') {
        return path.join('C:','Games','Riot Games', 'League of Legends', 'lockfile');
    } else if (platform === 'darwin') { // macOS
        return '/Applications/League of Legends.app/Contents/LoL/lockfile';
    }
    console.warn(`LCU Reader: Unsupported platform: ${platform}`);
    return null;
}

// --- Read and Parse Lockfile ---
export async function readCredentials(): Promise<LcuCredentials | null> {
    const lockfilePath = getLockfilePath();
    if (!lockfilePath) {
        console.error("LCU Reader: Lockfile path unknown.");
        return null;
    }

    try {
        const content = await fs.readFile(lockfilePath, 'utf8');
        const parts = content.split(':');
        if (parts.length < 4) throw new Error('Invalid lockfile format.');

        const port = parts[2];
        const token = parts[3];
        if (!port || !token) throw new Error('Could not parse port or token.');

        const baseUrl = `https://127.0.0.1:${port}`;
        // Use Buffer for robust Base64 encoding in Node.js
        const authHeader = 'Basic ' + Buffer.from(`riot:${token}`).toString('base64');

        console.log(`LCU Reader: Credentials Parsed (Port: ${port})`);
        return { port, token, baseUrl, authHeader };
    } catch (error: any) {
        if (error.code === 'ENOENT') {
             // console.log("LCU Reader: Lockfile not found (client likely closed).");
        } else {
            console.error(`LCU Reader: Error reading/parsing lockfile (${lockfilePath}): ${error.message}`);
        }
        return null; // Return null on any error
    }
}