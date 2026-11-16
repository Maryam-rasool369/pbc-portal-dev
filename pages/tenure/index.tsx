import Pagination from "@/components/common/Pagination";
import useAuthStore from "@/store/authStore";
import Can from "@/components/rbac/Can";
import { useEffect, useState } from "react";
import { HiOutlineBadgeCheck, HiOutlineChevronRight, HiOutlineDocument, HiOutlinePhotograph, HiOutlineVideoCamera, HiOutlinePresentationChartLine } from "react-icons/hi";
import { Tabs, TabItem, Button } from "flowbite-react";
import { useRouter } from "next/router";
import { useLoadingStore } from "@/store/useLoadingStore";
import { toast } from "react-toastify";
import { getAllTenures } from "@/services/tenure";
import type { Tenure, TenureContent } from "@/types/tenure";
import TenureModal from "@/components/tenure/TenureModal";
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
export default function Tenure() {
  const router = useRouter();
  const setLoading = useLoadingStore((state) => state.setLoading);
  const token = useAuthStore((state) => state.token);
  const ability = useAbility();
  const permissions = useAuthStore((state) => state.permissions);
  const [tenures, setTenures] = useState<Tenure[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [openCreateModal, setOpenCreateModal] = useState(false);

  const limit = 10;

  const getAllTenuresData = async (page: number = 1) => {
    setLoading(true);
    try {
      const response = await getAllTenures(token || "");
      setTenures(response);
      setTotalPages(Math.ceil(response.length / limit));
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
    getAllTenuresData(currentPage);
  }, [currentPage, openCreateModal]);

  return (
    <div className="min-h-screen text-white flex flex-col p-4">
      <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800 flex-1 flex-row">
        <div className="flex flex-col items-start justify-between lg:flex mb-6">
          <div className="flex flex-row items-center justify-between gap-4 w-full">
            <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
            Tenure
            </h3>
            <Can I="create" a="Tenure">
              <div className="flex gap-2">
                <Button
                  className="px-2 bg-gold-500 hover:bg-gold-600 text-gray-800 rounded-md transition-colors flex items-center"
                  onClick={() => setOpenCreateModal(true)}
                >
                 Create Tenure
                </Button>
              </div>
            </Can>
          </div>

          <Tabs aria-label="Tenure Tabs" className="w-full">
            <TabItem 
              title="Tenure List"
            >
              <div className="mt-6 space-y-6 w-full">
                {tenures.map((tenure) => (
                  <div
                    key={tenure.id}
                    className="bg-gray-800 border border-gold-500 rounded-xl p-5 cursor-pointer transition-all hover:border-gold-400"
                  >
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
                      <div className="flex-shrink-0">
                        <button 
                          className="w-8 h-8 bg-gold-500 text-black rounded-full flex items-center justify-center"
                          onClick={() => router.push(`/tenure/${tenure.id}`)}
                        >
                          {/* @ts-ignore */}
                          <HiOutlineChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabItem>
          </Tabs>

          <Can I="create" a="Tenure">
            <TenureModal 
              open={openCreateModal}
              onClose={() => setOpenCreateModal(false)}
              onSuccess={() => {
                setOpenCreateModal(false);
                getAllTenuresData(currentPage);
              }}
            />
          </Can>
        </div>
      </div>
    </div>
  );
}