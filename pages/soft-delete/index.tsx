import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  fetchAllSoftDeleteRequests,
  voteSoftDeleteRequest,
} from '@/services/softDelete';
import { SoftDeleteRequest } from '@/types/softDelete';
import useAuthStore from '@/store/authStore';
import { toast } from 'react-toastify';
import Badge from '@/components/ui/Badge';
import Pagination from '@/components/common/Pagination';
import Can from '@/components/rbac/Can';

export default function SoftDeleteIndex() {
  const [requests, setRequests] = useState<SoftDeleteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SoftDeleteRequest | null>(null);
  const [voteLoading, setVoteLoading] = useState(false);
  const [voteDescription, setVoteDescription] = useState('');
  const [pagination, setPagination] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const { token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const { page } = router.query;
    if (page && typeof page === 'string') {
      const pageNum = parseInt(page, 10);
      if (pageNum > 0) {
        setCurrentPage(pageNum);
      }
    }
  }, [router.query]);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await fetchAllSoftDeleteRequests(token, currentPage, pageSize);
        setRequests(result.data);
        setPagination(result.pagination);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching soft delete requests:', err);
        setError(err.message || 'Failed to fetch soft delete requests');
        toast.error(err.message || 'Failed to fetch soft delete requests');
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [token, currentPage, pageSize]);

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

  const handleVoteClick = (request: SoftDeleteRequest) => {
    setSelectedRequest(request);
    setVoteDescription('');
    setShowVoteModal(true);
  };

  const handleVote = async (vote: 'APPROVED' | 'REJECTED') => {
    if (!selectedRequest || !token) return;

    try {
      setVoteLoading(true);
      await voteSoftDeleteRequest(token, {
        softDeleteRequestId: selectedRequest.id,
        vote,
        description: voteDescription.trim() || undefined,
      });

      toast.success('Vote recorded successfully');
      setShowVoteModal(false);
      setSelectedRequest(null);
      setVoteDescription('');

      const result = await fetchAllSoftDeleteRequests(token, currentPage, pageSize);
      setRequests(result.data);
      setPagination(result.pagination);
    } catch (err: any) {
      console.error('Error voting:', err);
      toast.error(err.message || 'Failed to vote');
    } finally {
      setVoteLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    router.push(
      {
        pathname: router.pathname,
        query: { ...router.query, page: page.toString() },
      },
      undefined,
      { shallow: true },
    );
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
      </div>
    );
  }

  return (
    <>
      <div className="p-4 bg-white block sm:flex items-center justify-between border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
        <div className="w-full mb-1">
          <div className="mb-4">
            <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
              Soft Deletion Requests
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              View and manage soft deletion requests
            </p>
          </div>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🗑️</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Soft Deletion Requests</h3>
          <p className="text-gray-600 dark:text-gray-400">There are no soft deletion requests at the moment.</p>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden shadow">
                <table className="min-w-full divide-y divide-gray-200 table-fixed dark:divide-gray-600">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="p-4 text-xs font-medium text-left text-gray-500 uppercase dark:text-gray-400">
                        User Name
                      </th>
                      <th scope="col" className="p-4 text-xs font-medium text-left text-gray-500 uppercase dark:text-gray-400">
                        Reason
                      </th>
                      <th scope="col" className="p-4 text-xs font-medium text-left text-gray-500 uppercase dark:text-gray-400">
                        Requested By
                      </th>
                      <th scope="col" className="p-4 text-xs font-medium text-left text-gray-500 uppercase dark:text-gray-400">
                        Final Decision
                      </th>
                      <Can I="approve" a="SoftDeleteRequest">
                        <th scope="col" className="p-4 text-xs font-medium text-left text-gray-500 uppercase dark:text-gray-400">
                          Vote
                        </th>
                      </Can>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                    {requests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-100 dark:hover:bg-gray-700">
                        <td className="p-4 text-base font-medium text-gray-900 whitespace-nowrap dark:text-white">
                          <button
                            onClick={() => router.push(`/soft-delete/${request.id}`)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline"
                          >
                            {request.user.name}
                          </button>
                        </td>
                        <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                          <span className="line-clamp-2">{request.reason || 'NA'}</span>
                        </td>
                        <td className="p-4 text-base font-medium text-gray-900 whitespace-nowrap dark:text-white">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {request.requestedBy.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {request.requestedBy.Role?.name}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <Badge
                            text={request.finalDecision}
                            variant={getStatusVariant(request.finalDecision)}
                          />
                          {request.hasVoted && (
                            <Badge text="Voted" variant="default" />
                          )}
                        </td>

                        <Can I="approve" a="SoftDeleteRequest">
                          <td className="p-4 text-base font-medium text-gray-900 whitespace-nowrap dark:text-white">
                            <button
                              onClick={() => handleVoteClick(request)}
                              disabled={request.hasVoted || request.finalDecision !== 'PENDING'}
                              className={`inline-flex items-center px-3 py-2 text-sm font-medium text-center rounded-lg focus:ring-4 ${
                                request.hasVoted || request.finalDecision !== 'PENDING'
                                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                  : 'text-white bg-primary-700 hover:bg-primary-800 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800'
                              }`}
                            >
                              <svg
                                className="w-4 h-4 mr-2"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                              </svg>
                              {request.hasVoted ? 'Voted' : 'Vote'}
                            </button>
                          </td>
                        </Can>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {pagination && pagination.totalPages > 0 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          isLoading={loading}
          onPageChange={handlePageChange}
        />
      )}

      {showVoteModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-blue-100 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="mt-2 px-7 py-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center">
                  Vote on Soft Deletion Request
                </h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    Vote for the soft deletion of <strong>{selectedRequest.user.name}</strong>
                  </p>
                </div>
                <div className="mt-4 px-7">
                  <label htmlFor="vote-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    id="vote-description"
                    value={voteDescription}
                    onChange={(e) => setVoteDescription(e.target.value)}
                    placeholder="Add a comment about your vote..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                    disabled={voteLoading}
                  />
                </div>
                <div className="flex justify-center space-x-4 mt-4">
                  <button
                    onClick={() => handleVote('APPROVED')}
                    disabled={voteLoading}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {voteLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    ) : (
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => handleVote('REJECTED')}
                    disabled={voteLoading}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:ring-4 focus:ring-red-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {voteLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    ) : (
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                    Reject
                  </button>
                </div>
                <div className="flex justify-center mt-4">
                  <button
                    onClick={() => {
                      setShowVoteModal(false);
                      setSelectedRequest(null);
                      setVoteDescription('');
                    }}
                    disabled={voteLoading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:ring-4 focus:ring-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
