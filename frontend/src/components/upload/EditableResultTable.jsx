import React, { useState, useEffect } from 'react';
import DoodleIcon from '../common/DoodleIcon';
import { Button, Badge, Card, CardTitle, CardDescription } from '../ui';

/**
 * Editable result table for reviewed or manual lab measurements.
 * Matches backend ReportResult schema dynamically.
 */
export function EditableResultTable({
  initialRows = [],
  isManual = false,
  onSave,
  onCancel,
  onChange,
  saving = false,
}) {
  const formatInitialRows = (items) => {
    if (items && items.length > 0) {
      return items.map((r, idx) => ({
        id: r.id || `row-${idx}-${Date.now()}`,
        raw_test_name: r.raw_test_name || r.test_name || '',
        value: r.value !== undefined && r.value !== null ? String(r.value) : '',
        unit: r.unit || '',
        reference_range: r.reference_range || '',
        canonical_test_name: r.canonical_test_name || '',
        abnormality_flag: r.abnormality_flag || 'unknown',
      }));
    }
    return [
      {
        id: `row-new-${Date.now()}`,
        raw_test_name: '',
        value: '',
        unit: '',
        reference_range: '',
        canonical_test_name: '',
        abnormality_flag: 'unknown',
      },
    ];
  };

  const [rows, setRows] = useState(() => formatInitialRows(initialRows));

  useEffect(() => {
    if (initialRows && initialRows.length > 0) {
      setRows(formatInitialRows(initialRows));
    }
  }, [initialRows]);

  const [validationError, setValidationError] = useState('');

  const handleCellChange = (id, field, val) => {
    setRows((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, [field]: val } : r));
      if (onChange) onChange(next);
      return next;
    });
  };

  const handleAddRow = () => {
    setRows((prev) => {
      const next = [
        ...prev,
        {
          id: `row-new-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          raw_test_name: '',
          value: '',
          unit: '',
          reference_range: '',
          canonical_test_name: '',
          abnormality_flag: 'unknown',
        },
      ];
      if (onChange) onChange(next);
      return next;
    });
  };

  const handleDeleteRow = (id) => {
    setRows((prev) => {
      const filtered = prev.filter((r) => r.id !== id);
      const next =
        filtered.length === 0
          ? [
              {
                id: `row-blank-${Date.now()}`,
                raw_test_name: '',
                value: '',
                unit: '',
                reference_range: '',
                canonical_test_name: '',
                abnormality_flag: 'unknown',
              },
            ]
          : filtered;
      if (onChange) onChange(next);
      return next;
    });
  };

  const handleSave = () => {
    setValidationError('');
    const validRows = rows.filter((r) => r.raw_test_name.trim() || r.value.trim());

    if (validRows.length === 0) {
      setValidationError('Please enter at least one test measurement before saving.');
      return;
    }

    for (let i = 0; i < validRows.length; i++) {
      if (!validRows[i].raw_test_name.trim()) {
        setValidationError(`Row ${i + 1} is missing a Test Name.`);
        return;
      }
      if (!validRows[i].value.trim()) {
        setValidationError(`Row ${i + 1} ("${validRows[i].raw_test_name}") is missing a Value.`);
        return;
      }
    }

    onSave(validRows);
  };

  const getStatusSelectClass = (flag) => {
    switch (flag?.toLowerCase()) {
      case 'high':
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900';
      case 'low':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900';
      case 'normal':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Table Header Bar Card */}
      <Card radius="xl">
        <div className="p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Badge status={isManual ? 'teal' : 'info'} size="sm">
                {isManual ? 'Manual Entry Mode' : 'Extracted Measures Review'}
              </Badge>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {rows.length} {rows.length === 1 ? 'measurement' : 'measurements'}
              </span>
            </div>
            <CardTitle className="text-lg">Review &amp; Edit Clinical Measures</CardTitle>
            <CardDescription>
              Verify canonical mappings, numerical values, and reference ranges before committing to your permanent record.
            </CardDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            id="add-measurement-row-btn"
            leftIcon={<DoodleIcon name="plus" className="w-3.5 h-3.5" />}
          >
            Add Measurement
          </Button>
        </div>
      </Card>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="p-3.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 border border-red-200 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300 flex items-center space-x-2">
          <span>⚠️</span>
          <span>{validationError}</span>
        </div>
      )}

      {/* Structured Medical Data Table */}
      <Card radius="lg" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/90 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 px-3.5 min-w-[170px] sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.06)]">
                  Biomarker / Test Name
                </th>
                <th className="py-3 px-3.5 min-w-[110px]">Observed Value</th>
                <th className="py-3 px-3.5 min-w-[90px]">Unit</th>
                <th className="py-3 px-3.5 min-w-[130px]">Reference Range</th>
                <th className="py-3 px-3.5 min-w-[160px]">Canonical Mapping</th>
                <th className="py-3 px-3.5 w-32 text-center">Diagnostic Status</th>
                <th className="py-3 px-3.5 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {rows.map((row) => {
                return (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors h-12"
                  >
                    {/* Raw Test Name (Sticky) */}
                    <td className="py-2 px-3 sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.06)]">
                      <input
                        type="text"
                        placeholder="e.g. Hemoglobin"
                        value={row.raw_test_name}
                        onChange={(e) => handleCellChange(row.id, 'raw_test_name', e.target.value)}
                        className="w-full h-9 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:border-cyan-600 focus:ring-1 focus:ring-cyan-500/20 outline-none"
                      />
                    </td>

                    {/* Numerical Value */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="e.g. 14.2"
                        value={row.value}
                        onChange={(e) => handleCellChange(row.id, 'value', e.target.value)}
                        className="w-full h-9 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs font-mono font-bold focus:border-cyan-600 focus:ring-1 focus:ring-cyan-500/20 outline-none"
                      />
                    </td>

                    {/* Unit */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="g/dL"
                        value={row.unit}
                        onChange={(e) => handleCellChange(row.id, 'unit', e.target.value)}
                        className="w-full h-9 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-mono focus:border-cyan-600 focus:ring-1 focus:ring-cyan-500/20 outline-none"
                      />
                    </td>

                    {/* Reference Range */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="13.0 - 17.0"
                        value={row.reference_range}
                        onChange={(e) => handleCellChange(row.id, 'reference_range', e.target.value)}
                        className="w-full h-9 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-mono focus:border-cyan-600 focus:ring-1 focus:ring-cyan-500/20 outline-none"
                      />
                    </td>

                    {/* Canonical Test Name */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="LOINC standard mapping"
                        value={row.canonical_test_name}
                        onChange={(e) => handleCellChange(row.id, 'canonical_test_name', e.target.value)}
                        className="w-full h-9 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-cyan-700 dark:text-cyan-300 text-xs italic focus:border-cyan-600 focus:ring-1 focus:ring-cyan-500/20 outline-none"
                      />
                    </td>

                    {/* Abnormality Flag Dropdown */}
                    <td className="py-2 px-3 text-center">
                      <select
                        value={row.abnormality_flag}
                        onChange={(e) => handleCellChange(row.id, 'abnormality_flag', e.target.value)}
                        className={`h-9 px-2 rounded-md text-[11px] font-bold uppercase tracking-wider border cursor-pointer outline-none focus:ring-1 focus:ring-cyan-500/20 ${getStatusSelectClass(row.abnormality_flag)}`}
                      >
                        <option value="normal" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Normal</option>
                        <option value="high" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">High</option>
                        <option value="low" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Low</option>
                        <option value="critical" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Critical</option>
                        <option value="unknown" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Review</option>
                      </select>
                    </td>

                    {/* Delete Row Action */}
                    <td className="py-2 px-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRow(row.id)}
                        title="Delete measurement row"
                        className="w-8 h-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <DoodleIcon name="trash" className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mandatory Reminder Banner & Commit Actions */}
      <Card radius="xl" className="p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          {/* Exact Mandatory Reminder Text */}
          <div className="flex items-center space-x-3 text-xs sm:text-sm">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800 shrink-0">
              ⚠️
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-100">
                Check the form once before saving it as a medical measure.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Data will be permanently indexed into your longitudinal health database upon confirmation.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2.5 w-full md:w-auto justify-end shrink-0">
            {onCancel && (
              <Button
                variant="outline"
                size="md"
                onClick={onCancel}
                disabled={saving}
              >
                Cancel
              </Button>
            )}

            <Button
              variant="primary"
              size="md"
              id="commit-save-measurements-btn"
              onClick={handleSave}
              loading={saving}
              leftIcon={<DoodleIcon name="check" className="w-4 h-4 text-cyan-400" />}
            >
              {saving ? 'Saving Measures...' : 'Save Medical Measures'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default EditableResultTable;
