import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getPatientHereditaryAssessment, getHereditaryDiseaseRegistry } from '../../api/hereditary';
import DoodleIcon from '../common/DoodleIcon';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '../ui';
import HealthScoreWidget from './HealthScoreWidget';
import DiseaseRiskOverview from './DiseaseRiskOverview';

export function HereditaryRiskPanel({ userId }) {
  const [registry, setRegistry] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [selectedDiseaseKey, setSelectedDiseaseKey] = useState('type_2_diabetes');
  const [isFamilyMode, setIsFamilyMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'signals' | 'data_quality' | 'narrative'

  // Load disease registry
  useEffect(() => {
    async function loadRegistry() {
      try {
        const list = await getHereditaryDiseaseRegistry();
        setRegistry(list);
        if (list.length > 0) {
          setSelectedDiseaseKey(list[0].disease_key);
        }
      } catch (err) {
        console.error('Failed to load hereditary disease registry:', err);
      }
    }
    loadRegistry();
  }, []);

  // Fetch assessment for current user ID
  const fetchAssessment = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getPatientHereditaryAssessment(userId);
      setAssessment(data);
    } catch (err) {
      console.error('Failed to load hereditary assessment:', err);
      setError('Could not compute hereditary risk assessment for this patient.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAssessment();
  }, [fetchAssessment]);

  // Sort compact disease summary cards: computed risk descending, with insufficient-data cards at the bottom
  const sortedDiseases = useMemo(() => {
    if (!registry || registry.length === 0 || !assessment?.diseases) return registry;

    return [...registry].sort((a, b) => {
      const aRes = assessment.diseases[a.disease_key];
      const bRes = assessment.diseases[b.disease_key];

      const aSufficient = aRes?.is_sufficient_data !== false;
      const bSufficient = bRes?.is_sufficient_data !== false;

      // Group incomplete/insufficient data cards at the bottom
      if (aSufficient && !bSufficient) return -1;
      if (!aSufficient && bSufficient) return 1;

      // If both have sufficient data, sort by score descending
      const aScore = isFamilyMode
        ? (aRes?.heuristic_combined_risk_signal ?? aRes?.combined_risk_signal ?? aRes?.rule_based_risk_score ?? 0)
        : (aRes?.rule_based_risk_score ?? 0);

      const bScore = isFamilyMode
        ? (bRes?.heuristic_combined_risk_signal ?? bRes?.combined_risk_signal ?? bRes?.rule_based_risk_score ?? 0)
        : (bRes?.rule_based_risk_score ?? 0);

      return bScore - aScore;
    });
  }, [registry, assessment, isFamilyMode]);

  // Default selection to highest-risk condition upon assessment load
  useEffect(() => {
    if (sortedDiseases.length > 0) {
      if (!selectedDiseaseKey || !sortedDiseases.some((d) => d.disease_key === selectedDiseaseKey)) {
        setSelectedDiseaseKey(sortedDiseases[0].disease_key);
      }
    }
  }, [sortedDiseases, selectedDiseaseKey]);

  if (loading) {
    return (
      <Card radius="lg" className="p-8 text-center bg-white dark:bg-[#1E1E1E] border border-[#CBD6D2] dark:border-[#383838]">
        <div className="w-6 h-6 mx-auto rounded-full border-2 border-[#1E4D45] dark:border-[#57BA8E] border-t-transparent animate-spin mb-3" />
        <p className="text-xs font-semibold text-[#171717] dark:text-[#F0F0F0]">
          Running 4-Layer Hereditary Risk &amp; Composite Health Engine...
        </p>
        <p className="text-[11px] text-[#5F6368] dark:text-[#A0A0A0] mt-1">
          Normalizing biomarkers, evaluating kinship weights, executing Option C Bayesian asymmetric floor models, and compiling clinical narratives.
        </p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card radius="lg" className="p-6 bg-[#FDF0F0] dark:bg-[#2D1616] border border-[#F6C4C5] dark:border-[#5B292A]">
        <div className="flex items-center space-x-2 text-[#942728] dark:text-[#E57373] text-xs font-bold mb-2">
          <span>⚠️</span>
          <span>Hereditary Risk Engine Assessment Error</span>
        </div>
        <p className="text-xs text-[#942728] dark:text-[#E57373]">{error}</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={fetchAssessment}>
          Retry Evaluation
        </Button>
      </Card>
    );
  }

  if (!assessment || !assessment.diseases) {
    return null;
  }

  const selectedDiseaseRes = assessment.diseases[selectedDiseaseKey];
  const diseaseMeta = registry.find((d) => d.disease_key === selectedDiseaseKey);

  const formatPercent = (val) => (val !== null && val !== undefined ? `${(val * 100).toFixed(1)}%` : 'N/A');

  return (
    <div className="space-y-6">
      {/* 1. TOP SECTION: HEALTH SCORE RING & HIGHLIGHTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left 1-Column: Radial Health Score Widget */}
        <div className="md:col-span-1">
          <HealthScoreWidget
            assessment={assessment}
            diseasesList={registry}
            isFamilyMode={isFamilyMode}
          />
        </div>

        {/* Right 2-Columns: Quick Disease Status Summary Cards (Risk Sorted) */}
        <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {sortedDiseases.map((d) => {
            const dRes = assessment.diseases[d.disease_key];
            const isSufficient = dRes?.is_sufficient_data !== false;
            const scoreVal = isFamilyMode
              ? (dRes?.heuristic_combined_risk_signal ?? dRes?.combined_risk_signal ?? dRes?.rule_based_risk_score ?? 0)
              : (dRes?.rule_based_risk_score ?? 0);

            const isSelected = selectedDiseaseKey === d.disease_key;

            const isPedigreeOnly = dRes?.data_sufficiency_status === 'FAMILY_PEDIGREE_ONLY';
            let statusColor = 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60';
            let label = 'Low Risk';

            if (!isSufficient) {
              statusColor = 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800';
              label = 'Incomplete';
            } else if (scoreVal >= 0.66) {
              statusColor = 'text-[#B4232F] dark:text-[#E04855] bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60';
              label = 'High Risk';
            } else if (scoreVal >= 0.33) {
              statusColor = 'text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60';
              label = 'Moderate';
            } else if (isPedigreeOnly && scoreVal > 0) {
              statusColor = 'text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60';
              label = 'Pedigree Risk';
            }

            return (
              <div
                key={d.disease_key}
                onClick={() => {
                  setSelectedDiseaseKey(d.disease_key);
                  const el = document.getElementById('single-disease-risk-analysis');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }
                }}
                className={`p-3.5 rounded-[8px] border transition-all cursor-pointer hover:shadow-xs flex flex-col justify-between ${statusColor} ${
                  isSelected
                    ? 'ring-2 ring-[#1E4D45] dark:ring-[#57BA8E] shadow-sm'
                    : 'hover:border-[#1E4D45]/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider truncate">
                    {d.display_name}
                  </span>
                  {dRes?.rule_ml_disagreement && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Rule-ML Disagreement" />
                  )}
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-lg font-bold font-mono">
                    {isSufficient ? formatPercent(scoreVal) : '—'}
                  </span>
                  <span className="text-[10px] font-semibold">{label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. MAIN SECTION: SINGLE-DISEASE RISK OVERVIEW & SEARCH */}
      <DiseaseRiskOverview
        assessment={assessment}
        registry={registry}
        sortedDiseases={sortedDiseases}
        selectedDiseaseKey={selectedDiseaseKey}
        onSelectDiseaseKey={(key) => setSelectedDiseaseKey(key)}
        isFamilyMode={isFamilyMode}
        onToggleFamilyMode={(mode) => setIsFamilyMode(mode)}
        onRefresh={fetchAssessment}
      />

      {/* 3. DEEP-DIVE CLINICAL & ML SIGNALS PANEL */}
      <Card radius="lg" className="overflow-hidden bg-white dark:bg-[#1E1E1E] border border-[#CBD6D2] dark:border-[#383838] shadow-xs">
        <CardHeader density="compact" className="border-b border-[#E3E3DF] dark:border-[#303030] pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-[#1E4D45] dark:text-[#57BA8E] uppercase">
                Diagnostic Deep Dive &amp; ML Provenance
              </span>
              <CardTitle density="compact" className="text-base text-[#171717] dark:text-[#F0F0F0] mt-0.5">
                Detailed Diagnostic Breakdown for {diseaseMeta?.display_name || 'Selected Condition'}
              </CardTitle>
            </div>

            {/* Disease Selector Pill Bar */}
            <div className="flex flex-wrap gap-1">
              {sortedDiseases.map((d) => {
                const isSelected = selectedDiseaseKey === d.disease_key;
                return (
                  <button
                    key={d.disease_key}
                    type="button"
                    onClick={() => setSelectedDiseaseKey(d.disease_key)}
                    className={`px-2.5 py-1 rounded-[6px] text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1E4D45] text-white shadow-xs dark:bg-[#336E63]'
                        : 'text-[#5F6368] dark:text-[#A0A0A0] hover:text-[#171717] hover:bg-[#F4F6F5] dark:hover:bg-[#2A2A2A]'
                    }`}
                  >
                    {d.display_name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center space-x-4 pt-3 border-t border-[#E3E3DF] dark:border-[#303030] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('signals')}
              className={`pb-1 transition-colors cursor-pointer ${
                activeTab === 'signals' || activeTab === 'overview'
                  ? 'text-[#1E4D45] dark:text-[#57BA8E] border-b-2 border-[#1E4D45] dark:border-[#57BA8E]'
                  : 'text-[#757575] hover:text-[#171717]'
              }`}
            >
              Segregated Risk Signals
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('data_quality')}
              className={`pb-1 transition-colors cursor-pointer ${
                activeTab === 'data_quality'
                  ? 'text-[#1E4D45] dark:text-[#57BA8E] border-b-2 border-[#1E4D45] dark:border-[#57BA8E]'
                  : 'text-[#757575] hover:text-[#171717]'
              }`}
            >
              Feature Provenance &amp; Imputation ({selectedDiseaseRes?.observed_features?.length || 0} observed)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('narrative')}
              className={`pb-1 transition-colors cursor-pointer ${
                activeTab === 'narrative'
                  ? 'text-[#1E4D45] dark:text-[#57BA8E] border-b-2 border-[#1E4D45] dark:border-[#57BA8E]'
                  : 'text-[#757575] hover:text-[#171717]'
              }`}
            >
              Clinical Narrative &amp; Action Plan
            </button>
          </div>
        </CardHeader>

        <CardContent density="compact" className="p-5 space-y-4">
          {/* Disagreement Warning */}
          {selectedDiseaseRes?.rule_ml_disagreement && (
            <div className="p-3.5 rounded-[8px] bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs space-y-1">
              <div className="flex items-center space-x-2 font-bold uppercase tracking-wider text-[11px]">
                <span>⚠️</span>
                <span>Explicit Rule-ML Disagreement Detected</span>
              </div>
              <p className="leading-relaxed">
                {selectedDiseaseRes.disagreement_explanation ||
                  'Clinical rule-based risk score and ML statistical probability estimate diverge significantly. Signals are shown independently without arbitrary blending.'}
              </p>
            </div>
          )}

          {/* TAB 1: SEGREGATED SIGNALS */}
          {(activeTab === 'signals' || activeTab === 'overview') && selectedDiseaseRes && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Clinical Rule */}
                <div className="p-4 rounded-[8px] border border-[#CBD6D2] dark:border-[#383838] bg-[#F4F6F5] dark:bg-[#252525] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F6368] dark:text-[#A0A0A0]">
                      Personal Lab Rule Score
                    </span>
                    <Badge status={selectedDiseaseRes.rule_based_risk_score > 0.6 ? 'critical' : selectedDiseaseRes.rule_based_risk_score > 0.3 ? 'warning' : 'normal'} size="sm">
                      Score: {selectedDiseaseRes.rule_based_risk_score?.toFixed(2)}
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold font-mono text-[#171717] dark:text-[#F0F0F0]">
                    {formatPercent(selectedDiseaseRes.rule_based_risk_score)}
                  </div>
                  <p className="text-[11px] text-[#5F6368] dark:text-[#A0A0A0] leading-normal">
                    Evaluated from {diseaseMeta?.clinical_guideline || 'clinical guidelines'}.
                  </p>
                </div>

                {/* Family Kinship */}
                <div className="p-4 rounded-[8px] border border-[#CBD6D2] dark:border-[#383838] bg-[#F4F6F5] dark:bg-[#252525] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F6368] dark:text-[#A0A0A0]">
                      Family Pedigree Risk
                    </span>
                    <Badge status="neutral" size="sm">
                      Kinship Risk: {selectedDiseaseRes.family_weighted_risk?.toFixed(2)}
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold font-mono text-[#171717] dark:text-[#F0F0F0]">
                    {formatPercent(selectedDiseaseRes.family_weighted_risk)}
                  </div>
                  <p className="text-[11px] text-[#5F6368] dark:text-[#A0A0A0] leading-normal">
                    Calculated with Wright’s coefficient across {selectedDiseaseRes.family_breakdown?.length || 0} linked relatives.
                  </p>
                </div>

                {/* ML XGBoost Model */}
                <div className="p-4 rounded-[8px] border border-[#CBD6D2] dark:border-[#383838] bg-[#F4F6F5] dark:bg-[#252525] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F6368] dark:text-[#A0A0A0]">
                      ML Probability Estimate
                    </span>
                    <Badge status={selectedDiseaseRes.ml_is_calibrated ? 'normal' : 'neutral'} size="sm">
                      {selectedDiseaseRes.ml_is_calibrated ? 'Calibrated' : 'Estimate'}
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold font-mono text-[#171717] dark:text-[#F0F0F0]">
                    {formatPercent(selectedDiseaseRes.ml_probability_estimate)}
                  </div>
                  <p className="text-[11px] text-[#5F6368] dark:text-[#A0A0A0] leading-normal">
                    Independent XGBoost statistical pattern estimator.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROVENANCE */}
          {activeTab === 'data_quality' && selectedDiseaseRes && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-[8px] border border-[#CBD6D2] dark:border-[#383838] bg-white dark:bg-[#222222] space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#E3E3DF] dark:border-[#303030]">
                  <h4 className="text-xs font-bold text-[#171717] dark:text-[#F0F0F0]">
                    Directly Observed Features ({selectedDiseaseRes.observed_features?.length || 0})
                  </h4>
                  <Badge status="normal" size="sm">Laboratory Verified</Badge>
                </div>
                {selectedDiseaseRes.observed_features?.length > 0 ? (
                  <ul className="divide-y divide-[#E3E3DF] dark:divide-[#303030] text-xs">
                    {selectedDiseaseRes.observed_features.map((feat) => (
                      <li key={feat} className="py-1.5 font-mono text-[#171717] dark:text-[#F0F0F0] flex items-center justify-between">
                        <span>{feat}</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans">Observed</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#757575] py-3">No direct laboratory measurements recorded for this disease model.</p>
                )}
              </div>

              <div className="p-4 rounded-[8px] border border-[#CBD6D2] dark:border-[#383838] bg-white dark:bg-[#222222] space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#E3E3DF] dark:border-[#303030]">
                  <h4 className="text-xs font-bold text-[#171717] dark:text-[#F0F0F0]">
                    Imputed Features ({selectedDiseaseRes.imputed_features?.length || 0})
                  </h4>
                  <Badge status="neutral" size="sm">Population Median</Badge>
                </div>
                {selectedDiseaseRes.imputed_features?.length > 0 ? (
                  <ul className="divide-y divide-[#E3E3DF] dark:divide-[#303030] text-xs">
                    {selectedDiseaseRes.imputed_features.map((feat) => (
                      <li key={feat} className="py-1.5 font-mono text-[#757575] flex items-center justify-between">
                        <span>{feat}</span>
                        <span className="text-[10px] text-[#757575] font-sans">Population Median</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#757575] py-3">All required feature biomarkers were directly observed!</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: NARRATIVE */}
          {activeTab === 'narrative' && selectedDiseaseRes && (
            <div className="p-4 rounded-[8px] border border-[#CBD6D2] dark:border-[#383838] bg-[#F4F6F5] dark:bg-[#222222] space-y-3">
              <h4 className="text-xs font-bold text-[#171717] dark:text-[#F0F0F0] uppercase tracking-wider flex items-center space-x-1.5">
                <DoodleIcon name="sparkles" className="w-3.5 h-3.5 text-[#1E4D45] dark:text-[#57BA8E]" />
                <span>Gemini Clinical Summary &amp; Patient Guidance</span>
              </h4>
              <div className="text-xs text-[#171717] dark:text-[#F0F0F0] leading-relaxed whitespace-pre-line font-sans">
                {selectedDiseaseRes.narrative || selectedDiseaseRes.clinical_narrative || 'No clinical narrative available.'}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default HereditaryRiskPanel;
