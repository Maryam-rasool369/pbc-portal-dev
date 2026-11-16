import React, { useEffect, useState } from "react";
import Loading from "@/components/ui/Loading";
import Pagination from "@/components/common/Pagination";
import useAuthStore from "@/store/authStore";
import CategoryDetailsModal from "@/components/membershipPlan/CategoryDetailsModal";
import AddCategoryModal from "@/components/membershipPlan/AddCategoryModal";
import AddPlanModal from "@/components/membershipPlan/AddPlanModal";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import { Roles } from "@/enums/Roles";
import { EmptyStateMessage } from "@/components/ui/EmptyStateMessage";
import { HiCreditCard, HiPlus } from "react-icons/hi";
import { MembershipPlan, MembershipCategory } from "@/types/membershipPlan";
import { fetchMembershipPlans } from "@/services/membershipPlans";
import Can from "@/components/rbac/Can";
import CurrencyAmount from "@/components/ui/CurrencyAmount";

const MemberRoles = [Roles.CORPORATE, Roles.INDIVIDUAL];

type Pagination = {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
};

export default function MembershipPlans() {
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[] | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<MembershipCategory | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState<boolean>(false);
  const [isAddPlanModalOpen, setIsAddPlanModalOpen] = useState<boolean>(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const limit: number = 10;
  // Check if user has access to this page
  useEffect(() => {
    if (user && (MemberRoles.includes(user.Role?.name as Roles))) {
      toast.error("Access denied. You don't have permission to view this page.");
      router.push("/");
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (token && token !== "undefined" && user) {
      setIsAuthReady(true);
    }
  }, [token, user]);

  const fetchPlans = async () => {
    if (!isAuthReady) return;

    if (!token || token === "undefined" || !user) {
      router.push("/");
      return;
    }

    try {
      setLoadingMore(true);
      const response = await fetchMembershipPlans(token, currentPage, limit, filters.status);
      
      setMembershipPlans(response.data);
      if (response.pagination) {
        setPagination(response.pagination);
      }
    } catch (error: any) {
      if (isAuthReady) {
        console.error("Error fetching membership plans:", error);
        toast.error(error.message || "Error in fetching membership plans");
      }
    } finally {
      setLoadingMore(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthReady && token && token !== "undefined" && user) {
      fetchPlans();
    }
  }, [currentPage, isAuthReady, token, user, filters]);

  const handlePageChange = (page: number) => {
    if (pagination && page >= 1 && page <= pagination.totalPages) {
      setCurrentPage(page);
    }
  };

  const handleViewClick = (id: number) => {
    router.push(`/membership-plans/${id}`);
  };

  const handleCategoryClick = (category: MembershipCategory) => {
    setSelectedCategory(category);
    setIsCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setSelectedCategory(null);
  };

  const handleOpenAddCategoryModal = (planId: number) => {
    setSelectedPlanId(planId);
    setIsAddCategoryModalOpen(true);
  };

  const closeAddCategoryModal = () => {
    setIsAddCategoryModalOpen(false);
    setSelectedPlanId(null);
  };

  const openAddPlanModal = () => {
    setIsAddPlanModalOpen(true);
  };

  const closeAddPlanModal = () => {
    setIsAddPlanModalOpen(false);
  };

  const handleAddCategory = async (categoryData: any) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/membership-category/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          token: token || "",
        },
        body: JSON.stringify(categoryData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.[0]?.msg || "Failed to create category");
      }

      toast.success("Category created successfully. Please create at least one subcategory, otherwise users will not be able to use this category.");
      
      // Refresh the data to show the new category
      fetchPlans();
      
      return data;
    } catch (error: any) {
      console.error("Error creating category:", error);
      toast.error(error.message || "Failed to create category");
      throw error;
    }
  };

  const handleAddPlan = async (planData: any) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/membership-plan/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          token: token || "",
        },
        body: JSON.stringify(planData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.[0]?.msg || "Failed to create plan");
      }

      toast.success("Membership plan created successfully");
      
      // Refresh the data to show the new plan
      fetchPlans();
      
      return data;
    } catch (error: any) {
      console.error("Error creating plan:", error);
      toast.error(error.message || "Failed to create plan");
      throw error;
    }
  };

  // Filter Fields
  const filterFields = [
    {
      name: "status",
      label: "Status",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
    },
  ];

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount/100);
  };

  const formatInterval = (interval: number | string) => {
    const years = Number(interval) || 1;
    return `${years} ${years === 1 ? "Year" : "Years"}`;
  };

  return (
    <>
    
    <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Membership Plans
          </h2>
          <p className="text-gray-600 dark:text-gray-400">Membership Plans PBC Dubai</p>
        </div>
        
        <div className="flex space-x-2">
          <Can I="create" a="MembershipCategory">
          <button
            onClick={() => router.push("/membership-plans/category")}
            className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-gray-900 rounded-md text-sm transition-colors"
          >
            Manage Categories
          </button>
          </Can>
          <Can I="creat" a="MembershipCategory">
          <button
            onClick={() => router.push("/membership-plans/sub-category")}
            className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-gray-900 rounded-md text-sm transition-colors"
          >
            Manage Sub-Categories
          </button>
          </Can>
          <Can I="create" a="MembershipPlan">
          <button
            onClick={openAddPlanModal}
            className="inline-flex items-center px-4 py-2 bg-gold-500 hover:bg-gold-600 text-white rounded-md transition-colors"
          >
            {/* @ts-ignore */}
            <HiPlus className="mr-1.5 h-4 w-4" />
            Add Plan
          </button>
          </Can>
        </div>
      </div>

      {initialLoading ? (
        <div className="flex justify-center items-center">
          <Loading />
        </div>
      ) : membershipPlans && membershipPlans.length > 0 ? (
        <div className="flex flex-col mt-6">
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
                        Plan Name
                      </th>
                      <th
                        scope="col"
                        className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                      >
                        Price
                      </th>
                      <th
                        scope="col"
                        className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                      >
                        Description
                      </th>
                      <th
                        scope="col"
                        className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                      >
                        Interval
                      </th>
                      <th
                        scope="col"
                        className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                      >
                        Categories
                      </th>
                   
                      <th
                        scope="col"
                        className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                      >
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {membershipPlans.map((plan: MembershipPlan) => (
                      <tr key={plan.id}>
                        <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">
                          {plan.name}
                        </td>
                        <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                          {plan.currency?.toUpperCase() === "AED" ? (
                            <CurrencyAmount amount={plan.price/100} />
                          ) : (
                            formatCurrency(plan.price/100, plan.currency)
                          )}{" "}
                          (VAT excl.)
                        </td>
                        <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                          {plan.description}
                        </td>
                        <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatInterval(plan.interval)}
                        </td>
                        <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="space-y-2">
                            {plan.categories.length > 0 ? (
                              <div className="space-y-1">
                                {plan.categories.map((category) => (
                                  <button
                                    key={category.id}
                                    onClick={() => handleCategoryClick(category)}
                                    className="block text-left text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
                                  >
                                    {category.name}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">No categories</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                          <button
                            onClick={() => handleViewClick(plan.id)}
                            className="text-gold-500 hover:text-gold-700"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {pagination && (
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              isLoading={loadingMore}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      ) : (
        <EmptyStateMessage
          title="No Membership Plans Found"
          message="No membership plans found. Try changing your filter or check back later."
          icon={
            // @ts-ignore
            <HiCreditCard className="w-12 h-12 text-gold-500" />
          }
          showCreateButton={false}
        />
      )}
      
      
      <CategoryDetailsModal
        category={selectedCategory}
        isOpen={isCategoryModalOpen}
        onClose={closeCategoryModal}
      />
      
      <AddCategoryModal
        open={isAddCategoryModalOpen}
        onClose={closeAddCategoryModal}
        onSubmit={handleAddCategory}
        planId={selectedPlanId}
      />

      <AddPlanModal
        open={isAddPlanModalOpen}
        onClose={closeAddPlanModal}
        onSubmit={handleAddPlan}
      />
    </div>
    </>
  );
}
