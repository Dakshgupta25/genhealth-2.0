import React, { useState, useRef, useEffect } from 'react';
import DoodleIcon from '../common/DoodleIcon';

export function CameraCapture({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const [facingMode, setFacingMode] = useState('environment'); // environment (back) or user (front)

  useEffect(() => {
    let activeStream = null;

    async function startCamera() {
      setError('');
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera capture is not supported by your browser or connection.');
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });

        activeStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        setError(err.message || 'Unable to access camera. Please check permissions.');
      }
    }

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const file = new File([blob], `medical_report_${timestamp}.jpg`, { type: 'image/jpeg' });
          if (stream) {
            stream.getTracks().forEach((t) => t.stop());
          }
          onCapture(file);
        }
      },
      'image/jpeg',
      0.92
    );
  };

  const toggleFacingMode = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div className="p-6 rounded-3xl border shadow-xl space-y-4 max-w-2xl mx-auto transition-all"
         style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <DoodleIcon name="camera" className="w-5 h-5" />
          <h3 className="text-lg font-bold">Live Document Capture</h3>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-semibold px-3 py-1.5 rounded-xl border hover:opacity-80 transition-all"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
        >
          Cancel
        </button>
      </div>

      {error ? (
        <div className="p-6 rounded-2xl text-center space-y-3 bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300">
          <p className="text-sm font-medium">{error}</p>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            Return to File Upload
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border"
               style={{ borderColor: 'var(--border-subtle)' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Guide overlay */}
            <div className="absolute inset-8 border-2 border-dashed border-white/40 rounded-xl pointer-events-none flex items-center justify-center">
              <span className="text-[11px] font-medium text-white/80 bg-black/40 px-3 py-1 rounded-full backdrop-blur-xs">
                Align lab report within frame
              </span>
            </div>
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={toggleFacingMode}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold border flex items-center space-x-2 transition-all hover:opacity-80"
              style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              <DoodleIcon name="camera" className="w-4 h-4" />
              <span>Flip Camera</span>
            </button>

            <button
              type="button"
              onClick={handleCapture}
              className="px-6 py-3 rounded-2xl text-sm font-bold text-white shadow-lg flex items-center space-x-2 transition-all active:scale-95"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              <DoodleIcon name="camera" className="w-5 h-5" />
              <span>Capture & Extract</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CameraCapture;
