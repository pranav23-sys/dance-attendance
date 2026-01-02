// src/hooks/usePerformance.ts - 2026 Performance Monitoring

import { useEffect, useState, useCallback } from 'react';

interface PerformanceMetrics {
  fcp: number | null; // First Contentful Paint
  lcp: number | null; // Largest Contentful Paint
  cls: number | null; // Cumulative Layout Shift
  fid: number | null; // First Input Delay
  ttfb: number | null; // Time to First Byte
}

interface BatteryInfo {
  level: number | null;
  charging: boolean | null;
  chargingTime: number | null;
  dischargingTime: number | null;
}

interface NetworkInfo {
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean | null;
}

export function usePerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    cls: null,
    fid: null,
    ttfb: null,
  });

  const [battery, setBattery] = useState<BatteryInfo>({
    level: null,
    charging: null,
    chargingTime: null,
    dischargingTime: null,
  });

  const [network, setNetwork] = useState<NetworkInfo>({
    effectiveType: null,
    downlink: null,
    rtt: null,
    saveData: null,
  });

  // Monitor Core Web Vitals
  useEffect(() => {
    if (typeof window === 'undefined' || !window.performance) return;

    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          setMetrics(prev => ({ ...prev, fcp: entry.startTime }));
        }
      }
    });
    fcpObserver.observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }));
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // Cumulative Layout Shift
    const clsObserver = new PerformanceObserver((list) => {
      let clsValue = 0;
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      setMetrics(prev => ({ ...prev, cls: clsValue }));
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        setMetrics(prev => ({ ...prev, fid: (entry as any).processingStart - entry.startTime }));
      }
    });
    fidObserver.observe({ entryTypes: ['first-input'] });

    return () => {
      fcpObserver.disconnect();
      lcpObserver.disconnect();
      clsObserver.disconnect();
      fidObserver.disconnect();
    };
  }, []);

  // Monitor Battery Status
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('getBattery' in navigator)) return;

    const updateBattery = (battery: any) => {
      setBattery({
        level: battery.level,
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime,
      });
    };

    (navigator as any).getBattery().then((battery: any) => {
      updateBattery(battery);

      battery.addEventListener('levelchange', () => updateBattery(battery));
      battery.addEventListener('chargingchange', () => updateBattery(battery));
      battery.addEventListener('chargingtimechange', () => updateBattery(battery));
      battery.addEventListener('dischargingtimechange', () => updateBattery(battery));
    });
  }, []);

  // Monitor Network Status
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('connection' in navigator)) return;

    const updateNetwork = (connection: any) => {
      setNetwork({
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      });
    };

    const connection = (navigator as any).connection;
    updateNetwork(connection);

    connection.addEventListener('change', () => updateNetwork(connection));
  }, []);

  // Performance-based feature toggling
  const shouldReduceMotion = battery.level !== null && battery.level < 0.2;
  const shouldReduceData = network.saveData || (network.effectiveType && ['slow-2g', '2g'].includes(network.effectiveType));

  return {
    metrics,
    battery,
    network,
    shouldReduceMotion,
    shouldReduceData,
  };
}

// Resource loading optimization
export function useResourceHints() {
  useEffect(() => {
    // Preload critical resources
    const preloadLinks = [
      { href: '/icon-192.png', as: 'image', type: 'image/png' },
      { href: '/apple-touch-icon.png', as: 'image', type: 'image/png' },
    ];

    preloadLinks.forEach(({ href, as, type }) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = as;
      if (type) link.type = type;
      document.head.appendChild(link);
    });

    // Prefetch likely routes
    const prefetchRoutes = ['/classes', '/students', '/awards'];
    prefetchRoutes.forEach(route => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = route;
      document.head.appendChild(link);
    });
  }, []);
}

// Adaptive loading based on performance
export function useAdaptiveLoading() {
  const { shouldReduceData, network } = usePerformance();

  const loadImage = useCallback((src: string, options: { quality?: 'low' | 'high' } = {}) => {
    if (shouldReduceData) {
      // Load low quality version or skip decorative images
      return src.replace(/\.(jpg|png|webp)/, '_low.$1');
    }

    if (options.quality === 'low') {
      return src.replace(/\.(jpg|png|webp)/, '_low.$1');
    }

    return src;
  }, [shouldReduceData]);

  const shouldLoadAnimation = useCallback((animationType: string) => {
    if (shouldReduceData) return false;
    if (network.effectiveType === '4g') return true;
    if (network.effectiveType === '3g') return animationType === 'simple';
    return false;
  }, [shouldReduceData, network.effectiveType]);

  return {
    loadImage,
    shouldLoadAnimation,
    networkQuality: network.effectiveType,
  };
}
