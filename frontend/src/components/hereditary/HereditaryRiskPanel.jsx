import React, { useState, useEffect, useCallback } from 'react';
import { getPatientHereditaryAssessment, getHereditaryDiseaseRegistry } from '../../api/hereditary';
import DoodleIcon from '../common/DoodleIcon';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from '../ui';

export function HereditaryRiskPanel({ userId }) {
  const [registry, setRegistry] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [selectedDiseaseKey, setSelectedDiseaseKey] = useState('type_2_diabetes');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('signals'); // 'signals' | 'data_quality' | 'narrative'

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

  if (loading) {
    return (
      <Card radius="lg" className="p-8 text-center bg-white dark:bg-[#151E1C] border border-[#CBD6D2] dark:border-[#2F433E]">
        <div className="w-6 h-6 mx-auto rounded-full border-2 border-[#1E4D45] dark:border-[#57BA8E] border-t-transparent animate-spin mb-3" />
        <p className="text-xs font-semibold text-[#13221F] dark:text-[#EFF5F3]">
          Running 4-Layer Hereditary Risk Engine...
        </p>
        <p className="text-[11px] text-[#7E9993] mt-1">
          Normalizing biomarkers, evaluating kinship weights, running calibrated XGBoost models, and compiling clinical narratives.
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
    <Card radius="lg" className="overflow-hidden bg-white dark:bg-[#151E1C] border border-[#CBD6D2] dark:border-[#2F433E] shadow-sm">
      
      {/* 1. Header & Target Disease Selector Tabs */}
      <CardHeader density="compact" className="border-b border-[#E0E7E4] dark:border-[#22312E] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold tracking-widest text-[#1E4D45] dark:text-[#57BA8E] uppercase">
                4-Layer Integrated Risk Engine
              </span>
              <span className="text-xs text-[#7E9993]">•</span>
              <Badge status="neutral" size="sm">
                Engine v1.0 Frozen
              </Badge>
            </div>
            <CardTitle density="compact" className="text-lg text-[#13221F] dark:text-[#EFF5F3] mt-0.5">
              Hereditary &amp; Biomarker Disease Risk Assessment
            </CardTitle>
          </div>

          <Button size="sm" variant="outline" onClick={fetchAssessment} className="text-xs shrink-0">
            ↻ Refresh Risk Evaluation
          </Button>
        </div>

        {/* Disease Tabs */}
        <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-[#E0E7E4] dark:border-[#22312E]">
          {registry.map((d) => {
            const isSelected = selectedDiseaseKey === d.disease_key;
            const dRes = assessment.diseases[d.disease_key];
            const hasDisagreement = dRes?.rule_ml_disagreement;

            return (
              <button
                key={d.disease_key}
                type="button"
                onClick={() => setSelectedDiseaseKey(d.disease_key)}
                className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-[#1E4D45] text-white shadow-xs dark:bg-[#336E63]'
                    : 'text-[#4E6863] dark:text-[#7E9993] hover:text-[#13221F] dark:hover:text-[#EFF5F3] hover:bg-[#F4F6F5]'
                }`}
              >
                <span>{d.display_name}</span>
                {hasDisagreement && (
                  <span className="w-2 h-2 rounded-full bg-amber-500" title="Rule-ML Signal Disagreement Detected" />
                )}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent density="compact" className="p-5 space-y-5">
        
        {/* Explicit Rule-ML Disagreement Banner */}
        {selectedDiseaseRes?.rule_ml_disagreement && (
          <div className="p-4 rounded-[8px] bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs space-y-1">
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

        {/* View Mode Sub-tabs */}
        <div className="flex items-center space-x-4 border-b border-[#E0E7E4] dark:border-[#22312E] pb-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('signals')}
            className={`pb-1 transition-colors cursor-pointer ${
              activeTab === 'signals'
                ? 'text-[#1E4D45] dark:text-[#57BA8E] border-b-2 border-[#1E4D45] dark:border-[#57BA8E]'
                : 'text-[#7E9993] hover:text-[#13221F]'
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
                : 'text-[#7E9993] hover:text-[#13221F]'
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
                : 'text-[#7E9993] hover:text-[#13221F]'
            }`}
          >
            Clinical Narrative &amp; Action Plan
          </button>
        </div>

        {/* TAB 1: SEGREGATED RISK SIGNALS GRID */}
        {activeTab === 'signals' && selectedDiseaseRes && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              
              {/* Signal 1: Clinical Rule-Based Risk */}
              <div className="p-4 rounded-[8px] border border-[#CBD6D2] dark:border-[#2F433E] bg-[#F4F6F5] dark:bg-[#1C2725] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#4E6863] dark:text-[#7E9993]">
                    Clinical Rule Signal
                  </span>
                  <Badge status={selectedDiseaseRes.rule_based_risk_score > 0.6 ? 'critical' : selectedDiseaseRes.rule_based_risk_score > 0.3 ? 'warning' : 'normal'} size="sm">
                    Score: {selectedDiseaseRes.rule_based_risk_score?.toFixed(2)}
                  </Badge>
                </div>
                <div className="text-2xl font-bold font-mono text-[#13221F] dark:text-[#EFF5F3]">
                  {formatPercent(selectedDiseaseRes.rule_based_risk_score)}
                </div>
                <p className="text-[11px] text-[#4E6863] dark:text-[#7E9993] leading-normal">
                  Evaluated using canonical clinical thresholds (ADA / ACC / AHA guidelines).
                </p>
              </div>

              {/* Signal 2: Kinship Family Weighted Risk */}
              <div className="p-4 rounded-[8px] border border-[#CBD6D2] dark:border-[#2F433E] bg-[#F4F6F5] dark:bg-[#1C2725] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#4E6863] dark:text-[#7E9993]">
                    Family Kinship Signal
                  </span>
                  <Badge status="neutral" size="sm">
                    Weight: {selectedDiseaseRes.family_weighted_risk?.toFixed(2)}
                  </Badge>
                </div>
                <div className="text-2xl font-bold font-mono text-[#13221F] dark:text-[#EFF5F3]">
                  {formatPercent(selectedDiseaseRes.family_weighted_risk)}
                </div>
                <p className="text-[11px] text-[#4E6863] dark:text-[#7E9993] leading-normal">
                  Weighted pedigree analysis across linked 1st &amp; 2nd degree relatives.
                </p>
              </div>

              {/* Signal 3: ML Disease Probability Estimate */}
              <div className="p-4 rounded-[8px] border border-[#CBD6D2] dark:border-[#2F433E] bg-[#F4F6F5] dark:bg-[#1C2725] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#4E6863] dark:text-[#7E9993]">
                    ML Probability Estimate
                  </span>
                  <Badge status={selectedDiseaseRes.ml_is_calibrated ? 'juniper' : 'neutral'} size="sm">
                    {selectedDiseaseRes.ml_is_calibrated ? `Calibrated (${selectedDiseaseRes.calibration_method})` : 'Uncalibrated Estimate'}
                  </Badge>
                </div>
                <div className="text-2xl font-bold font-mono text-[#13221F] dark:text-[#EFF5F3]">
                  {formatPercent(selectedDiseaseRes.ml_probability_estimate)}
                </div>
                <p className="text-[11px] text-[#4E6863] dark:text-[#7E9993] leading-normal">
                  Trained on UCI clinical benchmarks ({selectedDiseaseRes.model_version || 'v1.0'}).
                </p>
              </div>

            </div>

            {/* Combined Heuristic & Population Reference Banner */}
            <div className="p-4 rounded-[8px] border border-[#1E4D45]/30 dark:border-[#57BA8E]/30 bg-[#E5EFEA]/40 dark:bg-[#1C2725] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold tracking-widest text-[#1E4D45] dark:text-[#57BA8E] uppercase">
                  Heuristic Combined Risk Signal (0.60 Rule + 0.40 Family Kinship)
                </span>
                <div className="text-xl font-bold font-mono text-[#13221F] dark:text-[#EFF5F3]">
                  {formatPercent(selectedDiseaseRes.heuristic_combined_risk_signal)}
                </div>
                <p className="text-xs text-[#4E6863] dark:text-[#7E9993]">
                  Heuristic composite weighting. Not presented as true genetic inheritance probability.
                </p>
              </div>

              <div className="p-3 rounded-[6px] bg-white dark:bg-[#151E1C] border border-[#CBD6D2] dark:border-[#2F433E] text-right space-y-0.5 shrink-0">
                <div className="text-[10px] text-[#7E9993] uppercase font-bold tracking-wider">
                  Population Heritability Reference (h²)
                </div>
                <div className="text-base font-bold font-mono text-[#1E4D45] dark:text-[#57BA8E]">
                  h² = {selectedDiseaseRes.population_heritability_reference || diseaseMeta?.heritability_estimate || '0.40 - 0.70'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FEATURE PROVENANCE & IMPUTATION */}
        {activeTab === 'data_quality' && selectedDiseaseRes && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Observed Features */}
              <div className="p-4 rounded-[8px] border border-[#CBD6D2] dark:border-[#2F433E] bg-white dark:bg-[#151E1C] space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#E0E7E4] dark:border-[#22312E]">
                  <h4 className="text-xs font-bold text-[#13221F] dark:text-[#EFF5F3] flex items-center space-x-1.5">
                    <span>✅</span>
                    <span>Observed Patient Features ({selectedDiseaseRes.observed_features?.length || 0})</span>
                  </h4>
                  <Badge status="juniper" size="sm">Extracted from OCR Labs</Badge>
                </div>

                {selectedDiseaseRes.observed_features?.length > 0 ? (
                  <ul className="divide-y divide-[#E0E7E4] dark:divide-[#22312E] text-xs">
                    {selectedDiseaseRes.observed_features.map((feat) => (
                      <li key={feat} className="py-1.5 font-mono text-[#13221F] dark:text-[#EFF5F3] flex items-center justify-between">
                        <span>{feat}</span>
                        <span className="text-[10px] text-[#57BA8E] font-sans">Observed</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#7E9993] py-3">No direct laboratory measurements recorded for this disease model.</p>
                )}
              </div>

              {/* Imputed Features */}
              <div className="p-4 rounded-[8px] border border-[#CBD6D2] dark:border-[#2F433E] bg-white dark:bg-[#151E1C] space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#E0E7E4] dark:border-[#22312E]">
                  <h4 className="text-xs font-bold text-[#13221F] dark:text-[#EFF5F3] flex items-center space-x-1.5">
                    <span>ℹ️</span>
                    <span>Imputed Features ({selectedDiseaseRes.imputed_features?.length || 0})</span>
                  </h4>
                  <Badge status="neutral" size="sm">Population Median Reference</Badge>
                </div>

                {selectedDiseaseRes.imputed_features?.length > 0 ? (
                  <ul className="divide-y divide-[#E0E7E4] dark:divide-[#22312E] text-xs">
                    {selectedDiseaseRes.imputed_features.map((feat) => (
                      <li key={feat} className="py-1.5 font-mono text-[#7E9993] flex items-center justify-between">
                        <span>{feat}</span>
                        <span className="text-[10px] text-[#7E9993] font-sans">Population Median</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#7E9993] py-3">All required feature biomarkers were directly observed!</p>
                )}
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: NARRATIVE & ACTION PLAN */}
        {activeTab === 'narrative' && selectedDiseaseRes && (
          <div className="space-y-4">
            <div className="p-4 rounded-[8px] border border-[#CBD6D2] dark:border-[#2F433E] bg-[#F4F6F5] dark:bg-[#1C2725] space-y-3">
              <h4 className="text-xs font-bold text-[#13221F] dark:text-[#EFF5F3] uppercase tracking-wider flex items-center space-x-1.5">
                <DoodleIcon name="sparkles" className="w-3.5 h-3.5 text-[#1E4D45] dark:text-[#57BA8E]" />
                <span>Gemini Clinical Summary &amp; Patient Guidance</span>
              </h4>
              
              <div className="text-xs text-[#13221F] dark:text-[#EFF5F3] leading-relaxed whitespace-pre-line font-sans">
                {(typeof selectedDiseaseRes.narrative === 'string' ? selectedDiseaseRes.narrative : null) ||
                 (typeof selectedDiseaseRes.clinical_narrative === 'string' ? selectedDiseaseRes.clinical_narrative : null) ||
                 'No clinical narrative available.'}
              </div>

              {selectedDiseaseRes.action_plan && selectedDiseaseRes.action_plan.length > 0 && (
                <div className="pt-3 border-t border-[#CBD6D2] dark:border-[#2F433E] space-y-2">
                  <span className="text-[11px] font-bold text-[#1E4D45] dark:text-[#57BA8E] uppercase tracking-wider">
                    Recommended Clinical Action Steps:
                  </span>
                  <ul className="list-disc list-inside text-xs text-[#4E6863] dark:text-[#7E9993] space-y-1">
                    {selectedDiseaseRes.action_plan.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}

export default HereditaryRiskPanel;
