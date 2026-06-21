import { sanitizeFilename, validateInputLength, truncateInput } from './index';

describe('sanitizeFilename', () => {
  test('returns sanitized filename for valid input', () => {
    expect(sanitizeFilename('user_photo.jpg')).toBe('user_photo.jpg');
  });

  test('removes path traversal sequences', () => {
    expect(sanitizeFilename('../../../etc/passwd')).toBe('etcpasswd');
    expect(sanitizeFilename('..\\..\\windows\\system32')).toBe('windowssystem32');
  });

  test('removes directory separators', () => {
    expect(sanitizeFilename('path/to/file.txt')).toBe('pathtofile.txt');
    expect(sanitizeFilename('path\\to\\file.txt')).toBe('pathtofile.txt');
  });

  test('removes null bytes and control characters', () => {
    expect(sanitizeFilename('file\x00name.txt')).toBe('filename.txt');
    expect(sanitizeFilename('file\x1fname.txt')).toBe('filename.txt');
  });

  test('removes CR and LF characters (header injection prevention)', () => {
    expect(sanitizeFilename('file\r\nname.txt')).toBe('filename.txt');
    expect(sanitizeFilename('file\rname\n.txt')).toBe('filename.txt');
  });

  test('removes problematic characters', () => {
    expect(sanitizeFilename('file<>:"|?*.txt')).toBe('file.txt');
  });

  test('replaces multiple spaces with underscore', () => {
    expect(sanitizeFilename('file   name.txt')).toBe('file_name.txt');
  });

  test('removes leading/trailing dots and spaces', () => {
    expect(sanitizeFilename('...file.txt...')).toBe('file.txt');
    // Leading/trailing spaces become underscores, then trimmed
    expect(sanitizeFilename('  file.txt  ')).toBe('_file.txt_');
  });

  test('returns default for empty input', () => {
    expect(sanitizeFilename('')).toBe('download');
    expect(sanitizeFilename(null as any)).toBe('download');
    expect(sanitizeFilename(undefined as any)).toBe('download');
  });

  test('returns default when input becomes empty after sanitization', () => {
    expect(sanitizeFilename('...')).toBe('download');
    expect(sanitizeFilename('///\\\\')).toBe('download');
  });

  test('truncates to max length while preserving extension', () => {
    const longName = 'a'.repeat(300) + '.jpg';
    const result = sanitizeFilename(longName, 50);
    expect(result.length).toBe(50);
    expect(result.endsWith('.jpg')).toBe(true);
  });

  test('handles filenames without extension', () => {
    const longName = 'a'.repeat(300);
    const result = sanitizeFilename(longName, 50);
    expect(result.length).toBe(50);
  });
});

describe('validateInputLength', () => {
  test('accepts valid caption within limit', () => {
    const result = validateInputLength('Hello World', 'caption');
    expect(result.valid).toBe(true);
    expect(result.maxLength).toBe(2200);
  });

  test('accepts valid message within limit', () => {
    const result = validateInputLength('Hello!', 'message');
    expect(result.valid).toBe(true);
    expect(result.maxLength).toBe(1000);
  });

  test('accepts valid username within limit', () => {
    const result = validateInputLength('instagram_user', 'username');
    expect(result.valid).toBe(true);
    expect(result.maxLength).toBe(30);
  });

  test('rejects caption exceeding limit', () => {
    const longCaption = 'a'.repeat(2300);
    const result = validateInputLength(longCaption, 'caption');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds maximum length');
    expect(result.error).toContain('2200');
  });

  test('rejects message exceeding limit', () => {
    const longMessage = 'a'.repeat(1100);
    const result = validateInputLength(longMessage, 'message');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds maximum length');
    expect(result.error).toContain('1000');
  });

  test('rejects username exceeding limit', () => {
    const longUsername = 'a'.repeat(35);
    const result = validateInputLength(longUsername, 'username');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds maximum length');
    expect(result.error).toContain('30');
  });

  test('accepts undefined/null input (optional fields)', () => {
    expect(validateInputLength(undefined as any, 'caption').valid).toBe(true);
    expect(validateInputLength(null as any, 'message').valid).toBe(true);
  });

  test('rejects non-string input', () => {
    const result = validateInputLength(123 as any, 'caption');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('must be a string');
  });

  test('uses default limit for unknown fields', () => {
    const result = validateInputLength('test', 'unknownField');
    expect(result.maxLength).toBe(500);
  });

  test('respects custom limit override', () => {
    const result = validateInputLength('testing123', 'caption', 5);
    expect(result.valid).toBe(false);
    expect(result.maxLength).toBe(5);
    expect(result.error).toContain('exceeds maximum length of 5');
  });

  test('accepts input at exact limit', () => {
    const exactCaption = 'a'.repeat(2200);
    const result = validateInputLength(exactCaption, 'caption');
    expect(result.valid).toBe(true);
  });
});

describe('truncateInput', () => {
  test('returns original input when under limit', () => {
    expect(truncateInput('Hello', 10)).toBe('Hello');
  });

  test('truncates and adds suffix when over limit', () => {
    expect(truncateInput('Hello World', 8)).toBe('Hello...');
  });

  test('uses custom suffix', () => {
    expect(truncateInput('Hello World', 9, '…')).toBe('Hello Wo…');
  });

  test('handles empty input', () => {
    expect(truncateInput('', 10)).toBe('');
    expect(truncateInput(null as any, 10)).toBe('');
    expect(truncateInput(undefined as any, 10)).toBe('');
  });

  test('handles very short max length', () => {
    expect(truncateInput('Hello', 3)).toBe('...');
  });

  test('handles max length shorter than suffix', () => {
    expect(truncateInput('Hello', 1)).toBe('...');
  });
});
