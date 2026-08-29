import React, { useState } from 'react';
import DoodleIcon from '../common/DoodleIcon';
import { Badge, Card } from '../ui';

export function FamilyTreeNode({
  member,
  isSelf = false,
  onNodeClick,
  onUnlink,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = (e) => {
    if (e) e.stopPropagation();
    const id = isSelf ? member.id : (member.relative_id || member.id);
    if (id) {
      navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const healthStatus = member.health_status?.status || 'neutral';
  const isPlaceholder = Boolean(member.is_placeholder);
  const canEdit = Boolean(member.can_edit || isSelf);
  const fullName = isSelf ? (member.full_name || 'You') : member.full_name;
  const badgeCode = member.badge_code || (isSelf ? 'SELF' : 'REL');
  const userId = isSelf ? member.id : (member.relative_id || member.id);

  // Calibrated Nordic Ergonomic Ring Styles
  const getRingStyles = (status) => {
    switch (status) {
      case 'normal':
        return {
          ring: 'border-[#18573D] dark:border-[#57BA8E] shadow-[0_0_0_2px_#C8E6D6] dark:shadow-[0_0_0_2px_#224D37]',
          dot: 'bg-[#18573D] dark:bg-[#57BA8E]',
          statusLabel: 'Optimal',
          badgeStatus: 'normal',
        };
      case 'warning':
        return {
          ring: 'border-[#8F5708] dark:border-[#E6A84F] shadow-[0_0_0_2px_#F6DCB1] dark:shadow-[0_0_0_2px_#573E1B]',
          dot: 'bg-[#8F5708] dark:bg-[#E6A84F]',
          statusLabel: 'Warning',
          badgeStatus: 'warning',
        };
      case 'critical':
        return {
          ring: 'border-[#942728] dark:border-[#E57373] shadow-[0_0_0_2px_#F6C4C5] dark:shadow-[0_0_0_2px_#5B292A]',
          dot: 'bg-[#942728] dark:bg-[#E57373]',
          statusLabel: 'Critical',
          badgeStatus: 'critical',
        };
      default:
        return {
          ring: 'border-[#CBD6D2] dark:border-[#2F433E] shadow-[0_0_0_2px_#E2E9E6] dark:shadow-[0_0_0_2px_#1C2725]',
          dot: 'bg-[#7E9993]',
          statusLabel: 'No Lab Data',
          badgeStatus: 'neutral',
        };
    }
  };

  const ringMeta = getRingStyles(healthStatus);

  return (
    <Card
      radius="lg"
      onClick={() => onNodeClick && onNodeClick(member)}
      className={`group relative w-full max-w-[240px] text-center transition-all duration-200 cursor-pointer bg-white dark:bg-[#151E1C] border hover:shadow-md ${
        isSelf
          ? 'border-[#1E4D45] dark:border-[#336E63] shadow-xs'
          : 'border-[#CBD6D2] dark:border-[#2F433E] hover:border-[#1E4D45] dark:hover:border-[#336E63]'
      }`}
    >
      <div className="p-4 flex flex-col items-center space-y-3">
        
        {/* Node Top Row: Placeholder / Self Badge & Unlink Action */}
        <div className="w-full flex items-center justify-between gap-1 text-[10px]">
          <div>
            {isSelf ? (
              <Badge status="juniper" size="sm">
                PRIMARY ACCOUNT
              </Badge>
            ) : isPlaceholder ? (
              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-[4px] font-semibold bg-[#EBF0EE] text-[#3D524E] border border-[#CBD6D2] dark:bg-[#1C2725] dark:text-[#A0B6B0] dark:border-[#2F433E]">
                <span>⚙️</span>
                <span>Managed Profile</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-[4px] font-semibold bg-[#F0F6FA] text-[#1E4E6B] border border-[#C3DCEB] dark:bg-[#13232E] dark:text-[#5FA9D6] dark:border-[#25455B]">
                <span>✓</span>
                <span>Claimed Account</span>
              </span>
            )}
          </div>

          {!isSelf && onUnlink && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUnlink(member.relationship_id, member.full_name);
              }}
              title="Unlink from pedigree"
              className="w-5 h-5 inline-flex items-center justify-center rounded-[4px] text-[#7E9993] hover:text-[#942728] hover:bg-[#FDF0F0] dark:hover:bg-[#2D1616] transition-colors cursor-pointer"
            >
              <DoodleIcon name="trash" className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Circular Avatar with Calibrated Health Status Ring */}
        <div className="relative inline-block mt-1">
          <div
            className={`w-16 h-16 rounded-full p-[2px] transition-transform duration-200 group-hover:scale-105 ${ringMeta.ring}`}
            title={`Health Status: ${ringMeta.statusLabel}`}
          >
            {member.avatar_url ? (
              <img
                src={member.avatar_url}
                alt={fullName}
                className="w-full h-full rounded-full object-cover bg-[#EBF0EE] dark:bg-[#1C2725]"
              />
            ) : (
              <div
                className={`w-full h-full rounded-full flex items-center justify-center font-bold text-base select-none ${
                  isSelf
                    ? 'bg-[#1E4D45] text-white dark:bg-[#336E63]'
                    : isPlaceholder
                    ? 'bg-[#EBF0EE] text-[#13221F] dark:bg-[#1C2725] dark:text-[#EFF5F3]'
                    : 'bg-[#F0F6FA] text-[#1E4E6B] dark:bg-[#13232E] dark:text-[#5FA9D6]'
                }`}
              >
                {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
          </div>

          {/* Health Status Mini Pip Indicator */}
          <div
            className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white dark:border-[#151E1C] ${ringMeta.dot}`}
            title={`Status: ${ringMeta.statusLabel}`}
          />

          {/* Edit icon overlay badge for editable profiles */}
          {canEdit && (
            <div
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-[#1C2725] border border-[#CBD6D2] dark:border-[#2F433E] text-[#1E4D45] dark:text-[#57BA8E] flex items-center justify-center shadow-xs text-[10px]"
              title="Click to edit profile & avatar"
            >
              ✎
            </div>
          )}
        </div>

        {/* Identity & Relation Code Badge */}
        <div className="space-y-1.5 w-full">
          <div className="flex items-center justify-center space-x-1.5">
            <h4
              className="text-xs font-bold text-[#13221F] dark:text-[#EFF5F3] truncate max-w-[150px]"
              title={fullName}
            >
              {fullName}
            </h4>
          </div>

          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <Badge status="neutral" size="sm">
              {badgeCode}
            </Badge>
            <span className="text-[11px] text-[#4E6863] dark:text-[#7E9993] capitalize">
              {member.relationship_type || (isSelf ? 'Primary' : 'Relative')}
            </span>
          </div>
        </div>

        {/* 1-Click Copy User ID snippet */}
        <div className="w-full pt-1">
          <div
            onClick={handleCopyId}
            title="Click to copy User ID"
            className="p-1 px-2 rounded-[6px] text-[10px] font-mono border border-[#E0E7E4] dark:border-[#22312E] bg-[#F4F6F5] dark:bg-[#0E1413] text-[#4E6863] dark:text-[#7E9993] flex items-center justify-between cursor-pointer hover:border-[#1E4D45] dark:hover:border-[#336E63] transition-colors"
          >
            <span className="truncate">{userId ? `ID: ${userId.substring(0, 8)}...` : 'ID N/A'}</span>
            <span className="text-[10px] ml-1 font-sans shrink-0 flex items-center">
              {copied ? (
                <span className="text-[#18573D] dark:text-[#57BA8E] font-semibold">✓</span>
              ) : (
                <DoodleIcon name="copy" className="w-3 h-3 text-[#7E9993]" />
              )}
            </span>
          </div>
        </div>

      </div>
    </Card>
  );
}

export default FamilyTreeNode;
