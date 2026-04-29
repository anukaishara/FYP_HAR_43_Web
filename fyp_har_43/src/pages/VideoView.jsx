import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import SMPLAnimator from '../components/SMPLAnimator';

const FPS = 30;

export default function VideoView() {
  const [appState, setAppState] = useState('UPLOAD'); 
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [progress, setProgress] = useState(0);
  const [terminalLogs, setTerminalLogs] = useState([]);
  
  // Data, Playback & Export States
  const [motionData, setMotionData] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHelpers, setShowHelpers] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  // Core Refs
  const hiddenFileInput = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunks = useRef([]);
  const frameRef = useRef(0);

  // --- Strict Validation Logic ---
  const processUploadedFile = (file) => {
    if (file && (file.type === "video/mp4" || file.name.toLowerCase().endsWith(".mp4"))) {
      setUploadError("");
      simulateBackendProcessing();
    } else {
      setUploadError("Strict format error: Only .mp4 files are accepted.");
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

  // --- Mock Backend Pipeline for Video (WHAM) ---
  const simulateBackendProcessing = () => {
    setAppState('PROCESSING');
    setProgress(0);
    setTerminalLogs(["[SYS] Initiating WHAM video pipeline..."]);

    const steps = [
      { delay: 1000, prog: 20, log: "[STAGE 1] Extracting video frames at 30 FPS..." },
      { delay: 2500, prog: 45, log: "[STAGE 2] Running 2D Keypoint Detection (ViTPose)..." },
      { delay: 4500, prog: 70, log: "[STAGE 3] Lifting to 3D Kinematics & Temporal Smoothing..." },
      { delay: 6000, prog: 100, log: "[SYS] Pipeline complete. Generating dual viewport." }
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

  // --- The Video Master Clock Sync Loop ---
  useEffect(() => {
    let animationId;
    const syncLoop = () => {
      if (videoRef.current && isPlaying && motionData.length > 0) {
        const currentFrame = Math.floor(videoRef.current.currentTime * FPS);
        frameRef.current = currentFrame;
        
        const slider = document.getElementById('video-slider');
        const counter = document.getElementById('video-counter');
        if (slider && document.activeElement !== slider) slider.value = currentFrame;
        if (counter) counter.innerText = `FRAME: ${currentFrame.toString().padStart(3, '0')} / ${motionData.length - 1}`;
      }
      animationId = requestAnimationFrame(syncLoop);
    };

    if (isPlaying) animationId = requestAnimationFrame(syncLoop);
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, motionData]);

  // --- Controls & Export ---
  const handleScrub = (e) => {
    const targetFrame = Number(e.target.value);
    frameRef.current = targetFrame;
    if (videoRef.current) videoRef.current.currentTime = targetFrame / FPS;
    const counter = document.getElementById('video-counter');
    if (counter) counter.innerText = `FRAME: ${targetFrame.toString().padStart(3, '0')} / ${motionData.length - 1}`;
  };

  const toggleRecording = () => {
    if (!isRecording) {
      if (!canvasRef.current) return;
      const stream = canvasRef.current.captureStream(FPS);
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.current.push(e.data); };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style = 'display: none';
        a.href = url;
        a.download = 'wham_reconstruction.webm';
        a.click();
        URL.revokeObjectURL(url);
        recordedChunks.current = [];
      };
      
      recordedChunks.current = [];
      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
        setIsPlaying(true);
      }
    } else {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (videoRef.current) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
    }
  };

  // --- RENDER STATES ---
  if (appState === 'UPLOAD') {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ marginBottom: '10px', letterSpacing: '2px', color: '#fff' }}>VIDEO INGESTION (GROUND TRUTH)</h1>
        <p style={{ color: '#888', marginBottom: '40px' }}>Upload source video (.mp4) for WHAM pipeline</p>
        <input type="file" accept="video/mp4" ref={hiddenFileInput} onChange={onFileSelect} style={{ display: 'none' }} />
        <div 
          onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} onClick={() => hiddenFileInput.current.click()}
          style={{ width: '500px', height: '250px', border: `2px dashed ${isDragging ? '#2ed573' : uploadError ? '#ff4757' : '#444'}`, borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: isDragging ? 'rgba(46, 213, 115, 0.05)' : '#1a1a1a', transition: 'all 0.2s' }}
        >
          <span style={{ color: isDragging ? '#2ed573' : '#666', fontSize: '1.2rem', fontWeight: 'bold' }}>{isDragging ? 'DROP MP4 NOW' : 'DRAG & DROP GROUND TRUTH .MP4'}</span>
        </div>
        {uploadError && <div style={{ marginTop: '20px', color: '#ff4757', padding: '10px', border: '1px solid #ff4757', borderRadius: '4px' }}>{uploadError}</div>}
      </div>
    );
  }

  if (appState === 'PROCESSING') {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
        <div style={{ width: '600px' }}>
          <h2 style={{ color: '#2ed573', marginBottom: '20px' }}>PROCESSING VIDEO DATA...</h2>
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
        <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', letterSpacing: '1px' }}>GROUND TRUTH VIDEO RECONSTRUCTION</h2>
        <button onClick={() => { setAppState('UPLOAD'); setIsPlaying(false); frameRef.current = 0; }} style={{ background: 'none', border: '1px solid #555', color: '#888', padding: '5px 15px', cursor: 'pointer', borderRadius: '4px' }}>NEW INGESTION</button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, borderRight: '2px solid #333', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video 
            ref={videoRef} src="/data/sprint.mp4" style={{ width: '100%', maxHeight: '100%', objectFit: 'contain' }}
            onEnded={() => setIsPlaying(false)} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} muted 
          />
        </div>
        <div style={{ flex: 1, backgroundColor: '#2a2a2a', position: 'relative' }}>
          <Canvas 
            camera={{ position: [0, 0, 3], fov: 50 }} 
            onCreated={({ gl }) => { canvasRef.current = gl.domElement; }} 
            gl={{ preserveDrawingBuffer: true }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 10, 5]} intensity={1.5} />
            <Suspense fallback={null}>
              <SMPLAnimator motionData={motionData} frameRef={frameRef} showHelpers={showHelpers} />
            </Suspense>
            <OrbitControls target={[0, 0, 0]} enablePan={true} />
          </Canvas>

          <div style={{ position: 'absolute', top: '15px', right: '15px' }}>
            <button onClick={() => setShowHelpers(!showHelpers)} style={{ background: 'rgba(0,0,0,0.6)', color: 'white', border: '1px solid #555', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>
              {showHelpers ? 'HIDE GRID' : 'SHOW GRID'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 40px', backgroundColor: '#1a1a1a', borderTop: '1px solid #333', height: '80px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button 
          onClick={toggleRecording}
          style={{ width: '120px', height: '40px', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '1px', backgroundColor: isRecording ? '#ff4757' : '#333', border: isRecording ? 'none' : '1px solid #ff4757', borderRadius: '4px', color: isRecording ? '#fff' : '#ff4757', transition: 'all 0.2s' }}
        >
          {isRecording ? 'STOP REC' : '● RECORD'}
        </button>
        <button 
          onClick={togglePlay} disabled={isRecording}
          style={{ width: '100px', height: '40px', fontWeight: 'bold', cursor: isRecording ? 'not-allowed' : 'pointer', letterSpacing: '1px', backgroundColor: isPlaying ? '#ff4757' : '#2ed573', border: 'none', borderRadius: '4px', color: '#fff', opacity: isRecording ? 0.5 : 1 }}
        >
          {isPlaying ? 'PAUSE' : 'PLAY'}
        </button>
        <input id="video-slider" type="range" min="0" max={motionData.length > 0 ? motionData.length - 1 : 100} defaultValue={0} onInput={handleScrub} style={{ flex: 1, cursor: 'pointer', accentColor: '#2ed573' }} disabled={isRecording} />
        <span id="video-counter" style={{ color: '#aaa', minWidth: '150px', textAlign: 'right', fontFamily: 'monospace', fontSize: '1.1rem' }}>
          FRAME: 000 / {motionData.length > 0 ? motionData.length - 1 : '000'}
        </span>
      </div>
    </div>
  );
}