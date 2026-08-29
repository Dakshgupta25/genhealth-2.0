import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserRecentReports, getReportResults } from '../api/reports';
import { getFamilyMembers } from '../api/family';
import DoodleIcon from '../components/common/DoodleIcon';
import { Button, Badge, Card, EmptyState } from '../components/ui';
import PendingClaimsBanner from '../components/family/PendingClaimsBanner';

export function DashboardPage() {
  const { user, userId, selectedHospital } = useAuth();
  const navigate = useNavigate();

  const [recentReports, setRecentReports] = useState([]);
  const [recentMeasurements, setRecentMeasurements] = useState([]);
  const [familyCount, setFamilyCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  // Fetch real database records for recent lab reports and linked family members
  useEffect(() => {
    async function loadDashboardData() {
      if (!userId) return;
      setLoadingData(true);
      try {
        const [reports, family] = await Promise.all([
          getUserRecentReports(userId),
          getFamilyMembers(userId),
        ]);

        setRecentReports(reports || []);
        setFamilyCount((family || []).length);

        // Fetch detailed biomarker results from the most recent report
        if (reports && reports.length > 0) {
          const latestReport = reports[0];
          const results = await getReportResults(latestReport.id);
          setRecentMeasurements(results || []);
        } else {
          setRecentMeasurements([]);
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoadingData(false);
      }
    }

    loadDashboardData();
  }, [userId, selectedHospital]);

  const mapStatusToBadge = (flag) => {
    switch (flag?.toLowerCase()) {
      case 'high':
        return { status: 'critical', label: 'High', isAbnormal: true };
      case 'low':
        return { status: 'warning', label: 'Low', isAbnormal: true };
      case 'normal':
        return { status: 'normal', label: 'Normal', isAbnormal: false };
      case 'critical':
        return { status: 'critical', label: 'Critical', isAbnormal: true };
      default:
        return { status: 'neutral', label: flag || 'Review', isAbnormal: false };
    }
  };

  const hospitalScopeName =
    selectedHospital === 'city_general'
      ? 'City General Hospital'
      : selectedHospital === 'memorial_clinic'
      ? 'Memorial Diagnostic'
      : selectedHospital === 'apex_labs'
      ? 'Apex Clinical Labs'
      : 'All Facilities';

  const latestReportDate =
    recentReports.length > 0 && recentReports[0].report_date
      ? new Date(recentReports[0].report_date).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : 'No reports yet';

  // Calculate high-level biomarker summary
  const abnormalCount = recentMeasurements.filter(
    (m) =>
      m.abnormality_flag &&
      ['high', 'low', 'critical'].includes(m.abnormality_flag.toLowerCase())
  ).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Pending Incoming Claims Notification */}
      <PendingClaimsBanner />

      {/* 1. PATIENT OVERVIEW CLINICAL HEADER */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#E3E3DF] dark:border-[#303030]">
          <div className="space-y-1">
            <span className="text-[11px] font-bold tracking-widest text-[#B4232F] dark:text-[#E04855] uppercase">
              Patient Overview
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#B4232F] dark:text-[#E04855]">
              Personal Health Records
            </h1>
            <p className="text-xs sm:text-sm text-[#5F6368] dark:text-[#A0A0A0] max-w-2xl leading-relaxed">
              Welcome back, <span className="font-semibold text-[#171717] dark:text-[#F0F0F0]">{user?.full_name || 'Patient'}</span>. Review longitudinal biomarker trends, extracted diagnostics, and hereditary risk factors.
            </p>
          </div>

          <div className="flex sm:flex-col items-start sm:items-end gap-2 shrink-0 text-xs">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-[6px] bg-white dark:bg-[#1E1E1E] border border-[#D98A91]/80 dark:border-[#303030] text-[#5F6368] dark:text-[#A0A0A0]">
              <DoodleIcon name="hospital" className="w-3.5 h-3.5 text-[#B4232F]" />
              <span>{hospitalScopeName}</span>
            </div>
            <div className="text-[#858585] text-[11px]">
              Patient ID: <code className="font-mono text-[#171717] dark:text-[#F0F0F0] font-semibold">{userId ? `${userId.substring(0, 8)}...` : 'N/A'}</code>
            </div>
          </div>
        </div>

        {/* 2. CLINICAL SUMMARY TELEMETRY ROW (White cards with thin red borders) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <Card radius="lg" className="p-5 flex flex-col justify-between space-y-3 bg-white dark:bg-[#1E1E1E] border-[#D98A91]/80 dark:border-[#422225]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B4232F] dark:text-[#E04855]">
                Lab Reports
              </span>
              <DoodleIcon name="file" className="w-4 h-4 text-[#B4232F] dark:text-[#E04855]" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#171717] dark:text-[#F0F0F0] font-mono">
                {String(recentReports.length).padStart(2, '0')}
              </div>
              <p className="text-[11px] text-[#5F6368] dark:text-[#A0A0A0] mt-0.5">
                {recentReports.length === 1 ? '1 archived record' : `${recentReports.length} archived records`}
              </p>
            </div>
          </Card>

          <Card radius="lg" className="p-5 flex flex-col justify-between space-y-3 bg-white dark:bg-[#1E1E1E] border-[#D98A91]/80 dark:border-[#422225]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B4232F] dark:text-[#E04855]">
                Family Members
              </span>
              <DoodleIcon name="tree" className="w-4 h-4 text-[#B4232F] dark:text-[#E04855]" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#171717] dark:text-[#F0F0F0] font-mono">
                {String(familyCount).padStart(2, '0')}
              </div>
              <p className="text-[11px] text-[#5F6368] dark:text-[#A0A0A0] mt-0.5">
                {familyCount === 1 ? '1 linked relative' : `${familyCount} linked relatives`}
              </p>
            </div>
          </Card>

          <Card radius="lg" className="p-5 flex flex-col justify-between space-y-3 bg-white dark:bg-[#1E1E1E] border-[#D98A91]/80 dark:border-[#422225]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B4232F] dark:text-[#E04855]">
                Latest Ingestion
              </span>
              <DoodleIcon name="calendar" className="w-4 h-4 text-[#B4232F] dark:text-[#E04855]" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-bold text-[#171717] dark:text-[#F0F0F0] truncate">
                {latestReportDate}
              </div>
              <p className="text-[11px] text-[#5F6368] dark:text-[#A0A0A0] mt-0.5">
                {recentReports.length > 0 ? 'Verified clinical data' : 'No reports yet'}
              </p>
            </div>
          </Card>
        </div>

        {/* 3. PRIMARY ACTIONS */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/upload')}
            leftIcon={<DoodleIcon name="upload" className="w-4 h-4 text-white" />}
          >
            Upload New Report
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate('/family-tree')}
            className="border-[#D98A91]/80 hover:border-[#B4232F]"
            leftIcon={<DoodleIcon name="tree" className="w-4 h-4 text-[#B4232F]" />}
          >
            Family Tree ({familyCount})
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate('/doctor-portal')}
            className="border-[#D98A91]/80 hover:border-[#B4232F]"
            leftIcon={<DoodleIcon name="stethoscope" className="w-4 h-4 text-[#B4232F]" />}
          >
            Doctor Portal
          </Button>
        </div>
      </div>

      {/* 4. CLINICAL BIOMARKER TABLE SECTION */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-base sm:text-lg font-bold text-[#B4232F] dark:text-[#E04855] tracking-tight">
                Recent Biomarkers
              </h2>
              {recentMeasurements.length > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-[4px] bg-[#FCEBED] text-[#B4232F] border border-[#E8B4B9] dark:bg-[#2D1416] dark:text-[#E04855]">
                  {recentMeasurements.length} measurements
                </span>
              )}
            </div>
            <p className="text-xs text-[#5F6368] dark:text-[#A0A0A0] mt-0.5">
              Observed measurements and diagnostic reference bounds from your latest laboratory report
            </p>
          </div>
          
          {recentMeasurements.length > 0 && abnormalCount > 0 && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-[6px] bg-[#FCEBED] text-[#B4232F] border border-[#E8B4B9] text-xs font-semibold self-start sm:self-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B4232F]" />
              <span>{abnormalCount} flagged for review</span>
            </div>
          )}
        </div>

        {loadingData ? (
          <Card radius="lg" className="p-8 text-center space-y-2 bg-white dark:bg-[#1E1E1E] border border-[#D98A91]/80 dark:border-[#303030]">
            <div className="w-5 h-5 mx-auto rounded-full border-2 border-[#B4232F] border-t-transparent animate-spin" />
            <p className="text-xs text-[#858585]">Loading biomarker records...</p>
          </Card>
        ) : recentMeasurements.length > 0 ? (
          <Card radius="lg" className="overflow-hidden bg-white dark:bg-[#1E1E1E] border border-[#D98A91]/80 dark:border-[#422225]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E3E3DF] dark:border-[#303030] bg-[#F7F7F5] dark:bg-[#222222] text-[11px] font-semibold uppercase tracking-wider text-[#5F6368] dark:text-[#A0A0A0]">
                    <th className="py-3 px-4 min-w-[180px] sticky left-0 bg-[#F7F7F5] dark:bg-[#222222] z-10">
                      Biomarker Test
                    </th>
                    <th className="py-3 px-4 min-w-[150px]">Standard Mapping</th>
                    <th className="py-3 px-4 text-right min-w-[130px]">Observed Value</th>
                    <th className="py-3 px-4 min-w-[140px]">Reference Range</th>
                    <th className="py-3 px-4 text-center min-w-[110px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E7E4] dark:divide-[#282828]">
                  {recentMeasurements.map((m, idx) => {
                    const badgeInfo = mapStatusToBadge(m.abnormality_flag);
                    return (
                      <tr
                        key={m.id || idx}
                        className={`hover:bg-[#FCFCFB] dark:hover:bg-[#222222] transition-colors ${
                          badgeInfo.isAbnormal ? 'bg-[#FFF9F9] dark:bg-[#1E191A]' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-semibold text-[#171717] dark:text-[#F0F0F0] text-xs sticky left-0 bg-white dark:bg-[#1E1E1E] z-10">
                          {m.raw_test_name || m.test_name || '—'}
                        </td>
                        <td className="py-3 px-4 text-[#5F6368] dark:text-[#858585] text-xs">
                          {m.canonical_test_name || 'Standard Mapping'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-xs text-[#171717] dark:text-[#F0F0F0]">
                          <span className={badgeInfo.isAbnormal ? 'text-[#B4232F] dark:text-[#E04855]' : ''}>
                            {m.value !== undefined && m.value !== null ? m.value : '—'}
                          </span>{' '}
                          <span className="text-[11px] text-[#858585] font-normal">
                            {m.unit || ''}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#5F6368] dark:text-[#A0A0A0]">
                          {m.reference_range || 'Standard Range'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge status={badgeInfo.status} size="sm" dot>
                            {badgeInfo.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <EmptyState
            icon={<DoodleIcon name="file" className="w-5 h-5" />}
            title="No Lab Measurements Recorded Yet"
            description="Upload your first clinical lab report or enter measurements manually to begin tracking your biomarkers."
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/upload')}
                leftIcon={<DoodleIcon name="upload" className="w-3.5 h-3.5 text-white" />}
              >
                Upload Lab Document
              </Button>
            }
          />
        )}
      </div>

      {/* 5. STRUCTURED CLINICAL PREVIEW MODULES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
        
        {/* MODULE 1: Longitudinal Health Index */}
        <Card radius="lg" className="flex flex-col justify-between p-5 space-y-4 bg-white dark:bg-[#1E1E1E] border-[#D98A91]/80 dark:border-[#422225]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B4232F] dark:text-[#E04855]">
                Analytics
              </span>
              <Badge status="brand" size="sm">v2.2 Preview</Badge>
            </div>
            <h3 className="text-sm font-bold text-[#B4232F] dark:text-[#E04855]">
              Longitudinal Health Index
            </h3>
            <p className="text-xs text-[#5F6368] dark:text-[#A0A0A0] leading-relaxed">
              Biomarker trajectory models evaluating multi-report lab readings against standard clinical reference cohorts.
            </p>
          </div>
          <div className="pt-3 border-t border-[#E3E3DF] dark:border-[#303030] text-[11px] text-[#858585] flex items-center justify-between">
            <span>Model Calibration</span>
            <span className="font-semibold text-[#171717] dark:text-[#F0F0F0]">Active Tracking</span>
          </div>
        </Card>

        {/* MODULE 2: Hereditary Risk Engine */}
        <Card radius="lg" className="flex flex-col justify-between p-5 space-y-4 bg-white dark:bg-[#1E1E1E] border-[#D98A91]/80 dark:border-[#422225]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B4232F] dark:text-[#E04855]">
                Hereditary
              </span>
              <Badge status="brand" size="sm">Pedigree AI</Badge>
            </div>
            <h3 className="text-sm font-bold text-[#B4232F] dark:text-[#E04855]">
              Hereditary Risk Engine
            </h3>
            <p className="text-xs text-[#5F6368] dark:text-[#A0A0A0] leading-relaxed">
              Kinship-weighted pedigree evaluation highlighting multi-generational cardiovascular, metabolic, and glycemic patterns.
            </p>
          </div>
          <div className="pt-3 border-t border-[#E3E3DF] dark:border-[#303030] text-[11px] text-[#858585] flex items-center justify-between">
            <span>Pedigree Network</span>
            <span className="font-semibold text-[#B4232F] dark:text-[#E04855]">{familyCount} Linked</span>
          </div>
        </Card>

        {/* MODULE 3: Pathology Correlation Matrix */}
        <Card radius="lg" className="flex flex-col justify-between p-5 space-y-4 bg-white dark:bg-[#1E1E1E] border-[#D98A91]/80 dark:border-[#422225]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B4232F] dark:text-[#E04855]">
                Provider
              </span>
              <Badge status="brand" size="sm">Doctor Portal</Badge>
            </div>
            <h3 className="text-sm font-bold text-[#B4232F] dark:text-[#E04855]">
              Clinical Pathology Panels
            </h3>
            <p className="text-xs text-[#5F6368] dark:text-[#A0A0A0] leading-relaxed">
              Dedicated organ-system pathology panels (Lipid, Glycemic, Renal, Hepatic) configured for physician review.
            </p>
          </div>
          <div className="pt-3 border-t border-[#E3E3DF] dark:border-[#303030] text-[11px] text-[#858585] flex items-center justify-between">
            <span>Provider View</span>
            <button
              onClick={() => navigate('/doctor-portal')}
              className="font-semibold text-[#B4232F] dark:text-[#E04855] hover:underline cursor-pointer"
            >
              Open Workstation →
            </button>
          </div>
        </Card>

      </div>
    </div>
  );
}

export default DashboardPage;
