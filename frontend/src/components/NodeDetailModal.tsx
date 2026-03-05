import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { NodeData } from '../types/diagram';
import { sanitizeHtml, renderMarkdown } from '../utils/sanitize';

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

export interface TabConfig {
  label: string;
  components: DashboardComponent[];
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface TableColumn {
  header: string;
  field: string;
  align?: 'left' | 'center' | 'right';
}

export interface DashboardComponent {
  type: 'section' | 'rectangle' | 'grid' | 'metric-card' | 'progress-bar' | 'feature-weight'
    | 'tabs' | 'chart' | 'kpi-card' | 'status-indicator' | 'table' | 'stat-row';
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
  // tabs
  tabs?: TabConfig[];
  // chart
  chart_type?: 'bar' | 'donut';
  data?: ChartDataPoint[];
  // kpi-card
  trend?: 'up' | 'down' | 'flat';
  trend_value?: string;
  subtitle?: string;
  icon?: string;
  // status-indicator
  status?: 'healthy' | 'warning' | 'critical' | 'unknown';
  // table
  columns?: TableColumn[];
  rows?: Record<string, string>[];
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

// Tabs wrapper component (needs state for active tab)
const TabsComponent: React.FC<{ component: DashboardComponent; baseClasses: string }> = ({ component, baseClasses }) => {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = component.tabs || [];

  return (
    <div className={`rounded-lg border ${baseClasses}`}>
      <div className="flex border-b overflow-x-auto">
        {tabs.map((tab, tabIndex) => (
          <button
            key={tabIndex}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tabIndex
                ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab(tabIndex)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-4">
        {tabs[activeTab]?.components?.map((child, childIndex) =>
          renderDashboardComponent(child, childIndex)
        )}
      </div>
    </div>
  );
};

// Simple SVG bar chart renderer
const renderBarChart = (data: ChartDataPoint[], baseClasses: string, title?: string): React.ReactNode => {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map(d => d.value));
  const barWidth = Math.max(20, Math.floor(200 / data.length));

  return (
    <div className={`p-4 ${baseClasses}`}>
      {title && <div className="text-sm font-semibold mb-3">{title}</div>}
      <div className="flex items-end space-x-2" style={{ height: '120px' }}>
        {data.map((d, i) => {
          const heightPct = maxVal > 0 ? (d.value / maxVal) * 100 : 0;
          return (
            <div key={i} className="flex flex-col items-center flex-1">
              <div className="text-xs font-medium mb-1">{d.value}</div>
              <div
                className="w-full rounded-t"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: d.color || '#3b82f6',
                  minHeight: '4px',
                  maxWidth: `${barWidth}px`,
                }}
              />
              <div className="text-xs text-gray-500 mt-1 truncate w-full text-center">{d.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Simple SVG donut chart renderer
const renderDonutChart = (data: ChartDataPoint[], baseClasses: string, title?: string): React.ReactNode => {
  if (!data.length) return null;
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  return (
    <div className={`p-4 ${baseClasses}`}>
      {title && <div className="text-sm font-semibold mb-3">{title}</div>}
      <div className="flex items-center justify-center space-x-6">
        <svg width="120" height="120" viewBox="0 0 100 100">
          {data.map((d, i) => {
            const pct = total > 0 ? d.value / total : 0;
            const dashLength = pct * circumference;
            const dashOffset = -cumulativeOffset;
            cumulativeOffset += dashLength;
            return (
              <circle
                key={i}
                cx="50" cy="50" r={radius}
                fill="none"
                stroke={d.color || defaultColors[i % defaultColors.length]}
                strokeWidth="16"
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 50 50)"
              />
            );
          })}
        </svg>
        <div className="space-y-1">
          {data.map((d, i) => (
            <div key={i} className="flex items-center space-x-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: d.color || defaultColors[i % defaultColors.length] }}
              />
              <span>{d.label}: {d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Status color mapping
const statusColorMap: Record<string, { bg: string; text: string; dot: string }> = {
  healthy: { bg: 'bg-green-50', text: 'text-green-800', dot: 'bg-green-500' },
  warning: { bg: 'bg-yellow-50', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  critical: { bg: 'bg-red-50', text: 'text-red-800', dot: 'bg-red-500' },
  unknown: { bg: 'bg-gray-50', text: 'text-gray-800', dot: 'bg-gray-400' },
};

// Trend arrow rendering
const trendArrow = (trend?: string) => {
  if (trend === 'up') return <span className="text-green-500">&#9650;</span>;
  if (trend === 'down') return <span className="text-red-500">&#9660;</span>;
  if (trend === 'flat') return <span className="text-gray-400">&#9654;</span>;
  return null;
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

    case 'tabs':
      return <TabsComponent key={index} component={component} baseClasses={baseClasses} />;

    case 'chart':
      if (component.chart_type === 'donut') {
        return <React.Fragment key={index}>{renderDonutChart(component.data || [], baseClasses, component.title)}</React.Fragment>;
      }
      return <React.Fragment key={index}>{renderBarChart(component.data || [], baseClasses, component.title)}</React.Fragment>;

    case 'kpi-card':
      return (
        <div key={index} className={`rounded-lg p-4 border ${baseClasses}`}>
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-medium text-gray-500">{component.key}</div>
            {component.icon && <span className="text-lg">{component.icon}</span>}
          </div>
          <div className={`text-3xl font-bold ${component.value_class || ''}`}>{component.value}</div>
          {(component.trend || component.subtitle) && (
            <div className="flex items-center space-x-1 mt-1 text-sm">
              {trendArrow(component.trend)}
              <span className={
                component.trend === 'up' ? 'text-green-600' :
                component.trend === 'down' ? 'text-red-600' : 'text-gray-500'
              }>{component.trend_value}</span>
              {component.subtitle && <span className="text-gray-400 ml-1">{component.subtitle}</span>}
            </div>
          )}
        </div>
      );

    case 'status-indicator': {
      const colors = statusColorMap[component.status || 'unknown'];
      return (
        <div key={index} className={`flex items-center p-3 rounded-lg ${colors.bg} ${baseClasses}`}>
          <div className={`w-3 h-3 rounded-full mr-3 ${colors.dot} ${component.status === 'healthy' ? 'animate-pulse' : ''}`} />
          <div>
            <div className={`font-semibold ${colors.text}`}>{component.key}</div>
            {component.value && <div className={`text-sm ${colors.text} opacity-75`}>{component.value}</div>}
          </div>
        </div>
      );
    }

    case 'table':
      return (
        <div key={index} className={`overflow-x-auto rounded-lg border ${baseClasses}`}>
          {component.title && <div className="text-sm font-semibold p-3 border-b bg-gray-50">{component.title}</div>}
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                {(component.columns || []).map((col, ci) => (
                  <th key={ci} className={`px-4 py-2 font-medium text-gray-700 text-${col.align || 'left'}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(component.rows || []).map((row, ri) => (
                <tr key={ri} className="border-b last:border-b-0 hover:bg-gray-50">
                  {(component.columns || []).map((col, ci) => (
                    <td key={ci} className={`px-4 py-2 text-${col.align || 'left'}`}>
                      {row[col.field] || ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'stat-row':
      return (
        <div key={index} className={`flex items-center justify-between py-2 px-3 ${baseClasses}`}>
          <span className="text-sm text-gray-600">{component.key}</span>
          <span className={`font-medium ${component.value_class || ''}`}>{component.value}</span>
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
  if (!isOpen) return null;

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
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(content.customPage.content) }}
                />
              )}
              {content.customPage.type === 'markdown' && content.customPage.content && (
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(content.customPage.content) }}
                />
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
                      <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.content) }} />
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

  return createPortal(modalContent, document.body);
};

export default NodeDetailModal;