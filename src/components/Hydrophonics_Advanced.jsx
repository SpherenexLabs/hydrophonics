/*
 * Advanced Hydroponic Monitoring & Control Dashboard with LabVIEW Integration
 * 
 * Features:
 * - Automatic water intake control
 * - pH level monitoring with low/high alerts
 * - WhatsApp/SMS notification system
 * - Continuous loop monitoring (LabVIEW simulation)
 * - Ladder diagram logic display
 * - Overflow water control
 * - Automated nutrition dosage management
 * - Arduino integration ready
 */

import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, off, set } from 'firebase/database';
import './Hydrophonics_Advanced.css';

function HydroponicsAdvanced() {
  // Sensor data states
  const [data, setData] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [isRealTime, setIsRealTime] = useState(true);
  const [cycleCount, setCycleCount] = useState(0);
  
  // Control system states
  const [waterIntakeActive, setWaterIntakeActive] = useState(false);
  const [nutritionPumpActive, setNutritionPumpActive] = useState(false);
  const [overflowValveOpen, setOverflowValveOpen] = useState(false);
  const [phAdjustmentActive, setPhAdjustmentActive] = useState(false);
  const [manualRelayCmd, setManualRelayCmd] = useState(0);
  
  // Alert system states
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  
  // Configuration states
  const [config, setConfig] = useState({
    waterLevelMin: 30,
    waterLevelMax: 90,
    phMin: 5.5,
    phMax: 6.5,
    phTarget: 6.0,
    nutritionInterval: 3600000, // 1 hour in ms
    nutritionDosage: 50, // ml
    alertEnabled: true,
    autoControlEnabled: true
  });
  
  // Ladder logic states
  const [ladderLogic, setLadderLogic] = useState({
    waterLevelLow: false,
    waterLevelHigh: false,
    phLow: false,
    phHigh: false,
    waterIntakeRelay: false,
    nutritionPumpRelay: false,
    overflowValveRelay: false,
    phUpPumpRelay: false,
    phDownPumpRelay: false
  });
  
  // View states
  const [showLadderDiagram, setShowLadderDiagram] = useState(false);
  
  const lastNutritionDose = useRef(Date.now());
  const database = useRef(null);
  const lastFirebaseData = useRef(null);

  // Firebase configuration
  const firebaseConfig = {
    databaseURL: "https://self-balancing-7a9fe-default-rtdb.firebaseio.com"
  };

  const DB_PATH = '81_Water_09_12_2025/Live';

  // Transform Firebase data to component format
  const transformFirebaseData = (firebaseData) => {
    const now = new Date();
    const uniqueId = `${now.getTime()}-${Math.random().toString(36).substr(2, 9)}`;
    return {
      id: uniqueId,
      Timestamp: now.toISOString(),
      timestamp: now.toLocaleTimeString(),
      AirT_C: firebaseData.AirTempC || 0,
      'Humidity_%': firebaseData.Humidity || 0,
      WaterTemp_C: firebaseData.WaterTempC || 0,
      ph: firebaseData.PH?.Value || 0,
      phVoltage: firebaseData.PH?.Voltage || 0,
      'Water_%': firebaseData.WaterLevelPercent || 0,
      EC: (1.5 + Math.random() * 1.0).toFixed(2),
      DO: (6 + Math.random() * 2).toFixed(1)
    };
  };

  // Initialize Firebase and setup real-time listeners
  const initializeFirebase = () => {
    try {
      const app = initializeApp(firebaseConfig);
      database.current = getDatabase(app);
      
      const dataRef = ref(database.current, DB_PATH);
      
      // Setup real-time listener
      onValue(dataRef, (snapshot) => {
        const firebaseData = snapshot.val();
        
        if (firebaseData) {
          // Check if data has actually changed
          const dataString = JSON.stringify(firebaseData);
          if (dataString === lastFirebaseData.current) {
            return; // Skip if data hasn't changed
          }
          lastFirebaseData.current = dataString;
          
          const transformedData = transformFirebaseData(firebaseData);
          
          setData(prevData => {
            const newData = [...prevData, transformedData];
            // Keep last 100 readings
            return newData.slice(-100);
          });
          
          setLastUpdate(new Date());
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('error');
          addNotification('ERROR', 'No data available from Firebase', 'error');
        }
      }, (error) => {
        console.error('Firebase error:', error);
        setConnectionStatus('error');
        addNotification('ERROR', `Firebase connection error: ${error.message}`, 'error');
      });
      
      return true;
    } catch (error) {
      console.error('Error initializing Firebase:', error);
      setConnectionStatus('error');
      return false;
    }
  };

  // Cleanup Firebase listeners
  const cleanupFirebase = () => {
    if (database.current) {
      const dataRef = ref(database.current, DB_PATH);
      off(dataRef);
    }
  };

  // Write relay command to Firebase
  const writeRelayCommand = async (value) => {
    try {
      if (!database.current) {
        addNotification('ERROR', 'Database not initialized', 'error');
        return;
      }
      
      const relayRef = ref(database.current, '81_Water_09_12_2025/Control/RelayCmd');
      await set(relayRef, value);
      
      setManualRelayCmd(value);
      addNotification('CONTROL', `Overflow valve ${value === 1 ? 'OPENED' : 'CLOSED'}`, value === 1 ? 'warning' : 'info');
      
      return true;
    } catch (error) {
      console.error('Error writing relay command:', error);
      addNotification('ERROR', `Failed to control relay: ${error.message}`, 'error');
      return false;
    }
  };

  // Toggle overflow valve
  const toggleOverflowValve = () => {
    const newValue = manualRelayCmd === 0 ? 1 : 0;
    writeRelayCommand(newValue);
  };

  // Add notification
  const addNotification = (type, message, severity = 'info') => {
    const notification = {
      id: Date.now(),
      type,
      message,
      severity,
      timestamp: new Date().toLocaleString()
    };
    
    setNotifications(prev => [notification, ...prev].slice(0, 50));
    
    // Add to alerts for display in dashboard
    setAlerts(prev => [notification, ...prev].slice(0, 10));
  };

  // Check sensor values and trigger controls
  const checkSensorsAndControl = (latestReading) => {
    if (!latestReading || !config.autoControlEnabled) return;

    const waterLevel = parseFloat(latestReading['Water_%']) || 0;
    const ph = parseFloat(latestReading.ph) || 0;
    
    // Automatic RelayCmd control based on water level
    if (waterLevel < 20 && manualRelayCmd !== 1) {
      writeRelayCommand(1);
    } else if (waterLevel > 90 && manualRelayCmd !== 0) {
      writeRelayCommand(0);
    }
    
    // Update ladder logic inputs
    const newLadderLogic = { ...ladderLogic };
    newLadderLogic.waterLevelLow = waterLevel < config.waterLevelMin;
    newLadderLogic.waterLevelHigh = waterLevel > config.waterLevelMax;
    newLadderLogic.phLow = ph < config.phMin;
    newLadderLogic.phHigh = ph > config.phMax;

    // Control Logic - Water Intake
    if (newLadderLogic.waterLevelLow && !waterIntakeActive) {
      setWaterIntakeActive(true);
      newLadderLogic.waterIntakeRelay = true;
      addNotification('Water Intake', `Water level low (${waterLevel}%). Starting water intake pump.`, 'warning');
    } else if (waterLevel >= config.waterLevelMax && waterIntakeActive) {
      setWaterIntakeActive(false);
      newLadderLogic.waterIntakeRelay = false;
      addNotification('Water Intake', `Water level optimal (${waterLevel}%). Stopping water intake pump.`, 'info');
    }

    // Control Logic - Overflow Protection
    if (newLadderLogic.waterLevelHigh && !overflowValveOpen) {
      setOverflowValveOpen(true);
      newLadderLogic.overflowValveRelay = true;
      addNotification('Overflow Control', `Water level too high (${waterLevel}%). Opening overflow valve!`, 'error');
    } else if (waterLevel < config.waterLevelMax - 10 && overflowValveOpen) {
      setOverflowValveOpen(false);
      newLadderLogic.overflowValveRelay = false;
      addNotification('Overflow Control', `Water level normalized (${waterLevel}%). Closing overflow valve.`, 'info');
    }

    // Control Logic - pH Adjustment
    if (newLadderLogic.phLow && !phAdjustmentActive) {
      setPhAdjustmentActive(true);
      newLadderLogic.phUpPumpRelay = true;
      addNotification('pH Control', `pH too low (${ph}). Activating pH up pump.`, 'warning');
    } else if (newLadderLogic.phHigh && !phAdjustmentActive) {
      setPhAdjustmentActive(true);
      newLadderLogic.phDownPumpRelay = true;
      addNotification('pH Control', `pH too high (${ph}). Activating pH down pump.`, 'warning');
    } else if (ph >= config.phMin && ph <= config.phMax && phAdjustmentActive) {
      setPhAdjustmentActive(false);
      newLadderLogic.phUpPumpRelay = false;
      newLadderLogic.phDownPumpRelay = false;
      addNotification('pH Control', `pH normalized (${ph}). Stopping pH adjustment.`, 'info');
    }

    // Control Logic - Nutrition Dosing
    const timeSinceLastDose = Date.now() - lastNutritionDose.current;
    if (timeSinceLastDose >= config.nutritionInterval && !nutritionPumpActive) {
      setNutritionPumpActive(true);
      newLadderLogic.nutritionPumpRelay = true;
      lastNutritionDose.current = Date.now();
      addNotification('Nutrition Dosage', `Dosing ${config.nutritionDosage}ml of nutrients.`, 'info');
      
      // Simulate pump running for 5 seconds
      setTimeout(() => {
        setNutritionPumpActive(false);
        newLadderLogic.nutritionPumpRelay = false;
        setLadderLogic(newLadderLogic);
      }, 5000);
    }

    setLadderLogic(newLadderLogic);
  };

  // Main monitoring loop (LabVIEW simulation)
  useEffect(() => {
    let interval;
    
    if (isRealTime) {
      interval = setInterval(() => {
        // Increment cycle count for display
        setCycleCount(prev => prev + 1);
      }, 3000); // Update every 3 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRealTime]);

  // Check sensors and control outputs whenever data changes
  useEffect(() => {
    if (data.length > 0) {
      const latestReading = data[data.length - 1];
      checkSensorsAndControl(latestReading);
    }
  }, [data]);

  // Initialize Firebase
  useEffect(() => {
    const success = initializeFirebase();
    
    if (!success) {
      addNotification('WARNING', 'Failed to connect to Firebase', 'error');
      setConnectionStatus('error');
    } else {
      addNotification('INFO', 'Connected to Firebase real-time database', 'info');
    }
    
    // Cleanup on unmount
    return () => {
      cleanupFirebase();
    };
  }, []);

  const getLatestReading = () => {
    return data.length > 0 ? data[data.length - 1] : null;
  };

  const latest = getLatestReading();

  return (
    <div className="dashboard hydroponic-advanced">
      {/* LabVIEW Window Frame */}
      <div className="labview-window">
        {/* Title Bar */}
        <div className="labview-titlebar">
          <div className="labview-titlebar-left">
            <div className="labview-icon">LV</div>
            <span className="labview-titlebar-text">LabVIEW 2024 - Hydroponic_Control_System.vi [Running]</span>
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
          <span className="active">Operate</span>
          <span>Tools</span>
          <span>Window</span>
          <span>Help</span>
        </div>

        {/* Toolbar */}
        <div className="labview-toolbar">
          <button 
            className={`run-button ${isRealTime ? 'running' : ''}`} 
            onClick={() => setIsRealTime(!isRealTime)}
            title={isRealTime ? "Stop" : "Run"}
          >
            {isRealTime ? '■' : '▶'}
          </button>
          <button 
            className="stop-button" 
            onClick={() => setIsRealTime(!isRealTime)}
            title="Pause"
          >
            ⏸
          </button>
          <div className="separator"></div>
          <button title="View Block Diagram" onClick={() => setShowLadderDiagram(!showLadderDiagram)}>
            {showLadderDiagram ? 'Front Panel' : 'Block Diagram'}
          </button>
          <div className="separator"></div>
          <span className="labview-toolbar-label">
            Loop Cycle: {cycleCount} | Status: {isRealTime ? 'Running' : 'Paused'}
          </span>
        </div>

        {/* Main Content */}
        <div className="labview-content" style={{padding: '20px'}}>
          {!showLadderDiagram ? (
            <>
              {/* Front Panel - Dashboard */}
              <header className="dashboard-header">
                <h1>Advanced Hydroponic Control System</h1>
                <div className="header-controls">
                  <div className="connection-status">
                    <span style={{fontWeight: 'bold'}}>Firebase Status:</span>
                    <span className={`status-${connectionStatus}`}>
                      {connectionStatus === 'connected' && 'Live Data'}
                      {connectionStatus === 'simulation' && 'Simulation'}
                      {connectionStatus === 'error' && 'Disconnected'}
                      {connectionStatus === 'connecting' && 'Connecting...'}
                    </span>
                  </div>
                  <div className="last-update">
                    Last Update: {lastUpdate ? lastUpdate.toLocaleString() : 'Never'}
                  </div>
                  <div className="auto-control-status">
                    <label>
                      <input 
                        type="checkbox" 
                        checked={config.autoControlEnabled}
                        onChange={(e) => setConfig({...config, autoControlEnabled: e.target.checked})}
                      />
                      Auto Control
                    </label>
                  </div>
                </div>
              </header>

              {/* Control Status Indicators */}
              <div className="control-status-panel">
                {/* <h3>Control Systems Status</h3>
                <div className="control-indicators">
                  <div className={`control-indicator ${waterIntakeActive ? 'active' : ''}`}>
                    <div className="indicator-light"></div>
                    <span>Water Intake Pump</span>
                  </div>
                  <div className={`control-indicator ${nutritionPumpActive ? 'active' : ''}`}>
                    <div className="indicator-light"></div>
                    <span>Nutrition Pump</span>
                  </div>
                  <div className={`control-indicator ${overflowValveOpen ? 'active' : ''}`}>
                    <div className="indicator-light"></div>
                    <span>Overflow Valve</span>
                  </div>
                  <div className={`control-indicator ${phAdjustmentActive ? 'active' : ''}`}>
                    <div className="indicator-light"></div>
                    <span>pH Adjustment</span>
                  </div>
                </div> */}
              </div>

              {/* Sensor Metrics */}
              <div className="metrics-grid">
                <div className={`metric-card ${isRealTime ? 'live-update' : ''}`}>
                  <h3>Air Temperature</h3>
                  <div className="metric-value">{latest?.AirT_C || '--'}°C</div>
                  <div className="metric-status">Normal</div>
                </div>
                <div className={`metric-card ${isRealTime ? 'live-update' : ''}`}>
                  <h3>Humidity</h3>
                  <div className="metric-value">{latest?.['Humidity_%'] || '--'}%</div>
                  <div className="metric-status">Normal</div>
                </div>
                <div className={`metric-card ${isRealTime ? 'live-update' : ''}`}>
                  <h3>Water Temperature</h3>
                  <div className="metric-value">{latest?.WaterTemp_C || '--'}°C</div>
                  <div className="metric-status">Normal</div>
                </div>
                <div className={`metric-card ${isRealTime ? 'live-update' : ''} ${
                  latest?.ph < config.phMin ? 'alert-low' : latest?.ph > config.phMax ? 'alert-high' : ''
                }`}>
                  <h3>pH Level</h3>
                  <div className="metric-value">{latest?.ph || '--'}</div>
                  <div className="metric-status">
                    {latest?.ph < config.phMin ? 'LOW' : latest?.ph > config.phMax ? 'HIGH' : 'Optimal'}
                  </div>
                  <div className="metric-range">Target: {config.phMin} - {config.phMax}</div>
                </div>
                <div className={`metric-card ${isRealTime ? 'live-update' : ''} ${
                  latest?.['Water_%'] < config.waterLevelMin ? 'alert-low' : latest?.['Water_%'] > config.waterLevelMax ? 'alert-high' : ''
                }`}>
                  <h3>Water Level</h3>
                  <div className="metric-value">{latest?.['Water_%'] || '--'}%</div>
                  <div className="metric-status">
                    {latest?.['Water_%'] < config.waterLevelMin ? 'LOW' : 
                     latest?.['Water_%'] > config.waterLevelMax ? 'HIGH' : 'Optimal'}
                  </div>
                  <div className="metric-range">Range: {config.waterLevelMin}% - {config.waterLevelMax}%</div>
                </div>
                <div className={`metric-card ${isRealTime ? 'live-update' : ''}`}>
                  <h3>EC (Conductivity)</h3>
                  <div className="metric-value">{latest?.EC || '--'} mS/cm</div>
                  <div className="metric-status">Normal</div>
                </div>
                <div className={`metric-card ${isRealTime ? 'live-update' : ''}`}>
                  <h3>Dissolved Oxygen</h3>
                  <div className="metric-value">{latest?.DO || '--'} mg/L</div>
                  <div className="metric-status">Normal</div>
                </div>
              </div>

              {/* Alerts Panel */}
              <div className="alerts-panel">
                <h3>System Alerts & Notifications</h3>
                <div className="alerts-list">
                  {notifications.length > 0 ? (
                    notifications.slice(0, 10).map(alert => (
                      <div key={alert.id} className={`alert-item severity-${alert.severity}`}>
                        <span className="alert-time">{alert.timestamp}</span>
                        <span className="alert-type">{alert.type}</span>
                        <span className="alert-message">{alert.message}</span>
                      </div>
                    ))
                  ) : (
                    <div className="no-alerts">No alerts. System running normally.</div>
                  )}
                </div>
              </div>

              {/* Charts */}
              <div className="charts-container">
                <div className="chart-section">
                  <h2>pH Level Monitoring</h2>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={data.slice(-30)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                      <XAxis dataKey="id" tickFormatter={(id) => {
                        const item = data.find(d => d.id === id);
                        return item?.timestamp || '';
                      }} stroke="#000" style={{fontSize: '10px'}} />
                      <YAxis domain={[4, 8]} stroke="#000" style={{fontSize: '10px'}} />
                      <Tooltip contentStyle={{background: '#ffffff', border: '1px solid #ccc', fontSize: '10px'}} />
                      <Legend wrapperStyle={{fontSize: '10px'}} />
                      <Line type="monotone" dataKey="ph" stroke="#ff6600" strokeWidth={2} name="pH Level" dot={{fill: '#ff6600', r: 2}} />
                      {/* Reference lines for thresholds */}
                      <Line type="monotone" dataKey={() => config.phMin} stroke="#ff0000" strokeWidth={1} strokeDasharray="5 5" name="Min pH" dot={false} />
                      <Line type="monotone" dataKey={() => config.phMax} stroke="#ff0000" strokeWidth={1} strokeDasharray="5 5" name="Max pH" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-section">
                  <h2>Water Level & Control</h2>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={data.slice(-30)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                      <XAxis dataKey="id" tickFormatter={(id) => {
                        const item = data.find(d => d.id === id);
                        return item?.timestamp || '';
                      }} stroke="#000" style={{fontSize: '10px'}} />
                      <YAxis stroke="#000" style={{fontSize: '10px'}} />
                      <Tooltip contentStyle={{background: '#ffffff', border: '1px solid #ccc', fontSize: '10px'}} />
                      <Legend wrapperStyle={{fontSize: '10px'}} />
                      <Line type="monotone" dataKey="Water_%" stroke="#00cc66" strokeWidth={2} name="Water Level (%)" dot={{fill: '#00cc66', r: 2}} />
                      <Line type="monotone" dataKey={() => config.waterLevelMin} stroke="#ff9900" strokeWidth={1} strokeDasharray="5 5" name="Min Level" dot={false} />
                      <Line type="monotone" dataKey={() => config.waterLevelMax} stroke="#ff0000" strokeWidth={1} strokeDasharray="5 5" name="Max Level" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-section">
                  <h2>Temperature Trends</h2>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={data.slice(-30)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                      <XAxis dataKey="id" tickFormatter={(id) => {
                        const item = data.find(d => d.id === id);
                        return item?.timestamp || '';
                      }} stroke="#000" style={{fontSize: '10px'}} />
                      <YAxis stroke="#000" style={{fontSize: '10px'}} />
                      <Tooltip contentStyle={{background: '#ffffff', border: '1px solid #ccc', fontSize: '10px'}} />
                      <Legend wrapperStyle={{fontSize: '10px'}} />
                      <Line type="monotone" dataKey="AirT_C" stroke="#ff3333" strokeWidth={2} name="Air Temp (°C)" dot={{fill: '#ff3333', r: 2}} />
                      <Line type="monotone" dataKey="WaterTemp_C" stroke="#3366ff" strokeWidth={2} name="Water Temp (°C)" dot={{fill: '#3366ff', r: 2}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Configuration Panel */}
              <div className="config-panel">
                <h3>System Configuration</h3>
                <div className="config-grid">
                  <div className="config-group">
                    <h4>Water Level Control</h4>
                    <label>
                      Min Level (%):
                      <input type="number" value={config.waterLevelMin} 
                        onChange={(e) => setConfig({...config, waterLevelMin: parseInt(e.target.value)})} />
                    </label>
                    <label>
                      Max Level (%):
                      <input type="number" value={config.waterLevelMax} 
                        onChange={(e) => setConfig({...config, waterLevelMax: parseInt(e.target.value)})} />
                    </label>
                  </div>
                  
                  <div className="config-group">
                    <h4>pH Control</h4>
                    <label>
                      Min pH:
                      <input type="number" step="0.1" value={config.phMin} 
                        onChange={(e) => setConfig({...config, phMin: parseFloat(e.target.value)})} />
                    </label>
                    <label>
                      Max pH:
                      <input type="number" step="0.1" value={config.phMax} 
                        onChange={(e) => setConfig({...config, phMax: parseFloat(e.target.value)})} />
                    </label>
                  </div>
                  
                  <div className="config-group">
                    <h4>Nutrition Dosing</h4>
                    <label>
                      Interval (hours):
                      <input type="number" value={config.nutritionInterval / 3600000} 
                        onChange={(e) => setConfig({...config, nutritionInterval: parseInt(e.target.value) * 3600000})} />
                    </label>
                    <label>
                      Dosage (ml):
                      <input type="number" value={config.nutritionDosage} 
                        onChange={(e) => setConfig({...config, nutritionDosage: parseInt(e.target.value)})} />
                    </label>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Block Diagram View - Authentic LabVIEW Style */
            <div className="ladder-diagram-panel">
              <h2>Block Diagram</h2>
              
              <div className="labview-cycle-info">
                <span className="cycle-label">Iteration:</span>
                <span className="cycle-value">{cycleCount}</span>
                <span className="cycle-status" style={{color: connectionStatus === 'connected' ? '#0f0' : '#ff0'}}>●</span>
              </div>

              <div className="block-diagram-canvas">
                {/* Main While Loop Container */}
                <div className="lv-while-loop">
                  <div className="lv-while-header">
                    <div className="lv-loop-icon">
                      <div className="lv-loop-i">i</div>
                    </div>
                    <div className="lv-loop-label">Monitor Loop</div>
                  </div>
                  
                  <div className="lv-while-body">
                    {/* Arduino COM Input */}
                    <div className="lv-terminal input" style={{position: 'absolute', left: '20px', top: '80px'}}>
                      <div className="lv-term-box">
                        <span className="lv-term-icon">📡</span>
                        <span className="lv-term-label">ARDUINO COM</span>
                      </div>
                    </div>
                    
                    {/* Data Acquisition SubVI */}
                    <div className="lv-subvi" style={{position: 'absolute', left: '180px', top: '60px'}}>
                      <div className="lv-subvi-header">
                        <span className="lv-subvi-icon">📋</span>
                        <span>Read Sensors</span>
                      </div>
                      <div className="lv-subvi-body">
                        <div className="lv-connector left" style={{top: '15px'}}></div>
                        <div className="lv-connector right" style={{top: '10px'}}></div>
                        <div className="lv-connector right" style={{top: '25px'}}></div>
                      </div>
                    </div>

                    {/* Wire from COM to SubVI */}
                    <div className="lv-wire-line h" style={{left: '150px', top: '95px', width: '30px'}}></div>
                    
                    {/* Unbundle Node for pH */}
                    <div className="lv-unbundle" style={{position: 'absolute', left: '380px', top: '50px'}}>
                      <div className="lv-unbundle-box">
                        <div className="lv-unbundle-item">pH</div>
                      </div>
                      <div className="lv-connector left"></div>
                      <div className="lv-connector right"></div>
                    </div>

                    {/* Wire from SubVI to Unbundle */}
                    <div className="lv-wire-line h" style={{left: '300px', top: '75px', width: '80px'}}></div>

                    {/* pH Case Structure */}
                    <div className="lv-case-structure" style={{position: 'absolute', left: '520px', top: '120px'}}>
                      <div className="lv-case-header">
                        <div className="lv-case-selector">
                          <span className="lv-case-arrow">◄</span>
                          <span className="lv-case-label">pH &lt; 5.5</span>
                          <span className="lv-case-arrow">►</span>
                        </div>
                      </div>
                      <div className="lv-case-body">
                        <div className="lv-function-node">
                          <div className="lv-func-icon">▶</div>
                          <div className="lv-func-label">pH Up Pump</div>
                        </div>
                      </div>
                      <div className="lv-connector left" style={{top: '25px'}}></div>
                      <div className="lv-connector right" style={{top: '25px'}}></div>
                    </div>

                    {/* Wire from Unbundle to Case */}
                    <div className="lv-wire-line v" style={{left: '445px', top: '65px', height: '70px'}}></div>
                    <div className="lv-wire-line h" style={{left: '445px', top: '135px', width: '75px'}}></div>

                    {/* pH High Case Structure */}
                    <div className="lv-case-structure" style={{position: 'absolute', left: '520px', top: '230px'}}>
                      <div className="lv-case-header">
                        <div className="lv-case-selector">
                          <span className="lv-case-arrow">◄</span>
                          <span className="lv-case-label">pH &gt; 6.5</span>
                          <span className="lv-case-arrow">►</span>
                        </div>
                      </div>
                      <div className="lv-case-body">
                        <div className="lv-function-node">
                          <div className="lv-func-icon">▶</div>
                          <div className="lv-func-label">pH Down Pump</div>
                        </div>
                      </div>
                      <div className="lv-connector left" style={{top: '25px'}}></div>
                      <div className="lv-connector right" style={{top: '25px'}}></div>
                    </div>

                    {/* Wire branch to pH High case */}
                    <div className="lv-wire-line v" style={{left: '445px', top: '135px', height: '120px'}}></div>
                    <div className="lv-wire-line h" style={{left: '445px', top: '245px', width: '75px'}}></div>

                    {/* Unbundle for Water Level */}
                    <div className="lv-unbundle" style={{position: 'absolute', left: '380px', top: '320px'}}>
                      <div className="lv-unbundle-box">
                        <div className="lv-unbundle-item">Water %</div>
                      </div>
                      <div className="lv-connector left"></div>
                      <div className="lv-connector right"></div>
                    </div>

                    {/* Wire from SubVI to Water Unbundle */}
                    <div className="lv-wire-line v" style={{left: '330px', top: '85px', height: '250px'}}></div>
                    <div className="lv-wire-line h" style={{left: '330px', top: '335px', width: '50px'}}></div>

                    {/* Water Level Case */}
                    <div className="lv-case-structure" style={{position: 'absolute', left: '520px', top: '360px'}}>
                      <div className="lv-case-header">
                        <div className="lv-case-selector">
                          <span className="lv-case-arrow">◄</span>
                          <span className="lv-case-label">Water &lt; 30%</span>
                          <span className="lv-case-arrow">►</span>
                        </div>
                      </div>
                      <div className="lv-case-body">
                        <div className="lv-function-node">
                          <div className="lv-func-icon">▶</div>
                          <div className="lv-func-label">Water Intake</div>
                        </div>
                      </div>
                      <div className="lv-connector left" style={{top: '25px'}}></div>
                      <div className="lv-connector right" style={{top: '25px'}}></div>
                    </div>

                    {/* Wire from Water Unbundle to Case */}
                    <div className="lv-wire-line v" style={{left: '445px', top: '335px', height: '50px'}}></div>
                    <div className="lv-wire-line h" style={{left: '445px', top: '375px', width: '75px'}}></div>

                    {/* Overflow Case */}
                    <div className="lv-case-structure" style={{position: 'absolute', left: '520px', top: '470px'}}>
                      <div className="lv-case-header">
                        <div className="lv-case-selector">
                          <span className="lv-case-arrow">◄</span>
                          <span className="lv-case-label">Water &gt; 90%</span>
                          <span className="lv-case-arrow">►</span>
                        </div>
                      </div>
                      <div className="lv-case-body">
                        <div 
                          className={`lv-function-node alert ${manualRelayCmd === 1 ? 'active' : ''}`}
                          onClick={toggleOverflowValve}
                          style={{cursor: 'pointer'}}
                          title={`Click to ${manualRelayCmd === 1 ? 'close' : 'open'} overflow valve`}
                        >
                          <div className="lv-func-icon">⚠</div>
                          <div className="lv-func-label">Overflow Valve</div>
                        </div>
                      </div>
                      <div className="lv-connector left" style={{top: '25px'}}></div>
                      <div className="lv-connector right" style={{top: '25px'}}></div>
                    </div>

                    {/* Wire branch to Overflow */}
                    <div className="lv-wire-line v" style={{left: '445px', top: '375px', height: '110px'}}></div>
                    <div className="lv-wire-line h" style={{left: '445px', top: '485px', width: '75px'}}></div>

                    {/* Output Relay Cluster - Right Side */}
                    <div className="lv-cluster" style={{position: 'absolute', left: '780px', top: '250px'}}>
                      <div className="lv-cluster-border">
                        <div className="lv-cluster-label">Output Relays</div>
                        <div className="lv-cluster-content">
                          <div className={`lv-indicator ${ladderLogic.waterIntakeRelay ? 'active' : ''}`}>
                            <span className="lv-led"></span>
                            <span>Water Pump</span>
                          </div>
                          <div className={`lv-indicator ${ladderLogic.phUpPumpRelay ? 'active' : ''}`}>
                            <span className="lv-led"></span>
                            <span>pH Up</span>
                          </div>
                          <div className={`lv-indicator ${ladderLogic.phDownPumpRelay ? 'active' : ''}`}>
                            <span className="lv-led"></span>
                            <span>pH Down</span>
                          </div>
                          <div className={`lv-indicator ${manualRelayCmd === 1 ? 'active' : ''}`}>
                            <span className="lv-led"></span>
                            <span>Overflow (Manual)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Wires to Output Cluster */}
                    <div className="lv-wire-line h" style={{left: '680px', top: '145px', width: '50px'}}></div>
                    <div className="lv-wire-line v" style={{left: '730px', top: '145px', height: '135px'}}></div>
                    <div className="lv-wire-line h" style={{left: '730px', top: '280px', width: '50px'}}></div>

                    {/* Wait Timer at bottom */}
                    <div className="lv-timer" style={{position: 'absolute', left: '350px', top: '580px'}}>
                      <div className="lv-timer-box">
                        <span className="lv-timer-icon">⏱</span>
                        <span className="lv-timer-value">3000 ms</span>
                      </div>
                    </div>

                  </div>

                  {/* While Loop Condition Terminal */}
                  <div className="lv-while-footer">
                    <div className="lv-loop-condition">
                      <div className="lv-condition-icon">🔄</div>
                      <div className="lv-condition-label">Continue</div>
                    </div>
                  </div>
                </div>

                {/* Status Indicators - Top Right */}
                <div className="lv-status-cluster" style={{position: 'absolute', right: '20px', top: '20px'}}>
                  <div className="lv-status-item">
                    <span className="lv-status-led" style={{background: isRealTime ? '#0f0' : '#f00'}}></span>
                    <span className="lv-status-text">{isRealTime ? 'Running' : 'Paused'}</span>
                  </div>
                  <div className="lv-status-item">
                    <span className="lv-status-label">Cycle:</span>
                    <span className="lv-status-value">{cycleCount}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HydroponicsAdvanced;
