"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Button,
  Modal,
  TextInput,
  Textarea,
  Select,
  Badge,
  FileInput,
} from "flowbite-react";
import {
  HiDownload,
  HiPlus,
  HiOutlineExclamationCircle,
  HiFilter,
  HiSearch,
} from "react-icons/hi";
import useAuthStore from "@/store/authStore";
import { useLoadingStore } from "@/store/useLoadingStore";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import Can from "@/components/rbac/Can";
import { Roles } from "@/enums/Roles";
import { formatStatus } from "@/utils/formatStatus";
import Pagination from "@/components/common/Pagination";
import { formatDateAndTime } from "@/utils/formatDateAndTime";

interface TicketCategory {
  id: string;
  name: string;
}

interface Ticket {
  id: number;
  title: string;
  description: string;
  category: TicketCategory;
  status: "OPEN" | "IN_PROGRESS" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  datePlanned?: string;
  createdAt: string;
  images?: string[];
  userId?: number;
}
interface Pagination {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

interface ApiResponse {
  data: Ticket[];
  pagination: Pagination;
  error?: { msg: string; path: string }[];
}

export default function SupportTickets() {
  const [activeTab, setActiveTab] = useState<"OPEN" | "IN_PROGRESS" | "CLOSED">(
    "OPEN"
  );
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketCategories, setTicketCategories] = useState<TicketCategory[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const limit: number = 5;
  const user = useAuthStore((state) => state.user);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    category: "",
    date: "",
    images: [] as File[],
  });

  const token = useAuthStore((state) => state.token);
  const setGlobalLoading = useLoadingStore((state) => state.setLoading);
  const router = useRouter();

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const isRestrictedUser =
        user?.Role?.name === Roles.INDIVIDUAL ||
        user?.Role?.name === Roles.CORPORATE;
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/ticket?status=${activeTab}${
        isRestrictedUser ? "" : `&page=${currentPage}&limit=${limit}`
      }`;

      const ticketsRes = await fetch(url, {
        headers: { token: `${token}` },
      });

      const ticketsData: ApiResponse = await ticketsRes.json();

      if (ticketsData.error) {
        toast.error(ticketsData.error[0]?.msg || "Failed to fetch tickets");
        setTickets([]);
      } else {
        setTickets(
          user?.Role?.name === Roles.INDIVIDUAL ||
            user?.Role?.name === Roles.CORPORATE
            ? ticketsData.data.filter(
                (ticket: Ticket) => ticket.userId === Number(user?.id)
              )
            : ticketsData.data
        );
        if (
          user?.Role?.name !== Roles.INDIVIDUAL &&
          user?.Role?.name !== Roles.CORPORATE
        ) {
          setPagination(ticketsData.pagination);
        }
      }
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
      toast.error("Failed to fetch tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentPage, token, user]);

  useEffect(() => {
    const fetchData = async () => {
      setGlobalLoading(true);
      try {
        // Fetch categories separately from tickets
        const categoriesRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/tickets-category`,
          { headers: { token: `${token}` } }
        );

        const categoriesData = await categoriesRes.json();
        setTicketCategories(categoriesData.data || []);

        if (categoriesData.data?.length > 0) {
          setFormData((prev) => ({
            ...prev,
            category: categoriesData.data[0].id,
          }));
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
        toast.error("Failed to fetch ticket categories");
      } finally {
        setGlobalLoading(false);
      }
    };

    if (token && user) {
      fetchData();
    }
  }, [token, user, setGlobalLoading]);

  // Fetch tickets when tab changes
  useEffect(() => {
    if (token && user) {
      fetchTickets();
    }
  }, [fetchTickets, token, user]);

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

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showExportDropdown]);

  const handleCreateTicket = async () => {
    // Form validation
    if (!formData.title.trim()) {
      toast.error("Please enter a ticket title");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Please enter a ticket description");
      return;
    }

    if (!formData.category) {
      toast.error("Please select a category");
      return;
    }

    const formPayload = new FormData();
    formPayload.append("title", formData.title);
    formPayload.append("description", formData.description);
    formPayload.append("priority", formData.priority);
    formPayload.append("ticketCategoryId", formData.category);
    formPayload.append("date", formData.date);

    const imageKeys = ["primaryImage", "secondaryImage", "tertiaryImage"];
    formData.images.slice(0, 3).forEach((file, index) => {
      formPayload.append(imageKeys[index], file);
    });

    try {
      setIsSubmitting(true);
      setGlobalLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ticket`, {
        method: "POST",
        headers: { token: `${token}` },
        body: formPayload,
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Ticket created successfully");
        setOpenCreateModal(false);
        // Reset form data
        setFormData({
          title: "",
          description: "",
          priority: "MEDIUM",
          category: ticketCategories[0]?.id || "",
          date: new Date().toISOString().split("T")[0],
          images: [],
        });
        // Refresh tickets
        fetchTickets();
      } else {
        toast.error(data.error?.[0]?.msg || "Failed to create ticket");
      }
    } catch (error) {
      console.error("Ticket creation failed:", error);
      toast.error("Failed to create ticket");
    } finally {
      setIsSubmitting(false);
      setGlobalLoading(false);
    }
  };

  const getStatusBadgeClass = (status: "OPEN" | "IN_PROGRESS" | "CLOSED") => {
    switch (status) {
      case "OPEN":
        return "bg-yellow-500/20 text-yellow-500";
      case "IN_PROGRESS":
        return "bg-blue-500/20 text-blue-500";
      case "CLOSED":
        return "bg-green-500/20 text-green-500";
      default:
        return "bg-gray-500/20 text-gray-500";
    }
  };

  const getPriorityBadgeClass = (
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  ) => {
    switch (priority) {
      case "LOW":
        return "bg-green-500/20 text-green-500";
      case "MEDIUM":
        return "bg-yellow-500/20 text-yellow-500";
      case "HIGH":
        return "bg-orange-500/20 text-orange-500";
      case "URGENT":
        return "bg-red-500/20 text-red-500";
      default:
        return "bg-gray-500/20 text-gray-500";
    }
  };

  const handlePageChange = (page: number) => {
    if (pagination && page >= 1 && page <= pagination.totalPages) {
      setCurrentPage(page);
    }
  };

  const handleExportExcel = async (
    exportStatus:  "ALL" |"OPEN" | "IN_PROGRESS" | "CLOSED" 
  ) => {
    if (!token) {
      toast.error("You are not logged in");
      return;
    }

    try {
      setShowExportDropdown(false);
      setIsExporting(true);
      const exportQuery =
        exportStatus === "ALL" ? "" : `?status=${exportStatus}`;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/ticket/export/excel${exportQuery}`,
        {
          method: "GET",
          headers: {
            token,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.[0]?.msg || "Failed to export tickets");
      }

      const blob = await response.blob();
      const timestamp = new Date()
        .toLocaleString("en-US", { hour12: false })
        .replace(/[/:, ]/g, "-");

      const fileUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = `support-tickets-${exportStatus === "ALL" ? "all-statuses" : exportStatus.toLowerCase()}-${timestamp}.xlsx`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(fileUrl);
      document.body.removeChild(link);

      toast.success("Tickets exported successfully");
    } catch (error: any) {
      console.error("Ticket export failed:", error);
      toast.error(error?.message || "Failed to export tickets");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8 min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Support Tickets</h1>
            <p className="text-gray-400">Create and manage support tickets</p>
          </div>

          <div className="flex gap-4">
            <Can I="manage" a="Ticket">
              <div className="relative" ref={exportDropdownRef}>
                <Button
                  onClick={() => setShowExportDropdown((prev) => !prev)}
                  disabled={isExporting || loading || tickets.length === 0}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                </Button>

                {showExportDropdown && !isExporting && (
                  <div className="absolute right-0 mt-2 w-52 rounded-md border border-gray-700 bg-gray-900 shadow-xl z-20">
                    {[
                      { label: "Open", value: "OPEN" },
                      { label: "In Progress", value: "IN_PROGRESS" },
                      { label: "Closed", value: "CLOSED" },
                      { label: "All", value: "ALL" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() =>
                          handleExportExcel(
                            option.value as
                              | "ALL"
                              | "OPEN"
                              | "IN_PROGRESS"
                              | "CLOSED"
                             
                          )
                        }
                        className="block w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-800"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Can>

            <Can I="create" a="Ticket">
              <Button
                onClick={() => setOpenCreateModal(true)}
                className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors"
              >
                {/* @ts-ignore */}
                <HiPlus className="mr-2" /> Create Ticket
              </Button>
            </Can>

            <Can I="read" a="TicketCategory">
              <button
                onClick={() => router.push(`/support/categories`)} // You may change the route if needed
                className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md flex items-center transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5h6M9 3h6a2 2 0 012 2v2H7V5a2 2 0 012-2zm3 7h4m-4 4h4m-4 4h4m-6 0H7m0-4h2m-2-4h2"
                  />
                </svg>
                Categories
              </button>
            </Can>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div className="flex space-x-2 border-b border-gray-700 overflow-x-auto pb-2 w-full md:w-auto">
              {["OPEN", "IN_PROGRESS", "CLOSED"].map((status) => (
                <button
                  key={status}
                  onClick={() =>
                    setActiveTab(status as "OPEN" | "IN_PROGRESS" | "CLOSED")
                  }
                  className={`px-4 py-2 rounded-t-md ${
                    activeTab === status
                      ? "bg-gray-800 text-gold-500 border-b-2 border-gold-500"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {status.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden shadow-lg">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              {/* @ts-ignore */}
              <HiOutlineExclamationCircle className="mx-auto h-12 w-12 mb-4" />
              <h3 className="text-lg font-medium">No tickets found</h3>
              <p className="mt-2 text-sm">
                {`No ${activeTab.toLowerCase()} tickets at the moment`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="w-20 px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="w-72 px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="w-48 px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="w-32 px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="w-32 px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                     <th className="w-32 px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Date Planned
                    </th>
                    <th className="w-40 px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="w-24 px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-800/50">
                      <td className="w-20 px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">
                          #{ticket.id}
                        </div>
                      </td>
                      <td className="w-72 px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">
                          {ticket.title}
                        </div>
                        <div className="text-xs text-gray-400 truncate max-w-[200px]">
                          {ticket.description}
                        </div>
                      </td>
                      <td className="w-48 px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {ticket.category.name}
                        </div>
                      </td>
                      <td className="w-32 px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityBadgeClass(ticket.priority)}`}
                        >
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="w-32 px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(ticket.status)}`}
                        >
                          {formatStatus(ticket.status || "")}
                        </span>
                      </td>
                      <td className="w-32 px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {ticket.datePlanned
                          ? formatDateAndTime(ticket.datePlanned, true)
                          : "-"}
                      </td>
                      <td className="w-40 px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatDateAndTime(ticket.createdAt, true)}
                      </td>
                      <td className="w-24 px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => router.push(`/support/${ticket.id}`)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {pagination && (
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            isLoading={loading}
            onPageChange={handlePageChange}
          />
        )}
        <Modal
          show={openCreateModal}
          onClose={() => setOpenCreateModal(false)}
          size="3xl"
        >
          <Modal.Header className="bg-gray-800 border-b border-gray-700">
            <span className="text-gold-500 font-semibold">
              Create New Ticket
            </span>
          </Modal.Header>
          <Modal.Body className="bg-gray-800 p-6 overflow-y-auto max-h-[calc(90vh-10rem)]">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title
                </label>
                <TextInput
                  placeholder="Enter ticket title"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="bg-gray-700 border-gray-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <Textarea
                  placeholder="Describe your issue in detail"
                  rows={4}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="bg-gray-700 border-gray-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category
                  </label>
                  <Select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="bg-gray-700 border-gray-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                  >
                    <option value={""}>Select a category</option>
                    {ticketCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Priority
                  </label>
                  <Select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value })
                    }
                    className="bg-gray-700 border-gray-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Date *
                  </label>
                  <TextInput
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="bg-gray-700 border-gray-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Attachments (Max 3 images)
                </label>
                <FileInput
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 3) {
                      toast.warning(
                        "Maximum 3 files allowed. Only first 3 files will be used."
                      );
                    }
                    setFormData({
                      ...formData,
                      images: files.slice(0, 3),
                    });
                  }}
                  className="bg-gray-700 border-gray-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                />
                <p className="mt-2 text-sm text-gray-400">
                  {formData.images.length}/3 files selected
                </p>

                <div className="flex gap-2 mt-4">
                  {formData.images.slice(0, 3).map((file, index) => (
                    <div key={index} className="relative w-20 h-20 group">
                      <Image
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="object-cover rounded-lg"
                        width={80}
                        height={80}
                      />
                      <button
                        onClick={() => {
                          setFormData({
                            ...formData,
                            images: formData.images.filter(
                              (_, i) => i !== index
                            ),
                          });
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 
                                 text-white opacity-0 group-hover:opacity-100 transition-opacity 
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                        type="button"
                        disabled={isSubmitting}
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className="bg-gray-800 border-t border-gray-700">
            <Button
              onClick={handleCreateTicket}
              className="bg-gold-500 hover:bg-gold-600 text-black disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black animate-spin rounded-full" />
                  Submitting...
                </div>
              ) : (
                "Submit Ticket"
              )}
            </Button>
            <Button
              color="gray"
              onClick={() => setOpenCreateModal(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </>
  );
}
