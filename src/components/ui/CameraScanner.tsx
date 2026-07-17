import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, ZapOff, FlipHorizontal } from 'lucide-react';

interface CameraScannerProps {
  /** 'barcode' = product feed, 'qr' = bill scan */
  mode: 'barcode' | 'qr';
  /** If true, keeps scanning after each detection (POS mode) */
  continuous?: boolean;
  onResult: (value: string) => void;
  onError?: (err: string) => void;
}

const SCANNER_ID = 'html5-qr-scanner';

export const CameraScanner: React.FC<CameraScannerProps> = ({ mode, continuous = false, onResult, onError }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [errorMsg, setErrorMsg] = useState('');
  const resultFired = useRef(false);
  const lastScanned = useRef('');
  const cooldown = useRef(false);

  const formats =
    mode === 'qr'
      ? [Html5QrcodeSupportedFormats.QR_CODE]
      : [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.QR_CODE,
        ];

  const stopScanner = async () => {
    try {
      if (scannerRef.current && isStarted) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }
    } catch (_) {}
    setIsStarted(false);
  };

  const startScanner = async (camera: 'environment' | 'user') => {
    try {
      if (scannerRef.current && isStarted) {
        await stopScanner();
      }

      const scanner = new Html5Qrcode(SCANNER_ID, { verbose: false, formatsToSupport: formats });
      scannerRef.current = scanner;
      resultFired.current = false;
      lastScanned.current = '';

      await scanner.start(
        { facingMode: camera },
        { fps: 10, qrbox: mode === 'qr' ? { width: 220, height: 220 } : { width: 280, height: 100 } },
        (decodedText) => {
          if (continuous) {
            // In continuous mode: allow same code after 2s cooldown
            if (cooldown.current && decodedText === lastScanned.current) return;
            lastScanned.current = decodedText;
            cooldown.current = true;
            if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
            onResult(decodedText);
            // Reset cooldown after 2 seconds so same item can be scanned again
            setTimeout(() => { cooldown.current = false; }, 2000);
          } else {
            // Single-shot mode
            if (resultFired.current) return;
            resultFired.current = true;
            if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
            stopScanner().then(() => onResult(decodedText));
          }
        },
        () => {} // per-frame errors are normal, ignore
      );

      setIsStarted(true);
      setHasPermission(true);
      setErrorMsg('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
        setHasPermission(false);
        setErrorMsg('Camera permission denied. Please allow camera access in your browser settings.');
      } else {
        setErrorMsg(`Camera error: ${msg}`);
      }
      if (onError) onError(msg);
    }
  };

  // Start on mount with a small delay to let the drawer animation finish
  useEffect(() => {
    const timer = setTimeout(() => {
      startScanner(facingMode);
    }, 400); // 400ms delay for animation
    
    return () => {
      clearTimeout(timer);
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFlip = async () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    await stopScanner();
    startScanner(next);
  };

  return (
    <div className="w-full flex flex-col items-center space-y-3">
      {/* Scanner viewport - smart medium size */}
      <div className="relative w-full max-w-[260px] aspect-square rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-inner flex items-center justify-center mx-auto">
        <div id={SCANNER_ID} className="w-full h-full object-cover [&>video]:object-cover [&>video]:w-full [&>video]:h-full" />

        {/* Overlay corner brackets */}
        {isStarted && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div
              className="relative border-2 rounded-xl"
              style={{
                width: 200,
                height: mode === 'qr' ? 200 : 100,
                borderColor: mode === 'qr' ? '#60a5fa' : '#34d399',
              }}
            >
              <div
                className="absolute left-1 right-1 h-0.5 rounded-full laser-line"
                style={{
                  background: mode === 'qr'
                    ? 'linear-gradient(90deg,transparent,#60a5fa,transparent)'
                    : 'linear-gradient(90deg,transparent,#34d399,transparent)',
                  boxShadow: mode === 'qr' ? '0 0 8px #60a5fa' : '0 0 8px #34d399',
                }}
              />
            </div>
          </div>
        )}

        {/* Flip camera button */}
        {isStarted && (
          <button
            onClick={handleFlip}
            className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/70 text-white backdrop-blur-sm active:scale-95 transition-all cursor-pointer z-10"
          >
            <FlipHorizontal size={18} />
          </button>
        )}

        {/* Permission denied state */}
        {hasPermission === false && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-950">
            <ZapOff size={32} className="text-danger mb-3" />
            <p className="text-white text-xs font-bold mb-1">Camera Permission Denied</p>
            <p className="text-slate-400 text-[11px] leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* Error state */}
        {errorMsg && hasPermission !== false && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-950">
            <Camera size={32} className="text-warning mb-3" />
            <p className="text-white text-xs font-bold mb-1">Camera Error</p>
            <p className="text-slate-400 text-[11px] leading-relaxed">{errorMsg}</p>
            <button
              onClick={() => startScanner(facingMode)}
              className="mt-4 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl cursor-pointer active:scale-95"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Status label */}
      <div className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border ${
        mode === 'qr'
          ? 'bg-blue-950/60 text-blue-400 border-blue-900'
          : 'bg-emerald-950/60 text-emerald-400 border-emerald-900'
      }`}>
        {isStarted
          ? continuous
            ? mode === 'qr' ? '🔵 Continuous QR Scan Active' : '🟢 Continuous Barcode Scan'
            : mode === 'qr' ? '🔵 Scanning QR Code...' : '🟢 Scanning Barcode...'
          : 'Starting camera...'}
      </div>
    </div>
  );
};

export default CameraScanner;
