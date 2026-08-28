import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUpload } from '../context/UploadContext';
import DoodleIcon from '../components/common/DoodleIcon';
import CameraCapture from '../components/upload/CameraCapture';
import EditableResultTable from '../components/upload/EditableResultTable';
import UploadHistory from '../components/upload/UploadHistory';

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
    <div className="space-y-6">
      
      {/* Error Notification with Retry & Dismiss */}
      {errorMessage && (
        <div className="p-4 rounded-2xl text-xs font-semibold text-red-700 bg-red-50 border border-red-200 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
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
              <button
                type="button"
                id="retry-upload-btn"
                onClick={retryUpload}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
              >
                <DoodleIcon name="sparkles" className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            )}
            <button
              type="button"
              id="dismiss-error-btn"
              onClick={() => setErrorMessage('')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-red-300 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Unsaved draft banner if user is in 'select' view but has reviewed rows */}
      {viewMode === 'select' && extractedRows.length > 0 && (
        <div className="p-4 rounded-2xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center space-x-2.5">
            <span className="text-base">📋</span>
            <span>
              You have an unsaved review in progress with <strong>{extractedRows.length}</strong> measurements.
            </span>
          </div>
          <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('review')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 transition-all shadow-sm"
            >
              Resume Review →
            </button>
            <button
              type="button"
              onClick={resetFlow}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-all"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* VIEW: Select / Upload Mode */}
      {viewMode === 'select' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Header Card */}
          <div className="p-8 rounded-3xl border shadow-sm space-y-3"
               style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
            <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                 style={{ backgroundColor: 'var(--brand-primary)' }}>
              <DoodleIcon name="upload" className="w-4 h-4" />
            </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  Ingest Medical Lab Document
                </h1>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Upload clinical lab reports to run AI extraction, canonical normalization, and abnormality detection.
                </p>
              </div>
            </div>
          </div>

          {/* Tab Selector: File Upload vs Camera vs Manual Entry */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Option 1: File Upload */}
            <div
              onClick={() => { setUploadTab('file'); fileInputRef.current?.click(); }}
              className={`p-6 rounded-2xl border shadow-sm cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between space-y-4 ${
                uploadTab === 'file' ? 'ring-1 ring-indigo-400/40' : ''
              }`}
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                     style={{ backgroundColor: 'var(--brand-soft-blue)', color: 'var(--text-accent)' }}>
                  <DoodleIcon name="file" className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold">File Upload</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Select PDF or image reports (JPEG, PNG, GIF, WEBP) from your device.
                </p>
              </div>
              <span className="text-xs font-bold underline" style={{ color: 'var(--text-accent)' }}>
                Browse Files →
              </span>
            </div>

            {/* Option 2: Live Camera Capture */}
            <div
              onClick={() => { setUploadTab('camera'); setViewMode('camera'); }}
              className={`p-6 rounded-2xl border shadow-sm cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between space-y-4 ${
                uploadTab === 'camera' ? 'ring-1 ring-indigo-400/40' : ''
              }`}
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                     style={{ backgroundColor: 'var(--brand-soft-blue)', color: 'var(--text-accent)' }}>
                  <DoodleIcon name="camera" className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold">Live Camera Capture</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Use your phone camera or webcam to scan physical paper test sheets.
                </p>
              </div>
              <span className="text-xs font-bold underline" style={{ color: 'var(--text-accent)' }}>
                Open Camera →
              </span>
            </div>

            {/* Option 3: Manual Entry */}
            <div
              onClick={handleManualEntryInit}
              className="p-6 rounded-3xl border shadow-sm cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between space-y-4"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                     style={{ backgroundColor: 'var(--brand-soft-blue)', color: 'var(--brand-primary)' }}>
                  <DoodleIcon name="pen" className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold">Enter Manually</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Type individual test results manually into structured medical fields.
                </p>
              </div>
              <span className="text-xs font-bold underline" style={{ color: 'var(--text-accent)' }}>
                Start Manual Table →
              </span>
            </div>
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
            className="p-12 border-2 border-dashed rounded-3xl text-center space-y-4 cursor-pointer hover:border-indigo-400 transition-all"
            style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card)' }}
          >
            <div className="w-14 h-14 mx-auto rounded-3xl flex items-center justify-center"
                 style={{ backgroundColor: 'var(--brand-soft-blue)', color: 'var(--brand-primary)' }}>
              <DoodleIcon name="upload" className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold">Drag & drop your lab report here</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Supports PDF, JPEG, PNG, WEBP, and GIF formats up to 25MB
              </p>
            </div>
            <button
              type="button"
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              Select Document
            </button>
          </div>

          {/* Upload History with Clickable Measures Table */}
          <UploadHistory userId={userId} />
        </div>
      )}

      {/* VIEW: Camera Mode */}
      {viewMode === 'camera' && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onCancel={() => setViewMode('select')}
        />
      )}

      {/* VIEW: Processing Pipeline State */}
      {viewMode === 'processing' && (
        <div className="p-10 rounded-3xl border shadow-xl max-w-xl mx-auto space-y-8 text-center animate-in fade-in duration-300"
             style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
          
          <div className="relative w-20 h-20 mx-auto">
            <div className="w-20 h-20 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
              <DoodleIcon name="heartbeat" className="w-8 h-8" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold">Extracting & Analyzing Lab Report</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Our 3-stage clinical pipeline is processing {selectedFile?.name || 'your document'} in real-time.
            </p>
          </div>

          {/* Step Progress Checklist */}
          <div className="space-y-3 text-left p-6 rounded-2xl border text-xs"
               style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
            
            <div className="flex items-center space-x-3">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                processingStage >= 1 ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-700'
              }`}>
                {processingStage >= 2 ? '✓' : '1'}
              </span>
              <span className={processingStage >= 1 ? 'font-bold' : 'text-slate-400'}>
                Uploading document & verifying format
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                processingStage >= 2 ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-700'
              }`}>
                {processingStage >= 3 ? '✓' : '2'}
              </span>
              <span className={processingStage >= 2 ? 'font-bold' : 'text-slate-400'}>
                Stage 1: Gemini 2.5 Flash OCR & table extraction
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                processingStage >= 3 ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-700'
              }`}>
                {processingStage >= 4 ? '✓' : '3'}
              </span>
              <span className={processingStage >= 3 ? 'font-bold' : 'text-slate-400'}>
                Stage 2a: RapidFuzz canonical normalizer & LOINC mapping
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                processingStage >= 4 ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-700'
              }`}>
                {processingStage > 4 ? '✓' : '4'}
              </span>
              <span className={processingStage >= 4 ? 'font-bold' : 'text-slate-400'}>
                Stage 2b: Biomedical NER & narrative entity parsing
              </span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: Editable Result Review */}
      {viewMode === 'review' && (
        <div className="space-y-6">
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
        </div>
      )}

      {/* VIEW: Success Confirmation */}
      {viewMode === 'success' && (
        <div className="p-10 rounded-3xl border shadow-xl text-center max-w-lg mx-auto space-y-6 animate-in fade-in duration-300"
             style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
          
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 shadow-inner">
            <DoodleIcon name="check" className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Measurements Saved Successfully</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {pipelineSummary?.result_count || extractedRows.length} clinical measures have been indexed into your longitudinal record.
            </p>
          </div>

          {reportId && (
            <div className="p-3 rounded-xl border text-xs font-mono"
                 style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
              Report ID: {reportId}
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 rounded-2xl text-xs font-bold text-white shadow-md transition-all active:scale-95"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              Go to Dashboard
            </button>

            <button
              onClick={resetFlow}
              className="px-6 py-3 rounded-2xl text-xs font-bold border transition-all hover:opacity-80"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              Upload Another Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadPage;
