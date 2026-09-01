import React, { useState } from 'react';
import DoodleIcon from '../common/DoodleIcon';
import KinshipBadge from './KinshipBadge';
import DiseaseTimelineView from './DiseaseTimelineView';
import { Card, CardHeader, CardTitle, Badge } from '../ui';

/**
 * RelativeDiseaseCard
 * 
 * Represents a single linked relative in the Right Column of the Doctor Portal.
 * Displays:
 * 1. Kinship & relationship pedigree header (with genetic degree)
 * 2. Privacy consent check (shows privacy lock if consent restricted)
 * 3. Recent 5 reports biomarker measurements table
 * 4. Relative's disease history timeline
 */
export function RelativeDiseaseCard({
  relative,
  diseaseName = 'Condition',
  onSelectBiomarker,
  activeBiomarkerKey = '',
}) {
  const [expanded, setExpanded] = useState(true);

  if (!relative) return null;

  const isRestricted = Boolean(relative.consent_restricted);
  const reports = relative.recent_reports || [];
  const biomarkerSummaries = relative.biomarker_summaries || [];

  const getAbnormalityBadge = (flag) => {
    switch (flag?.toLowerCase()) {
      case 'high':
      case 'critical':
        return <Badge status="critical" size="sm" dot>High</Badge>;
      case 'low':
        return <Badge status="warning" size="sm" dot>Low</Badge>;
      case 'normal':
        return <Badge status="normal" size="sm" dot>Normal</Badge>;
      default:
        return <Badge status="neutral" size="sm">{flag || 'Recorded'}</Badge>;
    }
  };

  return (
    <Card radius="lg" className="overflow-hidden bg-white dark:bg-[#151E1C] border border-[#CBD6D2] dark:border-[#2F433E] shadow-xs">
      
      {/* 1. Relative Kinship Header */}
      <CardHeader density="compact" className="border-b border-[#E0E7E4] dark:border-[#22312E] bg-[#F4F6F5]/70 dark:bg-[#1C2725]/70 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5">
            <KinshipBadge
              relationshipType={relative.relationship_type}
              isGenetic={relative.is_genetic}
              kinshipWeight={relative.kinship_weight}
              size="md"
            />
            <span className="text-[#7E9993]">•</span>
            <span className="text-xs sm:text-sm font-bold text-[#13221F] dark:text-[#EFF5F3]">
              {relative.relative_name}
            </span>
            {relative.is_placeholder && (
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#E0E7E4] text-[#4E6863] dark:bg-[#253632] dark:text-[#7E9993]">
                Managed
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {isRestricted ? (
              <Badge status="warning" size="sm">
                🔒 Data Sharing Restricted
              </Badge>
            ) : (
              <Badge status="juniper" size="sm">
                Clinical Consent Active
              </Badge>
            )}

            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded text-[#7E9993] hover:text-[#13221F] dark:hover:text-[#EFF5F3] text-xs font-semibold"
            >
              {expanded ? '▲ Collapse' : '▼ Expand'}
            </button>
          </div>
        </div>
      </CardHeader>

      {/* 2. Card Body */}
      {expanded && (
        <div className="p-4 sm:p-5 space-y-5">
          {isRestricted ? (
            /* Privacy Restriction State */
            <div className="p-4 rounded-[8px] bg-[#FDF0F0] dark:bg-[#2D1616] border border-[#F6C4C5] dark:border-[#5B292A] text-xs text-[#942728] dark:text-[#E57373] flex items-start space-x-2.5">
              <span className="text-base leading-none">🔒</span>
              <div className="space-y-1">
                <p className="font-bold">Clinical Data Sharing is Disabled</p>
                <p className="text-[11px] opacity-90">
                  {relative.restriction_reason || 'This family member has disabled laboratory record sharing for cross-pedigree risk investigation.'}
                </p>
              </div>
            </div>
          ) : (
            /* Consented Data View */
            <div className="space-y-5">
              
              {/* Recent Biomarker Measurements Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1E4D45] dark:text-[#57BA8E] flex items-center space-x-1.5">
                    <DoodleIcon name="heartbeat" className="w-3.5 h-3.5" />
                    <span>Recent Biomarker Measures (Last 5 Reports)</span>
                  </h4>
                  <span className="text-[11px] text-[#7E9993] font-mono">
                    {biomarkerSummaries.length} active measures
                  </span>
                </div>

                {biomarkerSummaries.length === 0 ? (
                  <div className="p-3 text-center rounded-[6px] border border-[#E0E7E4] dark:border-[#22312E] bg-[#F4F6F5]/40 dark:bg-[#1C2725]/30 text-xs text-[#7E9993]">
                    No recorded {diseaseName} biomarker values found for this relative.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-[6px] border border-[#E0E7E4] dark:border-[#22312E]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#F4F6F5] dark:bg-[#1C2725] text-[10px] font-semibold uppercase tracking-wider text-[#4E6863] dark:text-[#7E9993] border-b border-[#E0E7E4] dark:border-[#22312E]">
                          <th className="py-2 px-3">Biomarker</th>
                          <th className="py-2 px-3">Observed Value</th>
                          <th className="py-2 px-3">Ref Range</th>
                          <th className="py-2 px-3 text-center">Status</th>
                          <th className="py-2 px-3 text-right">Report Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E0E7E4] dark:divide-[#22312E]">
                        {biomarkerSummaries.map((m, mIdx) => {
                          const isActive = activeBiomarkerKey === m.canonical_key;
                          return (
                            <tr
                              key={m.id || mIdx}
                              onClick={() => onSelectBiomarker && onSelectBiomarker(m)}
                              className={`transition-colors h-10 ${
                                onSelectBiomarker ? 'cursor-pointer' : ''
                              } ${
                                isActive
                                  ? 'bg-[#E5EFEA]/50 dark:bg-[#1A2C28]/60 font-semibold'
                                  : 'hover:bg-[#F4F6F5] dark:hover:bg-[#1C2725]'
                              }`}
                            >
                              <td className="py-2 px-3 font-semibold text-[#13221F] dark:text-[#EFF5F3]">
                                {m.canonical_test_name}
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-[#13221F] dark:text-[#EFF5F3]">
                                {m.value} <span className="font-normal text-[#7E9993] text-[10px]">{m.unit || ''}</span>
                              </td>
                              <td className="py-2 px-3 font-mono text-[11px] text-[#4E6863] dark:text-[#7E9993]">
                                {m.reference_range || 'N/A'}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {getAbnormalityBadge(m.abnormality_flag)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-[11px] text-[#7E9993]">
                                {m.report_date ? new Date(m.report_date).toLocaleDateString() : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Relative's Disease History Timeline */}
              <div className="pt-2 border-t border-[#E0E7E4] dark:border-[#22312E]">
                <DiseaseTimelineView
                  timeline={relative.timeline || []}
                  diseaseName={diseaseName}
                  subjectName={relative.relative_name}
                  canAdd={false}
                />
              </div>

            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default RelativeDiseaseCard;
