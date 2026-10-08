import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, X, RefreshCw } from "lucide-react";

const BarcodeScanner = ({ onScan, onClose, title = "Scan Barcode / IMEI" }) => {
  const [errorMsg, setErrorMsg] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const scannerRef = useRef(null);
  const isStoppedRef = useRef(false);
  const elementIdRef = useRef(`reader-${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    isStoppedRef.current = false;
    const scanner = new Html5Qrcode(elementIdRef.current);
    scannerRef.current = scanner;

    const startConfig = {
      fps: 15,
      qrbox: { width: 280, height: 160 },
      aspectRatio: 1.333333,
    };

    const handleSuccess = (decodedText) => {
      if (isStoppedRef.current) return;
      isStoppedRef.current = true;
      if (scanner.isScanning) {
        scanner.stop().catch(() => {});
      }
      if (onScan) {
        onScan(decodedText);
      }
    };

    const handleError = () => {
      // Ignore intermediate frame scan misses
    };

    // Try environment (rear) camera first, fall back to any available camera
    scanner
      .start({ facingMode: "environment" }, startConfig, handleSuccess, handleError)
      .then(() => {
        setIsInitializing(false);
      })
      .catch((err) => {
        console.warn("Back camera unavailable, attempting fallback to default camera...", err);
        scanner
          .start({ facingMode: "user" }, startConfig, handleSuccess, handleError)
          .then(() => {
            setIsInitializing(false);
          })
          .catch((fallbackErr) => {
            console.error("Camera access failed:", fallbackErr);
            setIsInitializing(false);
            setErrorMsg("Camera permission denied or camera not found on this device.");
          });
      });

    return () => {
      isStoppedRef.current = true;
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="relative flex flex-col items-center p-4 bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between w-full mb-3 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2 text-gray-800 font-bold text-sm">
          <Camera size={18} className="text-emerald-600" />
          <span>{title}</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Viewfinder Container */}
      <div className="relative w-[300px] h-[220px] bg-black rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
        <div id={elementIdRef.current} className="w-full h-full" />

        {isInitializing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white gap-2 z-10">
            <RefreshCw size={24} className="animate-spin text-emerald-400" />
            <span className="text-xs font-medium">Accessing camera...</span>
          </div>
        )}

        {errorMsg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 text-white p-4 text-center z-10">
            <p className="text-xs text-red-300 font-semibold mb-2">{errorMsg}</p>
            <p className="text-[10px] text-gray-400">Please enable camera permissions in your browser address bar.</p>
          </div>
        )}
      </div>

      <p className="text-[11px] text-gray-500 font-medium text-center mt-3">
        Align barcode, IMEI, or QR code inside the viewfinder window.
      </p>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-all"
        >
          Cancel
        </button>
      )}
    </div>
  );
};

export default BarcodeScanner;