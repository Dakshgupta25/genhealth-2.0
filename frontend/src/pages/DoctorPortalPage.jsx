import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDiseaseMappings, getPatientDiseaseSummary, getFamilyBiomarkerHistory } from '../api/clinical';
import { getTestTrend } from '../api/reports';
import DoodleIcon from '../components/common/DoodleIcon';
import TrendChart from '../components/doctor/TrendChart';
import { Button, Badge, Card, CardHeader, CardTitle, CardDescription, Input } from '../components/ui';

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
      
      {/* 1. Header & Patient Context Switcher with Red Headings */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E3E3DF] dark:border-[#303030]">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold tracking-widest text-[#B4232F] dark:text-[#E04855] uppercase">
              Clinical Workspace
            </span>
            <span className="text-[#858585]">•</span>
            <span className="text-xs text-[#5F6368] dark:text-[#A0A0A0]">
              Patient: <code className="font-mono font-semibold text-[#171717] dark:text-[#F0F0F0]">{patientId ? `${patientId.substring(0, 10)}...` : 'None'}</code>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#B4232F] dark:text-[#E04855]">
            Clinical Diagnostic Portal
          </h1>
          <p className="text-xs sm:text-sm text-[#5F6368] dark:text-[#A0A0A0]">
            Longitudinal biomarker analytics, organ-system pathology panels, and hereditary risk cross-examination.
          </p>
        </div>

        {/* Patient Context ID Selector */}
        <form onSubmit={handlePatientSwitch} className="flex items-center space-x-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-60">
            <Input
              type="text"
              mono
              density="compact"
              placeholder="Target Patient UUID"
              value={patientInput}
              onChange={(e) => setPatientInput(e.target.value)}
              className="text-xs"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            leftIcon={<DoodleIcon name="user" className="w-3.5 h-3.5 text-white" />}
          >
            Load Patient
          </Button>
        </form>
      </div>

      {/* 2. Disease Pathology Segmented Tabs */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap gap-1.5 border-b border-[#E3E3DF] dark:border-[#303030] pb-2">
          {diseases.map((d) => {
            const isSelected = selectedDiseaseId === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDiseaseId(d.id)}
                className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-[#FCEBED] text-[#B4232F] border border-[#E8B4B9] dark:bg-[#2A1618] dark:text-[#E04855]'
                    : 'text-[#5F6368] dark:text-[#A0A0A0] hover:text-[#171717] dark:hover:text-[#F0F0F0] hover:bg-[#F4F4F2]'
                }`}
              >
                <span>{d.name}</span>
              </button>
            );
          })}
        </div>

        {/* Disease Subtitle / Description */}
        {activeDisease && (
          <div className="text-xs text-[#5F6368] dark:text-[#A0A0A0] flex items-center space-x-2">
            <span className="font-semibold text-[#171717] dark:text-[#F0F0F0]">{activeDisease.category}:</span>
            <span>{activeDisease.description}</span>
          </div>
        )}
      </div>

      {/* 3. 2-Column Clinical Workstation Grid (5 Cols Biomarkers List, 7 Cols Trend & Cross-Family History) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: Disease Primary Biomarkers List (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#B4232F] dark:text-[#E04855]">
              Pathology Biomarkers
            </h3>
            <span className="text-xs text-[#858585] font-mono">
              {activeDisease?.primary_tests?.length || 0} tests
            </span>
          </div>

          <div className="space-y-2">
            {loadingPanel ? (
              <Card radius="md" className="p-6 text-center space-y-2 bg-white dark:bg-[#1E1E1E] border border-[#D98A91]/80 dark:border-[#303030]">
                <div className="w-5 h-5 mx-auto rounded-full border-2 border-[#B4232F] border-t-transparent animate-spin" />
                <p className="text-xs text-[#858585]">Loading pathology markers...</p>
              </Card>
            ) : activeDisease?.primary_tests?.map((testName) => {
              const summary = diseaseSummaries.find((s) => s.canonical_test_name === testName);
              const isSelected = selectedTestName === testName;
              const statusMeta = summary ? getAbnormalityMeta(summary.abnormality_flag) : null;

              return (
                <div
                  key={testName}
                  onClick={() => setSelectedTestName(testName)}
                  className={`p-3.5 rounded-[8px] transition-all cursor-pointer border ${
                    isSelected
                      ? 'border-l-[3px] border-l-[#B4232F] border-t-[#D98A91]/80 border-r-[#D98A91]/80 border-b-[#D98A91]/80 bg-[#FFF9F9] dark:bg-[#202020] dark:border-l-[#E04855] shadow-xs'
                      : 'border-[#D98A91]/80 dark:border-[#303030] bg-white dark:bg-[#1E1E1E] hover:border-[#B4232F]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs font-semibold text-[#171717] dark:text-[#F0F0F0] truncate" title={testName}>
                          {testName}
                        </h4>
                        {statusMeta && (
                          <Badge status={statusMeta.status} size="sm" dot>
                            {statusMeta.label}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-[11px] text-[#858585] font-mono">
                        {summary
                          ? `Latest: ${summary.latest_value} ${summary.unit || ''} (Ref: ${summary.reference_range || 'N/A'})`
                          : 'No recorded values for patient'}
                      </p>
                    </div>

                    <span className={`text-xs font-semibold shrink-0 ${isSelected ? 'text-[#B4232F] dark:text-[#E04855]' : 'text-[#858585]'}`}>
                      {isSelected ? '● Active' : '→'}
                    </span>
                  </div>
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

          {/* Cross-Family Medical History Table */}
          <Card radius="lg" className="overflow-hidden space-y-0 bg-white dark:bg-[#1E1E1E] border border-[#D98A91]/80 dark:border-[#422225]">
            <CardHeader density="compact" className="border-b border-[#E3E3DF] dark:border-[#303030] pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-[4px] flex items-center justify-center bg-[#FCEBED] text-[#B4232F] dark:bg-[#252525] dark:text-[#F0F0F0]">
                    <DoodleIcon name="tree" className="w-3.5 h-3.5" />
                  </div>
                  <CardTitle density="compact" className="text-[#B4232F] dark:text-[#E04855]">
                    Hereditary Pedigree History: {selectedTestName}
                  </CardTitle>
                </div>
                <Badge status="neutral" size="sm">
                  {familyHistory.length} {familyHistory.length === 1 ? 'record' : 'records'}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Biomarker values recorded across the patient's linked genealogical network
              </CardDescription>
            </CardHeader>

            {loadingFamily ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-5 h-5 mx-auto rounded-full border-2 border-[#B4232F] border-t-transparent animate-spin" />
                <p className="text-xs text-[#858585]">Scanning family records...</p>
              </div>
            ) : familyHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E3E3DF] dark:border-[#303030] bg-[#F7F7F5] dark:bg-[#222222] text-[10px] font-semibold uppercase tracking-wider text-[#5F6368] dark:text-[#A0A0A0]">
                      <th className="py-2.5 px-3.5 sticky left-0 bg-[#F7F7F5] dark:bg-[#222222] z-10 min-w-[150px]">
                        Relative &amp; Kinship
                      </th>
                      <th className="py-2.5 px-3.5 min-w-[110px]">Report Date</th>
                      <th className="py-2.5 px-3.5 text-right min-w-[110px]">Observed Value</th>
                      <th className="py-2.5 px-3.5 text-center min-w-[90px]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E7E4] dark:divide-[#282828]">
                    {familyHistory.map((item, idx) => {
                      const statusMeta = getAbnormalityMeta(item.abnormality_flag);
                      return (
                        <tr key={idx} className="hover:bg-[#FCFCFB] dark:hover:bg-[#222222] transition-colors h-11">
                          <td className="py-2.5 px-3.5 sticky left-0 bg-white dark:bg-[#1E1E1E] z-10">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-[#171717] dark:text-[#F0F0F0] text-xs">
                                {item.relative_name}
                              </span>
                              <Badge status="neutral" size="sm">
                                {item.relationship_type}
                              </Badge>
                            </div>
                          </td>

                          <td className="py-2.5 px-3.5 font-mono text-[#5F6368] dark:text-[#A0A0A0] text-xs">
                            {new Date(item.report_date).toLocaleDateString()}
                          </td>

                          <td className="py-2.5 px-3.5 text-right font-mono font-bold text-[#171717] dark:text-[#F0F0F0] text-xs">
                            {item.value} <span className="font-normal text-[#858585] text-[11px]">{item.unit || ''}</span>
                          </td>

                          <td className="py-2.5 px-3.5 text-center">
                            <Badge status={statusMeta.status} size="sm" dot>
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
              <div className="p-6 text-center text-xs text-[#858585]">
                No linked family members have recorded readings for {selectedTestName}.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DoctorPortalPage;
