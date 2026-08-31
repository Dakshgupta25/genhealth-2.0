import React from 'react';
import DoodleIcon from '../common/DoodleIcon';
import { Card, Badge } from '../ui';

export function HealthScoreWidget({ assessment, diseasesList = [], isFamilyMode = true }) {
  if (!assessment || !assessment.diseases) {
    return null;
  }

  const diseases = assessment.diseases;
  const diseaseKeys = Object.keys(diseases);

  // Filter diseases that have sufficient data
  const sufficientDiseases = diseaseKeys.filter(
    (k) => diseases[k]?.is_sufficient_data !== false
  );

  // Compute composite score (0 - 100):
  // Average risk across evaluated diseases inverted to a health score (1.0 risk = 0 health, 0.0 risk = 100 health)
  let compositeHealthScore = 100;
  let averageRisk = 0;

  if (sufficientDiseases.length > 0) {
    const totalRisk = sufficientDiseases.reduce((sum, k) => {
      const d = diseases[k];
      const riskVal = isFamilyMode
        ? (d.heuristic_combined_risk_signal ?? d.combined_risk_signal ?? d.rule_based_risk_score ?? 0)
        : (d.rule_based_risk_score ?? 0);
      return sum + riskVal;
    }, 0);

    averageRisk = totalRisk / sufficientDiseases.length;
    // Composite Health Score = (1 - averageRisk) * 100
    compositeHealthScore = Math.max(0, Math.min(100, Math.round((1 - averageRisk) * 100)));
  }

  // Determine category & styling
  let categoryLabel = 'Optimal';
  let categoryBadgeStatus = 'normal';
  let categoryColor = '#1E4D45'; // Teal/Green
  let ringStrokeColor = '#1E4D45';

  if (compositeHealthScore >= 80) {
    categoryLabel = 'Optimal Health';
    categoryBadgeStatus = 'normal';
    categoryColor = '#1E4D45';
    ringStrokeColor = '#2E7D32';
  } else if (compositeHealthScore >= 60) {
    categoryLabel = 'Moderate Risk Detected';
    categoryBadgeStatus = 'warning';
    categoryColor = '#D97706';
    ringStrokeColor = '#D97706';
  } else {
    categoryLabel = 'Elevated Risk Factors';
    categoryBadgeStatus = 'critical';
    categoryColor = '#B4232F';
    ringStrokeColor = '#B4232F';
  }

  // Circumference calculation for circular gauge (radius = 42, circumference = 2 * PI * 42 = 263.89)
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (compositeHealthScore / 100) * circumference;

  const evaluatedCount = sufficientDiseases.length;
  const insufficientCount = diseaseKeys.length - evaluatedCount;

  return (
    <Card
      radius="lg"
      className="p-5 flex flex-col justify-between space-y-4 bg-white dark:bg-[#1E1E1E] border border-[#CBD6D2] dark:border-[#383838] shadow-xs relative overflow-hidden"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E4D45] dark:text-[#57BA8E]">
            Composite Health Score
          </span>
        </div>
        <Badge status={categoryBadgeStatus} size="sm">
          {categoryLabel}
        </Badge>
      </div>

      {/* Radial Gauge & Score Display */}
      <div className="flex items-center space-x-5 my-1">
        <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background Track */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-[#E9EFEF] dark:text-[#2A2A2A]"
            />
            {/* Progress Stroke */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke={ringStrokeColor}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold font-mono text-[#171717] dark:text-[#F0F0F0] leading-none">
              {compositeHealthScore}
            </span>
            <span className="text-[10px] text-[#757575] dark:text-[#A0A0A0] font-mono mt-0.5">
              / 100
            </span>
          </div>
        </div>

        {/* Breakdown Text */}
        <div className="space-y-1.5 text-xs">
          <div className="text-[#171717] dark:text-[#F0F0F0] font-semibold flex items-center space-x-1">
            <span>{isFamilyMode ? 'Clinical & Pedigree Synthesis' : 'Personal Lab Records Only'}</span>
          </div>
          <p className="text-[11px] text-[#5F6368] dark:text-[#A0A0A0] leading-relaxed">
            Derived across <span className="font-semibold text-[#171717] dark:text-[#F0F0F0]">{evaluatedCount}</span> of{' '}
            {diseaseKeys.length} clinical categories with sufficient lab markers.
          </p>
          {insufficientCount > 0 && (
            <div className="inline-flex items-center space-x-1 text-[10px] text-amber-700 dark:text-amber-400 font-medium">
              <span>⚠️</span>
              <span>{insufficientCount} categories need additional tests</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Metrics */}
      <div className="pt-3 border-t border-[#E3E3DF] dark:border-[#303030] flex items-center justify-between text-[11px] text-[#757575] dark:text-[#A0A0A0]">
        <span>Mode: <strong className="text-[#171717] dark:text-[#F0F0F0]">{isFamilyMode ? 'Pedigree Integrated' : 'Self Reports Only'}</strong></span>
        <span>Avg Disease Risk: <strong className="text-[#171717] dark:text-[#F0F0F0]">{(averageRisk * 100).toFixed(1)}%</strong></span>
      </div>
    </Card>
  );
}

export default HealthScoreWidget;
