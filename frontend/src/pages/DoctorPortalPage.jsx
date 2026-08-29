import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getDiseaseMappings,
  getPatientDiseaseSummary,
  getRelativeDiseaseSummary,
  getFamilyBiomarkerHistory,
} from '../api/clinical';
import { getFamilyMembers } from '../api/family';
import { getTestTrend } from '../api/reports';
import DoodleIcon from '../components/common/DoodleIcon';
import TrendChart from '../components/doctor/TrendChart';
import { Button, Badge, Card, CardHeader, CardTitle, CardDescription, Input, Select } from '../components/ui';

export function DoctorPortalPage() {
  const { userId } = useAuth();
  
  // Patient Context ID (defaults to current user, but doctor can input any target patient UUID)
  const [patientId, setPatientId] = useState(userId || '');
  const [patientInput, setPatientInput] = useState(userId || '');
  
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(userId || '');
  
  const [diseases, setDiseases] = useState([]);
  const [selectedDiseaseId, setSelectedDiseaseId] = useState('diabetes');
  const [diseaseSummaries, setDiseaseSummaries] = useState([]);
  const [selectedTestName, setSelectedTestName] = useState('Fasting Blood Sugar');
  
  const [trendData, setTrendData] = useState([]);
  const [familyHistory, setFamilyHistory] = useState([]);
  
  const [loadingPanel, setLoadingPanel] = useState(false);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [loadingFamily, setLoadingFamily] = useState(false);
  const [privacyError, setPrivacyError] = useState('');

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

  // 2. Fetch linked family members for active patient context & set default selection order
  useEffect(() => {
    async function loadRelatives() {
      if (!patientId) return;
      try {
        const relatives = await getFamilyMembers(patientId);
        setFamilyMembers(relatives || []);

        // Default selection order: Father if linked -> else Mother if linked -> else Self
        const father = relatives?.find((r) =>
          ['father', 'dad'].includes(r.relationship_type?.toLowerCase())
        );
        const mother = relatives?.find((r) =>
          ['mother', 'mom'].includes(r.relationship_type?.toLowerCase())
        );

        if (father) {
          setSelectedSubjectId(father.relative_id);
        } else if (mother) {
          setSelectedSubjectId(mother.relative_id);
        } else {
          setSelectedSubjectId(patientId);
        }
      } catch (err) {
        console.error('Failed to load patient relatives:', err);
        setFamilyMembers([]);
        setSelectedSubjectId(patientId);
      }
    }
    loadRelatives();
  }, [patientId]);

  // 3. Fetch Disease summary for active selected subject (patient or linked relative)
  const loadDiseasePanel = useCallback(async () => {
    if (!patientId || !selectedSubjectId || !selectedDiseaseId) return;
    setLoadingPanel(true);
    setPrivacyError('');

    try {
      let summary;
      if (selectedSubjectId === patientId) {
        summary = await getPatientDiseaseSummary(patientId, selectedDiseaseId);
      } else {
        summary = await getRelativeDiseaseSummary(patientId, selectedSubjectId, selectedDiseaseId);
      }
      setDiseaseSummaries(summary || []);
      
      // Auto-select first test in disease list
      const activeDisease = diseases.find((d) => d.id === selectedDiseaseId);
      if (activeDisease && activeDisease.primary_tests.length > 0) {
        setSelectedTestName(activeDisease.primary_tests[0]);
      }
    } catch (err) {
      console.error('Failed to load disease summary:', err);
      setDiseaseSummaries([]);
      if (err.response?.status === 403) {
        setPrivacyError('Clinical data sharing has been restricted by this relative.');
      }
    } finally {
      setLoadingPanel(false);
    }
  }, [patientId, selectedSubjectId, selectedDiseaseId, diseases]);

  useEffect(() => {
    loadDiseasePanel();
  }, [loadDiseasePanel]);

  // 4. Fetch longitudinal trend & cross-family history when selectedTestName or selectedSubjectId changes
  const loadTestTrendAndFamily = useCallback(async () => {
    if (!selectedSubjectId || !selectedTestName) return;

    setLoadingTrend(true);
    try {
      const points = await getTestTrend(selectedSubjectId, selectedTestName);
      setTrendData(points || []);
    } catch (err) {
      console.error('Failed to load test trend:', err);
      setTrendData([]);
    } finally {
      setLoadingTrend(false);
    }

    setLoadingFamily(true);
    try {
      const famHistory = await getFamilyBiomarkerHistory(patientId, selectedTestName);
      setFamilyHistory(famHistory || []);
    } catch (err) {
      console.error('Failed to load family history:', err);
      setFamilyHistory([]);
    } finally {
      setLoadingFamily(false);
    }
  }, [patientId, selectedSubjectId, selectedTestName]);

  useEffect(() => {
    loadTestTrendAndFamily();
  }, [loadTestTrendAndFamily]);

  const handlePatientSwitch = (e) => {
    e.preventDefault();
    if (patientInput.trim()) {
      setPatientId(patientInput.trim());
      setSelectedSubjectId(patientInput.trim());
    }
  };

  const activeDisease = diseases.find((d) => d.id === selectedDiseaseId);
  const selectedRelativeMeta = familyMembers.find((r) => r.relative_id === selectedSubjectId);
  const isViewingRelative = selectedSubjectId !== patientId;

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
      
      {/* 1. Header & Patient Context Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#CBD6D2] dark:border-[#2F433E]">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold tracking-widest text-[#1E4D45] dark:text-[#57BA8E] uppercase">
              Clinical Workspace
            </span>
            <span className="text-[#7E9993]">•</span>
            <span className="text-xs text-[#4E6863] dark:text-[#7E9993]">
              Patient ID: <code className="font-mono font-semibold text-[#13221F] dark:text-[#EFF5F3]">{patientId ? `${patientId.substring(0, 8)}...` : 'None'}</code>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#13221F] dark:text-[#EFF5F3]">
            Clinical Diagnostic Portal
          </h1>
          <p className="text-xs sm:text-sm text-[#4E6863] dark:text-[#7E9993]">
            Longitudinal biomarker analytics, disease pathology panels, and cross-family pedigree risk investigation.
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

      {/* 2. Disease Pathology Segmented Tabs & Pedigree Subject Selector Bar */}
      <div className="space-y-3">
        
        {/* Disease Tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-[#CBD6D2] dark:border-[#2F433E] pb-2">
          {diseases.map((d) => {
            const isSelected = selectedDiseaseId === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDiseaseId(d.id)}
                className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-[#1E4D45] text-white shadow-xs dark:bg-[#336E63]'
                    : 'text-[#4E6863] dark:text-[#7E9993] hover:text-[#13221F] dark:hover:text-[#EFF5F3] hover:bg-[#F4F6F5]'
                }`}
              >
                <span>{d.name}</span>
              </button>
            );
          })}
        </div>

        {/* Pedigree Subject Selector Toolbar */}
        <div className="p-3 rounded-[8px] bg-[#F4F6F5] dark:bg-[#1C2725] border border-[#CBD6D2] dark:border-[#2F433E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-[#13221F] dark:text-[#EFF5F3] flex items-center space-x-1.5">
              <DoodleIcon name="tree" className="w-3.5 h-3.5 text-[#1E4D45] dark:text-[#57BA8E]" />
              <span>Pedigree Subject View:</span>
            </span>

            {/* Relation Selector Dropdown */}
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="p-1 px-2.5 rounded-[6px] text-xs font-semibold bg-white dark:bg-[#151E1C] border border-[#CBD6D2] dark:border-[#2F433E] text-[#13221F] dark:text-[#EFF5F3] focus:ring-1 focus:ring-[#1E4D45] cursor-pointer"
              id="pedigree-subject-select"
            >
              <option value={patientId}>Patient (Self)</option>
              {familyMembers.map((rel) => (
                <option key={rel.relationship_id} value={rel.relative_id}>
                  {rel.relationship_type?.toUpperCase()}: {rel.full_name} {rel.is_placeholder ? '(Managed)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Context Badge */}
          <div className="flex items-center space-x-2 text-xs">
            {isViewingRelative ? (
              <Badge status="juniper" size="sm" dot>
                Viewing Pedigree Risk: {selectedRelativeMeta?.relationship_type?.toUpperCase()} ({selectedRelativeMeta?.full_name})
              </Badge>
            ) : (
              <Badge status="neutral" size="sm">
                Viewing Primary Patient Records
              </Badge>
            )}
          </div>
        </div>

        {/* Disease Subtitle / Description */}
        {activeDisease && (
          <div className="text-xs text-[#4E6863] dark:text-[#7E9993] flex items-center space-x-2">
            <span className="font-semibold text-[#13221F] dark:text-[#EFF5F3]">{activeDisease.category}:</span>
            <span>{activeDisease.description}</span>
          </div>
        )}
      </div>

      {/* Privacy Warning Banner if consent is disabled */}
      {privacyError && (
        <div className="p-3.5 rounded-[8px] text-xs font-semibold bg-[#FDF0F0] border border-[#F6C4C5] text-[#942728] dark:bg-[#2D1616] dark:border-[#5B292A] dark:text-[#E57373] flex items-center space-x-2">
          <span>🔒</span>
          <span>{privacyError}</span>
        </div>
      )}

      {/* 3. 2-Column Clinical Workstation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: Disease Primary Biomarkers List (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1E4D45] dark:text-[#57BA8E]">
              Pathology Biomarkers {isViewingRelative ? `(${selectedRelativeMeta?.relationship_type?.toUpperCase()})` : ''}
            </h3>
            <span className="text-xs text-[#7E9993] font-mono">
              {activeDisease?.primary_tests?.length || 0} tests
            </span>
          </div>

          <div className="space-y-2">
            {loadingPanel ? (
              <Card radius="md" className="p-6 text-center space-y-2 bg-white dark:bg-[#151E1C] border border-[#CBD6D2] dark:border-[#2F433E]">
                <div className="w-5 h-5 mx-auto rounded-full border-2 border-[#1E4D45] dark:border-[#57BA8E] border-t-transparent animate-spin" />
                <p className="text-xs text-[#7E9993]">Loading pathology markers...</p>
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
                      ? 'border-l-[3px] border-l-[#1E4D45] border-t-[#1E4D45] border-r-[#1E4D45] border-b-[#1E4D45] bg-[#E5EFEA]/30 dark:bg-[#1A2C28]/40 dark:border-l-[#57BA8E] shadow-xs'
                      : 'border-[#CBD6D2] dark:border-[#2F433E] bg-white dark:bg-[#151E1C] hover:border-[#1E4D45]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs font-semibold text-[#13221F] dark:text-[#EFF5F3] truncate" title={testName}>
                          {testName}
                        </h4>
                        {statusMeta && (
                          <Badge status={statusMeta.status} size="sm" dot>
                            {statusMeta.label}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-[11px] text-[#4E6863] dark:text-[#7E9993] font-mono">
                        {summary
                          ? `Observed: ${summary.latest_value} ${summary.unit || ''} (Ref: ${summary.reference_range || 'N/A'})`
                          : 'No recorded values for subject'}
                      </p>
                    </div>

                    <span className={`text-xs font-semibold shrink-0 ${isSelected ? 'text-[#1E4D45] dark:text-[#57BA8E]' : 'text-[#7E9993]'}`}>
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
            title={`${selectedTestName} (${isViewingRelative ? selectedRelativeMeta?.full_name : 'Patient'})`}
            unit={trendData[0]?.unit || ''}
            dataPoints={trendData}
            loading={loadingTrend}
          />

          {/* Cross-Family Medical History Table */}
          <Card radius="lg" className="overflow-hidden space-y-0 bg-white dark:bg-[#151E1C] border border-[#CBD6D2] dark:border-[#2F433E]">
            <CardHeader density="compact" className="border-b border-[#E0E7E4] dark:border-[#22312E] pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-[4px] flex items-center justify-center bg-[#E5EFEA] text-[#1E4D45] dark:bg-[#1C2725] dark:text-[#57BA8E]">
                    <DoodleIcon name="tree" className="w-3.5 h-3.5" />
                  </div>
                  <CardTitle density="compact" className="text-[#13221F] dark:text-[#EFF5F3]">
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
                <div className="w-5 h-5 mx-auto rounded-full border-2 border-[#1E4D45] dark:border-[#57BA8E] border-t-transparent animate-spin" />
                <p className="text-xs text-[#7E9993]">Scanning pedigree network...</p>
              </div>
            ) : familyHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E0E7E4] dark:border-[#22312E] bg-[#F4F6F5] dark:bg-[#1C2725] text-[10px] font-semibold uppercase tracking-wider text-[#4E6863] dark:text-[#7E9993]">
                      <th className="py-2.5 px-3.5 sticky left-0 bg-[#F4F6F5] dark:bg-[#1C2725] z-10 min-w-[150px]">
                        Relative &amp; Kinship
                      </th>
                      <th className="py-2.5 px-3.5 min-w-[110px]">Report Date</th>
                      <th className="py-2.5 px-3.5 text-right min-w-[110px]">Observed Value</th>
                      <th className="py-2.5 px-3.5 text-center min-w-[90px]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0E7E4] dark:divide-[#22312E]">
                    {familyHistory.map((item, idx) => {
                      const statusMeta = getAbnormalityMeta(item.abnormality_flag);
                      return (
                        <tr key={idx} className="hover:bg-[#F4F6F5] dark:hover:bg-[#1C2725] transition-colors h-11">
                          <td className="py-2.5 px-3.5 sticky left-0 bg-white dark:bg-[#151E1C] z-10">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-[#13221F] dark:text-[#EFF5F3] text-xs">
                                {item.relative_name}
                              </span>
                              <Badge status="neutral" size="sm">
                                {item.relationship_type}
                              </Badge>
                            </div>
                          </td>

                          <td className="py-2.5 px-3.5 font-mono text-[#4E6863] dark:text-[#7E9993] text-xs">
                            {new Date(item.report_date).toLocaleDateString()}
                          </td>

                          <td className="py-2.5 px-3.5 text-right font-mono font-bold text-[#13221F] dark:text-[#EFF5F3] text-xs">
                            {item.value} <span className="font-normal text-[#7E9993] text-[11px]">{item.unit || ''}</span>
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
              <div className="p-6 text-center text-xs text-[#7E9993]">
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
