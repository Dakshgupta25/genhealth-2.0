import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUpload } from '../context/UploadContext';
import DoodleIcon from '../components/common/DoodleIcon';
import CameraCapture from '../components/upload/CameraCapture';
import EditableResultTable from '../components/upload/EditableResultTable';
import UploadHistory from '../components/upload/UploadHistory';
import { Button, Card } from '../components/ui';

export function UploadPage() {
  const {
    uploadTab,
    setUploadTab,
    selectedFile,
    extractedRows,
    setExtractedRows,
    reportId,
    pipelineSummary,
    isProcessing,
    isSaving,
    errorMessage,
    setErrorMessage,
    processingStage,
    viewMode,
    setViewMode,
    processFileUpload,
    retryUpload,
    handleCameraCapture,
    handleManualEntryInit,
    handleSaveCommit,
    resetFlow,
  } = useUpload();

  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const acceptedFileExtensions = '.pdf,.jpg,.jpeg,.png,.webp,.gif';

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processFileUpload(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFileUpload(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* Error Message Toast */}
      {errorMessage && (
        <div className="p-4 rounded-xl text-xs font-semibold bg-[#FEE2E2] dark:bg-[#2B1212] border border-[#FECACA] dark:border-[#4C1D1D] text-[#991B1B] dark:text-[#F87171] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
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
        <div className="p-4 rounded-xl text-xs font-semibold bg-[#FEF3C7] dark:bg-[#291E0B] border border-[#FDE68A] dark:border-[#453314] text-[#92400E] dark:text-[#FBBF24] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
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
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#0D5446] text-white dark:bg-[#1A2421] dark:border dark:border-[#2A3B34]">
                  <DoodleIcon name="upload" className="w-4 h-4 text-emerald-300 dark:text-[#3BB298]" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#11231E] dark:text-[#ECF2EE]">
                    Ingest Clinical Lab Report
                  </h1>
                  <p className="text-xs text-[#586D66] dark:text-[#7C9184]">
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
                  ? 'border-[#0D5446]/50 ring-1 ring-[#0D5446]/20 bg-[#F5F7F5] dark:bg-[#1A2421]/60'
                  : ''
              }`}
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#E3EFE9] text-[#0D5446] dark:bg-[#1A332B] dark:text-[#3BB298]">
                  <DoodleIcon name="file" className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#11231E] dark:text-[#ECF2EE]">
                  File Upload
                </h3>
                <p className="text-xs text-[#586D66] dark:text-[#7C9184] leading-relaxed">
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
                  ? 'border-[#0D5446]/50 ring-1 ring-[#0D5446]/20 bg-[#F5F7F5] dark:bg-[#1A2421]/60'
                  : ''
              }`}
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#E3EFE9] text-[#0D5446] dark:bg-[#1A332B] dark:text-[#3BB298]">
                  <DoodleIcon name="camera" className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#11231E] dark:text-[#ECF2EE]">
                  Live Camera Scanner
                </h3>
                <p className="text-xs text-[#586D66] dark:text-[#7C9184] leading-relaxed">
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
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#F3E8FF] text-[#6B21A8] dark:bg-[rgba(168,85,247,0.12)] dark:text-[#C084FC]">
                  <DoodleIcon name="pen" className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#11231E] dark:text-[#ECF2EE]">
                  Enter Manually
                </h3>
                <p className="text-xs text-[#586D66] dark:text-[#7C9184] leading-relaxed">
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
            className="p-10 sm:p-12 border-2 border-dashed border-[#D0D9D0] dark:border-[#2A3B34] rounded-2xl text-center space-y-4 cursor-pointer hover:border-[#0D5446] dark:hover:border-[#3BB298] bg-white dark:bg-[#141C19]/60 transition-all shadow-xs"
          >
            <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center bg-[#E3EFE9] text-[#0D5446] dark:bg-[#1A332B] dark:text-[#3BB298]">
              <DoodleIcon name="upload" className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-base font-bold text-[#11231E] dark:text-[#ECF2EE]">
                Drag &amp; drop your lab report here
              </h3>
              <p className="text-xs text-[#586D66] dark:text-[#7C9184]">
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
          <UploadHistory />
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
              <div className="w-16 h-16 rounded-full border-3 border-[#E3EFE9] border-t-[#0D5446] animate-spin dark:border-[#1A332B] dark:border-t-[#3BB298]" />
              <div className="absolute inset-0 flex items-center justify-center text-[#0D5446] dark:text-[#3BB298]">
                <DoodleIcon name="heartbeat" className="w-6 h-6" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-[#11231E] dark:text-[#ECF2EE] tracking-tight">
                Extracting &amp; Analyzing Lab Report
              </h2>
              <p className="text-xs text-[#586D66] dark:text-[#7C9184]">
                Processing <span className="font-semibold text-[#11231E] dark:text-[#ECF2EE]">{selectedFile?.name || 'your document'}</span> through the clinical intelligence pipeline.
              </p>
            </div>

            {/* Step Progress Multi-Stage Checklist */}
            <div className="space-y-3 text-left p-5 rounded-xl bg-[#EDF1ED] dark:bg-[#1A2421] border border-[#D6DDD6] dark:border-[#2A3B34] text-xs">
              
              {/* Step 1 */}
              <div className="flex items-center space-x-3">
                <span
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                    processingStage >= 2
                      ? 'bg-[#0D5446] text-white'
                      : processingStage >= 1
                      ? 'bg-[#1D7A68] text-white animate-pulse'
                      : 'bg-[#D6DDD6] text-[#586D66] dark:bg-[#23312B] dark:text-[#7C9184]'
                  }`}
                >
                  {processingStage >= 2 ? '✓' : '1'}
                </span>
                <span className={processingStage >= 1 ? 'font-semibold text-[#11231E] dark:text-[#ECF2EE]' : 'text-[#586D66] dark:text-[#7C9184]'}>
                  Stage 0: Document verification &amp; MIME validation
                </span>
              </div>

              {/* Step 2 */}
              <div className="flex items-center space-x-3">
                <span
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                    processingStage >= 3
                      ? 'bg-[#0D5446] text-white'
                      : processingStage === 2
                      ? 'bg-[#1D7A68] text-white animate-pulse'
                      : 'bg-[#D6DDD6] text-[#586D66] dark:bg-[#23312B] dark:text-[#7C9184]'
                  }`}
                >
                  {processingStage >= 3 ? '✓' : '2'}
                </span>
                <span className={processingStage >= 2 ? 'font-semibold text-[#11231E] dark:text-[#ECF2EE]' : 'text-[#586D66] dark:text-[#7C9184]'}>
                  Stage 1: Gemini 2.5 Flash OCR &amp; tabular measure parsing
                </span>
              </div>

              {/* Step 3 */}
              <div className="flex items-center space-x-3">
                <span
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                    processingStage >= 4
                      ? 'bg-[#0D5446] text-white'
                      : processingStage === 3
                      ? 'bg-[#1D7A68] text-white animate-pulse'
                      : 'bg-[#D6DDD6] text-[#586D66] dark:bg-[#23312B] dark:text-[#7C9184]'
                  }`}
                >
                  {processingStage >= 4 ? '✓' : '3'}
                </span>
                <span className={processingStage >= 3 ? 'font-semibold text-[#11231E] dark:text-[#ECF2EE]' : 'text-[#586D66] dark:text-[#7C9184]'}>
                  Stage 2a: RapidFuzz LOINC canonical normalizer
                </span>
              </div>

              {/* Step 4 */}
              <div className="flex items-center space-x-3">
                <span
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                    processingStage > 4
                      ? 'bg-[#0D5446] text-white'
                      : processingStage >= 4
                      ? 'bg-[#1D7A68] text-white animate-pulse'
                      : 'bg-[#D6DDD6] text-[#586D66] dark:bg-[#23312B] dark:text-[#7C9184]'
                  }`}
                >
                  {processingStage > 4 ? '✓' : '4'}
                </span>
                <span className={processingStage >= 4 ? 'font-semibold text-[#11231E] dark:text-[#ECF2EE]' : 'text-[#586D66] dark:text-[#7C9184]'}>
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
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto text-[#0D5446] bg-[#E3EFE9] dark:bg-[#1A332B] dark:text-[#3BB298] shadow-inner">
              <DoodleIcon name="check" className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-[#11231E] dark:text-[#ECF2EE] tracking-tight">
                Measurements Saved Successfully
              </h2>
              <p className="text-xs text-[#586D66] dark:text-[#7C9184]">
                {pipelineSummary?.result_count || extractedRows.length} clinical measures have been verified and indexed into your longitudinal database.
              </p>
            </div>

            {reportId && (
              <div className="p-2.5 rounded-lg bg-[#EDF1ED] dark:bg-[#1A2421] border border-[#D6DDD6] dark:border-[#2A3B34] text-xs font-mono text-[#334740] dark:text-[#B2C2B8]">
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
