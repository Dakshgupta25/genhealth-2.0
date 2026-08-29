import React, { useState } from 'react';
import DoodleIcon from '../common/DoodleIcon';
import { Badge, Card } from '../ui';

export function FamilyTreeNode({
  member,
  isSelf = false,
  onUnlink,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = (e) => {
    if (e) e.stopPropagation();
    const id = isSelf ? member.id : member.relative_id;
    if (id) {
      navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getRelationshipBadgeMeta = (relType) => {
    switch (relType?.toLowerCase()) {
      case 'father':
      case 'mother':
      case 'parent':
        return { status: 'neutral', label: relType.toUpperCase() };
      case 'spouse':
      case 'wife':
      case 'husband':
        return { status: 'neutral', label: relType.toUpperCase() };
      case 'brother':
      case 'sister':
      case 'sibling':
        return { status: 'neutral', label: relType.toUpperCase() };
      case 'son':
      case 'daughter':
      case 'child':
        return { status: 'normal', label: relType.toUpperCase() };
      default:
        return { status: 'neutral', label: relType ? relType.toUpperCase() : 'RELATIVE' };
    }
  };

  const userId = isSelf ? member.id : member.relative_id;
  const fullName = isSelf ? (member.full_name || 'You') : member.full_name;
  const badgeMeta = isSelf
    ? { status: 'brand', label: 'PRIMARY ACCOUNT' }
    : getRelationshipBadgeMeta(member.relationship_type);

  return (
    <Card
      radius="lg"
      className={`w-full max-w-[260px] text-left transition-all duration-150 bg-white border ${
        isSelf
          ? 'border-[#B4232F] shadow-xs'
          : 'border-[#D4D2CE] dark:border-[#303030] hover:border-[#858585]'
      }`}
    >
      <div className="p-4 space-y-3">
        
        {/* Node Top Row: Avatar Initials + Relationship Badge + Unlink Action */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-[6px] flex items-center justify-center font-bold text-xs shrink-0 ${
                isSelf
                  ? 'bg-[#B4232F] text-white'
                  : 'bg-[#F4F4F2] text-[#171717] dark:bg-[#252525] dark:text-[#F0F0F0]'
              }`}
            >
              {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <Badge status={badgeMeta.status} size="sm" dot>
                {badgeMeta.label}
              </Badge>
            </div>
          </div>

          {/* Unlink Action Button */}
          {!isSelf && onUnlink && (
            <button
              type="button"
              onClick={() => onUnlink(member.relationship_id, member.full_name)}
              title="Unlink from pedigree"
              className="w-6 h-6 inline-flex items-center justify-center rounded-[4px] text-[#858585] hover:text-[#B4232F] hover:bg-[#FCEBED] transition-colors shrink-0 cursor-pointer"
            >
              <DoodleIcon name="trash" className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* User Identity Details */}
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold text-[#171717] dark:text-[#F0F0F0] truncate" title={fullName}>
            {fullName}
          </h4>
          <p className="text-[11px] text-[#858585] truncate" title={member.email}>
            {member.email || 'No email registered'}
          </p>
        </div>

        {/* User ID Snippet with 1-Click Copy Pattern */}
        <div className="pt-0.5">
          <div
            onClick={handleCopyId}
            title="Click to copy User ID"
            className="p-1.5 px-2 rounded-[6px] text-[10px] font-mono border border-[#E3E3DF] dark:border-[#303030] bg-[#FCFCFB] dark:bg-[#181818] text-[#5F6368] dark:text-[#A0A0A0] flex items-center justify-between cursor-pointer hover:border-[#B4232F] transition-colors select-all"
          >
            <span className="truncate">{userId ? `ID: ${userId.substring(0, 10)}...` : 'ID N/A'}</span>
            <span className="text-[10px] ml-1 font-sans shrink-0 flex items-center">
              {copied ? (
                <span className="text-[#247A59] font-semibold">✓ Copied</span>
              ) : (
                <DoodleIcon name="copy" className="w-3 h-3 text-[#858585] ml-1" />
              )}
            </span>
          </div>
        </div>

      </div>
    </Card>
  );
}

export default FamilyTreeNode;
