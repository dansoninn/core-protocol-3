"use client";

interface Props {
  url: string;
  title?: string;
}

export default function VideoPlayer({ url, title }: Props) {
  const isYouTube =
    url.includes("youtube.com") || url.includes("youtu.be");

  if (isYouTube) {
    // If the URL is already an embed URL, use it directly
    const embedSrc = url.includes("/embed/")
      ? url
      : url.includes("youtu.be/")
      ? `https://www.youtube.com/embed/${url.split("youtu.be/")[1]?.split("?")[0]}`
      : `https://www.youtube.com/embed/${new URL(url).searchParams.get("v")}`;

    return (
      <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
        <iframe
          className="absolute inset-0 w-full h-full"
          src={embedSrc}
          title={title ?? "Myndband"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <video
      className="w-full rounded-xl bg-black"
      src={url}
      controls
      title={title}
    />
  );
}
