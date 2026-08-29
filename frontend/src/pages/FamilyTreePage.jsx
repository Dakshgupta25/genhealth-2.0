import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFamilyMembers, linkFamilyMember, unlinkFamilyMember } from '../api/family';
import DoodleIcon from '../components/common/DoodleIcon';
import FamilyTreeNode from '../components/family/FamilyTreeNode';
import { Button, Card, FormField, Input, Select, Modal, EmptyState } from '../components/ui';

export function FamilyTreePage() {
  const { user, userId } = useAuth();
  const [relatives, setRelatives] = useState([]);
  const [loading, setLoading] = useState(true);

  // Link Modal State
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [relationshipType, setRelationshipType] = useState('father');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadFamily = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getFamilyMembers(userId);
      setRelatives(data || []);
    } catch (err) {
      console.error('Failed to load family members:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadFamily();
  }, [loadFamily]);

  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    if (!targetUserId.trim()) {
      setModalError('Please enter the relative’s User ID (UUID).');
      return;
    }

    setSubmitting(true);
    setModalError('');
    try {
      await linkFamilyMember(userId, targetUserId.trim(), relationshipType);
      setSuccessMessage('Family member linked successfully.');
      setTargetUserId('');
      setLinkModalOpen(false);
      loadFamily();
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

  const handleUnlink = async (relationshipId, relativeName) => {
    if (!window.confirm(`Are you sure you want to unlink ${relativeName || 'this relative'} from your family pedigree?`)) {
      return;
    }

    try {
      await unlinkFamilyMember(relationshipId);
      setSuccessMessage(`Unlinked ${relativeName || 'relative'} successfully.`);
      loadFamily();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Failed to unlink relative:', err);
      alert('Failed to unlink relative.');
    }
  };

  // Organize relatives into 3 generational tiers:
  const parentRelatives = relatives.filter((r) =>
    ['father', 'mother', 'parent'].includes(r.relationship_type?.toLowerCase())
  );

  const peerRelatives = relatives.filter((r) =>
    ['spouse', 'husband', 'wife', 'brother', 'sister', 'sibling'].includes(
      r.relationship_type?.toLowerCase()
    )
  );

  const childRelatives = relatives.filter((r) =>
    ['son', 'daughter', 'child'].includes(r.relationship_type?.toLowerCase())
  );

  const otherRelatives = relatives.filter(
    (r) =>
      ![
        'father', 'mother', 'parent',
        'spouse', 'husband', 'wife', 'brother', 'sister', 'sibling',
        'son', 'daughter', 'child',
      ].includes(r.relationship_type?.toLowerCase())
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      
      {/* 1. Header Section with Red Titles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E3E3DF] dark:border-[#303030]">
        <div className="space-y-1">
          <span className="text-[11px] font-bold tracking-widest text-[#B4232F] dark:text-[#E04855] uppercase">
            Genealogical Intelligence
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#B4232F] dark:text-[#E04855]">
            Family Health Pedigree
          </h1>
          <p className="text-xs sm:text-sm text-[#5F6368] dark:text-[#A0A0A0]">
            Understand hereditary health patterns and risk predispositions across generations.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => { setLinkModalOpen(true); setModalError(''); }}
          id="open-link-family-modal-btn"
          leftIcon={<DoodleIcon name="plus" className="w-3.5 h-3.5 text-white" />}
        >
          + Link Family Member
        </Button>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-3.5 rounded-[8px] text-xs font-semibold bg-[#EAF6F0] text-[#247A59] border border-[#B8E4D1] dark:bg-[#13241B] dark:text-[#48BB78] dark:border-[#1E3D2C] flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <span>✓</span>
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            className="text-[#247A59] dark:text-[#48BB78] font-bold underline ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. THREE-TIER VISUAL GENEALOGY HIERARCHY */}
      {loading ? (
        <Card radius="lg" className="p-12 text-center space-y-3 bg-white dark:bg-[#1E1E1E] border border-[#D98A91]/80 dark:border-[#303030]">
          <div className="w-5 h-5 mx-auto rounded-full border-2 border-[#B4232F] border-t-transparent animate-spin" />
          <p className="text-xs text-[#858585]">Loading pedigree records...</p>
        </Card>
      ) : relatives.length === 0 ? (
        <EmptyState
          icon={<DoodleIcon name="tree" className="w-5 h-5" />}
          title="No family members linked yet"
          description="Add a relative to start building your health pedigree and map multi-generational risk patterns."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => { setLinkModalOpen(true); setModalError(''); }}
              leftIcon={<DoodleIcon name="plus" className="w-3.5 h-3.5 text-white" />}
            >
              + Add First Relative
            </Button>
          }
        />
      ) : (
        <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto">
          
          {/* TIER 1: Parents & Ascendants */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B4232F] dark:text-[#E04855]">
                Tier 1 • Parents &amp; Ascendants
              </span>
              <span className="text-xs text-[#858585]">
                ({parentRelatives.length})
              </span>
            </div>

            <div className="p-5 rounded-[12px] border border-[#D98A91]/80 dark:border-[#422225] bg-white dark:bg-[#1E1E1E] min-h-[100px] flex items-center justify-center shadow-xs">
              {parentRelatives.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-4 w-full">
                  {parentRelatives.map((rel) => (
                    <FamilyTreeNode
                      key={rel.relationship_id}
                      member={rel}
                      onUnlink={handleUnlink}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center text-xs text-[#858585] space-y-1">
                  <p className="font-semibold text-[#171717] dark:text-[#F0F0F0]">No Parents Linked</p>
                  <p className="text-[11px]">
                    Link mother or father accounts to analyze hereditary predispositions.
                  </p>
                  <button
                    onClick={() => { setRelationshipType('father'); setLinkModalOpen(true); }}
                    className="text-xs font-semibold text-[#B4232F] dark:text-[#E04855] hover:underline pt-1 cursor-pointer"
                  >
                    + Link Parent
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Genealogical Connector Line (Tier 1 -> Tier 2) */}
          <div className="flex justify-center">
            <div className="w-px h-6 bg-[#BDBDB8] dark:border-[#404040]" />
          </div>

          {/* TIER 2: Self, Spouse & Siblings (Center Focus) */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#B4232F] dark:text-[#E04855]">
                Tier 2 • Self, Spouse &amp; Siblings
              </span>
              <span className="text-xs text-[#858585]">
                ({1 + peerRelatives.length})
              </span>
            </div>

            <div className="p-5 rounded-[12px] border border-[#B4232F] bg-white dark:bg-[#1E1E1E] shadow-xs">
              <div className="flex flex-wrap items-center justify-center gap-4">
                
                {/* Primary User Self Node */}
                <FamilyTreeNode
                  member={{
                    id: userId,
                    full_name: user?.full_name || 'You (Primary Account)',
                    email: user?.email,
                    relationship_type: 'self',
                  }}
                  isSelf={true}
                />

                {/* Peer Generation Nodes (Spouse / Siblings) */}
                {peerRelatives.map((rel) => (
                  <FamilyTreeNode
                    key={rel.relationship_id}
                    member={rel}
                    onUnlink={handleUnlink}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Genealogical Connector Line (Tier 2 -> Tier 3) */}
          <div className="flex justify-center">
            <div className="w-px h-6 bg-[#BDBDB8] dark:border-[#404040]" />
          </div>

          {/* TIER 3: Children & Descendants */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B4232F] dark:text-[#E04855]">
                Tier 3 • Children &amp; Descendants
              </span>
              <span className="text-xs text-[#858585]">
                ({childRelatives.length})
              </span>
            </div>

            <div className="p-5 rounded-[12px] border border-[#D98A91]/80 dark:border-[#422225] bg-white dark:bg-[#1E1E1E] min-h-[100px] flex items-center justify-center shadow-xs">
              {childRelatives.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-4 w-full">
                  {childRelatives.map((rel) => (
                    <FamilyTreeNode
                      key={rel.relationship_id}
                      member={rel}
                      onUnlink={handleUnlink}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center text-xs text-[#858585] space-y-1">
                  <p className="font-semibold text-[#171717] dark:text-[#F0F0F0]">No Children Linked</p>
                  <p className="text-[11px]">
                    Link children accounts to track downward health trajectories.
                  </p>
                  <button
                    onClick={() => { setRelationshipType('child'); setLinkModalOpen(true); }}
                    className="text-xs font-semibold text-[#B4232F] dark:text-[#E04855] hover:underline pt-1 cursor-pointer"
                  >
                    + Link Child
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Extended Relatives Tier (if any) */}
          {otherRelatives.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B4232F] dark:text-[#E04855]">
                  Extended Family &amp; Kinship
                </span>
                <span className="text-xs text-[#858585]">({otherRelatives.length})</span>
              </div>
              <div className="p-5 rounded-[12px] border border-[#D98A91]/80 dark:border-[#303030] bg-white dark:bg-[#1E1E1E]">
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {otherRelatives.map((rel) => (
                    <FamilyTreeNode
                      key={rel.relationship_id}
                      member={rel}
                      onUnlink={handleUnlink}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 3. MODAL: Link Family Member */}
      <Modal
        isOpen={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        title="Link Family Member"
        subtitle="Connect a relative's health profile via their unique User ID (UUID)"
        icon={<DoodleIcon name="tree" className="w-4 h-4 text-[#B4232F] dark:text-[#E04855]" />}
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setLinkModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleLinkSubmit}
              loading={submitting}
              id="submit-link-relative-btn"
              leftIcon={<DoodleIcon name="check" className="w-3.5 h-3.5 text-white" />}
            >
              Confirm &amp; Link Relative
            </Button>
          </>
        }
      >
        <form onSubmit={handleLinkSubmit} className="space-y-4">
          {modalError && (
            <div className="p-3 rounded-[6px] text-xs font-medium bg-[#FCEBED] border border-[#E8B4B9] text-[#B4232F] dark:bg-[#2D1416] dark:border-[#522226] dark:text-[#E04855] flex items-center space-x-2">
              <span>⚠️</span>
              <span>{modalError}</span>
            </div>
          )}

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
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value)}
              id="link-relationship-type-select"
            >
              <optgroup label="Tier 1 • Ascendants">
                <option value="father">Father</option>
                <option value="mother">Mother</option>
                <option value="parent">Parent</option>
              </optgroup>
              <optgroup label="Tier 2 • Peers">
                <option value="spouse">Spouse / Partner</option>
                <option value="brother">Brother</option>
                <option value="sister">Sister</option>
                <option value="sibling">Sibling</option>
              </optgroup>
              <optgroup label="Tier 3 • Descendants">
                <option value="son">Son</option>
                <option value="daughter">Daughter</option>
                <option value="child">Child</option>
              </optgroup>
              <optgroup label="Extended Kinship">
                <option value="relative">Relative / Kin</option>
              </optgroup>
            </Select>
          </FormField>
        </form>
      </Modal>
    </div>
  );
}

export default FamilyTreePage;
