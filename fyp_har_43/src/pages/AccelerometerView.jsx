import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import SMPLAnimator from '../components/SMPLAnimator';

const ACCEPTED_FILE_TYPES = ["text/csv", ".csv"]; 
const FPS = 30;

export default function AccelerometerView() {
  const [appState, setAppState] = useState('UPLOAD'); 
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [progress, setProgress] = useState(0);
  const [terminalLogs, setTerminalLogs] = useState([]);
  const hiddenFileInput = useRef(null);

  // Data & Playback States
  const [motionData, setMotionData] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHelpers, setShowHelpers] = useState(true);
  
  // The Standalone Master Clock Pointer
  const frameRef = useRef(0);

  // --- Strict Validation Logic ---
  const processUploadedFile = (file) => {
    const isValidFormat = ACCEPTED_FILE_TYPES.some(type => 
      file.type === type || file.name.toLowerCase().endsWith(type.replace('text/', '.'))
    );
    if (file && isValidFormat) {
      setUploadError("");
      simulateBackendProcessing();
    } else {
      setUploadError(`Strict format error: Only ${ACCEPTED_FILE_TYPES.join(', ')} files are accepted.`);
    }
  };

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };
  const onFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) processUploadedFile(e.target.files[0]);
  };

  // --- Mock Backend Pipeline ---
  const simulateBackendProcessing = () => {
    setAppState('PROCESSING');
    setProgress(0);
    setTerminalLogs(["[SYS] Ingesting raw accelerometer CSV..."]);

    const steps = [
      { delay: 1000, prog: 20, log: "[STAGE 1] Applying Butterworth filter to sensor noise..." },
      { delay: 2500, prog: 45, log: "[STAGE 2] Segmenting sliding windows..." },
      { delay: 4500, prog: 70, log: "[STAGE 3] Running deep regression model (IMU to SMPL)..." },
      { delay: 6000, prog: 100, log: "[SYS] Pipeline complete. Rendering 3D viewport." }
    ];

    steps.forEach(({ delay, prog, log }) => {
      setTimeout(() => {
        setProgress(prog);
        setTerminalLogs(prev => [...prev, log]);
        if (prog === 100) {
          setTimeout(() => {
            fetchDummyData();
            setAppState('VIEWER');
          }, 500);
        }
      }, delay);
    });
  };

  // Temporary function to load the IPCV dummy data until the backend is live
  const fetchDummyData = () => {
    fetch('/data/motion.csv')
      .then((res) => res.text())
      .then((text) => {
        const rows = text.trim().split('\n');
        const parsed = rows.map(row => row.split(',').map(Number)).filter(row => row.length >= 72);
        setMotionData(parsed);
      })
      .catch(console.error);
  };

  // --- The Standalone Master Clock Loop ---
  useEffect(() => {
    let interval;
    if (isPlaying && motionData.length > 0) {
      const maxFrames = motionData.length;
      interval = setInterval(() => {
        frameRef.current = (frameRef.current + 1) % maxFrames; // Loop back to 0
        
        // Manual DOM update for UI speed
        const slider = document.getElementById('accel-slider');
        const counter = document.getElementById('accel-counter');
        if (slider && document.activeElement !== slider) slider.value = frameRef.current;
        if (counter) counter.innerText = `FRAME: ${frameRef.current.toString().padStart(3, '0')} / ${maxFrames - 1}`;
      }, 1000 / FPS);
    }
    return () => clearInterval(interval);
  }, [isPlaying, motionData]);

  const handleScrub = (e) => {
    frameRef.current = Number(e.target.value);
    const counter = document.getElementById('accel-counter');
    if (counter) counter.innerText = `FRAME: ${frameRef.current.toString().padStart(3, '0')} / ${motionData.length - 1}`;
  };

  // --- RENDER STATES ---
  if (appState === 'UPLOAD') {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ marginBottom: '10px', letterSpacing: '2px', color: '#fff' }}>SENSOR INGESTION</h1>
        <p style={{ color: '#888', marginBottom: '40px' }}>Upload raw accelerometer data (.csv) for Project 43</p>
        <input type="file" accept=".csv,text/csv" ref={hiddenFileInput} onChange={onFileSelect} style={{ display: 'none' }} />
        <div 
          onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} onClick={() => hiddenFileInput.current.click()}
          style={{ width: '500px', height: '250px', border: `2px dashed ${isDragging ? '#2ed573' : uploadError ? '#ff4757' : '#444'}`, borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: isDragging ? 'rgba(46, 213, 115, 0.05)' : '#1a1a1a', transition: 'all 0.2s' }}
        >
          <span style={{ color: isDragging ? '#2ed573' : '#666', fontSize: '1.2rem', fontWeight: 'bold' }}>{isDragging ? 'DROP CSV NOW' : 'DRAG & DROP ACCELEROMETER .CSV'}</span>
        </div>
        {uploadError && <div style={{ marginTop: '20px', color: '#ff4757', padding: '10px', border: '1px solid #ff4757', borderRadius: '4px' }}>{uploadError}</div>}
      </div>
    );
  }

  if (appState === 'PROCESSING') {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
        <div style={{ width: '600px' }}>
          <h2 style={{ color: '#2ed573', marginBottom: '20px' }}>PROCESSING SENSOR DATA...</h2>
          <div style={{ width: '100%', height: '10px', backgroundColor: '#333', borderRadius: '5px', overflow: 'hidden', marginBottom: '30px' }}>
            <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#2ed573', transition: 'width 0.5s ease-out' }} />
          </div>
          <div style={{ backgroundColor: '#000', border: '1px solid #333', padding: '20px', borderRadius: '5px', height: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>
            {terminalLogs.map((log, index) => <div key={index} style={{ color: index === terminalLogs.length - 1 ? '#fff' : '#666', margin: '4px 0' }}>{log}</div>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Viewport Header */}
      <div style={{ padding: '15px 30px', backgroundColor: '#1a1a1a', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', letterSpacing: '1px' }}>ACCELEROMETER RECONSTRUCTION</h2>
        <button onClick={() => { setAppState('UPLOAD'); setIsPlaying(false); frameRef.current = 0; }} style={{ background: 'none', border: '1px solid #555', color: '#888', padding: '5px 15px', cursor: 'pointer', borderRadius: '4px' }}>NEW INGESTION</button>
      </div>

      {/* 3D Canvas Area (Centered Full Width) */}
      <div style={{ flex: 1, backgroundColor: '#2a2a2a', position: 'relative' }}>
        <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 10, 5]} intensity={1.5} />
          <Suspense fallback={null}>
            <SMPLAnimator motionData={motionData} frameRef={frameRef} showHelpers={showHelpers} />
          </Suspense>
          <OrbitControls target={[0, 0, 0]} enablePan={true} />
        </Canvas>

        {/* Floating Tool */}
        <div style={{ position: 'absolute', top: '15px', right: '15px' }}>
          <button onClick={() => setShowHelpers(!showHelpers)} style={{ background: 'rgba(0,0,0,0.6)', color: 'white', border: '1px solid #555', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>
            {showHelpers ? 'HIDE GRID' : 'SHOW GRID'}
          </button>
        </div>
      </div>

      {/* Standalone Transport Deck */}
      <div style={{ padding: '20px 40px', backgroundColor: '#1a1a1a', borderTop: '1px solid #333', height: '80px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button onClick={() => setIsPlaying(!isPlaying)} style={{ width: '100px', height: '40px', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '1px', backgroundColor: isPlaying ? '#ff4757' : '#2ed573', border: 'none', borderRadius: '4px', color: '#fff' }}>
          {isPlaying ? 'PAUSE' : 'PLAY'}
        </button>
        
        <input 
          id="accel-slider" type="range" min="0" max={motionData.length > 0 ? motionData.length - 1 : 100} defaultValue={0} onInput={handleScrub} 
          style={{ flex: 1, cursor: 'pointer', accentColor: '#2ed573' }} 
        />
        
        <span id="accel-counter" style={{ color: '#aaa', minWidth: '150px', textAlign: 'right', fontFamily: 'monospace', fontSize: '1.1rem' }}>
          FRAME: 000 / {motionData.length > 0 ? motionData.length - 1 : '000'}
        </span>
      </div>
    </div>
  );
}