import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock appConfig before importing the service
vi.mock('../config/appConfig', () => ({
  buildApiUrl: (endpoint: string) => `http://localhost:3001${endpoint}`,
  log: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Re-create the service for each test to get fresh cache
async function createService() {
  // Clear module cache so we get a fresh instance
  vi.resetModules();
  const mod = await import('../services/nodeDetailsService');
  return mod.nodeDetailsService;
}

describe('NodeDetailsService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns success with config on 200', async () => {
    const service = await createService();
    const config = { title: 'Test', sections: [], links: [] };
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(config),
    } as Response);

    const result = await service.loadNodeDetails('myNode');

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.config.title).toBe('Test');
    }
  });

  it('returns notFound on 404', async () => {
    const service = await createService();
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);

    const result = await service.loadNodeDetails('missing');

    expect(result.status).toBe('notFound');
  });

  it('returns error on non-404 HTTP errors', async () => {
    const service = await createService();
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    const result = await service.loadNodeDetails('broken');

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error).toContain('500');
    }
  });

  it('returns error on network failure', async () => {
    const service = await createService();
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    const result = await service.loadNodeDetails('offline');

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error).toBe('Network error');
    }
  });

  it('caches success results', async () => {
    const service = await createService();
    const config = { title: 'Cached' };
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(config),
    } as Response);

    await service.loadNodeDetails('cached');
    await service.loadNodeDetails('cached');

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('caches notFound results', async () => {
    const service = await createService();
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);

    await service.loadNodeDetails('notfound');
    await service.loadNodeDetails('notfound');

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does not cache error results', async () => {
    const service = await createService();
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ title: 'Recovered' }),
      } as Response);

    const first = await service.loadNodeDetails('flaky');
    expect(first.status).toBe('error');

    const second = await service.loadNodeDetails('flaky');
    expect(second.status).toBe('success');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('deduplicates concurrent requests for same node', async () => {
    const service = await createService();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ title: 'Deduped' }),
    } as Response);

    const [r1, r2] = await Promise.all([
      service.loadNodeDetails('same'),
      service.loadNodeDetails('same'),
    ]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(r1.status).toBe('success');
    expect(r2.status).toBe('success');
  });

  it('clearCache removes cached entry', async () => {
    const service = await createService();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ title: 'V1' }),
    } as Response);

    await service.loadNodeDetails('clearMe');
    service.clearCache('clearMe');

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ title: 'V2' }),
    } as Response);

    const result = await service.loadNodeDetails('clearMe');
    expect(fetch).toHaveBeenCalledTimes(2);
    if (result.status === 'success') {
      expect(result.config.title).toBe('V2');
    }
  });

  it('validates config and strips invalid sections', async () => {
    const service = await createService();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        title: 'Valid',
        sections: [
          { title: 'Good', type: 'info', content: 'ok' },
          { title: 'Bad', type: 'invalid-type', content: 'nope' },
          'not-an-object',
        ],
        links: [
          { label: 'Good Link', url: 'https://example.com' },
          { label: 'Bad Link', url: 'not-a-url' },
        ],
      }),
    } as Response);

    const result = await service.loadNodeDetails('validated');
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.config.sections).toHaveLength(1);
      expect(result.config.links).toHaveLength(1);
    }
  });

  it('validates components customPage type', async () => {
    const service = await createService();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        title: 'Components Page',
        customPage: {
          type: 'components',
          layout: [
            { type: 'kpi-card', key: 'Requests', value: '1000' },
            { type: 'invalid-type', key: 'Bad' },
            { type: 'status-indicator', status: 'healthy', key: 'API' },
          ],
        },
      }),
    } as Response);

    const result = await service.loadNodeDetails('componentsPage');
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.config.customPage).toBeDefined();
      expect(result.config.customPage!.type).toBe('components');
      // Invalid component type should be stripped
      expect(result.config.customPage!.layout).toHaveLength(2);
    }
  });

  it('validates html-file customPage type', async () => {
    const service = await createService();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        title: 'HTML File Page',
        customPage: {
          type: 'html-file',
          file: 'dashboard.html',
        },
      }),
    } as Response);

    const result = await service.loadNodeDetails('htmlFilePage');
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.config.customPage).toBeDefined();
      expect(result.config.customPage!.type).toBe('html-file');
    }
  });

  it('validates tabs components recursively', async () => {
    const service = await createService();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        title: 'Tabs Page',
        customPage: {
          type: 'components',
          layout: [
            {
              type: 'tabs',
              tabs: [
                {
                  label: 'Good Tab',
                  components: [
                    { type: 'stat-row', key: 'Version', value: '1.0' },
                    { type: 'bad-type' },
                  ],
                },
                'not-a-tab',
                { label: 'No components array' },
              ],
            },
          ],
        },
      }),
    } as Response);

    const result = await service.loadNodeDetails('tabsPage');
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      const layout = result.config.customPage!.layout!;
      expect(layout).toHaveLength(1);
      const tabsComponent = layout[0];
      // Invalid tabs should be stripped
      expect(tabsComponent.tabs).toHaveLength(1);
      // Invalid components within tabs should be stripped
      expect(tabsComponent.tabs![0].components).toHaveLength(1);
    }
  });

  it('validates chart data points', async () => {
    const service = await createService();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        title: 'Chart Page',
        customPage: {
          type: 'components',
          layout: [
            {
              type: 'chart',
              chart_type: 'bar',
              data: [
                { label: 'Good', value: 100 },
                { label: 'Bad', value: 'not-a-number' },
                'not-an-object',
              ],
            },
          ],
        },
      }),
    } as Response);

    const result = await service.loadNodeDetails('chartPage');
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      const chart = result.config.customPage!.layout![0];
      expect(chart.data).toHaveLength(1);
      expect(chart.data![0].label).toBe('Good');
    }
  });

  it('normalizes invalid status-indicator status to unknown', async () => {
    const service = await createService();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        title: 'Status Page',
        customPage: {
          type: 'components',
          layout: [
            { type: 'status-indicator', status: 'invalid-status', key: 'Test' },
          ],
        },
      }),
    } as Response);

    const result = await service.loadNodeDetails('statusPage');
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      const indicator = result.config.customPage!.layout![0];
      expect(indicator.status).toBe('unknown');
    }
  });
});
