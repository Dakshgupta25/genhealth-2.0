import React, { useState, useMemo } from 'react';
import DoodleIcon from '../common/DoodleIcon';
import { Card, CardHeader, CardTitle, Badge, Button } from '../ui';

export function DiseaseRiskOverview({
  assessment,
  registry = [],
  sortedDiseases = [],
  selectedDiseaseKey,
  onSelectDiseaseKey,
  isFamilyMode = true,
  onToggleFamilyMode,
  onRefresh,
}) {
  const [expandedDiseaseKey, setExpandedDiseaseKey] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  if (!assessment || !assessment.diseases) {
    return null;
  }

  const diseases = assessment.diseases;
  const activeList = sortedDiseases.length > 0 ? sortedDiseases : registry;

  // Active selected disease object
  const effectiveKey =
    selectedDiseaseKey && diseases[selectedDiseaseKey]
      ? selectedDiseaseKey
      : activeList[0]?.disease_key || 'type_2_diabetes';

  const d = diseases[effectiveKey] || {};
  const meta = registry.find((r) => r.disease_key === effectiveKey) || {};
  const isExpanded = expandedDiseaseKey === effectiveKey;

  const toggleExpand = (dKey) => {
    setExpandedDiseaseKey((prev) => (prev === dKey ? null : dKey));
  };

  const formatPercent = (val) =>
    val !== null && val !== undefined ? `${(val * 100).toFixed(1)}%` : 'N/A';

  // Filter diseases based on search query (matches disease name, category, or biomarker keywords)
  const filteredDiseases = useMemo(() => {
    if (!searchQuery.trim()) return activeList;
    const q = searchQuery.toLowerCase().trim();
    return activeList.filter((item) => {
      const dRes = diseases[item.disease_key] || {};
      const nameMatch = item.display_name?.toLowerCase().includes(q);
      const catMatch = item.category?.toLowerCase().includes(q);
      const markerMatch =
        item.primary_biomarkers?.some((b) => b.toLowerCase().includes(q)) ||
        dRes.primary_clinical_biomarkers?.some((b) => b.toLowerCase().includes(q)) ||
        dRes.observed_features?.some((b) => b.toLowerCase().includes(q));
      return nameMatch || catMatch || markerMatch;
    });
  }, [searchQuery, activeList, diseases]);

  // Derived metrics for the selected condition
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
    <Card
      id="single-disease-risk-analysis"
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
              Condition Risk Analysis &amp; Heritability Spectrum
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
        <div className="mt-3 pt-2 border-t border-[#E3E3DF] dark:border-[#303030] text-[11px] text-[#5F6368] dark:text-[#A0A0A0] flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span>
            {isFamilyMode
              ? 'Displaying composite predictive risk combining personal lab test severity with disease-specific heritability (h²) and Wright’s kinship pedigree weights.'
              : 'Displaying deterministic clinical threshold scores based solely on your own laboratory test results.'}
          </span>
          <span className="font-mono text-[10px] text-[#757575] shrink-0">
            Formula: {isFamilyMode ? 'max(Self, Self + (1-Self)*(0.5·h²·Family))' : '1.0 · SelfScore'}
          </span>
        </div>
      </CardHeader>

      {/* 2. Interactive Condition Search / Selector Bar */}
      <div className="px-5 pt-5 pb-2 space-y-3">
        <div className="relative">
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-[#757575] pointer-events-none">
              <DoodleIcon name="search" className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search a condition to view its risk analysis (e.g., Diabetes, Kidney, Thyroid, Cholesterol)..."
              className="w-full pl-10 pr-10 py-2.5 rounded-[8px] border border-[#CBD6D2] dark:border-[#383838] bg-[#F7F9F8] dark:bg-[#252525] text-xs text-[#171717] dark:text-[#F0F0F0] placeholder-[#858585] focus:outline-none focus:ring-2 focus:ring-[#1E4D45] dark:focus:ring-[#57BA8E] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="absolute right-3 text-xs text-[#858585] hover:text-[#171717] cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Autocomplete Dropdown */}
          {isSearchOpen && searchQuery.trim() && (
            <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white dark:bg-[#1E1E1E] border border-[#CBD6D2] dark:border-[#383838] rounded-[8px] shadow-lg overflow-hidden divide-y divide-[#E3E3DF] dark:divide-[#303030]">
              {filteredDiseases.length > 0 ? (
                filteredDiseases.map((item) => {
                  const dItem = diseases[item.disease_key];
                  const itemScore = isFamilyMode
                    ? (dItem?.heuristic_combined_risk_signal ?? dItem?.combined_risk_signal ?? dItem?.rule_based_risk_score ?? 0)
                    : (dItem?.rule_based_risk_score ?? 0);
                  const isItemSufficient = dItem?.is_sufficient_data !== false;

                  return (
                    <div
                      key={item.disease_key}
                      onClick={() => {
                        onSelectDiseaseKey && onSelectDiseaseKey(item.disease_key);
                        setSearchQuery('');
                        setIsSearchOpen(false);
                      }}
                      className="px-4 py-2.5 hover:bg-[#F4F6F5] dark:hover:bg-[#2A2A2A] cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="text-xs font-bold text-[#171717] dark:text-[#F0F0F0]">
                          {item.display_name}
                        </div>
                        <div className="text-[10px] text-[#5F6368] dark:text-[#A0A0A0]">
                          {item.category}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-[#171717] dark:text-[#F0F0F0]">
                          {isItemSufficient ? formatPercent(itemScore) : '—'}
                        </span>
                        <span className="block text-[9px] text-[#757575]">
                          {isItemSufficient ? 'Computed' : 'Incomplete'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-3 text-xs text-[#858585] text-center">
                  No matching clinical conditions found for "{searchQuery}".
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick-Select Condition Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#757575] shrink-0 mr-1">
            Conditions:
          </span>
          {activeList.map((item) => {
            const isSelected = effectiveKey === item.disease_key;
            const dItem = diseases[item.disease_key];
            const isItemSufficient = dItem?.is_sufficient_data !== false;
            const itemScore = isFamilyMode
              ? (dItem?.heuristic_combined_risk_signal ?? dItem?.combined_risk_signal ?? dItem?.rule_based_risk_score ?? 0)
              : (dItem?.rule_based_risk_score ?? 0);

            return (
              <button
                key={item.disease_key}
                type="button"
                onClick={() => onSelectDiseaseKey && onSelectDiseaseKey(item.disease_key)}
                className={`px-3 py-1 rounded-[6px] text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-[#1E4D45] text-white shadow-xs dark:bg-[#336E63]'
                    : 'bg-[#F4F6F5] dark:bg-[#252525] text-[#5F6368] dark:text-[#A0A0A0] hover:text-[#171717] hover:bg-[#EBEFEF] dark:hover:bg-[#303030]'
                }`}
              >
                <span>{item.display_name}</span>
                {isItemSufficient && (
                  <span className={`text-[10px] font-mono ${isSelected ? 'text-emerald-200' : 'text-[#757575]'}`}>
                    ({formatPercent(itemScore)})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Selected Single Disease Detail Card */}
      <div className="p-5 pt-3 space-y-4">
        <div
          className={`p-5 rounded-[8px] border transition-all ${
            !isSufficient
              ? 'bg-[#F9FAFA] dark:bg-[#1A1A1A] border-[#E3E3DF] dark:border-[#2C2C2C]'
              : 'bg-white dark:bg-[#222222] border-[#CBD6D2] dark:border-[#383838]'
          }`}
        >
          {/* Disease Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base text-[#171717] dark:text-[#F0F0F0]">
                {d.display_name || meta.display_name}
              </span>
              <span className="text-xs text-[#757575]">•</span>
              <span className="text-xs text-[#5F6368] dark:text-[#A0A0A0]">
                {d.category || meta.category}
              </span>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <Badge status={tierBadgeStatus} size="sm">
                {tierLabel}
              </Badge>
              {isSufficient && (
                <span className="font-mono font-bold text-base text-[#171717] dark:text-[#F0F0F0]">
                  {formatPercent(combinedScore)}
                </span>
              )}
            </div>
          </div>

          {/* Progress Bar Spectrum */}
          <div className="my-3 space-y-1.5">
            <div className="h-3.5 w-full bg-[#E9EFEF] dark:bg-[#2A2A2A] rounded-full overflow-hidden flex relative">
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
                    style={{ width: `${Math.min(100, personalScore * 100)}%` }}
                  />
                  {/* Family History Bump (Purple Accent) in Family Mode */}
                  {isFamilyMode && geneticBump > 0 && (
                    <div
                      className="h-full bg-purple-600 dark:bg-purple-500 transition-all duration-700 opacity-90"
                      style={{ width: `${Math.min(100, geneticBump * 100)}%` }}
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
            <div className="mt-3 p-3 rounded-[6px] bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
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
          <div className="mt-3 pt-2.5 border-t border-[#E3E3DF] dark:border-[#303030] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-3 text-[11px] text-[#5F6368] dark:text-[#A0A0A0]">
              <span>
                Heritability Reference:{' '}
                <strong className="font-mono text-[#171717] dark:text-[#F0F0F0]">
                  h² = {h2.toFixed(2)}
                </strong>
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
              onClick={() => toggleExpand(effectiveKey)}
              className="text-[11px] font-semibold text-[#1E4D45] dark:text-[#57BA8E] hover:underline cursor-pointer flex items-center space-x-1 self-start sm:self-auto"
            >
              <span>{isExpanded ? 'Hide Calculation' : 'How this was calculated'}</span>
              <span>{isExpanded ? '▲' : '▼'}</span>
            </button>
          </div>

          {/* 4. EXPANDABLE CALCULATION TRANSPARENCY DRAWER */}
          {isExpanded && (
            <div className="mt-4 p-4 rounded-[6px] bg-[#F4F6F5] dark:bg-[#1A1A1A] border border-[#CBD6D2] dark:border-[#333333] space-y-3 animate-in fade-in duration-200">
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
                  <strong className="font-mono text-sm text-[#171717] dark:text-[#F0F0F0]">
                    {formatPercent(personalScore)}
                  </strong>
                </div>
                <div className="p-2.5 rounded-[4px] bg-white dark:bg-[#222222] border border-[#E0E7E4] dark:border-[#2E2E2E]">
                  <span className="text-[10px] text-[#757575] uppercase block">Family Risk (R_fam)</span>
                  <strong className="font-mono text-sm text-[#171717] dark:text-[#F0F0F0]">
                    {formatPercent(familyRisk)}
                  </strong>
                </div>
                <div className="p-2.5 rounded-[4px] bg-white dark:bg-[#222222] border border-[#E0E7E4] dark:border-[#2E2E2E]">
                  <span className="text-[10px] text-[#757575] uppercase block">Heritability (h²)</span>
                  <strong className="font-mono text-sm text-[#171717] dark:text-[#F0F0F0]">
                    {(h2 * 100).toFixed(0)}%
                  </strong>
                </div>
                <div className="p-2.5 rounded-[4px] bg-white dark:bg-[#222222] border border-[#E0E7E4] dark:border-[#2E2E2E]">
                  <span className="text-[10px] text-[#757575] uppercase block">Pedigree Bump</span>
                  <strong className="font-mono text-sm text-purple-700 dark:text-purple-400">
                    +{formatPercent(geneticBump)}
                  </strong>
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
      </div>

      {/* 5. Persistent Medical Disclaimer Footer */}
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
