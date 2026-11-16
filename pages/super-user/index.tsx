"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";
import useAuthStore from "@/store/authStore";
import "react-toastify/dist/ReactToastify.css";
import { Users, Shield } from "lucide-react";
import RoleCard from "@/components/super-user/RoleCard";
import { getRoleStats } from "@/services/superUser";
import { RoleWithCount } from "@/types/superUser";
import { Roles } from "@/enums/Roles";
import { toast } from "react-toastify";
import { useAbility } from "@/hooks/useAbility";

export default function SuperUser() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [roles, setRoles] = useState<RoleWithCount[]>([]);
  const ability = useAbility();
  const { data, isLoading, error } = useQuery({
    queryKey: ["allRoles"],
    queryFn: () => getRoleStats(token || ""),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (user && !ability?.can("manage", "all")) {
      toast.error("Access denied. This page is restricted to certain users only.");
      router.push("/");
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (data?.data?.roleCounts) {
      const filteredRoles = data.data.roleCounts.filter(
        (role: RoleWithCount) => 
          role.name !== "Job Applicant" && 
          role.name !== "JobApplicant" &&
          !role.name.toLowerCase().includes("job applicant")
      );
      setRoles(filteredRoles);
    }
  }, [data]);

  const handleEditPermissions = (roleId: number, roleName: string) => {
    router.push(`/super-user/${roleId}`);
  };

  if (user && !ability?.can("manage", "all")) {
    return null;
  }

  if (isLoading) {
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
            <p>Error loading roles: {error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Shield className="h-8 w-8 text-gold-500" />
            <h1 className="text-3xl font-bold text-white">Super User Dashboard</h1>
          </div>
          <p className="text-gray-400">
            Manage roles and permissions across the platform
          </p>
        </div>

        {/* Stats Overview - 2 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-600 bg-opacity-20">
                <Shield className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Total Roles</p>
                <p className="text-2xl font-bold text-white">{data?.data?.totalRoles}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-600 bg-opacity-20">
                <Users className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-white">
                  {data?.data?.totalUsers}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.length > 0 ? (
            roles.map((role: RoleWithCount) => (
              <RoleCard
                key={role.id}
                role={role}
                onEditPermissions={handleEditPermissions}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-400">No role data available</p>
              <p className="text-sm text-gray-500 mt-2">
                Data: {JSON.stringify(roles)}
              </p>
            </div>
          )}
        </div>

        {roles.length === 0 && (
          <div className="text-center py-12">
            <Shield className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No Roles Found</h3>
            <p className="text-gray-500">
              There are no roles available at the moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}