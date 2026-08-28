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
      setModalError('Please enter the target relative’s User ID (UUID).');
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
    if (!window.confirm(`Are you sure you want to unlink ${relativeName || 'this relative'} from your family tree?`)) {
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
      
      {/* 1. Header Card */}
      <Card radius="xl">
        <div className="p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#0D5446] text-white dark:bg-[#1A2421] dark:border dark:border-[#2A3B34] shadow-xs">
              <DoodleIcon name="tree" className="w-4 h-4 text-emerald-300 dark:text-[#3BB298]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#11231E] dark:text-[#ECF2EE]">
                Family Health Tree
              </h1>
              <p className="text-xs text-[#586D66] dark:text-[#7C9184]">
                Top-to-bottom visual genealogical hierarchy connecting relatives via unique User IDs
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => { setLinkModalOpen(true); setModalError(''); }}
            id="open-link-family-modal-btn"
            leftIcon={<DoodleIcon name="plus" className="w-3.5 h-3.5 text-emerald-300 dark:text-[#3BB298]" />}
          >
            Link Family Member
          </Button>
        </div>
      </Card>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-3.5 rounded-xl text-xs font-semibold bg-[#E3EFE9] text-[#0D5446] border border-[#C6DFD2] dark:bg-[#1A332B] dark:text-[#4ADE80] dark:border-[#1B4332] flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <span>✓</span>
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            className="text-[#0D5446] dark:text-[#4ADE80] font-bold underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. THREE-TIER VISUAL GENEALOGY HIERARCHY */}
      {loading ? (
        <Card radius="lg" className="p-12 text-center space-y-3">
          <div className="w-6 h-6 mx-auto rounded-full border-2 border-[#1D7A68] border-t-[#0D5446] animate-spin" />
          <p className="text-xs text-[#586D66] dark:text-[#7C9184]">Loading genealogical network...</p>
        </Card>
      ) : relatives.length === 0 ? (
        <EmptyState
          icon={<DoodleIcon name="tree" className="w-5 h-5" />}
          title="No Family Members Linked Yet"
          description="Build your genealogical health network to unlock multi-generational hereditary risk intelligence."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => { setLinkModalOpen(true); setModalError(''); }}
              leftIcon={<DoodleIcon name="plus" className="w-3.5 h-3.5" />}
            >
              Link First Relative
            </Button>
          }
        />
      ) : (
        <div className="space-y-6 sm:space-y-8">
          
          {/* TIER 1: Parents & Ascendants */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#586D66] dark:text-[#7C9184]">
                Tier 1 • Parents &amp; Ascendants
              </span>
              <span className="text-xs text-[#8BA196] dark:text-[#7C9184]">
                ({parentRelatives.length})
              </span>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl border border-[#D0D9D0] dark:border-[#2A3B34] bg-[#F5F7F5]/50 dark:bg-[#141C19]/40 min-h-[110px] flex items-center justify-center">
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
                <div className="text-center text-xs text-[#586D66] dark:text-[#7C9184] space-y-1">
                  <p className="font-semibold">No Parents Linked</p>
                  <p className="text-[11px]">
                    Link mother or father accounts to cross-examine hereditary traits.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setRelationshipType('father'); setLinkModalOpen(true); }}
                    className="text-xs font-bold text-[#0D5446] dark:text-[#3BB298] hover:underline pt-1"
                  >
                    + Link Parent
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Genealogical Connector Line (Tier 1 -> Tier 2) */}
          <div className="flex justify-center">
            <div className="w-0.5 h-6 bg-[#D0D9D0] dark:bg-[#2A3B34]" />
          </div>

          {/* TIER 2: Self, Spouse & Siblings (Center Focus) */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0D5446] dark:text-[#3BB298]">
                Tier 2 • Self, Spouse &amp; Siblings
              </span>
              <span className="text-xs text-[#8BA196] dark:text-[#7C9184]">
                ({1 + peerRelatives.length})
              </span>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl border border-[#0D5446]/40 dark:border-[#3BB298]/30 bg-white dark:bg-[#141C19] shadow-xs">
              <div className="flex flex-wrap items-center justify-center gap-4">
                
                {/* 1. Primary User Self Node */}
                <FamilyTreeNode
                  member={{
                    id: userId,
                    full_name: user?.full_name || 'You (Primary Account)',
                    email: user?.email,
                    relationship_type: 'self',
                  }}
                  isSelf={true}
                />

                {/* 2. Peer Generation Nodes (Spouse / Siblings) */}
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
            <div className="w-0.5 h-6 bg-[#D0D9D0] dark:bg-[#2A3B34]" />
          </div>

          {/* TIER 3: Children & Descendants */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#586D66] dark:text-[#7C9184]">
                Tier 3 • Children &amp; Descendants
              </span>
              <span className="text-xs text-[#8BA196] dark:text-[#7C9184]">
                ({childRelatives.length})
              </span>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl border border-[#D0D9D0] dark:border-[#2A3B34] bg-[#F5F7F5]/50 dark:bg-[#141C19]/40 min-h-[110px] flex items-center justify-center">
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
                <div className="text-center text-xs text-[#586D66] dark:text-[#7C9184] space-y-1">
                  <p className="font-semibold">No Children Linked</p>
                  <p className="text-[11px]">
                    Link children accounts to track downward health trajectories.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setRelationshipType('child'); setLinkModalOpen(true); }}
                    className="text-xs font-bold text-[#0D5446] dark:text-[#3BB298] hover:underline pt-1"
                  >
                    + Link Child
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Extended Relatives Tier (if any) */}
          {otherRelatives.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#586D66] dark:text-[#7C9184]">
                  Extended Family &amp; Kinship
                </span>
                <span className="text-xs text-[#8BA196]">({otherRelatives.length})</span>
              </div>
              <div className="p-5 sm:p-6 rounded-2xl border border-[#D0D9D0] dark:border-[#2A3B34] bg-[#F5F7F5]/50 dark:bg-[#141C19]/40">
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
        icon={<DoodleIcon name="tree" className="w-4 h-4" />}
        footer={
          <>
            <Button
              variant="outline"
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
              leftIcon={<DoodleIcon name="check" className="w-3.5 h-3.5 text-emerald-300 dark:text-[#3BB298]" />}
            >
              Confirm &amp; Link Relative
            </Button>
          </>
        }
      >
        <form onSubmit={handleLinkSubmit} className="space-y-4">
          {modalError && (
            <div className="p-3.5 rounded-lg text-xs font-medium bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B] dark:bg-[#2B1212] dark:border-[#4C1D1D] dark:text-[#F87171] flex items-center space-x-2">
              <span>⚠️</span>
              <span>{modalError}</span>
            </div>
          )}

          <FormField
            label="Relative's User ID (UUID)"
            required
            helperText="Ask your relative to copy their User ID from their profile or family tree page."
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
