"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAuthStore from "@/store/authStore";
import { toast } from "react-toastify";
import { ArrowLeft, Shield, Check, X } from "lucide-react";
import { getAllProfiles, updateRolePermission } from "@/services/superUser";
import { PermissionsBySubject } from "@/types/superUser";
import { Roles } from "@/enums/Roles";
import { useAbility } from "@/hooks/useAbility";

export default function EditRolePermissions() {
    const router = useRouter();
    const { id } = router.query;
    const token = useAuthStore((state) => state.token);
    const user = useAuthStore((state) => state.user);
    const queryClient = useQueryClient();
    const ability = useAbility();

    const filteredSubjects = ["User", "Search", "RolePermission","Address","Vote","JobApplication","Role","MembershipRegistration","TicketResponse", "Cart"
    ];
    
    // Mapping object to remap subject names for display
    const subjectDisplayNames: Record<string, string> = {
        // "Order": "Order History",
        "Membership": "Memberships",
        "MembershipPlan": "Membership Plans",
        "MembershipCategory": "Membership Categories",
        "MembershipSubCategory": "Membership Sub Categories",
        "JobPost": "Job Posts",
        "JobCategory": "Job Categories",
        "JobSkill": "Job Skills",
        "Expense": "Expenses",
        "ExpenseCategory": "Expense Categories",
        "Event": "Events",
        "EventActionPoint": "Event Action Points",
        "Ticket": "Tickets",
        "TicketCategory": "Ticket Categories",
        "Task": "Tasks",
        "Tenure": "Tenure",
        "Election": "Elections",
        "Initiative": "Initiatives",
        "Constitution": "Constitutions",
        "RoleTransmission": "Role Transitions",
        "SoftDeleteRequest": "Soft Deletions",
        "UserRejection": "User Rejections",
        "Logs": "Logs",
        "Lead": "Leads",
        "Product": "Products",
        "Category": "Categories",
        "Discount": "Discounts",
        "Order": "Orders",
        "Wishlist": "Wishlists",
        // "Cart": "Carts",
        "Quote": "Quotes",
        "RFQ": "RFQs",
        "Organization": "Organizations",
        "Attendance": "Attendances",
        "Transaction": "Expenses",
        "TransactionCategory": "Expense Categories",
        "ConstitutionApproval": "Constitution Approvals",
        "MembershipApproval": "Membership Approvals",
        "EventApproval": "Event MOM Approvals",
        "EventSponsorship": "Event Sponsors",
        "EventSponsorshipPackage": "Event Sponsorship Packages",
        "AnnualSponsorship": "Annual Sponsorship",
        "Chat": "Chats",
        "Commiittee": "Committees",
        "SubCommittee": "Sub Committee",
        "CommitteeMeeting": "Committee Meeting",
        "Newsletter": "News letter",
        "DirectorAnalytics": "Board Members",
        "ServiceCategory": "Service Categories",
    };
    
    const getSubjectDisplayName = (subject: string): string => {
        return subjectDisplayNames[subject] || subject;
    };
    
    const [permissions, setPermissions] = useState<PermissionsBySubject>({});
    const [roleName, setRoleName] = useState<string>("");

    const { data, isLoading: isFetching, error } = useQuery({
        queryKey: ["rolePermissions", id],
        queryFn: () => getAllProfiles(token || "", id as string),
        enabled: !!token && !!id,
        staleTime: 5 * 60 * 1000,
    });

    const updatePermissionMutation = useMutation({
        mutationFn: ({ action, subject, permission }: { action: string; subject: string; permission: string }) =>
            updateRolePermission(token || "", id as string, action, subject, permission),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["rolePermissions", id] });
            toast.success("Permission updated successfully");
        },
        onError: (error: any) => {
            // Refetch to revert the optimistic update to the real DB state
            queryClient.invalidateQueries({ queryKey: ["rolePermissions", id] });
            toast.error(error.message || "Failed to update permission");
        },
    });

    useEffect(() => {
        if (user && !ability?.can("manage", "all")) {
            toast.error("Access denied. This page is restricted to certain users only.");
            router.push("/");
            return;
        }
    }, [user, router]);

    useEffect(() => {
        if (data?.data) {
            setPermissions(data.data.permissionsBySubject);
            setRoleName(data.data.roleName);
        }
    }, [data]);

    const handlePermissionChange = async (subject: string, action: string, currentPermission: string) => {
        const newPermission = currentPermission === "can" ? "cannot" : "can";
        setPermissions(prev => ({
            ...prev,
            [subject]: {
                ...prev[subject],
                [action]: newPermission
            }
        }));
        updatePermissionMutation.mutate({
            action,
            subject,
            permission: newPermission
        });
    };

    const getPermissionIcon = (permission: string) => {
        return permission === "can" ? (
            <Check className="h-5 w-5 text-green-100 animate-pulse" />
        ) : (
            <X className="h-5 w-5 text-red-100"/>
        );
    };

    const getPermissionColor = (permission: string) => {
        return permission === "can"
            ? "bg-green-600 hover:bg-green-700"
            : "bg-red-600 hover:bg-red-700";
    };

    if (user && user.Role?.name !== Roles.SUPERUSER) {
        return null;
    }

    if (isFetching) {
        return (
            <div className="min-h-screen bg-gray-900 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
                    </div>
                </div>
            </div>
        );
    }
    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center text-red-400">
                        <p>Error loading permissions: {error.message}</p>
                        <button
                            onClick={() => router.back()}
                            className="mt-4 px-4 py-2 bg-gold-600 hover:bg-gold-700 text-gray-900 rounded-lg transition-colors"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const subjects = Object.keys(permissions)
        .filter(subject => !filteredSubjects.includes(subject))
        .sort((a, b) => getSubjectDisplayName(a).localeCompare(getSubjectDisplayName(b)));
    const actions = ["create", "read", "update", "delete", "manage", "approve"];
    return (
        <div className="min-h-screen bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center space-x-4 mb-4">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span>Back</span>
                        </button>
                        <div className="flex items-center space-x-3">
                            <Shield className="h-8 w-8 text-gold-500" />
                            <div>
                                <h1 className="text-3xl font-bold text-white">
                                    Edit Permissions - {roleName}
                                </h1>
                                <p className="text-gray-400">
                                    Manage permissions for this role
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">
                                        Subject
                                    </th>
                                    {actions.map((action) => (
                                        <th key={action} className="px-6 py-4 text-center text-sm font-medium text-gray-300 capitalize">
                                            {action}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {subjects.map((subject) => (
                                    <tr key={subject} className="hover:bg-gray-750 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-white">
                                            {getSubjectDisplayName(subject)}
                                        </td>
                                        {actions.map((action) => {
                                            const currentPermission = permissions[subject]?.[action as keyof typeof permissions[typeof subject]] || "cannot";
                                            return (
                                                <td key={action} className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handlePermissionChange(subject, action, currentPermission)}
                                                        disabled={updatePermissionMutation.isPending}
                                                        className={`
                              inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200
                              ${getPermissionColor(currentPermission)}
                              ${updatePermissionMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                              hover:scale-105 active:scale-95
                            `}
                                                        title={`${currentPermission === "can" ? "Disable" : "Enable"} ${action} permission for ${getSubjectDisplayName(subject)}`}
                                                    >
                                                        {getPermissionIcon(currentPermission)}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="mt-6 flex items-center justify-center space-x-8 text-sm">
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-green-600 rounded"></div>
                        <span className="text-gray-300">Allowed</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-red-600 rounded"></div>
                        <span className="text-gray-300">Denied</span>
                    </div>
                </div>
                <div className="mt-6 bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                        <Shield className="h-5 w-5 text-blue-400 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-medium text-blue-300 mb-1">
                                Permission Management
                            </h3>
                            <p className="text-sm text-blue-200">
                                Click on any permission button to toggle between &apos;can&apos; and &apos;cannot&apos;.
                                Changes are saved automatically. Green indicates allowed permissions,
                                red indicates denied permissions.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
