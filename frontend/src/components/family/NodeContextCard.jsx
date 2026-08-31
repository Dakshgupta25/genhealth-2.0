import React from 'react';
import { getPersonVisualSummary } from '../../utils/relationshipGraph';
import DoodleIcon from '../common/DoodleIcon';
import { Button, Badge } from '../ui';

export function NodeContextCard({
  selectedNode,
  treeData,
  onClose,
  onUploadReport,
  onEditNode,
  onUnlinkNode,
}) {
  if (!selectedNode) return null;

  const summary = getPersonVisualSummary(selectedNode, treeData);
  const isSelf = selectedNode.isSelf || selectedNode.relationship_type === 'self';
  const fullName = isSelf ? 'Me (Patient)' : selectedNode.full_name;

  return (
    <div className="w-full bg-white dark:bg-[#1E1E1E] rounded-[14px] border-2 border-[#B4232F] dark:border-[#E04855] p-3.5 sm:p-4 shadow-lg animate-in slide-in-from-bottom-2 duration-200 space-y-3">
      {/* Header bar: Person Identity + Close button */}
      <div className="flex items-start justify-between gap-2 border-b border-[#E3E3DF] dark:border-[#303030] pb-2.5">
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div className="relative">
            {selectedNode.avatar_url ? (
              <img
                src={selectedNode.avatar_url}
                alt={fullName}
                className="w-10 h-10 rounded-full object-cover border border-[#D98A91] dark:border-[#422225]"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#B4232F] text-white font-bold flex items-center justify-center text-sm shadow-xs">
                {fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#1E1E1E] ${
                selectedNode.health_status?.status === 'critical'
                  ? 'bg-[#B4232F]'
                  : selectedNode.health_status?.status === 'warning'
                  ? 'bg-[#8F5708]'
                  : selectedNode.health_status?.status === 'normal'
                  ? 'bg-[#18573D]'
                  : 'bg-[#858585]'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-[#171717] dark:text-[#F0F0F0]">
                {fullName}
              </h3>
              {isSelf ? (
                <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-[#B4232F] text-white rounded-full uppercase">
                  ✦ YOU
                </span>
              ) : selectedNode.is_placeholder ? (
                <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-[#F4F6F5] text-[#5F6368] border border-[#CBD6D2] dark:bg-[#252525] dark:text-[#A0A0A0] rounded-full">
                  Managed
                </span>
              ) : (
                <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-[#FCEBED] text-[#B4232F] border border-[#E8B4B9] dark:bg-[#2D1416] dark:text-[#E04855] rounded-full">
                  Claimed
                </span>
              )}
            </div>

            <p className="text-xs text-[#5F6368] dark:text-[#A0A0A0] flex items-center space-x-1">
              <span>{summary?.roleDescription || selectedNode.relationship_type?.toUpperCase()}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-[#858585] hover:text-[#171717] dark:hover:text-white p-1 rounded-md cursor-pointer transition-colors"
          title="Deselect"
        >
          ✕
        </button>
      </div>

      {/* Visual Relationship Identity Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {/* Category */}
        <div className="p-2 rounded-[8px] bg-[#F7F7F5] dark:bg-[#252525] border border-[#E3E3DF] dark:border-[#303030]">
          <p className="text-[10px] text-[#5F6368] dark:text-[#A0A0A0]">Kinship Category</p>
          <p className="font-bold text-[#B4232F] dark:text-[#E04855] text-xs">
            {summary?.category || 'FAMILY'}
          </p>
        </div>

        {/* Generation Level */}
        <div className="p-2 rounded-[8px] bg-[#F7F7F5] dark:bg-[#252525] border border-[#E3E3DF] dark:border-[#303030]">
          <p className="text-[10px] text-[#5F6368] dark:text-[#A0A0A0]">Generation Level</p>
          <p className="font-bold text-[#171717] dark:text-[#F0F0F0] text-xs font-mono">
            {summary?.generationLabel || 'Gen 0'}
          </p>
        </div>

        {/* Genetic Marker */}
        <div className="p-2 rounded-[8px] bg-[#F7F7F5] dark:bg-[#252525] border border-[#E3E3DF] dark:border-[#303030]">
          <p className="text-[10px] text-[#5F6368] dark:text-[#A0A0A0]">Lineage Type</p>
          <p className="font-bold text-[#171717] dark:text-[#F0F0F0] text-xs flex items-center space-x-1">
            <span>{summary?.isGenetic ? '🧬 Biological Kin' : '💍 Non-Genetic'}</span>
          </p>
        </div>

        {/* Health Status */}
        <div className="p-2 rounded-[8px] bg-[#F7F7F5] dark:bg-[#252525] border border-[#E3E3DF] dark:border-[#303030] flex items-center justify-between">
          <div>
            <p className="text-[10px] text-[#5F6368] dark:text-[#A0A0A0]">Health Status</p>
            <p className="font-bold text-xs capitalize text-[#171717] dark:text-[#F0F0F0]">
              {selectedNode.health_status?.label || 'No Data'}
            </p>
          </div>
          <Badge status={selectedNode.health_status?.status || 'neutral'} size="sm">
            {selectedNode.health_status?.status?.toUpperCase() || 'N/A'}
          </Badge>
        </div>
      </div>

      {/* Quick Action Toolbar */}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUploadReport && onUploadReport(selectedNode)}
          leftIcon={<DoodleIcon name="upload" className="w-3.5 h-3.5 text-[#B4232F]" />}
          className="text-xs"
        >
          Upload Lab Document
        </Button>

        {(selectedNode.can_edit || isSelf) && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEditNode && onEditNode(selectedNode)}
            className="text-xs"
          >
            Edit Profile
          </Button>
        )}

        {!isSelf && onUnlinkNode && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUnlinkNode(selectedNode.relationship_id, selectedNode.full_name)}
            className="text-xs text-[#B4232F] hover:bg-[#FCEBED] dark:text-[#E04855]"
          >
            Unlink Relative
          </Button>
        )}
      </div>
    </div>
  );
}

export default NodeContextCard;
