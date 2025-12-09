/*
 * Hydroponic Monitoring Dashboard with Real-time Updates
 * 
 * To connect to your Google Sheets:
 * 1. Make your Google Sheet public (Share > Anyone with the link can view)
 * 2. Replace SHEET_ID below with your actual Google Sheet ID
 * 3. Your sheet should have columns: Timestamp, AirT_C, Humidity_%, WaterTemp_C, ph, Water_%
 * 
 * Features:
 * - Real-time data updates every second
 * - Live/Demo mode toggle
 * - Connection status indicator
 * - Interactive charts and metrics
 */

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import './Hydrophonics.css';

function App() {
  // Initialize with placeholder data for immediate display
  const [data, setData] = useState([{
    Timestamp: new Date().toISOString(),
    timestamp: new Date().toLocaleTimeString(),
    AirT_C: '--',
    'Humidity_%': '--',
    WaterTemp_C: '--',
    ph: '--',
    'Water_%': '--'
  }]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [isRealTime, setIsRealTime] = useState(true);
  const [lastKnownTimestamp, setLastKnownTimestamp] = useState(null);
  const [checkCount, setCheckCount] = useState(0);
  const [newDataNotification, setNewDataNotification] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Google Sheets CSV export URL - replace SHEET_ID with your actual sheet ID
  const SHEET_ID = '1DphuZUL2Nu0MwDxF073sPxuW9lvP5JV_8tW26sFzTSA';
  const SHEET_API_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;

  // Check if there's new data in the sheet (lightweight check)
  const checkForNewData = async () => {
    try {
      setCheckCount(prev => prev + 1);
      
      // Silent check - no loading state for monitoring
      const response = await fetch(SHEET_API_URL);
      const csvText = await response.text();
      
      // Parse only the last few lines to check for new data
      const lines = csvText.split('\n').filter(line => line.trim());
      if (lines.length < 2) return false;
      
      const headers = lines[0].split(',');
      const lastRow = lines[lines.length - 1].split(',');
      
      // Get timestamp from last row
      const timestampIndex = headers.findIndex(header => header.trim().toLowerCase().includes('timestamp'));
      if (timestampIndex === -1) return false;
      
      const latestTimestamp = lastRow[timestampIndex]?.trim();
      
      // Check if this is newer than our last known timestamp
      if (!lastKnownTimestamp || latestTimestamp !== lastKnownTimestamp) {
        setLastKnownTimestamp(latestTimestamp);
        return true; // New data available
      }
      
      return false; // No new data
    } catch (error) {
      console.warn('Error checking for new data:', error);
      return false;
    }
  };

  // Mock data generator for demo purposes - always generates data when called
  const generateMockData = () => {
    const now = new Date();
    return {
      Timestamp: now.toISOString(),
      AirT_C: (20 + Math.random() * 10).toFixed(1),
      'Humidity_%': (40 + Math.random() * 20).toFixed(1),
      WaterTemp_C: (18 + Math.random() * 8).toFixed(1),
      ph: (6.0 + Math.random() * 2).toFixed(1),
      'Water_%': (70 + Math.random() * 20).toFixed(1)
    };
  };

  const fetchFullData = async () => {
    try {
      const response = await fetch(SHEET_API_URL);
      const csvText = await response.text();
      
      // Parse CSV data
      const lines = csvText.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',');
      const parsedData = lines.slice(1).map(line => {
        const values = line.split(',');
        const row = {};
        headers.forEach((header, index) => {
          row[header.trim()] = values[index]?.trim() || '';
        });
        return row;
      });

      if (parsedData.length === 0) {
        throw new Error('No data found');
      }

      // Process the CSV data
      const processedData = parsedData.map(item => ({
        ...item,
        timestamp: new Date(item.Timestamp).toLocaleTimeString(),
        AirT_C: parseFloat(item.AirT_C) || 0,
        'Humidity_%': parseFloat(item['Humidity_%']) || 0,
        WaterTemp_C: parseFloat(item.WaterTemp_C) || 0,
        ph: parseFloat(item.ph) || 0,
        'Water_%': parseFloat(item['Water_%']) || 0
      }));
      
      setData(processedData);
      setLastUpdate(new Date());
      setConnectionStatus('connected');
      
      return true;
    } catch (error) {
      throw error;
    }
  };

  const checkAndUpdateData = async () => {
    try {
      setIsMonitoring(true);
      
      // First try to check for new data from Google Sheets
      const hasNewData = await checkForNewData();
      
      setIsMonitoring(false);
      
      if (hasNewData) {
        console.log('🔄 New data detected in Google Sheets, fetching...');
        await fetchFullData();
        
        // Show specific notification for Google Sheets data
        setNewDataNotification('sheets');
        setTimeout(() => setNewDataNotification(false), 3000);
      } else {
        // Silent check - no unnecessary updates or notifications
        console.log('✅ No new data in Google Sheets');
        
        // Only set to mock mode if we haven't connected yet
        if (connectionStatus === 'connecting') {
          setConnectionStatus('mock');
          
          // Generate initial mock data only once when switching to mock mode
          const mockDataPoint = generateMockData();
          if (mockDataPoint) {
            const processedMockData = {
              ...mockDataPoint,
              timestamp: new Date(mockDataPoint.Timestamp).toLocaleTimeString(),
              AirT_C: parseFloat(mockDataPoint.AirT_C) || 0,
              'Humidity_%': parseFloat(mockDataPoint['Humidity_%']) || 0,
              WaterTemp_C: parseFloat(mockDataPoint.WaterTemp_C) || 0,
              ph: parseFloat(mockDataPoint.ph) || 0,
              'Water_%': parseFloat(mockDataPoint['Water_%']) || 0
            };
            
            setData([processedMockData]);
            setLastUpdate(new Date());
          }
        }
        
        // In mock mode, occasionally generate new data (much less frequently)
        if (connectionStatus === 'mock') {
          // Only generate new mock data every 30-60 seconds (5% chance per check)
          const shouldGenerateNewMockData = Math.random() < 0.05;
          
          if (shouldGenerateNewMockData) {
            const mockDataPoint = generateMockData();
            if (mockDataPoint) {
              console.log('📊 Generating new mock data point...');
              const processedMockData = {
                ...mockDataPoint,
                timestamp: new Date(mockDataPoint.Timestamp).toLocaleTimeString(),
                AirT_C: parseFloat(mockDataPoint.AirT_C) || 0,
                'Humidity_%': parseFloat(mockDataPoint['Humidity_%']) || 0,
                WaterTemp_C: parseFloat(mockDataPoint.WaterTemp_C) || 0,
                ph: parseFloat(mockDataPoint.ph) || 0,
                'Water_%': parseFloat(mockDataPoint['Water_%']) || 0
              };
              
              // Add new data point to existing data
              setData(prevData => {
                const newData = [...prevData, processedMockData];
                return newData.slice(-50);
              });
              setLastUpdate(new Date());
              
              // Show specific notification for mock data
              setNewDataNotification('mock');
              setTimeout(() => setNewDataNotification(false), 2000);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking/updating data:', error);
      if (connectionStatus !== 'mock') {
        setConnectionStatus('error');
      }
      setIsMonitoring(false);
    }
  };

  // Manual refresh function for the button
  const fetchData = async () => {
    try {
      await fetchFullData();
    } catch (error) {
      console.warn('Could not fetch from Google Sheets, using mock data:', error);
      setConnectionStatus('mock');
    }
  };

  useEffect(() => {
    // Initial data fetch
    fetchData();
    
    let interval;
    if (isRealTime) {
      // Check for new data every 3 seconds (efficient monitoring)
      interval = setInterval(checkAndUpdateData, 3000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRealTime]);

  const getLatestReading = () => {
    return data.length > 0 ? data[data.length - 1] : null;
  };

  const latest = getLatestReading();

  return (
    <div className="dashboard">
      {newDataNotification && (
        <div className="new-data-notification">
          {newDataNotification === 'sheets' && 'New data from Google Sheets'}
          {newDataNotification === 'mock' && 'Demo data updated'}
        </div>
      )}
      
      {/* LabVIEW Application Window */}
      <div className="labview-window">
        {/* Title Bar */}
        <div className="labview-titlebar">
          <div className="labview-titlebar-left">
            <div className="labview-icon">LV</div>
            <span className="labview-titlebar-text">LabVIEW 2024 - Hydroponic_Monitor.vi</span>
          </div>
          <div className="labview-titlebar-right">
            <button className="labview-titlebar-btn">_</button>
            <button className="labview-titlebar-btn">□</button>
            <button className="labview-titlebar-btn close">×</button>
          </div>
        </div>

        {/* Menu Bar */}
        <div className="labview-menubar">
          <span>File</span>
          <span>Edit</span>
          <span>View</span>
          <span>Project</span>
          <span>Operate</span>
          <span>Tools</span>
          <span>Window</span>
          <span>Help</span>
        </div>

        {/* Toolbar */}
        <div className="labview-toolbar">
          <button className="run-button" title="Run">▶</button>
          <button className="stop-button" title="Stop">■</button>
          <div className="separator"></div>
          <button title="New VI">📄</button>
          <button title="Open">📁</button>
          <button title="Save">💾</button>
          <div className="separator"></div>
          <button title="Cut">✂</button>
          <button title="Copy">📋</button>
          <button title="Paste">📄</button>
          <div className="separator"></div>
          <button title="Align">⊞</button>
          <button title="Distribute">⊟</button>
          <span className="labview-toolbar-label">Front Panel</span>
        </div>

        {/* Main Content Area */}
        <div className="labview-content">
          {/* Left Sidebar - Functions Palette */}
          <div className="labview-sidebar">
            <div className="labview-sidebar-title">Functions Palette</div>
            <div className="labview-palette-section">
              <div className="labview-palette-item category">
                <div className="icon">▼</div>
                <span className="label">Programming</span>
              </div>
              <div className="labview-palette-item">
                <div className="icon">N</div>
                <span className="label">Numeric</span>
              </div>
              <div className="labview-palette-item">
                <div className="icon">B</div>
                <span className="label">Boolean</span>
              </div>
              <div className="labview-palette-item">
                <div className="icon">S</div>
                <span className="label">String</span>
              </div>
              <div className="labview-palette-item">
                <div className="icon">A</div>
                <span className="label">Array</span>
              </div>
              <div className="labview-palette-item">
                <div className="icon">C</div>
                <span className="label">Cluster & Variant</span>
              </div>
            </div>
            <div className="labview-palette-section">
              <div className="labview-palette-item category active">
                <div className="icon">▼</div>
                <span className="label">Measurement I/O</span>
              </div>
              <div className="labview-palette-item">
                <div className="icon">D</div>
                <span className="label">DAQmx</span>
              </div>
              <div className="labview-palette-item">
                <div className="icon">I</div>
                <span className="label">Instrument I/O</span>
              </div>
            </div>
            <div className="labview-palette-section">
              <div className="labview-palette-item category">
                <div className="icon">▼</div>
                <span className="label">Signal Processing</span>
              </div>
              <div className="labview-palette-item">
                <div className="icon">F</div>
                <span className="label">Filters</span>
              </div>
              <div className="labview-palette-item">
                <div className="icon">W</div>
                <span className="label">Waveform</span>
              </div>
              <div className="labview-palette-item">
                <div className="icon">M</div>
                <span className="label">Measurement</span>
              </div>
            </div>
            <div className="labview-palette-section">
              <div className="labview-palette-item category">
                <div className="icon">▼</div>
                <span className="label">Mathematics</span>
              </div>
              <div className="labview-palette-item">
                <div className="icon">Σ</div>
                <span className="label">Scripts & Formulas</span>
              </div>
              <div className="labview-palette-item">
                <div className="icon">∫</div>
                <span className="label">Calculus</span>
              </div>
            </div>
          </div>

          {/* VI Panel */}
          <div className="labview-vi-panel">
            <div className="labview-vi-header">
              <div className="labview-vi-title">Hydroponic_Monitor.vi - Front Panel</div>
              <div className="labview-vi-controls">
                <button className="labview-window-btn">_</button>
                <button className="labview-window-btn">□</button>
                <button className="labview-window-btn">×</button>
              </div>
            </div>

            {/* Original Dashboard Content */}
            <div style={{padding: '0'}}>
              <header className="dashboard-header">
        <h1>Hydroponic Monitoring Dashboard</h1>
        <div className="header-controls">
          <div className="connection-status">
            <span style={{fontWeight: 'bold'}}>Status:</span>
            <span className={`status-${connectionStatus}`}>
              {connectionStatus === 'connected' && 'Live Data'}
              {connectionStatus === 'mock' && 'Demo Mode'}
              {connectionStatus === 'error' && 'Disconnected'}
              {connectionStatus === 'connecting' && 'Connecting...'}
            </span>
            {isRealTime && (
              <span className="check-indicator">
                | Checks: {checkCount} | {isMonitoring ? 'Monitoring...' : 'Idle'}
              </span>
            )}
          </div>
          <div className="last-update">
            Last Update: {lastUpdate ? lastUpdate.toLocaleString() : 'Never'}
            {lastKnownTimestamp && (
              <div className="latest-timestamp">
                Latest: {new Date(lastKnownTimestamp).toLocaleString()}
              </div>
            )}
          </div>
          <div className="controls">
            <button 
              onClick={() => setIsRealTime(!isRealTime)} 
              className={`toggle-btn ${isRealTime ? 'active' : ''}`}
            >
              {isRealTime ? 'Pause' : 'Resume'} Monitoring
            </button>
            <button onClick={fetchData} className="refresh-btn">Refresh</button>
          </div>
        </div>
      </header>

      <div className="metrics-grid">
        <div className={`metric-card ${isRealTime ? 'live-update' : ''}`}>
          <h3>Air Temperature</h3>
          <div className="metric-value">{latest?.AirT_C}°C</div>
        </div>
        <div className={`metric-card ${isRealTime ? 'live-update' : ''}`}>
          <h3>Humidity</h3>
          <div className="metric-value">{latest?.['Humidity_%']}%</div>
        </div>
        <div className={`metric-card ${isRealTime ? 'live-update' : ''}`}>
          <h3>Water Temperature</h3>
          <div className="metric-value">{latest?.WaterTemp_C}°C</div>
        </div>
        <div className={`metric-card ${isRealTime ? 'live-update' : ''}`}>
          <h3>pH Level</h3>
          <div className="metric-value">{latest?.ph}</div>
        </div>
        <div className={`metric-card ${isRealTime ? 'live-update' : ''}`}>
          <h3>Water Level</h3>
          <div className="metric-value">{latest?.['Water_%']}%</div>
        </div>
      </div>

      <div className="charts-container">
        <div className="chart-section">
          <h2>Temperature Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.slice(-20)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
              <XAxis dataKey="timestamp" stroke="#000" style={{fontSize: '10px'}} />
              <YAxis stroke="#000" style={{fontSize: '10px'}} />
              <Tooltip 
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #ccc',
                  borderRadius: '0',
                  fontSize: '10px'
                }}
              />
              <Legend wrapperStyle={{fontSize: '10px'}} />
              <Line type="monotone" dataKey="AirT_C" stroke="#ff3333" strokeWidth={2} name="Air Temp (°C)" dot={{fill: '#ff3333', r: 3}} />
              <Line type="monotone" dataKey="WaterTemp_C" stroke="#3366ff" strokeWidth={2} name="Water Temp (°C)" dot={{fill: '#3366ff', r: 3}} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-section">
          <h2>pH and Water Level</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.slice(-20)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
              <XAxis dataKey="timestamp" stroke="#000" style={{fontSize: '10px'}} />
              <YAxis stroke="#000" style={{fontSize: '10px'}} />
              <Tooltip 
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #ccc',
                  borderRadius: '0',
                  fontSize: '10px'
                }}
              />
              <Legend wrapperStyle={{fontSize: '10px'}} />
              <Line type="monotone" dataKey="ph" stroke="#ff6600" strokeWidth={2} name="pH Level" dot={{fill: '#ff6600', r: 3}} />
              <Line type="monotone" dataKey="Water_%" stroke="#00cc66" strokeWidth={2} name="Water Level (%)" dot={{fill: '#00cc66', r: 3}} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-section">
          <h2>Humidity Overview</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.slice(-10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
              <XAxis dataKey="timestamp" stroke="#000" style={{fontSize: '10px'}} />
              <YAxis stroke="#000" style={{fontSize: '10px'}} />
              <Tooltip 
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #ccc',
                  borderRadius: '0',
                  fontSize: '10px'
                }}
              />
              <Legend wrapperStyle={{fontSize: '10px'}} />
              <Bar dataKey="Humidity_%" fill="#6699cc" name="Humidity (%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="data-table">
        <h2>Recent Readings</h2>
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Air Temp (°C)</th>
              <th>Humidity (%)</th>
              <th>Water Temp (°C)</th>
              <th>pH</th>
              <th>Water Level (%)</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(-10).reverse().map((row, index) => (
              <tr key={index}>
                <td>{row.Timestamp}</td>
                <td>{row.AirT_C}</td>
                <td>{row['Humidity_%']}</td>
                <td>{row.WaterTemp_C}</td>
                <td>{row.ph}</td>
                <td>{row['Water_%']}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;




// /*
//  * Hydroponic Monitoring Dashboard with Real-time Updates
//  * 
//  * To connect to your Google Sheets:
//  * 1. Make your Google Sheet public (Share > Anyone with the link can view)
//  * 2. Replace SHEET_ID below with your actual Google Sheet ID
//  * 3. Your sheet should have columns: Timestamp, AirT_C, Humidity_%, WaterTemp_C, ph, Water_%
//  * 
//  * Features:
//  * - Real-time data updates every second
//  * - Live/Demo mode toggle
//  * - Connection status indicator
//  * - Interactive charts and metrics
//  */

// import React, { useState, useEffect } from 'react';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
// import './Hydrophonics.css';

// function App() {
//   // Initialize with placeholder data for immediate display
//   const [data, setData] = useState([{
//     Timestamp: new Date().toISOString(),
//     timestamp: new Date().toLocaleTimeString(),
//     AirT_C: '--',
//     'Humidity_%': '--',
//     WaterTemp_C: '--',
//     ph: '--',
//     'Water_%': '--'
//   }]);
//   const [lastUpdate, setLastUpdate] = useState(null);
//   const [connectionStatus, setConnectionStatus] = useState('connecting');
//   const [isRealTime, setIsRealTime] = useState(true);
//   const [lastKnownTimestamp, setLastKnownTimestamp] = useState(null);
//   const [checkCount, setCheckCount] = useState(0);
//   const [newDataNotification, setNewDataNotification] = useState(false);
//   const [isMonitoring, setIsMonitoring] = useState(false);

//   // Google Sheets CSV export URL - replace SHEET_ID with your actual sheet ID
//   const SHEET_ID = '1DphuZUL2Nu0MwDxF073sPxuW9lvP5JV_8tW26sFzTSA';
//   const SHEET_API_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;

//   // Check if there's new data in the sheet (lightweight check)
//   const checkForNewData = async () => {
//     try {
//       setCheckCount(prev => prev + 1);
      
//       // Silent check - no loading state for monitoring
//       const response = await fetch(SHEET_API_URL);
//       const csvText = await response.text();
      
//       // Parse only the last few lines to check for new data
//       const lines = csvText.split('\n').filter(line => line.trim());
//       if (lines.length < 2) return false;
      
//       const headers = lines[0].split(',');
//       const lastRow = lines[lines.length - 1].split(',');
      
//       // Get timestamp from last row
//       const timestampIndex = headers.findIndex(header => header.trim().toLowerCase().includes('timestamp'));
//       if (timestampIndex === -1) return false;
      
//       const latestTimestamp = lastRow[timestampIndex]?.trim();
      
//       // Check if this is newer than our last known timestamp
//       if (!lastKnownTimestamp || latestTimestamp !== lastKnownTimestamp) {
//         setLastKnownTimestamp(latestTimestamp);
//         return true; // New data available
//       }
      
//       return false; // No new data
//     } catch (error) {
//       console.warn('Error checking for new data:', error);
//       return false;
//     }
//   };

//   // Mock data generator for demo purposes - always generates data when called
//   const generateMockData = () => {
//     const now = new Date();
//     return {
//       Timestamp: now.toISOString(),
//       AirT_C: (20 + Math.random() * 10).toFixed(1),
//       'Humidity_%': (40 + Math.random() * 20).toFixed(1),
//       WaterTemp_C: (18 + Math.random() * 8).toFixed(1),
//       ph: (6.0 + Math.random() * 2).toFixed(1),
//       'Water_%': (70 + Math.random() * 20).toFixed(1)
//     };
//   };

//   const fetchFullData = async () => {
//     try {
//       const response = await fetch(SHEET_API_URL);
//       const csvText = await response.text();
      
//       // Parse CSV data
//       const lines = csvText.split('\n').filter(line => line.trim());
//       const headers = lines[0].split(',');
//       const parsedData = lines.slice(1).map(line => {
//         const values = line.split(',');
//         const row = {};
//         headers.forEach((header, index) => {
//           row[header.trim()] = values[index]?.trim() || '';
//         });
//         return row;
//       });

//       if (parsedData.length === 0) {
//         throw new Error('No data found');
//       }

//       // Process the CSV data
//       const processedData = parsedData.map(item => ({
//         ...item,
//         timestamp: new Date(item.Timestamp).toLocaleTimeString(),
//         AirT_C: parseFloat(item.AirT_C) || 0,
//         'Humidity_%': parseFloat(item['Humidity_%']) || 0,
//         WaterTemp_C: parseFloat(item.WaterTemp_C) || 0,
//         ph: parseFloat(item.ph) || 0,
//         'Water_%': parseFloat(item['Water_%']) || 0
//       }));
      
//       setData(processedData);
//       setLastUpdate(new Date());
//       setConnectionStatus('connected');
      
//       return true;
//     } catch (error) {
//       throw error;
//     }
//   };

//   const checkAndUpdateData = async () => {
//     try {
//       setIsMonitoring(true);
      
//       // First try to check for new data from Google Sheets
//       const hasNewData = await checkForNewData();
      
//       setIsMonitoring(false);
      
//       if (hasNewData) {
//         console.log('🔄 New data detected in Google Sheets, fetching...');
//         await fetchFullData();
        
//         // Show specific notification for Google Sheets data
//         setNewDataNotification('sheets');
//         setTimeout(() => setNewDataNotification(false), 3000);
//       } else {
//         // Silent check - no unnecessary updates or notifications
//         console.log('✅ No new data in Google Sheets');
        
//         // Only set to mock mode if we haven't connected yet
//         if (connectionStatus === 'connecting') {
//           setConnectionStatus('mock');
          
//           // Generate initial mock data only once when switching to mock mode
//           const mockDataPoint = generateMockData();
//           if (mockDataPoint) {
//             const processedMockData = {
//               ...mockDataPoint,
//               timestamp: new Date(mockDataPoint.Timestamp).toLocaleTimeString(),
//               AirT_C: parseFloat(mockDataPoint.AirT_C) || 0,
//               'Humidity_%': parseFloat(mockDataPoint['Humidity_%']) || 0,
//               WaterTemp_C: parseFloat(mockDataPoint.WaterTemp_C) || 0,
//               ph: parseFloat(mockDataPoint.ph) || 0,
//               'Water_%': parseFloat(mockDataPoint['Water_%']) || 0
//             };
            
//             setData([processedMockData]);
//             setLastUpdate(new Date());
//           }
//         }
        
//         // In mock mode, occasionally generate new data (much less frequently)
//         if (connectionStatus === 'mock') {
//           // Only generate new mock data every 30-60 seconds (5% chance per check)
//           const shouldGenerateNewMockData = Math.random() < 0.05;
          
//           if (shouldGenerateNewMockData) {
//             const mockDataPoint = generateMockData();
//             if (mockDataPoint) {
//               console.log('📊 Generating new mock data point...');
//               const processedMockData = {
//                 ...mockDataPoint,
//                 timestamp: new Date(mockDataPoint.Timestamp).toLocaleTimeString(),
//                 AirT_C: parseFloat(mockDataPoint.AirT_C) || 0,
//                 'Humidity_%': parseFloat(mockDataPoint['Humidity_%']) || 0,
//                 WaterTemp_C: parseFloat(mockDataPoint.WaterTemp_C) || 0,
//                 ph: parseFloat(mockDataPoint.ph) || 0,
//                 'Water_%': parseFloat(mockDataPoint['Water_%']) || 0
//               };
              
//               // Add new data point to existing data
//               setData(prevData => {
//                 const newData = [...prevData, processedMockData];
//                 return newData.slice(-50);
//               });
//               setLastUpdate(new Date());
              
//               // Show specific notification for mock data
//               setNewDataNotification('mock');
//               setTimeout(() => setNewDataNotification(false), 2000);
//             }
//           }
//         }
//       }
//     } catch (error) {
//       console.error('Error checking/updating data:', error);
//       if (connectionStatus !== 'mock') {
//         setConnectionStatus('error');
//       }
//       setIsMonitoring(false);
//     }
//   };

//   // Manual refresh function for the button
//   const fetchData = async () => {
//     try {
//       await fetchFullData();
//     } catch (error) {
//       console.warn('Could not fetch from Google Sheets, using mock data:', error);
//       setConnectionStatus('mock');
//     }
//   };

//   useEffect(() => {
//     // Initial data fetch
//     fetchData();
    
//     let interval;
//     if (isRealTime) {
//       // Check for new data every 3 seconds (efficient monitoring)
//       interval = setInterval(checkAndUpdateData, 3000);
//     }
    
//     return () => {
//       if (interval) clearInterval(interval);
//     };
//   }, [isRealTime]);

//   const getLatestReading = () => {
//     return data.length > 0 ? data[data.length - 1] : null;
//   };

//   const latest = getLatestReading();

//   return (
//     <div className="dashboard">
//       {newDataNotification && (
//         <div className="new-data-notification">
//           {newDataNotification === 'sheets' && '📊 New data from Google Sheets!'}
//           {newDataNotification === 'mock' && '🎲 Demo data updated!'}
//         </div>
//       )}
      
//       <header className="dashboard-header">
//         <h1>Hydroponic Monitoring Dashboard</h1>
//         <div className="header-controls">
//           <div className="connection-status">
//             Status: 
//             <span className={`status-${connectionStatus}`}>
//               {connectionStatus === 'connected' && '🟢 Live Data'}
//               {connectionStatus === 'mock' && '🟡 Demo Mode'}
//               {connectionStatus === 'error' && '🔴 Disconnected'}
//               {connectionStatus === 'connecting' && '🟡 Connecting...'}
//             </span>
//             {isRealTime && (
//               <span className="check-indicator">
//                 | Checks: {checkCount} | {isMonitoring ? '🔍 Checking...' : '💤 Idle'}
//               </span>
//             )}
//           </div>
//           <div className="last-update">
//             Last Updated: {lastUpdate ? lastUpdate.toLocaleString() : 'Never'}
//             {lastKnownTimestamp && (
//               <div className="latest-timestamp">
//                 Latest Data: {new Date(lastKnownTimestamp).toLocaleString()}
//               </div>
//             )}
//           </div>
//           <div className="controls">
//             <button 
//               onClick={() => setIsRealTime(!isRealTime)} 
//               className={`toggle-btn ${isRealTime ? 'active' : ''}`}
//             >
//               {isRealTime ? '⏸️ Pause' : '▶️ Resume'} Real-time
//             </button>
//             <button onClick={fetchData} className="refresh-btn">🔄 Refresh</button>
//           </div>
//         </div>
//       </header>

//       <div className="metrics-grid">
//         <div className={`metric-card ${isRealTime ? 'live-update' : ''}`}>
//           <h3>Air Temperature</h3>
//           <div className="metric-value">{latest?.AirT_C}°C</div>
//           <div className="trend-indicator">📈</div>
//         </div>
//         <div className={`metric-card ${isRealTime ? 'live-update' : ''}`}>
//           <h3>Humidity</h3>
//           <div className="metric-value">{latest?.['Humidity_%']}%</div>
//           <div className="trend-indicator">💧</div>
//         </div>
//         <div className={`metric-card ${isRealTime ? 'live-update' : ''}`}>
//           <h3>Water Temperature</h3>
//           <div className="metric-value">{latest?.WaterTemp_C}°C</div>
//           <div className="trend-indicator">🌊</div>
//         </div>
//         <div className={`metric-card ${isRealTime ? 'live-update' : ''}`}>
//           <h3>pH Level</h3>
//           <div className="metric-value">{latest?.ph}</div>
//           <div className="trend-indicator">⚗️</div>
//         </div>
//         <div className={`metric-card ${isRealTime ? 'live-update' : ''}`}>
//           <h3>Water Level</h3>
//           <div className="metric-value">{latest?.['Water_%']}%</div>
//           <div className="trend-indicator">📊</div>
//         </div>
//       </div>

//       <div className="charts-container">
//         <div className="chart-section">
//           <h2>Temperature Trends</h2>
//           <ResponsiveContainer width="100%" height={300}>
//             <LineChart data={data.slice(-20)}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis dataKey="timestamp" />
//               <YAxis />
//               <Tooltip />
//               <Legend />
//               <Line type="monotone" dataKey="AirT_C" stroke="#8884d8" name="Air Temp (°C)" />
//               <Line type="monotone" dataKey="WaterTemp_C" stroke="#82ca9d" name="Water Temp (°C)" />
//             </LineChart>
//           </ResponsiveContainer>
//         </div>

//         <div className="chart-section">
//           <h2>pH and Water Level</h2>
//           <ResponsiveContainer width="100%" height={300}>
//             <LineChart data={data.slice(-20)}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis dataKey="timestamp" />
//               <YAxis />
//               <Tooltip />
//               <Legend />
//               <Line type="monotone" dataKey="ph" stroke="#ff7300" name="pH Level" />
//               <Line type="monotone" dataKey="Water_%" stroke="#0088aa" name="Water Level (%)" />
//             </LineChart>
//           </ResponsiveContainer>
//         </div>

//         <div className="chart-section">
//           <h2>Humidity Overview</h2>
//           <ResponsiveContainer width="100%" height={300}>
//             <BarChart data={data.slice(-10)}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis dataKey="timestamp" />
//               <YAxis />
//               <Tooltip />
//               <Legend />
//               <Bar dataKey="Humidity_%" fill="#8884d8" name="Humidity (%)" />
//             </BarChart>
//           </ResponsiveContainer>
//         </div>
//       </div>

//       <div className="data-table">
//         <h2>Recent Readings</h2>
//         <table>
//           <thead>
//             <tr>
//               <th>Timestamp</th>
//               <th>Air Temp (°C)</th>
//               <th>Humidity (%)</th>
//               <th>Water Temp (°C)</th>
//               <th>pH</th>
//               <th>Water Level (%)</th>
//             </tr>
//           </thead>
//           <tbody>
//             {data.slice(-10).reverse().map((row, index) => (
//               <tr key={index}>
//                 <td>{row.Timestamp}</td>
//                 <td>{row.AirT_C}</td>
//                 <td>{row['Humidity_%']}</td>
//                 <td>{row.WaterTemp_C}</td>
//                 <td>{row.ph}</td>
//                 <td>{row['Water_%']}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

// export default App;

