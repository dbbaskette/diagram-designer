import React from 'react';

interface Template {
    id: string;
    name: string;
    description: string;
    icon: string;
    config: any; // DiagramConfig
}

const TEMPLATES: Template[] = [
    {
        id: 'blank',
        name: 'Blank Diagram',
        description: 'Start from scratch with an empty canvas.',
        icon: 'fa-file',
        config: {
            nodes: [],
            config: {
                title: 'New Diagram',
                nodeGlow: { enabled: true, spread: 10 },
                edgeAnimation: { enabled: true, speed: 1 }
            }
        }
    },
    {
        id: 'microservices',
        name: 'Microservices Architecture',
        description: 'A standard setup with API Gateway, Service Registry, and Microservices.',
        icon: 'fa-network-wired',
        config: {
            nodes: [
                {
                    name: "api-gateway",
                    displayName: "API Gateway",
                    description: "Entry point for all clients",
                    icon: "fa-server",
                    position: { x: 250, y: 50 },
                    connectTo: ["auth-service", "user-service", "order-service"],
                    dataGrid: []
                },
                {
                    name: "auth-service",
                    displayName: "Auth Service",
                    description: "Handles authentication",
                    icon: "fa-lock",
                    position: { x: 50, y: 200 },
                    connectTo: [],
                    dataGrid: []
                },
                {
                    name: "user-service",
                    displayName: "User Service",
                    description: "Manages user data",
                    icon: "fa-users",
                    position: { x: 250, y: 200 },
                    connectTo: ["user-db"],
                    dataGrid: []
                },
                {
                    name: "order-service",
                    displayName: "Order Service",
                    description: "Manages orders",
                    icon: "fa-shopping-cart",
                    position: { x: 450, y: 200 },
                    connectTo: ["order-db"],
                    dataGrid: []
                },
                {
                    name: "user-db",
                    displayName: "User DB",
                    description: "PostgreSQL",
                    icon: "fa-database",
                    position: { x: 250, y: 350 },
                    connectTo: [],
                    dataGrid: []
                },
                {
                    name: "order-db",
                    displayName: "Order DB",
                    description: "MongoDB",
                    icon: "fa-database",
                    position: { x: 450, y: 350 },
                    connectTo: [],
                    dataGrid: []
                }
            ],
            config: {
                title: 'Microservices Architecture',
                nodeGlow: { enabled: true, spread: 10 },
                edgeAnimation: { enabled: true, speed: 1 }
            }
        }
    }
];

interface TemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTemplate: (template: Template) => void;
}

const TemplateModal: React.FC<TemplateModalProps> = ({ isOpen, onClose, onSelectTemplate }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        <i className="fas fa-plus-circle mr-3 text-blue-500"></i>
                        New Diagram
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
                    >
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-grow">
                    <p className="text-gray-600 dark:text-gray-400 mb-6">Choose a template to start with:</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {TEMPLATES.map(template => (
                            <div
                                key={template.id}
                                onClick={() => onSelectTemplate(template)}
                                className="bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 rounded-lg p-4 cursor-pointer transition-all transform hover:-translate-y-1 group"
                            >
                                <div className="flex items-start">
                                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg mr-4 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/20 transition-colors shadow-sm dark:shadow-none">
                                        <i className={`fas ${template.icon} text-2xl text-blue-400 group-hover:text-blue-300`}></i>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{template.name}</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{template.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TemplateModal;
