import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { abandonClaim, getPendingClaims } from '../api/claims';
import { Button, Card } from '../components/ui';
import DoodleIcon from '../components/common/DoodleIcon';

export function ClaimantWaitingPage() {
  const { user, setUser, logout } = useAuth();
  const [abandoning, setAbandoning] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleRefreshCheck = async () => {
    setChecking(true);
    setErrorMessage('');
    setMessage('');
    try {
      const claims = await getPendingClaims(user.id);
      const activeClaim = claims.find((c) => c.status === 'pending');
      if (!activeClaim) {
        // Claim was approved or resolved!
        setMessage('Your claim has been processed! Refreshing your profile...');
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setMessage('Your claim is still waiting for approval by the profile manager.');
      }
    } catch (err) {
      console.error('Failed to check claim status:', err);
      setErrorMessage('Could not check claim status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleAbandonClaim = async () => {
    if (!user?.claim_id) {
      setErrorMessage('Claim record not found.');
      return;
    }

    if (
      !window.confirm(
        'Are you sure you want to create a new account instead? You will get a brand new UUID and will not link to the historical records of the placeholder profile.'
      )
    ) {
      return;
    }

    setAbandoning(true);
    setErrorMessage('');
    try {
      await abandonClaim(user.claim_id, user.id);
      // Untether local user session
      const updatedUser = {
        ...user,
        is_pending_claim: false,
        claim_id: null,
        claim_placeholder_id: null,
        claim_manager_name: null,
      };
      setUser(updatedUser);
    } catch (err) {
      console.error('Failed to abandon claim:', err);
      setErrorMessage(err.response?.data?.detail || 'Failed to create new independent account.');
    } finally {
      setAbandoning(false);
    }
  };

  const managerName = user?.claim_manager_name || 'your family member / tree manager';

  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
    >
      <div className="w-full max-w-lg space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-[10px] items-center justify-center bg-[#1E4D45] text-white shadow-xs mb-1">
            <DoodleIcon name="logo-pulse" className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#13221F] dark:text-[#EFF5F3]">
            Identity Claim Pending
          </h1>
          <p className="text-xs sm:text-sm text-[#4E6863] dark:text-[#7E9993]">
            Consent-based profile ownership transfer in progress
          </p>
        </div>

        {/* Status Card */}
        <Card radius="lg" className="p-6 sm:p-8 space-y-6 bg-white dark:bg-[#151E1C] border border-[#CBD6D2] dark:border-[#2F433E] shadow-sm text-left">
          
          {/* Notification Badge */}
          <div className="p-4 rounded-[8px] bg-[#FEF7EB] dark:bg-[#2B1F0E] border border-[#F6DCB1] dark:border-[#573E1B] text-[#8F5708] dark:text-[#E6A84F] flex items-start space-x-3">
            <span className="text-lg leading-none">⏳</span>
            <div className="space-y-1 text-xs">
              <p className="font-bold">Awaiting Manager Approval</p>
              <p className="leading-relaxed">
                You requested to claim the medical profile created by{' '}
                <strong className="text-[#13221F] dark:text-[#EFF5F3]">{managerName}</strong>. For privacy and data security, access to this profile is locked until the manager approves the transfer.
              </p>
            </div>
          </div>

          {message && (
            <div className="p-3.5 rounded-[6px] text-xs font-semibold bg-[#F0F8F4] text-[#18573D] border border-[#C8E6D6] dark:bg-[#11251B] dark:text-[#57BA8E] dark:border-[#224D37]">
              {message}
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-[6px] text-xs font-semibold bg-[#FDF0F0] text-[#942728] border border-[#F6C4C5] dark:bg-[#2D1616] dark:text-[#E57373] dark:border-[#5B292A]">
              {errorMessage}
            </div>
          )}

          {/* Account Details Box */}
          <div className="p-4 rounded-[8px] bg-[#F4F6F5] dark:bg-[#1C2725] border border-[#E0E7E4] dark:border-[#22312E] space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#4E6863] dark:text-[#7E9993]">Your Login Email:</span>
              <span className="font-semibold text-[#13221F] dark:text-[#EFF5F3]">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#4E6863] dark:text-[#7E9993]">Claimed Profile UUID:</span>
              <span className="font-mono text-[11px] text-[#13221F] dark:text-[#EFF5F3]">
                {user?.claim_placeholder_id ? `${user.claim_placeholder_id.substring(0, 14)}...` : 'Pending'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={handleRefreshCheck}
              loading={checking}
              className="w-full"
              leftIcon={<DoodleIcon name="refresh" className="w-4 h-4 text-white" />}
            >
              Check Approval Status
            </Button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-[#E0E7E4] dark:border-[#22312E]"></div>
              <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-[#4E6863] dark:text-[#7E9993] font-semibold">
                Or
              </span>
              <div className="flex-grow border-t border-[#E0E7E4] dark:border-[#22312E]"></div>
            </div>

            <Button
              variant="outline"
              size="md"
              onClick={handleAbandonClaim}
              loading={abandoning}
              className="w-full text-xs font-semibold"
            >
              Create a new account for myself instead
            </Button>
            <p className="text-[11px] text-[#4E6863] dark:text-[#7E9993] text-center">
              Abandoning this claim generates a fresh independent UUID for you immediately.
            </p>
          </div>

          {/* Sign Out option */}
          <div className="pt-4 text-center border-t border-[#E0E7E4] dark:border-[#22312E]">
            <button
              type="button"
              onClick={logout}
              className="text-xs font-semibold text-[#942728] dark:text-[#E57373] hover:underline cursor-pointer"
            >
              Sign out of this session
            </button>
          </div>

        </Card>
      </div>
    </div>
  );
}

export default ClaimantWaitingPage;
