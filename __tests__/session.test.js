import { accessTokenFromSetCookie } from '@/utils/session';

test('reads the access token from an array of set-cookie headers', () => {
  expect(
    accessTokenFromSetCookie([
      'inatrace-accessToken=new-token; Path=/; Max-Age=3600; HttpOnly',
      'inatrace-refreshToken=refresh-token; Path=/; Max-Age=300; HttpOnly',
    ])
  ).toBe('new-token');
});

test('reads the access token from a comma-separated header', () => {
  expect(
    accessTokenFromSetCookie(
      'inatrace-accessToken=new-token; Path=/; Max-Age=3600; HttpOnly, inatrace-refreshToken=refresh; Path=/'
    )
  ).toBe('new-token');
});

test('returns null when the header is missing', () => {
  expect(accessTokenFromSetCookie(undefined)).toBeNull();
  expect(accessTokenFromSetCookie(null)).toBeNull();
  expect(accessTokenFromSetCookie('')).toBeNull();
});

test('returns null when the header has no token value', () => {
  expect(accessTokenFromSetCookie('inatrace-accessToken=; Path=/')).toBeNull();
});
