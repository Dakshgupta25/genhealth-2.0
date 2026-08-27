import React, { useState } from 'react';
import DoodleIcon from '../common/DoodleIcon';

export function FamilyTreeNode({
  member,
  isSelf = false,
  onUnlink,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    const id = isSelf ? member.id : member.relative_id;
    if (id) {
      navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getRelationshipColor = (relType) => {
    switch (relType?.toLowerCase()) {
      case 'father':
      case 'mother':
      case 'parent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200';
      case 'spouse':
      case 'wife':
      case 'husband':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200';
      case 'brother':
      case 'sister':
      case 'sibling':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200';
      case 'son':
      case 'daughter':
      case 'child':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200';
    }
  };

  const userId = isSelf ? member.id : member.relative_id;
  const fullName = isSelf ? (member.full_name || 'You') : member.full_name;
  const relLabel = isSelf ? 'Primary User' : (member.relationship_type || 'Relative');

  return (
    <div
      className={`p-5 rounded-3xl border shadow-md relative transition-all duration-200 hover:shadow-lg w-full max-w-[260px] mx-auto text-left space-y-3 ${
        isSelf ? 'ring-2 ring-indigo-500/40 shadow-indigo-500/10' : ''
      }`}
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-card)',
      }}
    >
      {/* Node Header: Avatar & Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shadow-inner"
            style={{
              backgroundColor: isSelf ? 'var(--brand-primary)' : 'var(--brand-soft-blue)',
              color: isSelf ? 'var(--text-on-accent)' : 'var(--brand-primary)',
            }}
          >
            {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                isSelf ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200' : getRelationshipColor(member.relationship_type)
              }`}
            >
              {relLabel}
            </span>
          </div>
        </div>

        {/* Unlink Action */}
        {!isSelf && onUnlink && (
          <button
            type="button"
            onClick={() => onUnlink(member.relationship_id, member.full_name)}
            title="Unlink from family tree"
            className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
          >
            <DoodleIcon name="trash" className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* User Information */}
      <div className="space-y-0.5">
        <h4 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
          {fullName}
        </h4>
        <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
          {member.email || 'No email registered'}
        </p>
      </div>

      {/* User ID Snippet with Copy */}
      <div className="pt-1">
        <div
          onClick={handleCopyId}
          title="Click to copy User ID"
          className="p-2 rounded-xl text-[10px] font-mono border flex items-center justify-between cursor-pointer hover:border-slate-400 transition-all select-all break-all"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-accent)',
          }}
        >
          <span className="truncate">{userId ? `ID: ${userId.substring(0, 13)}...` : 'ID N/A'}</span>
          <span className="text-[10px] ml-1 font-sans text-slate-400 shrink-0">
            {copied ? '✓ Copied' : '📋'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default FamilyTreeNode;
