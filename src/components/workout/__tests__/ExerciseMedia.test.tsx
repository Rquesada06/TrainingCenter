/**
 * ExerciseMedia routing tests — Phase 05 Plan 03 regression fix.
 *
 * Locks the rule that the expanded workout card renders exercise demo media:
 * YouTube URL → YouTubeEmbed, direct video file → expo-video, image → expo-image,
 * nothing → null. (05-03 dropped this; UI-SPEC A2/A3 require it.)
 */

import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('expo-video', () => {
  const ReactLocal = require('react');
  const { Text } = require('react-native');
  return {
    useVideoPlayer: jest.fn(() => ({ loop: false })),
    VideoView: () => ReactLocal.createElement(Text, { testID: 'video-view' }, 'video'),
  };
});
jest.mock('expo-image', () => {
  const ReactLocal = require('react');
  const { Text } = require('react-native');
  return { Image: () => ReactLocal.createElement(Text, { testID: 'image-view' }, 'image') };
});
jest.mock('../YouTubeEmbed', () => {
  const ReactLocal = require('react');
  const { Text } = require('react-native');
  return {
    YouTubeEmbed: ({ videoId }: { videoId: string }) =>
      ReactLocal.createElement(Text, { testID: 'youtube-embed' }, videoId),
  };
});

import { ExerciseMedia } from '../ExerciseMedia';

describe('ExerciseMedia', () => {
  it('renders a YouTube embed for a YouTube URL', () => {
    const { getByTestId, queryByTestId } = render(
      <ExerciseMedia videoUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ" imageUrl={null} />
    );
    expect(getByTestId('youtube-embed')).toBeTruthy();
    expect(queryByTestId('video-view')).toBeNull();
    expect(queryByTestId('image-view')).toBeNull();
  });

  it('renders the expo-video player for a direct video file', () => {
    const { getByTestId, queryByTestId } = render(
      <ExerciseMedia videoUrl="https://cdn.example.com/squat.mp4" imageUrl={null} />
    );
    expect(getByTestId('video-view')).toBeTruthy();
    expect(queryByTestId('youtube-embed')).toBeNull();
  });

  it('renders an image when there is an imageUrl and no video', () => {
    const { getByTestId, queryByTestId } = render(
      <ExerciseMedia videoUrl={null} imageUrl="https://cdn.example.com/squat.jpg" />
    );
    expect(getByTestId('image-view')).toBeTruthy();
    expect(queryByTestId('video-view')).toBeNull();
    expect(queryByTestId('youtube-embed')).toBeNull();
  });

  it('renders nothing when there is no media', () => {
    const { queryByTestId } = render(<ExerciseMedia videoUrl={null} imageUrl={null} />);
    expect(queryByTestId('youtube-embed')).toBeNull();
    expect(queryByTestId('video-view')).toBeNull();
    expect(queryByTestId('image-view')).toBeNull();
  });
});
