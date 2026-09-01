import React from 'react';
import DoodleIcon from '../common/DoodleIcon';
import { Badge, Button, EmptyState } from '../ui';

/**
 * DiseaseTimelineView
 * 
 * Displays the longitudinal history of a clinical condition for a patient or relative,
 * clearly distinguishing between:
 * 1. Confirmed / Self-Reported Clinical Diagnoses (solid styling, official medical records)
 * 2. Inferred Lab Episodes (dashed/bordered styling, triggered dynamically by abnormal lab values)
 */
export function DiseaseTimelineView({
  timeline = [],
  loading = false,
  diseaseName = 'Condition',
  subjectName = 'Patient',
  onAddDiagnosis,
  onDeleteRecord,
  canAdd = false,
}) {
  if (loading) {
    return (
      <div className="p-6 text-center space-y-2 rounded-[8px] border border-[#CBD6D2] dark:border-[#2F433E] bg-white dark:bg-[#151E1C]">
        <div className="w-5 h-5 mx-auto rounded-full border-2 border-[#1E4D45] dark:border-[#57BA8E] border-t-transparent animate-spin" />
        <p className="text-xs text-[#7E9993]">Compiling clinical disease timeline...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header & Add Diagnosis Action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-[4px] flex items-center justify-center bg-[#E5EFEA] text-[#1E4D45] dark:bg-[#1C2725] dark:text-[#57BA8E]">
            <DoodleIcon name="stethoscope" className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#13221F] dark:text-[#EFF5F3]">
            Disease History &amp; Clinical Episodes Timeline
          </h3>
        </div>

        {canAdd && onAddDiagnosis && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onAddDiagnosis}
            leftIcon={<DoodleIcon name="plus" className="w-3 h-3 text-[#1E4D45] dark:text-[#57BA8E]" />}
          >
            + Log Diagnosis
          </Button>
        )}
      </div>

      {timeline.length === 0 ? (
        <div className="p-5 text-center rounded-[8px] border border-dashed border-[#CBD6D2] dark:border-[#2F433E] bg-[#F4F6F5]/50 dark:bg-[#1C2725]/30 space-y-1.5">
          <p className="text-xs font-semibold text-[#13221F] dark:text-[#EFF5F3]">
            No Past Disease History for {diseaseName}
          </p>
          <p className="text-[11px] text-[#7E9993]">
            No confirmed clinical diagnoses or critical lab threshold spikes recorded for {subjectName}.
          </p>
          {canAdd && onAddDiagnosis && (
            <div className="pt-2">
              <Button type="button" variant="primary" size="sm" onClick={onAddDiagnosis}>
                Add First Diagnosis Entry
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-[#CBD6D2] dark:before:bg-[#2F433E]">
          {timeline.map((event, idx) => {
            const isInferred = Boolean(event.is_inferred);
            const isConfirmed = event.event_type === 'confirmed_diagnosis';
            const isSelfReported = event.event_type === 'self_reported';

            return (
              <div key={event.id || idx} className="relative group">
                {/* Timeline Marker Dot */}
                <div
                  className={`absolute -left-6 top-2 w-3.5 h-3.5 rounded-full border-2 bg-white dark:bg-[#13221F] transition-transform group-hover:scale-125 ${
                    isInferred
                      ? 'border-[#D97706] text-[#D97706]'
                      : isConfirmed
                      ? 'border-[#1E4D45] text-[#1E4D45] dark:border-[#57BA8E]'
                      : 'border-[#0284C7] text-[#0284C7]'
                  }`}
                />

                {/* Event Card */}
                <div
                  className={`p-3.5 rounded-[8px] transition-all border ${
                    isInferred
                      ? 'bg-[#FFFBEB] dark:bg-[#2A2415] border-[#FDE68A] dark:border-[#78350F]'
                      : isConfirmed
                      ? 'bg-white dark:bg-[#151E1C] border-[#CBD6D2] dark:border-[#2F433E] shadow-xs'
                      : 'bg-[#F0F9FF] dark:bg-[#0C2438] border-[#BAE6FD] dark:border-[#075985]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-[#13221F] dark:text-[#EFF5F3]">
                        {event.title}
                      </span>

                      {/* Source Distinction Badge */}
                      {isInferred ? (
                        <Badge status="warning" size="sm" dot>
                          Inferred from Lab Values
                        </Badge>
                      ) : (
                        <Badge status="juniper" size="sm" dot>
                          {event.source_label || 'Official Diagnosis'}
                        </Badge>
                      )}

                      {event.status && (
                        <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.2 rounded bg-white dark:bg-[#111816] text-[#4E6863] dark:text-[#7E9993] border border-[#CBD6D2] dark:border-[#2F433E]">
                          Status: {event.status}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-[#7E9993] font-mono">
                      <span>{event.date ? new Date(event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown Date'}</span>
                      
                      {/* Delete button for explicit medical history entries */}
                      {!isInferred && onDeleteRecord && (
                        <button
                          type="button"
                          onClick={() => onDeleteRecord(event.id)}
                          className="text-[#942728] dark:text-[#E57373] hover:underline text-[11px] font-sans"
                          title="Delete entry"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notes / Details */}
                  {event.notes && (
                    <p className="text-xs text-[#4E6863] dark:text-[#CBD6D2] pt-1">
                      {event.notes}
                    </p>
                  )}

                  {/* Inferred Trigger Details */}
                  {isInferred && event.triggers && event.triggers.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[#FDE68A] dark:border-[#78350F] flex flex-wrap gap-1.5 text-[11px]">
                      <span className="text-[10px] font-semibold text-[#92400E] dark:text-[#FCD34D] mr-1">
                        Triggered by abnormal readings:
                      </span>
                      {event.triggers.map((trig, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-white dark:bg-[#1A1608] border border-[#FDE68A] dark:border-[#78350F] text-[#B45309] dark:text-[#FBBF24]"
                        >
                          {trig.biomarker_name}: <strong>{trig.observed_value}</strong>
                          {trig.reference_range ? ` (Ref: ${trig.reference_range})` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DiseaseTimelineView;
