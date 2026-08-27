import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFamilyMembers, linkFamilyMember, unlinkFamilyMember } from '../api/family';
import DoodleIcon from '../components/common/DoodleIcon';
import FamilyTreeNode from '../components/family/FamilyTreeNode';

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

  // Other / Uncategorized
  const otherRelatives = relatives.filter(
    (r) =>
      ![
        'father', 'mother', 'parent',
        'spouse', 'husband', 'wife', 'brother', 'sister', 'sibling',
        'son', 'daughter', 'child',
      ].includes(r.relationship_type?.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header Card */}
      <div className="p-8 rounded-3xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
           style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
               style={{ backgroundColor: 'var(--brand-primary)' }}>
            <DoodleIcon name="tree" className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Family Health Tree
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Top-to-bottom visual genealogical hierarchy connecting relatives via unique User IDs.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => { setLinkModalOpen(true); setModalError(''); }}
          id="open-link-family-modal-btn"
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-md flex items-center space-x-2 transition-all active:scale-95"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          <DoodleIcon name="plus" className="w-4 h-4" />
          <span>Link Family Member</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-2xl text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300 flex items-center justify-between">
          <span>✓ {statusMessage}</span>
          <button onClick={() => setStatusMessage('')} className="font-bold underline ml-2">Dismiss</button>
        </div>
      )}

      {/* Visual Top-to-Bottom Tree Canvas */}
      <div className="p-8 md:p-12 rounded-3xl border shadow-sm space-y-12 relative overflow-hidden transition-all text-center"
           style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
        
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 mx-auto rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Loading family health network...
            </p>
          </div>
        ) : (
          <div className="space-y-14 relative z-10 max-w-5xl mx-auto">
            
            {/* TIER 1: Parents / Previous Generation */}
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wide"
                   style={{ backgroundColor: 'var(--brand-soft-blue)', color: 'var(--text-accent)', opacity: 0.85 }}>
                <span>Tier 1 · Parents & Ascendants</span>
              </div>

              {parentRelatives.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-6 pt-2">
                  {parentRelatives.map((member) => (
                    <FamilyTreeNode
                      key={member.relationship_id}
                      member={member}
                      onUnlink={handleUnlink}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-5 rounded-2xl border border-dashed max-w-xs mx-auto text-xs"
                     style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                  No parents linked yet. Click "Link Family Member" above.
                </div>
              )}
            </div>

            {/* Visual Generational Connector 1 -> 2 */}
            <div className="flex justify-center -my-6">
              <div className="w-0.5 h-12 bg-indigo-300 dark:bg-indigo-800" />
            </div>

            {/* TIER 2: Primary User & Peers (Spouse & Siblings) */}
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wide"
                   style={{ backgroundColor: 'var(--brand-soft-blue)', color: 'var(--text-accent)', opacity: 0.85 }}>
                <span>Tier 2 · Self, Spouse & Siblings</span>
              </div>

              <div className="flex flex-wrap justify-center items-center gap-6 pt-2">
                {/* Current User Node */}
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

            {/* Visual Generational Connector 2 -> 3 */}
            <div className="flex justify-center -my-6">
              <div className="w-0.5 h-12 bg-indigo-300 dark:bg-indigo-800" />
            </div>

            {/* TIER 3: Children / Descendants */}
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wide"
                   style={{ backgroundColor: 'var(--brand-soft-blue)', color: 'var(--text-accent)', opacity: 0.85 }}>
                <span>Tier 3 · Children & Descendants</span>
              </div>

              {childRelatives.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-6 pt-2">
                  {childRelatives.map((member) => (
                    <FamilyTreeNode
                      key={member.relationship_id}
                      member={member}
                      onUnlink={handleUnlink}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-5 rounded-2xl border border-dashed max-w-xs mx-auto text-xs"
                     style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                  No children linked yet.
                </div>
              )}
            </div>

            {/* Optional: Other Relatives */}
            {otherRelatives.length > 0 && (
              <div className="pt-8 border-t space-y-4" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Extended Family & Others
                </span>
                <div className="flex flex-wrap justify-center gap-6">
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
      </div>

      {/* Modal: Link Family Member by Unique User ID */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-5 animate-in fade-in"
               style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)', color: 'var(--text-primary)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center space-x-2">
                <DoodleIcon name="tree" className="w-5 h-5" />
                <h3 className="text-lg font-bold">Link Relative to Tree</h3>
              </div>
              <button 
                onClick={() => setLinkModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3.5 rounded-xl text-xs font-medium text-red-700 bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300">
                {modalError}
              </div>
            )}

            <form onSubmit={handleLinkSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Relative's Unique User ID (UUID)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-xs font-mono border outline-none transition-all focus:ring-2"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  Ask your family member for their User ID shown in their GenHealth Profile side panel.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Relationship to You
                </label>
                <select
                  value={relationshipType}
                  onChange={(e) => setRelationshipType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-all focus:ring-2 font-medium"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="father">Father (Previous Generation)</option>
                  <option value="mother">Mother (Previous Generation)</option>
                  <option value="brother">Brother (Same Generation)</option>
                  <option value="sister">Sister (Same Generation)</option>
                  <option value="spouse">Spouse / Partner (Same Generation)</option>
                  <option value="son">Son (Next Generation)</option>
                  <option value="daughter">Daughter (Next Generation)</option>
                  <option value="other">Other Relative</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold border hover:opacity-80"
                  style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={linking}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  {linking ? 'Linking...' : 'Connect Relative'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FamilyTreePage;
