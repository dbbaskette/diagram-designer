import { useState, createContext, useContext, useEffect, useMemo, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DiagramView from './components/DiagramView';
import Settings from './components/Settings';
import CommandPalette from './components/CommandPalette';
import type { Command } from './components/CommandPalette';
import type { DiagramConfig } from './types/diagram';
import { MetricsProvider } from './context/MetricsContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { dispatchDiagramAction } from './utils/diagramActions';

const queryClient = new QueryClient();

const ConfigContext = createContext<DiagramConfig | null>(null);
export const useConfig = () => useContext(ConfigContext);

const DiagramsContext = createContext<string[]>([]);
export const useAvailableDiagrams = () => useContext(DiagramsContext);

const formatDiagramLabel = (diagram: string) =>
  diagram.replace('.json', '').replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

const readDiagramFromUrl = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  return params.get('d');
};

function DiagramSelector({ selectedDiagram, onDiagramChange }: { selectedDiagram: string; onDiagramChange: (diagram: string) => void }) {
  const availableDiagrams = useAvailableDiagrams();

  return (
    <select
      value={selectedDiagram}
      onChange={(e) => onDiagramChange(e.target.value)}
      className="bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded px-3 py-1 text-sm focus:outline-none focus:border-blue-500 transition-colors"
    >
      {availableDiagrams.map((diagram) => (
        <option key={diagram} value={diagram}>
          {formatDiagramLabel(diagram)}
        </option>
      ))}
    </select>
  );
}

function Header({
  connected,
  title,
  selectedDiagram,
  onDiagramChange,
  onOpenPalette,
}: {
  connected: boolean;
  title?: string;
  selectedDiagram: string;
  onDiagramChange: (diagram: string) => void;
  onOpenPalette: () => void;
}) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-white/80 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between backdrop-blur-sm transition-colors duration-300">
      <div className="flex items-center gap-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white transition-colors">{title || 'Diagram Designer'}</h1>
        <DiagramSelector selectedDiagram={selectedDiagram} onDiagramChange={onDiagramChange} />
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenPalette}
          className="hidden md:flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-sm"
          title="Open command palette"
          data-testid="open-palette"
        >
          <i className="fas fa-search text-xs"></i>
          <span>Search</span>
          <kbd className="text-[10px] px-1 py-0.5 rounded border border-gray-300 dark:border-gray-600">⌘K</kbd>
        </button>
        <button
          onClick={toggleTheme}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <i className="fas fa-sun text-yellow-400"></i>
          ) : (
            <i className="fas fa-moon text-blue-600 dark:text-blue-400"></i>
          )}
        </button>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">D</div>
          <span className="text-gray-600 dark:text-gray-300 transition-colors">demo_user</span>
        </div>
      </div>
    </header>
  );
}

function Sidebar() {
  const location = useLocation();

  const navItems = [
    {
      to: '/',
      label: 'Main Diagram',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>,
    },
  ];

  const settingsIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  return (
    <aside className="w-20 bg-white/50 dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-700 p-4 flex flex-col items-center justify-between transition-colors duration-300">
      <div className="space-y-4">
        {navItems.map(({ to, label, icon }) => {
          const isActive = location.pathname === to || (to === '/' && location.pathname === '/');
          return (
            <Link
              key={to}
              to={to}
              className={`block p-3 rounded-lg transition-colors ${isActive
                ? 'bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
              title={label}
            >
              {icon}
            </Link>
          );
        })}
      </div>
      <div className="space-y-4">
        <Link
          to="/settings"
          className={`block p-3 rounded-lg transition-colors ${location.pathname === '/settings'
            ? 'bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-white'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
            }`}
          title="Settings"
        >
          {settingsIcon}
        </Link>
      </div>
    </aside>
  );
}

function AppShell({
  connected,
  config,
  selectedDiagram,
  onDiagramChange,
  showCoordinates,
  toggleCoordinates,
  templateConfig,
  saveCurrentLayout,
  handleSelectTemplate,
  windowTitle,
  updateWindowTitle,
  onConfigLoad,
}: {
  connected: boolean;
  config: DiagramConfig | null;
  selectedDiagram: string;
  onDiagramChange: (diagram: string) => void;
  showCoordinates: boolean;
  toggleCoordinates: (show: boolean) => void;
  templateConfig: DiagramConfig | null;
  saveCurrentLayout: () => Promise<boolean>;
  handleSelectTemplate: (template: any) => void;
  windowTitle: string;
  updateWindowTitle: (title: string) => void;
  onConfigLoad: (config: DiagramConfig) => void;
}) {
  const { toggleTheme } = useTheme();
  const navigate = useNavigate();
  const availableDiagrams = useAvailableDiagrams();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const commands: Command[] = useMemo(() => {
    const cmds: Command[] = [
      ...availableDiagrams.map<Command>((d) => ({
        id: `diagram-${d}`,
        label: `Open: ${formatDiagramLabel(d)}`,
        hint: d,
        icon: 'fas fa-project-diagram',
        group: 'Diagram',
        keywords: ['switch', 'open', 'load', d],
        run: () => onDiagramChange(d),
      })),
      {
        id: 'go-settings',
        label: 'Go to Settings',
        icon: 'fas fa-cog',
        group: 'Navigate',
        keywords: ['preferences', 'config'],
        run: () => navigate('/settings'),
      },
      {
        id: 'go-diagram',
        label: 'Go to Main Diagram',
        icon: 'fas fa-sitemap',
        group: 'Navigate',
        run: () => navigate('/'),
      },
      {
        id: 'toggle-theme',
        label: 'Toggle Light/Dark Theme',
        icon: 'fas fa-adjust',
        group: 'View',
        keywords: ['dark', 'light', 'mode'],
        run: () => toggleTheme(),
      },
      {
        id: 'toggle-coordinates',
        label: showCoordinates ? 'Hide node coordinates' : 'Show node coordinates',
        icon: 'fas fa-crosshairs',
        group: 'View',
        run: () => toggleCoordinates(!showCoordinates),
      },
      {
        id: 'auto-arrange',
        label: 'Auto-arrange diagram',
        hint: 'Dagre',
        icon: 'fas fa-sitemap',
        group: 'Action',
        keywords: ['layout', 'arrange', 'dagre'],
        run: () => dispatchDiagramAction('auto-layout'),
      },
      {
        id: 'reset-layout',
        label: 'Reset diagram layout',
        icon: 'fas fa-undo',
        group: 'Action',
        keywords: ['restore', 'default', 'positions'],
        run: () => dispatchDiagramAction('reset-layout'),
      },
      {
        id: 'refresh-metrics',
        label: 'Refresh metrics now',
        icon: 'fas fa-sync',
        group: 'Action',
        keywords: ['reload', 'update', 'fetch'],
        run: () => dispatchDiagramAction('refresh-metrics'),
      },
      {
        id: 'fit-view',
        label: 'Fit diagram to screen',
        icon: 'fas fa-expand',
        group: 'View',
        keywords: ['zoom', 'reset', 'center'],
        run: () => dispatchDiagramAction('fit-view'),
      },
      {
        id: 'export-image',
        label: 'Export diagram as PNG',
        icon: 'fas fa-download',
        group: 'Action',
        keywords: ['png', 'image', 'screenshot'],
        run: () => dispatchDiagramAction('export-image'),
      },
    ];
    return cmds;
  }, [availableDiagrams, onDiagramChange, navigate, toggleTheme, showCoordinates, toggleCoordinates]);

  // Open palette on Cmd/Ctrl+K
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors duration-300">
      <Header
        connected={connected}
        title={config?.config.title}
        selectedDiagram={selectedDiagram}
        onDiagramChange={onDiagramChange}
        onOpenPalette={() => setPaletteOpen(true)}
      />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={
              <DiagramView
                onConfigLoad={onConfigLoad}
                selectedDiagram={selectedDiagram}
                showCoordinates={showCoordinates}
                initialConfig={templateConfig}
              />
            } />
            <Route path="/settings" element={
              <Settings
                selectedDiagram={selectedDiagram}
                onSaveLayout={saveCurrentLayout}
                showCoordinates={showCoordinates}
                onToggleCoordinates={toggleCoordinates}
                onSelectTemplate={handleSelectTemplate}
                windowTitle={windowTitle}
                onWindowTitleChange={updateWindowTitle}
              />
            } />
          </Routes>
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </div>
  );
}

function App() {
  const [connected] = useState(true);
  const [config, setConfig] = useState<DiagramConfig | null>(null);
  const [templateConfig, setTemplateConfig] = useState<DiagramConfig | null>(null);
  const [availableDiagrams, setAvailableDiagrams] = useState<string[]>([]);

  const [windowTitle, setWindowTitle] = useState(() => localStorage.getItem('windowTitle') || 'Diagram Designer');

  useEffect(() => {
    document.title = windowTitle;
  }, [windowTitle]);

  const [showCoordinates, setShowCoordinates] = useState(() => localStorage.getItem('showCoordinates') === 'true');

  const [selectedDiagram, setSelectedDiagram] = useState(() => {
    const fromUrl = readDiagramFromUrl();
    if (fromUrl) return fromUrl;
    return localStorage.getItem('selectedDiagram') || 'diagram-config.json';
  });

  // Load list of diagrams once
  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/diagrams');
        if (response.ok) {
          const list = await response.json();
          setAvailableDiagrams(list);
          return;
        }
      } catch {
        // fall through to fallback
      }
      setAvailableDiagrams(['diagram-config.json', 'Telemetry-Processing.json', 'IMC-chatbot.json']);
    };
    load();
  }, []);

  // Validate selectedDiagram against available list
  useEffect(() => {
    if (availableDiagrams.length > 0 && !availableDiagrams.includes(selectedDiagram)) {
      const fallback = availableDiagrams[0];
      setSelectedDiagram(fallback);
      localStorage.setItem('selectedDiagram', fallback);
    }
  }, [availableDiagrams, selectedDiagram]);

  // Sync selectedDiagram to URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('d') !== selectedDiagram) {
      params.set('d', selectedDiagram);
      const queryString = params.toString();
      const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}${window.location.hash}`;
      window.history.replaceState(null, '', nextUrl);
    }
  }, [selectedDiagram]);

  const handleDiagramChange = useCallback((diagram: string) => {
    setSelectedDiagram(diagram);
    localStorage.setItem('selectedDiagram', diagram);
    setTemplateConfig(null);
  }, []);

  const toggleCoordinates = useCallback((show: boolean) => {
    setShowCoordinates(show);
    localStorage.setItem('showCoordinates', show.toString());
  }, []);

  const updateWindowTitle = useCallback((title: string) => {
    setWindowTitle(title);
    localStorage.setItem('windowTitle', title);
  }, []);

  const saveCurrentLayout = async () => {
    const savedPositionsKey = `diagram-positions-${selectedDiagram}`;
    const currentPositions = JSON.parse(localStorage.getItem(savedPositionsKey) || '{}');

    if (Object.keys(currentPositions).length === 0) {
      throw new Error('No position changes found. Try moving some components first.');
    }
    if (!config) {
      throw new Error('No configuration loaded');
    }

    const updatedConfig = {
      ...config,
      nodes: config.nodes.map((node) => ({
        ...node,
        position: currentPositions[node.name] || node.position,
      })),
    };

    const blob = new Blob([JSON.stringify(updatedConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedDiagram;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  };

  const handleSelectTemplate = (template: any) => {
    setTemplateConfig(template.config);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <MetricsProvider>
        <ThemeProvider>
          <ConfigContext.Provider value={config}>
            <DiagramsContext.Provider value={availableDiagrams}>
              <Router>
                <AppShell
                  connected={connected}
                  config={config}
                  selectedDiagram={selectedDiagram}
                  onDiagramChange={handleDiagramChange}
                  showCoordinates={showCoordinates}
                  toggleCoordinates={toggleCoordinates}
                  templateConfig={templateConfig}
                  saveCurrentLayout={saveCurrentLayout}
                  handleSelectTemplate={handleSelectTemplate}
                  windowTitle={windowTitle}
                  updateWindowTitle={updateWindowTitle}
                  onConfigLoad={setConfig}
                />
              </Router>
            </DiagramsContext.Provider>
          </ConfigContext.Provider>
        </ThemeProvider>
      </MetricsProvider>
    </QueryClientProvider>
  );
}

export default App;
