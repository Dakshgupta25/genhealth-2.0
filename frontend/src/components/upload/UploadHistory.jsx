import React, { useState, useEffect, useCallback } from 'react';
import { getUserRecentReports, getReportResults, updateReportName } from '../../api/reports';
import { useAuth } from '../../context/AuthContext';
import DoodleIcon from '../common/DoodleIcon';
import { Button, Badge, Card, EmptyState } from '../ui';

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
    <div className="space-y-4 pt-4 border-t border-[#D0D9D0] dark:border-[#2A3B34]">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#E3EFE9] text-[#0D5446] dark:bg-[#1A332B] dark:text-[#3BB298]">
            <DoodleIcon name="file" className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#11231E] dark:text-[#ECF2EE] tracking-tight">
              Ingested Lab Report History
            </h2>
            <p className="text-xs text-[#586D66] dark:text-[#7C9184]">
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
        <div className="p-3.5 rounded-lg text-xs text-[#991B1B] bg-[#FEE2E2] dark:bg-[#2B1212] border border-[#FECACA] dark:border-[#4C1D1D] flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={fetchHistory} className="text-[#991B1B] dark:text-[#F87171]">
            Retry
          </Button>
        </div>
      )}

      {/* Rename error notification */}
      {renameError && (
        <div className="p-3 rounded-lg text-xs text-[#991B1B] bg-[#FEE2E2] dark:bg-[#2B1212] border border-[#FECACA] dark:border-[#4C1D1D] flex items-center justify-between">
          <span>⚠️ {renameError}</span>
          <button
            type="button"
            onClick={() => setRenameError('')}
            className="text-xs text-[#991B1B] dark:text-[#F87171] font-bold ml-2 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && reports.length === 0 ? (
        <Card radius="lg" className="p-8 text-center space-y-2">
          <div className="w-6 h-6 mx-auto rounded-full border-2 border-[#1D7A68] border-t-[#0D5446] animate-spin" />
          <p className="text-xs text-[#586D66] dark:text-[#7C9184]">Loading upload history...</p>
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
                  isExpanded ? 'border-[#0D5446]/50 shadow-xs' : ''
                }`}
              >
                {/* Header item: DATE - NAME OF REPORT */}
                <div
                  onClick={() => toggleReportMeasures(report.id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-[#F5F7F5] dark:hover:bg-[#1A2421]/60 transition-colors select-none"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isExpanded
                          ? 'bg-[#0D5446] text-white dark:bg-[#1A2421]'
                          : 'bg-[#EDF1ED] text-[#586D66] dark:bg-[#1A2421] dark:text-[#7C9184]'
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
                          <span className="font-mono text-[#0D5446] dark:text-[#3BB298] shrink-0 text-xs font-bold">
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
                            className="px-2.5 py-1 text-xs font-semibold rounded-md border border-[#0D5446] dark:border-[#3BB298] bg-white dark:bg-[#0F1714] text-[#11231E] dark:text-[#ECF2EE] min-w-[180px] flex-1 max-w-sm focus:outline-none"
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
                          <h3 className="text-sm font-bold text-[#11231E] dark:text-[#ECF2EE] truncate flex items-center space-x-1.5">
                            <span className="font-mono text-[#0D5446] dark:text-[#3BB298] shrink-0">
                              {formattedDate}
                            </span>
                            <span className="text-[#586D66] shrink-0">-</span>
                            <span className="truncate" title={reportName}>{reportName}</span>
                          </h3>
                          <button
                            type="button"
                            onClick={(e) => startEditing(e, report)}
                            title="Edit report name"
                            className="p-1 rounded-md text-[#586D66] hover:text-[#0D5446] hover:bg-[#E3EFE9] dark:hover:bg-[#1A332B] opacity-70 group-hover/title:opacity-100 transition-all shrink-0"
                          >
                            <DoodleIcon name="pen" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-[#586D66] dark:text-[#7C9184]">
                        <Badge status="normal" size="sm">✓ Extracted</Badge>
                        <span>•</span>
                        <span>{report.result_count !== undefined ? `${report.result_count} measures` : 'Results recorded'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5 self-end sm:self-center shrink-0">
                    <span className="text-xs font-semibold text-[#334740] dark:text-[#B2C2B8]">
                      {isExpanded ? 'Hide Measures' : 'View Measures'}
                    </span>
                    <div className="text-[#586D66]">
                      <DoodleIcon
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        className="w-4 h-4 transition-transform duration-150"
                      />
                    </div>
                  </div>
                </div>

                {/* Collapsible Measures Table */}
                {isExpanded && (
                  <div className="border-t border-[#EDF1ED] dark:border-[#1A2421] p-4 sm:p-5 space-y-3 bg-[#F5F7F5]/60 dark:bg-[#0E1412]/40 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <DoodleIcon name="heartbeat" className="w-4 h-4 text-[#0D5446] dark:text-[#3BB298]" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#334740] dark:text-[#B2C2B8]">
                          Extracted Measures &amp; Clinical Results
                        </h4>
                      </div>
                      <span className="text-xs font-mono text-[#586D66] dark:text-[#7C9184]">
                        {measures.length} {measures.length === 1 ? 'measurement' : 'measurements'}
                      </span>
                    </div>

                    {isLoadingMeasures ? (
                      <div className="p-6 text-center space-y-2">
                        <div className="w-5 h-5 mx-auto rounded-full border-2 border-[#1D7A68] border-t-transparent animate-spin" />
                        <p className="text-xs text-[#586D66]">Fetching report measures...</p>
                      </div>
                    ) : measures.length > 0 ? (
                      <div className="rounded-lg border border-[#D0D9D0] dark:border-[#2A3B34] bg-white dark:bg-[#141C19] overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-[#EDF1ED] dark:border-[#1A2421] bg-[#EDF1ED] dark:bg-[#1A2421] text-[10px] font-bold uppercase tracking-wider text-[#586D66] dark:text-[#7C9184]">
                                <th className="py-2.5 px-3.5 sticky left-0 bg-[#EDF1ED] dark:bg-[#1A2421] z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.06)] min-w-[150px]">
                                  Biomarker / Test Name
                                </th>
                                <th className="py-2.5 px-3.5 min-w-[130px]">Canonical Mapping</th>
                                <th className="py-2.5 px-3.5 min-w-[110px]">Observed Value</th>
                                <th className="py-2.5 px-3.5 min-w-[120px]">Reference Range</th>
                                <th className="py-2.5 px-3.5 min-w-[100px]">LOINC Code</th>
                                <th className="py-2.5 px-3.5 text-center min-w-[90px]">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EDF1ED] dark:divide-[#1A2421]">
                              {measures.map((row, idx) => {
                                const statusMeta = getAbnormalityMeta(row.abnormality_flag);
                                return (
                                  <tr key={row.id || idx} className="hover:bg-[#F5F7F5] dark:hover:bg-[#1A2421]/60 transition-colors">
                                    <td className="py-2.5 px-3.5 font-bold text-[#11231E] dark:text-[#ECF2EE] text-xs sticky left-0 bg-white dark:bg-[#141C19] z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.06)]">
                                      <div className="flex flex-col">
                                        <span>{row.raw_test_name || row.test_name || '—'}</span>
                                        {row.is_duplicate_same_date && (
                                          <span className="text-[10px] text-[#92400E] dark:text-[#FBBF24] font-normal">
                                            (Same-date duplicate • Excluded from trends)
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3.5 italic text-[#586D66] dark:text-[#7C9184]">
                                      {row.canonical_test_name || 'Standard'}
                                    </td>
                                    <td className="py-2.5 px-3.5 font-mono font-bold text-[#11231E] dark:text-[#ECF2EE]">
                                      {row.value !== undefined && row.value !== null ? row.value : '—'} {row.unit || ''}
                                    </td>
                                    <td className="py-2.5 px-3.5 font-mono text-[#334740] dark:text-[#B2C2B8]">
                                      {row.reference_range || 'N/A'}
                                    </td>
                                    <td className="py-2.5 px-3.5 font-mono text-[11px] text-[#586D66] dark:text-[#7C9184]">
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
                      <p className="text-xs text-[#586D66] italic py-2">
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
    </div>
  );
}

export default UploadHistory;
