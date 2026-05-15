import { useState, useEffect, Component } from 'react';
import { loadConfig, migrateOldConfig } from './config/storage.js';
import Setup     from './components/Setup.jsx';
import Dashboard from './components/Dashboard.jsx';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Error en render:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="max-w-lg rounded-xl border border-red-800 bg-red-900/30 p-6 text-center">
            <p className="text-lg font-bold text-red-300 mb-2">Error inesperado</p>
            <p className="text-sm text-red-400 mb-4">{this.state.error.message}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm text-white hover:bg-red-600 transition"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  useEffect(() => { migrateOldConfig(); }, []);

  const [config, setConfig] = useState(() => {
    const saved = loadConfig();
    console.log('[App] Config inicial desde localStorage:', saved);
    return saved;
  });

  function handleConnect(newConfig) {
    console.log('[App] onConnect llamado con config:', newConfig);
    setConfig(newConfig);
  }

  function handleReconfigure() {
    console.log('[App] Reconfigurando, borrando config');
    setConfig(null);
  }

  console.log('[App] Render. config:', config ? 'presente' : 'null');

  if (!config) {
    return <Setup onConnect={handleConnect} />;
  }

  return (
    <ErrorBoundary>
      <Dashboard config={config} onReconfigure={handleReconfigure} />
    </ErrorBoundary>
  );
}
