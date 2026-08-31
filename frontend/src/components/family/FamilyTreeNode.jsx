import React, { useState } from 'react';
import DoodleIcon from '../common/DoodleIcon';

export function FamilyTreeNode({
  member,
  isSelf = false,
  isSelected = false,
  isDimmed = false,
  onNodeClick,
  onUnlink,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = (e) => {
    if (e) e.stopPropagation();
    const id = member.relative_id || member.id || member.relationship_id;
    if (id) {
      navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const healthStatus = member.health_status?.status || 'neutral';
  const isPlaceholder = Boolean(member.is_placeholder);
  
  // Display 'Me' for the primary user account
  const fullName = isSelf ? 'Me' : member.full_name;
  const badgeCode = member.badge_code || (isSelf ? 'SELF' : 'REL');
  
  // Consistently resolve node ID for dynamic SVG connectors
  const userId = member.relative_id || member.id || member.relationship_id;

  // Biological Sex / Gender Icon Component
  const renderGenderIndicator = () => {
    const g = (member.gender || '').toLowerCase();
    if (g === 'male') {
      return <span className="text-[10px] font-bold text-[#0284C7] dark:text-[#38BDF8]" title="Male">♂</span>;
    }
    if (g === 'female') {
      return <span className="text-[10px] font-bold text-[#E11D48] dark:text-[#FB7185]" title="Female">♀</span>;
    }
    return null;
  };

  // Health Status Ring Config
  const getHealthRingStyles = (status) => {
    switch (status) {
      case 'normal':
      case 'optimal':
        return {
          ringColor: 'border-[#18573D] dark:border-[#57BA8E]',
          glow: 'shadow-[0_0_10px_rgba(24,87,61,0.25)]',
          dot: 'bg-[#18573D] dark:bg-[#57BA8E]',
          statusLabel: 'Optimal Health (Normal Labs)',
        };
      case 'warning':
        return {
          ringColor: 'border-[#8F5708] dark:border-[#E6A84F]',
          glow: 'shadow-[0_0_10px_rgba(230,168,79,0.3)]',
          dot: 'bg-[#8F5708] dark:bg-[#E6A84F]',
          statusLabel: 'Warning (Borderline Labs)',
        };
      case 'critical':
        return {
          ringColor: 'border-[#B4232F] dark:border-[#E04855]',
          glow: 'shadow-[0_0_12px_rgba(180,35,47,0.4)]',
          dot: 'bg-[#B4232F] dark:bg-[#E04855]',
          statusLabel: 'Critical Alert',
        };
      default:
        return {
          ringColor: 'border-[#CBD6D2] dark:border-[#303030]',
          glow: 'shadow-none',
          dot: 'bg-[#858585]',
          statusLabel: 'No Lab Records',
        };
    }
  };

  const healthMeta = getHealthRingStyles(healthStatus);

  return (
    <div
      data-node-id={userId}
      data-node-role={member.relationship_type || (isSelf ? 'self' : 'relative')}
      className={`relative z-10 select-none group transition-all duration-300 ${
        isDimmed ? 'opacity-30 scale-95 grayscale-[30%]' : 'opacity-100'
      }`}
    >
      {/* RESPONSIVE CIRCULAR PEDIGREE NODE */}
      <div
        onClick={() => onNodeClick && onNodeClick(member)}
        className={`relative w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full p-1.5 sm:p-2 transition-all duration-300 cursor-pointer flex flex-col items-center justify-between text-center ${
          isSelected
            ? 'bg-gradient-to-b from-[#FFF5F5] via-white to-[#FCEBED] border-3 border-[#B4232F] shadow-[0_0_25px_rgba(180,35,47,0.45)] ring-4 ring-[#B4232F]/30 dark:from-[#3D1417] dark:via-[#1E1E1E] dark:to-[#170C0D] dark:border-[#E04855] dark:ring-[#E04855]/30 scale-105 sm:scale-110'
            : isSelf
            ? 'bg-gradient-to-b from-[#FFF5F5] via-white to-[#FCEBED] border-2 border-[#B4232F] shadow-[0_0_20px_rgba(180,35,47,0.25)] ring-4 ring-[#B4232F]/15 dark:from-[#3D1417] dark:via-[#1E1E1E] dark:to-[#170C0D] dark:border-[#E04855] dark:ring-[#E04855]/20 scale-100 sm:scale-105'
            : 'bg-white dark:bg-[#1E1E1E] border border-[#D98A91]/70 dark:border-[#303030] hover:border-[#B4232F] dark:hover:border-[#E04855] hover:shadow-[0_0_15px_rgba(180,35,47,0.2)] shadow-xs'
        }`}
      >
        {/* Top Tag Floating Badge */}
        <div className="mt-0.5 flex items-center justify-center space-x-1">
          {isSelf ? (
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full font-extrabold bg-[#B4232F] text-white dark:bg-[#E04855] dark:text-[#170C0D] text-[6.5px] sm:text-[7.5px] md:text-[8px] tracking-wider uppercase shadow-xs">
              ✦ ME
            </span>
          ) : isPlaceholder ? (
            <span className="px-1.5 py-0.2 rounded-full font-semibold bg-[#F4F6F5] text-[#5F6368] border border-[#CBD6D2] dark:bg-[#252525] dark:text-[#A0A0A0] dark:border-[#303030] text-[6.5px] sm:text-[7.5px] md:text-[8px]">
              Managed
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded-full font-semibold bg-[#FCEBED] text-[#B4232F] border border-[#E8B4B9] dark:bg-[#2D1416] dark:text-[#E04855] dark:border-[#422225] text-[6.5px] sm:text-[7.5px] md:text-[8px]">
              Claimed
            </span>
          )}
        </div>

        {/* Circular Avatar Node with Health Ring */}
        <div className="relative my-0.5">
          <div
            className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full p-[1.5px] transition-transform duration-300 group-hover:scale-110 border-2 ${healthMeta.ringColor} ${healthMeta.glow}`}
            title={`Health Status: ${healthMeta.statusLabel}`}
          >
            {member.avatar_url ? (
              <img
                src={member.avatar_url}
                alt={fullName}
                className="w-full h-full rounded-full object-cover bg-[#F4F6F5] dark:bg-[#252525]"
              />
            ) : (
              <div
                className={`w-full h-full rounded-full flex items-center justify-center font-bold text-[10px] sm:text-xs select-none ${
                  isSelf
                    ? 'bg-[#B4232F] text-white dark:bg-[#E04855] dark:text-[#170C0D]'
                    : isPlaceholder
                    ? 'bg-[#F4F6F5] text-[#171717] dark:bg-[#252525] dark:text-[#F0F0F0]'
                    : 'bg-[#FCEBED] text-[#B4232F] dark:bg-[#2D1416] dark:text-[#E04855]'
                }`}
              >
                {fullName ? fullName.charAt(0).toUpperCase() : 'M'}
              </div>
            )}
          </div>

          {/* Health Status Indicator Pip */}
          <span
            className={`absolute bottom-0 right-0 w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-full border-2 border-white dark:border-[#1E1E1E] ${healthMeta.dot}`}
            title={healthMeta.statusLabel}
          />
        </div>

        {/* Member Name, Gender Marker & Relation Code */}
        <div className="mb-1 sm:mb-1.5 w-full px-1">
          <div className="flex items-center justify-center space-x-0.5 sm:space-x-1">
            <span
              className={`text-[9px] sm:text-[10px] md:text-[11px] font-bold truncate max-w-[55px] sm:max-w-[70px] md:max-w-[80px] ${
                isSelf ? 'text-[#B4232F] dark:text-[#E04855]' : 'text-[#171717] dark:text-[#F0F0F0]'
              }`}
              title={fullName}
            >
              {fullName}
            </span>
            {renderGenderIndicator()}
            <span className="font-mono text-[6.5px] sm:text-[7.5px] md:text-[8px] font-bold px-0.5 sm:px-1 py-0.2 rounded bg-[#FCEBED] text-[#B4232F] border border-[#E8B4B9] dark:bg-[#2D1416] dark:text-[#E04855] dark:border-[#422225]">
              {badgeCode}
            </span>
          </div>

          <p className="text-[8px] sm:text-[9px] font-semibold text-[#5F6368] dark:text-[#A0A0A0] truncate">
            {isSelf ? 'Patient' : (member.relationship_type ? member.relationship_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Relative')}
          </p>
        </div>

        {/* Floating Action Buttons on Hover */}
        {!isSelf && onUnlink && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUnlink(member.relationship_id, member.full_name);
            }}
            title="Unlink relative"
            className="absolute top-1 right-1 w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 inline-flex items-center justify-center rounded-full bg-[#B4232F] text-white hover:bg-[#8A1924] shadow-md cursor-pointer"
          >
            <DoodleIcon name="trash" className="w-2.5 h-2.5" />
          </button>
        )}

        <button
          type="button"
          onClick={handleCopyId}
          title="Click to copy User ID"
          className="absolute bottom-1 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[8px] font-mono text-[#858585] hover:text-[#B4232F] cursor-pointer"
        >
          {copied ? '✓' : 'ID'}
        </button>
      </div>
    </div>
  );
}

export default FamilyTreeNode;
