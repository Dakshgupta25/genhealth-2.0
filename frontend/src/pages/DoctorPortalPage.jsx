import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDiseaseMappings, getPatientDiseaseSummary, getFamilyBiomarkerHistory } from '../api/clinical';
import { getTestTrend } from '../api/reports';
import DoodleIcon from '../components/common/DoodleIcon';
import TrendChart from '../components/doctor/TrendChart';

export function DoctorPortalPage() {
  const { userId } = useAuth();
  
  // Patient Context ID (defaults to current user, but doctor can input any target patient UUID)
  const [patientId, setPatientId] = useState(userId || '');
  const [patientInput, setPatientInput] = useState(userId || '');
  
  const [diseases, setDiseases] = useState([]);
  const [selectedDiseaseId, setSelectedDiseaseId] = useState('diabetes');
  const [diseaseSummaries, setDiseaseSummaries] = useState([]);
  const [selectedTestName, setSelectedTestName] = useState('Fasting Blood Sugar');
  
  const [trendData, setTrendData] = useState([]);
  const [familyHistory, setFamilyHistory] = useState([]);
  
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [loadingFamily, setLoadingFamily] = useState(false);

  // 1. Fetch Disease list on mount
  useEffect(() => {
    async function loadDiseases() {
      try {
        const list = await getDiseaseMappings();
        setDiseases(list);
        if (list.length > 0) {
          setSelectedDiseaseId((prev) => (list.some((d) => d.id === prev) ? prev : list[0].id));
        }
      } catch (err) {
        console.error('Failed to load disease mappings:', err);
      }
    }
    loadDiseases();
  }, []);


  // 2. Fetch Patient's latest values for selected disease
  const loadDiseasePanel = useCallback(async () => {
    if (!patientId || !selectedDiseaseId) return;
    setLoadingPanel(true);
    try {
      const summary = await getPatientDiseaseSummary(patientId, selectedDiseaseId);
      setDiseaseSummaries(summary);
      
      // Auto-select first test in disease list
      const activeDisease = diseases.find((d) => d.id === selectedDiseaseId);
      if (activeDisease && activeDisease.primary_tests.length > 0) {
        setSelectedTestName(activeDisease.primary_tests[0]);
      }
    } catch (err) {
      console.error('Failed to load patient disease summary:', err);
      setDiseaseSummaries([]);
    } finally {
      setLoadingPanel(false);
    }
  }, [patientId, selectedDiseaseId, diseases]);

  useEffect(() => {
    loadDiseasePanel();
  }, [loadDiseasePanel]);

  // 3. Fetch longitudinal trend & cross-family history when selectedTestName changes
  const loadTestTrendAndFamily = useCallback(async () => {
    if (!patientId || !selectedTestName) return;

    setLoadingTrend(true);
    try {
      const points = await getTestTrend(patientId, selectedTestName);
      setTrendData(points);
    } catch (err) {
      console.error('Failed to load test trend:', err);
      setTrendData([]);
    } finally {
      setLoadingTrend(false);
    }

    setLoadingFamily(true);
    try {
      const famHistory = await getFamilyBiomarkerHistory(patientId, selectedTestName);
      setFamilyHistory(famHistory);
    } catch (err) {
      console.error('Failed to load family history:', err);
      setFamilyHistory([]);
    } finally {
      setLoadingFamily(false);
    }
  }, [patientId, selectedTestName]);

  useEffect(() => {
    loadTestTrendAndFamily();
  }, [loadTestTrendAndFamily]);

  const handlePatientSwitch = (e) => {
    e.preventDefault();
    if (patientInput.trim()) {
      setPatientId(patientInput.trim());
    }
  };

  const activeDisease = diseases.find((d) => d.id === selectedDiseaseId);

  const getAbnormalityBadge = (flag) => {
    switch (flag?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200';
      case 'low':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200';
      case 'normal':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="p-8 rounded-3xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
           style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
               style={{ backgroundColor: 'var(--brand-primary)' }}>
            <DoodleIcon name="doctor" className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Clinical Diagnostic Portal
              </h1>
              <span className="badge-status" style={{ backgroundColor: 'rgba(139,92,246,0.12)', color: '#9F7AEA' }}>
                Doctor Mode
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Evaluate patients by pathology, inspect longitudinal curves, and surface hereditary risk indicators.
            </p>
          </div>
        </div>

        {/* Patient Context ID Selector */}
        <form onSubmit={handlePatientSwitch} className="flex items-center space-x-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="Patient User ID (UUID)"
              value={patientInput}
              onChange={(e) => setPatientInput(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs font-mono border outline-none focus:ring-1"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95 shadow-sm shrink-0"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            Load Patient
          </button>
        </form>
      </div>

      {/* Disease Selection Tabs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Select Clinical Pathology Panel
          </span>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Evaluating Patient ID: <code className="font-mono text-indigo-500">{patientId ? patientId.substring(0, 13) + '...' : 'None'}</code>
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {diseases.map((d) => {
            const isSelected = selectedDiseaseId === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setSelectedDiseaseId(d.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border ${
                  isSelected
                    ? 'shadow-md text-white'
                    : 'hover:opacity-90'
                }`}
                style={{
                  backgroundColor: isSelected ? 'var(--brand-primary)' : 'var(--bg-card)',
                  borderColor: isSelected ? 'var(--brand-primary)' : 'var(--border-card)',
                  color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >
                <DoodleIcon name="stethoscope" className="w-3.5 h-3.5" />
                <span>{d.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Disease Detail Description */}
      {activeDisease && (
        <div className="p-4 rounded-2xl border text-xs flex items-center justify-between"
             style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">Category: {activeDisease.category}</span>
            <span>•</span>
            <span style={{ color: 'var(--text-secondary)' }}>{activeDisease.description}</span>
          </div>
        </div>
      )}

      {/* 2-Column Grid: Disease Test Panel (Left) + Longitudinal Trend & Cross-Family History (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT: Disease Primary Biomarkers List (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Relevant Disease Biomarkers
          </h3>

          <div className="space-y-3">
            {activeDisease?.primary_tests.map((testName) => {
              const summary = diseaseSummaries.find((s) => s.canonical_test_name === testName);
              const isSelected = selectedTestName === testName;

              return (
                <div
                  key={testName}
                  onClick={() => setSelectedTestName(testName)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] flex items-center justify-between space-x-3 shadow-sm ${
                    isSelected ? 'ring-2 ring-indigo-500/50 shadow-indigo-500/10' : ''
                  }`}
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-card)',
                  }}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                        {testName}
                      </h4>
                      {summary && (
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${getAbnormalityBadge(summary.abnormality_flag)}`}>
                          {summary.abnormality_flag}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {summary ? `Latest: ${summary.latest_value} ${summary.unit || ''} (Ref: ${summary.reference_range || 'N/A'})` : 'No report records found for patient'}
                    </p>
                  </div>

                  <span className="text-xs text-indigo-500 font-bold">
                    {isSelected ? '● View' : '→'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Longitudinal Trend Curve & Cross-Family History (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Trend Chart Component */}
          <TrendChart
            title={selectedTestName}
            unit={trendData[0]?.unit || ''}
            dataPoints={trendData}
            loading={loadingTrend}
          />

          {/* Cross-Family Medical History Panel */}
          <div className="p-6 rounded-3xl border shadow-sm space-y-4"
               style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DoodleIcon name="tree" className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold">Cross-Family History for {selectedTestName}</h3>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: 'var(--brand-soft-blue)', color: 'var(--text-accent)' }}>
                {familyHistory.length} relative readings
              </span>
            </div>

            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Surfacing hereditary biomarker readings across the patient's linked family tree network.
            </p>

            {loadingFamily ? (
              <p className="text-xs text-slate-400 py-4 text-center">Checking family records...</p>
            ) : familyHistory.length > 0 ? (
              <div className="divide-y rounded-2xl border overflow-hidden text-xs"
                   style={{ borderColor: 'var(--border-subtle)' }}>
                {familyHistory.map((item, idx) => (
                  <div key={idx} className="p-3.5 flex items-center justify-between"
                       style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold">{item.relative_name}</span>
                        <span className="text-[10px] px-2 py-0.2 rounded-full font-bold uppercase bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {item.relationship_type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Date: {new Date(item.report_date).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="text-right space-y-0.5">
                      <span className="font-bold font-mono text-sm">
                        {item.value} {item.unit || ''}
                      </span>
                      <div>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${getAbnormalityBadge(item.abnormality_flag)}`}>
                          {item.abnormality_flag}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-dashed text-center text-xs space-y-1"
                   style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                <p className="font-bold">No Family Readings Available</p>
                <p className="text-[11px]">
                  When linked relatives upload lab reports containing {selectedTestName}, their values will automatically surface here for cross-generational analysis.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DoctorPortalPage;
