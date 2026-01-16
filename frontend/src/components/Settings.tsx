import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfig } from '../App';
import TemplateModal from './TemplateModal';

interface SettingsProps {
  selectedDiagram: string;
  onSaveLayout: () => void;
  showCoordinates: boolean;
  onToggleCoordinates: (show: boolean) => void;
  onSelectTemplate?: (template: any) => void; // Made optional since it's not used anymore
  windowTitle: string;
  onWindowTitleChange: (title: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ selectedDiagram, onSaveLayout, showCoordinates, onToggleCoordinates, windowTitle, onWindowTitleChange }) => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isViewing, setIsViewing] = useState(false);
  const [currentLayout, setCurrentLayout] = useState<Record<string, { x: number; y: number }>>({});
  const [isEditingJson, setIsEditingJson] = useState(false);
  const [jsonContent, setJsonContent] = useState('');
  const [jsonError, setJsonError] = useState('');
  const config = useConfig();

  const handleSaveLayout = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      await onSaveLayout();
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save layout:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewLayout = async () => {
    setIsViewing(true);
    setJsonError('');

    try {
      // Get current positions from localStorage (live positions)
      const savedPositionsKey = `diagram-positions-${selectedDiagram}`;
      const currentPositions = JSON.parse(localStorage.getItem(savedPositionsKey) || '{}');

      // Fetch the current diagram configuration
      const response = await fetch(`/api/diagrams/${selectedDiagram}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch diagram configuration: ${response.statusText}`);
      }

      const currentConfig = await response.json();

      // Update the config with current live positions
      const updatedConfig = { ...currentConfig };
      if (updatedConfig.nodes) {
        updatedConfig.nodes = updatedConfig.nodes.map((node: any) => {
          if (currentPositions[node.name]) {
            return {
              ...node,
              position: {
                x: Math.round(currentPositions[node.name].x),
                y: Math.round(currentPositions[node.name].y)
              }
            };
          }
          return node;
        });
      }

      // Set the JSON content for editing
      setJsonContent(JSON.stringify(updatedConfig, null, 2));
      setCurrentLayout(currentPositions);

    } catch (error) {
      console.error('Error loading diagram configuration:', error);
      setJsonError('Failed to load diagram configuration. Please try again.');
    }
  };

  const handleJsonChange = (newContent: string) => {
    setJsonContent(newContent);
    setJsonError('');

    // Validate JSON syntax
    try {
      JSON.parse(newContent);
    } catch (error) {
      setJsonError(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSaveJson = async () => {
    try {
      // Validate JSON first
      const parsedJson = JSON.parse(jsonContent);

      // Create blob and download
      const blob = new Blob([JSON.stringify(parsedJson, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedDiagram;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setJsonError('');
      alert('JSON configuration downloaded successfully! Replace the file in your public/ directory.');

    } catch (error) {
      setJsonError(`Cannot save: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }
  };

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const toggleJsonEditor = () => {
    setIsEditingJson(!isEditingJson);
    if (!isEditingJson && jsonContent) {
      // Reset any errors when closing editor
      setJsonError('');
    }
  };

  const handleTemplateSelect = (template: any) => {
    localStorage.setItem('pendingTemplate', JSON.stringify(template));
    setIsTemplateModalOpen(false);
    // Navigate back to diagram view using React Router
    navigate('/');
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Configure your diagram designer preferences</p>
        </div>

        {/* Current Diagram Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-sm dark:shadow-none">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Current Diagram</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Selected File
              </label>
              <div className="bg-gray-100 dark:bg-gray-700 rounded px-3 py-2 text-gray-900 dark:text-white">
                {selectedDiagram}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Diagram Title
              </label>
              <div className="bg-gray-100 dark:bg-gray-700 rounded px-3 py-2 text-gray-900 dark:text-white">
                {config?.config.title || 'Loading...'}
              </div>
            </div>
          </div>
        </div>

        {/* Template Management */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-sm dark:shadow-none">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">New Diagram</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Start a new diagram from a template.
          </p>
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="px-6 py-3 rounded-lg font-medium transition-all duration-200 bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <i className="fas fa-plus-circle"></i>
            New from Template
          </button>
        </div>

        {/* Layout Management */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-sm dark:shadow-none">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Layout Management</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Save the current position of all components as the default layout for this diagram.
          </p>

          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={handleSaveLayout}
              disabled={isSaving}
              className={`
                px-6 py-3 rounded-lg font-medium transition-all duration-200
                ${isSaving
                  ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                }
              `}
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                  Saving Layout...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Save Current Layout
                </div>
              )}
            </button>

            <button
              onClick={handleViewLayout}
              className="px-6 py-3 rounded-lg font-medium transition-all duration-200 bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                View & Edit JSON
              </div>
            </button>

            {/* Status Messages */}
            {saveStatus === 'success' && (
              <div className="flex items-center gap-2 text-green-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Layout saved successfully!
              </div>
            )}

            {saveStatus === 'error' && (
              <div className="flex items-center gap-2 text-red-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Failed to save layout. Please try again.
              </div>
            )}
          </div>

          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">How it works:</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Captures the current X,Y position of every component</li>
              <li>• Updates the JSON configuration file</li>
              <li>• New positions become the default when diagram loads</li>
              <li>• Overrides the original positions in the config</li>
            </ul>
          </div>

          {/* JSON Configuration Editor */}
          {isViewing && (
            <div className="mt-6 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-gray-200 dark:bg-gray-800">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">JSON Configuration Editor</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleJsonEditor}
                    className={`px-3 py-1 rounded text-sm transition-colors ${isEditingJson
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-500'
                      }`}
                  >
                    {isEditingJson ? 'View Mode' : 'Edit Mode'}
                  </button>

                  {isEditingJson && (
                    <button
                      onClick={handleSaveJson}
                      disabled={!!jsonError}
                      className={`px-3 py-1 rounded text-sm transition-colors ${jsonError
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                    >
                      Download JSON
                    </button>
                  )}

                  <button
                    onClick={() => setIsViewing(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {jsonError && (
                <div className="p-3 bg-red-900/50 border-l-4 border-red-500">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-red-300 text-sm">{jsonError}</span>
                  </div>
                </div>
              )}

              <div className="p-4">
                {jsonContent ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {isEditingJson
                          ? "Edit the JSON configuration below. Live positions are already merged."
                          : "Current configuration with live component positions merged."
                        }
                      </p>
                      {!isEditingJson && Object.keys(currentLayout).length > 0 && (
                        <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded">
                          {Object.keys(currentLayout).length} live position(s) merged
                        </span>
                      )}
                    </div>

                    {isEditingJson ? (
                      <textarea
                        value={jsonContent}
                        onChange={(e) => handleJsonChange(e.target.value)}
                        className="w-full h-96 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm p-4 rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
                        placeholder="Enter your JSON configuration here..."
                        spellCheck={false}
                      />
                    ) : (
                      <pre className="w-full h-96 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono text-sm p-4 rounded border border-gray-300 dark:border-gray-600 overflow-auto whitespace-pre-wrap">
                        {jsonContent}
                      </pre>
                    )}

                    <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
                      <p>📝 <strong>Features shown:</strong> All nodes, connections, particles, styles, positions, status endpoints, icons, and global configuration</p>
                      <p>🔄 <strong>Live positions:</strong> Current component positions from the diagram are automatically merged into this view</p>
                      <p>✏️ <strong>Edit mode:</strong> Make changes and download updated JSON file to replace in your public/ directory</p>
                      <p>💾 <strong>Save workflow:</strong> Download → Replace file in public/ → Refresh browser</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 dark:text-gray-400 mb-2">
                      <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">Loading configuration...</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Display Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-sm dark:shadow-none">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Display Settings</h2>

          <div className="space-y-6">
            {/* Window Title Setting */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Window Title
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Customize the browser window/tab title
              </p>
              <input
                type="text"
                value={windowTitle}
                onChange={(e) => onWindowTitleChange(e.target.value)}
                placeholder="Diagram Designer"
                className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Show Coordinates Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Show Coordinates
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Display live X,Y coordinates on components while moving them
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCoordinates}
                  onChange={(e) => onToggleCoordinates(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {showCoordinates && (
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Coordinate Display:</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Shows X,Y position in real-time while dragging</li>
                  <li>• Appears as overlay on each component</li>
                  <li>• Updates live as you move components around</li>
                  <li>• Useful for precise positioning and alignment</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Additional Settings (Future) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm dark:shadow-none">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Other Settings</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Additional configuration options will be available here in future updates.
          </p>
        </div>
      </div>

      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={handleTemplateSelect}
      />
    </div>
  );
};

export default Settings;
