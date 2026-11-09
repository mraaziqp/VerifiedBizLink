'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Scans product barcodes with the device camera using the browser's built-in
 * BarcodeDetector (Chrome on Android, the Android app's WebView, and others).
 * Where it isn't available the button doesn't render, and the typed / USB
 * scanner field keeps working. Nothing is sent anywhere: detection runs on
 * the device.
 */

interface DetectedBarcode { rawValue: string }
interface BarcodeDetectorLike { detect(source: CanvasImageSource): Promise<DetectedBarcode[]> }
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'];

export function cameraScanSupported(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia;
}

export function CameraScanner({ onCode }: { onCode: (code: string) => void }) {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => setSupported(cameraScanSupported()), []);

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  };

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        const Detector = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector;
        const detector = new Detector({ formats: FORMATS });
        const tick = async () => {
          if (cancelled) return;
          try {
            const found = await detector.detect(video);
            if (found[0]?.rawValue) {
              if (navigator.vibrate) navigator.vibrate(60);
              onCode(found[0].rawValue.trim());
              stop();
              return;
            }
          } catch { /* frame not ready */ }
          timer = setTimeout(tick, 250);
        };
        tick();
      } catch (err) {
        setError(err instanceof Error && err.name === 'NotAllowedError' ? 'Camera permission was refused.' : 'Could not start the camera.');
        setActive(false);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!supported) return null;
  return (
    <div className="space-y-2">
      {active ? (
        <div className="relative overflow-hidden rounded-2xl bg-black">
          <video ref={videoRef} className="h-56 w-full object-cover" muted playsInline aria-label="Camera preview" />
          <div aria-hidden className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-rose-500/80" />
          <button onClick={stop} className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5" aria-label="Stop camera"><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => { setError(null); setActive(true); }} className="w-full rounded-xl text-xs font-bold">
          <Camera className="h-4 w-4 mr-1.5" /> Scan with camera
        </Button>
      )}
      {error && <p className="text-xs text-rose-700">{error}</p>}
    </div>
  );
}
