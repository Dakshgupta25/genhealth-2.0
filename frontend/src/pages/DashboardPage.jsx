import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserRecentReports, getReportResults } from '../api/reports';
import { getFamilyMembers } from '../api/family';
import DoodleIcon from '../components/common/DoodleIcon';

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
      
      {/* 1. HEALTH OVERVIEW HERO BANNER */}
      <div className="p-8 md:p-10 rounded-3xl border shadow-sm relative overflow-hidden transition-all"
           style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
        <div className="max-w-2xl space-y-4 relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold"
               style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-accent)' }}>
            <DoodleIcon name="hospital" className="w-3.5 h-3.5" />
            <span>Hospital Scope: {selectedHospital === 'general' ? 'General / All Facilities' : selectedHospital}</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Health Overview & Diagnostics
          </h1>

          <p className="text-sm md:text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Welcome, <strong className="text-indigo-600 dark:text-indigo-400">{user?.full_name || 'Patient'}</strong>. Ingest lab documents, monitor longitudinal biomarker trends, and manage your connected family health records.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/upload')}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-md flex items-center space-x-2 transition-all active:scale-95"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              <DoodleIcon name="upload" className="w-4 h-4" />
              <span>Upload New Lab Report</span>
            </button>

            <button
              onClick={() => navigate('/family-tree')}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold border transition-all hover:opacity-80 flex items-center space-x-2"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <DoodleIcon name="tree" className="w-4 h-4" />
              <span>Family Tree ({familyCount} linked)</span>
            </button>

            <button
              onClick={() => navigate('/doctor-portal')}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold border transition-all hover:opacity-80 flex items-center space-x-2"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <DoodleIcon name="stethoscope" className="w-4 h-4" />
              <span>Doctor Portal</span>
            </button>
          </div>
        </div>

        {/* Decorative doodle in hero background */}
        <div className="absolute right-6 bottom-4 opacity-5 pointer-events-none">
          <DoodleIcon name="heartbeat" className="w-56 h-56" />
        </div>
      </div>

      {/* 2. MEASUREMENT SUMMARY (Real Data from Ingestion Pipeline) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Measurement Summary</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Real extracted clinical measurements from your latest uploaded lab records
            </p>
          </div>
          {recentReports.length > 0 && (
            <span className="text-xs font-mono text-slate-400">
              {recentReports.length} {recentReports.length === 1 ? 'report record' : 'report records'}
            </span>
          )}
        </div>

        {loadingData ? (
          <div className="p-8 rounded-3xl border shadow-sm text-center space-y-2"
               style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
            <div className="w-6 h-6 mx-auto rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin" />
            <p className="text-xs text-slate-400">Loading measurement records...</p>
          </div>
        ) : recentMeasurements.length > 0 ? (
          <div className="rounded-3xl border shadow-sm overflow-hidden"
               style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b font-bold tracking-wider uppercase text-[10px]"
                      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th className="py-3 px-4">Biomarker Test</th>
                    <th className="py-3 px-4">Canonical Mapping</th>
                    <th className="py-3 px-4">Observed Value</th>
                    <th className="py-3 px-4">Reference Range</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {recentMeasurements.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-500/5 transition-colors">
                      <td className="py-3 px-4 font-bold" style={{ color: 'var(--text-primary)' }}>
                        {m.raw_test_name}
                      </td>
                      <td className="py-3 px-4 italic text-slate-500 dark:text-slate-400">
                        {m.canonical_test_name || 'Standard'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        {m.value} {m.unit || ''}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {m.reference_range || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${getAbnormalityBadge(m.abnormality_flag)}`}>
                          {m.abnormality_flag}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-3xl border border-dashed text-center space-y-3"
               style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
            <div className="w-10 h-10 mx-auto rounded-2xl flex items-center justify-center"
                 style={{ backgroundColor: 'var(--brand-soft-blue)', color: 'var(--brand-primary)' }}>
              <DoodleIcon name="file" className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold">No Lab Measurements Recorded Yet</h4>
            <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
              Upload your first lab report or enter measurements manually to start tracking your clinical biomarkers.
            </p>
            <button
              onClick={() => navigate('/upload')}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              Upload Lab Document
            </button>
          </div>
        )}
      </div>

      {/* 3. THREE-COLUMN STRUCTURED MODULES: Health Score, Predictions, Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* MODULE 1: Health Score & Index (Structure with Clear Empty State) */}
        <div className="p-6 rounded-3xl border shadow-sm space-y-4 flex flex-col justify-between"
             style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                   style={{ backgroundColor: 'var(--brand-soft-blue)', color: 'var(--brand-primary)' }}>
                <DoodleIcon name="heartbeat" className="w-5 h-5" />
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                In Development
              </span>
            </div>

            <h3 className="text-base font-bold">Longitudinal Health Index</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Multi-dimensional composite scoring model derived from longitudinal blood biomarkers and vital indices.
            </p>
          </div>

          {/* Structured Score Gauge Placeholder */}
          <div className="p-6 rounded-2xl border text-center space-y-2"
               style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
            <div className="w-16 h-16 mx-auto rounded-full border-4 border-dashed border-indigo-300 dark:border-indigo-800 flex items-center justify-center">
              <span className="text-xs font-mono font-bold text-slate-400">-- / 100</span>
            </div>
            <p className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Scoring calibration awaiting machine learning pipeline activation.
            </p>
          </div>
        </div>

        {/* MODULE 2: Disease Predictions & Risk Matrix (Structure with Clear Empty State) */}
        <div className="p-6 rounded-3xl border shadow-sm space-y-4 flex flex-col justify-between"
             style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                   style={{ backgroundColor: 'var(--brand-soft-blue)', color: 'var(--brand-primary)' }}>
                <DoodleIcon name="dna" className="w-5 h-5" />
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                In Development
              </span>
            </div>

            <h3 className="text-base font-bold">Predictive Risk Matrix</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Genetic & biomarker risk modeling for metabolic, cardiovascular, and renal pathologies.
            </p>
          </div>

          {/* Structured Predictions Grid Placeholder */}
          <div className="p-4 rounded-2xl border space-y-2 text-xs"
               style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center justify-between text-slate-400">
              <span>Cardiovascular Risk:</span>
              <span className="font-mono">--</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Metabolic Syndrome:</span>
              <span className="font-mono">--</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Kidney Progression:</span>
              <span className="font-mono">--</span>
            </div>
            <p className="text-[10px] pt-1 text-slate-400 italic">
              AI predictive inference endpoints will populate this matrix once trained.
            </p>
          </div>
        </div>

        {/* MODULE 3: Personalized Recommendations (Structure with Clear Empty State) */}
        <div className="p-6 rounded-3xl border shadow-sm space-y-4 flex flex-col justify-between"
             style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                   style={{ backgroundColor: 'var(--brand-soft-blue)', color: 'var(--brand-primary)' }}>
                <DoodleIcon name="stethoscope" className="w-5 h-5" />
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                In Development
              </span>
            </div>

            <h3 className="text-base font-bold">Clinical Recommendations</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Evidence-based lifestyle, dietary, and diagnostic follow-up suggestions tailored to observed lab flags.
            </p>
          </div>

          {/* Structured Guidance Placeholder */}
          <div className="p-5 rounded-2xl border text-center space-y-2"
               style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
            <DoodleIcon name="pill" className="w-5 h-5 mx-auto text-slate-400" />
            <p className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Personalized clinical guidance engine will activate once decision algorithms are connected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
