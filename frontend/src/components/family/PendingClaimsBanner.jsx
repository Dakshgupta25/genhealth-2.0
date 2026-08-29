import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getPendingClaims, approveClaim, rejectClaim } from '../../api/claims';
import { Button, Card, Badge } from '../ui';
import DoodleIcon from '../common/DoodleIcon';

export function PendingClaimsBanner({ onClaimResolved }) {
  const { user, userId } = useAuth();
  const [claims, setClaims] = useState([]);
  const [processingId, setProcessingId] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadClaims = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await getPendingClaims(userId);
      // Filter claims where current user is the manager
      const incoming = (data || []).filter(
        (c) => c.status === 'pending' && c.manager_user_id === userId
      );
      setClaims(incoming);
    } catch (err) {
      console.error('Failed to load pending claims:', err);
    }
  }, [userId]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  const handleApprove = async (claim) => {
    setProcessingId(claim.id);
    setActionMessage('');
    setErrorMessage('');

    try {
      await approveClaim(claim.id, userId);
      setActionMessage(
        `Ownership of "${claim.placeholder_name}" has been transferred to ${claim.claimant_name} (${claim.claimant_email}).`
      );
      loadClaims();
      if (onClaimResolved) onClaimResolved();
      setTimeout(() => setActionMessage(''), 5000);
    } catch (err) {
      console.error('Failed to approve claim:', err);
      setErrorMessage(err.response?.data?.detail || 'Failed to approve claim request.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (claim) => {
    if (
      !window.confirm(
        `Are you sure you want to reject the claim request from ${claim.claimant_name} (${claim.claimant_email})?`
      )
    ) {
      return;
    }

    setProcessingId(claim.id);
    setActionMessage('');
    setErrorMessage('');

    try {
      await rejectClaim(claim.id, userId);
      setActionMessage(`Rejected claim request from ${claim.claimant_name}.`);
      loadClaims();
      if (onClaimResolved) onClaimResolved();
      setTimeout(() => setActionMessage(''), 5000);
    } catch (err) {
      console.error('Failed to reject claim:', err);
      setErrorMessage(err.response?.data?.detail || 'Failed to reject claim request.');
    } finally {
      setProcessingId(null);
    }
  };

  if (!claims || claims.length === 0) {
    return actionMessage ? (
      <div className="p-3.5 rounded-[8px] text-xs font-semibold bg-[#F0F8F4] text-[#18573D] border border-[#C8E6D6] dark:bg-[#11251B] dark:text-[#57BA8E] dark:border-[#224D37] flex items-center justify-between shadow-xs mb-4">
        <span>✓ {actionMessage}</span>
        <button
          type="button"
          onClick={() => setActionMessage('')}
          className="text-[#18573D] dark:text-[#57BA8E] font-bold underline ml-2 cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    ) : null;
  }

  return (
    <div className="space-y-3 mb-6">
      {actionMessage && (
        <div className="p-3.5 rounded-[8px] text-xs font-semibold bg-[#F0F8F4] text-[#18573D] border border-[#C8E6D6] dark:bg-[#11251B] dark:text-[#57BA8E] dark:border-[#224D37]">
          ✓ {actionMessage}
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-[8px] text-xs font-semibold bg-[#FDF0F0] text-[#942728] border border-[#F6C4C5] dark:bg-[#2D1616] dark:text-[#E57373] dark:border-[#5B292A]">
          ⚠️ {errorMessage}
        </div>
      )}

      {claims.map((claim) => (
        <Card
          key={claim.id}
          radius="lg"
          className="p-4 sm:p-5 border-l-4 border-l-[#8F5708] dark:border-l-[#E6A84F] border-[#CBD6D2] dark:border-[#2F433E] bg-[#FEF7EB]/40 dark:bg-[#2B1F0E]/40 shadow-xs"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center space-x-2">
                <Badge status="warning" size="sm" dot>
                  PROFILE CLAIM REQUEST
                </Badge>
                <span className="text-xs text-[#4E6863] dark:text-[#7E9993]">
                  {new Date(claim.created_at).toLocaleDateString()}
                </span>
              </div>

              <h3 className="text-sm font-bold text-[#13221F] dark:text-[#EFF5F3]">
                Transfer Profile Ownership: <span className="text-[#1E4D45] dark:text-[#57BA8E]">{claim.placeholder_name}</span>
              </h3>

              <p className="text-xs text-[#3D524E] dark:text-[#A0B6B0] leading-relaxed">
                <strong>{claim.claimant_name}</strong> (<span className="font-mono">{claim.claimant_email}</span>) signed up and entered the UUID for your managed placeholder profile. Approving will transfer direct ownership to their login while preserving your family connection.
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReject(claim)}
                disabled={processingId === claim.id}
                className="text-xs"
              >
                Reject
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleApprove(claim)}
                loading={processingId === claim.id}
                leftIcon={<DoodleIcon name="check" className="w-3.5 h-3.5 text-white" />}
                className="text-xs"
              >
                Approve Transfer
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default PendingClaimsBanner;
