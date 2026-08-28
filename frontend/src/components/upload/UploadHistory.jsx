import React, { useState, useEffect, useCallback } from 'react';
import { getUserRecentReports, getReportResults, updateReportName } from '../../api/reports';
import DoodleIcon from '../common/DoodleIcon';
import { Button, Badge, Card, EmptyState } from '../ui';

/**
 * Helper to format date string to YYYY-MM-DD format (or fallback).
 */
function formatDate(dateStr) {
  if (!dateStr) return 'Unknown Date';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return dateStr;
  }
}

/**
 * Returns status metadata for abnormality flags.
 */
function getAbnormalityMeta(flag) {
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
      return { status: 'neutral', label: flag || 'Unknown' };
  }
}

export function UploadHistory({ userId, refreshTrigger }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Expanded report ID for showing measures table
  const [expandedReportId, setExpandedReportId] = useState(null);
  
  // Cache of report measurements: { [reportId]: Array<Measurement> }
  const [measuresCache, setMeasuresCache] = useState({});
  const [loadingMeasures, setLoadingMeasures] = useState({});

  // Editing state for report name
  const [editingReportId, setEditingReportId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [savingNameId, setSavingNameId] = useState(null);
  const [renameError, setRenameError] = useState('');

  const fetchHistory = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const data = await getUserRecentReports(userId);
      const successfulReports = Array.isArray(data)
        ? data.filter((r) => r.status === 'done' && (r.result_count === undefined || r.result_count > 0))
        : [];
      setReports(successfulReports);
    } catch (err) {
      console.error('Failed to fetch report history:', err);
      setError('Unable to load report history. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, refreshTrigger]);

  const toggleReportMeasures = async (reportId) => {
    if (editingReportId === reportId) return;

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
        console.error(`Failed to load measures for report ${reportId}:`, err);
      } finally {
        setLoadingMeasures((prev) => ({ ...prev, [reportId]: false }));
      }
    }
  };

  const startEditing = (e, report) => {
    e.stopPropagation();
    setEditingReportId(report.id);
    setEditingName(report.original_filename || 'Lab Report');
    setRenameError('');
  };

  const cancelEditing = (e) => {
    if (e) e.stopPropagation();
    setEditingReportId(null);
    setEditingName('');
    setRenameError('');
  };

  const saveReportName = async (e, reportId) => {
    if (e) e.stopPropagation();
    const trimmed = editingName.trim();
    if (!trimmed) {
      setRenameError('Report name cannot be empty.');
      return;
    }

    setSavingNameId(reportId);
    try {
      await updateReportName(reportId, trimmed);
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, original_filename: trimmed } : r))
      );
      setEditingReportId(null);
      setEditingName('');
      setRenameError('');
    } catch (err) {
      console.error('Failed to rename report:', err);
      setRenameError('Failed to rename report. Please try again.');
    } finally {
      setSavingNameId(null);
    }
  };

  return (
    <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
            <DoodleIcon name="history" className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50 tracking-tight">
              Ingested Lab Report History
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Successfully parsed reports • Click to expand individual biomarker measures
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchHistory}
          disabled={loading}
          leftIcon={<DoodleIcon name="refresh" className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
        >
          Refresh
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3.5 rounded-lg text-xs text-red-700 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={fetchHistory} className="text-red-800 dark:text-red-300">
            Retry
          </Button>
        </div>
      )}

      {/* Rename error notification */}
      {renameError && (
        <div className="p-3 rounded-lg text-xs text-red-700 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 flex items-center justify-between">
          <span>⚠️ {renameError}</span>
          <button
            type="button"
            onClick={() => setRenameError('')}
            className="text-xs text-red-700 dark:text-red-300 font-bold ml-2 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && reports.length === 0 ? (
        <Card radius="lg" className="p-8 text-center space-y-2">
          <div className="w-6 h-6 mx-auto rounded-full border-2 border-cyan-400 border-t-cyan-600 animate-spin" />
          <p className="text-xs text-slate-400">Loading upload history...</p>
        </Card>
      ) : error ? null : reports.length === 0 ? (
        /* Empty state */
        <EmptyState
          icon={<DoodleIcon name="file" className="w-5 h-5" />}
          title="No Extracted Reports Recorded Yet"
          description="Your verified lab reports and parsed biomarker measures will appear here once ingested."
        />
      ) : (
        /* Reports History List */
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
                className={`transition-all overflow-hidden ${
                  isExpanded ? 'border-cyan-500/50 shadow-xs' : ''
                }`}
              >
                {/* Header item: DATE - NAME OF REPORT */}
                <div
                  onClick={() => toggleReportMeasures(report.id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors select-none"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isExpanded
                          ? 'bg-slate-900 text-white dark:bg-slate-800'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
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
                          <span className="font-mono text-cyan-600 dark:text-cyan-400 shrink-0 text-xs font-bold">
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
                            className="px-2.5 py-1 text-xs font-semibold rounded-md border border-cyan-400 dark:border-cyan-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-w-[180px] flex-1 max-w-sm focus:outline-none"
                          />
                          <div className="flex items-center space-x-1 shrink-0">
                            <Button
                              variant="teal"
                              size="sm"
                              onClick={(e) => saveReportName(e, report.id)}
                              loading={savingNameId === report.id}
                              leftIcon={<DoodleIcon name="check" className="w-3 h-3" />}
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEditing}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Standard Display: DATE - NAME OF REPORT with Edit Button */
                        <div className="flex items-center space-x-2 group/title">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate flex items-center space-x-1.5">
                            <span className="font-mono text-cyan-600 dark:text-cyan-400 shrink-0">
                              {formattedDate}
                            </span>
                            <span className="text-slate-400 shrink-0">-</span>
                            <span className="truncate" title={reportName}>{reportName}</span>
                          </h3>
                          <button
                            type="button"
                            onClick={(e) => startEditing(e, report)}
                            title="Edit report name"
                            className="p-1 rounded-md text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 opacity-70 group-hover/title:opacity-100 transition-all shrink-0"
                          >
                            <DoodleIcon name="pen" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <Badge status="normal" size="sm">✓ Extracted</Badge>
                        <span>•</span>
                        <span>{report.result_count !== undefined ? `${report.result_count} measures` : 'Results recorded'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5 self-end sm:self-center shrink-0">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {isExpanded ? 'Hide Measures' : 'View Measures'}
                    </span>
                    <div className="text-slate-400">
                      <DoodleIcon
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        className="w-4 h-4 transition-transform duration-150"
                      />
                    </div>
                  </div>
                </div>

                {/* Collapsible Measures Table */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-4 sm:p-5 space-y-3 bg-slate-50/60 dark:bg-slate-950/40 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <DoodleIcon name="heartbeat" className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Extracted Measures &amp; Clinical Results
                        </h4>
                      </div>
                      <span className="text-xs font-mono text-slate-400">
                        {measures.length} {measures.length === 1 ? 'measurement' : 'measurements'}
                      </span>
                    </div>

                    {isLoadingMeasures ? (
                      <div className="p-6 text-center space-y-2">
                        <div className="w-5 h-5 mx-auto rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                        <p className="text-xs text-slate-400">Fetching report measures...</p>
                      </div>
                    ) : measures.length > 0 ? (
                      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                <th className="py-2.5 px-3.5 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.06)] min-w-[150px]">
                                  Biomarker / Test Name
                                </th>
                                <th className="py-2.5 px-3.5 min-w-[130px]">Canonical Mapping</th>
                                <th className="py-2.5 px-3.5 min-w-[110px]">Observed Value</th>
                                <th className="py-2.5 px-3.5 min-w-[120px]">Reference Range</th>
                                <th className="py-2.5 px-3.5 min-w-[100px]">LOINC Code</th>
                                <th className="py-2.5 px-3.5 text-center min-w-[90px]">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                              {measures.map((row, idx) => {
                                const statusMeta = getAbnormalityMeta(row.abnormality_flag);
                                return (
                                  <tr key={row.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                    <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-slate-100 text-xs sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.06)]">
                                      <div className="flex flex-col">
                                        <span>{row.raw_test_name || row.test_name || '—'}</span>
                                        {row.is_duplicate_same_date && (
                                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                                            (Same-date duplicate • Excluded from trends)
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3.5 italic text-slate-500 dark:text-slate-400">
                                      {row.canonical_test_name || 'Standard'}
                                    </td>
                                    <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                                      {row.value !== undefined && row.value !== null ? row.value : '—'} {row.unit || ''}
                                    </td>
                                    <td className="py-2.5 px-3.5 font-mono text-slate-600 dark:text-slate-400">
                                      {row.reference_range || 'N/A'}
                                    </td>
                                    <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                      {row.loinc_code || '—'}
                                    </td>
                                    <td className="py-2.5 px-3.5 text-center">
                                      <div className="inline-flex flex-col items-center gap-1">
                                        <Badge status={statusMeta.status} size="sm">
                                          {statusMeta.label}
                                        </Badge>
                                        {row.is_duplicate_same_date && (
                                          <Badge status="warning" size="sm">
                                            Deduplicated
                                          </Badge>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No measurements recorded for this report.
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default UploadHistory;
