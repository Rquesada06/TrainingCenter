/**
 * ExerciseMedia — exercise demo media for the expanded workout card.
 * Phase 05 Plan 03 (regression fix): restores the video/image that the per-set
 * card rework dropped. UI-SPEC §A2/A3: "Media (video/image) … retained, rendered
 * BELOW the set table." Extracted from ExerciseRow's expanded media block.
 *
 * Routing: YouTube URL → YouTubeEmbed (iframe webview); direct file (.mp4/HLS) →
 * expo-video; else → expo-image. Each direct-video instance owns its OWN
 * useVideoPlayer (React rule + Android: shared player unsupported). The caller
 * mounts this only while the row is expanded (≤1 active player at a time).
 */

import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { parseYouTubeId } from '@/lib/youtube';
import { YouTubeEmbed } from './YouTubeEmbed';

interface InlineVideoProps {
  videoUrl: string;
}

function InlineVideo({ videoUrl }: InlineVideoProps) {
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
  });

  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: 200, backgroundColor: '#000000' }}
      contentFit="contain"
      nativeControls
    />
  );
}

export interface ExerciseMediaProps {
  videoUrl: string | null;
  imageUrl: string | null;
}

export function ExerciseMedia({ videoUrl, imageUrl }: ExerciseMediaProps) {
  if (videoUrl !== null && parseYouTubeId(videoUrl) !== null) {
    return (
      <View style={{ marginTop: 8 }}>
        <YouTubeEmbed videoId={parseYouTubeId(videoUrl)!} />
      </View>
    );
  }

  if (videoUrl !== null) {
    return (
      <View style={{ marginTop: 8 }}>
        <InlineVideo videoUrl={videoUrl} />
      </View>
    );
  }

  if (imageUrl !== null) {
    return (
      <View style={{ marginTop: 8 }}>
        <Image
          source={imageUrl}
          style={{ width: '100%', height: 200 }}
          contentFit="contain"
        />
      </View>
    );
  }

  return null;
}
