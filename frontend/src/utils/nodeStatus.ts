export type NodeStatus = 'up' | 'down' | 'unknown';
export type HealthCategory = 'healthy' | 'degraded' | 'down' | 'unknown';

export function getNodeStatusClass(status: NodeStatus): string {
  switch (status) {
    case 'up':
      return 'bg-green-500';
    case 'down':
      return 'bg-red-500';
    case 'unknown':
    default:
      return 'bg-yellow-500';
  }
}

export function statusToHealthCategory(status: NodeStatus): HealthCategory {
  switch (status) {
    case 'up':
      return 'healthy';
    case 'down':
      return 'down';
    case 'unknown':
    default:
      return 'unknown';
  }
}
