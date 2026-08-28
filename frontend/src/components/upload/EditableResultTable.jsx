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
        return 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA] dark:bg-[#2B1212] dark:text-[#F87171] dark:border-[#4C1D1D]';
      case 'low':
        return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] dark:bg-[#291E0B] dark:text-[#FBBF24] dark:border-[#453314]';
      case 'normal':
        return 'bg-[#E3EFE9] text-[#0D5446] border-[#C6DFD2] dark:bg-[rgba(74,222,128,0.12)] dark:text-[#4ADE80] dark:border-[rgba(74,222,128,0.28)]';
      default:
        return 'bg-[#EDF1ED] text-[#334740] border-[#D6DDD6] dark:bg-[#1A2421] dark:text-[#B2C2B8] dark:border-[#23312B]';
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
              <span className="text-xs font-mono text-[#586D66] dark:text-[#7C9184]">
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
        <div className="p-3.5 rounded-lg text-xs font-semibold text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] dark:bg-[#2B1212] dark:border-[#4C1D1D] dark:text-[#F87171] flex items-center space-x-2">
          <span>⚠️</span>
          <span>{validationError}</span>
        </div>
      )}

      {/* Structured Medical Data Table */}
      <Card radius="lg" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#D0D9D0] dark:border-[#2A3B34] bg-[#EDF1ED]/90 dark:bg-[#1A2421]/90 text-[11px] font-bold uppercase tracking-wider text-[#586D66] dark:text-[#7C9184]">
                <th className="py-3 px-3.5 min-w-[170px] sticky left-0 bg-[#EDF1ED] dark:bg-[#1A2421] z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.06)]">
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
            <tbody className="divide-y divide-[#EDF1ED] dark:divide-[#1A2421]">
              {rows.map((row) => {
                return (
                  <tr
                    key={row.id}
                    className="hover:bg-[#F5F7F5] dark:hover:bg-[#1A2421]/60 transition-colors h-12"
                  >
                    {/* Raw Test Name (Sticky) */}
                    <td className="py-2 px-3 sticky left-0 bg-white dark:bg-[#141C19] z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.06)]">
                      <input
                        type="text"
                        placeholder="e.g. Hemoglobin"
                        value={row.raw_test_name}
                        onChange={(e) => handleCellChange(row.id, 'raw_test_name', e.target.value)}
                        className="w-full h-9 px-2.5 rounded-md border border-[#D6DDD6] dark:border-[#2A3B34] bg-white dark:bg-[#0F1714] text-[#11231E] dark:text-[#ECF2EE] text-xs font-semibold focus:border-[#0D5446] dark:focus:border-[#3BB298] focus:ring-1 focus:ring-[#1D7A68]/20 outline-none"
                      />
                    </td>

                    {/* Numerical Value */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="e.g. 14.2"
                        value={row.value}
                        onChange={(e) => handleCellChange(row.id, 'value', e.target.value)}
                        className="w-full h-9 px-2.5 rounded-md border border-[#D6DDD6] dark:border-[#2A3B34] bg-white dark:bg-[#0F1714] text-[#11231E] dark:text-[#ECF2EE] text-xs font-mono font-bold focus:border-[#0D5446] dark:focus:border-[#3BB298] focus:ring-1 focus:ring-[#1D7A68]/20 outline-none"
                      />
                    </td>

                    {/* Unit */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="g/dL"
                        value={row.unit}
                        onChange={(e) => handleCellChange(row.id, 'unit', e.target.value)}
                        className="w-full h-9 px-2.5 rounded-md border border-[#D6DDD6] dark:border-[#2A3B34] bg-white dark:bg-[#0F1714] text-[#334740] dark:text-[#B2C2B8] text-xs font-mono focus:border-[#0D5446] dark:focus:border-[#3BB298] focus:ring-1 focus:ring-[#1D7A68]/20 outline-none"
                      />
                    </td>

                    {/* Reference Range */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="13.0 - 17.0"
                        value={row.reference_range}
                        onChange={(e) => handleCellChange(row.id, 'reference_range', e.target.value)}
                        className="w-full h-9 px-2.5 rounded-md border border-[#D6DDD6] dark:border-[#2A3B34] bg-white dark:bg-[#0F1714] text-[#334740] dark:text-[#B2C2B8] text-xs font-mono focus:border-[#0D5446] dark:focus:border-[#3BB298] focus:ring-1 focus:ring-[#1D7A68]/20 outline-none"
                      />
                    </td>

                    {/* Canonical Test Name */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="LOINC standard mapping"
                        value={row.canonical_test_name}
                        onChange={(e) => handleCellChange(row.id, 'canonical_test_name', e.target.value)}
                        className="w-full h-9 px-2.5 rounded-md border border-[#D6DDD6] dark:border-[#2A3B34] bg-white dark:bg-[#0F1714] text-[#0D5446] dark:text-[#3BB298] text-xs italic focus:border-[#0D5446] dark:focus:border-[#3BB298] focus:ring-1 focus:ring-[#1D7A68]/20 outline-none"
                      />
                    </td>

                    {/* Abnormality Flag Dropdown */}
                    <td className="py-2 px-3 text-center">
                      <select
                        value={row.abnormality_flag}
                        onChange={(e) => handleCellChange(row.id, 'abnormality_flag', e.target.value)}
                        className={`h-9 px-2 rounded-md text-[11px] font-bold uppercase tracking-wider border cursor-pointer outline-none focus:ring-1 focus:ring-[#1D7A68]/20 ${getStatusSelectClass(row.abnormality_flag)}`}
                      >
                        <option value="normal" className="bg-white dark:bg-[#141C19] text-[#11231E] dark:text-[#ECF2EE]">Normal</option>
                        <option value="high" className="bg-white dark:bg-[#141C19] text-[#11231E] dark:text-[#ECF2EE]">High</option>
                        <option value="low" className="bg-white dark:bg-[#141C19] text-[#11231E] dark:text-[#ECF2EE]">Low</option>
                        <option value="critical" className="bg-white dark:bg-[#141C19] text-[#11231E] dark:text-[#ECF2EE]">Critical</option>
                        <option value="unknown" className="bg-white dark:bg-[#141C19] text-[#11231E] dark:text-[#ECF2EE]">Review</option>
                      </select>
                    </td>

                    {/* Delete Row Action */}
                    <td className="py-2 px-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRow(row.id)}
                        title="Delete measurement row"
                        className="w-8 h-8 p-0 text-[#7C9184] hover:text-[#991B1B] hover:bg-[#FEE2E2] dark:hover:bg-[#2B1212]"
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

      {/* Mandatory Review Warning & Save / Commit Footer */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#FEF3C7] dark:bg-[#291E0B] border border-[#FDE68A] dark:border-[#453314] text-xs space-y-3 shadow-xs">
        <div className="flex items-start space-x-3">
          <span className="text-base shrink-0 mt-0.5">⚠️</span>
          <div className="space-y-1">
            <h4 className="font-bold text-[#92400E] dark:text-[#FBBF24]">
              Mandatory Clinical Review Required
            </h4>
            <p className="text-[#92400E]/90 dark:text-[#FBBF24]/90 leading-relaxed text-[11px]">
              AI extraction and canonical normalization provide assisted indexing. Always cross-check extracted numbers, reference bounds, and units against your primary lab sheet before saving.
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-[#FDE68A]/60 dark:border-[#453314]/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[11px] font-mono text-[#92400E] dark:text-[#FBBF24]">
            Ready to commit: <strong>{rows.length}</strong> {rows.length === 1 ? 'measurement' : 'measurements'}
          </span>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <Button
              variant="outline"
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
              leftIcon={<DoodleIcon name="check" className="w-4 h-4 text-emerald-300 dark:text-[#3BB298]" />}
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
