import React from 'react';

interface LoadingSkeletonProps {
  count?: number;
  variant?: 'card' | 'detail' | 'list';
}

export function NewsCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
      {/* Image Skeleton */}
      <div className="h-48 w-full bg-gray-300 dark:bg-gray-600" />
      
      {/* Content Skeleton */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
        
        {/* Content */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full" />
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6" />
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-2/3" />
        </div>
        
        {/* Meta Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-gray-300 dark:bg-gray-600 rounded" />
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-20" />
            <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded-full w-16" />
          </div>
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-24" />
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20" />
          <div className="flex space-x-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-12" />
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function NewsDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-4" />
        <div className="flex items-center space-x-4 mb-6">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32" />
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24" />
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-20" />
        </div>
      </div>

      {/* Images */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="h-64 bg-gray-300 dark:bg-gray-600 rounded-lg" />
        <div className="h-64 bg-gray-300 dark:bg-gray-600 rounded-lg" />
      </div>

      {/* Content */}
      <div className="space-y-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full" />
        ))}
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-2/3" />
      </div>

      {/* Author Card */}
      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="h-12 w-12 bg-gray-300 dark:bg-gray-600 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-32" />
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-48" />
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function NewsListSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start space-x-4">
            <div className="h-16 w-20 bg-gray-300 dark:bg-gray-600 rounded flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full" />
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-2/3" />
              <div className="flex items-center space-x-4 mt-2">
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-20" />
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-24" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LoadingSkeleton({ count = 3, variant = 'card' }: LoadingSkeletonProps) {
  if (variant === 'detail') {
    return <NewsDetailSkeleton />;
  }
  
  if (variant === 'list') {
    return <NewsListSkeleton />;
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <NewsCardSkeleton key={i} />
      ))}
    </div>
  );
}
