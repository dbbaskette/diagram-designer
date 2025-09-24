import { useState, createContext, useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DiagramView from './components/DiagramView';
import ComingSoon from './components/ComingSoon';
import Settings from './components/Settings';
import type { DiagramConfig } from './types/diagram';

const queryClient = new QueryClient();

// Create context for sharing configuration
const ConfigContext = createContext<DiagramConfig | null>(null);

export const useConfig = () => {
  const context = useContext(ConfigContext);
  return context;
};

function DiagramSelector({ selectedDiagram, onDiagramChange }: { selectedDiagram: string; onDiagramChange: (diagram: string) => void }) {
  const [availableDiagrams, setAvailableDiagrams] = useState<string[]>([]);

  useEffect(() => {
    const discoverDiagramFiles = async () => {
      try {
        // First try to get the list from our API endpoint
        try {
          const response = await fetch('/api/diagrams');
          if (response.ok) {
            const fileList = await response.json();
            setAvailableDiagrams(fileList);
            return;
          }
        } catch (error) {
          console.log('API endpoint not available, falling back to individual checks');
        }
        
        // Fallback: Check for common diagram files
        const potentialFiles = [
          'diagram-config.json',
          'Telemetry-Processing.json',
          'IMC-chatbot.json'
        ];
        
        const existingFiles: string[] = [];
        
        // Check each potential file
        for (const filename of potentialFiles) {
          try {
            const response = await fetch(`/${filename}`, { method: 'HEAD' });
            if (response.ok) {
              existingFiles.push(filename);
            }
          } catch (error) {
            // File doesn't exist, continue
          }
        }
        
        setAvailableDiagrams(existingFiles);
        
        // If no files found, fall back to the default
        if (existingFiles.length === 0) {
          setAvailableDiagrams(['diagram-config.json']);
        }
      } catch (error) {
        console.error('Error discovering diagram files:', error);
        // Fallback to known files
        setAvailableDiagrams(['diagram-config.json']);
      }
    };

    discoverDiagramFiles();
  }, []);



  return (
    <select
      value={selectedDiagram}
      onChange={(e) => onDiagramChange(e.target.value)}
      className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-1 text-sm focus:outline-none focus:border-blue-500"
    >
      {availableDiagrams.map((diagram) => (
        <option key={diagram} value={diagram}>
          {diagram.replace('.json', '').replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </option>
      ))}
    </select>
  );
}

function Header({ connected, title, selectedDiagram, onDiagramChange }: { 
  connected: boolean; 
  title?: string; 
  selectedDiagram: string;
  onDiagramChange: (diagram: string) => void;
}) {
  return (
    <header className="bg-gray-800/50 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
        <h1 className="text-xl font-semibold text-white">{title || 'Diagram Designer'}</h1>
        <DiagramSelector selectedDiagram={selectedDiagram} onDiagramChange={onDiagramChange} />
      </div>
      <div className="flex items-center gap-4">
        <button className="text-gray-400 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <path d="M12 17h.01"/>
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full mr-2 ${
            connected ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">D</div>
          <span>demo_user</span>
        </div>
      </div>
    </header>
  )
}

function Sidebar() {
  const location = useLocation()
  
  const navItems = [
    { 
      to: '/', 
      label: 'Main Diagram', 
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1"/>
        <rect width="7" height="5" x="14" y="3" rx="1"/>
        <rect width="7" height="9" x="14" y="12" rx="1"/>
        <rect width="7" height="5" x="3" y="16" rx="1"/>
      </svg>
    },
    { 
      to: '/construction1', 
      label: 'Construction 1', 
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10,9 9,9 8,9"/>
      </svg>
    },
    { 
      to: '/construction2', 
      label: 'Construction 2', 
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 18H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.19l1.4-3.43A2 2 0 0 1 9.22 2h5.56a2 2 0 0 1 1.63.57L17.81 6H21a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2"/>
        <path d="M12 13v5"/>
        <path d="m9 16 1.5-1.5L12 16l1.5-1.5L15 16"/>
      </svg>
    },
  ]
  
  const settingsIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )

  return (
    <aside className="w-20 bg-gray-800/50 border-r border-gray-700 p-4 flex flex-col items-center justify-between">
      <div className="space-y-4">
        {navItems.map(({ to, label, icon }) => {
          const isActive = location.pathname === to || (to === '/' && location.pathname === '/')
          return (
            <Link
              key={to}
              to={to}
              className={`block p-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
              title={label}
            >
              {icon}
            </Link>
          )
        })}
      </div>
      <div className="space-y-4">
        <Link
          to="/settings"
          className={`block p-3 rounded-lg transition-colors ${
            location.pathname === '/settings'
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
          title="Settings"
        >
          {settingsIcon}
        </Link>
      </div>
    </aside>
  )
}

function App() {
  const [connected] = useState(true);
  const [config, setConfig] = useState<DiagramConfig | null>(null);
  
  // Coordinates display toggle
  const [showCoordinates, setShowCoordinates] = useState(() => {
    const saved = localStorage.getItem('showCoordinates');
    return saved === 'true';
  });

  // Load selected diagram from localStorage or default to first available
  const [selectedDiagram, setSelectedDiagram] = useState(() => {
    const saved = localStorage.getItem('selectedDiagram');
    return saved || 'diagram-config.json';
  });

  // Validate that the selected diagram still exists when available diagrams change
  useEffect(() => {
    const validateSelectedDiagram = async () => {
      try {
        // Get current available diagrams
        let availableDiagrams: string[] = [];
        try {
          const response = await fetch('/api/diagrams');
          if (response.ok) {
            availableDiagrams = await response.json();
          }
        } catch (error) {
          // Fallback to known files if API not available
          availableDiagrams = ['diagram-config.json', 'Telemetry-Processing.json', 'IMC-chatbot.json'];
        }
        
        if (availableDiagrams.length > 0 && !availableDiagrams.includes(selectedDiagram)) {
          console.log(`Selected diagram "${selectedDiagram}" no longer exists, switching to first available`);
          const newSelection = availableDiagrams[0];
          setSelectedDiagram(newSelection);
          localStorage.setItem('selectedDiagram', newSelection);
        }
      } catch (error) {
        console.error('Error validating selected diagram:', error);
      }
    };
    
    validateSelectedDiagram();
  }, [selectedDiagram]);

  // Toggle coordinates display and persist to localStorage
  const toggleCoordinates = (show: boolean) => {
    setShowCoordinates(show);
    localStorage.setItem('showCoordinates', show.toString());
  };

  // Function to save current layout to JSON file
  const saveCurrentLayout = async () => {
    try {
      // Get current positions from localStorage (these are the live positions)
      const savedPositionsKey = `diagram-positions-${selectedDiagram}`;
      const currentPositions = JSON.parse(localStorage.getItem(savedPositionsKey) || '{}');
      
      if (Object.keys(currentPositions).length === 0) {
        throw new Error('No position changes found. Try moving some components first.');
      }

      // Get the current configuration
      if (!config) {
        throw new Error('No configuration loaded');
      }

      // Create a new config with updated positions
      const updatedConfig = {
        ...config,
        nodes: config.nodes.map(node => ({
          ...node,
          position: currentPositions[node.name] || node.position
        }))
      };

      // Convert to JSON string with proper formatting
      const jsonString = JSON.stringify(updatedConfig, null, 2);

      // Create and download the file
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedDiagram;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('Layout saved with positions:', currentPositions);
      
      return true;
    } catch (error) {
      console.error('Failed to save layout:', error);
      throw error;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigContext.Provider value={config}>
        <Router>
          <div className="min-h-screen bg-gray-900 flex flex-col">
            <Header 
              connected={connected} 
              title={config?.config.title} 
              selectedDiagram={selectedDiagram}
              onDiagramChange={(diagram) => {
                setSelectedDiagram(diagram);
                localStorage.setItem('selectedDiagram', diagram);
              }}
            />
            <div className="flex flex-1">
              <Sidebar />
              <main className="flex-1 overflow-hidden">
                <Routes>
                  <Route path="/" element={<DiagramView onConfigLoad={setConfig} selectedDiagram={selectedDiagram} showCoordinates={showCoordinates} />} />
                  <Route path="/construction1" element={<ComingSoon title="Construction Feature 1" />} />
                  <Route path="/construction2" element={<ComingSoon title="Construction Feature 2" />} />
                  <Route path="/settings" element={<Settings selectedDiagram={selectedDiagram} onSaveLayout={saveCurrentLayout} showCoordinates={showCoordinates} onToggleCoordinates={toggleCoordinates} />} />
                </Routes>
              </main>
            </div>
          </div>
        </Router>
      </ConfigContext.Provider>
    </QueryClientProvider>
  );
}

export default App;