import axios from 'axios';
import { allowSessionRequests, cancelSessionRequests, isCurrentSession, sessionGeneration } from './sessionRequests';

test('logout cancels in-flight requests and prevents new ones until login', async () => {
  allowSessionRequests();
  const generation = sessionGeneration();
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  const request = axios.get('https://example.org', { adapter: config => new Promise((resolve, reject) => {
    started();
    config.signal.addEventListener('abort', () => reject(new axios.CanceledError('cancelled')));
  }) });
  await ready;
  const cancelled = expect(request).rejects.toBeDefined();
  await cancelSessionRequests();
  await cancelled;
  expect(isCurrentSession(generation)).toBe(false);
  await expect(axios.get('https://example.org')).rejects.toThrow('Session is closing');
  allowSessionRequests();
});

test('rejects requests targeting another server while a session is active', async () => {
  allowSessionRequests('https://a.example');
  await expect(axios.get('https://b.example/api/user/profile')).rejects.toThrow('active server');
  allowSessionRequests();
});
