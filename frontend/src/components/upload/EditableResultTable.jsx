import React, { useState } from 'react';
import DoodleIcon from '../common/DoodleIcon';

/**
 * Editable result table for reviewed or manual lab measurements.
 * Matches backend ReportResult schema dynamically.
 */
export function EditableResultTable({
  initialRows = [],
  isManual = false,
  onSave,
  onCancel,
  saving = false,
}) {

  const [rows, setRows] = useState(() => {
    if (initialRows && initialRows.length > 0) {
      return initialRows.map((r, idx) => ({
        id: r.id || `row-${idx}-${Date.now()}`,
        raw_test_name: r.raw_test_name || r.test_name || '',
        value: r.value !== undefined && r.value !== null ? String(r.value) : '',
        unit: r.unit || '',
        reference_range: r.reference_range || '',
        canonical_test_name: r.canonical_test_name || '',
        abnormality_flag: r.abnormality_flag || 'unknown',
      }));
    }
    // Default single blank row for manual mode
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
  });

  const [validationError, setValidationError] = useState('');

  const handleCellChange = (id, field, val) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  };

  const handleAddRow = () => {
    setRows((prev) => [
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
    ]);
  };

  const handleDeleteRow = (id) => {
    setRows((prev) => {
      const filtered = prev.filter((r) => r.id !== id);
      if (filtered.length === 0) {
        return [
          {
            id: `row-blank-${Date.now()}`,
            raw_test_name: '',
            value: '',
            unit: '',
            reference_range: '',
            canonical_test_name: '',
            abnormality_flag: 'unknown',
          },
        ];
      }
      return filtered;
    });
  };

  const handleSave = () => {
    setValidationError('');
    // Filter out rows where both test name and value are completely blank
    const validRows = rows.filter((r) => r.raw_test_name.trim() || r.value.trim());

    if (validRows.length === 0) {
      setValidationError('Please enter at least one test measurement before saving.');
      return;
    }

    // Validate that each filled row has at least a test name and a value
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

  const getBadgeStyle = (flag) => {
    switch (flag?.toLowerCase()) {
      case 'high':
        return {
          backgroundColor: 'var(--status-critical-bg)',
          color: 'var(--status-critical)',
          label: 'HIGH',
        };
      case 'low':
        return {
          backgroundColor: 'var(--status-warning-bg)',
          color: 'var(--status-warning)',
          label: 'LOW',
        };
      case 'normal':
        return {
          backgroundColor: 'var(--status-normal-bg)',
          color: 'var(--status-normal)',
          label: 'NORMAL',
        };
      default:
        return {
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-muted)',
          label: 'REVIEW',
        };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Table Header Bar */}
      <div className="p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
           style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider"
                  style={{ backgroundColor: 'var(--brand-soft-blue)', color: 'var(--brand-primary)' }}>
              {isManual ? 'Manual Entry Mode' : 'Extracted Measurements Review'}
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              {rows.length} {rows.length === 1 ? 'measurement' : 'measurements'}
            </span>
          </div>
          <h2 className="text-xl font-bold mt-1">Review & Edit Clinical Measures</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Modify values, adjust reference ranges, delete extraneous lines, or add missing tests before committing.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddRow}
          id="add-measurement-row-btn"
          className="px-4 py-2.5 rounded-xl text-xs font-bold border flex items-center space-x-2 transition-all hover:opacity-90 shadow-sm"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        >
          <DoodleIcon name="plus" className="w-3.5 h-3.5" />
          <span>Add Measurement</span>
        </button>
      </div>

      {validationError && (
        <div className="p-4 rounded-2xl text-xs font-semibold text-red-700 bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300">
          ⚠️ {validationError}
        </div>
      )}

      {/* Dynamic Responsive Table */}
      <div className="rounded-3xl border shadow-sm overflow-hidden"
           style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b font-bold tracking-wider uppercase text-[11px]"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4 min-w-[180px]">Test Name</th>
                <th className="py-3.5 px-4 min-w-[100px]">Observed Value</th>
                <th className="py-3.5 px-4 min-w-[90px]">Unit</th>
                <th className="py-3.5 px-4 min-w-[130px]">Reference Range</th>
                <th className="py-3.5 px-4 min-w-[150px]">Canonical Mapping</th>
                <th className="py-3.5 px-4 w-28 text-center">Status Flag</th>
                <th className="py-3.5 px-4 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {rows.map((row, index) => {
                const badge = getBadgeStyle(row.abnormality_flag);
                return (
                  <tr key={row.id} className="hover:bg-slate-500/5 transition-colors">
                    <td className="py-3 px-4 text-center font-mono text-slate-400">
                      {index + 1}
                    </td>

                    {/* Raw Test Name */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        placeholder="e.g. Hemoglobin"
                        value={row.raw_test_name}
                        onChange={(e) => handleCellChange(row.id, 'raw_test_name', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border outline-none font-medium focus:ring-1"
                        style={{
                          backgroundColor: 'var(--bg-input)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </td>

                    {/* Value */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        placeholder="e.g. 14.2"
                        value={row.value}
                        onChange={(e) => handleCellChange(row.id, 'value', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border outline-none font-semibold focus:ring-1 font-mono"
                        style={{
                          backgroundColor: 'var(--bg-input)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </td>

                    {/* Unit */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        placeholder="g/dL"
                        value={row.unit}
                        onChange={(e) => handleCellChange(row.id, 'unit', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border outline-none focus:ring-1 font-mono"
                        style={{
                          backgroundColor: 'var(--bg-input)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </td>

                    {/* Reference Range */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        placeholder="13.0 - 17.0"
                        value={row.reference_range}
                        onChange={(e) => handleCellChange(row.id, 'reference_range', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border outline-none focus:ring-1"
                        style={{
                          backgroundColor: 'var(--bg-input)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </td>

                    {/* Canonical Test Name */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        placeholder="Auto-resolved canonical"
                        value={row.canonical_test_name}
                        onChange={(e) => handleCellChange(row.id, 'canonical_test_name', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border outline-none text-xs focus:ring-1 italic"
                        style={{
                          backgroundColor: 'var(--bg-input)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-accent)',
                        }}
                      />
                    </td>

                    {/* Abnormality Flag */}
                    <td className="py-3 px-4 text-center">
                      <select
                        value={row.abnormality_flag}
                        onChange={(e) => handleCellChange(row.id, 'abnormality_flag', e.target.value)}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider outline-none border cursor-pointer"
                        style={{
                          backgroundColor: badge.backgroundColor,
                          color: badge.color,
                          borderColor: 'transparent',
                        }}
                      >
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="low">Low</option>
                        <option value="unknown">Review</option>
                      </select>
                    </td>

                    {/* Delete Action */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(row.id)}
                        title="Delete measurement row"
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      >
                        <DoodleIcon name="trash" className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save Action Banner & Exact Mandatory Reminder Text */}
      <div className="p-6 rounded-3xl border shadow-md flex flex-col md:flex-row items-center justify-between gap-4"
           style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
        
        {/* Exact Mandatory Reminder Text */}
        <div className="flex items-center space-x-3 text-sm">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-amber-600 bg-amber-50 dark:bg-amber-950/50 shrink-0">
            ⚠️
          </div>
          <div>
            <p className="font-bold text-xs md:text-sm" style={{ color: 'var(--text-primary)' }}>
              Check the form once before saving it as a medical measure.
            </p>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Data will be permanently indexed into your longitudinal health database upon confirmation.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="px-5 py-3 rounded-2xl text-xs font-bold border transition-all hover:opacity-80 disabled:opacity-50"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            id="commit-save-measurements-btn"
            onClick={handleSave}
            disabled={saving}
            className="px-7 py-3 rounded-2xl text-xs font-bold text-white shadow-lg flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            {saving ? (
              <span>Saving Measures...</span>
            ) : (
              <>
                <DoodleIcon name="check" className="w-4 h-4" />
                <span>Save Medical Measures</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditableResultTable;
