import { validateImageUrl } from './index';

describe('validateImageUrl', () => {
  test('accepts valid HTTPS URLs', () => {
    const result = validateImageUrl('https://example.com/image.jpg');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('accepts valid HTTP URLs', () => {
    const result = validateImageUrl('http://example.com/image.png');
    expect(result.valid).toBe(true);
  });

  test('rejects empty URL', () => {
    const result = validateImageUrl('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('URL is required');
  });

  test('rejects invalid URL format', () => {
    const result = validateImageUrl('not-a-url');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid URL format');
  });

  test('rejects non-HTTP protocols', () => {
    const result = validateImageUrl('ftp://example.com/file.jpg');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Only HTTP/HTTPS URLs are allowed');
  });

  test('rejects file:// protocol', () => {
    const result = validateImageUrl('file:///etc/passwd');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Only HTTP/HTTPS URLs are allowed');
  });

  test('rejects localhost URLs (SSRF prevention)', () => {
    const result = validateImageUrl('http://localhost/admin');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Private/internal URLs are not allowed');
  });

  test('rejects 127.0.0.1 URLs (SSRF prevention)', () => {
    const result = validateImageUrl('http://127.0.0.1:8080/secret');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Private/internal URLs are not allowed');
  });

  test('rejects 10.x.x.x private IPs (SSRF prevention)', () => {
    const result = validateImageUrl('http://10.0.0.1/internal');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Private/internal URLs are not allowed');
  });

  test('rejects 192.168.x.x private IPs (SSRF prevention)', () => {
    const result = validateImageUrl('http://192.168.1.1/router');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Private/internal URLs are not allowed');
  });

  test('rejects 172.16-31.x.x private IPs (SSRF prevention)', () => {
    const result = validateImageUrl('http://172.16.0.1/internal');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Private/internal URLs are not allowed');
  });

  test('rejects link-local IPs (SSRF prevention)', () => {
    const result = validateImageUrl('http://169.254.169.254/metadata');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Private/internal URLs are not allowed');
  });

  test('accepts URLs with query params', () => {
    const result = validateImageUrl('https://example.com/image.jpg?size=large');
    expect(result.valid).toBe(true);
  });

  test('accepts URLs with ports', () => {
    const result = validateImageUrl('https://example.com:8080/image.jpg');
    expect(result.valid).toBe(true);
  });
});
