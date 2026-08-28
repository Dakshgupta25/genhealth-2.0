import React, { useState, useEffect, useCallback } from 'react';
import { getUserRecentReports, getReportResults, updateReportName } from '../../api/reports';
import DoodleIcon from '../common/DoodleIcon';

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
 * Returns badge styling for abnormality flags.
 */
function getAbnormalityBadge(flag) {
  switch (flag?.toLowerCase()) {
    case 'high':
      return 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-900';
    case 'low':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900';
    case 'normal':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900';
    case 'critical':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-900 font-black animate-pulse';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
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
      // Strictly filter to ensure only successfully extracted reports appear in history
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
    // If currently editing this report's name, don't collapse/expand
    if (editingReportId === reportId) return;

    if (expandedReportId === reportId) {
      // Collapse
      setExpandedReportId(null);
      return;
    }

    setExpandedReportId(reportId);

    // If measures are not already loaded, fetch them
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
    <div className="space-y-4 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
               style={{ backgroundColor: 'var(--brand-primary)' }}>
            <DoodleIcon name="history" className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Upload History</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Successfully extracted reports • Click to view measures or edit report names anytime
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchHistory}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center space-x-1.5 transition-all hover:bg-slate-500/10 active:scale-95 disabled:opacity-50"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
          title="Refresh History"
        >
          <DoodleIcon name="refresh" className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3.5 rounded-2xl text-xs text-red-700 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchHistory}
            className="underline font-bold text-red-800 dark:text-red-300 ml-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Rename error notification */}
      {renameError && (
        <div className="p-3 rounded-xl text-xs text-red-700 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 flex items-center justify-between">
          <span>⚠️ {renameError}</span>
          <button
            type="button"
            onClick={() => setRenameError('')}
            className="text-xs text-red-700 dark:text-red-300 font-bold ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && reports.length === 0 ? (
        <div className="p-8 rounded-2xl border text-center space-y-2"
             style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
          <div className="w-6 h-6 mx-auto rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin" />
          <p className="text-xs text-slate-400">Loading upload history...</p>
        </div>
      ) : error ? null : reports.length === 0 ? (
        /* Empty state */
        <div className="p-8 rounded-2xl border border-dashed text-center space-y-2"
             style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
          <div className="w-10 h-10 mx-auto rounded-2xl flex items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-800">
            <DoodleIcon name="file" className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            No successfully extracted lab reports yet.
          </p>
          <p className="text-[11px] text-slate-400">
            Upload your lab report or enter measurements above to see your extracted history here.
          </p>
        </div>
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
              <div
                key={report.id}
                className="rounded-2xl border shadow-sm transition-all overflow-hidden"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: isExpanded ? 'var(--brand-primary)' : 'var(--border-card)',
                }}
              >
                {/* Header item: DATE - NAME OF REPORT */}
                <div
                  onClick={() => toggleReportMeasures(report.id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-500/5 transition-colors select-none"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isExpanded ? 'text-white' : 'text-slate-500 bg-slate-100 dark:bg-slate-800'
                      }`}
                      style={{
                        backgroundColor: isExpanded ? 'var(--brand-primary)' : undefined,
                      }}
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
                          <span className="font-mono text-indigo-600 dark:text-indigo-400 shrink-0 text-sm font-bold">
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
                            className="px-2.5 py-1 text-xs font-bold rounded-xl border focus:ring-2 focus:ring-indigo-400 focus:outline-none bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-700 min-w-[200px] flex-1 max-w-md shadow-sm"
                          />
                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => saveReportName(e, report.id)}
                              disabled={savingNameId === report.id}
                              title="Save name"
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all flex items-center space-x-1 shadow-sm disabled:opacity-50"
                            >
                              <DoodleIcon name="check" className="w-3.5 h-3.5" />
                              <span>Save</span>
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditing}
                              title="Cancel"
                              className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Standard Display: DATE - NAME OF REPORT with Edit Button */
                        <div className="flex items-center space-x-2 group/title">
                          <h3
                            className="text-sm font-bold truncate flex items-center space-x-1.5"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            <span className="font-mono text-indigo-600 dark:text-indigo-400 shrink-0">
                              {formattedDate}
                            </span>
                            <span className="text-slate-400 shrink-0">-</span>
                            <span className="truncate" title={reportName}>{reportName}</span>
                          </h3>
                          <button
                            type="button"
                            onClick={(e) => startEditing(e, report)}
                            title="Edit report name"
                            className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 opacity-70 group-hover/title:opacity-100 transition-all shrink-0"
                          >
                            <DoodleIcon name="pen" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center space-x-2 mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ Extracted</span>
                        <span>•</span>
                        <span>{report.result_count !== undefined ? `${report.result_count} measures` : 'Results recorded'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5 self-end sm:self-center shrink-0">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-slate-100 dark:bg-slate-800/60"
                          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                      {isExpanded ? 'Hide Measures' : 'View Measures'}
                    </span>
                    <div className="text-slate-400">
                      <DoodleIcon
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        className="w-4 h-4 transition-transform duration-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Collapsible Measures Table */}
                {isExpanded && (
                  <div
                    className="border-t p-4 sm:p-6 space-y-4 animate-in fade-in duration-200"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-secondary)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <DoodleIcon name="heartbeat" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                          Extracted Measures & Clinical Lab Results
                        </h4>
                      </div>
                      <span className="text-xs font-mono text-slate-400">
                        {measures.length} {measures.length === 1 ? 'measurement' : 'measurements'}
                      </span>
                    </div>

                    {isLoadingMeasures ? (
                      <div className="p-8 text-center space-y-2">
                        <div className="w-5 h-5 mx-auto rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                        <p className="text-xs text-slate-400">Fetching report measures...</p>
                      </div>
                    ) : measures.length > 0 ? (
                      <div className="rounded-2xl border shadow-sm overflow-hidden"
                           style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b font-bold tracking-wider uppercase text-[10px]"
                                  style={{
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderColor: 'var(--border-subtle)',
                                    color: 'var(--text-muted)',
                                  }}>
                                <th className="py-3 px-4">Biomarker / Test Name</th>
                                <th className="py-3 px-4">Canonical Mapping</th>
                                <th className="py-3 px-4">Observed Value</th>
                                <th className="py-3 px-4">Reference Range</th>
                                <th className="py-3 px-4">LOINC Code</th>
                                <th className="py-3 px-4 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                              {measures.map((row, idx) => (
                                <tr key={row.id || idx} className="hover:bg-slate-500/5 transition-colors">
                                  <td className="py-3 px-4 font-bold" style={{ color: 'var(--text-primary)' }}>
                                    <div className="flex flex-col">
                                      <span>{row.raw_test_name || row.test_name || '—'}</span>
                                      {row.is_duplicate_same_date && (
                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                                          (Same-date duplicate • Not stored in database records)
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 italic text-slate-500 dark:text-slate-400">
                                    {row.canonical_test_name || 'Standard'}
                                  </td>
                                  <td className="py-3 px-4 font-mono font-bold">
                                    {row.value !== undefined && row.value !== null ? row.value : '—'} {row.unit || ''}
                                  </td>
                                  <td className="py-3 px-4 font-mono text-slate-500">
                                    {row.reference_range || 'N/A'}
                                  </td>
                                  <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                                    {row.loinc_code || '—'}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <div className="inline-flex flex-col items-center gap-1">
                                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${getAbnormalityBadge(row.abnormality_flag)}`}>
                                        {row.abnormality_flag || 'unknown'}
                                      </span>
                                      {row.is_duplicate_same_date && (
                                        <span
                                          className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900"
                                          title="Identical measure with same value uploaded on the same date. Shown in report history, omitted from longitudinal database."
                                        >
                                          Deduplicated
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 rounded-2xl border border-dashed text-center text-xs text-slate-400"
                           style={{ borderColor: 'var(--border-subtle)' }}>
                        No measurements recorded for this report.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default UploadHistory;
