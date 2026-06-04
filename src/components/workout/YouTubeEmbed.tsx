/**
 * YouTubeEmbed — inline YouTube player for exercise videos (WORK-03).
 *
 * expo-video cannot play YouTube links, so YouTube videos render via
 * react-native-webview pointed at the YouTube embed URL. Direct video files
 * (.mp4 / HLS) still use expo-video (see ExerciseRow). The user taps the
 * embedded YouTube play button to start playback (inline, no forced fullscreen).
 */

import React from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

export interface YouTubeEmbedProps {
  videoId: string;
}

export function YouTubeEmbed({ videoId }: YouTubeEmbedProps) {
  const uri = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`;
  return (
    <View style={{ width: '100%', height: 200, backgroundColor: '#000000', borderRadius: 8, overflow: 'hidden' }}>
      <WebView
        source={{ uri }}
        style={{ flex: 1, backgroundColor: '#000000' }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction
        javaScriptEnabled
        domStorageEnabled
        // Avoid the iframe trying to navigate the whole webview on tap.
        originWhitelist={['https://*']}
      />
    </View>
  );
}
