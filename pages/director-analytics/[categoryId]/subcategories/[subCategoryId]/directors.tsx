import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import useAuthStore from "@/store/authStore";
import Loading from "@/components/ui/Loading";
import { EmptyStateMessage } from "@/components/ui/EmptyStateMessage";
import {
  HiArrowLeft,
  HiDownload,
  HiPencil,
  HiPlus,
  HiPresentationChartLine,
  HiTrash,
  HiX,
} from "react-icons/hi";
import {
  fetchDirectorsAnalytics,
  exportDirectorsAnalytics,
  DirectorAnalytics,
} from "@/services/directorAnalytics";
import Pagination from "@/components/common/Pagination";
import Head from "next/head";
import Can from "@/components/rbac/Can";
import { useAbility } from "@/hooks/useAbility";

interface SelectOption {
  id: number;
  name: string;
}

interface FieldErrors {
  userId?: string;
  membershipSubCategoryId?: string;
  roleId?: string;
}

interface ApiErrorItem {
  path?: string;
  msg?: string;
  message?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getAuthHeaders = (token: string) => ({
  "Content-Type": "application/json",
  token,
});

const toPositiveInt = (value: string | number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
};

const extractApiErrors = (payload: any): ApiErrorItem[] => {
  if (Array.isArray(payload?.error)) return payload.error;
  if (Array.isArray(payload?.errors?.error)) return payload.errors.error;
  return [];
};

const mapFieldErrors = (payload: any): FieldErrors => {
  const errs = extractApiErrors(payload);
  const mapped: FieldErrors = {};

  errs.forEach((item) => {
    const key = item.path as keyof FieldErrors;
    if (key && ["userId", "membershipSubCategoryId", "roleId"].includes(key)) {
      mapped[key] = item.msg || item.message || "Invalid value.";
    }
  });

  return mapped;
};

export default function DirectorsAnalytics() {
  const router = useRouter();
  const { categoryId, subCategoryId } = router.query;
  const token = useAuthStore((state) => state.token);
  const ability = useAbility();

  const [directors, setDirectors] = useState<DirectorAnalytics[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pagination, setPagination] = useState<any>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf">("excel");

  const [activeUsers, setActiveUsers] = useState<SelectOption[]>([]);
  const [roles, setRoles] = useState<SelectOption[]>([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [updateLoadingId, setUpdateLoadingId] = useState<number | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);

  const [createForm, setCreateForm] = useState({
    userId: "",
    roleId: "",
  });
  const [createErrors, setCreateErrors] = useState<FieldErrors>({});
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    roleId: "",
  });
  const [editErrors, setEditErrors] = useState<FieldErrors>({});

  const [deleteModalId, setDeleteModalId] = useState<number | null>(null);

  const limit = 10;

  const isActionLocked = useMemo(
    () =>
      createLoading || updateLoadingId !== null || deleteLoadingId !== null || isExporting,
    [createLoading, updateLoadingId, deleteLoadingId, isExporting]
  );
  const canCreateDirectorAnalytics = ability?.can("create", "DirectorAnalytics") ?? false;
  const canUpdateDirectorAnalytics = ability?.can("update", "DirectorAnalytics") ?? false;
  const canDeleteDirectorAnalytics = ability?.can("delete", "DirectorAnalytics") ?? false;
  const canManageBoardMemberActions = canUpdateDirectorAnalytics || canDeleteDirectorAnalytics;

  const fetchBoardMembers = async (page: number) => {
    if (!token || token === "undefined" || !subCategoryId) return;

    const response = await fetchDirectorsAnalytics(
      token,
      Number(subCategoryId),
      page,
      limit
    );

    setDirectors(response.data);
    setPagination(response.pagination);
  };

  const refetchBoardMembersData = async (targetPage?: number) => {
    const pageToFetch = targetPage || currentPage;
    await fetchBoardMembers(pageToFetch);
  };

  const fetchFormDependencies = async () => {
    if (!token || token === "undefined") return;

    const [usersRes, rolesRes] = await Promise.all([
      fetch(`${API_URL}/api/board-members/active-users`, {
        headers: getAuthHeaders(token),
      }),
      fetch(`${API_URL}/api/user/roles`, {
        headers: getAuthHeaders(token),
      }),
    ]);

    const usersPayload = await usersRes.json();
    const rolesPayload = await rolesRes.json();

    if (!usersRes.ok || usersPayload?.error) {
      throw new Error(usersPayload?.error?.[0]?.msg || "Failed to load active users.");
    }

    if (!rolesRes.ok || rolesPayload?.error) {
      throw new Error(rolesPayload?.error?.[0]?.msg || "Failed to load roles.");
    }

    const normalizedUsers = (usersPayload?.data || []).map((u: any) => ({
      id: Number(u.id),
      name: u.name || u.email || `User #${u.id}`,
    }));

    const normalizedRoles = (rolesPayload?.data || []).map((r: any) => ({
      id: Number(r.id),
      name: r.name || `Role #${r.id}`,
    }));

    setActiveUsers(normalizedUsers);
    setRoles(normalizedRoles);
  };

  useEffect(() => {
    if (!token || token === "undefined") {
      router.push("/");
      return;
    }

    if (!subCategoryId) return;

    const load = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchBoardMembers(currentPage), fetchFormDependencies()]);
      } catch (error: any) {
        console.error("Error loading board members data:", error);
        toast.error(error.message || "Failed to load board members data");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token, router, subCategoryId, currentPage]);

  const handleBack = () => {
    router.push(`/director-analytics/${categoryId}/subcategories`);
  };

  const handleDirectorClick = (userId: number) => {
    if (editingId !== null || deleteModalId !== null) return;

    const returnPath = encodeURIComponent(
      `/director-analytics/${categoryId}/subcategories/${subCategoryId}/directors`
    );
    router.push(`/users/${userId}?returnPath=${returnPath}`);
  };

  const handleExport = async (format: "excel" | "pdf") => {
    if (!subCategoryId || !token || token === "undefined") return;

    try {
      setIsExporting(true);
      setExportFormat(format);
      const blob = await exportDirectorsAnalytics(token, Number(subCategoryId), format);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const extension = format === "excel" ? "xlsx" : "pdf";
      a.download = `board_members_analytics_${subCategoryId}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Board Members data exported successfully as ${format.toUpperCase()}`);
    } catch (error: any) {
      console.error("Error exporting board members analytics:", error);
      toast.error(error.message || "Failed to export board members data");
    } finally {
      setIsExporting(false);
    }
  };

  const validateCreateForm = () => {
    const errors: FieldErrors = {};

    if (!toPositiveInt(createForm.userId)) {
      errors.userId = "User is required.";
    }
    if (!toPositiveInt(createForm.roleId)) {
      errors.roleId = "Role is required.";
    }

    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditForm = () => {
    const errors: FieldErrors = {};

    if (!toPositiveInt(editForm.roleId)) {
      errors.roleId = "Role is required.";
    }

    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateBoardMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateDirectorAnalytics) {
      toast.error("You do not have permission to create board members.");
      return;
    }
    if (!token || token === "undefined") return;
    if (!validateCreateForm()) return;

    try {
      setCreateLoading(true);
      setCreateErrors({});

      const res = await fetch(`${API_URL}/api/board-members`, {
        method: "POST",
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          userId: toPositiveInt(createForm.userId),
          membershipSubCategoryId: toPositiveInt(String(subCategoryId || "")),
          roleId: toPositiveInt(createForm.roleId),
        }),
      });

      const payload = await res.json();

      if (res.ok && !payload?.error) {
        toast.success(payload?.message || "Board member created successfully.");
        setCreateForm({
          userId: "",
          roleId: "",
        });
        setCurrentPage(1);
        setShowCreateModal(false);
        await fetchBoardMembers(1);
        return;
      }

      if (res.status === 404) {
        const fieldMapped = mapFieldErrors(payload);
        setCreateErrors((prev) => ({ ...prev, ...fieldMapped }));
        if (Object.keys(fieldMapped).length === 0) {
          toast.error(payload?.error?.[0]?.msg || "Required references were not found.");
        }
        return;
      }

      if (res.status === 409) {
        toast.error(
          payload?.error?.[0]?.msg || "This user is already assigned as a board member."
        );
        return;
      }

      toast.error(payload?.error?.[0]?.msg || "Failed to create board member.");
    } catch (error: any) {
      console.error("Error creating board member:", error);
      toast.error(error.message || "Failed to create board member.");
    } finally {
      setCreateLoading(false);
    }
  };

  const startEdit = (director: DirectorAnalytics) => {
    setEditingId(director.id);
    setEditForm({
      roleId: "",
    });
    setEditErrors({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ roleId: "" });
    setEditErrors({});
  };

  const handleUpdateBoardMember = async (boardMemberId: number) => {
    if (!canUpdateDirectorAnalytics) {
      toast.error("You do not have permission to update board members.");
      return;
    }
    if (!token || token === "undefined") return;
    if (!validateEditForm()) return;

    try {
      setUpdateLoadingId(boardMemberId);
      setEditErrors({});

      const res = await fetch(`${API_URL}/api/board-members/${boardMemberId}`, {
        method: "PUT",
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          membershipSubCategoryId: toPositiveInt(String(subCategoryId || "")),
          roleId: toPositiveInt(editForm.roleId),
        }),
      });

      const payload = await res.json();

      if (res.ok && !payload?.error) {
        toast.success(payload?.message || "Board member updated successfully.");
        cancelEdit();
        await refetchBoardMembersData();
        return;
      }

      if (res.status === 400) {
        toast.error(
          payload?.error?.[0]?.msg ||
            "Invalid update payload. userId updates are not allowed."
        );
        return;
      }

      if (res.status === 404) {
        const fieldMapped = mapFieldErrors(payload);
        setEditErrors((prev) => ({ ...prev, ...fieldMapped }));
        toast.error(payload?.error?.[0]?.msg || "Board member or related IDs not found.");
        return;
      }

      toast.error(payload?.error?.[0]?.msg || "Failed to update board member.");
    } catch (error: any) {
      console.error("Error updating board member:", error);
      toast.error(error.message || "Failed to update board member.");
    } finally {
      setUpdateLoadingId(null);
    }
  };

  const handleDeleteBoardMember = async () => {
    if (!canDeleteDirectorAnalytics) {
      toast.error("You do not have permission to delete board members.");
      return;
    }
    if (!token || token === "undefined" || deleteModalId === null) return;

    const boardMemberId = deleteModalId;

    try {
      setDeleteLoadingId(boardMemberId);

      const res = await fetch(`${API_URL}/api/board-members/${boardMemberId}`, {
        method: "DELETE",
        headers: getAuthHeaders(token),
      });

      const payload = await res.json();

      if (res.ok && !payload?.error) {
        toast.success(payload?.message || "Board member deleted successfully.");
        setDeleteModalId(null);
        const shouldGoToPreviousPage = directors.length === 1 && currentPage > 1;
        const nextPage = shouldGoToPreviousPage ? currentPage - 1 : currentPage;
        if (shouldGoToPreviousPage) {
          setCurrentPage(nextPage);
        }
        await refetchBoardMembersData(nextPage);
        return;
      }

      if (res.status === 404) {
        toast.info(payload?.error?.[0]?.msg || "Board member was already removed.");
        setDeleteModalId(null);
        await refetchBoardMembersData();
        return;
      }

      toast.error(payload?.error?.[0]?.msg || "Failed to delete board member.");
    } catch (error: any) {
      console.error("Error deleting board member:", error);
      toast.error(error.message || "Failed to delete board member.");
    } finally {
      setDeleteLoadingId(null);
    }
  };

  if (loading) {
    return <Loading />;
  }

  const totalCount = pagination?.totalItems || directors.length;

  return (
    <>
      <Head>
        <title>Board Members | PBC Portal</title>
      </Head>
      <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="mb-4 flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            {/* @ts-ignore */}
            <HiArrowLeft className="w-5 h-5 mr-2" />
            Back to Sub-Categories
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {/* @ts-ignore */}
                <HiPresentationChartLine className="w-6 h-6" />
                Board Members Analytics
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Total Board Members: {totalCount}
              </p>
            </div>
            <div className="flex gap-2">
              <Can I="manage" a="DirectorAnalytics">
                <button
                  onClick={() => handleExport("excel")}
                  disabled={isActionLocked || directors.length === 0}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-green-600 dark:hover:bg-green-700 transition-colors"
                >
                  {/* @ts-ignore */}
                  <HiDownload className="w-5 h-5" />
                  {isExporting && exportFormat === "excel" ? "Exporting..." : "Export Excel"}
                </button>
              </Can>
            </div>
          </div>
        </div>

        <Can I="create" a="DirectorAnalytics">
          <div className="mb-6">
            <button
              type="button"
              onClick={() => {
                setCreateErrors({});
                setShowCreateModal(true);
              }}
              disabled={isActionLocked}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-900 bg-gold-300 rounded-lg hover:bg-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {/* @ts-ignore */}
              <HiPlus className="w-4 h-4" />
              Add Board Member
            </button>
          </div>
        </Can>

        {directors.length === 0 ? (
          <EmptyStateMessage
            // @ts-ignore
            icon={<HiPresentationChartLine className="w-12 h-12 text-gray-400" />}
            title="No Board Members Found"
            message="There are no board members available for this sub-category."
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden shadow sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th
                          scope="col"
                          className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                        >
                          Director Name
                        </th>
                        <th
                          scope="col"
                          className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                        >
                          Category
                        </th>
                        <th
                          scope="col"
                          className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                        >
                          Sub-Category
                        </th>
                        <th
                          scope="col"
                          className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                        >
                          Designation / Role
                        </th>
                        <th
                          scope="col"
                          className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                        >
                          Email
                        </th>
                        <th
                          scope="col"
                          className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                        >
                          Country
                        </th>
                        <th
                          scope="col"
                          className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                        >
                          Status
                        </th>
                        {canManageBoardMemberActions && (
                          <th
                            scope="col"
                            className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                          >
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                      {directors.map((director) => (
                        <tr
                          key={director.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                          onClick={() => handleDirectorClick(director.userId)}
                        >
                          <td className="p-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {director.name}
                          </td>
                          <td className="p-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {director.category || "N/A"}
                          </td>
                          <td className="p-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {director.subCategory || "N/A"}
                          </td>
                          <td className="p-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {director.designation || director.role || "N/A"}
                          </td>
                          <td className="p-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {director.email}
                          </td>
                          <td className="p-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {director.country || "N/A"}
                          </td>
                          <td className="p-4 whitespace-nowrap text-sm">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                director.status === "Active"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              }`}
                            >
                              {director.status}
                            </span>
                          </td>
                          {canManageBoardMemberActions && (
                            <td
                              className="p-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center gap-2">
                                {editingId === director.id ? (
                                  <>
                                    <select
                                      value={editForm.roleId}
                                      onChange={(e) => {
                                        setEditForm((prev) => ({ ...prev, roleId: e.target.value }));
                                        setEditErrors((prev) => ({ ...prev, roleId: "" }));
                                      }}
                                      disabled={updateLoadingId === director.id}
                                      className="w-40 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs p-2"
                                    >
                                      <option value="">Select role</option>
                                      {roles.map((role) => (
                                        <option key={role.id} value={role.id}>
                                          {role.name}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateBoardMember(director.id)}
                                      disabled={updateLoadingId === director.id || isActionLocked}
                                      className="px-2 py-1 text-xs text-white bg-blue-600 rounded disabled:opacity-50"
                                    >
                                      {updateLoadingId === director.id ? "Saving..." : "Save"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelEdit}
                                      disabled={updateLoadingId === director.id}
                                      className="px-2 py-1 text-xs text-gray-700 bg-gray-100 rounded disabled:opacity-50"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    {canUpdateDirectorAnalytics && (
                                      <button
                                        type="button"
                                        onClick={() => startEdit(director)}
                                        disabled={isActionLocked}
                                        className="p-1.5 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                                        title="Edit board member"
                                      >
                                        {/* @ts-ignore */}
                                        <HiPencil className="w-4 h-4" />
                                      </button>
                                    )}
                                    {canDeleteDirectorAnalytics && (
                                      <button
                                        type="button"
                                        onClick={() => setDeleteModalId(director.id)}
                                        disabled={isActionLocked}
                                        className="p-1.5 text-red-600 hover:text-red-800 disabled:opacity-50"
                                        title="Delete board member"
                                      >
                                        {/* @ts-ignore */}
                                        <HiTrash className="w-4 h-4" />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                              {editingId === director.id && (
                                <div className="mt-2">
                                  {editErrors.roleId && (
                                    <p className="text-red-600 text-xs">{editErrors.roleId}</p>
                                  )}
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            {pagination && (
              <div className="mt-4">
                <Pagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className="w-full max-w-3xl rounded-xl overflow-hidden shadow-2xl border border-gold-500">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gold-500 bg-gray-900">
              <h3 className="text-xl font-serif text-gold-300">Create New Board Member</h3>
              <button
                type="button"
                onClick={() => !createLoading && setShowCreateModal(false)}
                disabled={createLoading}
                className="text-gold-300 hover:text-gold-200 disabled:opacity-50"
              >
                {/* @ts-ignore */}
                <HiX className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={handleCreateBoardMember}
              className="px-6 py-5 bg-gradient-to-b from-gray-800 to-gray-900"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gold-500 mb-1">
                    User <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={createForm.userId}
                    onChange={(e) => {
                      setCreateForm((prev) => ({ ...prev, userId: e.target.value }));
                      setCreateErrors((prev) => ({ ...prev, userId: "" }));
                    }}
                    disabled={createLoading}
                    className="w-full rounded-lg border border-gold-500 bg-gray-800 text-gray-100 text-sm p-2.5 focus:border-gold-500 focus:ring-gold-500"
                  >
                    <option value="">Select user</option>
                    {activeUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                  {createErrors.userId && (
                    <p className="text-red-400 text-xs mt-1">{createErrors.userId}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gold-500 mb-1">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={createForm.roleId}
                    onChange={(e) => {
                      setCreateForm((prev) => ({ ...prev, roleId: e.target.value }));
                      setCreateErrors((prev) => ({ ...prev, roleId: "" }));
                    }}
                    disabled={createLoading}
                    className="w-full rounded-lg border border-gold-500 bg-gray-800 text-gray-100 text-sm p-2.5 focus:border-gold-500 focus:ring-gold-500"
                  >
                    <option value="">Select role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  {createErrors.roleId && (
                    <p className="text-red-400 text-xs mt-1">{createErrors.roleId}</p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={createLoading}
                  className="px-4 py-2 text-sm rounded-lg border border-gold-500 text-gold-300 hover:bg-gray-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-gold-300 text-gray-900 hover:bg-gold-400 disabled:opacity-50"
                >
                  {createLoading ? "Creating..." : "Create Board Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteModalId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Confirm Delete
              </h3>
              <button
                onClick={() => setDeleteModalId(null)}
                disabled={deleteLoadingId !== null}
                className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                {/* @ts-ignore */}
                <HiX className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete this board member? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteModalId(null)}
                disabled={deleteLoadingId !== null}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBoardMember}
                disabled={deleteLoadingId !== null}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoadingId !== null ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
