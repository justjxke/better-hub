"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface UseCacheRefreshOptions {
  // Key to identify the cache entry being refreshed
  cacheKey: string;
  // Interval in milliseconds to check for updates (default: 5 seconds)
  checkInterval?: number;
  // Maximum time to wait for updates before stopping (default: 2 minutes)
  maxWaitTime?: number;
  // Whether to enable the refresh mechanism
  enabled?: boolean;
}

interface CacheRefreshState {
  isRefreshing: boolean;
  lastRefreshed: Date | null;
}

export function useCacheRefresh({
  cacheKey,
  checkInterval = 5000,
  maxWaitTime = 120000,
  enabled = true,
}: UseCacheRefreshOptions): CacheRefreshState {
  const router = useRouter();
  const [state, setState] = useState<CacheRefreshState>({
    isRefreshing: false,
    lastRefreshed: null,
  });
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkCacheStatus = useCallback(async () => {
    if (!startTimeRef.current) return;

    try {
      const response = await fetch(`/api/cache-status?key=${encodeURIComponent(cacheKey)}`);
      if (!response.ok) return;

      const data = await response.json();
      
      // If cache was updated after we started checking
      if (data.syncedAt && new Date(data.syncedAt).getTime() > startTimeRef.current) {
        // Refresh the page to show new data
        router.refresh();
        setState({ isRefreshing: false, lastRefreshed: new Date(data.syncedAt) });
        
        // Clear the interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        startTimeRef.current = null;
      }
      
      // Check if we've exceeded max wait time
      else if (Date.now() - startTimeRef.current > maxWaitTime) {
        setState((prev) => ({ ...prev, isRefreshing: false }));
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        startTimeRef.current = null;
      }
    } catch (error) {
      console.error("Failed to check cache status:", error);
    }
  }, [cacheKey, maxWaitTime, router]);

  // Start monitoring when component mounts or cache key changes
  useEffect(() => {
    if (!enabled) return;

    // Mark that we're starting to check for updates
    startTimeRef.current = Date.now();
    setState((prev) => ({ ...prev, isRefreshing: true }));

    // Set up periodic check
    intervalRef.current = setInterval(checkCacheStatus, checkInterval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      startTimeRef.current = null;
    };
  }, [cacheKey, checkInterval, checkCacheStatus, enabled]);

  return state;
}

// Hook to show stale data indicator
export function useStaleDataIndicator(lastUpdated?: string | Date) {
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    if (!lastUpdated) {
      setIsStale(false);
      return;
    }

    const checkStaleness = () => {
      const updatedTime = typeof lastUpdated === "string" 
        ? new Date(lastUpdated).getTime() 
        : lastUpdated.getTime();
      
      // Consider data stale if it's older than 5 minutes
      const STALE_THRESHOLD = 5 * 60 * 1000;
      setIsStale(Date.now() - updatedTime > STALE_THRESHOLD);
    };

    checkStaleness();
    
    // Check every minute
    const interval = setInterval(checkStaleness, 60000);
    
    return () => clearInterval(interval);
  }, [lastUpdated]);

  return isStale;
}