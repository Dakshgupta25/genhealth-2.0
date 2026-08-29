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
    <Card radius="lg" className="max-w-2xl mx-auto bg-white border border-[#E3E3DF] dark:border-[#303030]">
      <CardHeader className="flex flex-row items-center justify-between border-b border-[#E3E3DF] dark:border-[#303030] pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-[6px] flex items-center justify-center bg-[#F4F4F2] text-[#171717] dark:bg-[#252525] dark:text-[#F0F0F0]">
            <DoodleIcon name="camera" className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-base">Document Camera Scanner</CardTitle>
            <p className="text-xs text-[#5F6368] dark:text-[#A0A0A0]">
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
          <div className="p-6 rounded-[8px] text-center space-y-3 bg-[#FCEBED] border border-[#E8B4B9] text-[#B4232F] dark:bg-[#2D1416] dark:border-[#522226] dark:text-[#E04855]">
            <p className="text-sm font-medium">{error}</p>
            <Button variant="primary" size="sm" onClick={onCancel}>
              Return to File Upload
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-[8px] overflow-hidden bg-[#141414] aspect-video flex items-center justify-center border border-[#E3E3DF] dark:border-[#303030]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Guide overlay */}
              <div className="absolute inset-6 sm:inset-8 border border-dashed border-white/60 rounded-[8px] pointer-events-none flex items-center justify-center">
                <span className="text-[11px] font-semibold text-white/90 bg-[#141414]/80 px-3 py-1 rounded-[4px] backdrop-blur-xs">
                  Position lab report flat within guide
                </span>
              </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={toggleFacingMode}
                leftIcon={<DoodleIcon name="camera" className="w-4 h-4 text-[#5F6368]" />}
              >
                Flip Camera
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={handleCapture}
                leftIcon={<DoodleIcon name="sparkles" className="w-4 h-4 text-white" />}
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
