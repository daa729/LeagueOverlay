// frontend/src/App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

// Define or import the LcuCredentials type if needed in frontend
// Note: We might not need the full credentials in the frontend anymore
// interface LcuCredentials {
//     port?: string; // Maybe keep port if needed later
// }

const BACKEND_URL = 'http://localhost:3001';

interface LcuStatus {
    connected: boolean;
    // credentials?: LcuCredentials | null; // We only care about 'connected' now
    error?: string;
    loading: boolean;
}

// Example type for Summoner data (adjust based on actual LCU response)
interface SummonerInfo {
    gameName: string;
    summonerId: number;
    summonerLevel: number;
    profileIconId: number;
    // Add other fields as needed
}


function App() {
    const [lcuStatus, setLcuStatus] = useState<LcuStatus>({
        connected: false,
        loading: true,
        error: undefined
    });
    const [summonerInfo, setSummonerInfo] = useState<SummonerInfo | null>(null); // State for summoner data
    const [summonerLoading, setSummonerLoading] = useState<boolean>(false);
    const [summonerError, setSummonerError] = useState<string | null>(null);

    // --- Fetch LCU Connection Status ---
    const fetchLcuStatus = useCallback(async () => {
        setLcuStatus(prev => ({ ...prev, loading: true, error: undefined }));
        setSummonerInfo(null); // Reset summoner info on status check
        setSummonerError(null);
        console.log("Frontend: Fetching LCU status from backend...");
        try {
            const response = await fetch(`${BACKEND_URL}/api/lcu-credentials`); // Calls the first backend route
            // Basic error check (network or > 500)
            if (!response.ok && response.status >= 500) {
                 throw new Error(`Backend server error: ${response.statusText} (${response.status})`);
            }
            const data = await response.json();
             // Check for specific backend/LCU errors returned in JSON
            if (!response.ok || data.error) {
                 throw new Error(data.error || `Backend error: ${response.statusText} (${response.status})`);
            }

            console.log("Frontend: Received LCU status:", data);
            setLcuStatus({
                connected: data.connected,
                loading: false,
                error: undefined // Clear previous errors on success
            });
            // --- Trigger fetch summoner info if connected ---
            // Handled by the useEffect hook below based on `data.connected`
            // ---
        } catch (error: any) {
            console.error('Frontend: Error fetching LCU status:', error);
            setLcuStatus({
                connected: false,
                loading: false,
                error: `Failed to fetch LCU status: ${error.message}`
            });
        }
    }, []);

    // --- Fetch Summoner Info via Backend Proxy ---
    const fetchSummonerInfo = useCallback(async () => {
        // No need to check connection here, useEffect handles that
        console.log("Frontend: Fetching summoner info via backend proxy...");
        setSummonerLoading(true);
        setSummonerError(null);
        setSummonerInfo(null);

        try {
            // Calls the NEW backend proxy route
            const response = await fetch(`${BACKEND_URL}/api/lcu/summoner/current`);

            // More robust error check: network failure OR non-2xx status from backend/LCU
            if (!response.ok) {
                 let errorMsg = `Backend proxy error: ${response.statusText} (${response.status})`;
                 try {
                    // Try to get more specific error from backend JSON response
                    const errorData = await response.json();
                    errorMsg = errorData?.error || errorMsg;
                    if(errorData?.lcuData?.message) errorMsg += ` - LCU: ${errorData.lcuData.message}`;
                 } catch (e) { /* Ignore if response body isn't JSON */ }
                 throw new Error(errorMsg);
            }

            const data: SummonerInfo = await response.json();
            console.log("Frontend: Received summoner info:", data);
            setSummonerInfo(data);

        } catch (error: any) {
            console.error('Frontend: Error fetching summoner info:', error);
            setSummonerError(`Failed to fetch summoner info: ${error.message}`);
            setSummonerInfo(null); // Clear info on error
        } finally {
            setSummonerLoading(false);
        }
    }, []); // No dependencies needed if it doesn't rely on external state vars directly

    // --- Effects ---
    // Fetch initial status on mount
    useEffect(() => {
        fetchLcuStatus();
    }, [fetchLcuStatus]);

    // Fetch summoner info *only when* LCU connects
    useEffect(() => {
        if (lcuStatus.connected && !lcuStatus.loading) { // Check loading to prevent double fetch on initial load
            fetchSummonerInfo();
        } else if (!lcuStatus.connected) {
            // Clear summoner info if disconnected
            setSummonerInfo(null);
            setSummonerError(null);
            setSummonerLoading(false);
        }
        // Intentionally only depending on connected and loading status
        // fetchSummonerInfo is stable due to useCallback with no deps
    }, [lcuStatus.connected, lcuStatus.loading, fetchSummonerInfo]);


    const { connected, loading: statusLoading, error: statusError } = lcuStatus;

    return (
        <div className="App">
            <h1>LoL Overlay (Web) - Phase 4</h1>
            <p>Fetch LCU Data via Backend Proxy</p>

            {/* LCU Connection Status Section */}
            <div style={{ margin: '20px 0', border: '1px solid #ccc', padding: '15px' }}>
                <button onClick={fetchLcuStatus} disabled={statusLoading}>
                    {statusLoading ? "Checking Status..." : "Refresh LCU Status"}
                </button>
                <p style={{ fontWeight: 'bold', color: statusError ? 'red' : (connected ? 'green' : 'orange') }}>
                    LCU Connection Status: {statusLoading ? "Loading..." : (statusError ? "Error" : (connected ? "Connected" : "Disconnected"))}
                </p>
                {statusError && <p style={{ color: 'red' }}>Status Error: {statusError}</p>}
                 {/* We don't display raw credentials from the backend anymore */}
            </div>

            {/* Summoner Info Section */}
            {/* Only show if trying to load OR successfully loaded OR error occurred */}
            {(connected || summonerLoading || summonerError || summonerInfo) && !statusLoading && (
                 <div style={{ margin: '20px 0', border: '1px solid #1a8cff', padding: '15px' }}>
                     <h2>Summoner Info</h2>
                     {/* Show button only if connected, allow refresh */}
                     {connected && (
                        <button onClick={fetchSummonerInfo} disabled={summonerLoading || statusLoading}>
                             {summonerLoading ? "Fetching..." : "Refresh Summoner Info"}
                        </button>
                     )}
                     {summonerLoading && <p>Loading summoner data...</p>}
                     {summonerError && <p style={{ color: 'red' }}>Summoner Error: {summonerError}</p>}
                     {summonerInfo && !summonerLoading && ( // Ensure loading is false before showing info
                         <div>
                             <p>Display Name: <strong>{summonerInfo.gameName}</strong></p>
                             <p>Level: {summonerInfo.summonerLevel}</p>
                             <p>Summoner ID: {summonerInfo.summonerId}</p>
                             {/* Example: Display profile icon using communitydragon */}
                             <p>Icon: <img
                                src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${summonerInfo.profileIconId}.jpg`}
                                alt="Profile Icon"
                                style={{ width: '50px', height: '50px', verticalAlign: 'middle', marginLeft: '10px', border: '1px solid #ccc' }}
                                onError={(e) => (e.currentTarget.style.display = 'none')} // Hide if image fails to load
                              /></p>
                         </div>
                     )}
                      {/* Show message if connection attempt failed before summoner info could be fetched */}
                     {!connected && summonerError && <p style={{color: 'grey'}}>Could not fetch summoner data because LCU is disconnected.</p>}
                 </div>
            )}
             {!connected && !statusLoading && !summonerError && ( // Show initial prompt if disconnected and no errors/loading ongoing
                <p style={{color: 'grey', marginTop: '20px'}}>Connect to the League Client to fetch summoner data.</p>
            )}

        </div>
    );
}
export default App;