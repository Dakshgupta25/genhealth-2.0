import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserRecentReports, getReportResults } from '../api/reports';
import { getFamilyMembers } from '../api/family';
import DoodleIcon from '../components/common/DoodleIcon';
import { Button, Badge, Card, CardHeader, CardTitle, CardDescription, CardContent, EmptyState } from '../components/ui';

export function DashboardPage() {
  const { user, userId, selectedHospital } = useAuth();
  const navigate = useNavigate();

  const [recentReports, setRecentReports] = useState([]);
  const [recentMeasurements, setRecentMeasurements] = useState([]);
  const [familyCount, setFamilyCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!userId) return;
    setLoadingData(true);
    try {
      // 1. Fetch user's recent reports
      const reports = await getUserRecentReports(userId);
      setRecentReports(reports);

      // 2. Fetch latest measurements from the most recent report if available
      if (reports.length > 0) {
        const latestReportId = reports[0].id;
        const results = await getReportResults(latestReportId);
        setRecentMeasurements(results.slice(0, 6)); // Top 6 measurements
      } else {
        setRecentMeasurements([]);
      }

      // 3. Fetch family member count
      const family = await getFamilyMembers(userId);
      setFamilyCount(family.length);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoadingData(false);
    }
  }, [userId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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

  const latestReportDate =
    recentReports.length > 0 && recentReports[0].created_at
      ? new Date(recentReports[0].created_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'None recorded';

  const hospitalScopeName =
    selectedHospital === 'general' ? 'General / All Facilities' : selectedHospital;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      
      {/* 1. COMPACT HEALTH OVERVIEW HERO BANNER */}
      <Card radius="xl" className="overflow-hidden relative">
        <div className="p-6 sm:p-8 space-y-6 relative z-10">
          
          {/* Top Row: Hospital Scope Badge & User Welcome */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 w-fit">
              <DoodleIcon name="hospital" className="w-3.5 h-3.5" />
              <span>Scope: {hospitalScopeName}</span>
            </div>

            <span className="text-xs text-slate-500 dark:text-slate-400">
              User ID: <code className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">{userId ? `${userId.substring(0, 8)}...` : 'N/A'}</code>
            </span>
          </div>

          {/* Banner Title & Description */}
          <div className="space-y-2 max-w-3xl">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Health Overview &amp; Clinical Diagnostics
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Welcome, <strong className="text-slate-900 dark:text-slate-100 font-semibold">{user?.full_name || 'Patient'}</strong>. Monitor your longitudinal biomarker trends, ingest clinical lab sheets with AI entity extraction, and evaluate family health genetics.
            </p>
          </div>

          {/* Quick Metric Counters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-2">
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300 shrink-0">
                <DoodleIcon name="file" className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Lab Reports
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {recentReports.length} {recentReports.length === 1 ? 'record' : 'records'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                <DoodleIcon name="tree" className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Linked Relatives
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {familyCount} {familyCount === 1 ? 'member' : 'members'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 shrink-0">
                <DoodleIcon name="calendar" className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Latest Ingestion
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
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
              leftIcon={<DoodleIcon name="tree" className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            >
              Family Tree ({familyCount} linked)
            </Button>

            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/doctor-portal')}
              leftIcon={<DoodleIcon name="stethoscope" className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
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
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 tracking-tight">
              Recent Clinical Measurements
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Extracted biomarker values and abnormality reference bounds from your latest lab records
            </p>
          </div>
          {recentReports.length > 0 && (
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Displaying latest {recentMeasurements.length} measures
            </span>
          )}
        </div>

        {loadingData ? (
          <Card radius="lg" className="p-8 text-center space-y-2">
            <div className="w-6 h-6 mx-auto rounded-full border-2 border-cyan-400 border-t-cyan-600 animate-spin" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Loading clinical records...</p>
          </Card>
        ) : recentMeasurements.length > 0 ? (
          <Card radius="lg" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/90 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.06)] min-w-[150px]">
                      Biomarker Test
                    </th>
                    <th className="py-3 px-4 min-w-[140px]">Canonical Mapping</th>
                    <th className="py-3 px-4 min-w-[120px]">Observed Value</th>
                    <th className="py-3 px-4 min-w-[130px]">Reference Range</th>
                    <th className="py-3 px-4 text-center min-w-[100px]">Status Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {recentMeasurements.map((m, idx) => {
                    const badgeInfo = mapStatusToBadge(m.abnormality_flag);
                    return (
                      <tr
                        key={m.id || idx}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 text-sm sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.06)]">
                          {m.raw_test_name || m.test_name || '—'}
                        </td>
                        <td className="py-3.5 px-4 italic text-slate-500 dark:text-slate-400">
                          {m.canonical_test_name || 'Standard Mapping'}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-sm text-slate-900 dark:text-slate-50">
                          {m.value !== undefined && m.value !== null ? m.value : '—'}{' '}
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                            {m.unit || ''}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
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
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                <DoodleIcon name="heartbeat" className="w-4 h-4" />
              </div>
              <Badge status="neutral" size="sm">In Development</Badge>
            </div>
            <CardTitle className="pt-2">Longitudinal Health Index</CardTitle>
            <CardDescription>
              Multi-dimensional composite scoring model derived from longitudinal blood biomarkers and vital indices.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            <div className="p-5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center">
                <span className="text-xs font-mono font-bold text-slate-400">-- / 100</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Scoring calibration awaiting machine learning model validation.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* MODULE 2: Predictive Risk Matrix */}
        <Card radius="lg" className="flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <DoodleIcon name="dna" className="w-4 h-4" />
              </div>
              <Badge status="neutral" size="sm">In Development</Badge>
            </div>
            <CardTitle className="pt-2">Predictive Risk Matrix</CardTitle>
            <CardDescription>
              Genetic &amp; biomarker risk modeling for metabolic, cardiovascular, and renal pathologies.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Cardiovascular Risk:</span>
                <span className="font-mono font-semibold">--</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Metabolic Syndrome:</span>
                <span className="font-mono font-semibold">--</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Renal Progression:</span>
                <span className="font-mono font-semibold">--</span>
              </div>
              <p className="text-[10px] pt-1 text-slate-400 italic">
                AI predictive inference endpoints will populate this matrix once connected.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* MODULE 3: Clinical Recommendations */}
        <Card radius="lg" className="flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                <DoodleIcon name="stethoscope" className="w-4 h-4" />
              </div>
              <Badge status="neutral" size="sm">In Development</Badge>
            </div>
            <CardTitle className="pt-2">Clinical Recommendations</CardTitle>
            <CardDescription>
              Evidence-based lifestyle, dietary, and diagnostic follow-up suggestions tailored to observed lab flags.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            <div className="p-5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-center space-y-2">
              <div className="w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-800">
                <DoodleIcon name="pill" className="w-4 h-4" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Personalized clinical guidance engine will activate once decision algorithms are connected.
              </p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

export default DashboardPage;
