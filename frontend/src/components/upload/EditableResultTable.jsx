import React, { useState, useEffect } from 'react';
import DoodleIcon from '../common/DoodleIcon';
import { Button, Badge, Card, CardTitle, CardDescription } from '../ui';

export function EditableResultTable({
  initialRows = [],
  _reportId,
  isManual = false,
  saving = false,
  onChange,
  onSave,
  onCancel,
}) {
  const [rows, setRows] = useState([]);
  const [validationError, setValidationError] = useState('');

  // Initialize and synchronize rows from props
  useEffect(() => {
    if (initialRows && initialRows.length > 0) {
      setRows(
        initialRows.map((r, i) => ({
          id: r.id || `row-${Date.now()}-${i}`,
          raw_test_name: r.raw_test_name || r.test_name || '',
          value: r.value !== undefined && r.value !== null ? String(r.value) : '',
          unit: r.unit || '',
          reference_range: r.reference_range || '',
          canonical_test_name: r.canonical_test_name || '',
          abnormality_flag: r.abnormality_flag || 'normal',
        }))
      );
    } else {
      setRows([
        {
          id: `row-${Date.now()}-0`,
          raw_test_name: '',
          value: '',
          unit: '',
          reference_range: '',
          canonical_test_name: '',
          abnormality_flag: 'normal',
        },
      ]);
    }
  }, [initialRows]);

  const handleCellChange = (id, field, value) => {
    setRows((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, [field]: value } : r));
      if (onChange) onChange(next);
      return next;
    });
  };

  const handleAddRow = () => {
    setRows((prev) => {
      const next = [
        ...prev,
        {
          id: `row-${Date.now()}-${prev.length}`,
          raw_test_name: '',
          value: '',
          unit: '',
          reference_range: '',
          canonical_test_name: '',
          abnormality_flag: 'normal',
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
                id: `row-${Date.now()}-0`,
                raw_test_name: '',
                value: '',
                unit: '',
                reference_range: '',
                canonical_test_name: '',
                abnormality_flag: 'normal',
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
      case 'low':
        return 'bg-[#FCEBED] text-[#B4232F] border-[#E8B4B9] dark:bg-[#2D1416] dark:text-[#E04855] dark:border-[#522226]';
      case 'normal':
        return 'bg-[#EAF6F0] text-[#247A59] border-[#B8E4D1] dark:bg-[#13241B] dark:text-[#48BB78] dark:border-[#1E3D2C]';
      default:
        return 'bg-[#F4F4F2] text-[#5F6368] border-[#E3E3DF] dark:bg-[#1E1E1E] dark:text-[#A0A0A0] dark:border-[#404040]';
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Table Header Bar Card */}
      <Card radius="lg" className="bg-white border border-[#E3E3DF] dark:border-[#303030]">
        <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Badge status={isManual ? 'brand' : 'info'} size="sm">
                {isManual ? 'Manual Entry Mode' : 'Extracted Measures Review'}
              </Badge>
              <span className="text-xs font-mono text-[#858585]">
                {rows.length} {rows.length === 1 ? 'measurement' : 'measurements'}
              </span>
            </div>
            <CardTitle className="text-base sm:text-lg">Review &amp; Edit Clinical Measures</CardTitle>
            <CardDescription>
              Verify canonical mappings, numerical values, and reference bounds before saving to your record.
            </CardDescription>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleAddRow}
            id="add-measurement-row-btn"
            leftIcon={<DoodleIcon name="plus" className="w-3.5 h-3.5 text-[#171717]" />}
          >
            Add Measurement
          </Button>
        </div>
      </Card>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="p-3.5 rounded-[8px] text-xs font-semibold text-[#B4232F] bg-[#FCEBED] border border-[#E8B4B9] dark:bg-[#2D1416] dark:border-[#522226] dark:text-[#E04855] flex items-center space-x-2">
          <span>⚠️</span>
          <span>{validationError}</span>
        </div>
      )}

      {/* Structured Medical Data Table */}
      <Card radius="lg" className="overflow-hidden bg-white border border-[#E3E3DF] dark:border-[#303030]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E3E3DF] dark:border-[#303030] bg-[#F7F7F5] dark:bg-[#222222] text-[11px] font-semibold uppercase tracking-wider text-[#5F6368] dark:text-[#A0A0A0]">
                <th className="py-3 px-3.5 min-w-[170px] sticky left-0 bg-[#F7F7F5] dark:bg-[#222222] z-10">
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
            <tbody className="divide-y divide-[#E8E7E4] dark:divide-[#282828]">
              {rows.map((row) => {
                return (
                  <tr
                    key={row.id}
                    className="hover:bg-[#FCFCFB] dark:hover:bg-[#222222] transition-colors h-12"
                  >
                    {/* Raw Test Name (Sticky) */}
                    <td className="py-2 px-3 sticky left-0 bg-white dark:bg-[#1E1E1E] z-10">
                      <input
                        type="text"
                        placeholder="e.g. Hemoglobin"
                        value={row.raw_test_name}
                        onChange={(e) => handleCellChange(row.id, 'raw_test_name', e.target.value)}
                        className="w-full h-8.5 px-2.5 rounded-[6px] border border-[#D4D2CE] dark:border-[#404040] bg-white dark:bg-[#181818] text-[#171717] dark:text-[#F0F0F0] text-xs font-semibold focus:border-[#B4232F] focus:ring-2 focus:ring-[#B4232F]/15 outline-none"
                      />
                    </td>

                    {/* Numerical Value */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="e.g. 14.2"
                        value={row.value}
                        onChange={(e) => handleCellChange(row.id, 'value', e.target.value)}
                        className="w-full h-8.5 px-2.5 rounded-[6px] border border-[#D4D2CE] dark:border-[#404040] bg-white dark:bg-[#181818] text-[#171717] dark:text-[#F0F0F0] text-xs font-mono font-bold focus:border-[#B4232F] focus:ring-2 focus:ring-[#B4232F]/15 outline-none"
                      />
                    </td>

                    {/* Unit */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="g/dL"
                        value={row.unit}
                        onChange={(e) => handleCellChange(row.id, 'unit', e.target.value)}
                        className="w-full h-8.5 px-2.5 rounded-[6px] border border-[#D4D2CE] dark:border-[#404040] bg-white dark:bg-[#181818] text-[#5F6368] dark:text-[#A0A0A0] text-xs font-mono focus:border-[#B4232F] focus:ring-2 focus:ring-[#B4232F]/15 outline-none"
                      />
                    </td>

                    {/* Reference Range */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="13.0 - 17.0"
                        value={row.reference_range}
                        onChange={(e) => handleCellChange(row.id, 'reference_range', e.target.value)}
                        className="w-full h-8.5 px-2.5 rounded-[6px] border border-[#D4D2CE] dark:border-[#404040] bg-white dark:bg-[#181818] text-[#5F6368] dark:text-[#A0A0A0] text-xs font-mono focus:border-[#B4232F] focus:ring-2 focus:ring-[#B4232F]/15 outline-none"
                      />
                    </td>

                    {/* Canonical Test Name */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="LOINC mapping"
                        value={row.canonical_test_name}
                        onChange={(e) => handleCellChange(row.id, 'canonical_test_name', e.target.value)}
                        className="w-full h-8.5 px-2.5 rounded-[6px] border border-[#D4D2CE] dark:border-[#404040] bg-white dark:bg-[#181818] text-[#5F6368] dark:text-[#A0A0A0] text-xs italic focus:border-[#B4232F] focus:ring-2 focus:ring-[#B4232F]/15 outline-none"
                      />
                    </td>

                    {/* Abnormality Flag Dropdown */}
                    <td className="py-2 px-3 text-center">
                      <select
                        value={row.abnormality_flag}
                        onChange={(e) => handleCellChange(row.id, 'abnormality_flag', e.target.value)}
                        className={`h-8.5 px-2 rounded-[6px] text-[11px] font-semibold uppercase tracking-wider border cursor-pointer outline-none ${getStatusSelectClass(row.abnormality_flag)}`}
                      >
                        <option value="normal" className="bg-white dark:bg-[#1E1E1E] text-[#171717] dark:text-[#F0F0F0]">Normal</option>
                        <option value="high" className="bg-white dark:bg-[#1E1E1E] text-[#171717] dark:text-[#F0F0F0]">High</option>
                        <option value="low" className="bg-white dark:bg-[#1E1E1E] text-[#171717] dark:text-[#F0F0F0]">Low</option>
                        <option value="critical" className="bg-white dark:bg-[#1E1E1E] text-[#171717] dark:text-[#F0F0F0]">Critical</option>
                        <option value="unknown" className="bg-white dark:bg-[#1E1E1E] text-[#171717] dark:text-[#F0F0F0]">Review</option>
                      </select>
                    </td>

                    {/* Delete Row Action */}
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(row.id)}
                        title="Delete measurement row"
                        className="w-7 h-7 inline-flex items-center justify-center rounded-[4px] text-[#858585] hover:text-[#B4232F] hover:bg-[#FCEBED] dark:hover:bg-[#2D1416] transition-colors cursor-pointer"
                      >
                        <DoodleIcon name="trash" className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Review Caution Notice & Save Footer */}
      <div className="p-4 sm:p-5 rounded-[8px] bg-[#FCFCFB] dark:bg-[#181818] border border-[#E3E3DF] dark:border-[#303030] text-xs space-y-3">
        <div className="flex items-start space-x-2.5">
          <span className="text-base shrink-0">ℹ️</span>
          <p className="text-[#5F6368] dark:text-[#A0A0A0] leading-relaxed text-[11px]">
            Please verify extracted values, canonical names, and reference ranges against your primary paper or PDF report before committing.
          </p>
        </div>

        <div className="pt-2 border-t border-[#E3E3DF] dark:border-[#303030] flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[11px] font-mono text-[#858585]">
            Ready to commit: <strong>{rows.length}</strong> {rows.length === 1 ? 'measurement' : 'measurements'}
          </span>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="md"
              onClick={onCancel}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              Cancel &amp; Discard
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={handleSave}
              loading={saving}
              id="confirm-save-measurements-btn"
              className="w-full sm:w-auto"
              leftIcon={<DoodleIcon name="check" className="w-4 h-4 text-white" />}
            >
              Confirm &amp; Save Records
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditableResultTable;
