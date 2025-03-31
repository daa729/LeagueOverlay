// frontend/src/components/ConnectionStatus.tsx
import React from 'react';
import { LcuStatus } from '../types/lcu';

interface ConnectionStatusProps {
    lcuStatus: LcuStatus;
    onReconnect: () => void; // Function to call when reconnect button is clicked
}

export function ConnectionStatus({ lcuStatus, onReconnect }: ConnectionStatusProps) {
    const { wsConnected, connected, loading, error } = lcuStatus;
    const isLoading = loading || (wsConnected && !connected && !error); // Refined loading check

    return (
        <div style={{ margin: '20px 0', border: '1px solid #ccc', padding: '15px' }}>
            <p>Backend WS: {wsConnected ? <span style={{ color: 'green' }}>Connected</span> : <span style={{ color: 'red' }}>Disconnected</span>}</p>
            <p style={{ fontWeight: 'bold', color: error ? 'red' : (connected ? 'green' : 'orange') }}>
                LCU Status: {isLoading ? "Connecting..." : (error ? "Error" : (connected ? "Connected" : "Disconnected"))}
            </p>
            {error && <p style={{ color: 'red' }}>Status Error: {error}</p>}
            {!wsConnected && !loading && <button onClick={onReconnect}>Reconnect WebSocket</button>}
        </div>
    );
}