import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from './firebase';

// Import our new page
import AccelerometerView from './pages/AccelerometerView';
import VideoView from './pages/VideoView';
import CompareView from './pages/CompareView';

function LoginScreen() {
  const handleGoogleLogin = async () => {
    try { await signInWithPopup(auth, googleProvider); } 
    catch (error) { console.error("Login Failed:", error); }
  };
  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#121212', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'sans-serif' }}>
      <h1 style={{ letterSpacing: '2px', marginBottom: '10px' }}>PROJECT ID 43</h1>
      <p style={{ color: '#888', marginBottom: '40px' }}>Human Activity Reconstruction Dashboard</p>
      <button onClick={handleGoogleLogin} style={{ padding: '15px 30px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#2ed573', border: 'none', borderRadius: '4px', color: '#121212' }}>
        SIGN IN WITH GOOGLE
      </button>
    </div>
  );
}

function DashboardLayout({ children }) {
  const navigate = useNavigate(); // Hook to change URL
  const handleLogout = () => auth.signOut();

  // Highlight active menu item (basic implementation)
  const currentPath = window.location.pathname;

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#121212', color: 'white', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      <div style={{ width: '250px', backgroundColor: '#1a1a1a', borderRight: '1px solid #333', display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <h3 style={{ margin: '0 0 40px 0', fontSize: '1.1rem', letterSpacing: '1px', color: '#2ed573' }}>HAR DASHBOARD</h3>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <span 
            onClick={() => navigate('/dashboard/accelerometer')} 
            style={{ color: currentPath.includes('accelerometer') ? '#fff' : '#888', cursor: 'pointer', fontWeight: currentPath.includes('accelerometer') ? 'bold' : 'normal' }}
          >
            1. Accelerometer View
          </span>
          <span 
            onClick={() => navigate('/dashboard/video')} 
            style={{ color: currentPath.includes('video') ? '#fff' : '#888', cursor: 'pointer', fontWeight: currentPath.includes('video') ? 'bold' : 'normal' }}
          >
            2. Video View
          </span>
          <span 
            onClick={() => navigate('/dashboard/compare')} 
            style={{ color: currentPath.includes('compare') ? '#fff' : '#888', cursor: 'pointer', fontWeight: currentPath.includes('compare') ? 'bold' : 'normal' }}
          >
            3. Data Comparison
          </span>
        </div>

        <button onClick={handleLogout} style={{ padding: '10px', backgroundColor: '#ff4757', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>LOGOUT</button>
      </div>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsCheckingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  if (isCheckingAuth) return <div style={{ width: '100vw', height: '100vh', backgroundColor: '#121212' }} />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginScreen />} />
        
        {/* Protected Dashboard Routes */}
        <Route path="/dashboard" element={user ? <DashboardLayout><div style={{ padding: '40px' }}><h2>Welcome to the Engine. Select a tool from the sidebar.</h2></div></DashboardLayout> : <Navigate to="/login" />} />
        <Route path="/dashboard/accelerometer" element={user ? <DashboardLayout><AccelerometerView /></DashboardLayout> : <Navigate to="/login" />} />
        
        {/* Placeholders for Step 5 and 6 */}
        <Route path="/dashboard/video" element={user ? <DashboardLayout><VideoView /></DashboardLayout> : <Navigate to="/login" />} />
        <Route path="/dashboard/compare" element={user ? <DashboardLayout><CompareView /></DashboardLayout> : <Navigate to="/login" />} />

        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}