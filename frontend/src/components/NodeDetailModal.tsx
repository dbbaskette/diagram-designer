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
  sections?: NodeDetailSection[];
  links?: NodeDetailLink[];
  customPage?: {
    type: 'iframe' | 'markdown' | 'html';
    content: string;
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
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden relative"
        style={{
          maxWidth: '64rem',
          width: '90%',
          maxHeight: '90vh',
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
          {content.customPage && (
            <div className="mb-6">
              {content.customPage.type === 'iframe' && (
                <iframe
                  src={content.customPage.content}
                  className="w-full h-96 border rounded"
                  title={`${nodeData.name} Details`}
                />
              )}
              {content.customPage.type === 'html' && (
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: content.customPage.content }}
                />
              )}
              {content.customPage.type === 'markdown' && (
                <div className="prose max-w-none">
                  {/* TODO: Add markdown parser */}
                  <pre>{content.customPage.content}</pre>
                </div>
              )}
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