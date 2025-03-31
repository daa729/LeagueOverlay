// frontend/src/App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { useLcuWebSocket } from './hooks/useLcuWebSocket';
import { SummonerInfo } from './types/lcu';
import { ConnectionStatus } from './components/ConnectionStatus';
import { SummonerDisplay } from './components/SummonerDisplay';
import { GamePhaseDisplay } from './components/GamePhaseDisplay';
import { ChampSelectDisplay } from './components/ChampSelectDisplay/ChampSelectDisplay';

const BACKEND_URL = 'http://localhost:3001';

function App() {
    // --- State for Summoner Info ---
    // Keep state directly related to HTTP fetching here
    const [summonerInfo, setSummonerInfo] = useState<SummonerInfo | null>(null);
    const [summonerLoading, setSummonerLoading] = useState<boolean>(false);
    const [summonerError, setSummonerError] = useState<string | null>(null);

    // --- Fetch Logic ---
    // Memoize fetchSummonerInfo with minimal dependencies
    const fetchSummonerInfo = useCallback(async () => {
        // No need to check isConnected here; the calling effect does that.
        console.log("App: fetchSummonerInfo started.");
        setSummonerLoading(true);
        setSummonerError(null); // Clear previous error on new attempt
        try {
            console.log("App: fetchSummonerInfo making fetch call...");
            const response = await fetch(`${BACKEND_URL}/api/lcu/summoner/current`);
            console.log("App: fetchSummonerInfo response status:", response.status);
            if (!response.ok) {
                let errorMsg = `Summoner fetch error: ${response.statusText} (${response.status})`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData?.error || errorMsg;
                    if (errorData?.lcuData?.message) errorMsg += ` - LCU: ${errorData.lcuData.message}`;
                } catch (e) { /* Ignore */ }
                throw new Error(errorMsg);
            }
            const data = await response.json();
            console.log("App: fetchSummonerInfo received data, setting state...");
            setSummonerInfo(data as SummonerInfo);
            setSummonerError(null); // Clear error on success
            console.log("App: fetchSummonerInfo state set successfully.");
        } catch (error: any) {
            console.error('App: Error fetching summoner info:', error);
            setSummonerError(`Failed to fetch summoner info: ${error.message}`);
            setSummonerInfo(null); // Clear info on error
        } finally {
            setSummonerLoading(false);
            console.log("App: fetchSummonerInfo finished (finally block).");
        }
    }, []); // Empty dependency array: Function logic doesn't depend on props/state

    // --- LCU Hook ---
    // Pass stable callbacks to the hook
    const handleLcuConnect = useCallback(() => {
        console.log("App: Hook reported LCU Connect.");
        // We'll use useEffect based on isConnectedToLcu to trigger fetch
    }, []); // Stable callback

    const handleLcuDisconnect = useCallback(() => {
        console.log("App: Hook reported LCU Disconnect.");
        // Clear summoner info when hook reports disconnect
        setSummonerInfo(null);
        setSummonerError(null);
        setSummonerLoading(false);
    }, []); // Stable callback

    const { lcuStatus, currentGameflowPhase, champSelectSession, connectWebSocket, isConnectedToLcu } = useLcuWebSocket(
        handleLcuConnect,
        handleLcuDisconnect
    );

    // --- Effect to Fetch Summoner Info based on Connection Status ---
    useEffect(() => {
        console.log(`App: useEffect[isConnectedToLcu] fired. isConnectedToLcu: ${isConnectedToLcu}`);
        // Trigger fetch only when LCU connects *and* we don't have info/aren't loading/errored
        if (isConnectedToLcu && !summonerInfo && !summonerLoading && !summonerError) {
            console.log("App: useEffect[isConnectedToLcu] triggering fetchSummonerInfo.");
            fetchSummonerInfo();
        }
        // No explicit else needed here to clear data, handleLcuDisconnect callback does that.
    }, [isConnectedToLcu, fetchSummonerInfo, summonerInfo, summonerLoading, summonerError]); // Dependencies


    // Manual refresh handler
    const handleRefreshSummoner = useCallback(() => {
        if (isConnectedToLcu) {
             fetchSummonerInfo();
        } else {
            setSummonerError("Cannot refresh, LCU is not connected.");
             console.log("App: Manual refresh blocked, LCU disconnected.");
        }
    }, [isConnectedToLcu, fetchSummonerInfo]);

    // --- Render ---
    // (JSX Rendering part remains the same as the previous full App.tsx example)
    return (
        <div className="App">
            <h1>LoL Overlay (Web) - Refactored</h1>
            <p>Displays connection status, game phase, and champ select.</p>

            <ConnectionStatus
                lcuStatus={lcuStatus}
                onReconnect={connectWebSocket}
            />

            {/* Conditionally Render Components based on Game Phase */}
            {isConnectedToLcu && currentGameflowPhase === "ChampSelect" && (
                 <ChampSelectDisplay session={champSelectSession} />
             )}

            {/* Show other components only if connected AND not in ChampSelect */}
            {isConnectedToLcu && currentGameflowPhase !== "ChampSelect" && (
                 <>
                    <GamePhaseDisplay phase={currentGameflowPhase} />
                    <SummonerDisplay
                        summonerInfo={summonerInfo}
                        isLoading={summonerLoading}
                        error={summonerError}
                        onRefresh={handleRefreshSummoner}
                        isConnected={isConnectedToLcu}
                    />
                </>
            )}

            {/* Fallback/Waiting messages */}
            {!isConnectedToLcu && !lcuStatus.loading && !lcuStatus.error && (
                <p style={{ color: 'grey', marginTop: '20px' }}>Waiting for League Client connection...</p>
            )}
             {!isConnectedToLcu && !lcuStatus.loading && lcuStatus.error && (
                  <p style={{ color: 'grey', marginTop: '20px' }}>Could not connect. Check error message and ensure LoL client is running.</p>
             )}
        </div>
    );
}

export default App;