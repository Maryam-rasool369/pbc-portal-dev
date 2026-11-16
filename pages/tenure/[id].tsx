import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { HiOutlineBadgeCheck, HiOutlineDocument, HiOutlinePhotograph, HiOutlineVideoCamera, HiOutlinePresentationChartLine, HiOutlineUserGroup, HiOutlineArrowLeft, HiOutlinePencil, HiOutlineTrash } from "react-icons/hi";
import { Tabs, TabItem, Button } from "flowbite-react";
import { useLoadingStore } from "@/store/useLoadingStore";
import { toast } from "react-toastify";
import { ADMIN_ROLES } from "@/enums/Roles";
import { EmptyStateMessage } from "@/components/ui/EmptyStateMessage";
import { getTenureById, deleteTenure, deleteTenureContent } from "@/services/tenure";
import type { Tenure, TenureContent, TenureMember, TenureNonMember } from "@/types/tenure";
import useAuthStore from "@/store/authStore";
import AddMembersModal from "@/components/tenure/AddMembersModal";
import UploadContentModal from "@/components/tenure/UploadContentModal";
import TenureModal from "@/components/tenure/TenureModal";
import Can from "@/components/rbac/Can";
import { useAbility } from "@/hooks/useAbility";

const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

const getContentIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'image':
    case 'images':
      // @ts-ignore
      return <HiOutlinePhotograph className="w-5 h-5" />;
    case 'video':
    case 'videos':
      // @ts-ignore
      return <HiOutlineVideoCamera className="w-5 h-5" />;
    case 'document':
    case 'documents':
    case 'pdf':
      // @ts-ignore
      return <HiOutlineDocument className="w-5 h-5" />;
    case 'presentation':
    case 'powerpoint':
      // @ts-ignore
      return <HiOutlinePresentationChartLine className="w-5 h-5" />;
    default:
      // @ts-ignore
      return <HiOutlineDocument className="w-5 h-5" />;
  }
};

const getRoleName = (roleId: number) => {
  switch (roleId) {
    case 1:
      return "Individual";
    case 2:
      return "Corporate";
    case 3:
      return "PBC Staff";
    case 4:
      return "Admin";
    case 5:
      return "Chairman";
    case 6:
      return "Secretary General";
    case 7:
      return "VC Finance";
    case 8:
      return "Director";
    case 10:
      return "Election Commissioner";
    case 11:
      return "Election Committee Member";
    case 13:
      return "PBC Advisor";
    default:
      return "Member";
  }
};

const getRolePriority = (roleId: number) => {
  switch (roleId) {
    case 5:
      return 1;
    case 6:
      return 3;
    case 7:
      return 4;
    case 8:
      return 2;
    case 4:
      return 5;
    case 3:
      return 6;
    case 2:
      return 7;
    case 1:
      return 8;
    default:
      return 9;
  }
};


export default function TenureDetail() {
  const router = useRouter();
  const { id } = router.query;
  const setLoading = useLoadingStore((state) => state.setLoading);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const ability = useAbility();

  const [tenure, setTenure] = useState<Tenure | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [openAddMembersModal, setOpenAddMembersModal] = useState(false);
  const [membersModalTab, setMembersModalTab] = useState<"add" | "remove" | "nonMembers">("add");
  const [openUploadModal, setOpenUploadModal] = useState(false);
  const [openUpdateModal, setOpenUpdateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<TenureContent | null>(null);
  const [deletingContentId, setDeletingContentId] = useState<number | null>(null);

  const getTenureData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await getTenureById(Number(id), token || "");
      setTenure(response);
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getTenureData();
  }, [id]);

  const handleDeleteTenure = async () => {
    if (!tenure?.id) return;

    setLoading(true);
    try {
      await deleteTenure(tenure.id, token || "");
      toast.success("Tenure deleted successfully!");
      router.push("/tenure");
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteContent = async () => {
    if (!tenure?.id || !contentToDelete?.id || !token) return;

    setDeletingContentId(contentToDelete.id);
    try {
      await deleteTenureContent(tenure.id, contentToDelete.id, token);
      toast.success("Content deleted successfully!");
      setContentToDelete(null);
      await getTenureData();
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.";
      toast.error(errorMessage);
    } finally {
      setDeletingContentId(null);
    }
  };

  const getPublicContent = () => {
    return tenure?.content?.filter(content => !content.isConfidential) || [];
  };
  const getConfidentialContent = () => {
    return tenure?.content?.filter(content => content.isConfidential) || [];
  };

  const renderContentGrid = (content: TenureContent[]) => {
    if (content.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          {/* @ts-ignore */}
          <HiOutlineDocument className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>No content available</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {content.map((item) => (
          <div
            key={item.id}
            className="relative bg-gray-700 border border-gray-600 rounded-lg p-4 hover:bg-gray-600 transition-colors cursor-pointer"
            onClick={() => window.open(item.url, '_blank')}
          >
            <Can I="manage" a="Tenure">
              <button
                type="button"
                aria-label={`Delete ${item.title}`}
                disabled={deletingContentId === item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setContentToDelete(item);
                }}
                className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-red-500/50 bg-gray-900/80 text-red-400 hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
              >
                {/* @ts-ignore */}
                <HiOutlineTrash className="h-4 w-4" />
              </button>
            </Can>
            <div className="flex items-center gap-3 mb-2">
              <div className="text-gold-500">
                {/* @ts-ignore */}
                {getContentIcon(item.type)}
              </div>
              <h4 className="text-white font-medium truncate pr-7">{item.title}</h4>
            </div>
            <p className="text-gray-400 text-sm">
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </p>
            <p className="text-gray-500 text-xs mt-2">
              Uploaded: {formatDate(item.createdAt)}
            </p>
          </div>
        ))}
      </div>
    );
  };

  const renderMembers = () => {
    if (!tenure?.members || tenure.members.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          {/* @ts-ignore */}
          <HiOutlineUserGroup className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>No members information available</p>
        </div>
      );
    }

    const sortedMembers = [...tenure.members].sort((a, b) => {
      const priorityA = getRolePriority(a.roleId);
      const priorityB = getRolePriority(b.roleId);
      return priorityA - priorityB;
    });

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedMembers.map((member, index) => (
          <div
            key={member.user?.id ?? `member-${index}`}
            className="bg-gray-700 border border-gray-600 rounded-lg p-4"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gold-500 rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-sm">
                  {member.user?.name?.charAt(0) || "?"}
                </span>
              </div>
              <div>
                <h4 className="text-white font-medium">{member.user?.name || "Unknown"}</h4>
                <p className="text-gold-500 text-sm">{getRoleName(member.roleId)}</p>
              </div>
            </div>
            <p
              className="text-gray-400 text-sm cursor-pointer hover:text-gold-500 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                if (member.user?.id) {
                  router.push(`/users/${member.user.id}?returnPath=${encodeURIComponent(router.asPath)}`);
                }
              }}
            >
              {member.user?.email}
            </p>
          </div>
        ))}
      </div>
    );
  };

  const renderNonMembers = () => {
    const nonMembers = tenure?.nonMembers || [];

    if (nonMembers.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          {/* @ts-ignore */}
          <HiOutlineUserGroup className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>No non-members recorded</p>
        </div>
      );
    }

    const sortedNonMembers = [...nonMembers].sort((a: TenureNonMember, b: TenureNonMember) => {
      const priorityA = getRolePriority(a.roleId);
      const priorityB = getRolePriority(b.roleId);
      return priorityA - priorityB;
    });

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedNonMembers.map((nonMember) => (
          <div
            key={nonMember.id}
            className="bg-gray-700 border border-gray-600 rounded-lg p-4"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {nonMember.name?.charAt(0) || "?"}
                </span>
              </div>
              <div>
                <h4 className="text-white font-medium">{nonMember.name}</h4>
                <p className="text-gold-500 text-sm">{getRoleName(nonMember.roleId)}</p>
              </div>
            </div>
            <p className="text-gray-500 text-xs">Not registered in system</p>
          </div>
        ))}
      </div>
    );
  };

  if (!tenure) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mx-auto mb-4"></div>
          <p>Loading tenure details...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen text-white flex flex-col p-4">
      <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800 flex-1 flex-row">
        <div className="flex flex-col items-start justify-between lg:flex mb-6">
          <div className="flex flex-row items-center justify-between gap-4 w-full">
            <div className="flex items-center gap-4">
              <Button
                className="px-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors flex items-center"
                onClick={() => router.back()}
              >
                {/* @ts-ignore */}
                <HiOutlineArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                {tenure.name}
              </h3>
            </div>
            <div className="flex gap-2">
              <Can I="delete" a="Tenure">
                <Button
                  className="px-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors flex items-center"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  {/* @ts-ignore */}
                  <HiOutlineTrash className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </Can>
              <Can I="update" a="Tenure">
                <Button
                  className="px-2 bg-gold-500 hover:bg-gold-600 text-gray-800 rounded-md transition-colors flex items-center"
                  onClick={() => setOpenUpdateModal(true)}
                >
                  {/* @ts-ignore */}
                  <HiOutlinePencil className="w-4 h-4 mr-2" />
                  Update
                </Button>
              </Can>
            </div>
          </div>
          <br />

          <Tabs aria-label="Tenure Detail Tabs" className="w-full">
            <TabItem
              active={activeTab === "overview"}
              title="Overview"
              onClick={() => setActiveTab("overview")}
            >
              <div className="mt-6 space-y-6 w-full">
                <div className="bg-gray-800 border border-gold-500 rounded-xl p-5">
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl text-gold-500 font-bold truncate">
                        {tenure.name}
                      </h2>
                      <p className="text-white text-sm mt-1 line-clamp-2 break-words">
                        {tenure.description || "No description available"}
                      </p>
                      <div className="flex items-center gap-2 mt-3 text-white flex-wrap">
                        {/* @ts-ignore */}
                        <HiOutlineBadgeCheck className="text-gold-500 w-5 h-5" />
                        <span className="text-sm font-medium">
                          {formatDate(tenure.startDate)}
                        </span>{" "}
                        -{" "}
                        <span className="text-sm font-medium">
                          {formatDate(tenure.endDate)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-lg font-semibold text-white">Public Content</h4>
                      <Can I="manage" a="Tenure">
                        <Button
                          className="px-3 py-1 bg-gold-500 hover:bg-gold-600 text-gray-800 rounded-md transition-colors flex items-center text-sm"
                          onClick={() => setOpenUploadModal(true)}
                        >
                          {/* @ts-ignore */}
                          <HiOutlineDocument className="w-4 h-4 mr-1" />
                          Upload Content
                        </Button>
                      </Can>
                    </div>
                    {renderContentGrid(getPublicContent())}
                  </div>
                </div>
              </div>
            </TabItem>

            <TabItem
              active={activeTab === "members"}
              title="Members"
              onClick={() => setActiveTab("members")}
            >
              <div className="mt-6 space-y-6 w-full">
                <div className="bg-gray-800 border border-gold-500 rounded-xl p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-white">Board Members</h4>
                    <Can I="approve" a="Tenure">
                      <Button
                        className="px-2 bg-gold-500 hover:bg-gold-600 text-gray-800 rounded-md transition-colors flex items-center"
                        onClick={() => {
                          setMembersModalTab("add");
                          setOpenAddMembersModal(true);
                        }}
                      >
                        Manage Members
                      </Button>
                    </Can>
                  </div>
                  {renderMembers()}
                </div>

                <div className="bg-gray-800 border border-gold-500 rounded-xl p-5">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-white">Non-Members</h4>
                      <p className="text-gray-400 text-sm mt-1">
                        Historical members not registered in the system
                      </p>
                    </div>
                    <Can I="approve" a="Tenure">
                      <Button
                        className="px-2 bg-gold-500 hover:bg-gold-600 text-gray-800 rounded-md transition-colors flex items-center"
                        onClick={() => {
                          setMembersModalTab("nonMembers");
                          setOpenAddMembersModal(true);
                        }}
                      >
                        Manage Non-Members
                      </Button>
                    </Can>
                  </div>
                  {renderNonMembers()}
                </div>
              </div>
            </TabItem>

            {user?.Role?.name && ADMIN_ROLES.includes(user.Role.name as any) && getConfidentialContent().length > 0 && (
              <TabItem
                active={activeTab === "confidential"}
                title="Confidential Content"
                onClick={() => setActiveTab("confidential")}
              >
                <div className="mt-6 space-y-6 w-full">
                  <div className="bg-gray-800 border border-red-500 rounded-xl p-5">
                    {/* @ts-ignore */}
                    <h4 className="text-lg font-semibold text-red-500 mb-4">Confidential Content</h4>
                    <p className="text-gray-400 text-sm mb-4">
                      This content is restricted to administrators only.
                    </p>
                    {renderContentGrid(getConfidentialContent())}
                  </div>
                </div>
              </TabItem>
            )}
          </Tabs>

          <AddMembersModal
            open={openAddMembersModal}
            onClose={() => setOpenAddMembersModal(false)}
            onSuccess={() => {
              setOpenAddMembersModal(false);
              getTenureData();
            }}
            tenureId={tenure?.id as number}
            tenure={tenure}
            initialTab={membersModalTab}
          />
          <Can I="manage" a="Tenure">
            <UploadContentModal
              open={openUploadModal}
              onClose={() => setOpenUploadModal(false)}
              onSuccess={() => {
                setOpenUploadModal(false);
                getTenureData();
              }}
              tenureId={tenure?.id as number}
            />
          </Can>

          <TenureModal
            open={openUpdateModal}
            onClose={() => setOpenUpdateModal(false)}
            onSuccess={() => {
              setOpenUpdateModal(false);
              getTenureData();
            }}
            tenure={tenure}
            isUpdate={true}
          />
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Confirm Delete</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete &apos;{tenure?.name}&apos;? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end ">
              <Button
                color="gray"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4"
              >
                Cancel
              </Button>
              <Button
                color="failure"
                onClick={handleDeleteTenure}
                className="px-4"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {contentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Confirm Delete</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete &apos;{contentToDelete.title}&apos;? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                color="gray"
                onClick={() => setContentToDelete(null)}
                className="px-4"
                disabled={deletingContentId === contentToDelete.id}
              >
                Cancel
              </Button>
              <Button
                color="failure"
                onClick={handleDeleteContent}
                className="px-4"
                disabled={deletingContentId === contentToDelete.id}
              >
                {deletingContentId === contentToDelete.id ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
