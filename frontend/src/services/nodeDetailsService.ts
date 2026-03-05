import type { NodeDetailConfig, DashboardComponent } from '../components/NodeDetailModal';
import { buildApiUrl, log } from '../config/appConfig';

export type NodeDetailsResult =
  | { status: 'success'; config: NodeDetailConfig }
  | { status: 'notFound' }
  | { status: 'error'; error: string };

class NodeDetailsService {
  private cache = new Map<string, NodeDetailsResult>();
  private loadingPromises = new Map<string, Promise<NodeDetailsResult>>();

  /**
   * Load node detail configuration from the server
   * Checks for /api/node-details/{nodeName} endpoint
   */
  async loadNodeDetails(nodeName: string): Promise<NodeDetailsResult> {
    if (this.cache.has(nodeName)) {
      return this.cache.get(nodeName)!;
    }

    // Check if already loading
    if (this.loadingPromises.has(nodeName)) {
      return this.loadingPromises.get(nodeName)!;
    }

    // Start loading
    const loadPromise = this.fetchNodeDetails(nodeName);
    this.loadingPromises.set(nodeName, loadPromise);

    try {
      const result = await loadPromise;
      // Cache success and notFound, but not errors
      if (result.status !== 'error') {
        this.cache.set(nodeName, result);
      }
      return result;
    } finally {
      this.loadingPromises.delete(nodeName);
    }
  }

  private async fetchNodeDetails(nodeName: string): Promise<NodeDetailsResult> {
    try {
      const url = buildApiUrl(`/node-details/${encodeURIComponent(nodeName)}?t=${Date.now()}`);
      log.debug(`Loading node details for ${nodeName} from:`, url);

      const response = await fetch(url, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (response.status === 404) {
        log.debug(`No custom details found for node: ${nodeName}`);
        return { status: 'notFound' };
      }

      if (!response.ok) {
        return { status: 'error', error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const config = await response.json();
      log.debug(`Loaded details for ${nodeName}:`, config);
      return { status: 'success', config: this.validateConfig(config) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.warn(`Failed to load details for node ${nodeName}:`, error);
      return { status: 'error', error: message };
    }
  }

  private validateConfig(config: any): NodeDetailConfig {
    // Basic validation and sanitization
    const validated: NodeDetailConfig = {
      title: typeof config.title === 'string' ? config.title : undefined,
      description: typeof config.description === 'string' ? config.description : undefined,
      modalSize: config.modalSize && typeof config.modalSize === 'object' ? config.modalSize : undefined,
      sections: Array.isArray(config.sections) ? config.sections.filter(this.isValidSection) : [],
      links: Array.isArray(config.links) ? config.links.filter(this.isValidLink) : [],
      customPage: config.customPage && this.isValidCustomPage(config.customPage)
        ? this.sanitizeCustomPage(config.customPage)
        : undefined
    };

    return validated;
  }

  private isValidSection(section: any): boolean {
    return (
      typeof section === 'object' &&
      typeof section.title === 'string' &&
      typeof section.type === 'string' &&
      ['info', 'metrics', 'status', 'logs', 'custom'].includes(section.type) &&
      (typeof section.content === 'string')
    );
  }

  private isValidLink(link: any): boolean {
    return (
      typeof link === 'object' &&
      typeof link.label === 'string' &&
      typeof link.url === 'string' &&
      link.url.match(/^https?:\/\//) // Basic URL validation
    );
  }

  private isValidCustomPage(customPage: any): boolean {
    if (typeof customPage !== 'object' || typeof customPage.type !== 'string') return false;

    const validTypes = ['iframe', 'markdown', 'html', 'html-file', 'components'];
    if (!validTypes.includes(customPage.type)) return false;

    // 'components' type requires layout array instead of content string
    if (customPage.type === 'components') {
      return Array.isArray(customPage.layout);
    }

    // 'html-file' type requires file string
    if (customPage.type === 'html-file') {
      return typeof customPage.file === 'string';
    }

    return typeof customPage.content === 'string';
  }

  private sanitizeCustomPage(customPage: any): any {
    if (customPage.type === 'components' && Array.isArray(customPage.layout)) {
      return {
        ...customPage,
        layout: customPage.layout.filter((c: any) => this.isValidDashboardComponent(c))
      };
    }
    return customPage;
  }

  private isValidDashboardComponent(component: any): boolean {
    if (typeof component !== 'object' || typeof component.type !== 'string') return false;

    const validTypes = [
      'section', 'rectangle', 'grid', 'metric-card', 'progress-bar', 'feature-weight',
      'tabs', 'chart', 'kpi-card', 'status-indicator', 'table', 'stat-row'
    ];
    if (!validTypes.includes(component.type)) return false;

    // Recursively validate nested components
    if (Array.isArray(component.components)) {
      component.components = component.components.filter((c: any) => this.isValidDashboardComponent(c));
    }

    // Validate tabs have valid structure
    if (component.type === 'tabs' && Array.isArray(component.tabs)) {
      component.tabs = component.tabs.filter((tab: any) =>
        typeof tab === 'object' && typeof tab.label === 'string' && Array.isArray(tab.components)
      );
      for (const tab of component.tabs) {
        tab.components = tab.components.filter((c: any) => this.isValidDashboardComponent(c));
      }
    }

    // Validate chart data points
    if (component.type === 'chart' && Array.isArray(component.data)) {
      component.data = component.data.filter((d: any) =>
        typeof d === 'object' && typeof d.label === 'string' && typeof d.value === 'number'
      );
    }

    // Validate table columns
    if (component.type === 'table') {
      if (Array.isArray(component.columns)) {
        component.columns = component.columns.filter((col: any) =>
          typeof col === 'object' && typeof col.header === 'string' && typeof col.field === 'string'
        );
      }
      if (Array.isArray(component.rows)) {
        component.rows = component.rows.filter((row: any) => typeof row === 'object');
      }
    }

    // Validate status-indicator status values
    if (component.type === 'status-indicator' && component.status) {
      const validStatuses = ['healthy', 'warning', 'critical', 'unknown'];
      if (!validStatuses.includes(component.status)) {
        component.status = 'unknown';
      }
    }

    return true;
  }

  /**
   * Clear cache for a specific node (useful for development)
   */
  clearCache(nodeName?: string): void {
    if (nodeName) {
      this.cache.delete(nodeName);
      this.loadingPromises.delete(nodeName);
    } else {
      this.cache.clear();
      this.loadingPromises.clear();
    }
  }

  /**
   * Preload details for multiple nodes
   */
  async preloadNodeDetails(nodeNames: string[]): Promise<void> {
    const promises = nodeNames.map(name => this.loadNodeDetails(name));
    await Promise.allSettled(promises);
    log.debug(`Preloaded details for ${nodeNames.length} nodes`);
  }
}

// Export singleton instance
export const nodeDetailsService = new NodeDetailsService();

// Make it available globally for debugging
(window as any).nodeDetailsService = nodeDetailsService;

// Example node detail configurations for reference
export const exampleNodeDetails: Record<string, NodeDetailConfig> = {
  teleExchange: {
    title: 'RabbitMQ Telematics Exchange',
    description: 'High-throughput message queue processing telematics data from vehicle sensors',
    sections: [
      {
        title: '📊 Queue Statistics',
        type: 'metrics',
        content: `
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-blue-50 p-3 rounded">
              <div class="text-blue-600 font-semibold">Messages/sec</div>
              <div class="text-2xl font-bold">1,247</div>
            </div>
            <div class="bg-green-50 p-3 rounded">
              <div class="text-green-600 font-semibold">Queue Depth</div>
              <div class="text-2xl font-bold">89</div>
            </div>
          </div>
        `
      },
      {
        title: '🔧 Configuration Details',
        type: 'info',
        content: `
          <div class="space-y-2">
            <div><strong>Exchange Type:</strong> Topic</div>
            <div><strong>Routing Key:</strong> telematics.vehicle.*</div>
            <div><strong>Durability:</strong> Persistent</div>
            <div><strong>Auto-delete:</strong> False</div>
          </div>
        `
      },
      {
        title: '📈 Performance Metrics',
        type: 'custom',
        content: `
          <div class="space-y-4">
            <div>
              <div class="flex justify-between mb-1">
                <span>CPU Usage</span>
                <span>67%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-blue-600 h-2 rounded-full" style="width: 67%"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between mb-1">
                <span>Memory Usage</span>
                <span>45%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-green-600 h-2 rounded-full" style="width: 45%"></div>
              </div>
            </div>
          </div>
        `
      }
    ],
    links: [
      {
        label: '🐰 RabbitMQ Management',
        url: 'https://rmq-cf986537-69cc-4107-8b66-5542481de9ba.sys.tas-ndc.kuhn-labs.com/',
        type: 'primary'
      },
      {
        label: '📊 Queue Details',
        url: 'https://rmq-cf986537-69cc-4107-8b66-5542481de9ba.sys.tas-ndc.kuhn-labs.com/#/queues',
        type: 'secondary'
      }
    ]
  }
};