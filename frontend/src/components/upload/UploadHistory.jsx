import React, { useState, useEffect, useCallback } from 'react';
import { getUserRecentReports, getReportResults, updateReportName, deleteReport } from '../../api/reports';
import { useAuth } from '../../context/AuthContext';
import DoodleIcon from '../common/DoodleIcon';
import { Button, Badge, Card, Modal, EmptyState } from '../ui';

export function UploadHistory() {
  const { userId } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Expanded report ID for showing measures
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [measuresCache, setMeasuresCache] = useState({});
  const [loadingMeasures, setLoadingMeasures] = useState({});

  // Inline editing state for report name
  const [editingReportId, setEditingReportId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [savingNameId, setSavingNameId] = useState(null);
  const [renameError, setRenameError] = useState('');

  // Delete modal state
  const [reportToDelete, setReportToDelete] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');

  const fetchHistory = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const data = await getUserRecentReports(userId);
      setReports(data || []);
    } catch (err) {
      console.error('Failed to load upload history:', err);
      setError('Could not load history. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const toggleReportMeasures = async (reportId) => {
    if (expandedReportId === reportId) {
      setExpandedReportId(null);
      return;
    }

    setExpandedReportId(reportId);

    if (!measuresCache[reportId]) {
      setLoadingMeasures((prev) => ({ ...prev, [reportId]: true }));
      try {
        const results = await getReportResults(reportId);
        setMeasuresCache((prev) => ({ ...prev, [reportId]: results || [] }));
      } catch (err) {
        console.error('Failed to load report measures:', err);
      } finally {
        setLoadingMeasures((prev) => ({ ...prev, [reportId]: false }));
      }
    }
  };

  const startEditing = (e, report) => {
    e.stopPropagation();
    setEditingReportId(report.id);
    setEditingName(report.original_filename || '');
    setRenameError('');
  };

  const cancelEditing = (e) => {
    if (e) e.stopPropagation();
    setEditingReportId(null);
    setEditingName('');
  };

  const saveReportName = async (e, reportId) => {
    if (e) e.stopPropagation();
    if (!editingName.trim()) {
      setRenameError('Report name cannot be blank.');
      return;
    }

    setSavingNameId(reportId);
    setRenameError('');
    try {
      await updateReportName(reportId, editingName.trim());
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId ? { ...r, original_filename: editingName.trim() } : r
        )
      );
      setEditingReportId(null);
    } catch (err) {
      console.error('Failed to update report name:', err);
      setRenameError('Failed to rename report.');
    } finally {
      setSavingNameId(null);
    }
  };

  const openDeleteModal = (e, report) => {
    e.stopPropagation();
    setReportToDelete(report);
    setDeleteError('');
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setReportToDelete(null);
    setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    if (!reportToDelete) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await deleteReport(reportToDelete.id);
      setReports((prev) => prev.filter((r) => r.id !== reportToDelete.id));
      setDeleteSuccess(`Report "${reportToDelete.original_filename || 'Lab Report'}" and all extracted measurements were removed.`);
      closeDeleteModal();
      setTimeout(() => setDeleteSuccess(''), 4000);
    } catch (err) {
      console.error('Failed to delete report:', err);
      setDeleteError(err.response?.data?.detail || 'Failed to delete report. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Date unknown';
    return new Date(isoString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getAbnormalityMeta = (flag) => {
    switch (flag?.toLowerCase()) {
      case 'high':
        return { status: 'critical', label: 'High' };
      case 'low':
        return { status: 'warning', label: 'Low' };
      case 'normal':
        return { status: 'normal', label: 'Normal' };
      case 'critical':
        return { status: 'critical', label: 'Critical' };
      default:
        return { status: 'neutral', label: flag || 'Review' };
    }
  };

  return (
    <div className="space-y-4 pt-6 border-t border-[#E3E3DF] dark:border-[#303030]">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-base font-bold text-[#B4232F] dark:text-[#E04855] tracking-tight">
            Ingested Report History
          </h2>
          <p className="text-xs text-[#5F6368] dark:text-[#A0A0A0]">
            Archived lab reports • Click to expand individual biomarker measures
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchHistory}
          disabled={loading}
          className="border-[#D98A91]/80 hover:border-[#B4232F]"
          leftIcon={<DoodleIcon name="refresh" className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
        >
          Refresh
        </Button>
      </div>

      {/* Success Notification Banner */}
      {deleteSuccess && (
        <div className="p-3.5 rounded-[8px] text-xs font-semibold bg-[#EAF6F0] text-[#247A59] border border-[#B8E4D1] dark:bg-[#13241B] dark:text-[#48BB78] dark:border-[#1E3D2C] flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <span>✓</span>
            <span>{deleteSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeleteSuccess('')}
            className="text-[#247A59] dark:text-[#48BB78] font-bold underline ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-3.5 rounded-[8px] text-xs text-[#B4232F] bg-[#FCEBED] dark:bg-[#2D1416] border border-[#E8B4B9] dark:border-[#522226] flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={fetchHistory} className="text-[#B4232F] dark:text-[#E04855]">
            Retry
          </Button>
        </div>
      )}

      {/* Rename error notification */}
      {renameError && (
        <div className="p-3 rounded-[8px] text-xs text-[#B4232F] bg-[#FCEBED] dark:bg-[#2D1416] border border-[#E8B4B9] dark:border-[#522226] flex items-center justify-between">
          <span>⚠️ {renameError}</span>
          <button
            type="button"
            onClick={() => setRenameError('')}
            className="text-xs text-[#B4232F] dark:text-[#E04855] font-bold ml-2 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && reports.length === 0 ? (
        <Card radius="lg" className="p-8 text-center space-y-2 bg-white dark:bg-[#1E1E1E] border border-[#D98A91]/80 dark:border-[#303030]">
          <div className="w-5 h-5 mx-auto rounded-full border-2 border-[#B4232F] border-t-transparent animate-spin" />
          <p className="text-xs text-[#858585]">Loading report history...</p>
        </Card>
      ) : error ? null : reports.length === 0 ? (
        <EmptyState
          icon={<DoodleIcon name="file" className="w-5 h-5" />}
          title="No Extracted Reports Recorded Yet"
          description="Your verified lab reports and parsed biomarker measures will appear here once ingested."
        />
      ) : (
        /* Reports History List (White Cards with Thin Red Borders) */
        <div className="space-y-3">
          {reports.map((report) => {
            const isExpanded = expandedReportId === report.id;
            const isEditing = editingReportId === report.id;
            const measures = measuresCache[report.id] || [];
            const isLoadingMeasures = loadingMeasures[report.id];
            const formattedDate = formatDate(report.created_at);
            const reportName = report.original_filename || 'Lab Report';

            return (
              <Card
                key={report.id}
                radius="lg"
                className={`transition-all overflow-hidden bg-white dark:bg-[#1E1E1E] border ${
                  isExpanded
                    ? 'border-[#B4232F] shadow-xs'
                    : 'border-[#D98A91]/80 dark:border-[#303030]'
                }`}
              >
                {/* Header item */}
                <div
                  onClick={() => toggleReportMeasures(report.id)}
                  className="p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-[#FCFCFB] dark:hover:bg-[#222222] transition-colors select-none"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div
                      className={`w-8 h-8 rounded-[6px] flex items-center justify-center shrink-0 transition-colors ${
                        isExpanded
                          ? 'bg-[#B4232F] text-white'
                          : 'bg-[#FCEBED] text-[#B4232F] dark:bg-[#2D1416] dark:text-[#E04855]'
                      }`}
                    >
                      <DoodleIcon name="file" className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        /* Inline Report Name Edit Mode */
                        <div
                          className="flex flex-wrap items-center gap-2 py-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="font-mono text-[#B4232F] dark:text-[#E04855] shrink-0 text-xs font-bold">
                            {formattedDate} -
                          </span>
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveReportName(e, report.id);
                              if (e.key === 'Escape') cancelEditing(e);
                            }}
                            autoFocus
                            placeholder="Report name..."
                            className="px-2.5 py-1 text-xs font-semibold rounded-[6px] border border-[#B4232F] bg-white dark:bg-[#181818] text-[#171717] dark:text-[#F0F0F0] min-w-[180px] flex-1 max-w-sm focus:outline-none"
                          />
                          <div className="flex items-center space-x-1 shrink-0">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={(e) => saveReportName(e, report.id)}
                              loading={savingNameId === report.id}
                              leftIcon={<DoodleIcon name="check" className="w-3 h-3 text-white" />}
                            >
                              Save
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={cancelEditing}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Standard Display: DATE - NAME OF REPORT with Edit & Delete Buttons */
                        <div className="flex items-center space-x-2 group/title">
                          <h3 className="text-sm font-semibold text-[#171717] dark:text-[#F0F0F0] truncate flex items-center space-x-1.5">
                            <span className="font-mono text-[#5F6368] dark:text-[#A0A0A0] shrink-0 text-xs">
                              {formattedDate}
                            </span>
                            <span className="text-[#858585] shrink-0">•</span>
                            <span className="truncate font-semibold" title={reportName}>{reportName}</span>
                          </h3>
                          <button
                            type="button"
                            onClick={(e) => startEditing(e, report)}
                            title="Edit report name"
                            className="p-1 rounded-[4px] text-[#858585] hover:text-[#171717] hover:bg-[#F4F4F2] opacity-70 group-hover/title:opacity-100 transition-all shrink-0 cursor-pointer"
                          >
                            <DoodleIcon name="pen" className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-[#858585]">
                        <Badge status="normal" size="sm" dot>Extracted</Badge>
                        <span>•</span>
                        <span>{report.result_count !== undefined ? `${report.result_count} measures` : 'Results recorded'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 self-end sm:self-center shrink-0">
                    {/* Delete Report Button */}
                    <button
                      type="button"
                      onClick={(e) => openDeleteModal(e, report)}
                      title="Delete report from database"
                      className="p-1.5 rounded-[6px] text-[#858585] hover:text-[#B4232F] hover:bg-[#FCEBED] dark:hover:bg-[#2D1416] transition-colors cursor-pointer flex items-center space-x-1"
                    >
                      <DoodleIcon name="trash" className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-medium hidden sm:inline">Delete</span>
                    </button>

                    <span className="text-xs font-medium text-[#5F6368] dark:text-[#A0A0A0]">
                      {isExpanded ? 'Hide Measures' : 'View Measures'}
                    </span>
                    <div className="text-[#858585]">
                      <DoodleIcon
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        className="w-3.5 h-3.5 transition-transform duration-150"
                      />
                    </div>
                  </div>
                </div>

                {/* Collapsible Measures Table */}
                {isExpanded && (
                  <div className="border-t border-[#E3E3DF] dark:border-[#303030] p-4 sm:p-5 space-y-3 bg-[#FCFCFB] dark:bg-[#181818] animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <DoodleIcon name="heartbeat" className="w-4 h-4 text-[#B4232F] dark:text-[#E04855]" />
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5F6368] dark:text-[#A0A0A0]">
                          Extracted Measures &amp; Clinical Results
                        </h4>
                      </div>
                      <span className="text-xs font-mono text-[#858585]">
                        {measures.length} {measures.length === 1 ? 'measurement' : 'measurements'}
                      </span>
                    </div>

                    {isLoadingMeasures ? (
                      <div className="p-6 text-center space-y-2">
                        <div className="w-5 h-5 mx-auto rounded-full border-2 border-[#B4232F] border-t-transparent animate-spin" />
                        <p className="text-xs text-[#858585]">Fetching report measures...</p>
                      </div>
                    ) : measures.length > 0 ? (
                      <div className="rounded-[8px] border border-[#E3E3DF] dark:border-[#303030] bg-white dark:bg-[#1E1E1E] overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-[#E3E3DF] dark:border-[#303030] bg-[#F7F7F5] dark:bg-[#222222] text-[10px] font-semibold uppercase tracking-wider text-[#5F6368] dark:text-[#A0A0A0]">
                                <th className="py-2.5 px-3.5 sticky left-0 bg-[#F7F7F5] dark:bg-[#222222] z-10 min-w-[150px]">
                                  Biomarker / Test Name
                                </th>
                                <th className="py-2.5 px-3.5 min-w-[130px]">Canonical Mapping</th>
                                <th className="py-2.5 px-3.5 text-right min-w-[110px]">Observed Value</th>
                                <th className="py-2.5 px-3.5 min-w-[120px]">Reference Range</th>
                                <th className="py-2.5 px-3.5 min-w-[100px]">LOINC Code</th>
                                <th className="py-2.5 px-3.5 text-center min-w-[90px]">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E8E7E4] dark:divide-[#282828]">
                              {measures.map((row, idx) => {
                                const statusMeta = getAbnormalityMeta(row.abnormality_flag);
                                return (
                                  <tr key={row.id || idx} className="hover:bg-[#FCFCFB] dark:hover:bg-[#222222] transition-colors">
                                    <td className="py-2.5 px-3.5 font-semibold text-[#171717] dark:text-[#F0F0F0] text-xs sticky left-0 bg-white dark:bg-[#1E1E1E] z-10">
                                      <div className="flex flex-col">
                                        <span>{row.raw_test_name || row.test_name || '—'}</span>
                                        {row.is_duplicate_same_date && (
                                          <span className="text-[10px] text-[#9A6500] font-normal">
                                            (Same-date duplicate)
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3.5 text-[#5F6368] dark:text-[#858585]">
                                      {row.canonical_test_name || 'Standard'}
                                    </td>
                                    <td className="py-2.5 px-3.5 text-right font-mono font-bold text-[#171717] dark:text-[#F0F0F0]">
                                      {row.value !== undefined && row.value !== null ? row.value : '—'} <span className="font-normal text-[#858585] text-[11px]">{row.unit || ''}</span>
                                    </td>
                                    <td className="py-2.5 px-3.5 font-mono text-[#5F6368] dark:text-[#A0A0A0]">
                                      {row.reference_range || 'Standard'}
                                    </td>
                                    <td className="py-2.5 px-3.5 font-mono text-[11px] text-[#858585]">
                                      {row.loinc_code || '—'}
                                    </td>
                                    <td className="py-2.5 px-3.5 text-center">
                                      <Badge status={statusMeta.status} size="sm" dot>
                                        {statusMeta.label}
                                      </Badge>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-[#858585] italic py-2">
                        No parsed measurement items in this report.
                      </p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal with Warning */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={closeDeleteModal}
        title="Delete Clinical Report"
        subtitle="Permanently remove report and extracted measurements"
        icon={<DoodleIcon name="trash" className="w-4 h-4 text-[#B4232F] dark:text-[#E04855]" />}
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={closeDeleteModal}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmDelete}
              loading={isDeleting}
              id="confirm-delete-report-btn"
              leftIcon={<DoodleIcon name="trash" className="w-3.5 h-3.5 text-white" />}
            >
              Confirm &amp; Delete
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          {/* Warning Banner */}
          <div className="p-3.5 rounded-[8px] bg-[#FCEBED] dark:bg-[#2D1416] border border-[#E8B4B9] dark:border-[#522226] text-[#B4232F] dark:text-[#E04855] space-y-1">
            <div className="flex items-center space-x-2 font-bold text-xs">
              <span>⚠️ Warning</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              The extracted measurements associated with this report will be permanently removed forever from the database and cannot be recovered.
            </p>
          </div>

          {deleteError && (
            <div className="p-3 rounded-[6px] text-xs font-semibold bg-[#FCEBED] border border-[#E8B4B9] text-[#B4232F] dark:bg-[#2D1416] dark:text-[#E04855]">
              {deleteError}
            </div>
          )}

          {/* Report Details Confirmation */}
          {reportToDelete && (
            <div className="p-3 rounded-[8px] bg-[#F7F7F5] dark:bg-[#252525] border border-[#E3E3DF] dark:border-[#303030] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#858585] text-[10px] uppercase font-semibold">Report Name</span>
                <span className="font-semibold text-[#171717] dark:text-[#F0F0F0] truncate max-w-[200px]">
                  {reportToDelete.original_filename || 'Lab Report'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#858585] text-[10px] uppercase font-semibold">Date Uploaded</span>
                <span className="font-mono text-[#5F6368] dark:text-[#A0A0A0]">
                  {formatDate(reportToDelete.created_at)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#858585] text-[10px] uppercase font-semibold">Associated Measures</span>
                <Badge status="brand" size="sm">
                  {reportToDelete.result_count !== undefined ? `${reportToDelete.result_count} measures` : 'All measures'}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default UploadHistory;
