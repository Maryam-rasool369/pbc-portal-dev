import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { fetchSoftDeleteRequestById } from '@/services/softDelete';
import { SoftDeleteRequest } from '@/types/softDelete';
import useAuthStore from '@/store/authStore';
import { toast } from 'react-toastify';
import Badge from '@/components/ui/Badge';
import Link from 'next/link';

export default function SoftDeleteDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuthStore();

  const [request, setRequest] = useState<SoftDeleteRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequest = async () => {
      if (!token || !id) {
        setError('No authentication token or ID found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchSoftDeleteRequestById(token, Number(id));
        setRequest(data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching soft delete request:', err);
        setError(err.message || 'Failed to fetch soft delete request details');
        toast.error(err.message || 'Failed to fetch soft delete request details');
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [token, id]);

  const getStatusVariant = (status: string): 'default' | 'gold' | 'gray' => {
    switch (status) {
      case 'PENDING':
        return 'gold';
      case 'APPROVED':
        return 'default';
      case 'REJECTED':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const getVoteVariant = (vote: string): 'default' | 'gold' | 'gray' => {
    switch (vote) {
      case 'APPROVED':
        return 'default';
      case 'REJECTED':
        return 'gray';
      case 'PENDING':
        return 'gold';
      default:
        return 'gray';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getVoteCounts = () => {
    if (!request?.SoftDeleteVote) return { approved: 0, rejected: 0, pending: 0 };

    const votes = request.SoftDeleteVote;
    return {
      approved: votes.filter((v) => v.vote === 'APPROVED').length,
      rejected: votes.filter((v) => v.vote === 'REJECTED').length,
      pending: votes.filter((v) => v.vote === 'PENDING').length,
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error</h2>
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
        <Link
          href="/soft-delete"
          className="mt-4 inline-flex items-center px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800"
        >
          ← Back to Soft Deletions
        </Link>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">🗑️</div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Soft Delete Request Not Found</h3>
        <p className="text-gray-600 dark:text-gray-400">The requested soft delete request could not be found.</p>
        <Link
          href="/soft-delete"
          className="mt-4 inline-flex items-center px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800"
        >
          ← Back to Soft Deletions
        </Link>
      </div>
    );
  }

  const voteCounts = getVoteCounts();

  return (
    <>
      <div className="p-4 bg-white block sm:flex items-center justify-between border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
        <div className="w-full mb-1">
          <div className="mb-4">
            <div className="flex items-center gap-4 mb-2">
              <Link
                href="/soft-delete"
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Soft Deletions
              </Link>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
              Soft Deletion Request Details #{request.id}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              View detailed information and voting history for this soft deletion request
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Request Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">User</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{request.user.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{request.user.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Reason</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                  {request.reason || 'No reason provided'}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Requested By</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{request.requestedBy.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {request.requestedBy.email} • {request.requestedBy.Role?.name}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                <div className="mt-1">
                  <Badge
                    text={request.finalDecision}
                    variant={getStatusVariant(request.finalDecision)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Created At</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(request.createdAt)}</p>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{voteCounts.approved}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Approved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{voteCounts.rejected}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Rejected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{request.SoftDeleteVote?.length || 0}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Votes</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Voting History</h2>

          {request.SoftDeleteVote && request.SoftDeleteVote.length > 0 ? (
            <div className="space-y-4">
              {request.SoftDeleteVote.map((vote) => (
                <div key={vote.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {vote.user.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {vote.user.email} • {vote.user.Role?.name}
                          </p>
                        </div>
                        <Badge
                          text={vote.vote}
                          variant={getVoteVariant(vote.vote)}
                        />
                      </div>
                      {vote.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          &quot;{vote.description}&quot;
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-2">🗳️</div>
              <p className="text-gray-500 dark:text-gray-400">No votes have been cast yet.</p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Timeline</h2>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Request Created</p>
              </div>
            </div>
            {request.finalDecision !== 'PENDING' && (
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    request.finalDecision === 'APPROVED'
                      ? 'bg-green-100 dark:bg-green-900'
                      : 'bg-red-100 dark:bg-red-900'
                  }`}>
                    <svg className={`w-4 h-4 ${
                      request.finalDecision === 'APPROVED'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Final Decision: {request.finalDecision}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
