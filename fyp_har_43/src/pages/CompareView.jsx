import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import SMPLAnimator from '../components/SMPLAnimator';

const FPS = 30;

export default function CompareView() {
  const [appState, setAppState] = useState('UPLOAD'); 
  const [progress, setProgress] = useState(0);
  const [terminalLogs, setTerminalLogs] = useState([]);
  
  // Dual Data States
  const [motionDataAccel, setMotionDataAccel] = useState([]);
  const [motionDataVideo, setMotionDataVideo] = useState([]);
  
  // Playback States
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHelpers, setShowHelpers] = useState(true);
  const frameRef = useRef(0);

  // --- Mock Dual Ingestion Pipeline ---
  const simulateBackendProcessing = () => {
    setAppState('PROCESSING');
    setProgress(0);
    setTerminalLogs(["[SYS] Initiating Dual Comparison Pipeline..."]);

    const steps = [
      { delay: 1000, prog: 25, log: "[STAGE 1] Processing Video Ground Truth..." },
      { delay: 3000, prog: 50, log: "[STAGE 2] Processing Accelerometer Sensor Data..." },
      { delay: 5000, prog: 75, log: "[STAGE 3] Aligning temporal timestamps..." },
      { delay: 7000, prog: 100, log: "[SYS] Pipeline complete. Rendering dual 3D canvas." }
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

  // For prototype, loading the same CSV twice to prove the dual-engine works. 
  // In production, fetch accel.csv and video.csv separately.
  const fetchDummyData = () => {
    fetch('/data/motion.csv')
      .then((res) => res.text())
      .then((text) => {
        const rows = text.trim().split('\n');
        const parsed = rows.map(row => row.split(',').map(Number)).filter(row => row.length >= 72);
        setMotionDataAccel(parsed);
        setMotionDataVideo(parsed); 
      })
      .catch(console.error);
  };

  // --- The Master Sync Clock ---
  useEffect(() => {
    let interval;
    if (isPlaying && motionDataAccel.length > 0) {
      const maxFrames = motionDataAccel.length;
      interval = setInterval(() => {
        frameRef.current = (frameRef.current + 1) % maxFrames;
        const slider = document.getElementById('compare-slider');
        const counter = document.getElementById('compare-counter');
        if (slider && document.activeElement !== slider) slider.value = frameRef.current;
        if (counter) counter.innerText = `FRAME: ${frameRef.current.toString().padStart(3, '0')} / ${maxFrames - 1}`;
      }, 1000 / FPS);
    }
    return () => clearInterval(interval);
  }, [isPlaying, motionDataAccel]);

  const handleScrub = (e) => {
    frameRef.current = Number(e.target.value);
    const counter = document.getElementById('compare-counter');
    if (counter) counter.innerText = `FRAME: ${frameRef.current.toString().padStart(3, '0')} / ${motionDataAccel.length - 1}`;
  };

  // --- RENDER STATES ---
  if (appState === 'UPLOAD') {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ marginBottom: '10px', letterSpacing: '2px', color: '#fff' }}>DATA COMPARISON ENGINE</h1>
        <p style={{ color: '#888', marginBottom: '40px' }}>Upload both datasets to generate side-by-side reconstruction</p>
        
        <div style={{ display: 'flex', gap: '30px' }}>
          {/* Mock Upload Box 1 */}
          <div style={{ width: '300px', height: '200px', border: '2px dashed #444', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a' }}>
            <span style={{ color: '#666', fontWeight: 'bold' }}>1. UPLOAD ACCEL .CSV</span>
          </div>
          {/* Mock Upload Box 2 */}
          <div style={{ width: '300px', height: '200px', border: '2px dashed #444', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a' }}>
            <span style={{ color: '#666', fontWeight: 'bold' }}>2. UPLOAD VIDEO .MP4</span>
          </div>
        </div>

        <button 
          onClick={simulateBackendProcessing}
          style={{ marginTop: '40px', padding: '15px 40px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#2ed573', border: 'none', borderRadius: '4px', color: '#121212' }}
        >
          EXECUTE COMPARISON
        </button>
      </div>
    );
  }

  if (appState === 'PROCESSING') {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
        <div style={{ width: '600px' }}>
          <h2 style={{ color: '#2ed573', marginBottom: '20px' }}>PROCESSING DUAL PIPELINE...</h2>
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
      <div style={{ padding: '15px 30px', backgroundColor: '#1a1a1a', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', letterSpacing: '1px' }}>RECONSTRUCTION COMPARISON</h2>
        <button onClick={() => { setAppState('UPLOAD'); setIsPlaying(false); frameRef.current = 0; }} style={{ background: 'none', border: '1px solid #555', color: '#888', padding: '5px 15px', cursor: 'pointer', borderRadius: '4px' }}>NEW COMPARISON</button>
      </div>

      <div style={{ flex: 1, backgroundColor: '#2a2a2a', position: 'relative' }}>
        <Canvas camera={{ position: [0, 1, 4], fov: 50 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 10, 5]} intensity={1.5} />
          
          <Suspense fallback={null}>
            {/* Left Avatar: Accelerometer Data */}
            <SMPLAnimator motionData={motionDataAccel} frameRef={frameRef} showHelpers={showHelpers} modelPath="/models/smpl_accel.glb" position={[-1.2, 0, 0]} />
            <Text position={[-1.2, 1.5, 0]} color="#2ed573" fontSize={0.2} anchorX="center" anchorY="middle">ACCELEROMETER</Text>

            {/* Right Avatar: Video Data */}
            <SMPLAnimator motionData={motionDataVideo} frameRef={frameRef} showHelpers={showHelpers} modelPath="/models/smpl_video.glb" position={[1.2, 0, 0]} />
            <Text position={[1.2, 1.5, 0]} color="#ff4757" fontSize={0.2} anchorX="center" anchorY="middle">GROUND TRUTH</Text>
          </Suspense>
          
          <OrbitControls target={[0, 0, 0]} enablePan={true} />
        </Canvas>
        
        <div style={{ position: 'absolute', top: '15px', right: '15px' }}>
          <button onClick={() => setShowHelpers(!showHelpers)} style={{ background: 'rgba(0,0,0,0.6)', color: 'white', border: '1px solid #555', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>
            {showHelpers ? 'HIDE GRID' : 'SHOW GRID'}
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 40px', backgroundColor: '#1a1a1a', borderTop: '1px solid #333', height: '80px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button onClick={() => setIsPlaying(!isPlaying)} style={{ width: '100px', height: '40px', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '1px', backgroundColor: isPlaying ? '#ff4757' : '#2ed573', border: 'none', borderRadius: '4px', color: '#fff' }}>
          {isPlaying ? 'PAUSE' : 'PLAY'}
        </button>
        <input id="compare-slider" type="range" min="0" max={motionDataAccel.length > 0 ? motionDataAccel.length - 1 : 100} defaultValue={0} onInput={handleScrub} style={{ flex: 1, cursor: 'pointer', accentColor: '#2ed573' }} />
        <span id="compare-counter" style={{ color: '#aaa', minWidth: '150px', textAlign: 'right', fontFamily: 'monospace', fontSize: '1.1rem' }}>
          FRAME: 000 / {motionDataAccel.length > 0 ? motionDataAccel.length - 1 : '000'}
        </span>
      </div>
    </div>
  );
}