import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getFamilyTree,
  linkFamilyMember,
  createPlaceholderProfile,
  updateFamilyMember,
  unlinkFamilyMember,
  confirmSpouseLink,
} from '../api/family';
import { getGenerationLabel } from '../utils/relationshipGraph';
import DoodleIcon from '../components/common/DoodleIcon';
import FamilyTreeNode from '../components/family/FamilyTreeNode';
import FamilyTreeConnectors from '../components/family/FamilyTreeConnectors';
import NodeContextCard from '../components/family/NodeContextCard';
import PendingClaimsBanner from '../components/family/PendingClaimsBanner';
import { Button, Card, FormField, Input, Select, Modal, EmptyState, Badge } from '../components/ui';

export function FamilyTreePage() {
  const { user, userId } = useAuth();
  const navigate = useNavigate();
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // View Mode State: 'radial' | 'hierarchical'
  const [viewMode, setViewMode] = useState('radial');

  // Zoom & Focus State
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeNode, setActiveNode] = useState(null);

  // Drag-to-pan state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 });

  // Link / Create Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('link'); // 'link' | 'placeholder'
  
  // Link by UUID form state
  const [targetUserId, setTargetUserId] = useState('');
  const [linkRelationType, setLinkRelationType] = useState('father');
  const [shareConsent, setShareConsent] = useState(true);
  const [isHalfSibling, setIsHalfSibling] = useState(false);
  const [sharedParentId, setSharedParentId] = useState('');
  
  // Placeholder creation form state
  const [placeholderName, setPlaceholderName] = useState('');
  const [placeholderRelationType, setPlaceholderRelationType] = useState('father');
  const [placeholderGender, setPlaceholderGender] = useState('unspecified');
  const [placeholderAvatar, setPlaceholderAvatar] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Node Edit / Details Modal State
  const [selectedNode, setSelectedNode] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editGender, setEditGender] = useState('unspecified');
  const [editAvatar, setEditAvatar] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  const loadTree = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getFamilyTree(userId);
      setTreeData(data);
    } catch (err) {
      console.error('Failed to load family tree:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // Drag-to-pan handlers for canvas container
  const handleMouseDown = (e) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setScrollStart({
      left: containerRef.current.scrollLeft,
      top: containerRef.current.scrollTop,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !containerRef.current) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    containerRef.current.scrollLeft = scrollStart.left - dx;
    containerRef.current.scrollTop = scrollStart.top - dy;
  };

  const handleMouseUp = () => setIsDragging(false);

  // Handle linking existing user
  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    if (!targetUserId.trim()) {
      setModalError('Please enter the relative’s User ID (UUID).');
      return;
    }

    setSubmitting(true);
    setModalError('');
    try {
      await linkFamilyMember({
        user_id: userId,
        relative_user_id: targetUserId.trim(),
        relationship_type: linkRelationType,
        share_clinical_data: shareConsent,
        is_half_sibling: isHalfSibling,
        shared_parent_id: isHalfSibling && sharedParentId ? sharedParentId : undefined,
      });
      setSuccessMessage('Family member linked successfully.');
      setTargetUserId('');
      setIsHalfSibling(false);
      setSharedParentId('');
      setModalOpen(false);
      loadTree();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Failed to link family member:', err);
      setModalError(
        err.response?.data?.detail ||
          'Failed to link member. Please confirm the User ID exists and is not already linked.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Handle creating managed placeholder profile
  const handlePlaceholderSubmit = async (e) => {
    e.preventDefault();
    if (!placeholderName.trim()) {
      setModalError('Please enter the family member’s full name.');
      return;
    }

    setSubmitting(true);
    setModalError('');
    try {
      await createPlaceholderProfile({
        manager_user_id: userId,
        full_name: placeholderName.trim(),
        relationship_type: placeholderRelationType,
        gender: placeholderGender,
        avatar_url: placeholderAvatar.trim() || undefined,
        is_half_sibling: isHalfSibling,
        shared_parent_id: isHalfSibling && sharedParentId ? sharedParentId : undefined,
      });
      setSuccessMessage(`Created and linked managed placeholder profile for ${placeholderName.trim()}.`);
      setPlaceholderName('');
      setPlaceholderAvatar('');
      setIsHalfSibling(false);
      setSharedParentId('');
      setModalOpen(false);
      loadTree();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Failed to create placeholder profile:', err);
      setModalError(err.response?.data?.detail || 'Failed to create managed profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNodeSelect = (member) => {
    const activeId = activeNode?.relative_id || activeNode?.id || activeNode?.relationship_id;
    const memberId = member.relative_id || member.id || member.relationship_id;

    if (activeId === memberId) {
      setActiveNode(null);
    } else {
      setActiveNode(member);
    }
  };

  const handleOpenEditModal = (member) => {
    setSelectedNode(member);
    setEditName(member.full_name || '');
    setEditGender(member.gender || 'unspecified');
    setEditAvatar(member.avatar_url || '');
    setEditError('');
    setEditModalOpen(true);
  };

  const handleSaveNodeEdit = async (e) => {
    e.preventDefault();
    if (!selectedNode) return;

    setSavingEdit(true);
    setEditError('');

    try {
      const targetId = selectedNode.relative_id || selectedNode.id;
      await updateFamilyMember(targetId, {
        manager_user_id: userId,
        full_name: editName.trim() || undefined,
        gender: editGender,
        avatar_url: editAvatar || undefined,
      });

      setSuccessMessage('Profile and avatar updated successfully.');
      setEditModalOpen(false);
      loadTree();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Failed to update node:', err);
      setEditError(err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleUnlink = async (relationshipId, relativeName) => {
    if (!window.confirm(`Are you sure you want to delete ${relativeName || 'this member'} from your family network?`)) {
      return;
    }

    try {
      await unlinkFamilyMember(relationshipId);
      setSuccessMessage(`Removed ${relativeName || 'member'} successfully.`);
      setActiveNode(null);
      setEditModalOpen(false);
      await loadTree();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Failed to delete member:', err);
      alert('Failed to delete member.');
    }
  };

  const handleConfirmSpouse = async (sug, confirm) => {
    try {
      await confirmSpouseLink(sug.user1_id, sug.user2_id, confirm);
      loadTree();
    } catch (err) {
      console.error('Failed to confirm spouse link:', err);
    }
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.15, 1.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.15, 0.65));
  const handleResetZoom = () => setZoomLevel(1);

  const totalMembers = treeData?.all_members?.length || 0;
  const isSiblingRelation = (rel) => ['brother', 'sister', 'sibling'].includes((rel || '').toLowerCase());

  // Determine focused selection & dimming states
  const activeNodeId = activeNode?.relative_id || activeNode?.id || activeNode?.relationship_id;
  const selfId = treeData?.self_node?.relative_id || treeData?.self_node?.id;

  const isNodeDimmed = (member) => {
    if (!activeNodeId) return false;
    const memberId = member.relative_id || member.id || member.relationship_id;
    if (memberId === activeNodeId) return false;
    if (activeNodeId === selfId) return false;
    if (memberId === selfId) return false;
    return true;
  };

  // Separate Grandparents by Paternal (Father's side) vs Maternal (Mother's side)
  const grandparents = treeData?.grandparents || [];
  const paternalGrandparents = grandparents.filter((g, idx) => {
    const rel = (g.relationship_type || '').toLowerCase();
    const side = (g.side || '').toLowerCase();
    if (rel.includes('paternal') || side === 'paternal') return true;
    if (rel.includes('maternal') || side === 'maternal') return false;
    return idx < grandparents.length / 2;
  });

  const maternalGrandparents = grandparents.filter((g, idx) => {
    const rel = (g.relationship_type || '').toLowerCase();
    const side = (g.side || '').toLowerCase();
    if (rel.includes('maternal') || side === 'maternal') return true;
    if (rel.includes('paternal') || side === 'paternal') return false;
    return idx >= grandparents.length / 2;
  });

  // Group Parents
  const parents = treeData?.parents || [];
  const fatherNode = parents.find((p) =>
    (p.relationship_type || '').toLowerCase() === 'father' || (p.gender || '').toLowerCase() === 'male'
  );
  const motherNode = parents.find((p) =>
    (p.relationship_type || '').toLowerCase() === 'mother' || (p.gender || '').toLowerCase() === 'female'
  );

  const siblings = treeData?.peers?.filter((m) =>
    ['brother', 'sister', 'sibling'].includes(m.relationship_type?.toLowerCase())
  ) || [];

  const spouse = treeData?.peers?.find((m) =>
    ['spouse', 'husband', 'wife', 'partner'].includes(m.relationship_type?.toLowerCase())
  );

  const descendantsAndExtended = [
    ...(treeData?.children || []),
    ...(treeData?.extended || []),
  ];

  const halfSiblingsCount = Math.ceil(siblings.length / 2);
  const leftSiblings = siblings.slice(0, halfSiblingsCount);
  const rightSiblings = siblings.slice(halfSiblingsCount);

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200 w-full max-w-full overflow-x-hidden">
      
      {/* Pending Incoming Claims Notification */}
      <PendingClaimsBanner onClaimResolved={loadTree} />

      {/* 1. Header Section — Fully Responsive Flexbox */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-[#E3E3DF] dark:border-[#303030]">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest bg-[#FCEBED] text-[#B4232F] dark:bg-[#2D1416] dark:text-[#E04855] uppercase">
              Centered Relationship Engine
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#B4232F] dark:text-[#E04855]">
            Family Health Relationship Network
          </h1>
          <p className="text-xs text-[#5F6368] dark:text-[#A0A0A0]">
            Direct genealogical relationship graph mapping paternal and maternal lineages centered on your patient account (ME).
          </p>
        </div>

        {/* View Toggle & Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Dual Synchronized View Toggle */}
          <div className="p-1 rounded-[10px] bg-[#F7F7F5] dark:bg-[#222222] border border-[#E3E3DF] dark:border-[#303030] flex items-center gap-1 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('radial')}
              className={`px-3 py-1.5 rounded-[7px] text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                viewMode === 'radial'
                  ? 'bg-white dark:bg-[#1E1E1E] text-[#B4232F] dark:text-[#E04855] shadow-xs border border-[#D98A91]/80 dark:border-[#422225]'
                  : 'text-[#5F6368] dark:text-[#A0A0A0] hover:text-[#171717] dark:hover:text-white'
              }`}
            >
              <span>🌐 Visual Radial Graph</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('hierarchical')}
              className={`px-3 py-1.5 rounded-[7px] text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                viewMode === 'hierarchical'
                  ? 'bg-white dark:bg-[#1E1E1E] text-[#B4232F] dark:text-[#E04855] shadow-xs border border-[#D98A91]/80 dark:border-[#422225]'
                  : 'text-[#5F6368] dark:text-[#A0A0A0] hover:text-[#171717] dark:hover:text-white'
              }`}
            >
              <span>📊 Generational Hierarchy</span>
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => { setModalOpen(true); setModalError(''); }}
            id="open-add-member-modal-btn"
            leftIcon={<DoodleIcon name="plus" className="w-3.5 h-3.5 text-white" />}
          >
            + Add Relative
          </Button>
        </div>
      </div>

      {/* 2. Responsive Health Status & Lineage Key Legend Bar */}
      <div className="p-3 rounded-[12px] bg-white dark:bg-[#1E1E1E] border border-[#D98A91]/80 dark:border-[#303030] flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs shadow-xs overflow-x-auto">
        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          {/* Health Status Indicators */}
          <div className="flex items-center space-x-3 pr-3 border-r border-[#E3E3DF] dark:border-[#303030] shrink-0">
            <div className="flex items-center space-x-1 font-bold text-[#B4232F] dark:text-[#E04855]">
              <DoodleIcon name="pulse" className="w-3.5 h-3.5 text-[#B4232F] dark:text-[#E04855]" />
              <span>Status:</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#18573D] border border-[#C8E6D6]" />
              <span className="text-[#5F6368] dark:text-[#A0A0A0]">Optimal</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8F5708] border border-[#F6DCB1]" />
              <span className="text-[#5F6368] dark:text-[#A0A0A0]">Warning</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B4232F] border border-[#F6C4C5]" />
              <span className="text-[#5F6368] dark:text-[#A0A0A0]">Critical</span>
            </div>
          </div>

          {/* Pedigree Connector Line Legend */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-[#171717] dark:text-[#F0F0F0]">Pedigree Connectors:</span>
            
            <div className="flex items-center space-x-1.5">
              <span className="w-3.5 h-0.5 bg-[#7E22CE] inline-block" />
              <span className="text-[#5F6368] dark:text-[#A0A0A0]">Grandparent → Parent</span>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="w-3.5 h-0.5 bg-[#15803D] inline-block" />
              <span className="text-[#5F6368] dark:text-[#A0A0A0]">Parent → ME</span>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="w-3.5 h-0.5 border-b-2 border-dashed border-[#B4232F] inline-block" />
              <span className="text-[#5F6368] dark:text-[#A0A0A0]">Spouse Link</span>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="w-3.5 h-0.5 border-b-2 border-dashed border-[#0284C7] inline-block" />
              <span className="text-[#5F6368] dark:text-[#A0A0A0]">Siblings</span>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="w-3.5 h-0.5 bg-[#16A34A] inline-block" />
              <span className="text-[#5F6368] dark:text-[#A0A0A0]">Children</span>
            </div>
          </div>
        </div>

        {/* Canvas Zoom Controls */}
        <div className="flex items-center space-x-1 bg-[#F7F7F5] dark:bg-[#222222] p-1 rounded-lg border border-[#E3E3DF] dark:border-[#303030] shrink-0 self-end lg:self-auto">
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            className="w-6 h-6 flex items-center justify-center text-xs font-bold rounded hover:bg-white dark:hover:bg-[#1E1E1E] text-[#5F6368] dark:text-[#A0A0A0] cursor-pointer"
          >
            -
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            title="Reset Zoom (100%)"
            className="px-2 py-0.5 text-[10px] font-mono font-bold rounded hover:bg-white dark:hover:bg-[#1E1E1E] text-[#171717] dark:text-[#F0F0F0] cursor-pointer"
          >
            {Math.round(zoomLevel * 100)}%
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            className="w-6 h-6 flex items-center justify-center text-xs font-bold rounded hover:bg-white dark:hover:bg-[#1E1E1E] text-[#5F6368] dark:text-[#A0A0A0] cursor-pointer"
          >
            +
          </button>
        </div>
      </div>

      {/* Suggested Co-Parent Link Prompt Banner */}
      {treeData?.suggested_links && treeData.suggested_links.length > 0 && (
        <div className="space-y-2">
          {treeData.suggested_links.map((sug, idx) => (
            <Card
              key={idx}
              radius="lg"
              className="p-3 bg-[#FEF7EB] dark:bg-[#2B1F0E] border border-[#F6DCB1] dark:border-[#573E1B] shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="text-base">💡</span>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-[#8F5708] dark:text-[#E6A84F]">
                      Suggested Relationship Link
                    </p>
                    <p className="text-xs text-[#171717] dark:text-[#F0F0F0]">
                      {sug.reason} Would you like to link them as Spouses/Partners?
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConfirmSpouse(sug, false)}
                    className="text-xs py-1"
                  >
                    Dismiss
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleConfirmSpouse(sug, true)}
                    leftIcon={<DoodleIcon name="check" className="w-3 h-3 text-white" />}
                    className="text-xs py-1"
                  >
                    Link as Spouses
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Node Context Overlay Breakdown */}
      {activeNode && (
        <NodeContextCard
          selectedNode={activeNode}
          treeData={treeData}
          onClose={() => setActiveNode(null)}
          onUploadReport={(m) => {
            navigate(
              `/upload?targetUserId=${m.relative_id || m.id}&targetName=${encodeURIComponent(
                m.full_name
              )}&relation=${encodeURIComponent(m.relationship_type || 'Self')}`
            );
          }}
          onEditNode={handleOpenEditModal}
          onUnlinkNode={handleUnlink}
        />
      )}

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-3 rounded-[8px] text-xs font-semibold bg-[#FCEBED] text-[#B4232F] border border-[#E8B4B9] dark:bg-[#2D1416] dark:text-[#E04855] dark:border-[#422225] flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <span>✓</span>
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            className="text-[#B4232F] dark:text-[#E04855] font-bold underline ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. RESPONSIVE FAMILY TREE CANVAS */}
      {loading ? (
        <Card radius="lg" className="p-12 text-center space-y-3 bg-white dark:bg-[#1E1E1E] border border-[#D98A91]/80 dark:border-[#422225]">
          <div className="w-6 h-6 mx-auto rounded-full border-2 border-[#B4232F] border-t-transparent animate-spin" />
          <p className="text-xs text-[#858585]">Constructing relationship network graph...</p>
        </Card>
      ) : !treeData || (!treeData.self_node && totalMembers === 0) ? (
        <EmptyState
          icon={<DoodleIcon name="tree" className="w-6 h-6 text-[#B4232F]" />}
          title="No family members linked yet"
          description="Link an existing user by UUID or create a managed placeholder profile to start mapping your relationship network."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => { setModalOpen(true); setModalError(''); }}
              leftIcon={<DoodleIcon name="plus" className="w-3.5 h-3.5 text-white" />}
            >
              + Add First Relative
            </Button>
          }
        />
      ) : (
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`relative w-full rounded-[16px] bg-white dark:bg-[#171717] border border-[#D98A91]/80 dark:border-[#422225] p-2 sm:p-4 md:p-8 overflow-auto min-h-[480px] sm:min-h-[550px] shadow-xs flex flex-col items-center justify-center select-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          <div
            ref={canvasRef}
            className="relative w-full max-w-7xl mx-auto space-y-6 sm:space-y-10 md:space-y-14 transition-transform duration-200 origin-top flex flex-col items-center justify-center py-2"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* Dynamic Direct SVG Connection Lines Layer */}
            <FamilyTreeConnectors
              containerRef={canvasRef}
              treeData={treeData}
              selectedNodeId={activeNodeId}
            />

            {/* VIEW MODE 1: VISUAL RADIAL / GRAPH VIEW */}
            {viewMode === 'radial' ? (
              <>
                {/* ROW 1 (TOP): GRANDPARENTS (PATERNAL LEFT | MATERNAL RIGHT) */}
                {grandparents.length > 0 && (
                  <div className="relative z-10 w-full flex justify-center px-2">
                    <div className="flex flex-wrap items-center justify-around sm:justify-between w-full max-w-5xl gap-4 sm:gap-6">
                      {/* Paternal Grandparents (Father's Side) */}
                      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 md:gap-6">
                        {paternalGrandparents.map((m) => {
                          const id = m.relative_id || m.id || m.relationship_id;
                          return (
                            <FamilyTreeNode
                              key={id}
                              member={m}
                              isSelected={id === activeNodeId}
                              isDimmed={isNodeDimmed(m)}
                              onNodeClick={handleNodeSelect}
                              onUnlink={handleUnlink}
                            />
                          );
                        })}
                      </div>

                      {/* Maternal Grandparents (Mother's Side) */}
                      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 md:gap-6">
                        {maternalGrandparents.map((m) => {
                          const id = m.relative_id || m.id || m.relationship_id;
                          return (
                            <FamilyTreeNode
                              key={id}
                              member={m}
                              isSelected={id === activeNodeId}
                              isDimmed={isNodeDimmed(m)}
                              onNodeClick={handleNodeSelect}
                              onUnlink={handleUnlink}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ROW 2: PARENTS (FATHER LEFT | MOTHER RIGHT) */}
                {parents.length > 0 && (
                  <div className="relative z-10 w-full flex justify-center px-2">
                    <div className="flex items-center justify-center gap-6 sm:gap-16 md:gap-24 lg:gap-32">
                      {fatherNode && (
                        <FamilyTreeNode
                          key={fatherNode.relative_id || fatherNode.id || fatherNode.relationship_id}
                          member={fatherNode}
                          isSelected={(fatherNode.relative_id || fatherNode.id) === activeNodeId}
                          isDimmed={isNodeDimmed(fatherNode)}
                          onNodeClick={handleNodeSelect}
                          onUnlink={handleUnlink}
                        />
                      )}
                      {motherNode && (
                        <FamilyTreeNode
                          key={motherNode.relative_id || motherNode.id || motherNode.relationship_id}
                          member={motherNode}
                          isSelected={(motherNode.relative_id || motherNode.id) === activeNodeId}
                          isDimmed={isNodeDimmed(motherNode)}
                          onNodeClick={handleNodeSelect}
                          onUnlink={handleUnlink}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* ROW 3 (CENTER): PRIMARY USER ("ME") AT ABSOLUTE CENTER WITH FLANKING SIBLINGS & SPOUSE */}
                <div className="relative z-10 w-full flex justify-center">
                  <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 md:gap-12">
                    {/* Left Flank Siblings */}
                    {leftSiblings.map((m) => {
                      const id = m.relative_id || m.id || m.relationship_id;
                      return (
                        <FamilyTreeNode
                          key={id}
                          member={m}
                          isSelected={id === activeNodeId}
                          isDimmed={isNodeDimmed(m)}
                          onNodeClick={handleNodeSelect}
                          onUnlink={handleUnlink}
                        />
                      );
                    })}

                    {/* PRIMARY USER NODE ("ME") — ABSOLUTE CENTER */}
                    <FamilyTreeNode
                      member={treeData.self_node}
                      isSelf={true}
                      isSelected={selfId === activeNodeId}
                      isDimmed={isNodeDimmed(treeData.self_node)}
                      onNodeClick={handleNodeSelect}
                    />

                    {/* Spouse / Partner Node */}
                    {spouse && (
                      <FamilyTreeNode
                        key={spouse.relative_id || spouse.id || spouse.relationship_id}
                        member={spouse}
                        isSelected={(spouse.relative_id || spouse.id) === activeNodeId}
                        isDimmed={isNodeDimmed(spouse)}
                        onNodeClick={handleNodeSelect}
                        onUnlink={handleUnlink}
                      />
                    )}

                    {/* Right Flank Siblings */}
                    {rightSiblings.map((m) => {
                      const id = m.relative_id || m.id || m.relationship_id;
                      return (
                        <FamilyTreeNode
                          key={id}
                          member={m}
                          isSelected={id === activeNodeId}
                          isDimmed={isNodeDimmed(m)}
                          onNodeClick={handleNodeSelect}
                          onUnlink={handleUnlink}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* ROW 4 (BOTTOM): DESCENDANTS & EXTENDED KIN */}
                {descendantsAndExtended.length > 0 && (
                  <div className="relative z-10 w-full flex justify-center">
                    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 md:gap-12">
                      {descendantsAndExtended.map((m) => {
                        const id = m.relative_id || m.id || m.relationship_id;
                        return (
                          <FamilyTreeNode
                            key={id}
                            member={m}
                            isSelected={id === activeNodeId}
                            isDimmed={isNodeDimmed(m)}
                            onNodeClick={handleNodeSelect}
                            onUnlink={handleUnlink}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* VIEW MODE 2: GENERATIONAL HIERARCHY VIEW */
              <div className="w-full space-y-8">
                {/* GENERATION +2: GRANDPARENTS (PATERNAL LEFT | MATERNAL RIGHT) */}
                {grandparents.length > 0 && (
                  <div className="relative z-10 w-full p-4 rounded-[12px] bg-[#F7F7F5]/60 dark:bg-[#222222]/60 border border-[#E3E3DF] dark:border-[#303030]">
                    <div className="mb-3 pb-1 border-b border-[#E3E3DF] dark:border-[#303030] flex items-center justify-between">
                      <span className="text-xs font-bold font-mono tracking-wider text-[#7E22CE] uppercase">
                        {getGenerationLabel(2)}
                      </span>
                      <span className="text-[10px] text-[#858585]">
                        {grandparents.length} Member(s)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-[#E3E3DF] dark:divide-[#303030]">
                      {/* Paternal Lineage (Father's Side) */}
                      <div className="pt-2 md:pt-0 md:pr-4 space-y-2">
                        <p className="text-[10px] font-bold tracking-wider text-[#7E22CE] uppercase text-center">
                          Father's Lineage (Paternal)
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-4">
                          {paternalGrandparents.map((m) => {
                            const id = m.relative_id || m.id || m.relationship_id;
                            return (
                              <FamilyTreeNode
                                key={id}
                                member={m}
                                isSelected={id === activeNodeId}
                                isDimmed={isNodeDimmed(m)}
                                onNodeClick={handleNodeSelect}
                                onUnlink={handleUnlink}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* Maternal Lineage (Mother's Side) */}
                      <div className="pt-4 md:pt-0 md:pl-4 space-y-2">
                        <p className="text-[10px] font-bold tracking-wider text-[#7E22CE] uppercase text-center">
                          Mother's Lineage (Maternal)
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-4">
                          {maternalGrandparents.map((m) => {
                            const id = m.relative_id || m.id || m.relationship_id;
                            return (
                              <FamilyTreeNode
                                key={id}
                                member={m}
                                isSelected={id === activeNodeId}
                                isDimmed={isNodeDimmed(m)}
                                onNodeClick={handleNodeSelect}
                                onUnlink={handleUnlink}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* GENERATION +1: PARENTS & ASCENDANTS */}
                {parents.length > 0 && (
                  <div className="relative z-10 w-full p-4 rounded-[12px] bg-[#F7F7F5]/60 dark:bg-[#222222]/60 border border-[#E3E3DF] dark:border-[#303030]">
                    <div className="mb-3 pb-1 border-b border-[#E3E3DF] dark:border-[#303030] flex items-center justify-between">
                      <span className="text-xs font-bold font-mono tracking-wider text-[#15803D] uppercase">
                        {getGenerationLabel(1)}
                      </span>
                      <span className="text-[10px] text-[#858585]">
                        {parents.length} Member(s)
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-8">
                      {parents.map((m) => {
                        const id = m.relative_id || m.id || m.relationship_id;
                        return (
                          <FamilyTreeNode
                            key={id}
                            member={m}
                            isSelected={id === activeNodeId}
                            isDimmed={isNodeDimmed(m)}
                            onNodeClick={handleNodeSelect}
                            onUnlink={handleUnlink}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* GENERATION 0: SELF, SPOUSE & SIBLINGS (YOUR GENERATION) */}
                <div className="relative z-10 w-full p-4 rounded-[12px] bg-[#FCEBED]/40 dark:bg-[#2D1416]/40 border-2 border-[#B4232F]/40 dark:border-[#E04855]/40 shadow-xs">
                  <div className="mb-3 pb-1 border-b border-[#E8B4B9] dark:border-[#422225] flex items-center justify-between">
                    <span className="text-xs font-extrabold font-mono tracking-wider text-[#B4232F] dark:text-[#E04855] uppercase">
                      ✦ {getGenerationLabel(0)}
                    </span>
                    <span className="text-[10px] text-[#B4232F] dark:text-[#E04855] font-bold">
                      Central Anchor Tier
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-6">
                    {/* Left Siblings */}
                    {leftSiblings.map((m) => {
                      const id = m.relative_id || m.id || m.relationship_id;
                      return (
                        <FamilyTreeNode
                          key={id}
                          member={m}
                          isSelected={id === activeNodeId}
                          isDimmed={isNodeDimmed(m)}
                          onNodeClick={handleNodeSelect}
                          onUnlink={handleUnlink}
                        />
                      );
                    })}

                    {/* ME */}
                    <FamilyTreeNode
                      member={treeData.self_node}
                      isSelf={true}
                      isSelected={selfId === activeNodeId}
                      isDimmed={isNodeDimmed(treeData.self_node)}
                      onNodeClick={handleNodeSelect}
                    />

                    {/* Spouse */}
                    {spouse && (
                      <FamilyTreeNode
                        key={spouse.relative_id || spouse.id || spouse.relationship_id}
                        member={spouse}
                        isSelected={(spouse.relative_id || spouse.id) === activeNodeId}
                        isDimmed={isNodeDimmed(spouse)}
                        onNodeClick={handleNodeSelect}
                        onUnlink={handleUnlink}
                      />
                    )}

                    {/* Right Siblings */}
                    {rightSiblings.map((m) => {
                      const id = m.relative_id || m.id || m.relationship_id;
                      return (
                        <FamilyTreeNode
                          key={id}
                          member={m}
                          isSelected={id === activeNodeId}
                          isDimmed={isNodeDimmed(m)}
                          onNodeClick={handleNodeSelect}
                          onUnlink={handleUnlink}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* GENERATION -1: CHILDREN & DESCENDANTS */}
                {(treeData.children || []).length > 0 && (
                  <div className="relative z-10 w-full p-4 rounded-[12px] bg-[#F7F7F5]/60 dark:bg-[#222222]/60 border border-[#E3E3DF] dark:border-[#303030]">
                    <div className="mb-3 pb-1 border-b border-[#E3E3DF] dark:border-[#303030] flex items-center justify-between">
                      <span className="text-xs font-bold font-mono tracking-wider text-[#16A34A] uppercase">
                        {getGenerationLabel(-1)}
                      </span>
                      <span className="text-[10px] text-[#858585]">
                        {treeData.children.length} Member(s)
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-6">
                      {treeData.children.map((m) => {
                        const id = m.relative_id || m.id || m.relationship_id;
                        return (
                          <FamilyTreeNode
                            key={id}
                            member={m}
                            isSelected={id === activeNodeId}
                            isDimmed={isNodeDimmed(m)}
                            onNodeClick={handleNodeSelect}
                            onUnlink={handleUnlink}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* EXTENDED KINSHIP BRANCH */}
                {(treeData.extended || []).length > 0 && (
                  <div className="relative z-10 w-full p-4 rounded-[12px] bg-[#FEF7EB]/40 dark:bg-[#2B1F0E]/40 border border-[#F6DCB1] dark:border-[#573E1B]">
                    <div className="mb-3 pb-1 border-b border-[#F6DCB1] dark:border-[#573E1B] flex items-center justify-between">
                      <span className="text-xs font-bold font-mono tracking-wider text-[#D97706] uppercase">
                        EXTENDED KINSHIP BRANCH
                      </span>
                      <span className="text-[10px] text-[#858585]">
                        {treeData.extended.length} Member(s)
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-6">
                      {treeData.extended.map((m) => {
                        const id = m.relative_id || m.id || m.relationship_id;
                        return (
                          <FamilyTreeNode
                            key={id}
                            member={m}
                            isSelected={id === activeNodeId}
                            isDimmed={isNodeDimmed(m)}
                            onNodeClick={handleNodeSelect}
                            onUnlink={handleUnlink}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* 4. MODAL: Add Relative (Link UUID or Create Placeholder) */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Family Relative"
        subtitle="Connect existing accounts by User ID or create managed placeholder profiles"
        icon={<DoodleIcon name="plus" className="w-4 h-4 text-[#B4232F]" />}
      >
        <div className="space-y-4">
          
          {/* Modal Tab Switcher */}
          <div className="p-1 rounded-[8px] bg-[#F7F7F5] dark:bg-[#222222] border border-[#E3E3DF] dark:border-[#303030] flex items-center gap-1">
            <button
              type="button"
              onClick={() => { setModalTab('link'); setModalError(''); }}
              className={`flex-1 py-1.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer ${
                modalTab === 'link'
                  ? 'bg-white dark:bg-[#1E1E1E] text-[#B4232F] dark:text-[#E04855] shadow-xs border border-[#D98A91]/80 dark:border-[#422225]'
                  : 'text-[#5F6368] dark:text-[#A0A0A0]'
              }`}
            >
              Link by User ID (UUID)
            </button>
            <button
              type="button"
              onClick={() => { setModalTab('placeholder'); setModalError(''); }}
              className={`flex-1 py-1.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer ${
                modalTab === 'placeholder'
                  ? 'bg-white dark:bg-[#1E1E1E] text-[#B4232F] dark:text-[#E04855] shadow-xs border border-[#D98A91]/80 dark:border-[#422225]'
                  : 'text-[#5F6368] dark:text-[#A0A0A0]'
              }`}
            >
              + Create Managed Profile
            </button>
          </div>

          {modalError && (
            <div className="p-3 rounded-[6px] text-xs font-medium bg-[#FDF0F0] border border-[#F6C4C5] text-[#B4232F] dark:bg-[#2D1416] dark:border-[#422225] dark:text-[#E04855] flex items-center space-x-2">
              <span>⚠️</span>
              <span>{modalError}</span>
            </div>
          )}

          {/* TAB 1: Link Existing Account */}
          {modalTab === 'link' ? (
            <form onSubmit={handleLinkSubmit} className="space-y-4">
              <FormField
                label="Relative's User ID (UUID)"
                required
                helperText="Ask your relative to copy their unique User ID from their profile menu."
              >
                <Input
                  type="text"
                  mono
                  required
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  id="link-target-user-id-input"
                />
              </FormField>

              <FormField label="Relationship Type" required>
                <Select
                  value={linkRelationType}
                  onChange={(e) => setLinkRelationType(e.target.value)}
                  id="link-relationship-type-select"
                >
                  <optgroup label="Grandparents (Father's Side)">
                    <option value="paternal_grandfather">Paternal Grandfather (Father's Father)</option>
                    <option value="paternal_grandmother">Paternal Grandmother (Father's Mother)</option>
                  </optgroup>
                  <optgroup label="Grandparents (Mother's Side)">
                    <option value="maternal_grandfather">Maternal Grandfather (Mother's Father)</option>
                    <option value="maternal_grandmother">Maternal Grandmother (Mother's Mother)</option>
                  </optgroup>
                  <optgroup label="General Grandparents">
                    <option value="grandfather">Grandfather</option>
                    <option value="grandmother">Grandmother</option>
                    <option value="grandparent">Grandparent</option>
                  </optgroup>
                  <optgroup label="Parents & Ascendants">
                    <option value="father">Father</option>
                    <option value="mother">Mother</option>
                    <option value="parent">Parent</option>
                    <option value="stepfather">Stepfather</option>
                    <option value="stepmother">Stepmother</option>
                    <option value="stepparent">Stepparent</option>
                  </optgroup>
                  <optgroup label="Peers & Siblings">
                    <option value="spouse">Spouse / Partner</option>
                    <option value="brother">Brother</option>
                    <option value="sister">Sister</option>
                    <option value="sibling">Sibling</option>
                    <option value="stepbrother">Stepbrother</option>
                    <option value="stepsister">Stepsister</option>
                    <option value="stepsibling">Stepsibling</option>
                  </optgroup>
                  <optgroup label="Descendants">
                    <option value="son">Son</option>
                    <option value="daughter">Daughter</option>
                    <option value="child">Child</option>
                    <option value="stepson">Stepson</option>
                    <option value="stepdaughter">Stepdaughter</option>
                    <option value="stepchild">Stepchild</option>
                  </optgroup>
                  <optgroup label="Extended Kinship">
                    <option value="uncle">Uncle</option>
                    <option value="aunt">Aunt</option>
                    <option value="nephew">Nephew</option>
                    <option value="niece">Niece</option>
                    <option value="cousin">Cousin</option>
                    <option value="relative">Relative / Kin</option>
                  </optgroup>
                </Select>
              </FormField>

              {/* Sibling Options: Full vs Half Sibling */}
              {isSiblingRelation(linkRelationType) && (
                <div className="p-3 rounded-[6px] bg-[#F7F7F5] dark:bg-[#222222] border border-[#E3E3DF] dark:border-[#303030] space-y-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="half-sibling-toggle-link"
                      checked={isHalfSibling}
                      onChange={(e) => setIsHalfSibling(e.target.checked)}
                      className="rounded border-[#D98A91] text-[#B4232F] focus:ring-[#B4232F] cursor-pointer"
                    />
                    <label htmlFor="half-sibling-toggle-link" className="font-semibold text-[#171717] dark:text-[#F0F0F0] cursor-pointer">
                      Half-Sibling (shares only one parent)
                    </label>
                  </div>

                  {isHalfSibling && (
                    <FormField label="Designated Shared Parent" helperText="Select which parent is shared with this half-sibling.">
                      <Select
                        value={sharedParentId}
                        onChange={(e) => setSharedParentId(e.target.value)}
                      >
                        <option value="">Select shared parent...</option>
                        {treeData?.parents?.map((p) => (
                          <option key={p.relative_id} value={p.relative_id}>
                            {p.relationship_type?.toUpperCase()}: {p.full_name}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                  )}
                </div>
              )}

              <div className="flex items-center space-x-2 pt-1 text-xs">
                <input
                  type="checkbox"
                  id="share-consent-checkbox"
                  checked={shareConsent}
                  onChange={(e) => setShareConsent(e.target.checked)}
                  className="rounded border-[#D98A91] text-[#B4232F] focus:ring-[#B4232F] cursor-pointer"
                />
                <label htmlFor="share-consent-checkbox" className="text-[#5F6368] dark:text-[#A0A0A0] cursor-pointer">
                  Allow clinical disease history data sharing with this relative
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#E3E3DF] dark:border-[#303030]">
                <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" loading={submitting} id="submit-link-relative-btn">
                  Confirm &amp; Link
                </Button>
              </div>
            </form>
          ) : (
            /* TAB 2: Create Managed Placeholder Profile */
            <form onSubmit={handlePlaceholderSubmit} className="space-y-4">
              <FormField
                label="Full Name"
                required
                helperText="Enter the name of your family member (e.g. Grandma Helen, Son Leo)."
              >
                <Input
                  type="text"
                  required
                  placeholder="e.g. Leo Vance"
                  value={placeholderName}
                  onChange={(e) => setPlaceholderName(e.target.value)}
                  id="placeholder-name-input"
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Relationship Type" required>
                  <Select
                    value={placeholderRelationType}
                    onChange={(e) => setPlaceholderRelationType(e.target.value)}
                    id="placeholder-relationship-type-select"
                  >
                    <optgroup label="Grandparents (Father's Side)">
                      <option value="paternal_grandfather">Paternal Grandfather (Father's Father)</option>
                      <option value="paternal_grandmother">Paternal Grandmother (Father's Mother)</option>
                    </optgroup>
                    <optgroup label="Grandparents (Mother's Side)">
                      <option value="maternal_grandfather">Maternal Grandfather (Mother's Father)</option>
                      <option value="maternal_grandmother">Maternal Grandmother (Mother's Mother)</option>
                    </optgroup>
                    <optgroup label="General Grandparents">
                      <option value="grandfather">Grandfather</option>
                      <option value="grandmother">Grandmother</option>
                      <option value="grandparent">Grandparent</option>
                    </optgroup>
                    <optgroup label="Parents & Ascendants">
                      <option value="father">Father</option>
                      <option value="mother">Mother</option>
                      <option value="parent">Parent</option>
                    </optgroup>
                    <optgroup label="Peers">
                      <option value="spouse">Spouse / Partner</option>
                      <option value="brother">Brother</option>
                      <option value="sister">Sister</option>
                      <option value="sibling">Sibling</option>
                    </optgroup>
                    <optgroup label="Descendants">
                      <option value="son">Son</option>
                      <option value="daughter">Daughter</option>
                      <option value="child">Child</option>
                    </optgroup>
                    <optgroup label="Extended Kinship">
                      <option value="uncle">Uncle</option>
                      <option value="aunt">Aunt</option>
                      <option value="nephew">Nephew</option>
                      <option value="niece">Niece</option>
                      <option value="cousin">Cousin</option>
                      <option value="relative">Relative / Kin</option>
                    </optgroup>
                  </Select>
                </FormField>

                <FormField label="Biological Sex / Gender">
                  <Select
                    value={placeholderGender}
                    onChange={(e) => setPlaceholderGender(e.target.value)}
                    id="placeholder-gender-select"
                  >
                    <option value="unspecified">Unspecified</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </Select>
                </FormField>
              </div>

              {/* Sibling Options: Full vs Half Sibling */}
              {isSiblingRelation(placeholderRelationType) && (
                <div className="p-3 rounded-[6px] bg-[#F7F7F5] dark:bg-[#222222] border border-[#E3E3DF] dark:border-[#303030] space-y-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="half-sibling-toggle-placeholder"
                      checked={isHalfSibling}
                      onChange={(e) => setIsHalfSibling(e.target.checked)}
                      className="rounded border-[#D98A91] text-[#B4232F] focus:ring-[#B4232F] cursor-pointer"
                    />
                    <label htmlFor="half-sibling-toggle-placeholder" className="font-semibold text-[#171717] dark:text-[#F0F0F0] cursor-pointer">
                      Half-Sibling (shares only one parent)
                    </label>
                  </div>

                  {isHalfSibling && (
                    <FormField label="Designated Shared Parent" helperText="Select which parent is shared with this half-sibling.">
                      <Select
                        value={sharedParentId}
                        onChange={(e) => setSharedParentId(e.target.value)}
                      >
                        <option value="">Select shared parent...</option>
                        {treeData?.parents?.map((p) => (
                          <option key={p.relative_id} value={p.relative_id}>
                            {p.relationship_type?.toUpperCase()}: {p.full_name}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                  )}
                </div>
              )}

              <FormField label="Avatar Image URL (Optional)" helperText="Or paste a public image URL / photo link.">
                <Input
                  type="text"
                  placeholder="https://..."
                  value={placeholderAvatar}
                  onChange={(e) => setPlaceholderAvatar(e.target.value)}
                  id="placeholder-avatar-input"
                />
              </FormField>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#E3E3DF] dark:border-[#303030]">
                <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" loading={submitting} id="submit-create-placeholder-btn">
                  Create Managed Profile
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* 5. MODAL: Node Details, Clinical Diagnostic Summary & Universal Health Record Upload */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={selectedNode?.full_name || 'Relative Details'}
        subtitle={`Role: ${selectedNode?.relationship_type?.toUpperCase() || 'PROFILE'}`}
        icon={<DoodleIcon name="user" className="w-4 h-4 text-[#B4232F]" />}
      >
        {selectedNode && (
          <div className="space-y-4">
            {editError && (
              <div className="p-3 rounded-[6px] text-xs font-medium bg-[#FDF0F0] border border-[#F6C4C5] text-[#B4232F] dark:bg-[#2D1416] dark:border-[#422225] dark:text-[#E04855]">
                {editError}
              </div>
            )}

            {/* Clinical Health Status & Lab Test Breakdown Summary */}
            <div className="p-3.5 rounded-[8px] bg-[#F7F7F5] dark:bg-[#222222] border border-[#E3E3DF] dark:border-[#303030] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#171717] dark:text-[#F0F0F0] flex items-center space-x-1.5">
                  <DoodleIcon name="pulse" className="w-3.5 h-3.5 text-[#B4232F]" />
                  <span>Clinical Health Summary</span>
                </span>
                <Badge status={selectedNode.health_status?.status || 'neutral'} size="sm">
                  {selectedNode.health_status?.label || 'No Data'}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                <div className="p-2 rounded-[6px] bg-white dark:bg-[#1E1E1E] border border-[#E3E3DF] dark:border-[#303030]">
                  <p className="text-[10px] text-[#5F6368] dark:text-[#A0A0A0]">Total Tests</p>
                  <p className="font-bold font-mono text-[#171717] dark:text-[#F0F0F0]">
                    {selectedNode.health_status?.total_tests || 0}
                  </p>
                </div>
                <div className="p-2 rounded-[6px] bg-[#FEF7EB] dark:bg-[#2B1F0E]">
                  <p className="text-[10px] text-[#8F5708] dark:text-[#E6A84F]">Abnormal</p>
                  <p className="font-bold font-mono text-[#8F5708] dark:text-[#E6A84F]">
                    {selectedNode.health_status?.abnormal_count || 0}
                  </p>
                </div>
                <div className="p-2 rounded-[6px] bg-[#FDF0F0] dark:bg-[#2D1416]">
                  <p className="text-[10px] text-[#B4232F] dark:text-[#E04855]">Critical</p>
                  <p className="font-bold font-mono text-[#B4232F] dark:text-[#E04855]">
                    {selectedNode.health_status?.critical_count || 0}
                  </p>
                </div>
              </div>

              {selectedNode.health_status?.latest_report_date && (
                <p className="text-[10px] text-[#858585] text-right pt-1 font-mono">
                  Latest: {new Date(selectedNode.health_status.latest_report_date).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Universal Clinical Records Ingestion Upload Action */}
            <div className="p-3.5 rounded-[8px] border border-[#D98A91]/80 dark:border-[#422225] bg-white dark:bg-[#1E1E1E] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#171717] dark:text-[#F0F0F0] flex items-center space-x-1.5">
                  <DoodleIcon name="file" className="w-3.5 h-3.5 text-[#B4232F] dark:text-[#E04855]" />
                  <span>Clinical Records Ingestion</span>
                </span>
                <Badge status="normal" size="sm">
                  Direct Upload Enabled
                </Badge>
              </div>

              <Button
                type="button"
                variant="primary"
                size="sm"
                className="w-full text-xs font-semibold"
                onClick={() => {
                  setEditModalOpen(false);
                  navigate(
                    `/upload?targetUserId=${selectedNode.relative_id || selectedNode.id}&targetName=${encodeURIComponent(
                      selectedNode.full_name
                    )}&relation=${encodeURIComponent(selectedNode.relationship_type || 'Self')}`
                  );
                }}
                leftIcon={<DoodleIcon name="upload" className="w-3.5 h-3.5 text-white" />}
              >
                Upload Lab Document for {selectedNode.full_name}
              </Button>
            </div>

            {/* Profile Details Edit Form */}
            {selectedNode.can_edit || selectedNode.relationship_type === 'self' ? (
              <form onSubmit={handleSaveNodeEdit} className="space-y-3">
                <FormField label="Full Name" required>
                  <Input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </FormField>

                <FormField label="Biological Sex / Gender">
                  <Select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                  >
                    <option value="unspecified">Unspecified</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </Select>
                </FormField>

                <FormField label="Avatar Image URL">
                  <Input
                    type="text"
                    placeholder="https://..."
                    value={editAvatar}
                    onChange={(e) => setEditAvatar(e.target.value)}
                  />
                </FormField>

                <div className="flex items-center justify-between pt-2 border-t border-[#E3E3DF] dark:border-[#303030]">
                  {selectedNode.relationship_type !== 'self' ? (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => handleUnlink(selectedNode.relationship_id || selectedNode.relative_id || selectedNode.id, selectedNode.full_name)}
                      leftIcon={<DoodleIcon name="trash" className="w-3.5 h-3.5 text-white" />}
                    >
                      Delete Member
                    </Button>
                  ) : (
                    <div />
                  )}
                  <div className="flex space-x-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditModalOpen(false)} disabled={savingEdit}>
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" type="submit" loading={savingEdit}>
                      Save Changes
                    </Button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-[6px] bg-[#F7F7F5] dark:bg-[#222222] text-xs text-[#5F6368] dark:text-[#A0A0A0] flex items-center space-x-2 border border-[#E3E3DF] dark:border-[#303030]">
                  <span>ℹ️</span>
                  <span>
                    Independent claimed account profile. You can upload clinical lab reports for {selectedNode.full_name} using the button above.
                  </span>
                </div>
                <div className="flex justify-end pt-1">
                  <Button variant="secondary" size="sm" onClick={() => setEditModalOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}

          </div>
        )}
      </Modal>

    </div>
  );
}

export default FamilyTreePage;
