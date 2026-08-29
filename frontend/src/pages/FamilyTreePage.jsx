import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getFamilyTree,
  linkFamilyMember,
  createPlaceholderProfile,
  updateFamilyMember,
  unlinkFamilyMember,
} from '../api/family';
import DoodleIcon from '../components/common/DoodleIcon';
import FamilyTreeNode from '../components/family/FamilyTreeNode';
import PendingClaimsBanner from '../components/family/PendingClaimsBanner';
import { Button, Card, FormField, Input, Select, Modal, EmptyState, Badge } from '../components/ui';

export function FamilyTreePage() {
  const { user, userId } = useAuth();
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Link / Create Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('link'); // 'link' | 'placeholder'
  
  // Link by UUID form state
  const [targetUserId, setTargetUserId] = useState('');
  const [linkRelationType, setLinkRelationType] = useState('father');
  const [shareConsent, setShareConsent] = useState(true);
  
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
      });
      setSuccessMessage('Family member linked successfully with bidirectional synchronization.');
      setTargetUserId('');
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

  // Handle creating managed placeholder
  const handlePlaceholderSubmit = async (e) => {
    e.preventDefault();
    if (!placeholderName.trim()) {
      setModalError('Please enter the relative’s full name.');
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
      });
      setSuccessMessage(`Created managed profile for ${placeholderName.trim()} successfully.`);
      setPlaceholderName('');
      setPlaceholderAvatar('');
      setModalOpen(false);
      loadTree();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Failed to create placeholder profile:', err);
      setModalError(err.response?.data?.detail || 'Failed to create managed placeholder profile.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle node selection & open edit/view modal
  const handleNodeClick = (node) => {
    setSelectedNode(node);
    setEditName(node.full_name || '');
    setEditGender(node.gender || 'unspecified');
    setEditAvatar(node.avatar_url || '');
    setEditError('');
    setEditModalOpen(true);
  };

  // Handle photo file selection with client-side Base64 preview
  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setEditError('Photo file size must be under 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEditAvatar(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Save node edit changes (for self or managed placeholder)
  const handleSaveNodeEdit = async (e) => {
    e.preventDefault();
    if (!selectedNode) return;

    setSavingEdit(true);
    setEditError('');
    const targetId = selectedNode.relative_id || selectedNode.id;

    try {
      await updateFamilyMember(targetId, {
        manager_user_id: userId,
        full_name: editName.trim(),
        gender: editGender,
        avatar_url: editAvatar || null,
      });
      setSuccessMessage('Profile and avatar updated successfully.');
      setEditModalOpen(false);
      loadTree();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Failed to update member profile:', err);
      setEditError(err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle unlinking
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

  const totalMembers = treeData?.all_members?.length || 0;

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
            Hierarchical genealogical health network with real-time biomarker traffic-light status rings.
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

      {/* 2. TRUE HIERARCHICAL VISUAL GENEALOGY TREE */}
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
        <div className="space-y-6 max-w-5xl mx-auto">

          {/* TIER 1: Grandparents & Ascendants */}
          {treeData.grandparents && treeData.grandparents.length > 0 && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#4E6863] dark:text-[#7E9993]">
                    Tier 1 • Grandparents ({treeData.grandparents.length})
                  </span>
                </div>
                <div className="p-4 rounded-[12px] border border-[#E0E7E4] dark:border-[#22312E] bg-white/70 dark:bg-[#151E1C]/70 shadow-xs flex flex-wrap items-center justify-center gap-4">
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

              {/* Vertical Connector Line (Tier 1 -> Tier 2) */}
              <div className="flex justify-center -my-2">
                <div className="w-px h-6 bg-[#CBD6D2] dark:bg-[#2F433E]" />
              </div>
            </>
          )}

          {/* TIER 2: Parents & Ascendants */}
          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#1E4D45] dark:text-[#57BA8E]">
                Tier 2 • Parents &amp; Ascendants ({treeData.parents?.length || 0})
              </span>
            </div>

            <div className="p-4 rounded-[12px] border border-[#CBD6D2] dark:border-[#2F433E] bg-white dark:bg-[#151E1C] min-h-[90px] flex items-center justify-center shadow-xs">
              {treeData.parents && treeData.parents.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-4 w-full">
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
                <div className="text-center text-xs text-[#7E9993] space-y-1">
                  <p className="font-semibold text-[#13221F] dark:text-[#EFF5F3]">No Parents Linked</p>
                  <p className="text-[11px]">Link mother or father accounts to track hereditary health patterns.</p>
                  <button
                    onClick={() => {
                      setModalTab('placeholder');
                      setPlaceholderRelationType('father');
                      setModalOpen(true);
                    }}
                    className="text-xs font-semibold text-[#1E4D45] dark:text-[#57BA8E] hover:underline pt-1 cursor-pointer"
                  >
                    + Add Parent
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Vertical Connector Line (Tier 2 -> Tier 3) */}
          <div className="flex justify-center -my-2">
            <div className="w-px h-6 bg-[#CBD6D2] dark:bg-[#2F433E]" />
          </div>

          {/* TIER 3: Self, Spouse & Siblings (Center Focus Peer Level) */}
          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#1E4D45] dark:text-[#57BA8E]">
                Tier 3 • Self, Spouse &amp; Siblings ({1 + (treeData.peers?.length || 0)})
              </span>
            </div>

            <div className="p-5 rounded-[12px] border-2 border-[#1E4D45] dark:border-[#336E63] bg-white dark:bg-[#151E1C] shadow-sm">
              <div className="flex flex-wrap items-center justify-center gap-5">
                
                {/* Primary User Self Node */}
                {treeData.self_node && (
                  <FamilyTreeNode
                    member={treeData.self_node}
                    isSelf={true}
                    onNodeClick={handleNodeClick}
                  />
                )}

                {/* Peer Relatives (Spouse & Siblings rendered at identical horizontal level) */}
                {treeData.peers?.map((m) => (
                  <FamilyTreeNode
                    key={m.relationship_id}
                    member={m}
                    onNodeClick={handleNodeClick}
                    onUnlink={handleUnlink}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Vertical Connector Line (Tier 3 -> Tier 4) */}
          <div className="flex justify-center -my-2">
            <div className="w-px h-6 bg-[#CBD6D2] dark:bg-[#2F433E]" />
          </div>

          {/* TIER 4: Children & Descendants */}
          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#1E4D45] dark:text-[#57BA8E]">
                Tier 4 • Children &amp; Descendants ({treeData.children?.length || 0})
              </span>
            </div>

            <div className="p-4 rounded-[12px] border border-[#CBD6D2] dark:border-[#2F433E] bg-white dark:bg-[#151E1C] min-h-[90px] flex items-center justify-center shadow-xs">
              {treeData.children && treeData.children.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-4 w-full">
                  {treeData.children.map((m) => (
                    <FamilyTreeNode
                      key={m.relationship_id}
                      member={m}
                      onNodeClick={handleNodeClick}
                      onUnlink={handleUnlink}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center text-xs text-[#7E9993] space-y-1">
                  <p className="font-semibold text-[#13221F] dark:text-[#EFF5F3]">No Children Linked</p>
                  <p className="text-[11px]">Link children accounts to track hereditary health trajectories.</p>
                  <button
                    onClick={() => {
                      setModalTab('placeholder');
                      setPlaceholderRelationType('son');
                      setModalOpen(true);
                    }}
                    className="text-xs font-semibold text-[#1E4D45] dark:text-[#57BA8E] hover:underline pt-1 cursor-pointer"
                  >
                    + Add Child
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Extended Kinship Tier (if any) */}
          {treeData.extended && treeData.extended.length > 0 && (
            <>
              <div className="flex justify-center -my-2">
                <div className="w-px h-6 bg-[#CBD6D2] dark:bg-[#2F433E]" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#4E6863] dark:text-[#7E9993]">
                    Extended Kinship ({treeData.extended.length})
                  </span>
                </div>
                <div className="p-4 rounded-[12px] border border-[#E0E7E4] dark:border-[#22312E] bg-white dark:bg-[#151E1C] flex flex-wrap items-center justify-center gap-4">
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
            </>
          )}

        </div>
      )}

      {/* 3. MODAL: Add Relative (Tabbed: Link Existing User vs Create Managed Placeholder) */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Family Relative"
        subtitle="Connect an existing user or create a managed placeholder profile"
        icon={<DoodleIcon name="tree" className="w-4 h-4 text-[#1E4D45] dark:text-[#57BA8E]" />}
      >
        <div className="space-y-4">
          
          {/* Segmented Mode Control */}
          <div className="p-1 rounded-[8px] bg-[#F4F6F5] dark:bg-[#1C2725] border border-[#CBD6D2] dark:border-[#2F433E] flex items-center gap-1">
            <button
              type="button"
              onClick={() => { setModalTab('link'); setModalError(''); }}
              className={`flex-1 py-1.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer ${
                modalTab === 'link'
                  ? 'bg-white dark:bg-[#151E1C] text-[#13221F] dark:text-[#EFF5F3] shadow-xs'
                  : 'text-[#4E6863] dark:text-[#7E9993] hover:text-[#13221F]'
              }`}
            >
              Link Existing Account (UUID)
            </button>
            <button
              type="button"
              onClick={() => { setModalTab('placeholder'); setModalError(''); }}
              className={`flex-1 py-1.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer ${
                modalTab === 'placeholder'
                  ? 'bg-[#1E4D45] text-white dark:bg-[#336E63] shadow-xs'
                  : 'text-[#4E6863] dark:text-[#7E9993] hover:text-[#13221F]'
              }`}
            >
              + Create Managed Placeholder
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
                    <option value="relative">Relative / Kin</option>
                  </optgroup>
                </Select>
              </FormField>

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
              <div className="p-3 rounded-[6px] bg-[#E5EFEA] dark:bg-[#1A2C28] text-xs text-[#1E4D45] dark:text-[#57BA8E] space-y-1">
                <p className="font-semibold">What is a Managed Placeholder?</p>
                <p className="text-[11px] leading-relaxed">
                  A placeholder gets a unique UUID immediately. You can upload lab reports, view health status, and manage their profile. When they sign up for real, you can seamlessly transfer ownership to them.
                </p>
              </div>

              <FormField label="Relative's Full Name" required>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Eleanor Vance"
                  value={placeholderName}
                  onChange={(e) => setPlaceholderName(e.target.value)}
                  id="placeholder-name-input"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Relationship Type" required>
                  <Select
                    value={placeholderRelationType}
                    onChange={(e) => setPlaceholderRelationType(e.target.value)}
                    id="placeholder-relationship-type-select"
                  >
                    <optgroup label="Tier 1 • Grandparents">
                      <option value="grandfather">Grandfather</option>
                      <option value="grandmother">Grandmother</option>
                    </optgroup>
                    <optgroup label="Tier 2 • Parents">
                      <option value="father">Father</option>
                      <option value="mother">Mother</option>
                    </optgroup>
                    <optgroup label="Tier 3 • Peers">
                      <option value="spouse">Spouse</option>
                      <option value="brother">Brother</option>
                      <option value="sister">Sister</option>
                    </optgroup>
                    <optgroup label="Tier 4 • Children">
                      <option value="son">Son</option>
                      <option value="daughter">Daughter</option>
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
              <div className="w-20 h-20 rounded-full p-1 border-2 border-[#1E4D45] dark:border-[#57BA8E] shadow-sm shrink-0">
                {editAvatar ? (
                  <img src={editAvatar} alt="Avatar Preview" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#1E4D45] text-white flex items-center justify-center font-bold text-xl select-none">
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
