import type { NodeDetailConfig } from '../components/NodeDetailModal';
import { buildApiUrl, log } from '../config/appConfig';

class NodeDetailsService {
  private cache = new Map<string, NodeDetailConfig | null>();
  private loadingPromises = new Map<string, Promise<NodeDetailConfig | null>>();

  /**
   * Load node detail configuration from the server
   * Checks for /api/node-details/{nodeName} endpoint
   */
  async loadNodeDetails(nodeName: string): Promise<NodeDetailConfig | null> {
    // Force clear cache for debugging
    this.cache.delete(nodeName);

    // Check cache first
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
      this.cache.set(nodeName, result);
      return result;
    } finally {
      this.loadingPromises.delete(nodeName);
    }
  }

  private async fetchNodeDetails(nodeName: string): Promise<NodeDetailConfig | null> {
    try {
      const timestamp = Date.now();
      const url = buildApiUrl(`/node-details/${encodeURIComponent(nodeName)}?t=${timestamp}`);
      log.debug(`Loading node details for ${nodeName} from:`, url);

      console.log(`[DEBUG] Fetching URL: ${url}`);

      const response = await fetch(url, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      console.log(`[DEBUG] Response status: ${response.status}`);
      console.log(`[DEBUG] Response headers:`, [...response.headers.entries()]);

      if (response.status === 404) {
        // No custom configuration found - this is expected for most nodes
        log.debug(`No custom details found for node: ${nodeName}`);
        return null;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log(`[DEBUG] Raw response text for ${nodeName}:`, responseText.substring(0, 200) + '...');

      const config = JSON.parse(responseText);
      log.debug(`Loaded details for ${nodeName}:`, config);
      console.log(`[DEBUG] Raw config for ${nodeName}:`, config);

      const validated = this.validateConfig(config);
      console.log(`[DEBUG] Validated config for ${nodeName}:`, validated);
      return validated;
    } catch (error) {
      log.warn(`Failed to load details for node ${nodeName}:`, error);
      return null;
    }
  }

  private validateConfig(config: any): NodeDetailConfig {
    // Basic validation and sanitization
    const validated: NodeDetailConfig = {
      title: typeof config.title === 'string' ? config.title : undefined,
      description: typeof config.description === 'string' ? config.description : undefined,
      sections: Array.isArray(config.sections) ? config.sections.filter(this.isValidSection) : [],
      links: Array.isArray(config.links) ? config.links.filter(this.isValidLink) : [],
      customPage: config.customPage && this.isValidCustomPage(config.customPage)
        ? config.customPage
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
    return (
      typeof customPage === 'object' &&
      typeof customPage.type === 'string' &&
      ['iframe', 'markdown', 'html'].includes(customPage.type) &&
      typeof customPage.content === 'string'
    );
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