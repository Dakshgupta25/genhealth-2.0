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
        <div className="p-4 rounded-[8px] text-xs font-medium bg-[#FCEBED] dark:bg-[#2D1416] border border-[#E8B4B9] dark:border-[#522226] text-[#B4232F] dark:text-[#E04855] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <span className="text-base">⚠️</span>
            <div>
              <span className="font-semibold">{errorMessage}</span>
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
        <div className="p-4 rounded-[8px] text-xs font-medium bg-[#FFF5DD] dark:bg-[#2B2412] border border-[#FCE1A3] dark:border-[#4D3F1B] text-[#9A6500] dark:text-[#ECC94B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
              variant="secondary"
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
          
          {/* Header Area with Red Headings */}
          <div className="space-y-1 pb-4 border-b border-[#E3E3DF] dark:border-[#303030]">
            <span className="text-[11px] font-bold tracking-widest text-[#B4232F] dark:text-[#E04855] uppercase">
              Intake Pipeline
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#B4232F] dark:text-[#E04855]">
              Upload Clinical Report
            </h1>
            <p className="text-xs sm:text-sm text-[#5F6368] dark:text-[#A0A0A0]">
              Add a lab report to your longitudinal health record. AI extracts and standardizes test metrics automatically.
            </p>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFileExtensions}
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* PRIMARY WORKSPACE: White Drag & Drop Canvas with Thin Red Border */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="p-10 sm:p-14 border border-dashed border-[#D98A91] dark:border-[#522226] rounded-[12px] text-center space-y-4 cursor-pointer hover:border-[#B4232F] hover:bg-[#FCEBED]/40 dark:hover:border-[#E04855] bg-white dark:bg-[#1E1E1E] transition-all group shadow-xs"
          >
            <div className="w-12 h-12 mx-auto rounded-[8px] flex items-center justify-center bg-[#FCEBED] text-[#B4232F] dark:bg-[#2D1416] dark:text-[#E04855] group-hover:scale-105 transition-transform">
              <DoodleIcon name="upload" className="w-6 h-6" />
            </div>
            
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-base font-semibold text-[#171717] dark:text-[#F0F0F0]">
                Upload your clinical report
              </h3>
              <p className="text-xs text-[#5F6368] dark:text-[#A0A0A0]">
                Drag &amp; drop here or choose a file from your device
              </p>
            </div>

            <div>
              <Button
                variant="primary"
                size="md"
                type="button"
                leftIcon={<DoodleIcon name="file" className="w-3.5 h-3.5 text-white" />}
              >
                Choose File
              </Button>
            </div>

            <p className="text-[11px] text-[#858585]">
              PDF · JPG · PNG · WEBP · Maximum 25MB
            </p>
          </div>

          {/* SECONDARY INTAKE METHODS (White Cards with Thin Red Borders) */}
          <div className="space-y-3 pt-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B4232F] dark:text-[#E04855]">
              Alternative Ingestion Methods
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Option: Camera Capture */}
              <Card
                radius="lg"
                interactive
                onClick={() => { setUploadTab('camera'); setViewMode('camera'); }}
                className="p-5 flex items-center justify-between space-x-4 bg-white dark:bg-[#1E1E1E] border-[#D98A91]/80 hover:border-[#B4232F]"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-[6px] flex items-center justify-center bg-[#FCEBED] text-[#B4232F] dark:bg-[#2D1416] dark:text-[#E04855] shrink-0">
                    <DoodleIcon name="camera" className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-[#171717] dark:text-[#F0F0F0]">
                      Camera Capture
                    </h4>
                    <p className="text-xs text-[#5F6368] dark:text-[#A0A0A0] truncate">
                      Photograph physical paper lab sheets directly
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#B4232F] dark:text-[#E04855] shrink-0">
                  Scan →
                </span>
              </Card>

              {/* Option: Manual Entry */}
              <Card
                radius="lg"
                interactive
                onClick={handleManualEntryInit}
                className="p-5 flex items-center justify-between space-x-4 bg-white dark:bg-[#1E1E1E] border-[#D98A91]/80 hover:border-[#B4232F]"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-[6px] flex items-center justify-center bg-[#FCEBED] text-[#B4232F] dark:bg-[#2D1416] dark:text-[#E04855] shrink-0">
                    <DoodleIcon name="pen" className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-[#171717] dark:text-[#F0F0F0]">
                      Manual Entry Table
                    </h4>
                    <p className="text-xs text-[#5F6368] dark:text-[#A0A0A0] truncate">
                      Input individual biomarker values into a structured grid
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#B4232F] dark:text-[#E04855] shrink-0">
                  Enter →
                </span>
              </Card>
            </div>
          </div>

          {/* Upload History Accordion Table */}
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
        <Card radius="xl" className="max-w-xl mx-auto bg-white dark:bg-[#1E1E1E] border border-[#D98A91]/80 dark:border-[#522226]">
          <div className="p-8 sm:p-10 space-y-8 text-center">
            
            {/* Restrained Clinical Spinner */}
            <div className="relative w-14 h-14 mx-auto">
              <div className="w-14 h-14 rounded-full border-2 border-[#FCEBED] border-t-[#B4232F] animate-spin dark:border-[#2D1416] dark:border-t-[#E04855]" />
              <div className="absolute inset-0 flex items-center justify-center text-[#B4232F] dark:text-[#E04855]">
                <DoodleIcon name="heartbeat" className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg sm:text-xl font-bold text-[#B4232F] dark:text-[#E04855] tracking-tight">
                Extracting &amp; Validating Report
              </h2>
              <p className="text-xs text-[#5F6368] dark:text-[#A0A0A0]">
                Processing <span className="font-semibold text-[#171717] dark:text-[#F0F0F0]">{selectedFile?.name || 'clinical document'}</span> through the normalization pipeline.
              </p>
            </div>

            {/* Step Progress Multi-Stage Checklist */}
            <div className="space-y-3 text-left p-5 rounded-[8px] bg-[#FCFCFB] dark:bg-[#181818] border border-[#E3E3DF] dark:border-[#303030] text-xs">
              
              {/* Step 1 */}
              <div className="flex items-center space-x-3">
                <span
                  className={`w-5 h-5 rounded-[4px] flex items-center justify-center text-[10px] font-bold ${
                    processingStage >= 2
                      ? 'bg-[#B4232F] text-white'
                      : processingStage >= 1
                      ? 'bg-[#B4232F]/80 text-white animate-pulse'
                      : 'bg-[#E3E3DF] text-[#858585] dark:bg-[#303030]'
                  }`}
                >
                  {processingStage >= 2 ? '✓' : '1'}
                </span>
                <span className={processingStage >= 1 ? 'font-semibold text-[#171717] dark:text-[#F0F0F0]' : 'text-[#858585]'}>
                  Stage 0: Document verification &amp; MIME validation
                </span>
              </div>

              {/* Step 2 */}
              <div className="flex items-center space-x-3">
                <span
                  className={`w-5 h-5 rounded-[4px] flex items-center justify-center text-[10px] font-bold ${
                    processingStage >= 3
                      ? 'bg-[#B4232F] text-white'
                      : processingStage === 2
                      ? 'bg-[#B4232F]/80 text-white animate-pulse'
                      : 'bg-[#E3E3DF] text-[#858585] dark:bg-[#303030]'
                  }`}
                >
                  {processingStage >= 3 ? '✓' : '2'}
                </span>
                <span className={processingStage >= 2 ? 'font-semibold text-[#171717] dark:text-[#F0F0F0]' : 'text-[#858585]'}>
                  Stage 1: Gemini OCR &amp; tabular measure parsing
                </span>
              </div>

              {/* Step 3 */}
              <div className="flex items-center space-x-3">
                <span
                  className={`w-5 h-5 rounded-[4px] flex items-center justify-center text-[10px] font-bold ${
                    processingStage >= 4
                      ? 'bg-[#B4232F] text-white'
                      : processingStage === 3
                      ? 'bg-[#B4232F]/80 text-white animate-pulse'
                      : 'bg-[#E3E3DF] text-[#858585] dark:bg-[#303030]'
                  }`}
                >
                  {processingStage >= 4 ? '✓' : '3'}
                </span>
                <span className={processingStage >= 3 ? 'font-semibold text-[#171717] dark:text-[#F0F0F0]' : 'text-[#858585]'}>
                  Stage 2a: LOINC canonical normalizer
                </span>
              </div>

              {/* Step 4 */}
              <div className="flex items-center space-x-3">
                <span
                  className={`w-5 h-5 rounded-[4px] flex items-center justify-center text-[10px] font-bold ${
                    processingStage > 4
                      ? 'bg-[#B4232F] text-white'
                      : processingStage >= 4
                      ? 'bg-[#B4232F]/80 text-white animate-pulse'
                      : 'bg-[#E3E3DF] text-[#858585] dark:bg-[#303030]'
                  }`}
                >
                  {processingStage > 4 ? '✓' : '4'}
                </span>
                <span className={processingStage >= 4 ? 'font-semibold text-[#171717] dark:text-[#F0F0F0]' : 'text-[#858585]'}>
                  Stage 2b: Biomedical NER &amp; diagnostic validation
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
        <Card radius="xl" className="max-w-lg mx-auto text-center bg-white dark:bg-[#1E1E1E] border border-[#D98A91]/80 dark:border-[#522226]">
          <div className="p-8 sm:p-10 space-y-6">
            <div className="w-12 h-12 rounded-[8px] flex items-center justify-center mx-auto text-[#247A59] bg-[#EAF6F0] dark:bg-[#13241B] dark:text-[#48BB78]">
              <DoodleIcon name="check" className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-[#B4232F] dark:text-[#E04855] tracking-tight">
                Report Saved Successfully
              </h2>
              <p className="text-xs text-[#5F6368] dark:text-[#A0A0A0]">
                {pipelineSummary?.result_count || extractedRows.length} clinical measures have been indexed into your longitudinal health database.
              </p>
            </div>

            {reportId && (
              <div className="p-2 rounded-[6px] bg-[#F4F4F2] dark:bg-[#202020] border border-[#E3E3DF] dark:border-[#303030] text-xs font-mono text-[#5F6368] dark:text-[#A0A0A0]">
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
                variant="secondary"
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
