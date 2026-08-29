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
    <div
      data-node-id={userId}
      data-node-role={member.relationship_type || (isSelf ? 'self' : 'relative')}
      className="relative z-10"
    >
      <Card
        radius="lg"
        onClick={() => onNodeClick && onNodeClick(member)}
        className={`group relative w-[155px] text-center transition-all duration-200 cursor-pointer bg-white dark:bg-[#151E1C] border hover:shadow-md ${
          isSelf
            ? 'border-[#1E4D45] dark:border-[#57BA8E] shadow-xs'
            : 'border-[#CBD6D2] dark:border-[#2F433E] hover:border-[#1E4D45] dark:hover:border-[#57BA8E]'
        }`}
      >
        <div className="p-3 flex flex-col items-center space-y-2">
          
          {/* Node Top Row: Status / Placeholder Badge & Unlink Action */}
          <div className="w-full flex items-center justify-between gap-1 text-[9px]">
            <div>
              {isSelf ? (
                <span className="px-1.5 py-0.5 rounded-[4px] font-bold bg-[#1E4D45] text-white dark:bg-[#336E63] text-[9px]">
                  YOU
                </span>
              ) : isPlaceholder ? (
                <span className="px-1 py-0.5 rounded-[4px] font-semibold bg-[#EBF0EE] text-[#3D524E] border border-[#CBD6D2] dark:bg-[#1C2725] dark:text-[#A0B6B0] dark:border-[#2F433E]">
                  Managed
                </span>
              ) : (
                <span className="px-1 py-0.5 rounded-[4px] font-semibold bg-[#F0F6FA] text-[#1E4E6B] border border-[#C3DCEB] dark:bg-[#13232E] dark:text-[#5FA9D6] dark:border-[#25455B]">
                  Claimed
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
                title="Unlink relative"
                className="w-4 h-4 inline-flex items-center justify-center rounded-[3px] text-[#7E9993] hover:text-[#942728] hover:bg-[#FDF0F0] dark:hover:bg-[#2D1616] transition-colors cursor-pointer"
              >
                <DoodleIcon name="trash" className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Compact Circular Avatar with Health Status Ring */}
          <div className="relative inline-block mt-0.5">
            <div
              className={`w-11 h-11 rounded-full p-[2px] transition-transform duration-200 group-hover:scale-105 ${ringMeta.ring}`}
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
                  className={`w-full h-full rounded-full flex items-center justify-center font-bold text-xs select-none ${
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
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#151E1C] ${ringMeta.dot}`}
              title={ringMeta.statusLabel}
            />

            {/* Edit / Upload Cue Indicator */}
            {canEdit && (
              <span
                className="absolute top-0 right-0 w-3 h-3 rounded-full bg-[#1E4D45] text-white text-[8px] flex items-center justify-center border border-white dark:border-[#151E1C] shadow-xs"
                title="Editable & Ingestable"
              >
                ✎
              </span>
            )}
          </div>

          {/* Member Name & Relation Code Badge */}
          <div className="space-y-1 w-full">
            <div className="flex items-center justify-center space-x-1">
              <span className="text-xs font-bold text-[#13221F] dark:text-[#EFF5F3] truncate max-w-[100px]" title={fullName}>
                {fullName}
              </span>
              <span className="font-mono text-[9px] font-bold px-1 py-0.2 rounded-[3px] bg-[#F4F6F5] text-[#1E4D45] border border-[#CBD6D2] dark:bg-[#1C2725] dark:text-[#57BA8E] dark:border-[#2F433E]">
                {badgeCode}
              </span>
            </div>

            <p className="text-[10px] capitalize text-[#4E6863] dark:text-[#7E9993] truncate">
              {isSelf ? 'Patient Context' : (member.relationship_type || 'Relative')}
            </p>
          </div>

          {/* 1-Click Copy ID Row */}
          <div className="w-full pt-1 border-t border-[#E0E7E4] dark:border-[#22312E]">
            <button
              type="button"
              onClick={handleCopyId}
              title="Click to copy User ID"
              className="w-full flex items-center justify-center space-x-1 py-0.5 text-[9px] font-mono text-[#7E9993] hover:text-[#1E4D45] dark:hover:text-[#57BA8E] transition-colors cursor-pointer"
            >
              <span>{copied ? '✓ Copied' : userId ? `${userId.substring(0, 6)}...` : 'ID'}</span>
              <DoodleIcon name="copy" className="w-2.5 h-2.5 opacity-60" />
            </button>
          </div>

        </div>
      </Card>
    </div>
  );
}

export default FamilyTreeNode;
