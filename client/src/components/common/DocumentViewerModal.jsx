import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Download,
  ZoomIn,
  ZoomOut,
  FileText,
  ShieldCheck,
  Eye,
  Maximize2
} from 'lucide-react';

export const DocumentViewerModal = ({ doc, isOpen, onClose }) => {
  const [isZoomed, setIsZoomed] = useState(false);

  // Close on ESC key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset zoom state whenever document changes
  useEffect(() => {
    setIsZoomed(false);
  }, [doc]);

  if (!isOpen || !doc) return null;

  // Determine if document is PDF
  const isPdf = Boolean(
    doc.fileType === 'application/pdf' ||
    doc.fileName?.toLowerCase().endsWith('.pdf') ||
    (typeof doc.fileUrl === 'string' && doc.fileUrl.startsWith('data:application/pdf'))
  );

  // Safe helper to open in a dedicated browser tab (handles data: URIs via Blob URL)
  const handleOpenInNewTab = (e) => {
    if (e) e.preventDefault();
    if (!doc.fileUrl) return;

    if (doc.fileUrl.startsWith('data:')) {
      try {
        const parts = doc.fileUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || (isPdf ? 'application/pdf' : 'image/jpeg');
        const byteCharacters = atob(parts[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const newWin = window.open(blobUrl, '_blank');
        if (!newWin) {
          window.location.href = blobUrl;
        }
        return;
      } catch (err) {
        console.warn('Could not open as blob url:', err);
      }
    }

    window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
  };

  // Safe file downloader
  const handleDownload = (e) => {
    if (e) e.preventDefault();
    if (!doc.fileUrl) return;

    try {
      const link = document.createElement('a');
      link.href = doc.fileUrl;
      link.download = doc.fileName || `${(doc.title || 'document').replace(/\s+/g, '_')}.${isPdf ? 'pdf' : 'jpg'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.warn('Download error:', err);
      handleOpenInNewTab(e);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/90 rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 font-bold ${
              isPdf ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}>
              {isPdf ? <FileText className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                  {doc.title || 'Document Full Preview'}
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                  isPdf
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : 'bg-blue-950 text-blue-300 border border-blue-800'
                }`}>
                  {isPdf ? 'PDF Document' : 'Image Scan'}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {doc.fileName || 'Verified Document'}
                {doc.fileSize ? ` • ${doc.fileSize}` : ''}
                {doc.docNumber || doc.number ? ` • Reg #: ${doc.docNumber || doc.number}` : ''}
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Zoom button for images */}
            {!isPdf && doc.fileUrl && (
              <button
                type="button"
                onClick={() => setIsZoomed(!isZoomed)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                title={isZoomed ? "Fit to window" : "Zoom to 100% full resolution"}
              >
                {isZoomed ? <ZoomOut className="w-3.5 h-3.5 text-amber-400" /> : <ZoomIn className="w-3.5 h-3.5 text-amber-400" />}
                <span className="hidden sm:inline">{isZoomed ? 'Fit to Screen' : 'Zoom 100%'}</span>
              </button>
            )}

            {/* Open in Dedicated Browser Tab */}
            {doc.fileUrl && (
              <button
                type="button"
                onClick={handleOpenInNewTab}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                title="Open in dedicated full-screen browser window"
              >
                <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Open in Tab</span>
              </button>
            )}

            {/* Download */}
            {doc.fileUrl && (
              <button
                type="button"
                onClick={handleDownload}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                title="Download file"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Download</span>
              </button>
            )}

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-900/60 hover:text-rose-200 text-slate-400 flex items-center justify-center font-bold text-sm transition"
              title="Close Preview (ESC)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MODAL BODY (FULL SIZE VIEWER) */}
        <div className="flex-1 overflow-auto bg-slate-950 p-2 sm:p-4 flex items-center justify-center relative">
          {doc.fileUrl ? (
            isPdf ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <iframe
                  src={doc.fileUrl}
                  title={doc.title || 'PDF Document Scan'}
                  className="w-full h-full rounded-2xl bg-white border border-slate-800 shadow-inner"
                />
              </div>
            ) : (
              <div
                className={`w-full h-full flex items-center justify-center overflow-auto p-1 ${
                  isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
                }`}
                onClick={() => setIsZoomed(!isZoomed)}
                title={isZoomed ? "Click to fit screen" : "Click to view full 100% resolution"}
              >
                <img
                  src={doc.fileUrl}
                  alt={doc.title || 'Uploaded Document'}
                  className={`transition-all duration-150 rounded-xl shadow-2xl select-none ${
                    isZoomed
                      ? 'max-w-none w-auto max-h-none'
                      : 'max-w-full max-h-full object-contain'
                  }`}
                />
              </div>
            )
          ) : (
            <div className="text-center p-8 space-y-3 text-slate-400 max-w-md">
              <FileText className="w-14 h-14 mx-auto text-slate-600" />
              <div className="font-bold text-sm text-slate-200">No Image/PDF Scan Attached</div>
              <p className="text-xs text-slate-400">
                A registration reference number was provided: <span className="font-mono text-amber-400">{doc.docNumber || doc.number || 'N/A'}</span>.
                No visual scan file is available for full-size inspection.
              </p>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-3 sm:px-6 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Official Compliance & KYC Verification Document • MessConnect Business Network</span>
          </div>

          <div className="flex items-center justify-end gap-2">
            {!isPdf && doc.fileUrl && (
              <span className="text-[11px] text-slate-400 hidden sm:inline mr-2">
                {isZoomed ? '🔍 Viewing at 100% size' : '🔍 Viewing fitted to window (click to zoom)'}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
