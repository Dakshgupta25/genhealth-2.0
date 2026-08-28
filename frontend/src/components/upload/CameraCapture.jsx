import React, { useState, useRef, useEffect } from 'react';
import DoodleIcon from '../common/DoodleIcon';
import { Button, Card, CardHeader, CardTitle, CardContent } from '../ui';

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
    <Card radius="xl" className="max-w-2xl mx-auto shadow-md">
      <CardHeader className="flex flex-row items-center justify-between border-b border-[#EDF1ED] dark:border-[#1A2421] pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#E3EFE9] text-[#0D5446] dark:bg-[#1A332B] dark:text-[#3BB298]">
            <DoodleIcon name="camera" className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-base">Live Document Capture</CardTitle>
            <p className="text-xs text-[#586D66] dark:text-[#7C9184]">
              Align physical paper lab sheet inside viewfinder
            </p>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-4">
        {error ? (
          <div className="p-6 rounded-xl text-center space-y-3 bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B] dark:bg-[#2B1212] dark:border-[#4C1D1D] dark:text-[#F87171]">
            <p className="text-sm font-medium">{error}</p>
            <Button variant="primary" size="sm" onClick={onCancel}>
              Return to File Upload
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden bg-[#0E1412] aspect-video flex items-center justify-center border border-[#D0D9D0] dark:border-[#2A3B34] shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Guide overlay */}
              <div className="absolute inset-6 sm:inset-8 border-2 border-dashed border-white/50 rounded-xl pointer-events-none flex items-center justify-center">
                <span className="text-[11px] font-semibold text-white/90 bg-[#0E1412]/70 px-3.5 py-1 rounded-full backdrop-blur-xs shadow-xs">
                  Position lab report flat within guide
                </span>
              </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={toggleFacingMode}
                leftIcon={<DoodleIcon name="camera" className="w-4 h-4" />}
              >
                Flip Camera
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={handleCapture}
                leftIcon={<DoodleIcon name="sparkles" className="w-4 h-4 text-emerald-300 dark:text-[#3BB298]" />}
              >
                Capture &amp; Extract
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CameraCapture;
