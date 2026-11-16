import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  exportRoleTransmissionsToExcel,
  fetchAllRoleTransmissions,
  voteRoleTransmission,
} from '@/services/roleTransmission';
import { RoleTransmissionRequest } from '@/types/roleTransmission';
import useAuthStore from '@/store/authStore';
import { toast } from 'react-toastify';
import Badge from '@/components/ui/Badge';
import Pagination from '@/components/common/Pagination';
import Can from '@/components/rbac/Can';
import { HiDownload } from 'react-icons/hi';

export default function RoleTransmissionIndex() {
  const [roleTransmissions, setRoleTransmissions] = useState<RoleTransmissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedTransmission, setSelectedTransmission] = useState<RoleTransmissionRequest | null>(null);
  const [voteLoading, setVoteLoading] = useState(false);
  const [voteDescription, setVoteDescription] = useState('');
  const [pagination, setPagination] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement | null>(null);
  const { token } = useAuthStore();
  const router = useRouter();

  // Initialize page from query params
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
    const fetchRoleTransmissions = async () => {
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await fetchAllRoleTransmissions(token, currentPage, pageSize);
        setRoleTransmissions(result.data);
        setPagination(result.pagination);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching role transitions:', err);
        setError(err.message || 'Failed to fetch role transitions');
        toast.error(err.message || 'Failed to fetch role transitions');
      } finally {
        setLoading(false);
      }
    };

    fetchRoleTransmissions();
  }, [token, currentPage, pageSize]);

  useEffect(() => {
    if (!showExportDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setShowExportDropdown(false);
      }
    };

    const handleTouchOutside = (event: TouchEvent) => {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setShowExportDropdown(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleTouchOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleTouchOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showExportDropdown]);

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



  const handleVoteClick = (transmission: RoleTransmissionRequest) => {
    setSelectedTransmission(transmission);
    setVoteDescription('');
    setShowVoteModal(true);
  };

  const handleVote = async (vote: 'APPROVED' | 'REJECTED') => {
    if (!selectedTransmission || !token) return;

    try {
      setVoteLoading(true);
      await voteRoleTransmission(token, {
        roleTransmissionId: selectedTransmission.id,
        vote,
        description: voteDescription.trim() || undefined,
      });
      
      toast.success('Vote recorded successfully');
      setShowVoteModal(false);
      setSelectedTransmission(null);
      setVoteDescription('');
      
      const result = await fetchAllRoleTransmissions(token, currentPage, pageSize);
      setRoleTransmissions(result.data);
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
    // Update URL without triggering a page reload
    router.push({
      pathname: router.pathname,
      query: { ...router.query, page: page.toString() }
    }, undefined, { shallow: true });
  };

  const handleExportExcel = async (
    exportStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL',
  ) => {
    if (!token) {
      toast.error('No authentication token found');
      return;
    }

    try {
      setShowExportDropdown(false);
      setIsExporting(true);
      const blob = await exportRoleTransmissionsToExcel(token, exportStatus);

      const timestamp = new Date()
        .toLocaleString('en-US', { hour12: false })
        .replace(/[/:, ]/g, '-');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `role-transitions-${
        exportStatus === 'ALL' ? 'all-statuses' : exportStatus.toLowerCase()
      }-${timestamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Role transition report exported successfully');
    } catch (error: any) {
      console.error('Error exporting role transitions:', error);
      toast.error(error.message || 'Failed to export role transitions');
    } finally {
      setIsExporting(false);
    }
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
          <div className="mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
            <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
              Role Transition Requests
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              View and manage role transition requests
            </p>
            </div>

            <Can I="manage" a="RoleTransmission">
              <div className="relative" ref={exportDropdownRef}>
                <button
                  onClick={() => setShowExportDropdown((prev) => !prev)}
                  disabled={isExporting || loading}
                  className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                      Exporting...
                    </div>
                  ) : (
                    <>
                      {/* @ts-ignore */}
                      <HiDownload className="mr-2" /> Export Excel
                    </>
                  )}
                </button>

                {showExportDropdown && !isExporting && (
                  <div className="absolute right-0 mt-2 w-52 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl z-20">
                    {[
                      { label: 'Pending', value: 'PENDING' },
                      { label: 'Approved', value: 'APPROVED' },
                      { label: 'Rejected', value: 'REJECTED' },
                      { label: 'All', value: 'ALL' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() =>
                          handleExportExcel(
                            option.value as
                              | 'PENDING'
                              | 'APPROVED'
                              | 'REJECTED'
                              | 'ALL',
                          )
                        }
                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Can>
          </div>
        </div>
      </div>

      {roleTransmissions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Role Transitions</h3>
          <p className="text-gray-600 dark:text-gray-400">There are no role transition requests at the moment.</p>
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
                        Role Change
                      </th>
                      <th scope="col" className="p-4 text-xs font-medium text-left text-gray-500 uppercase dark:text-gray-400">
                        Requested By
                      </th>
                      <th scope="col" className="p-4 text-xs font-medium text-left text-gray-500 uppercase dark:text-gray-400">
                        Final Decision
                      </th>
                      <Can I="approve" a="RoleTransmission">
                      <th scope="col" className="p-4 text-xs font-medium text-left text-gray-500 uppercase dark:text-gray-400">
                        Vote
                      </th>
                      </Can>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                    {roleTransmissions.map((transmission) => (
                      <tr key={transmission.id} className="hover:bg-gray-100 dark:hover:bg-gray-700">
                        <td className="p-4 text-base font-medium text-gray-900 whitespace-nowrap dark:text-white">
                          <button
                            onClick={() => router.push(`/roleTransmission/${transmission.id}`)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline"
                          >
                            {transmission.user.name}
                          </button>
                        </td>
                        <td className="p-4 text-base font-medium text-gray-900 whitespace-nowrap dark:text-white">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {transmission.prevRole.name}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {transmission.newRole.name}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-base font-medium text-gray-900 whitespace-nowrap dark:text-white">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {transmission.requestedBy.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {transmission.requestedBy.Role.name}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Badge
                              text={transmission.finalDecision}
                              variant={getStatusVariant(transmission.finalDecision)}
                            />
                            {transmission.hasVoted && (
                              <Badge text="Voted" variant="default" />
                            )}
                          </div>
                        </td>
                        
                    <Can I="approve" a="RoleTransmission">
                        <td className="p-4 text-base font-medium text-gray-900 whitespace-nowrap dark:text-white">
                          <button
                            onClick={() => handleVoteClick(transmission)}
                            disabled={transmission.hasVoted || transmission.finalDecision !== 'PENDING'}
                            className={`inline-flex items-center px-3 py-2 text-sm font-medium text-center rounded-lg focus:ring-4 ${
                              transmission.hasVoted || transmission.finalDecision !== 'PENDING'
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
                            {transmission.hasVoted ? 'Voted' : 'Vote'}
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

      {/* Pagination */}
      {pagination && pagination.totalPages > 0 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          isLoading={loading}
          onPageChange={handlePageChange}
        />
      )}

      {/* Vote Modal */}
      {showVoteModal && selectedTransmission && (
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
                  Vote on Role Transition Request
                </h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    Vote for <strong>{selectedTransmission.user.name}</strong>&apos;s role change from{' '}
                    <strong>{selectedTransmission.prevRole.name}</strong> to{' '}
                    <strong>{selectedTransmission.newRole.name}</strong>
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
                      setSelectedTransmission(null);
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

