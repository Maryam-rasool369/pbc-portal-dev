import { Shield, Users, Edit3 } from "lucide-react";
import { RoleWithCount } from "@/types/superUser";
 
interface RoleCardProps {
  role: RoleWithCount;
  onEditPermissions: (roleId: number, roleName: string) => void;
}

export default function RoleCard({ role, onEditPermissions }: RoleCardProps) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 hover:border-gold-500 transition-all duration-300 hover:shadow-lg hover:shadow-gold-500/10">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 rounded-lg bg-gold-600 bg-opacity-20">
            <Shield className="h-5 w-5 text-gold-400"/>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              {role.name || "Unknown Role"}
            </h3>
            {!role.name && (
              <p className="text-xs text-red-400">Role name is missing</p>
            )}
          </div>
        </div>
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-400">Total Users</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {role.userCount || 0}
          </p>
        </div>

        <button
          onClick={() => onEditPermissions(role.id, role.name)}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gold-600 hover:bg-gold-700 text-gray-900 rounded-lg transition-colors font-medium"
        >
          <Edit3 className="h-4 w-4" />
          <span>Edit Permissions</span>
        </button>
      </div>
    </div>
  );
}
