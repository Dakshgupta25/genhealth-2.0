import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserRecentReports, getReportResults } from '../api/reports';
import { getFamilyMembers } from '../api/family';
import DoodleIcon from '../components/common/DoodleIcon';
import { Button, Badge, Card, EmptyState } from '../components/ui';

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

  const hospitalScopeName =
    selectedHospital === 'city_general'
      ? 'City General Hospital'
      : selectedHospital === 'memorial_clinic'
      ? 'Memorial Diagnostic'
      : selectedHospital === 'apex_labs'
      ? 'Apex Clinical Labs'
      : 'All Connected Facilities';

  const latestReportDate =
    recentReports.length > 0 && recentReports[0].report_date
      ? new Date(recentReports[0].report_date).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : 'No reports yet';

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* 1. HERO CLINICAL SUMMARY BANNER */}
      <Card radius="xl" className="overflow-hidden relative">
        <div className="p-6 sm:p-8 space-y-6 relative z-10">
          
          {/* Top Row: Hospital Scope Badge & User Welcome */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md text-xs font-semibold bg-[#EDF1ED] dark:bg-[#1A2421] text-[#0D5446] dark:text-[#3BB298] border border-[#D6DDD6] dark:border-[#2A3B34] w-fit">
              <DoodleIcon name="hospital" className="w-3.5 h-3.5" />
              <span>Scope: {hospitalScopeName}</span>
            </div>

            <span className="text-xs text-[#586D66] dark:text-[#7C9184]">
              User ID: <code className="font-mono text-[#0D5446] dark:text-[#3BB298] font-semibold">{userId ? `${userId.substring(0, 8)}...` : 'N/A'}</code>
            </span>
          </div>

          {/* Banner Title & Description */}
          <div className="space-y-2 max-w-3xl">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#11231E] dark:text-[#ECF2EE]">
              Health Overview &amp; Clinical Diagnostics
            </h1>
            <p className="text-sm text-[#334740] dark:text-[#B2C2B8] leading-relaxed">
              Welcome, <strong className="text-[#11231E] dark:text-[#ECF2EE] font-semibold">{user?.full_name || 'Patient'}</strong>. Monitor your longitudinal biomarker trends, ingest clinical lab sheets with AI entity extraction, and evaluate family health genetics.
            </p>
          </div>

          {/* Quick Metric Counters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-2">
            <div className="p-3.5 rounded-lg bg-[#EDF1ED] dark:bg-[#1A2421] border border-[#D6DDD6] dark:border-[#2A3B34] flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#E3EFE9] text-[#0D5446] dark:bg-[#1A332B] dark:text-[#3BB298] shrink-0">
                <DoodleIcon name="file" className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#586D66] dark:text-[#7C9184]">
                  Lab Reports
                </span>
                <p className="text-sm font-bold text-[#11231E] dark:text-[#ECF2EE] font-mono">
                  {recentReports.length} {recentReports.length === 1 ? 'record' : 'records'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#EDF1ED] dark:bg-[#1A2421] border border-[#D6DDD6] dark:border-[#2A3B34] flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#E3EFE9] text-[#0D5446] dark:bg-[#1A332B] dark:text-[#3BB298] shrink-0">
                <DoodleIcon name="tree" className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#586D66] dark:text-[#7C9184]">
                  Linked Relatives
                </span>
                <p className="text-sm font-bold text-[#11231E] dark:text-[#ECF2EE] font-mono">
                  {familyCount} {familyCount === 1 ? 'member' : 'members'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#EDF1ED] dark:bg-[#1A2421] border border-[#D6DDD6] dark:border-[#2A3B34] flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#F3E8FF] text-[#6B21A8] dark:bg-[rgba(168,85,247,0.12)] dark:text-[#C084FC] shrink-0">
                <DoodleIcon name="calendar" className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#586D66] dark:text-[#7C9184]">
                  Latest Ingestion
                </span>
                <p className="text-sm font-bold text-[#11231E] dark:text-[#ECF2EE] truncate">
                  {latestReportDate}
                </p>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/upload')}
              leftIcon={<DoodleIcon name="upload" className="w-4 h-4" />}
            >
              Upload New Lab Report
            </Button>

            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/family-tree')}
              leftIcon={<DoodleIcon name="tree" className="w-4 h-4 text-[#0D5446] dark:text-[#3BB298]" />}
            >
              Family Tree ({familyCount} linked)
            </Button>

            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/doctor-portal')}
              leftIcon={<DoodleIcon name="stethoscope" className="w-4 h-4 text-[#6B21A8] dark:text-[#C084FC]" />}
            >
              Doctor Portal
            </Button>
          </div>
        </div>
      </Card>

      {/* 2. MEASUREMENT SUMMARY (Real Data from Ingestion Pipeline) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h2 className="text-lg font-bold text-[#11231E] dark:text-[#ECF2EE] tracking-tight">
              Recent Clinical Measurements
            </h2>
            <p className="text-xs text-[#586D66] dark:text-[#7C9184]">
              Extracted biomarker values and abnormality reference bounds from your latest lab records
            </p>
          </div>
          {recentReports.length > 0 && (
            <span className="text-xs font-mono text-[#586D66] dark:text-[#7C9184]">
              Displaying latest {recentMeasurements.length} measures
            </span>
          )}
        </div>

        {loadingData ? (
          <Card radius="lg" className="p-8 text-center space-y-2">
            <div className="w-6 h-6 mx-auto rounded-full border-2 border-[#1D7A68] border-t-[#0D5446] animate-spin" />
            <p className="text-xs text-[#586D66] dark:text-[#7C9184]">Loading clinical records...</p>
          </Card>
        ) : recentMeasurements.length > 0 ? (
          <Card radius="lg" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#D0D9D0] dark:border-[#2A3B34] bg-[#EDF1ED]/90 dark:bg-[#1A2421]/90 text-[11px] font-bold uppercase tracking-wider text-[#586D66] dark:text-[#7C9184]">
                    <th className="py-3 px-4 sticky left-0 bg-[#EDF1ED] dark:bg-[#1A2421] z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.06)] min-w-[150px]">
                      Biomarker Test
                    </th>
                    <th className="py-3 px-4 min-w-[140px]">Canonical Mapping</th>
                    <th className="py-3 px-4 min-w-[120px]">Observed Value</th>
                    <th className="py-3 px-4 min-w-[130px]">Reference Range</th>
                    <th className="py-3 px-4 text-center min-w-[100px]">Status Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF1ED] dark:divide-[#1A2421]">
                  {recentMeasurements.map((m, idx) => {
                    const badgeInfo = mapStatusToBadge(m.abnormality_flag);
                    return (
                      <tr
                        key={m.id || idx}
                        className="hover:bg-[#F5F7F5] dark:hover:bg-[#1A2421]/60 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-bold text-[#11231E] dark:text-[#ECF2EE] text-sm sticky left-0 bg-white dark:bg-[#141C19] z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.06)]">
                          {m.raw_test_name || m.test_name || '—'}
                        </td>
                        <td className="py-3.5 px-4 italic text-[#586D66] dark:text-[#7C9184]">
                          {m.canonical_test_name || 'Standard Mapping'}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-sm text-[#11231E] dark:text-[#ECF2EE]">
                          {m.value !== undefined && m.value !== null ? m.value : '—'}{' '}
                          <span className="text-xs text-[#586D66] dark:text-[#7C9184] font-normal">
                            {m.unit || ''}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-[#334740] dark:text-[#B2C2B8]">
                          {m.reference_range || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Badge status={badgeInfo.status} size="sm">
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
            description="Upload your first clinical lab report or enter measurements manually to start tracking your biomarkers."
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/upload')}
                leftIcon={<DoodleIcon name="upload" className="w-3.5 h-3.5" />}
              >
                Upload Lab Document
              </Button>
            }
          />
        )}
      </div>

      {/* 3. THREE-COLUMN STRUCTURED PREVIEW MODULES (Clear In-Development States) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        
        {/* MODULE 1: Longitudinal Health Index */}
        <Card radius="lg" className="flex flex-col justify-between">
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#E3EFE9] text-[#0D5446] dark:bg-[#1A332B] dark:text-[#3BB298]">
                <DoodleIcon name="chart-line" className="w-4 h-4" />
              </div>
              <Badge status="neutral" size="sm">Coming in v2.2</Badge>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#11231E] dark:text-[#ECF2EE]">
                Longitudinal Health Index
              </h3>
              <p className="text-xs text-[#586D66] dark:text-[#7C9184] leading-relaxed">
                Aggregated chronological trend score evaluating multivariable biomarkers against standard epidemiological risk models.
              </p>
            </div>
          </div>

          <div className="p-4 bg-[#EDF1ED]/50 dark:bg-[#1A2421]/40 border-t border-[#D0D9D0]/60 dark:border-[#2A3B34]/60 text-xs text-[#586D66] dark:text-[#7C9184] flex items-center justify-between">
            <span>Model Validation</span>
            <span className="font-mono text-[11px] font-semibold text-[#0D5446] dark:text-[#3BB298]">In Development</span>
          </div>
        </Card>

        {/* MODULE 2: Hereditary Risk Indicator */}
        <Card radius="lg" className="flex flex-col justify-between">
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#E3EFE9] text-[#0D5446] dark:bg-[#1A332B] dark:text-[#3BB298]">
                <DoodleIcon name="dna" className="w-4 h-4" />
              </div>
              <Badge status="neutral" size="sm">Kinship AI</Badge>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#11231E] dark:text-[#ECF2EE]">
                Hereditary Risk Engine
              </h3>
              <p className="text-xs text-[#586D66] dark:text-[#7C9184] leading-relaxed">
                Kinship-weighted probability assessment highlighting multi-generational cardiovascular and metabolic predispositions.
              </p>
            </div>
          </div>

          <div className="p-4 bg-[#EDF1ED]/50 dark:bg-[#1A2421]/40 border-t border-[#D0D9D0]/60 dark:border-[#2A3B34]/60 text-xs text-[#586D66] dark:text-[#7C9184] flex items-center justify-between">
            <span>Pedigree Analysis</span>
            <span className="font-mono text-[11px] font-semibold text-[#0D5446] dark:text-[#3BB298]">Active Network ({familyCount})</span>
          </div>
        </Card>

        {/* MODULE 3: Pathology Correlation Matrix */}
        <Card radius="lg" className="flex flex-col justify-between">
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#E3EFE9] text-[#0D5446] dark:bg-[#1A332B] dark:text-[#3BB298]">
                <DoodleIcon name="stethoscope" className="w-4 h-4" />
              </div>
              <Badge status="purple" size="sm">Doctor Portal</Badge>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#11231E] dark:text-[#ECF2EE]">
                Clinical Pathology Panels
              </h3>
              <p className="text-xs text-[#586D66] dark:text-[#7C9184] leading-relaxed">
                Specialized disease panels (Cardiovascular, Diabetes, Renal, Hepatic) for comprehensive physician consultations.
              </p>
            </div>
          </div>

          <div className="p-4 bg-[#EDF1ED]/50 dark:bg-[#1A2421]/40 border-t border-[#D0D9D0]/60 dark:border-[#2A3B34]/60 text-xs text-[#586D66] dark:text-[#7C9184] flex items-center justify-between">
            <span>Provider Interface</span>
            <button
              onClick={() => navigate('/doctor-portal')}
              className="text-xs font-bold text-[#0D5446] dark:text-[#3BB298] hover:underline"
            >
              Open Portal →
            </button>
          </div>
        </Card>

      </div>
    </div>
  );
}

export default DashboardPage;
