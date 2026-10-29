import axios from 'axios';
import { normalizeServerUrl } from './servers';

let generation = 0;
let paused = false;
let activeServer: string | null = null;
type Tracked = { controller: AbortController; finished: Promise<void>; finish: () => void };
const active = new Set<Tracked>();

export function sessionGeneration(): number { return generation; }
export function isCurrentSession(value: number): boolean { return generation === value; }

export async function cancelSessionRequests(): Promise<void> {
  paused = true;
  generation++;
  const pending = Array.from(active);
  for (const item of pending) item.controller.abort();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.all(pending.map(item => item.finished)),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Requests did not stop')), 10000); }),
    ]);
  } finally { if (timer) clearTimeout(timer); }
}
export function allowSessionRequests(server?: string): void {
  activeServer = server ? normalizeServerUrl(server, true, true) : null;
  paused = false;
}

axios.interceptors.request.use(config => {
  if (paused) throw new Error('Session is closing');
  if (activeServer) {
    let target = '';
    try {
      const url = new URL(config.url || '');
      target = `${url.protocol}//${url.hostname.toLowerCase()}${url.port ? `:${url.port}` : ''}${url.pathname}`;
    } catch { /* Invalid addresses must not leave the device. */ }
    if (!target.startsWith(activeServer + '/')) throw new Error('Request does not belong to the active server');
  }
  const controller = new AbortController();
  const previous = config.signal;
  if (previous?.aborted) controller.abort();
  else previous?.addEventListener?.('abort', () => controller.abort(), { once: true });
  config.signal = controller.signal;
  let finish = () => {};
  const finished = new Promise<void>(resolve => { finish = resolve; });
  const item = { controller, finished, finish };
  const adapter = axios.getAdapter(config.adapter);
  (config as any).__sessionRequest = item;
  active.add(item);
  config.adapter = async requestConfig => {
    try { return await adapter(requestConfig); }
    finally { active.delete(item); item.finish(); }
  };
  return config;
});

axios.interceptors.response.use(response => {
  const item = (response.config as any).__sessionRequest as Tracked | undefined;
  if (item) { active.delete(item); item.finish(); }
  return response;
}, error => {
  const item = error.config && (error.config as any).__sessionRequest as Tracked | undefined;
  if (item) { active.delete(item); item.finish(); }
  return Promise.reject(error);
});
