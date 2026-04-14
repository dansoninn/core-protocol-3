"use client";

import MuxPlayer from "@mux/mux-player-react";

interface Props {
  url: string; // Mux playback ID
  title?: string;
}

export default function VideoPlayer({ url }: Props) {
  return (
    <MuxPlayer
      playbackId={url}
      streamType="on-demand"
      className="w-full aspect-video"
    />
  );
}
