import { isCompatibleOpenApi, isCompatiblePublicResponse, normalizeServerUrl } from './servers';

describe('server address validation', () => {
  it('normalizes an address while keeping its port and prefix', () => {
    expect(normalizeServerUrl(' https://Example.org:8443/trace/ ', false))
      .toBe('https://example.org:8443/trace');
  });

  it.each(['', 'example.org', 'ftp://example.org', 'https://user:pass@example.org',
    'https://example.org/?token=x', 'https://example.org/#fragment', 'http://example.org'])
  ('rejects invalid production address %s', (value) => {
    expect(() => normalizeServerUrl(value, false)).toThrow();
  });

  it('allows local HTTP only when explicitly enabled', () => {
    expect(normalizeServerUrl('http://localhost:8080/', true)).toBe('http://localhost:8080');
  });

  it('requires an OpenAPI document with the endpoints used for authentication', () => {
    expect(isCompatibleOpenApi({ openapi: '3.0.1', paths: {
      '/api/user/login': { post: {} }, '/api/user/profile': { get: {} },
    } })).toBe(true);
    expect(isCompatibleOpenApi({ openapi: '3.0.1', paths: {} })).toBe(false);
    expect(isCompatibleOpenApi('<html>ok</html>')).toBe(false);
  });

  it('accepts the public INATrace response and rejects other shapes', () => {
    expect(isCompatiblePublicResponse({ status: 'OK', data: {} })).toBe(true);
    expect(isCompatiblePublicResponse({ status: 'ERROR', data: {} })).toBe(false);
    expect(isCompatiblePublicResponse({ status: 'OK', data: null })).toBe(false);
    expect(isCompatiblePublicResponse('<html>ok</html>')).toBe(false);
  });
});
