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
import DoodleIcon from '../components/common/DoodleIcon';
import FamilyTreeNode from '../components/family/FamilyTreeNode';
import FamilyTreeConnectors from '../components/family/FamilyTreeConnectors';
import PendingClaimsBanner from '../components/family/PendingClaimsBanner';
import { Button, Card, FormField, Input, Select, Modal, EmptyState, Badge } from '../components/ui';

export function FamilyTreePage() {
  const { user, userId } = useAuth();
  const navigate = useNavigate();
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);

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
  const fileInputRef = useRef(null);

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
      setSuccessMessage('Family member linked successfully with bidirectional graph synchronization.');
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

  const handleNodeClick = (member) => {
    setSelectedNode(member);
    setEditName(member.full_name || '');
    setEditGender(member.gender || 'unspecified');
    setEditAvatar(member.avatar_url || '');
    setEditError('');
    setEditModalOpen(true);
  };

  const handleAvatarFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setEditAvatar(event.target.result);
      };
      reader.readAsDataURL(file);
    }
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
    if (!window.confirm(`Are you sure you want to unlink ${relativeName || 'this relative'} from your family pedigree?`)) {
      return;
    }

    try {
      await unlinkFamilyMember(relationshipId);
      setSuccessMessage(`Unlinked ${relativeName || 'relative'} successfully.`);
      loadTree();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Failed to unlink relative:', err);
      alert('Failed to unlink relative.');
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

  const totalMembers = treeData?.all_members?.length || 0;
  const isSiblingRelation = (rel) => ['brother', 'sister', 'sibling'].includes((rel || '').toLowerCase());

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      
      {/* Pending Incoming Claims Notification */}
      <PendingClaimsBanner onClaimResolved={loadTree} />

      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#CBD6D2] dark:border-[#2F433E]">
        <div className="space-y-1">
          <span className="text-[11px] font-bold tracking-widest text-[#1E4D45] dark:text-[#57BA8E] uppercase">
            Genealogical Intelligence
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#13221F] dark:text-[#EFF5F3]">
            Family Health Pedigree
          </h1>
          <p className="text-xs sm:text-sm text-[#4E6863] dark:text-[#7E9993]">
            Continuous genealogical chart with dynamic health status rings and hereditary biomarker tracking.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center space-x-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => { setModalOpen(true); setModalError(''); }}
            id="open-add-member-modal-btn"
            leftIcon={<DoodleIcon name="plus" className="w-3.5 h-3.5 text-white" />}
          >
            + Add Relative
          </Button>
        </div>
      </div>

      {/* Health Status Legend */}
      <div className="p-3 rounded-[8px] bg-white dark:bg-[#151E1C] border border-[#CBD6D2] dark:border-[#2F433E] flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center space-x-2 font-semibold text-[#13221F] dark:text-[#EFF5F3]">
          <DoodleIcon name="pulse" className="w-4 h-4 text-[#1E4D45] dark:text-[#57BA8E]" />
          <span>Health Ring Legend:</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-[#18573D] border border-[#C8E6D6]" />
            <span className="text-[#3D524E] dark:text-[#A0B6B0]">Optimal (All Normal)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-[#8F5708] border border-[#F6DCB1]" />
            <span className="text-[#3D524E] dark:text-[#A0B6B0]">Warning (Borderline)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-[#942728] border border-[#F6C4C5]" />
            <span className="text-[#3D524E] dark:text-[#A0B6B0]">Critical (High/Low Alert)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-[#7E9993] border border-[#CBD6D2]" />
            <span className="text-[#3D524E] dark:text-[#A0B6B0]">No Lab Data</span>
          </div>
        </div>
      </div>

      {/* Suggested Co-Parent Link Prompt Banner */}
      {treeData?.suggested_links && treeData.suggested_links.length > 0 && (
        <div className="space-y-3">
          {treeData.suggested_links.map((sug, idx) => (
            <Card
              key={idx}
              radius="lg"
              className="p-4 bg-[#FEF7EB] dark:bg-[#2B1F0E] border border-[#F6DCB1] dark:border-[#573E1B] shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">💡</span>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-[#8F5708] dark:text-[#E6A84F]">
                      Suggested Relationship Link
                    </p>
                    <p className="text-xs text-[#13221F] dark:text-[#EFF5F3]">
                      {sug.reason} Would you like to link them as Spouses/Partners?
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConfirmSpouse(sug, false)}
                    className="text-xs"
                  >
                    Dismiss
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleConfirmSpouse(sug, true)}
                    leftIcon={<DoodleIcon name="check" className="w-3 h-3 text-white" />}
                    className="text-xs"
                  >
                    Link as Spouses
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-3.5 rounded-[8px] text-xs font-semibold bg-[#F0F8F4] text-[#18573D] border border-[#C8E6D6] dark:bg-[#11251B] dark:text-[#57BA8E] dark:border-[#224D37] flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <span>✓</span>
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            className="text-[#18573D] dark:text-[#57BA8E] font-bold underline ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. CONTINUOUS PEDIGREE CANVAS WITH DYNAMIC CONNECTOR LINES */}
      {loading ? (
        <Card radius="lg" className="p-12 text-center space-y-3 bg-white dark:bg-[#151E1C] border border-[#CBD6D2] dark:border-[#2F433E]">
          <div className="w-5 h-5 mx-auto rounded-full border-2 border-[#1E4D45] dark:border-[#57BA8E] border-t-transparent animate-spin" />
          <p className="text-xs text-[#7E9993]">Loading genealogical pedigree tree...</p>
        </Card>
      ) : !treeData || (!treeData.self_node && totalMembers === 0) ? (
        <EmptyState
          icon={<DoodleIcon name="tree" className="w-5 h-5" />}
          title="No family members linked yet"
          description="Link an existing user by UUID or create a managed placeholder profile to start mapping your multi-generational pedigree."
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
        /* SINGLE CONTINUOUS CANVAS (No boxed containers per tier) */
        <div
          ref={canvasRef}
          className="relative max-w-5xl mx-auto py-4 px-2 space-y-10 min-h-[500px]"
        >
          {/* Dynamic SVG Orthogonal Connector Lines Layer */}
          <FamilyTreeConnectors containerRef={canvasRef} treeData={treeData} />

          {/* TIER 1: Grandparents Header & Nodes */}
          {treeData.grandparents && treeData.grandparents.length > 0 && (
            <div className="space-y-3 relative z-10">
              <div className="text-center">
                <span className="text-[11px] font-bold tracking-widest text-[#7E9993] uppercase">
                  Grandparents ({treeData.grandparents.length})
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
                {treeData.grandparents.map((m) => (
                  <FamilyTreeNode
                    key={m.relationship_id}
                    member={m}
                    onNodeClick={handleNodeClick}
                    onUnlink={handleUnlink}
                  />
                ))}
              </div>
            </div>
          )}

          {/* TIER 2: Parents Header & Nodes */}
          <div className="space-y-3 relative z-10">
            <div className="text-center">
              <span className="text-[11px] font-bold tracking-widest text-[#1E4D45] dark:text-[#57BA8E] uppercase">
                Parents ({treeData.parents?.length || 0})
              </span>
            </div>
            
            {treeData.parents && treeData.parents.length > 0 ? (
              <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
                {treeData.parents.map((m) => (
                  <FamilyTreeNode
                    key={m.relationship_id}
                    member={m}
                    onNodeClick={handleNodeClick}
                    onUnlink={handleUnlink}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalTab('placeholder');
                    setPlaceholderRelationType('father');
                    setModalOpen(true);
                  }}
                  className="text-xs font-semibold text-[#1E4D45] dark:text-[#57BA8E] hover:underline cursor-pointer"
                >
                  + Add Parent Profile
                </button>
              </div>
            )}
          </div>

          {/* TIER 3: Self, Spouse & Siblings (Peer Level) */}
          <div className="space-y-3 relative z-10">
            <div className="text-center">
              <span className="text-[11px] font-bold tracking-widest text-[#1E4D45] dark:text-[#57BA8E] uppercase">
                Self, Spouse &amp; Siblings
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
              {/* Siblings on Left/Middle */}
              {treeData.peers
                ?.filter((m) => ['brother', 'sister', 'sibling'].includes(m.relationship_type?.toLowerCase()))
                .map((m) => (
                  <FamilyTreeNode
                    key={m.relationship_id}
                    member={m}
                    onNodeClick={handleNodeClick}
                    onUnlink={handleUnlink}
                  />
                ))}

              {/* Primary User Node (Self) */}
              <FamilyTreeNode
                member={treeData.self_node}
                isSelf={true}
                onNodeClick={handleNodeClick}
              />

              {/* Spouse / Partner on Right */}
              {treeData.peers
                ?.filter((m) => ['spouse', 'husband', 'wife', 'partner'].includes(m.relationship_type?.toLowerCase()))
                .map((m) => (
                  <FamilyTreeNode
                    key={m.relationship_id}
                    member={m}
                    onNodeClick={handleNodeClick}
                    onUnlink={handleUnlink}
                  />
                ))}
            </div>
          </div>

          {/* TIER 4: Children & Descendants */}
          {treeData.children && treeData.children.length > 0 && (
            <div className="space-y-3 relative z-10">
              <div className="text-center">
                <span className="text-[11px] font-bold tracking-widest text-[#7E9993] uppercase">
                  Children &amp; Descendants ({treeData.children.length})
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
                {treeData.children.map((m) => (
                  <FamilyTreeNode
                    key={m.relationship_id}
                    member={m}
                    onNodeClick={handleNodeClick}
                    onUnlink={handleUnlink}
                  />
                ))}
              </div>
            </div>
          )}

          {/* TIER 5: Extended Kinship (Uncles, Aunts, Cousins) */}
          {treeData.extended && treeData.extended.length > 0 && (
            <div className="space-y-3 relative z-10 pt-4 border-t border-[#E0E7E4] dark:border-[#22312E]">
              <div className="text-center">
                <span className="text-[11px] font-bold tracking-widest text-[#7E9993] uppercase">
                  Extended Kinship • Uncles, Aunts &amp; Cousins ({treeData.extended.length})
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
                {treeData.extended.map((m) => (
                  <FamilyTreeNode
                    key={m.relationship_id}
                    member={m}
                    onNodeClick={handleNodeClick}
                    onUnlink={handleUnlink}
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* 3. MODAL: Add Relative (Link UUID or Create Placeholder) */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Family Relative"
        subtitle="Connect existing accounts by User ID or create managed placeholder profiles"
        icon={<DoodleIcon name="plus" className="w-4 h-4 text-[#1E4D45] dark:text-[#57BA8E]" />}
      >
        <div className="space-y-4">
          
          {/* Modal Tab Switcher */}
          <div className="p-1 rounded-[8px] bg-[#F4F6F5] dark:bg-[#1C2725] border border-[#CBD6D2] dark:border-[#2F433E] flex items-center gap-1">
            <button
              type="button"
              onClick={() => { setModalTab('link'); setModalError(''); }}
              className={`flex-1 py-1.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer ${
                modalTab === 'link'
                  ? 'bg-white dark:bg-[#151E1C] text-[#13221F] dark:text-[#EFF5F3] shadow-xs border border-[#CBD6D2] dark:border-[#2F433E]'
                  : 'text-[#4E6863] dark:text-[#7E9993]'
              }`}
            >
              Link by User ID (UUID)
            </button>
            <button
              type="button"
              onClick={() => { setModalTab('placeholder'); setModalError(''); }}
              className={`flex-1 py-1.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer ${
                modalTab === 'placeholder'
                  ? 'bg-white dark:bg-[#151E1C] text-[#13221F] dark:text-[#EFF5F3] shadow-xs border border-[#CBD6D2] dark:border-[#2F433E]'
                  : 'text-[#4E6863] dark:text-[#7E9993]'
              }`}
            >
              + Create Managed Profile
            </button>
          </div>

          {modalError && (
            <div className="p-3 rounded-[6px] text-xs font-medium bg-[#FDF0F0] border border-[#F6C4C5] text-[#942728] dark:bg-[#2D1616] dark:border-[#5B292A] dark:text-[#E57373] flex items-center space-x-2">
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
                  <optgroup label="Tier 1 • Grandparents">
                    <option value="grandfather">Grandfather</option>
                    <option value="grandmother">Grandmother</option>
                    <option value="grandparent">Grandparent</option>
                  </optgroup>
                  <optgroup label="Tier 2 • Parents & Ascendants">
                    <option value="father">Father</option>
                    <option value="mother">Mother</option>
                    <option value="parent">Parent</option>
                  </optgroup>
                  <optgroup label="Tier 3 • Peers">
                    <option value="spouse">Spouse / Partner</option>
                    <option value="brother">Brother</option>
                    <option value="sister">Sister</option>
                    <option value="sibling">Sibling</option>
                  </optgroup>
                  <optgroup label="Tier 4 • Descendants">
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

              {/* Sibling Options: Full vs Half Sibling */}
              {isSiblingRelation(linkRelationType) && (
                <div className="p-3 rounded-[6px] bg-[#F4F6F5] dark:bg-[#1C2725] border border-[#CBD6D2] dark:border-[#2F433E] space-y-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="half-sibling-toggle-link"
                      checked={isHalfSibling}
                      onChange={(e) => setIsHalfSibling(e.target.checked)}
                      className="rounded border-[#CBD6D2] text-[#1E4D45] focus:ring-[#1E4D45] cursor-pointer"
                    />
                    <label htmlFor="half-sibling-toggle-link" className="font-semibold text-[#13221F] dark:text-[#EFF5F3] cursor-pointer">
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
                  className="rounded border-[#CBD6D2] text-[#1E4D45] focus:ring-[#1E4D45] cursor-pointer"
                />
                <label htmlFor="share-consent-checkbox" className="text-[#3D524E] dark:text-[#A0B6B0] cursor-pointer">
                  Allow clinical disease history data sharing with this relative
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#CBD6D2] dark:border-[#2F433E]">
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
                    <optgroup label="Tier 1 • Grandparents">
                      <option value="grandfather">Grandfather</option>
                      <option value="grandmother">Grandmother</option>
                      <option value="grandparent">Grandparent</option>
                    </optgroup>
                    <optgroup label="Tier 2 • Parents & Ascendants">
                      <option value="father">Father</option>
                      <option value="mother">Mother</option>
                      <option value="parent">Parent</option>
                    </optgroup>
                    <optgroup label="Tier 3 • Peers">
                      <option value="spouse">Spouse / Partner</option>
                      <option value="brother">Brother</option>
                      <option value="sister">Sister</option>
                      <option value="sibling">Sibling</option>
                    </optgroup>
                    <optgroup label="Tier 4 • Descendants">
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
                <div className="p-3 rounded-[6px] bg-[#F4F6F5] dark:bg-[#1C2725] border border-[#CBD6D2] dark:border-[#2F433E] space-y-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="half-sibling-toggle-placeholder"
                      checked={isHalfSibling}
                      onChange={(e) => setIsHalfSibling(e.target.checked)}
                      className="rounded border-[#CBD6D2] text-[#1E4D45] focus:ring-[#1E4D45] cursor-pointer"
                    />
                    <label htmlFor="half-sibling-toggle-placeholder" className="font-semibold text-[#13221F] dark:text-[#EFF5F3] cursor-pointer">
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

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#CBD6D2] dark:border-[#2F433E]">
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

      {/* 4. MODAL: Node Details / Edit Avatar Dialog */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={selectedNode?.can_edit || selectedNode?.relationship_type === 'self' ? 'Edit Profile & Avatar' : 'Relative Pedigree Details'}
        subtitle={
          selectedNode?.can_edit
            ? 'Update profile photo and metadata for this node'
            : 'View-only health status and pedigree profile'
        }
        icon={<DoodleIcon name="user" className="w-4 h-4 text-[#1E4D45] dark:text-[#57BA8E]" />}
      >
        {selectedNode && (
          <div className="space-y-4">
            
            {editError && (
              <div className="p-3 rounded-[6px] text-xs font-medium bg-[#FDF0F0] border border-[#F6C4C5] text-[#942728] dark:bg-[#2D1616] dark:border-[#5B292A] dark:text-[#E57373] flex items-center space-x-2">
                <span>⚠️</span>
                <span>{editError}</span>
              </div>
            )}

            {/* Avatar Preview & Upload Area */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-[10px] bg-[#F4F6F5] dark:bg-[#1C2725] border border-[#CBD6D2] dark:border-[#2F433E]">
              <div className="w-16 h-16 rounded-full p-1 border-2 border-[#1E4D45] dark:border-[#57BA8E] shadow-sm shrink-0">
                {editAvatar ? (
                  <img src={editAvatar} alt="Avatar Preview" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#1E4D45] text-white flex items-center justify-center font-bold text-lg select-none">
                    {editName ? editName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-center sm:text-left flex-1">
                <h4 className="text-xs font-bold text-[#13221F] dark:text-[#EFF5F3]">{editName || 'Relative'}</h4>
                <p className="text-[11px] text-[#4E6863] dark:text-[#7E9993]">
                  {selectedNode.is_placeholder ? '⚙️ Managed Placeholder Profile' : '✓ Claimed Independent Profile'}
                </p>

                {(selectedNode.can_edit || selectedNode.relationship_type === 'self') && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      📁 Upload Photo
                    </Button>
                    {editAvatar && (
                      <button
                        type="button"
                        onClick={() => setEditAvatar('')}
                        className="text-[11px] text-[#942728] dark:text-[#E57373] hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Health Status Diagnostics Box */}
            <div className="p-3.5 rounded-[8px] border border-[#CBD6D2] dark:border-[#2F433E] bg-white dark:bg-[#151E1C] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#13221F] dark:text-[#EFF5F3]">Diagnostic Health Status</span>
                <Badge
                  status={
                    selectedNode.health_status?.status === 'normal'
                      ? 'normal'
                      : selectedNode.health_status?.status === 'warning'
                      ? 'warning'
                      : selectedNode.health_status?.status === 'critical'
                      ? 'critical'
                      : 'neutral'
                  }
                  size="sm"
                  dot
                >
                  {selectedNode.health_status?.label || 'No Data'}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                <div className="p-2 rounded-[6px] bg-[#F4F6F5] dark:bg-[#1C2725]">
                  <p className="text-[10px] text-[#4E6863] dark:text-[#7E9993]">Total Tests</p>
                  <p className="font-bold font-mono text-[#13221F] dark:text-[#EFF5F3]">
                    {selectedNode.health_status?.total_tests || 0}
                  </p>
                </div>
                <div className="p-2 rounded-[6px] bg-[#FEF7EB] dark:bg-[#2B1F0E]">
                  <p className="text-[10px] text-[#8F5708] dark:text-[#E6A84F]">Abnormal</p>
                  <p className="font-bold font-mono text-[#8F5708] dark:text-[#E6A84F]">
                    {selectedNode.health_status?.abnormal_count || 0}
                  </p>
                </div>
                <div className="p-2 rounded-[6px] bg-[#FDF0F0] dark:bg-[#2D1616]">
                  <p className="text-[10px] text-[#942728] dark:text-[#E57373]">Critical</p>
                  <p className="font-bold font-mono text-[#942728] dark:text-[#E57373]">
                    {selectedNode.health_status?.critical_count || 0}
                  </p>
                </div>
              </div>

              {selectedNode.health_status?.latest_report_date && (
                <p className="text-[10px] text-[#7E9993] text-right pt-1 font-mono">
                  Latest: {new Date(selectedNode.health_status.latest_report_date).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Lab Report Upload Action Section */}
            <div className="p-3.5 rounded-[8px] border border-[#CBD6D2] dark:border-[#2F433E] bg-[#F4F6F5] dark:bg-[#1C2725] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#13221F] dark:text-[#EFF5F3] flex items-center space-x-1.5">
                  <DoodleIcon name="file" className="w-3.5 h-3.5 text-[#1E4D45] dark:text-[#57BA8E]" />
                  <span>Clinical Records Ingestion</span>
                </span>
                <Badge status={selectedNode.can_edit || selectedNode.relationship_type === 'self' ? 'normal' : 'neutral'} size="sm">
                  {selectedNode.can_edit || selectedNode.relationship_type === 'self' ? 'Direct Upload Enabled' : 'View Only'}
                </Badge>
              </div>

              {selectedNode.can_edit || selectedNode.relationship_type === 'self' ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-semibold"
                  onClick={() => {
                    setEditModalOpen(false);
                    navigate(
                      `/upload?targetUserId=${selectedNode.id}&targetName=${encodeURIComponent(
                        selectedNode.full_name
                      )}&relation=${encodeURIComponent(selectedNode.relationship_type || 'Self')}`
                    );
                  }}
                  leftIcon={<DoodleIcon name="upload" className="w-3.5 h-3.5 text-[#1E4D45] dark:text-[#57BA8E]" />}
                >
                  Upload Lab Document for {selectedNode.full_name}
                </Button>
              ) : (
                <div className="space-y-1.5 pt-1">
                  <button
                    type="button"
                    disabled
                    className="w-full py-2 px-3 rounded-[6px] text-xs font-semibold bg-[#EAEAEA] dark:bg-[#252525] text-[#7E9993] border border-[#CBD6D2] dark:border-[#2F433E] cursor-not-allowed flex items-center justify-center space-x-1.5 opacity-60"
                  >
                    <span>🔒 Upload Lab Document (Disabled)</span>
                  </button>
                  <p className="text-[11px] text-[#7E9993] text-center">
                    This relative manages their own health records. Direct report uploads are enabled for managed placeholder profiles.
                  </p>
                </div>
              )}
            </div>

            {/* Edit Form (if permitted) */}
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

                <FormField label="Avatar Image URL (or use file upload above)">
                  <Input
                    type="text"
                    placeholder="https://..."
                    value={editAvatar}
                    onChange={(e) => setEditAvatar(e.target.value)}
                  />
                </FormField>

                <div className="flex justify-end space-x-2 pt-2 border-t border-[#CBD6D2] dark:border-[#2F433E]">
                  <Button variant="secondary" size="sm" onClick={() => setEditModalOpen(false)} disabled={savingEdit}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" type="submit" loading={savingEdit}>
                    Save Changes
                  </Button>
                </div>
              </form>
            ) : (
              <div className="p-3 rounded-[6px] bg-[#F4F6F5] dark:bg-[#1C2725] text-xs text-[#4E6863] dark:text-[#7E9993] flex items-center space-x-2">
                <span>🔒</span>
                <span>
                  This is an independent claimed user account. Only the account owner can edit their personal profile and avatar.
                </span>
              </div>
            )}

          </div>
        )}
      </Modal>

    </div>
  );
}

export default FamilyTreePage;
