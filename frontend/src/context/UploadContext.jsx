import React, { createContext, useContext, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { ingestReportFile, getReportResults, updateReportResults, createManualReport } from '../api/reports';

const UploadContext = createContext(null);

export function UploadProvider({ children }) {
  const { userId } = useAuth();

  // View modes: 'select' | 'camera' | 'processing' | 'review' | 'success'
  const [viewMode, setViewMode] = useState('select');
  const [uploadTab, setUploadTab] = useState('file'); // 'file' | 'camera' | 'manual'
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [reportId, setReportId] = useState(null);
  const [extractedRows, setExtractedRows] = useState([]);
  const [pipelineSummary, setPipelineSummary] = useState(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [processingStage, setProcessingStage] = useState(0);

  const processFileUpload = async (file) => {
    if (!userId) {
      setErrorMessage('User session not found. Please log in again.');
      return;
    }

    const fileToProcess = file || selectedFile;
    if (!fileToProcess) {
      setErrorMessage('No document selected to process.');
      return;
    }

    setSelectedFile(fileToProcess);
    setViewMode('processing');
    setIsProcessing(true);
    setErrorMessage('');
    setProcessingStage(1);

    // Simulate progressive status stages while backend 3-stage pipeline runs
    const stageTimer1 = setTimeout(() => setProcessingStage(2), 1500);
    const stageTimer2 = setTimeout(() => setProcessingStage(3), 4000);
    const stageTimer3 = setTimeout(() => setProcessingStage(4), 6500);

    try {
      // Send multipart upload to the real backend ingestion pipeline
      const summary = await ingestReportFile(fileToProcess, userId);
      
      if (summary.status === 'failed' || summary.error) {
        throw new Error(summary.error || 'Pipeline extraction failed.');
      }

      setPipelineSummary(summary);
      setReportId(summary.report_id);

      // Fetch the extracted ReportResult rows for user review
      const results = await getReportResults(summary.report_id);
      setExtractedRows(results && results.length > 0 ? results : []);
      setViewMode('review');
    } catch (err) {
      console.error('Upload / Extraction error:', err);
      const detail = err.response?.data?.detail;
      setErrorMessage(
        typeof detail === 'string'
          ? detail
          : err.message || 'Pipeline processing failed. Please check the document format.'
      );
      // Stay on select mode with file retained so user can retry or dismiss
      setViewMode('select');
    } finally {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      setIsProcessing(false);
    }
  };

  const retryUpload = () => {
    if (selectedFile) {
      processFileUpload(selectedFile);
    }
  };

  const handleCameraCapture = (file) => {
    processFileUpload(file);
  };

  const handleManualEntryInit = () => {
    setUploadTab('manual');
    setReportId(null);
    setExtractedRows([
      {
        id: `manual-init-1`,
        raw_test_name: '',
        value: '',
        unit: '',
        reference_range: '',
        canonical_test_name: '',
        abnormality_flag: 'unknown',
      },
    ]);
    setViewMode('review');
  };

  const handleSaveCommit = async (reviewedRows) => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      if (uploadTab === 'manual') {
        // Create new manual report record
        const response = await createManualReport({
          user_id: userId,
          original_filename: `Manual Entry - ${new Date().toLocaleDateString()}`,
          results: reviewedRows,
        });
        setReportId(response.report_id);
        setPipelineSummary(response);
      } else if (reportId) {
        // Save & update existing report results
        await updateReportResults(reportId, reviewedRows);
      }
      setExtractedRows(reviewedRows);
      setViewMode('success');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setErrorMessage(
        typeof detail === 'string'
          ? detail
          : err.message || 'Failed to save medical measures.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const resetFlow = () => {
    setSelectedFile(null);
    setReportId(null);
    setExtractedRows([]);
    setPipelineSummary(null);
    setErrorMessage('');
    setViewMode('select');
    setUploadTab('file');
    setProcessingStage(0);
  };

  return (
    <UploadContext.Provider
      value={{
        viewMode,
        setViewMode,
        uploadTab,
        setUploadTab,
        selectedFile,
        setSelectedFile,
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
      }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}

export default UploadContext;
