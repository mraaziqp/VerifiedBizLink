'use client';

import { useEffect, useRef } from 'react';

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  maxIntervalMs?: number;
  minLength?: number;
}

/**
 * Global Barcode Scanner Listener Hook
 *
 * Detects rapid keystrokes (<30ms between characters) ending with 'Enter'.
 * USB and Bluetooth barcode scanners mimic a high-speed keyboard input.
 * When a rapid sequence finishes with Enter, it fires `onScan(code)` without
 * interfering with standard form typing.
 */
export function useBarcodeScanner({
  onScan,
  enabled = true,
  maxIntervalMs = 35,
  minLength = 3,
}: UseBarcodeScannerOptions) {
  const bufferRef = useRef<string[]>([]);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const now = performance.now();
      const interval = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // Handle barcode completion on 'Enter'
      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minLength) {
          const barcode = bufferRef.current.join('').trim();
          bufferRef.current = [];
          if (barcode.length >= minLength) {
            e.preventDefault();
            e.stopPropagation();
            onScan(barcode);
            return;
          }
        }
        bufferRef.current = [];
        return;
      }

      // Only buffer printable single characters
      if (e.key.length === 1) {
        // If the interval between characters is greater than maxIntervalMs,
        // it was likely human typing, so reset the buffer unless it's the very first key
        if (interval > maxIntervalMs && bufferRef.current.length > 0) {
          bufferRef.current = [];
        }

        bufferRef.current.push(e.key);

        // Prevent memory leak if buffer grows unexpectedly
        if (bufferRef.current.length > 64) {
          bufferRef.current = bufferRef.current.slice(-32);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, maxIntervalMs, minLength, onScan]);
}
