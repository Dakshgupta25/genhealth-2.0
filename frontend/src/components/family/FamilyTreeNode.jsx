import React, { useState } from 'react';
import DoodleIcon from '../common/DoodleIcon';
import { Badge, Card, Button } from '../ui';

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
        return { status: 'teal', label: relType.toUpperCase() };
      case 'spouse':
      case 'wife':
      case 'husband':
        return { status: 'purple', label: relType.toUpperCase() };
      case 'brother':
      case 'sister':
      case 'sibling':
        return { status: 'info', label: relType.toUpperCase() };
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
    ? { status: 'teal', label: 'PRIMARY USER' }
    : getRelationshipBadgeMeta(member.relationship_type);

  return (
    <Card
      radius="lg"
      className={`w-full max-w-[270px] text-left transition-all duration-150 ${
        isSelf
          ? 'border-cyan-500/60 ring-1 ring-cyan-500/20 bg-slate-50/60 dark:bg-slate-800/40 shadow-xs'
          : 'hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
      }`}
    >
      <div className="p-4 sm:p-4.5 space-y-3.5">
        
        {/* Node Top Row: Avatar Initials + Relationship Badge + Unlink Action */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                isSelf
                  ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-cyan-400 shadow-xs'
                  : 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
              }`}
            >
              {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <Badge status={badgeMeta.status} size="sm">
                {badgeMeta.label}
              </Badge>
            </div>
          </div>

          {/* Unlink Action Button */}
          {!isSelf && onUnlink && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUnlink(member.relationship_id, member.full_name)}
              title="Unlink from family tree"
              className="w-7 h-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 shrink-0"
            >
              <DoodleIcon name="trash" className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* User Identity Details */}
        <div className="space-y-0.5">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate" title={fullName}>
            {fullName}
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate" title={member.email}>
            {member.email || 'No email registered'}
          </p>
        </div>

        {/* User ID Snippet with 1-Click Copy Pattern */}
        <div className="pt-0.5">
          <div
            onClick={handleCopyId}
            title="Click to copy User ID"
            className="p-2 rounded-lg text-[10px] font-mono border border-slate-200 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 flex items-center justify-between cursor-pointer hover:border-cyan-500 dark:hover:border-cyan-400 transition-colors select-all"
          >
            <span className="truncate">{userId ? `ID: ${userId.substring(0, 13)}...` : 'ID N/A'}</span>
            <span className="text-[10px] ml-1 font-sans text-slate-400 shrink-0 flex items-center">
              {copied ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ Copied</span>
              ) : (
                <DoodleIcon name="copy" className="w-3 h-3 text-slate-400 ml-1" />
              )}
            </span>
          </div>
        </div>

      </div>
    </Card>
  );
}

export default FamilyTreeNode;
