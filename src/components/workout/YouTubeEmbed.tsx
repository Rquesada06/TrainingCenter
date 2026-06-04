/**
 * YouTubeEmbed — inline YouTube player for exercise videos (WORK-03).
 *
 * expo-video cannot play YouTube links. Hand-rolled WebView iframes hit
 * YouTube embed/origin errors (150/152/153), so we use react-native-youtube-iframe
 * (a JS wrapper over react-native-webview, already installed) which performs the
 * YouTube iframe-API origin handshake correctly. Direct video files (.mp4/HLS)
 * still use expo-video (see ExerciseRow). JS-only — no native rebuild.
 */

import React from 'react';
import { View } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';

export interface YouTubeEmbedProps {
  videoId: string;
}

function YouTubeEmbedBase({ videoId }: YouTubeEmbedProps) {
  return (
    <View style={{ width: '100%', borderRadius: 8, overflow: 'hidden', backgroundColor: '#000000' }}>
      <YoutubePlayer height={200} videoId={videoId} play={false} />
    </View>
  );
}

// Memoize so the player isn't recreated on unrelated row re-renders.
export const YouTubeEmbed = React.memo(YouTubeEmbedBase);
