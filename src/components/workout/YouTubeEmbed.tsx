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
  // Load the embed as HTML with baseUrl=youtube.com so the iframe's referer/
  // origin is trusted by YouTube. Loading the bare embed URL via {uri} has no
  // valid origin and YouTube rejects it ("error 153 / Watch on YouTube").
  const html = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>*{margin:0;padding:0}html,body{background:#000;height:100%;overflow:hidden}
.wrap{position:relative;width:100%;height:100%}
iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0}</style></head>
<body><div class="wrap"><iframe
src="https://www.youtube.com/embed/${videoId}?playsinline=1&modestbranding=1&rel=0&fs=1"
allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
allowfullscreen></iframe></div></body></html>`;
  return (
    <View style={{ width: '100%', height: 200, backgroundColor: '#000000', borderRadius: 8, overflow: 'hidden' }}>
      <WebView
        source={{ html, baseUrl: 'https://www.youtube.com' }}
        style={{ flex: 1, backgroundColor: '#000000' }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
      />
    </View>
  );
}
