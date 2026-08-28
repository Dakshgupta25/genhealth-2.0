import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFamilyMembers, linkFamilyMember, unlinkFamilyMember } from '../api/family';
import DoodleIcon from '../components/common/DoodleIcon';
import FamilyTreeNode from '../components/family/FamilyTreeNode';
import { Button, Card, Modal, FormField, Input, Select } from '../components/ui';

export function FamilyTreePage() {
  const { user, userId } = useAuth();
  const [relatives, setRelatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  
  // Link form state
  const [targetUserId, setTargetUserId] = useState('');
  const [relationshipType, setRelationshipType] = useState('father');
  const [linking, setLinking] = useState(false);
  const [modalError, setModalError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const fetchFamily = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getFamilyMembers(userId);
      setRelatives(data);
    } catch (err) {
      console.error('Failed to load family members:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchFamily();
  }, [fetchFamily]);

  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setLinking(true);

    try {
      if (!targetUserId.trim()) {
        throw new Error('Please enter the relative’s unique User ID (UUID).');
      }

      await linkFamilyMember({
        user_id: userId,
        relative_user_id: targetUserId.trim(),
        relationship_type: relationshipType,
      });

      setStatusMessage(`Successfully linked relative!`);
      setLinkModalOpen(false);
      setTargetUserId('');
      setRelationshipType('father');
      await fetchFamily();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setModalError(
        typeof detail === 'string'
          ? detail
          : err.message || 'Failed to link relative. Check that the User ID is valid.'
      );
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (relationshipId, name) => {
    if (!window.confirm(`Are you sure you want to unlink ${name || 'this relative'} from your family tree?`)) {
      return;
    }

    try {
      await unlinkFamilyMember(relationshipId);
      setStatusMessage(`Unlinked ${name || 'relative'}.`);
      await fetchFamily();
    } catch (err) {
      console.error('Failed to unlink relative:', err);
      alert('Failed to unlink relative.');
    }
  };

  // Organize relatives into 3 generational tiers:
  // 1. Parents Tier: 'father', 'mother', 'parent'
  const parentRelatives = relatives.filter((r) =>
    ['father', 'mother', 'parent'].includes(r.relationship_type?.toLowerCase())
  );

  // 2. Same-Generation Tier: 'spouse', 'husband', 'wife', 'brother', 'sister', 'sibling'
  const peerRelatives = relatives.filter((r) =>
    ['spouse', 'husband', 'wife', 'brother', 'sister', 'sibling'].includes(
      r.relationship_type?.toLowerCase()
    )
  );

  // 3. Children Tier: 'son', 'daughter', 'child'
  const childRelatives = relatives.filter((r) =>
    ['son', 'daughter', 'child'].includes(r.relationship_type?.toLowerCase())
  );

  // Other / Extended Relatives
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
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-900 text-white dark:bg-slate-800 dark:border dark:border-slate-700 shadow-xs">
              <DoodleIcon name="tree" className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                Family Health Tree
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Top-to-bottom visual genealogical hierarchy connecting relatives via unique User IDs
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => { setLinkModalOpen(true); setModalError(''); }}
            id="open-link-family-modal-btn"
            leftIcon={<DoodleIcon name="plus" className="w-3.5 h-3.5 text-cyan-400" />}
          >
            Link Family Member
          </Button>
        </div>
      </Card>

      {/* Status feedback message */}
      {statusMessage && (
        <div className="p-3.5 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300 flex items-center justify-between shadow-xs">
          <span>✓ {statusMessage}</span>
          <button
            onClick={() => setStatusMessage('')}
            className="font-bold underline ml-2 hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Visual Top-to-Bottom Genealogical Canvas */}
      <Card radius="xl" className="p-6 sm:p-10 md:p-12 text-center overflow-hidden">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 mx-auto rounded-full border-2 border-cyan-400 border-t-cyan-600 animate-spin" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Loading genealogical health network...
            </p>
          </div>
        ) : (
          <div className="space-y-10 relative z-10 max-w-5xl mx-auto">
            
            {/* TIER 1: Parents / Ascendants */}
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
                  <span>Tier 1 · Parents &amp; Ascendants</span>
                </div>
              </div>

              {parentRelatives.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-4 sm:gap-6 pt-2">
                  {parentRelatives.map((member) => (
                    <FamilyTreeNode
                      key={member.relationship_id}
                      member={member}
                      onUnlink={handleUnlink}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-5 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 max-w-xs mx-auto text-xs text-slate-500 dark:text-slate-400 space-y-2">
                  <p>No parents linked yet.</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setLinkModalOpen(true); setModalError(''); setRelationshipType('father'); }}
                    leftIcon={<DoodleIcon name="plus" className="w-3 h-3" />}
                  >
                    Link Parent
                  </Button>
                </div>
              )}
            </div>

            {/* Genealogical Connector Line (Tier 1 -> Tier 2) */}
            <div className="flex justify-center -my-3">
              <div className="w-px h-10 bg-slate-300 dark:bg-slate-700" />
            </div>

            {/* TIER 2: Primary User & Peers (Spouse & Siblings) */}
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
                  <span>Tier 2 · Self, Spouse &amp; Siblings</span>
                </div>
              </div>

              <div className="flex flex-wrap justify-center items-stretch gap-4 sm:gap-6 pt-2">
                {/* Primary User Node */}
                <FamilyTreeNode
                  member={{
                    id: userId,
                    full_name: user?.full_name || 'You',
                    email: user?.email || '',
                    role: user?.role || 'patient',
                  }}
                  isSelf={true}
                />

                {/* Peer / Sibling Nodes */}
                {peerRelatives.map((member) => (
                  <FamilyTreeNode
                    key={member.relationship_id}
                    member={member}
                    onUnlink={handleUnlink}
                  />
                ))}
              </div>
            </div>

            {/* Genealogical Connector Line (Tier 2 -> Tier 3) */}
            <div className="flex justify-center -my-3">
              <div className="w-px h-10 bg-slate-300 dark:bg-slate-700" />
            </div>

            {/* TIER 3: Children / Descendants */}
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
                  <span>Tier 3 · Children &amp; Descendants</span>
                </div>
              </div>

              {childRelatives.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-4 sm:gap-6 pt-2">
                  {childRelatives.map((member) => (
                    <FamilyTreeNode
                      key={member.relationship_id}
                      member={member}
                      onUnlink={handleUnlink}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-5 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 max-w-xs mx-auto text-xs text-slate-500 dark:text-slate-400 space-y-2">
                  <p>No children linked yet.</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setLinkModalOpen(true); setModalError(''); setRelationshipType('son'); }}
                    leftIcon={<DoodleIcon name="plus" className="w-3 h-3" />}
                  >
                    Link Child
                  </Button>
                </div>
              )}
            </div>

            {/* Optional: Extended Relatives Section */}
            {otherRelatives.length > 0 && (
              <div className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Extended Family &amp; Additional Kinship
                </span>
                <div className="flex flex-wrap justify-center gap-4 sm:gap-6 pt-2">
                  {otherRelatives.map((member) => (
                    <FamilyTreeNode
                      key={member.relationship_id}
                      member={member}
                      onUnlink={handleUnlink}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 3. Modal: Link Family Member by Unique User ID */}
      <Modal
        isOpen={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        title="Link Relative to Family Tree"
        subtitle="Connect medical records securely using the relative's Unique User ID"
        icon={<DoodleIcon name="tree" className="w-4 h-4 text-cyan-500" />}
        footer={
          <div className="flex items-center justify-end space-x-2.5 w-full">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setLinkModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              form="link-relative-form"
              loading={linking}
              leftIcon={<DoodleIcon name="check" className="w-3.5 h-3.5 text-cyan-400" />}
            >
              Connect Relative
            </Button>
          </div>
        }
      >
        <form id="link-relative-form" onSubmit={handleLinkSubmit} className="space-y-4 text-left">
          {modalError && (
            <div className="p-3 rounded-lg text-xs font-semibold text-red-700 bg-red-50 border border-red-200 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300 flex items-center space-x-2">
              <span>⚠️</span>
              <span>{modalError}</span>
            </div>
          )}

          <FormField
            label="Relative's Unique User ID (UUID)"
            hint="Obtain this 36-character ID from your relative's profile menu in the top header."
            required
          >
            <Input
              type="text"
              required
              mono
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
            />
          </FormField>

          <FormField
            label="Kinship / Relationship Type"
            hint="Defines the generational tier placement on your visual tree."
            required
          >
            <Select
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value)}
            >
              <option value="father">Father (Previous Generation · Tier 1)</option>
              <option value="mother">Mother (Previous Generation · Tier 1)</option>
              <option value="brother">Brother (Same Generation · Tier 2)</option>
              <option value="sister">Sister (Same Generation · Tier 2)</option>
              <option value="spouse">Spouse / Partner (Same Generation · Tier 2)</option>
              <option value="son">Son (Next Generation · Tier 3)</option>
              <option value="daughter">Daughter (Next Generation · Tier 3)</option>
              <option value="other">Other Kinship (Extended Section)</option>
            </Select>
          </FormField>
        </form>
      </Modal>
    </div>
  );
}

export default FamilyTreePage;
