import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDiseaseMappings, getPatientDiseaseSummary, getFamilyBiomarkerHistory } from '../api/clinical';
import { getTestTrend } from '../api/reports';
import DoodleIcon from '../components/common/DoodleIcon';
import TrendChart from '../components/doctor/TrendChart';
import { Button, Badge, Card, CardHeader, CardTitle, CardDescription, Input, EmptyState } from '../components/ui';

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
  
  const [loadingPanel, setLoadingPanel] = useState(false);
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

  const getAbnormalityMeta = (flag) => {
    switch (flag?.toLowerCase()) {
      case 'high':
        return { status: 'critical', label: 'High' };
      case 'low':
        return { status: 'warning', label: 'Low' };
      case 'normal':
        return { status: 'normal', label: 'Normal' };
      case 'critical':
        return { status: 'critical', label: 'Critical' };
      default:
        return { status: 'neutral', label: flag || 'Review' };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* 1. Header Banner & Patient Context Switcher */}
      <Card radius="xl">
        <div className="p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-900 text-white dark:bg-slate-800 dark:border dark:border-slate-700 shadow-xs">
              <DoodleIcon name="doctor" className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  Clinical Diagnostic Portal
                </h1>
                <Badge status="purple" size="sm">
                  Doctor Mode
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Evaluate patients by pathology, inspect longitudinal biomarker curves, and surface hereditary risks
              </p>
            </div>
          </div>

          {/* Patient Context ID Selector */}
          <form onSubmit={handlePatientSwitch} className="flex items-center space-x-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Input
                type="text"
                mono
                placeholder="Patient UUID"
                value={patientInput}
                onChange={(e) => setPatientInput(e.target.value)}
                className="text-xs"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              leftIcon={<DoodleIcon name="user" className="w-3.5 h-3.5 text-cyan-400" />}
            >
              Load Patient
            </Button>
          </form>
        </div>
      </Card>

      {/* 2. Disease Selection Pathology Tabs */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Clinical Pathology Panels
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Evaluating Patient ID: <code className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{patientId ? `${patientId.substring(0, 13)}...` : 'None'}</code>
          </span>
        </div>

        {/* Pathology Selector Buttons */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {diseases.map((d) => {
            const isSelected = selectedDiseaseId === d.id;
            return (
              <Button
                key={d.id}
                variant={isSelected ? 'teal' : 'outline'}
                size="sm"
                onClick={() => setSelectedDiseaseId(d.id)}
                leftIcon={<DoodleIcon name="stethoscope" className="w-3.5 h-3.5" />}
              >
                {d.name}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Disease Detail Category & Subtitle */}
      {activeDisease && (
        <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="font-bold text-cyan-700 dark:text-cyan-300">
              Category: {activeDisease.category}
            </span>
            <span className="text-slate-400 hidden sm:inline">•</span>
            <span className="text-slate-600 dark:text-slate-400">
              {activeDisease.description}
            </span>
          </div>
        </div>
      )}

      {/* 3. 2-Column Clinical Workbench Grid (5 Cols Biomarkers List, 7 Cols Trend & Cross-Family History) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: Disease Primary Biomarkers List (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Relevant Disease Biomarkers
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {activeDisease?.primary_tests?.length || 0} tests
            </span>
          </div>

          <div className="space-y-2.5">
            {loadingPanel ? (
              <Card radius="md" className="p-6 text-center space-y-2">
                <div className="w-5 h-5 mx-auto rounded-full border-2 border-cyan-400 border-t-cyan-600 animate-spin" />
                <p className="text-xs text-slate-400">Loading pathology markers...</p>
              </Card>
            ) : activeDisease?.primary_tests?.map((testName) => {
              const summary = diseaseSummaries.find((s) => s.canonical_test_name === testName);
              const isSelected = selectedTestName === testName;
              const statusMeta = summary ? getAbnormalityMeta(summary.abnormality_flag) : null;

              return (
                <Card
                  key={testName}
                  radius="md"
                  interactive
                  onClick={() => setSelectedTestName(testName)}
                  className={`p-3.5 transition-all ${
                    isSelected
                      ? 'border-cyan-500/60 ring-1 ring-cyan-500/20 bg-slate-50/70 dark:bg-slate-800/50 shadow-xs'
                      : 'hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate" title={testName}>
                          {testName}
                        </h4>
                        {statusMeta && (
                          <Badge status={statusMeta.status} size="sm">
                            {statusMeta.label}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {summary
                          ? `Latest: ${summary.latest_value} ${summary.unit || ''} (Ref: ${summary.reference_range || 'N/A'})`
                          : 'No recorded values for patient'}
                      </p>
                    </div>

                    <span className={`text-xs font-bold shrink-0 ${isSelected ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'}`}>
                      {isSelected ? '● Active' : '→'}
                    </span>
                  </div>
                </Card>
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

          {/* Cross-Family Medical History Table */}
          <Card radius="lg" className="overflow-hidden shadow-sm space-y-0">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <DoodleIcon name="tree" className="w-3.5 h-3.5" />
                  </div>
                  <CardTitle className="text-sm">
                    Cross-Family History: {selectedTestName}
                  </CardTitle>
                </div>
                <Badge status="info" size="sm">
                  {familyHistory.length} {familyHistory.length === 1 ? 'record' : 'records'}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Surfacing hereditary biomarker readings across the patient's linked genealogical network
              </CardDescription>
            </CardHeader>

            {loadingFamily ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-5 h-5 mx-auto rounded-full border-2 border-cyan-400 border-t-cyan-600 animate-spin" />
                <p className="text-xs text-slate-400">Scanning family records...</p>
              </div>
            ) : familyHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/90 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="py-2.5 px-3.5 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.06)] min-w-[150px]">
                        Relative &amp; Kinship
                      </th>
                      <th className="py-2.5 px-3.5 min-w-[110px]">Report Date</th>
                      <th className="py-2.5 px-3.5 min-w-[110px]">Observed Value</th>
                      <th className="py-2.5 px-3.5 text-center min-w-[90px]">Status Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {familyHistory.map((item, idx) => {
                      const statusMeta = getAbnormalityMeta(item.abnormality_flag);
                      return (
                        <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors h-11">
                          <td className="py-2.5 px-3.5 sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.06)]">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                {item.relative_name}
                              </span>
                              <Badge status="neutral" size="sm">
                                {item.relationship_type}
                              </Badge>
                            </div>
                          </td>

                          <td className="py-2.5 px-3.5 font-mono text-slate-500 dark:text-slate-400 text-xs">
                            {new Date(item.report_date).toLocaleDateString()}
                          </td>

                          <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                            {item.value} <span className="font-normal text-slate-500 text-[11px]">{item.unit || ''}</span>
                          </td>

                          <td className="py-2.5 px-3.5 text-center">
                            <Badge status={statusMeta.status} size="sm">
                              {statusMeta.label}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6">
                <EmptyState
                  icon={<DoodleIcon name="dna" className="w-5 h-5" />}
                  title="No Family Readings Available"
                  description={`When linked relatives ingest lab reports containing ${selectedTestName}, their values will automatically surface here for cross-generational risk evaluation.`}
                />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DoctorPortalPage;
