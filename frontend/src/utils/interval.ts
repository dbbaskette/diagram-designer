import { log } from '../config/appConfig';

export const DEFAULT_INTERVAL_MS = 30000;
export const MIN_INTERVAL_MS = 1000;

function toPositiveNumber(value?: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  return value > 0 ? value : undefined;
}

export function resolveInterval(
  metricInterval?: number,
  nodeInterval?: number,
  globalInterval?: number,
  source?: string
): number {
  const resolved =
    toPositiveNumber(metricInterval)
    ?? toPositiveNumber(nodeInterval)
    ?? toPositiveNumber(globalInterval)
    ?? DEFAULT_INTERVAL_MS;

  if (resolved < MIN_INTERVAL_MS) {
    log.warn(
      `[interval] Resolved interval below minimum (${resolved}ms < ${MIN_INTERVAL_MS}ms)`
      + (source ? ` for ${source}` : '')
      + `; clamping to ${MIN_INTERVAL_MS}ms`
    );
    return MIN_INTERVAL_MS;
  }

  return resolved;
}
