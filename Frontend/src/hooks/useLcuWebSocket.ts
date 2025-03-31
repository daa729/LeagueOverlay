// frontend/src/hooks/useLcuWebSocket.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { LcuStatus, ChampSelectSession, LcuEventMessage, GameflowPhaseData } from '../types/lcu';

const WS_BACKEND_URL = 'ws://localhost:3001'; // Or get from config/env

// Define the hook's return type
interface UseLcuWebSocketReturn {
    lcuStatus: LcuStatus;
    currentGameflowPhase: string | null;
    champSelectSession: ChampSelectSession | null;
    connectWebSocket: () => void; // Function to manually trigger connection
    isConnectedToLcu: boolean; // Simple boolean derived state
}

/**
 * Custom hook to manage WebSocket connection to the backend LCU proxy
 * and handle LCU state updates.
 */
export function useLcuWebSocket(
    onLcuConnect?: () => void, // Optional callback when LCU connects
    onLcuDisconnect?: () => void, // Optional callback when LCU disconnects
): UseLcuWebSocketReturn {
    // --- State ---
    const [lcuStatus, setLcuStatus] = useState<LcuStatus>({
        connected: false, loading: false, error: undefined, wsConnected: false
    });
    const [currentGameflowPhase, setCurrentGameflowPhase] = useState<string | null>(null);
    const [champSelectSession, setChampSelectSession] = useState<ChampSelectSession | null>(null);
    const socketRef = useRef<WebSocket | null>(null);

    // --- WebSocket Connection Logic ---
    const connectWebSocket = useCallback(() => {
        // Use the ref's current value to check state
        if (socketRef.current && socketRef.current.readyState < WebSocket.CLOSING) {
            console.log("useLcuWebSocket: WebSocket already connecting or open.");
            return;
        }
        // Clean up previous socket instance if it exists
        if (socketRef.current) {
            console.log("useLcuWebSocket: Closing previous WebSocket before reconnecting.");
            // Remove listeners before closing to prevent stale handlers firing
            socketRef.current.onopen = null;
            socketRef.current.onmessage = null;
            socketRef.current.onclose = null;
            socketRef.current.onerror = null;
            socketRef.current.close();
            socketRef.current = null; // Explicitly nullify ref
        }

        console.log("useLcuWebSocket: Attempting to connect WebSocket to backend...");
        // Set loading state when attempting connection
        // State setters are stable and don't need to be dependencies of useCallback
        setLcuStatus({ connected: false, loading: true, error: undefined, wsConnected: false });
        setCurrentGameflowPhase(null);
        setChampSelectSession(null);

        const socket = new WebSocket(WS_BACKEND_URL);
        // Assign the new socket instance to the ref immediately
        socketRef.current = socket;

        // --- Event Handlers (defined inline or as stable functions) ---

        socket.onopen = () => {
            console.log("useLcuWebSocket: WebSocket connection to backend OPENED.");
            // Update WS connection status, keep loading until LCU status message arrives
            setLcuStatus(prev => ({ ...prev, wsConnected: true, loading: true, error: undefined }));
        };

        socket.onmessage = (event) => {
            // Consider stopping loading state here or within specific handlers
            // setLcuStatus(prev => ({ ...prev, loading: false }));
            try {
                const message = JSON.parse(event.data);
                console.log('useLcuWebSocket: Parsed message:', message.type);

                switch (message.type) {
                    case 'LcuConnect':
                        console.log("useLcuWebSocket: Handling LcuConnect...");
                        try {
                            setLcuStatus(prev => {
                                console.log("useLcuWebSocket: Setting LCU status connected.");
                                return { ...prev, connected: true, wsConnected: true, error: undefined, loading: false };
                            });
                            // Call the stable callback passed from the parent component
                            onLcuConnect?.();
                        } catch (stateOrCbError: any) {
                             console.error("useLcuWebSocket: Error during LcuConnect handling:", stateOrCbError);
                             // Use ref to close if error occurs during handling
                             socketRef.current?.close(1011, "Frontend error handling LcuConnect");
                        }
                        break;

                    case 'LcuDisconnect':
                        console.log("useLcuWebSocket: Handling LcuDisconnect.");
                        const disconnectError = message.error ? `LCU Error: ${message.error}` : "LCU Disconnected";
                        setLcuStatus(prev => ({ ...prev, connected: false, wsConnected: true, error: disconnectError, loading: false }));
                        setCurrentGameflowPhase(null);
                        setChampSelectSession(null);
                        onLcuDisconnect?.();
                        break;

                    case 'LcuConnectError':
                        console.error("useLcuWebSocket: Handling LcuConnectError:", message.error);
                        setLcuStatus(prev => ({ ...prev, connected: false, wsConnected: true, error: message.error, loading: false }));
                        setCurrentGameflowPhase(null);
                        setChampSelectSession(null);
                        onLcuDisconnect?.();
                        break;

                    case 'LcuEvent':
                        const eventData = message.data as LcuEventMessage;
                        if (eventData?.uri === '/lol-gameflow/v1/gameflow-phase') {
                            const phasePayload = eventData as GameflowPhaseData;
                            const newPhase = phasePayload.data;
                            setCurrentGameflowPhase(prevPhase => {
                                if (newPhase !== prevPhase) {
                                    console.log("useLcuWebSocket: Gameflow Phase Updated:", newPhase);
                                    if (prevPhase === "ChampSelect" && newPhase !== "ChampSelect") {
                                        setChampSelectSession(null);
                                    }
                                    return newPhase;
                                }
                                return prevPhase;
                            });
                        } else if (eventData?.uri === '/lol-champ-select/v1/session') {
                             console.log("useLcuWebSocket: Champ Select update received.");
                             setChampSelectSession(eventData.data as ChampSelectSession);
                        }
                        break;

                    default:
                        console.log("useLcuWebSocket: Unknown message type:", message.type);
                        // Stop loading even for unknown types
                         setLcuStatus(prev => ({ ...prev, loading: false }));
                }
            } catch (e) {
                console.error('useLcuWebSocket: Error parsing message:', e);
                // Ensure loading stops if message parsing fails
                 setLcuStatus(prev => ({...prev, loading: false, error: prev.error || "Error parsing backend message"}));
            }
        };

        socket.onclose = (event) => {
            console.log(`useLcuWebSocket: WebSocket CLOSED. Code: ${event.code}, Clean: ${event.wasClean}, Reason: ${event.reason}`);
            // Only nullify ref if this specific socket instance closed
            if (socketRef.current === socket) {
                socketRef.current = null;
            }
            const closeError = event.wasClean ? undefined : `WebSocket closed unexpectedly (Code: ${event.code})`;
            // Reset all state related to connection
            setLcuStatus({ wsConnected: false, connected: false, loading: false, error: closeError });
            setCurrentGameflowPhase(null);
            setChampSelectSession(null);
            // Call disconnect callback if provided
            onLcuDisconnect?.();
            // Optional: Retry logic
            // if (!event.wasClean) {
            //     console.log("useLcuWebSocket: Attempting reconnect after 5s...");
            //     setTimeout(connectWebSocket, 5000); // Be careful with dependencies if using timeout
            // }
        };

        socket.onerror = (error) => {
            console.error('useLcuWebSocket: WebSocket error:', error);
            // Update error state, but let onclose handle full state reset and nullifying ref
            setLcuStatus(prev => ({
                 ...prev,
                 error: prev.error || "WebSocket connection error",
                 loading: false // Ensure loading stops on error
            }));
        };

    // Only depend on the external callbacks passed into the hook.
    // State setters from useState and the ref object from useRef are stable.
    }, [onLcuConnect, onLcuDisconnect]);
    // --- End useCallback ---


    // --- Effect to Connect on Mount ---
    useEffect(() => {
        console.log("useLcuWebSocket: Mount effect running, calling connectWebSocket.");
        connectWebSocket(); // Call the stable memoized function instance

        // Cleanup function: Close the WebSocket when the component unmounts
        return () => {
            console.log("useLcuWebSocket: Cleanup effect running, closing WebSocket.");
            // Use the ref's current value in the cleanup function
            // Add a check for readyState before closing
             const socket = socketRef.current;
            if (socket && socket.readyState === WebSocket.OPEN) {
                 socket.close();
            }
            socketRef.current = null; // Ensure ref is cleared on unmount
        };
    // Depend only on the stable connectWebSocket function instance.
    // This ensures the effect runs only once on mount and cleanup on unmount.
    }, [connectWebSocket]);

    // Derived state for convenience
    const isConnectedToLcu = lcuStatus.wsConnected && lcuStatus.connected;

    // Return values of the hook
    return { lcuStatus, currentGameflowPhase, champSelectSession, connectWebSocket, isConnectedToLcu };
}