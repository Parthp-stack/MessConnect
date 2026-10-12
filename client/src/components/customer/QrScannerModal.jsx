import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  Camera, X, CheckCircle2, AlertTriangle, RefreshCw, Upload,
  Zap, Info, Clock, Utensils, ShieldCheck, ChevronRight
} from 'lucide-react';

export const QrScannerModal = ({ isOpen, onClose, onAttendanceMarked, currentMessId, currentMessName }) => {
  const { currentUser } = useAuth();
  const { showToast } = useNotification();

  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [scanResult, setScanResult] = useState(null); // { success, message, record, error }
  const [manualToken, setManualToken] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);

  const html5QrCodeRef = useRef(null);
  const scannerContainerId = 'messconnect-qr-reader';
  const fileInputRef = useRef(null);

  // Stop camera helper
  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('[QrScannerModal] Error stopping scanner:', err);
      }
    }
    setScanning(false);
  };

  // Start camera scanner
  const startScanner = async (cameraId = null) => {
    setCameraError(null);
    setScanResult(null);

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
      }

      // If already scanning, stop first
      if (html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }

      // Enumerate available cameras
      let devCameras = cameras;
      if (!devCameras || devCameras.length === 0) {
        try {
          devCameras = await Html5Qrcode.getCameras();
          setCameras(devCameras || []);
        } catch (e) {
          console.warn('[QrScannerModal] Could not get cameras list:', e);
        }
      }

      // Prefer back camera if available
      const cameraConfig = cameraId
        ? { deviceId: { exact: cameraId } }
        : { facingMode: 'environment' };

      const qrCodeSuccessCallback = async (decodedText) => {
        console.log('[QrScannerModal] QR Code detected:', decodedText);
        // Play quick audio chime
        playScanChime();
        await stopScanner();
        handleProcessScanPayload(decodedText);
      };

      const qrCodeErrorCallback = () => {
        // Continuous scan error frames are ignored
      };

      await html5QrCodeRef.current.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0
        },
        qrCodeSuccessCallback,
        qrCodeErrorCallback
      );

      setScanning(true);
    } catch (err) {
      console.warn('[QrScannerModal] Camera start error:', err);
      setScanning(false);
      const errMsg = err?.name === 'NotAllowedError' || String(err).includes('Permission')
        ? 'Camera permission denied. Please allow camera access in browser settings or upload a QR image below.'
        : 'Could not access device camera. You can upload a QR image or enter token manually.';
      setCameraError(errMsg);
    }
  };

  // Play pleasant ding sound using Web Audio API
  const playScanChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      // Audio optional
    }
  };

  // Handle scanned string/token
  const handleProcessScanPayload = async (rawString) => {
    setProcessing(true);
    setScanResult(null);

    try {
      let parsedPayload = null;
      try {
        parsedPayload = JSON.parse(rawString);
      } catch {
        parsedPayload = { token: rawString.trim() };
      }

      const token = parsedPayload.token || rawString.trim();
      const messId = parsedPayload.messId || currentMessId;
      const sessionId = parsedPayload.sessionId;

      // Phase 2: Retrieve device coordinates if geolocation is available
      let coords = null;
      if (typeof window !== 'undefined' && navigator.geolocation) {
        try {
          coords = await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
              () => resolve(null),
              { timeout: 3500, enableHighAccuracy: true }
            );
          });
        } catch (e) {
          coords = null;
        }
      }

      const res = await api.markAttendance({
        token,
        messId,
        sessionId,
        rawPayload: rawString,
        latitude: coords?.latitude,
        longitude: coords?.longitude
      });

      if (res && res.success) {
        // Success: Trigger confetti burst
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 }
          });
        } catch {}

        setScanResult({
          success: true,
          message: res.message || 'Attendance Marked Successfully!',
          record: res.record
        });

        showToast('Attendance recorded as PRESENT!', 'success', '✅ Attendance Marked');
        if (onAttendanceMarked) {
          onAttendanceMarked(res.record);
        }
      } else {
        setScanResult({
          success: false,
          code: res.code || 'ERROR',
          message: res.message || 'Failed to mark attendance'
        });
      }
    } catch (err) {
      console.warn('[QrScannerModal] Verification error:', err);
      const isAlready = err.message?.includes('already marked') || err.message?.includes('ALREADY_MARKED');
      setScanResult({
        success: false,
        code: isAlready ? 'ALREADY_MARKED' : 'ERROR',
        message: err.message || 'Invalid or expired QR code.'
      });
    } finally {
      setProcessing(false);
    }
  };

  // Scan from uploaded file
  const handleFileUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setProcessing(true);
    setCameraError(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
      }
      const decodedText = await html5QrCodeRef.current.scanFile(file, true);
      playScanChime();
      handleProcessScanPayload(decodedText);
    } catch (err) {
      setScanResult({
        success: false,
        message: 'Could not read a valid QR code from this image. Please ensure the QR is clear and well-lit.'
      });
    } finally {
      setProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Flip camera toggle
  const handleFlipCamera = () => {
    if (cameras.length > 1) {
      const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
      const nextIndex = (currentIndex + 1) % cameras.length;
      const nextCamera = cameras[nextIndex];
      setSelectedCameraId(nextCamera.id);
      startScanner(nextCamera.id);
    } else {
      // Toggle environment vs user
      startScanner();
    }
  };

  // Lifecycle on modal open/close
  useEffect(() => {
    if (isOpen) {
      setScanResult(null);
      setCameraError(null);
      setManualToken('');
      setShowManualInput(false);
      // Small timeout to allow DOM container to mount
      const timer = setTimeout(() => {
        startScanner();
      }, 250);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">

        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm leading-tight">Scan Mess Attendance QR</h3>
              <p className="text-[10px] text-orange-100">{currentMessName || 'Point camera at Mess Owner QR'}</p>
            </div>
          </div>

          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 flex flex-col items-center">

          {/* 1. SUCCESS RESULT CARD */}
          {scanResult && scanResult.success && (
            <div className="w-full p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-wide">
                  Verified Present
                </span>
                <h4 className="text-base font-extrabold text-emerald-950 mt-1">
                  Attendance Marked Successfully!
                </h4>
              </div>

              <div className="p-3 rounded-xl bg-white border border-emerald-100 text-left text-xs space-y-1.5 shadow-2xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mess:</span>
                  <span className="font-bold text-slate-800">{scanResult.record?.messName || currentMessName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Session:</span>
                  <span className="font-extrabold text-orange-600">{scanResult.record?.sessionType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span className="font-semibold text-slate-800">{scanResult.record?.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Marked Time:</span>
                  <span className="font-bold text-emerald-700">{scanResult.record?.time}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  stopScanner();
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
              >
                Done
              </button>
            </div>
          )}

          {/* 2. ERROR RESULT CARD */}
          {scanResult && !scanResult.success && (
            <div className="w-full p-4 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-2.5 animate-in shake duration-200">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                {scanResult.code === 'ALREADY_MARKED' ? (
                  <Info className="w-6 h-6 text-amber-600" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                )}
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {scanResult.code === 'ALREADY_MARKED'
                    ? 'Attendance Already Marked'
                    : 'Attendance Not Recorded'}
                </h4>
                <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                  {scanResult.message}
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setScanResult(null);
                    startScanner();
                  }}
                  className="flex-1 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition"
                >
                  Try Again
                </button>
                <button
                  onClick={() => {
                    stopScanner();
                    onClose();
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* 3. CAMERA VIEWPORT */}
          {!scanResult && (
            <div className="w-full flex flex-col items-center">
              
              {/* HTML5 QR Container */}
              <div className="relative w-full aspect-square max-w-[280px] bg-slate-900 rounded-2xl overflow-hidden border-2 border-orange-500 shadow-md flex items-center justify-center">
                
                {/* HTML5 QR target element */}
                <div id={scannerContainerId} className="w-full h-full"></div>

                {/* Processing Overlay */}
                {processing && (
                  <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center text-white z-20 space-y-2">
                    <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
                    <span className="text-xs font-bold">Validating QR Code...</span>
                    <span className="text-[10px] text-slate-400">Verifying subscription & security token</span>
                  </div>
                )}

                {/* Fallback overlay when camera errored */}
                {cameraError && !scanning && !processing && (
                  <div className="absolute inset-0 bg-slate-900 p-4 flex flex-col items-center justify-center text-center text-white z-10 space-y-2">
                    <Camera className="w-8 h-8 text-slate-400" />
                    <p className="text-[11px] text-slate-300">{cameraError}</p>
                    <button
                      onClick={() => startScanner()}
                      className="px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-bold"
                    >
                      Retry Camera
                    </button>
                  </div>
                )}
              </div>

              {/* Camera Controls & Fallbacks */}
              <div className="w-full mt-3 flex items-center justify-between text-xs">
                {cameras.length > 1 && (
                  <button
                    onClick={handleFlipCamera}
                    disabled={processing}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition"
                  >
                    <Camera className="w-3.5 h-3.5 text-slate-500" />
                    <span>Flip Camera</span>
                  </button>
                )}

                {/* Upload Image Fallback */}
                <label className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer transition">
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>Scan Image</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {/* Manual Token Toggle */}
                <button
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="text-orange-600 font-semibold text-[11px] underline"
                >
                  {showManualInput ? 'Hide Manual' : 'Enter Token'}
                </button>
              </div>

              {/* Manual Token Input (for testing / simulated scan) */}
              {showManualInput && (
                <div className="w-full mt-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 animate-in fade-in">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    Manual Attendance Token / Scanned String
                  </label>
                  <input
                    type="text"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Paste attendance token or JSON payload..."
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                  />
                  <button
                    onClick={() => {
                      if (manualToken.trim()) {
                        handleProcessScanPayload(manualToken.trim());
                      }
                    }}
                    disabled={!manualToken.trim() || processing}
                    className="w-full py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs disabled:opacity-50 transition"
                  >
                    Verify & Mark Attendance
                  </button>
                </div>
              )}

              <p className="text-[11px] text-slate-400 text-center mt-3 leading-relaxed">
                Position the QR code within the frame to scan. Attendance is validated securely by the server.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
