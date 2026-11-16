import { useRouter } from "next/router";
import Loading from "@/components/ui/Loading";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import useAuthStore from "@/store/authStore";
import { MembershipPlan, MembershipCategory } from "@/types/membershipPlan";
import { getMembershipPlanById } from "@/services/membershipPlans";
import { fetchMembershipCategories, updateMembershipCategoryPlan } from "@/services/membershipCategories";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import CategoryDetailsModal from "@/components/membershipPlan/CategoryDetailsModal";
import EditPlanModal from "@/components/membershipPlan/EditPlanModal";
import Link from "next/link";
import Head from "next/head";
import { Roles } from "@/enums/Roles";
import {
  CreditCardIcon,
  CalendarIcon,
  TagIcon,
  UsersIcon,
  CheckCircleIcon,
  CurrencyIcon,
  EditIcon,
} from "lucide-react";
import CurrencyAmount from "@/components/ui/CurrencyAmount";
import DirhamSymbol from "@/components/ui/DirhamSymbol";

const MemberRoles = [Roles.CORPORATE, Roles.INDIVIDUAL];

export default function MembershipPlanDetail() {
  const [plan, setPlan] = useState<MembershipPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<MembershipCategory | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [isEditPlanModalOpen, setIsEditPlanModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<MembershipCategory[]>([]);
  const [selectedAddCategoryId, setSelectedAddCategoryId] = useState<number | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (user && (MemberRoles.includes(user.Role?.name as Roles))) {
      toast.error("Access denied. You don't have permission to view this page.");
      router.push("/");
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (!id || !token || !user) return;

    const fetchPlan = async () => {
      try {
        setLoading(true);
        const response = await getMembershipPlanById(token, Number(id));
        setPlan(response.data);
      } catch (error: any) {
        console.error("Error fetching plan:", error);
        toast.error(error.message || "Error fetching membership plan");
        router.push("/membership-plans");
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [id, token, user, router]);

  const handleCategoryClick = (category: MembershipCategory) => {
    setSelectedCategory(category);
    setIsCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setSelectedCategory(null);
  };

  const openEditPlanModal = () => {
    setIsEditPlanModalOpen(true);
  };

  const closeEditPlanModal = () => {
    setIsEditPlanModalOpen(false);
  };

  const handleDeletePlan = async () => {
    if (!plan || !token) return;
    setDeleting(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/membership-plan/${plan.id}`,
        { method: "DELETE", headers: { token } }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.[0]?.msg || "Failed to delete plan");
      }
      toast.success("Plan deleted successfully");
      router.push("/membership-plans");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete plan");
      setDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  const handleUpdatePlan = async (planData: any) => {
    if (!plan || !token) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/membership-plan/${plan.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          token: token,
        },
        body: JSON.stringify(planData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.[0]?.msg || "Failed to update plan");
      }

      toast.success("Plan updated successfully");
      
      // Update local plan data
      setPlan(prev => prev ? {...prev, ...planData} : null);
      
      closeEditPlanModal();
    } catch (error: any) {
      console.error("Error updating plan:", error);
      toast.error(error.message || "Failed to update plan");
      throw error;
    }
  };





  const handleUpdateCategory = async (categoryId: number, categoryData: any) => {
    if (!token) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/membership-category/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          token: token,
        },
        body: JSON.stringify(categoryData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.[0]?.msg || "Failed to update category");
      }

      // Update local category data
      if (plan) {
        const updatedCategories = plan.categories.map(category => 
          category.id === categoryId ? {...category, ...categoryData} : category
        );
        setPlan({...plan, categories: updatedCategories});
      }
    } catch (error: any) {
      console.error("Error updating category:", error);
      throw error;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount/100);
  };

  const renderCurrency = (currency: string) => {
    return currency?.toUpperCase() === "AED" ? (
      <DirhamSymbol
        className="inline-block h-[0.9em] w-[1.05em] align-[-0.08em]"
        title="UAE dirham"
      />
    ) : (
      currency.toUpperCase()
    );
  };

  const formatInterval = (interval: number | string) => {
    const years = Number(interval) || 1;
    return `${years} ${years === 1 ? "Year" : "Years"}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow text-center">
        <svg
          className="w-20 h-20 text-gray-400 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Plan Not Found
        </h2>
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-6">
          The membership plan you are looking for could not be found.
        </p>
        <button
          onClick={() => router.push("/membership-plans")}
          className="px-5 py-2.5 bg-gold-600 text-white rounded-lg hover:bg-gold-700 focus:ring-4 focus:ring-gold-300 transition"
        >
          Back to All Plans
        </button>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>PBC Dubai - Membership Plan Details</title>
        <meta name="description" content="View membership plan details and categories" />
      </Head>
      <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
        {/* Header with action buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b pb-6 dark:border-gray-700">
          <div className="flex items-start gap-4">
            <Link
              href="/membership-plans"
              className="text-gray-500 hover:text-gold-600 dark:text-gray-400 dark:hover:text-gold-500"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                {plan.name}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                  <div className="h-2 w-2 rounded-full mr-1.5 bg-blue-500"></div>
                  {formatInterval(plan.interval)}
                </span>
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                ID: {plan.id} • Created at: {formatDateAndTime(plan.createdAt, true)}
                {plan.updatedAt !== plan.createdAt && ` • Last Modified: ${formatDateAndTime(plan.updatedAt, true)}`}
              </p>
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={openEditPlanModal}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
            >
              <EditIcon className="h-4 w-4 mr-2" />
              Edit Plan
            </button>
            
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete Plan
              </button>
        
            <button
              onClick={() => router.push("/membership-plans")}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Back to Plans
            </button>
          </div>
        </div>

        {/* Plan Summary */}
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {plan.name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {plan.description}
              </p>
             
            </div>
            <div className="text-right">
          
              <span className="text-sm text-gray-500 dark:text-gray-400">
                per {formatInterval(plan.interval)}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <ul className="flex flex-wrap text-sm font-medium text-gray-600 dark:text-gray-300">
            {[
              {
                key: "overview",
                label: "Plan Overview",
                icon: CreditCardIcon,
              },
              {
                key: "categories",
                label: `Categories (${plan.categories.length})`,
                icon: UsersIcon,
              },
              {
                key: "details",
                label: "Additional Details",
                icon: TagIcon,
              },
            ].map(({ key, label, icon: Icon }) => (
              <li key={key}>
                <button
                  onClick={() => setActiveTab(key)}
                  className={`inline-flex items-center gap-2 p-3 border-b-2 ${
                    activeTab === key
                      ? "text-gold-600 border-gold-600 dark:text-gold-500 dark:border-gold-500"
                      : "border-transparent hover:text-gray-700 hover:border-gray-300 dark:hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Tab Content */}
        <div className="mb-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <CurrencyIcon className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
                    Pricing Information
                  </h5>
                  <div className="space-y-4">
                    <div>
                      <h6 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Price
                      </h6>
                      <p className="text-2xl font-bold text-gold-600 dark:text-gold-400">
                        {plan.currency?.toUpperCase() === "AED" ? (
                          <CurrencyAmount amount={plan.price/100} />
                        ) : (
                          formatCurrency(plan.price/100, plan.currency)
                        )}{" "}
                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">VAT excl.</span>
                      </p>
                    </div>
                    <div>
                      <h6 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Billing Interval
                      </h6>
                      <p className="text-base font-medium text-gray-900 dark:text-white capitalize">
                        {formatInterval(plan.interval)}
                      </p>
                    </div>
                    <div>
                      <h6 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Currency
                      </h6>
                      <p className="text-base font-medium text-gray-900 dark:text-white">
                        {renderCurrency(plan.currency)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <CalendarIcon className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
                    Plan Details
                  </h5>
                  <div className="space-y-4">
                    <div>
                      <h6 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Plan Name
                      </h6>
                      <p className="text-base font-medium text-gray-900 dark:text-white">
                        {plan.name}
                      </p>
                    </div>
                    <div>
                      <h6 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Description
                      </h6>
                      <p className="text-base text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                        {plan.description || "No description provided"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <CheckCircleIcon className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
                  Plan Summary
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gold-600 dark:text-gold-400">
                      {plan.categories.length}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Categories
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {formatInterval(plan.interval)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Billing Cycle
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {renderCurrency(plan.currency)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Currency
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "categories" && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h5 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <UsersIcon className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
                    Membership Categories
                  </h5>
              
                </div>
                
                {plan.categories.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {plan.categories.map((category) => (
                      <div
                        key={category.id}
                        className="p-4 border border-gray-200 rounded-lg dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer bg-gray-50 dark:bg-gray-700"
                        onClick={() => handleCategoryClick(category)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {category.name}
                          </h4>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {category.description || "No description available"}
                        </p>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {category.id}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      ></path>
                    </svg>
                    <h3 className="mt-2 text-base font-medium text-gray-900 dark:text-white">
                      No categories assigned
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      This plan doesn&apos;t have any membership categories assigned yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "details" && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <TagIcon className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
                  Plan Information
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h6 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Created At
                    </h6>
                    <p className="text-base font-medium text-gray-900 dark:text-white">
                      {formatDateAndTime(plan.createdAt)}
                    </p>
                  </div>
                  <div>
                    <h6 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Last Updated
                    </h6>
                    <p className="text-base font-medium text-gray-900 dark:text-white">
                      {formatDateAndTime(plan.updatedAt)}
                    </p>
                  </div>
                  <div>
                    <h6 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Plan ID
                    </h6>
                    <p className="text-base font-medium text-gray-900 dark:text-white">
                      {plan.id}
                    </p>
                  </div>
                  <div>
                    <h6 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Status
                    </h6>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      <div className="h-2 w-2 rounded-full mr-1.5 bg-green-500"></div>
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <CategoryDetailsModal
        category={selectedCategory}
        isOpen={isCategoryModalOpen}
        onClose={closeCategoryModal}
        onEdit={handleUpdateCategory}
        token={token || ""}
      />

      <EditPlanModal
        plan={plan}
        open={isEditPlanModalOpen}
        onClose={closeEditPlanModal}
        onSubmit={handleUpdatePlan}
      />

      {isAddCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add Existing Category
            </h3>
            {loadingCategories ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500" />
              </div>
            ) : availableCategories.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                No unassigned categories available.
              </p>
            ) : (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select a category
                </label>
                <select
                  value={selectedAddCategoryId ?? ""}
                  onChange={(e) => setSelectedAddCategoryId(Number(e.target.value))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                >
                  <option value="">-- Choose a category --</option>
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsAddCategoryModalOpen(false)}
                disabled={addingCategory}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Cancel
              </button>
            
            </div>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Membership Plan
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to delete <span className="font-medium text-gray-900 dark:text-white">{plan.name}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePlan}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
