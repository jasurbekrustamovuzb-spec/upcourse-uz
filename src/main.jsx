import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class AppErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Sahifa renderida kutilmagan xatolik:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main style={{ minHeight: '100vh', display: 'grid', placeContent: 'center', padding: 24, textAlign: 'center', background: '#EFE9D6', color: '#262A1E', fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ margin: '0 0 8px', fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 28 }}>Sahifa yuklanmadi</h1>
          <p style={{ margin: '0 0 20px', color: '#5C6152' }}>Qayta yuklab ko‘ring.</p>
          <button type="button" onClick={() => window.location.reload()} style={{ justifySelf: 'center', minHeight: 42, padding: '0 18px', border: 0, borderRadius: 4, background: '#1F3D2B', color: '#FBFAF3', font: '600 14px system-ui, sans-serif', cursor: 'pointer' }}>
            Qayta yuklash
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
