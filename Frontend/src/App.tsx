// frontend/src/App.tsx
import React, { useState, useEffect } from 'react';
import './App.css';

// Define backend URL (adjust port if your backend runs elsewhere)
const BACKEND_URL = 'http://localhost:3001';

function App() {
  const [backendMessage, setBackendMessage] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    console.log("Frontend: Attempting to fetch from backend...");
    setFetchError(null); // Clear previous errors
    fetch(`${BACKEND_URL}/api/hello`)
      .then(response => {
        if (!response.ok) {
          // Handle HTTP errors (like 404, 500)
          throw new Error(`Network response was not ok: ${response.statusText} (Status: ${response.status})`);
        }
        return response.json();
      })
      .then(data => {
        console.log("Frontend: Received data:", data);
        setBackendMessage(data.message || "No message field found");
      })
      .catch(error => {
        console.error('Frontend: Error fetching data:', error);
         // Handle network errors (fetch itself failed) or CORS issues
         if (error instanceof TypeError && error.message === 'Failed to fetch') {
             setFetchError("Network Error: Could not connect to backend. Is it running? Check CORS.");
         } else {
             setFetchError(`Fetch Error: ${error.message}`);
         }
      });
  }, []); // Empty array means run once on mount

  return (
    <div className="App">
      <h1>LoL Overlay (Web) - Phase 2</h1>
      <p>Frontend & Backend Communication</p>
      <div style={{ marginTop: '20px', padding: '10px', border: '1px dashed blue' }}>
        <p>Message from Backend:</p>
        {fetchError && <p style={{ color: 'red' }}>Error: {fetchError}</p>}
        {backendMessage ? (
          <p style={{ color: 'green', fontWeight: 'bold' }}>{backendMessage}</p>
        ) : (
          !fetchError && <p>Loading...</p>
        )}
      </div>
    </div>
  );
}
export default App;