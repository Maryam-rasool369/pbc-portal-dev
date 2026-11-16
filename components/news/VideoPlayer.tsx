import React, { useState } from 'react';
import { HiPlay, HiExternalLink } from 'react-icons/hi';

interface VideoPlayerProps {
  url: string;
  title?: string;
  className?: string;
  height?: number;
}

export default function VideoPlayer({ url, title, className = '', height }: VideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const hasFixedHeight = typeof height === 'number' && height > 0;

  const getVideoEmbedUrl = (url: string) => {
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (youtubeMatch) {
      return {
        embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}`,
        type: 'youtube',
        thumbnail: `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`,
      };
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return {
        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
        type: 'vimeo',
        thumbnail: '', // Vimeo thumbnails require API call
      };
    }

    // Direct video file
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
      return {
        embedUrl: url,
        type: 'direct',
        thumbnail: '',
      };
    }

    return null;
  };

  const videoInfo = getVideoEmbedUrl(url);

  if (!videoInfo) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-800 rounded-lg p-6 text-center ${className}`}>
        <div className="text-red-500 mb-2">
          {/* @ts-ignore */}
          <HiExternalLink className="h-8 w-8 mx-auto" />
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-3">
          Unsupported video format
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-gold-600 hover:text-gold-700 font-medium"
        >
          {/* @ts-ignore */}
          <HiExternalLink className="h-4 w-4 mr-1" />
          Open in new tab
        </a>
      </div>
    );
  }

  const handleLoadError = () => {
    setError(true);
    setIsLoading(false);
  };

  const handleLoadSuccess = () => {
    setIsLoading(false);
    setError(false);
  };

  if (error) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-800 rounded-lg p-6 text-center ${className}`}>
        <div className="text-yellow-500 mb-2">
          {/* @ts-ignore */}
          <HiPlay className="h-8 w-8 mx-auto" />
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-3">
          Video could not be loaded
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-gold-600 hover:text-gold-700 font-medium"
        >
          {/* @ts-ignore */}
          <HiExternalLink className="h-4 w-4 mr-1" />
          Watch on {videoInfo.type === 'youtube' ? 'YouTube' : videoInfo.type === 'vimeo' ? 'Vimeo' : 'original site'}
        </a>
      </div>
    );
  }

  return (
    <div
      className={`relative bg-black rounded-lg overflow-hidden ${className}`}
      style={hasFixedHeight ? { height } : undefined}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500 mx-auto mb-2"></div>
            <p className="text-gray-400 text-sm">Loading video...</p>
          </div>
        </div>
      )}

      {videoInfo.type === 'direct' ? (
        <video
          controls
          className={hasFixedHeight ? 'w-full h-full object-contain' : 'w-full h-auto'}
          onLoadedData={handleLoadSuccess}
          onError={handleLoadError}
          preload="metadata"
        >
          <source src={videoInfo.embedUrl} />
          Your browser does not support the video tag.
        </video>
      ) : hasFixedHeight ? (
        <div className="flex items-center justify-center h-full">
          <iframe
            src={videoInfo.embedUrl}
            title={title || 'Video player'}
            className="h-full"
            style={{ aspectRatio: '16 / 9', maxWidth: '100%' }}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={handleLoadSuccess}
            onError={handleLoadError}
          />
        </div>
      ) : (
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}> {/* 16:9 aspect ratio */}
          <iframe
            src={videoInfo.embedUrl}
            title={title || 'Video player'}
            className="absolute top-0 left-0 w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={handleLoadSuccess}
            onError={handleLoadError}
          />
        </div>
      )}

      {/* Fallback link */}
      <div className="absolute top-2 right-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-colors"
          title="Open in new tab"
        >
          {/* @ts-ignore */}
          <HiExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
