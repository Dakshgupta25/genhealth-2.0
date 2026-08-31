import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DoodleIcon from '../components/common/DoodleIcon';
import { Card, Badge } from '../components/ui';
import PendingClaimsBanner from '../components/family/PendingClaimsBanner';
import HereditaryRiskPanel from '../components/hereditary/HereditaryRiskPanel';

export function DashboardPage() {
  const { user, userId, selectedHospital } = useAuth();
  const navigate = useNavigate();

  const hospitalScopeName =
    selectedHospital === 'city_general'
      ? 'City General Hospital'
      : selectedHospital === 'memorial_clinic'
      ? 'Memorial Diagnostic'
      : selectedHospital === 'apex_labs'
      ? 'Apex Clinical Labs'
      : 'All Facilities';

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
      </div>

      {/* 2. Integrated Hereditary Risk & Disease Intelligence Panel */}
      {userId && <HereditaryRiskPanel userId={userId} />}

      {/* 3. STRUCTURED CLINICAL PREVIEW MODULES */}
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
            <button
              onClick={() => navigate('/family-tree')}
              className="font-semibold text-[#B4232F] dark:text-[#E04855] hover:underline cursor-pointer"
            >
              Open Family Tree →
            </button>
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
