import React, { useState } from 'react';
import DoodleIcon from '../common/DoodleIcon';
import { Card, CardHeader, CardTitle, Badge, Button } from '../ui';

export function DiseaseRiskOverview({
  assessment,
  registry = [],
  isFamilyMode = true,
  onToggleFamilyMode,
  onRefresh,
}) {
  const [expandedDiseaseKey, setExpandedDiseaseKey] = useState(null);

  if (!assessment || !assessment.diseases) {
    return null;
  }

  const diseases = assessment.diseases;
  const diseaseKeys = Object.keys(diseases);

  const toggleExpand = (dKey) => {
    setExpandedDiseaseKey((prev) => (prev === dKey ? null : dKey));
  };

  const formatPercent = (val) =>
    val !== null && val !== undefined ? `${(val * 100).toFixed(1)}%` : 'N/A';

  return (
    <Card
      radius="lg"
      className="bg-white dark:bg-[#1E1E1E] border border-[#CBD6D2] dark:border-[#383838] shadow-xs overflow-hidden"
    >
      {/* 1. Header & Two-Mode Toggle */}
      <CardHeader density="compact" className="border-b border-[#E3E3DF] dark:border-[#303030] pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold tracking-widest text-[#1E4D45] dark:text-[#57BA8E] uppercase">
                Epidemiological &amp; Clinical Synthesis
              </span>
              <span className="text-xs text-[#757575]">•</span>
              <span className="text-[11px] text-[#5F6368] dark:text-[#A0A0A0]">
                Option C Bayesian Floor Architecture
              </span>
            </div>
            <CardTitle density="compact" className="text-lg text-[#171717] dark:text-[#F0F0F0] mt-0.5">
              6-Disease Risk Overview &amp; Heritability Spectrum
            </CardTitle>
          </div>

          {/* Mode Toggle & Refresh */}
          <div className="flex items-center space-x-3 shrink-0">
            {/* Segmented Pill Toggle */}
            <div className="inline-flex p-1 rounded-[8px] bg-[#F4F6F5] dark:bg-[#2A2A2A] border border-[#CBD6D2] dark:border-[#383838] text-xs font-semibold">
              <button
                type="button"
                onClick={() => onToggleFamilyMode && onToggleFamilyMode(false)}
                className={`px-3 py-1.5 rounded-[6px] transition-all cursor-pointer ${
                  !isFamilyMode
                    ? 'bg-white dark:bg-[#1E1E1E] text-[#171717] dark:text-[#F0F0F0] shadow-xs'
                    : 'text-[#757575] dark:text-[#A0A0A0] hover:text-[#171717]'
                }`}
              >
                My Reports Only
              </button>
              <button
                type="button"
                onClick={() => onToggleFamilyMode && onToggleFamilyMode(true)}
                className={`px-3 py-1.5 rounded-[6px] transition-all cursor-pointer flex items-center space-x-1.5 ${
                  isFamilyMode
                    ? 'bg-[#1E4D45] text-white shadow-xs dark:bg-[#336E63]'
                    : 'text-[#757575] dark:text-[#A0A0A0] hover:text-[#171717]'
                }`}
              >
                <span>My Reports + Family Pedigree</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
              </button>
            </div>

            {onRefresh && (
              <Button size="sm" variant="outline" onClick={onRefresh} className="text-xs shrink-0">
                ↻ Refresh
              </Button>
            )}
          </div>
        </div>

        {/* Mode Explanation Subtext */}
        <div className="mt-3 pt-2 border-t border-[#E3E3DF] dark:border-[#303030] text-[11px] text-[#5F6368] dark:text-[#A0A0A0] flex items-center justify-between">
          <span>
            {isFamilyMode
              ? 'Displaying composite predictive risk combining personal lab test severity with disease-specific heritability (h²) and Wright’s kinship pedigree weights.'
              : 'Displaying deterministic clinical threshold scores based solely on your own laboratory test results.'}
          </span>
          <span className="font-mono text-[10px] text-[#757575]">
            Formula: {isFamilyMode ? 'max(Self, Self + (1-Self)*(0.5·h²·Family))' : '1.0 · SelfScore'}
          </span>
        </div>
      </CardHeader>

      {/* 2. Disease Risk Spectrum Cards Grid */}
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 gap-3">
          {diseaseKeys.map((dKey) => {
            const d = diseases[dKey];
            const meta = registry.find((r) => r.disease_key === dKey) || {};
            const isExpanded = expandedDiseaseKey === dKey;

            const isSufficient = d.is_sufficient_data !== false;
            const personalScore = d.rule_based_risk_score ?? 0;
            const familyRisk = d.family_weighted_risk ?? 0;
            const combinedScore = isFamilyMode
              ? (d.heuristic_combined_risk_signal ?? d.combined_risk_signal ?? personalScore)
              : personalScore;
            const geneticBump = isFamilyMode ? (d.formula_breakdown?.genetic_bump ?? 0) : 0;
            const h2 = d.population_heritability_reference ?? meta.heritability_estimate ?? 0.5;

            // Score Tier Coloring
            let tierLabel = 'Low Risk';
            let tierBadgeStatus = 'normal';
            let barColor = 'bg-emerald-600 dark:bg-emerald-500';

            if (!isSufficient) {
              tierLabel = 'Insufficient Data';
              tierBadgeStatus = 'neutral';
              barColor = 'bg-slate-400 dark:bg-slate-600';
            } else if (combinedScore >= 0.66) {
              tierLabel = 'High Risk';
              tierBadgeStatus = 'critical';
              barColor = 'bg-[#B4232F] dark:bg-[#E04855]';
            } else if (combinedScore >= 0.33) {
              tierLabel = 'Moderate Risk';
              tierBadgeStatus = 'warning';
              barColor = 'bg-amber-500 dark:bg-amber-400';
            }

            return (
              <div
                key={dKey}
                className={`p-4 rounded-[8px] border transition-all ${
                  !isSufficient
                    ? 'bg-[#F9FAFA] dark:bg-[#1A1A1A] border-[#E3E3DF] dark:border-[#2C2C2C] opacity-90'
                    : 'bg-white dark:bg-[#222222] border-[#CBD6D2] dark:border-[#383838] hover:border-[#1E4D45]/40'
                }`}
              >
                {/* Disease Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-[#171717] dark:text-[#F0F0F0]">
                      {d.display_name}
                    </span>
                    <span className="text-xs text-[#757575]">•</span>
                    <span className="text-[11px] text-[#5F6368] dark:text-[#A0A0A0]">
                      {d.category}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <Badge status={tierBadgeStatus} size="sm">
                      {tierLabel}
                    </Badge>
                    {isSufficient && (
                      <span className="font-mono font-bold text-sm text-[#171717] dark:text-[#F0F0F0]">
                        {formatPercent(combinedScore)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar Spectrum */}
                <div className="my-2.5 space-y-1">
                  <div className="h-3 w-full bg-[#E9EFEF] dark:bg-[#2A2A2A] rounded-full overflow-hidden flex relative">
                    {!isSufficient ? (
                      /* Striped pattern for Insufficient Data */
                      <div
                        className="h-full w-full bg-slate-300 dark:bg-slate-700/50"
                        style={{
                          backgroundImage:
                            'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.06) 10px, rgba(0,0,0,0.06) 20px)',
                        }}
                      />
                    ) : (
                      <>
                        {/* Base Personal Lab Score */}
                        <div
                          className={`h-full transition-all duration-700 ${barColor}`}
                          style={{ width: `${Math.min(100, (personalScore * 100))}%` }}
                        />
                        {/* Family History Bump (Purple Accent) in Family Mode */}
                        {isFamilyMode && geneticBump > 0 && (
                          <div
                            className="h-full bg-purple-600 dark:bg-purple-500 transition-all duration-700 opacity-90"
                            style={{ width: `${Math.min(100, (geneticBump * 100))}%` }}
                            title={`+${formatPercent(geneticBump)} from Family History`}
                          />
                        )}
                      </>
                    )}
                  </div>

                  {/* Spectrum Baseline Markers */}
                  <div className="flex justify-between text-[9px] font-mono text-[#858585] pt-0.5">
                    <span>0% Optimal</span>
                    <span>33% Moderate</span>
                    <span>66% High</span>
                    <span>100% Critical</span>
                  </div>
                </div>

                {/* Insufficient Data Alert / Missing Biomarkers Chip */}
                {!isSufficient && (
                  <div className="mt-2 p-2.5 rounded-[6px] bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center space-x-1.5 text-amber-900 dark:text-amber-200">
                      <span>⚠️</span>
                      <span className="font-medium">
                        {d.sufficiency_message || 'Missing required primary laboratory test records.'}
                      </span>
                    </div>
                    {d.missing_mandatory_biomarkers?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {d.missing_mandatory_biomarkers.map((bKey, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-[4px] bg-white dark:bg-[#1E1E1E] border border-amber-300 dark:border-amber-800 text-[10px] font-mono font-bold text-amber-800 dark:text-amber-300 uppercase"
                          >
                            + Required: {bKey}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Row & Calculation Breakdown Toggle */}
                <div className="mt-2.5 pt-2 border-t border-[#E3E3DF] dark:border-[#303030] flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3 text-[11px] text-[#5F6368] dark:text-[#A0A0A0]">
                    <span>
                      Heritability Reference: <strong className="font-mono text-[#171717] dark:text-[#F0F0F0]">h² = {h2.toFixed(2)}</strong>
                    </span>
                    {isFamilyMode && isSufficient && geneticBump > 0 && (
                      <span className="inline-flex items-center space-x-1 text-purple-700 dark:text-purple-400 font-semibold">
                        <span>🧬</span>
                        <span>+{formatPercent(geneticBump)} from Pedigree</span>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleExpand(dKey)}
                    className="text-[11px] font-semibold text-[#1E4D45] dark:text-[#57BA8E] hover:underline cursor-pointer flex items-center space-x-1"
                  >
                    <span>{isExpanded ? 'Hide Calculation' : 'How this was calculated'}</span>
                    <span>{isExpanded ? '▲' : '▼'}</span>
                  </button>
                </div>

                {/* 3. EXPANDABLE CALCULATION TRANSPARENCY DRAWER */}
                {isExpanded && (
                  <div className="mt-3 p-4 rounded-[6px] bg-[#F4F6F5] dark:bg-[#1A1A1A] border border-[#CBD6D2] dark:border-[#333333] space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-[#E0E7E4] dark:border-[#2C2C2C] pb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E4D45] dark:text-[#57BA8E]">
                        Transparent Mathematical Breakdown
                      </span>
                      <Badge status="neutral" size="sm">
                        Option C Bayesian Asymmetric Floor
                      </Badge>
                    </div>

                    {/* Plain Language Explanation */}
                    <div className="p-3 rounded-[6px] bg-white dark:bg-[#222222] border border-[#E0E7E4] dark:border-[#2E2E2E] text-xs leading-relaxed text-[#171717] dark:text-[#F0F0F0]">
                      <p className="font-medium text-[#1E4D45] dark:text-[#57BA8E] mb-1">
                        Clinical Calculation Summary:
                      </p>
                      <p>{d.transparent_formula}</p>
                    </div>

                    {/* Step-by-Step Parameter Matrix */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded-[4px] bg-white dark:bg-[#222222] border border-[#E0E7E4] dark:border-[#2E2E2E]">
                        <span className="text-[10px] text-[#757575] uppercase block">Personal Labs (S_self)</span>
                        <strong className="font-mono text-sm text-[#171717] dark:text-[#F0F0F0]">{formatPercent(personalScore)}</strong>
                      </div>
                      <div className="p-2.5 rounded-[4px] bg-white dark:bg-[#222222] border border-[#E0E7E4] dark:border-[#2E2E2E]">
                        <span className="text-[10px] text-[#757575] uppercase block">Family Risk (R_fam)</span>
                        <strong className="font-mono text-sm text-[#171717] dark:text-[#F0F0F0]">{formatPercent(familyRisk)}</strong>
                      </div>
                      <div className="p-2.5 rounded-[4px] bg-white dark:bg-[#222222] border border-[#E0E7E4] dark:border-[#2E2E2E]">
                        <span className="text-[10px] text-[#757575] uppercase block">Heritability (h²)</span>
                        <strong className="font-mono text-sm text-[#171717] dark:text-[#F0F0F0]">{(h2 * 100).toFixed(0)}%</strong>
                      </div>
                      <div className="p-2.5 rounded-[4px] bg-white dark:bg-[#222222] border border-[#E0E7E4] dark:border-[#2E2E2E]">
                        <span className="text-[10px] text-[#757575] uppercase block">Pedigree Bump</span>
                        <strong className="font-mono text-sm text-purple-700 dark:text-purple-400">+{formatPercent(geneticBump)}</strong>
                      </div>
                    </div>

                    {/* Biomarker Mapping Distinction */}
                    <div className="pt-2 border-t border-[#E0E7E4] dark:border-[#2C2C2C] grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                      <div>
                        <span className="font-semibold text-[#171717] dark:text-[#F0F0F0] block mb-1">
                          Diagnostic Rule Biomarkers (Layer 2):
                        </span>
                        <span className="font-mono text-[#5F6368] dark:text-[#A0A0A0]">
                          {d.primary_clinical_biomarkers?.join(', ') || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-[#171717] dark:text-[#F0F0F0] block mb-1">
                          ML Model Input Features (Layer 3):
                        </span>
                        <span className="font-mono text-[#5F6368] dark:text-[#A0A0A0]">
                          {d.ml_feature_biomarkers?.join(', ') || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Gemini Clinical Narrative */}
                    {d.narrative && (
                      <div className="pt-2 border-t border-[#E0E7E4] dark:border-[#2C2C2C] space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E4D45] dark:text-[#57BA8E] flex items-center space-x-1">
                          <DoodleIcon name="sparkles" className="w-3 h-3" />
                          <span>Gemini Clinical Summary &amp; Guidance</span>
                        </span>
                        <p className="text-xs text-[#171717] dark:text-[#F0F0F0] leading-relaxed whitespace-pre-line">
                          {d.narrative}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Persistent Medical Disclaimer Footer */}
      <div className="p-4 bg-[#F4F6F5] dark:bg-[#1A1A1A] border-t border-[#E3E3DF] dark:border-[#303030] text-[11px] text-[#5F6368] dark:text-[#A0A0A0] flex items-start space-x-2">
        <span className="text-sm shrink-0">ℹ️</span>
        <p className="leading-relaxed">
          <strong className="text-[#171717] dark:text-[#F0F0F0]">Responsible Health Communication Notice:</strong>{' '}
          This disease risk assessment represents an estimated statistical likelihood based on uploaded laboratory
          biomarkers and reported genealogical pedigree. It is an informational health assessment, not a formal medical diagnosis.
          Consult a licensed physician for clinical interpretation, confirmatory diagnostic testing, and personalized care planning.
        </p>
      </div>
    </Card>
  );
}

export default DiseaseRiskOverview;
