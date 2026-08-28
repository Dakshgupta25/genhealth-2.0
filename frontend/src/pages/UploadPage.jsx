import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUpload } from '../context/UploadContext';
import DoodleIcon from '../components/common/DoodleIcon';
import CameraCapture from '../components/upload/CameraCapture';
import EditableResultTable from '../components/upload/EditableResultTable';
import UploadHistory from '../components/upload/UploadHistory';
import { Button, Card } from '../components/ui';

export function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { userId } = useAuth();

  const {
    viewMode,
    setViewMode,
    uploadTab,
    setUploadTab,
    selectedFile,
    reportId,
    extractedRows,
    setExtractedRows,
    pipelineSummary,
    isProcessing,
    isSaving,
    errorMessage,
    setErrorMessage,
    processingStage,
    processFileUpload,
    retryUpload,
    handleCameraCapture,
    handleManualEntryInit,
    handleSaveCommit,
    resetFlow,
  } = useUpload();

  // Supported MIME types matching backend _ALLOWED_MIME_TYPES
  const acceptedFileExtensions = ".jpg,.jpeg,.png,.gif,.webp,.pdf";

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFileUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFileUpload(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Error Notification with Retry & Dismiss */}
      {errorMessage && (
        <div className="p-4 rounded-xl text-xs font-semibold text-red-700 bg-red-50 border border-red-200 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-2.5">
            <span className="text-base">⚠️</span>
            <div>
              <span className="font-bold">{errorMessage}</span>
              {selectedFile && (
                <span className="block text-[11px] opacity-80 mt-0.5">
                  File: <span className="font-mono">{selectedFile.name}</span>
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
            {selectedFile && (
              <Button
                variant="danger"
                size="sm"
                id="retry-upload-btn"
                onClick={retryUpload}
                disabled={isProcessing}
                leftIcon={<DoodleIcon name="sparkles" className="w-3.5 h-3.5" />}
              >
                Retry
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              id="dismiss-error-btn"
              onClick={() => setErrorMessage('')}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Unsaved draft banner if user is in 'select' view but has reviewed rows */}
      {viewMode === 'select' && extractedRows.length > 0 && (
        <div className="p-4 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-2.5">
            <span className="text-base">📋</span>
            <span>
              You have an unsaved review in progress with <strong>{extractedRows.length}</strong> measurements.
            </span>
          </div>
          <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setViewMode('review')}
            >
              Resume Review →
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetFlow}
            >
              Discard
            </Button>
          </div>
        </div>
      )}

      {/* VIEW 1: Select / Upload Mode */}
      {viewMode === 'select' && (
        <div className="space-y-6">
          
          {/* Header Card */}
          <Card radius="xl">
            <div className="p-6 sm:p-8 space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-900 text-white dark:bg-slate-800 dark:border dark:border-slate-700">
                  <DoodleIcon name="upload" className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                    Ingest Clinical Lab Report
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Extract unstructured test results with Gemini Flash, LOINC canonical matching, and biomedical NER
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Three Intake Option Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            
            {/* Option 1: File Upload */}
            <Card
              radius="lg"
              interactive
              onClick={() => { setUploadTab('file'); fileInputRef.current?.click(); }}
              className={`p-5 sm:p-6 flex flex-col justify-between space-y-4 ${
                uploadTab === 'file'
                  ? 'border-cyan-500/50 ring-1 ring-cyan-500/20 bg-slate-50/50 dark:bg-slate-800/40'
                  : ''
              }`}
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                  <DoodleIcon name="file" className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  File Upload
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Select digital PDF or image reports (JPEG, PNG, GIF, WEBP) from your device storage.
                </p>
              </div>
              <div>
                <Button variant="outline" size="sm" className="w-full">
                  Browse Files →
                </Button>
              </div>
            </Card>

            {/* Option 2: Live Camera Capture */}
            <Card
              radius="lg"
              interactive
              onClick={() => { setUploadTab('camera'); setViewMode('camera'); }}
              className={`p-5 sm:p-6 flex flex-col justify-between space-y-4 ${
                uploadTab === 'camera'
                  ? 'border-cyan-500/50 ring-1 ring-cyan-500/20 bg-slate-50/50 dark:bg-slate-800/40'
                  : ''
              }`}
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <DoodleIcon name="camera" className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Live Camera Scanner
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Use device webcam or mobile camera to capture physical paper lab printouts directly.
                </p>
              </div>
              <div>
                <Button variant="outline" size="sm" className="w-full">
                  Open Camera →
                </Button>
              </div>
            </Card>

            {/* Option 3: Manual Entry */}
            <Card
              radius="lg"
              interactive
              onClick={handleManualEntryInit}
              className="p-5 sm:p-6 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  <DoodleIcon name="pen" className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Enter Manually
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Directly input individual biomarker measurements, values, and bounds into a structured grid.
                </p>
              </div>
              <div>
                <Button variant="outline" size="sm" className="w-full">
                  Start Manual Table →
                </Button>
              </div>
            </Card>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFileExtensions}
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Drag & Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="p-10 sm:p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-4 cursor-pointer hover:border-cyan-500 dark:hover:border-cyan-400 bg-white dark:bg-slate-900/60 transition-all shadow-xs"
          >
            <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400">
              <DoodleIcon name="upload" className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Drag &amp; drop your lab report here
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Supports PDF, JPEG, PNG, WEBP, and GIF formats up to 25MB
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              type="button"
              leftIcon={<DoodleIcon name="file" className="w-3.5 h-3.5" />}
            >
              Select Document
            </Button>
          </div>

          {/* Upload History with Clickable Measures Table */}
          <UploadHistory userId={userId} />
        </div>
      )}

      {/* VIEW 2: Camera Scanner Mode */}
      {viewMode === 'camera' && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onCancel={() => setViewMode('select')}
        />
      )}

      {/* VIEW 3: Multi-Stage Processing Pipeline */}
      {viewMode === 'processing' && (
        <Card radius="xl" className="max-w-xl mx-auto shadow-lg">
          <div className="p-8 sm:p-10 space-y-8 text-center">
            
            {/* Pulsing Spinner Icon */}
            <div className="relative w-16 h-16 mx-auto">
              <div className="w-16 h-16 rounded-full border-3 border-cyan-200 border-t-cyan-600 animate-spin dark:border-cyan-950 dark:border-t-cyan-400" />
              <div className="absolute inset-0 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                <DoodleIcon name="heartbeat" className="w-6 h-6" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
                Extracting &amp; Analyzing Lab Report
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Processing <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedFile?.name || 'your document'}</span> through the clinical intelligence pipeline.
              </p>
            </div>

            {/* Step Progress Multi-Stage Checklist */}
            <div className="space-y-3 text-left p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs">
              
              {/* Step 1 */}
              <div className="flex items-center space-x-3">
                <span
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                    processingStage >= 2
                      ? 'bg-emerald-600 text-white'
                      : processingStage >= 1
                      ? 'bg-cyan-600 text-white animate-pulse'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {processingStage >= 2 ? '✓' : '1'}
                </span>
                <span className={processingStage >= 1 ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-400'}>
                  Stage 0: Document verification &amp; MIME validation
                </span>
              </div>

              {/* Step 2 */}
              <div className="flex items-center space-x-3">
                <span
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                    processingStage >= 3
                      ? 'bg-emerald-600 text-white'
                      : processingStage === 2
                      ? 'bg-cyan-600 text-white animate-pulse'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {processingStage >= 3 ? '✓' : '2'}
                </span>
                <span className={processingStage >= 2 ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-400'}>
                  Stage 1: Gemini 2.5 Flash OCR &amp; tabular measure parsing
                </span>
              </div>

              {/* Step 3 */}
              <div className="flex items-center space-x-3">
                <span
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                    processingStage >= 4
                      ? 'bg-emerald-600 text-white'
                      : processingStage === 3
                      ? 'bg-cyan-600 text-white animate-pulse'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {processingStage >= 4 ? '✓' : '3'}
                </span>
                <span className={processingStage >= 3 ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-400'}>
                  Stage 2a: RapidFuzz LOINC canonical normalizer
                </span>
              </div>

              {/* Step 4 */}
              <div className="flex items-center space-x-3">
                <span
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                    processingStage > 4
                      ? 'bg-emerald-600 text-white'
                      : processingStage >= 4
                      ? 'bg-cyan-600 text-white animate-pulse'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {processingStage > 4 ? '✓' : '4'}
                </span>
                <span className={processingStage >= 4 ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-400'}>
                  Stage 2b: Biomedical NER &amp; entity relationship tagging
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* VIEW 4: Editable Result Table Review */}
      {viewMode === 'review' && (
        <EditableResultTable
          key={reportId || (uploadTab === 'manual' ? 'manual' : 'review')}
          initialRows={extractedRows}
          reportId={reportId}
          isManual={uploadTab === 'manual'}
          saving={isSaving}
          onChange={setExtractedRows}
          onSave={handleSaveCommit}
          onCancel={resetFlow}
        />
      )}

      {/* VIEW 5: Success Confirmation */}
      {viewMode === 'success' && (
        <Card radius="xl" className="max-w-lg mx-auto text-center shadow-lg">
          <div className="p-8 sm:p-10 space-y-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 shadow-inner">
              <DoodleIcon name="check" className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
                Measurements Saved Successfully
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {pipelineSummary?.result_count || extractedRows.length} clinical measures have been verified and indexed into your longitudinal database.
              </p>
            </div>

            {reportId && (
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300">
                Report Reference ID: {reportId}
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate('/')}
              >
                Go to Dashboard
              </Button>

              <Button
                variant="outline"
                size="md"
                onClick={resetFlow}
              >
                Upload Another Report
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default UploadPage;
