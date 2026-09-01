import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getDiseaseMappings,
  getRecentDiseaseMeasurements,
  getDiseaseTimeline,
  addMedicalHistoryRecord,
  deleteMedicalHistoryRecord,
  getFamilyDiseaseOverview,
} from '../api/clinical';
import { getTestTrend } from '../api/reports';
import DoodleIcon from '../components/common/DoodleIcon';
import TrendChart from '../components/doctor/TrendChart';
import DiseaseAutocompleteSearch from '../components/doctor/DiseaseAutocompleteSearch';
import DiseaseTimelineView from '../components/doctor/DiseaseTimelineView';
import RelativeDiseaseCard from '../components/doctor/RelativeDiseaseCard';
import { Button, Badge, Card, CardHeader, CardTitle, CardDescription, Input, Modal, FormField, Select, EmptyState } from '../components/ui';

export function DoctorPortalPage() {
  const { userId } = useAuth();

  // Patient Context ID (defaults to current user, doctor can switch UUID)
  const [patientId, setPatientId] = useState(userId || '');
  const [patientInput, setPatientInput] = useState(userId || '');

  // Disease Selection State
  const [diseases, setDiseases] = useState([]);
  const [selectedDiseaseId, setSelectedDiseaseId] = useState('type_2_diabetes');

  // Patient Self Data State
  const [patientMeasurements, setPatientMeasurements] = useState(null);
  const [patientTimeline, setPatientTimeline] = useState([]);
  const [selectedBiomarker, setSelectedBiomarker] = useState(null);
  const [trendData, setTrendData] = useState([]);

  // Family Overview State
  const [familyOverview, setFamilyOverview] = useState([]);

  // Loading & Error States
  const [loadingDiseases, setLoadingDiseases] = useState(true);
  const [loadingPatientData, setLoadingPatientData] = useState(false);
  const [loadingFamilyData, setLoadingFamilyData] = useState(false);
  const [loadingTrend, setLoadingTrend] = useState(false);

  // Add Diagnosis Modal State
  const [diagModalOpen, setDiagModalOpen] = useState(false);
  const [diagDate, setDiagDate] = useState(new Date().toISOString().split('T')[0]);
  const [diagRecordType, setDiagRecordType] = useState('confirmed_diagnosis');
  const [diagStatus, setDiagStatus] = useState('active');
  const [diagNotes, setDiagNotes] = useState('');
  const [submittingDiag, setSubmittingDiag] = useState(false);

  // 1. Fetch Disease list from unified registry on mount
  useEffect(() => {
    async function loadDiseases() {
      setLoadingDiseases(true);
      try {
        const list = await getDiseaseMappings();
        setDiseases(list || []);
        if (list && list.length > 0) {
          setSelectedDiseaseId((prev) => (list.some((d) => d.id === prev || d.disease_key === prev) ? prev : list[0].id));
        }
      } catch (err) {
        console.error('Failed to load disease mappings:', err);
      } finally {
        setLoadingDiseases(false);
      }
    }
    loadDiseases();
  }, []);

  const activeDisease = useMemo(() => {
    return diseases.find((d) => d.id === selectedDiseaseId || d.disease_key === selectedDiseaseId) || null;
  }, [diseases, selectedDiseaseId]);

  // 2. Fetch Patient's own measurements (last 5 reports) & Disease Timeline
  const loadPatientDiseaseData = useCallback(async () => {
    if (!patientId || !selectedDiseaseId) return;

    setLoadingPatientData(true);
    try {
      const [measData, timelineData] = await Promise.all([
        getRecentDiseaseMeasurements(patientId, selectedDiseaseId),
        getDiseaseTimeline(patientId, selectedDiseaseId),
      ]);

      setPatientMeasurements(measData);
      setPatientTimeline(timelineData || []);

      // Auto-select first biomarker for longitudinal trend curve
      if (measData?.biomarker_summaries && measData.biomarker_summaries.length > 0) {
        setSelectedBiomarker(measData.biomarker_summaries[0]);
      } else if (activeDisease?.primary_biomarkers_detail && activeDisease.primary_biomarkers_detail.length > 0) {
        setSelectedBiomarker({
          canonical_key: activeDisease.primary_biomarkers_detail[0].key,
          canonical_test_name: activeDisease.primary_biomarkers_detail[0].display_name,
          unit: activeDisease.primary_biomarkers_detail[0].standard_unit,
        });
      } else {
        setSelectedBiomarker(null);
      }
    } catch (err) {
      console.error('Failed to load patient disease measurements/timeline:', err);
      setPatientMeasurements(null);
      setPatientTimeline([]);
    } finally {
      setLoadingPatientData(false);
    }
  }, [patientId, selectedDiseaseId, activeDisease]);

  useEffect(() => {
    loadPatientDiseaseData();
  }, [loadPatientDiseaseData]);

  // 3. Fetch Linked Family Members' Disease Overview (with consent enforcement)
  const loadFamilyDiseaseOverview = useCallback(async () => {
    if (!patientId || !selectedDiseaseId) return;

    setLoadingFamilyData(true);
    try {
      const famData = await getFamilyDiseaseOverview(patientId, selectedDiseaseId);
      setFamilyOverview(famData || []);
    } catch (err) {
      console.error('Failed to load family disease overview:', err);
      setFamilyOverview([]);
    } finally {
      setLoadingFamilyData(false);
    }
  }, [patientId, selectedDiseaseId]);

  useEffect(() => {
    loadFamilyDiseaseOverview();
  }, [loadFamilyDiseaseOverview]);

  // 4. Fetch Trend Data whenever selected biomarker or patient changes
  const loadBiomarkerTrend = useCallback(async () => {
    if (!patientId || !selectedBiomarker) {
      setTrendData([]);
      return;
    }

    setLoadingTrend(true);
    try {
      const testName = selectedBiomarker.canonical_test_name || selectedBiomarker.canonical_key;
      const points = await getTestTrend(patientId, testName);
      setTrendData(points || []);
    } catch (err) {
      console.error('Failed to load biomarker trend:', err);
      setTrendData([]);
    } finally {
      setLoadingTrend(false);
    }
  }, [patientId, selectedBiomarker]);

  useEffect(() => {
    loadBiomarkerTrend();
  }, [loadBiomarkerTrend]);

  // Doctor Mode UUID Switcher
  const handlePatientSwitch = (e) => {
    e.preventDefault();
    if (patientInput.trim()) {
      setPatientId(patientInput.trim());
    }
  };

  // Add Confirmed Diagnosis Handler
  const handleAddDiagnosisSubmit = async (e) => {
    e.preventDefault();
    if (!patientId || !selectedDiseaseId) return;

    setSubmittingDiag(true);
    try {
      await addMedicalHistoryRecord(patientId, {
        disease_key: selectedDiseaseId,
        diagnosis_date: diagDate,
        record_type: diagRecordType,
        status: diagStatus,
        notes: diagNotes.trim() || undefined,
      });
      setDiagModalOpen(false);
      setDiagNotes('');
      // Reload patient timeline
      const updatedTimeline = await getDiseaseTimeline(patientId, selectedDiseaseId);
      setPatientTimeline(updatedTimeline || []);
    } catch (err) {
      console.error('Failed to add medical history record:', err);
    } finally {
      setSubmittingDiag(false);
    }
  };

  // Delete Medical History Record Handler
  const handleDeleteRecord = async (recordId) => {
    if (!confirm('Are you sure you want to delete this diagnosis record?')) return;
    try {
      await deleteMedicalHistoryRecord(patientId, recordId);
      const updatedTimeline = await getDiseaseTimeline(patientId, selectedDiseaseId);
      setPatientTimeline(updatedTimeline || []);
    } catch (err) {
      console.error('Failed to delete medical history record:', err);
    }
  };

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

  const patientSummaries = patientMeasurements?.biomarker_summaries || [];
  const consentedRelativesCount = familyOverview.filter((r) => !r.consent_restricted).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* 1. Header & Patient Context Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#CBD6D2] dark:border-[#2F433E]">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold tracking-widest text-[#1E4D45] dark:text-[#57BA8E] uppercase">
              Clinical Diagnostic Portal
            </span>
            <span className="text-[#7E9993]">•</span>
            <span className="text-xs text-[#4E6863] dark:text-[#7E9993]">
              Patient: <code className="font-mono font-semibold text-[#13221F] dark:text-[#EFF5F3]">{patientId ? `${patientId.substring(0, 8)}...` : 'None'}</code>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#13221F] dark:text-[#EFF5F3]">
            Disease-Centric Pedigree Workstation
          </h1>
          <p className="text-xs sm:text-sm text-[#4E6863] dark:text-[#7E9993]">
            Cross-reference primary patient pathology with linked biological pedigree history for targeted clinical diagnosis.
          </p>
        </div>

        {/* Doctor Mode Patient UUID Input */}
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

      {/* 2. Disease Autocomplete Live Search & Pathology Registry Selector */}
      <DiseaseAutocompleteSearch
        diseases={diseases}
        selectedDiseaseId={selectedDiseaseId}
        onSelectDisease={(disease) => setSelectedDiseaseId(disease.id || disease.disease_key)}
        loading={loadingDiseases}
      />

      {/* 3. Two-Column Comparative Layout (Patient Self vs Linked Family Members) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Primary Patient Workspace (Col Span 6)                      */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Section Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#CBD6D2] dark:border-[#2F433E]">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-[#1E4D45] text-white flex items-center justify-center font-mono text-xs font-bold">
                P
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#13221F] dark:text-[#EFF5F3]">
                  Primary Patient Clinical Data
                </h2>
                <p className="text-[11px] text-[#7E9993]">
                  5 most recent reports filtered to {activeDisease?.name || 'disease'} biomarkers
                </p>
              </div>
            </div>
            <Badge status="juniper" size="sm">
              Patient Self View
            </Badge>
          </div>

          {/* 1. Patient Recent Measurements Card */}
          <Card radius="lg" className="p-4 sm:p-5 bg-white dark:bg-[#151E1C] border border-[#CBD6D2] dark:border-[#2F433E] space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E4D45] dark:text-[#57BA8E] flex items-center space-x-1.5">
                <DoodleIcon name="heartbeat" className="w-3.5 h-3.5" />
                <span>Relevant Biomarker Measurements</span>
              </h3>
              <span className="text-[11px] font-mono text-[#7E9993]">
                {patientMeasurements?.total_reports_evaluated || 0} reports evaluated
              </span>
            </div>

            {loadingPatientData ? (
              <div className="p-6 text-center space-y-2">
                <div className="w-5 h-5 mx-auto rounded-full border-2 border-[#1E4D45] dark:border-[#57BA8E] border-t-transparent animate-spin" />
                <p className="text-xs text-[#7E9993]">Scanning patient reports for disease biomarkers...</p>
              </div>
            ) : patientSummaries.length === 0 ? (
              <div className="p-6 text-center rounded-[8px] border border-dashed border-[#CBD6D2] dark:border-[#2F433E] bg-[#F4F6F5]/50 dark:bg-[#1C2725]/30 space-y-1.5">
                <p className="text-xs font-semibold text-[#13221F] dark:text-[#EFF5F3]">
                  No Recorded Lab Measurements
                </p>
                <p className="text-[11px] text-[#7E9993]">
                  No lab measurements relevant to {activeDisease?.name || 'this condition'} were found in the patient's recent uploaded reports.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-[#7E9993]">
                  Click any biomarker to inspect its longitudinal trend trajectory:
                </p>
                <div className="overflow-x-auto rounded-[6px] border border-[#E0E7E4] dark:border-[#22312E]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F4F6F5] dark:bg-[#1C2725] text-[10px] font-semibold uppercase tracking-wider text-[#4E6863] dark:text-[#7E9993] border-b border-[#E0E7E4] dark:border-[#22312E]">
                        <th className="py-2 px-3">Biomarker</th>
                        <th className="py-2 px-3">Latest Value</th>
                        <th className="py-2 px-3">Ref Range</th>
                        <th className="py-2 px-3 text-center">Status</th>
                        <th className="py-2 px-3 text-right">Report Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E0E7E4] dark:divide-[#22312E]">
                      {patientSummaries.map((m) => {
                        const isSelected = selectedBiomarker?.canonical_key === m.canonical_key;
                        return (
                          <tr
                            key={m.id || m.canonical_key}
                            onClick={() => setSelectedBiomarker(m)}
                            className={`cursor-pointer transition-colors h-10 ${
                              isSelected
                                ? 'bg-[#E5EFEA] dark:bg-[#1C2725] font-semibold border-l-3 border-l-[#1E4D45] dark:border-l-[#57BA8E]'
                                : 'hover:bg-[#F4F6F5] dark:hover:bg-[#1C2725]'
                            }`}
                          >
                            <td className="py-2 px-3 text-[#13221F] dark:text-[#EFF5F3]">
                              <div className="flex items-center space-x-1.5">
                                <span>{m.canonical_test_name}</span>
                                {isSelected && (
                                  <span className="text-[9px] font-bold text-[#1E4D45] dark:text-[#57BA8E]">• Active</span>
                                )}
                              </div>
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
              </div>
            )}
          </Card>

          {/* 2. Interactive Longitudinal Trend Curve for Patient */}
          {selectedBiomarker && (
            <TrendChart
              title={`${selectedBiomarker.canonical_test_name || 'Biomarker'} (Patient Long-term Trend)`}
              unit={selectedBiomarker.unit || ''}
              dataPoints={trendData}
              loading={loadingTrend}
            />
          )}

          {/* 3. Patient Disease History Timeline */}
          <Card radius="lg" className="p-4 sm:p-5 bg-white dark:bg-[#151E1C] border border-[#CBD6D2] dark:border-[#2F433E] shadow-xs">
            <DiseaseTimelineView
              timeline={patientTimeline}
              loading={loadingPatientData}
              diseaseName={activeDisease?.name || 'Condition'}
              subjectName="Patient"
              onAddDiagnosis={() => setDiagModalOpen(true)}
              onDeleteRecord={handleDeleteRecord}
              canAdd={true}
            />
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Linked Family Pedigree Records (Col Span 6)                 */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Section Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#CBD6D2] dark:border-[#2F433E]">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-[#E5EFEA] text-[#1E4D45] dark:bg-[#1C2725] dark:text-[#57BA8E] flex items-center justify-center">
                <DoodleIcon name="tree" className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#13221F] dark:text-[#EFF5F3]">
                  Linked Family Pedigree Records
                </h2>
                <p className="text-[11px] text-[#7E9993]">
                  Hereditary disease measurements &amp; history grouped per relative
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Badge status={consentedRelativesCount > 0 ? 'juniper' : 'neutral'} size="sm">
                {consentedRelativesCount} of {familyOverview.length} Consented
              </Badge>
            </div>
          </div>

          {/* Family Members List */}
          {loadingFamilyData ? (
            <div className="p-8 text-center space-y-2 rounded-[8px] border border-[#CBD6D2] dark:border-[#2F433E] bg-white dark:bg-[#151E1C]">
              <div className="w-5 h-5 mx-auto rounded-full border-2 border-[#1E4D45] dark:border-[#57BA8E] border-t-transparent animate-spin" />
              <p className="text-xs text-[#7E9993]">Scanning pedigree network for disease pathology...</p>
            </div>
          ) : familyOverview.length === 0 ? (
            /* Empty State: No Family Members Linked */
            <EmptyState
              icon={<DoodleIcon name="tree" className="w-6 h-6 text-[#1E4D45] dark:text-[#57BA8E]" />}
              title="No Family Members Linked"
              description="No biological relatives have been linked to this patient's genealogical tree yet."
            />
          ) : (
            <div className="space-y-5">
              {familyOverview.map((relative) => (
                <RelativeDiseaseCard
                  key={relative.relative_id}
                  relative={relative}
                  diseaseName={activeDisease?.name || 'Condition'}
                  activeBiomarkerKey={selectedBiomarker?.canonical_key || ''}
                />
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 4. Add Confirmed Diagnosis Modal */}
      <Modal
        isOpen={diagModalOpen}
        onClose={() => setDiagModalOpen(false)}
        title={`Log Diagnosis / Medical History Entry: ${activeDisease?.name || 'Condition'}`}
      >
        <form onSubmit={handleAddDiagnosisSubmit} className="space-y-4">
          <p className="text-xs text-[#7E9993]">
            Record an explicit clinical diagnosis or documented medical history event for this patient.
          </p>

          <FormField label="Diagnosis Date" required>
            <Input
              type="date"
              value={diagDate}
              onChange={(e) => setDiagDate(e.target.value)}
              required
            />
          </FormField>

          <FormField label="Record Type" required>
            <Select
              value={diagRecordType}
              onChange={(e) => setDiagRecordType(e.target.value)}
            >
              <option value="confirmed_diagnosis">Physician-Confirmed Diagnosis</option>
              <option value="self_reported">Patient Self-Reported History</option>
              <option value="clinical_note">Clinical Chart Note</option>
            </Select>
          </FormField>

          <FormField label="Clinical Status" required>
            <Select
              value={diagStatus}
              onChange={(e) => setDiagStatus(e.target.value)}
            >
              <option value="active">Active (Under Current Management)</option>
              <option value="managed">Managed / Controlled</option>
              <option value="in_remission">In Remission</option>
              <option value="resolved">Resolved</option>
            </Select>
          </FormField>

          <FormField label="Clinical Notes / Medication / Hospital">
            <textarea
              rows={3}
              value={diagNotes}
              onChange={(e) => setDiagNotes(e.target.value)}
              placeholder="e.g. Diagnosed at Metro Endocrine Center; initiating Metformin 500mg daily..."
              className="w-full p-2.5 text-xs rounded-[6px] bg-white dark:bg-[#151E1C] border border-[#CBD6D2] dark:border-[#2F433E] text-[#13221F] dark:text-[#EFF5F3] focus:ring-1 focus:ring-[#1E4D45]"
            />
          </FormField>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E0E7E4] dark:border-[#22312E]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setDiagModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submittingDiag}
            >
              {submittingDiag ? 'Saving...' : 'Save Diagnosis Record'}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}

export default DoctorPortalPage;
