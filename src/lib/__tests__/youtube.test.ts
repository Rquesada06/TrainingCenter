import { parseYouTubeId, isYouTubeUrl } from '@/lib/youtube';

describe('parseYouTubeId', () => {
  it('parses standard watch URLs', () => {
    expect(parseYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('parses watch URLs with extra params before/after v=', () => {
    expect(parseYouTubeId('https://www.youtube.com/watch?list=ABC&v=dQw4w9WgXcQ&t=30s')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=ABC')).toBe('dQw4w9WgXcQ');
  });
  it('parses youtu.be short links', () => {
    expect(parseYouTubeId('https://youtu.be/dQw4w9WgXcQ?si=xyz')).toBe('dQw4w9WgXcQ');
  });
  it('parses embed and shorts URLs', () => {
    expect(parseYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('returns null for non-YouTube URLs', () => {
    expect(parseYouTubeId('https://cdn.example.com/clip.mp4')).toBeNull();
    expect(parseYouTubeId('https://example.com/image.jpg')).toBeNull();
    expect(parseYouTubeId('')).toBeNull();
    expect(parseYouTubeId(null)).toBeNull();
    expect(parseYouTubeId(undefined)).toBeNull();
  });
});

describe('isYouTubeUrl', () => {
  it('is true for YouTube links, false otherwise', () => {
    expect(isYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    expect(isYouTubeUrl('https://cdn.example.com/clip.mp4')).toBe(false);
  });
});
