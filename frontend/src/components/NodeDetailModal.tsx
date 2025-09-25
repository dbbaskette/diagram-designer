import React from 'react';
import { createPortal } from 'react-dom';
import type { NodeData } from '../types/diagram';

interface NodeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeData: NodeData;
  nodeDetails?: NodeDetailConfig;
}

export interface NodeDetailConfig {
  title?: string;
  description?: string;
  modalSize?: {
    width?: string;  // e.g., "800px", "90%", "90vw"
    height?: string; // e.g., "600px", "80%", "80vh"
    maxWidth?: string; // e.g., "1200px"
    maxHeight?: string; // e.g., "900px"
  };
  sections?: NodeDetailSection[];
  links?: NodeDetailLink[];
  customPage?: {
    type: 'iframe' | 'markdown' | 'html' | 'html-file' | 'components';
    content?: string;
    file?: string;
    layout?: DashboardComponent[];
  };
}

export interface NodeDetailSection {
  title: string;
  type: 'info' | 'metrics' | 'status' | 'logs' | 'custom';
  content: string | React.ReactNode;
  icon?: string;
}

export interface NodeDetailLink {
  label: string;
  url: string;
  icon?: string;
  type?: 'primary' | 'secondary' | 'external';
}

export interface DashboardComponent {
  type: 'section' | 'rectangle' | 'grid' | 'metric-card' | 'progress-bar' | 'feature-weight';
  bg_color?: string;
  text_color?: string;
  border_color?: string;
  className?: string;
  title?: string;
  key?: string;
  value?: string;
  value_class?: string;
  percentage?: number;
  width?: string;
  components?: DashboardComponent[];
  grid_cols?: number;
  gap?: string;
}

// Color mapping for consistent styling
const getColorClasses = (color?: string) => {
  if (!color) return '';

  const colorMap: { [key: string]: string } = {
    'blue-gradient': 'bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800',
    'white-10': 'bg-white bg-opacity-10 backdrop-blur-sm',
    'white-20': 'bg-white bg-opacity-20',
    'white': 'bg-white',
    'gray-50': 'bg-gray-50',
    'gray-100': 'bg-gray-100',
    'text-white': 'text-white',
    'text-gray-900': 'text-gray-900',
    'text-gray-800': 'text-gray-800',
    'text-gray-700': 'text-gray-700',
    'text-blue-200': 'text-blue-200',
    'border-white-20': 'border border-white border-opacity-20',
    'border-gray-200': 'border border-gray-200',
  };

  return colorMap[color] || color;
};

// Component renderer
const renderDashboardComponent = (component: DashboardComponent, index: number): React.ReactNode => {
  const bgClass = getColorClasses(component.bg_color);
  const textClass = getColorClasses(component.text_color);
  const borderClass = getColorClasses(component.border_color);

  const baseClasses = `${bgClass} ${textClass} ${borderClass} ${component.className || ''}`.trim();

  switch (component.type) {
    case 'section':
      return (
        <div key={index} className={`rounded-lg p-6 mb-6 shadow-xl ${baseClasses}`}>
          {component.title && (
            <h2 className="text-2xl font-bold mb-4">{component.title}</h2>
          )}
          {component.components?.map((child, childIndex) =>
            renderDashboardComponent(child, childIndex)
          )}
        </div>
      );

    case 'grid':
      const gridCols = component.grid_cols || 4;
      const gap = component.gap || '6';
      return (
        <div key={index} className={`grid grid-cols-${gridCols} gap-${gap} mb-8 ${baseClasses}`}>
          {component.components?.map((child, childIndex) =>
            renderDashboardComponent(child, childIndex)
          )}
        </div>
      );

    case 'metric-card':
      return (
        <div key={index} className={`rounded-lg p-4 ${baseClasses}`}>
          <div className={`text-3xl font-bold mb-1 ${component.value_class || ''}`}>
            {component.value}
          </div>
          <div className="text-sm font-medium">{component.key}</div>
        </div>
      );

    case 'rectangle':
      return (
        <div key={index} className={`rounded-lg p-4 ${baseClasses}`}>
          {component.value && (
            <div className={`text-3xl font-bold mb-1 ${component.value_class || ''}`}>
              {component.value}
            </div>
          )}
          {component.key && (
            <div className="text-sm font-medium">{component.key}</div>
          )}
        </div>
      );

    case 'feature-weight':
      return (
        <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${baseClasses}`}>
          <div className="flex items-center space-x-3">
            <div className={`w-2 h-2 rounded-full ${component.bg_color === 'orange' ? 'bg-orange-400' :
              component.bg_color === 'yellow' ? 'bg-yellow-400' :
              component.bg_color === 'red' ? 'bg-red-400' :
              component.bg_color === 'green' ? 'bg-green-400' :
              component.bg_color === 'purple' ? 'bg-purple-400' : 'bg-gray-400'}`}>
            </div>
            <span className="font-medium">{component.key}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-32 bg-white bg-opacity-20 rounded-full h-2`}>
              <div className={`h-2 rounded-full ${component.bg_color === 'orange' ? 'bg-orange-400' :
                component.bg_color === 'yellow' ? 'bg-yellow-400' :
                component.bg_color === 'red' ? 'bg-red-400' :
                component.bg_color === 'green' ? 'bg-green-400' :
                component.bg_color === 'purple' ? 'bg-purple-400' : 'bg-gray-400'}`}
                style={{ width: `${component.percentage || 0}%` }}>
              </div>
            </div>
            <span className="font-mono text-sm font-bold w-12 text-right">{component.value}</span>
          </div>
        </div>
      );

    case 'progress-bar':
      return (
        <div key={index} className={`${baseClasses}`}>
          <div className="flex justify-between mb-1 text-sm">
            <span>{component.key}</span>
            <span className="font-medium">{component.value}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full"
              style={{ width: `${component.percentage || 0}%` }}
            ></div>
          </div>
        </div>
      );

    default:
      return null;
  }
};

const NodeDetailModal: React.FC<NodeDetailModalProps> = ({
  isOpen,
  onClose,
  nodeData,
  nodeDetails
}) => {

  // Default content if no specific page is configured
  const defaultContent: NodeDetailConfig = {
    title: `${nodeData.displayName} Details`,
    description: nodeData.description,
    sections: [
      {
        title: '🔧 Configuration',
        type: 'info' as const,
        content: `
          <div class="space-y-3">
            <div><strong>Node Name:</strong> ${nodeData.name}</div>
            <div><strong>Description:</strong> ${nodeData.description}</div>
            ${nodeData.url ? `<div><strong>External URL:</strong> <a href="${nodeData.url}" target="_blank" class="text-blue-500 hover:underline">${nodeData.url}</a></div>` : ''}
          </div>
        `
      },
      {
        title: '📊 Current Metrics',
        type: 'metrics' as const,
        content: `
          <div class="space-y-2">
            ${nodeData.dataGrid.map(metric => `
              <div class="flex justify-between p-2 bg-gray-50 rounded">
                <span>${metric.label}</span>
                <span class="font-mono text-sm">Loading...</span>
              </div>
            `).join('')}
          </div>
        `
      },
      {
        title: '📝 How to Add Custom Details',
        type: 'info' as const,
        content: `
          <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 class="font-bold text-yellow-800 mb-2">🎯 Want to customize this page?</h4>
            <p class="text-yellow-700 mb-3">Create a detail configuration for this node:</p>
            <ol class="list-decimal list-inside text-yellow-700 space-y-1 text-sm">
              <li>Create <code class="bg-yellow-100 px-1 rounded">/configs/details/${nodeData.name}.json</code></li>
              <li>Define sections, links, and custom content</li>
              <li>Supports info panels, metrics, status, logs, and custom HTML</li>
              <li>Add iframe embeds, markdown content, or custom components</li>
            </ol>
            <div class="mt-3 p-2 bg-yellow-100 rounded text-xs">
              <strong>Example:</strong> <code>/configs/details/${nodeData.name}.json</code>
            </div>
          </div>
        `
      }
    ],
    links: nodeData.url ? [
      {
        label: '🔗 Open External Dashboard',
        url: nodeData.url,
        type: 'external' as const
      }
    ] : []
  };

  const content = nodeDetails || defaultContent;

  const modalContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-lg shadow-xl overflow-hidden relative"
        style={{
          width: content.modalSize?.width || '90%',
          height: content.modalSize?.height || 'auto',
          maxWidth: content.modalSize?.maxWidth || '64rem',
          maxHeight: content.modalSize?.maxHeight || '90vh',
          margin: '0 1rem'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-50 border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: nodeData.circleColor || '#22c55e' }}
            >
              {nodeData.icon?.startsWith('fa') ? (
                <i className={nodeData.icon}></i>
              ) : nodeData.icon?.startsWith('/') ? (
                <img src={nodeData.icon} alt="" className="w-6 h-6" />
              ) : (
                <span>{nodeData.icon}</span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{content.title}</h2>
              {content.description && (
                <p className="text-gray-600 text-sm">{content.description}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Custom Page Content */}
          {content.customPage ? (
            <div className="mb-6">
              {content.customPage.type === 'iframe' && content.customPage.content && (
                <iframe
                  src={content.customPage.content}
                  className="w-full h-96 border rounded"
                  title={`${nodeData.name} Details`}
                />
              )}
              {content.customPage.type === 'html' && content.customPage.content && (
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: content.customPage.content }}
                />
              )}
              {content.customPage.type === 'markdown' && content.customPage.content && (
                <div className="prose max-w-none">
                  {/* TODO: Add markdown parser */}
                  <pre>{content.customPage.content}</pre>
                </div>
              )}
              {content.customPage.type === 'components' && content.customPage.layout && (
                <div className="dashboard-components">
                  {content.customPage.layout.map((component, index) =>
                    renderDashboardComponent(component, index)
                  )}
                </div>
              )}
              {content.customPage.type === 'html-file' && content.customPage.file && (
                <iframe
                  src={`/configs/details/${content.customPage.file}?t=${Date.now()}`}
                  className="w-full border-0 rounded"
                  style={{
                    height: content.modalSize?.height ?
                      `calc(${content.modalSize.height} - 120px)` : '600px'
                  }}
                  title={`${nodeData.name} Dashboard`}
                />
              )}
            </div>
          ) : (
            // Try to load HTML file directly by node name
            <div className="mb-6">
              <iframe
                src={`/configs/details/${nodeData.name}.html?t=${Date.now()}`}
                className="w-full border-0 rounded"
                style={{
                  height: content.modalSize?.height ?
                    `calc(${content.modalSize.height} - 120px)` : '600px'
                }}
                title={`${nodeData.name} Dashboard`}
                onError={(e) => {
                  // Hide iframe if HTML file doesn't exist
                  (e.target as HTMLIFrameElement).style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Sections */}
          {content.sections && (
            <div className="space-y-6">
              {content.sections.map((section, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    {section.icon && <span className="mr-2">{section.icon}</span>}
                    {section.title}
                  </h3>
                  <div
                    className={`
                      ${section.type === 'info' ? 'prose prose-sm max-w-none' : ''}
                      ${section.type === 'metrics' ? 'space-y-2' : ''}
                      ${section.type === 'status' ? 'flex items-center space-x-2' : ''}
                    `}
                  >
                    {typeof section.content === 'string' ? (
                      <div dangerouslySetInnerHTML={{ __html: section.content }} />
                    ) : (
                      section.content
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Links */}
          {content.links && content.links.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-lg font-semibold mb-3">🔗 Quick Links</h3>
              <div className="flex flex-wrap gap-3">
                {content.links.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`
                      px-4 py-2 rounded-lg font-medium inline-flex items-center space-x-2 transition-colors
                      ${link.type === 'primary' ? 'bg-blue-500 hover:bg-blue-600 text-white' : ''}
                      ${link.type === 'secondary' ? 'bg-gray-500 hover:bg-gray-600 text-white' : ''}
                      ${!link.type || link.type === 'external' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
                    `}
                  >
                    {link.icon && <span>{link.icon}</span>}
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return createPortal(modalContent, document.body);
};

export default NodeDetailModal;