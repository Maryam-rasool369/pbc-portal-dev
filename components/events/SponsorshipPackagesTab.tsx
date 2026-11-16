import SponsorshipPackageModal from "./SponsorshipPackageModal";
import Can from "@/components/rbac/Can";
import VatBreakdown from "@/components/ui/VatBreakdown";
import { useState, useEffect } from "react";
import { Button, Badge } from "flowbite-react";
import { toast } from "react-toastify";
import { HiOutlinePencil, HiOutlinePlus, HiOutlineTrash } from "react-icons/hi";

interface SponsorshipPackage {
  id: number;
  name: string;
  description?: string;
  price: number;
  benefits: string[];
  isActive: boolean;
  logo?: string;
  createdAt: string;
  updatedAt: string;
}

interface SponsorshipPackagesTabProps {
  token: string;
}

const SponsorshipPackagesTab: React.FC<SponsorshipPackagesTabProps> = ({
  token,
}) => {
  const [packages, setPackages] = useState<SponsorshipPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<SponsorshipPackage | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const fetchPackages = async () => {
    if (!token || token === "undefined") return;
    
    setLoading(true);
    try {
      let url = `${process.env.NEXT_PUBLIC_API_URL}/api/sponsorship-packages/?page=${currentPage}&limit=10`;
      if (statusFilter) {
        url += `&status=${statusFilter}`;
      }

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          token: token || "",
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.[0]?.msg || "Failed to fetch packages");
      }

      setPackages(data?.data || []);
      if (data?.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load sponsorship packages"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [currentPage, statusFilter, token]);

  const handleCreate = () => {
    setSelectedPackage(null);
    setShowModal(true);
  };

  const handleEdit = (pkg: SponsorshipPackage) => {
    setSelectedPackage(pkg);
    setShowModal(true);
  };

  const handleDelete = async (pkg: SponsorshipPackage) => {
    if (!token || token === "undefined") return;
    if (!confirm(`Are you sure you want to delete "${pkg.name}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/sponsorship-packages/${pkg.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            token: token || "",
          },
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.[0]?.msg || "Failed to delete package");
      }

      toast.success("Package deleted successfully");
      fetchPackages();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete package"
      );
    }
  };

  const handleToggleStatus = async (pkg: SponsorshipPackage) => {
    if (!token || token === "undefined") return;

    try {
      const newStatus = pkg.isActive ? "inActive" : "active";
      
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/sponsorship-packages/status/${pkg.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            token: token || "",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.[0]?.msg || "Failed to update status");
      }

      toast.success(`Package ${newStatus === "active" ? "activated" : "deactivated"} successfully`);
      fetchPackages();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update package status"
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">Sponsorship Packages</h2>
          <p className="text-gray-400 text-sm mt-1">
            Manage sponsorship packages for events
          </p>
        </div>

        <Can I="create" a="EventSponsorshipPackage">
          <Button
            size="sm"
            className="bg-gold-500 text-black hover:bg-gold-600"
            onClick={handleCreate}
          >
            
            <HiOutlinePlus className="mr-1 h-4 w-4" />
            Create Package
          </Button>
        </Can>
      </div>

      <div className="flex gap-4 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="bg-gray-700 text-white border border-gray-600 rounded-md px-4 py-2"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inActive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-400">Loading packages...</p>
        </div>
      ) : packages.length === 0 ? (
        <div className="text-center py-8 bg-gray-800 rounded-lg border border-gray-700">
          <p className="text-gray-400">No sponsorship packages found</p>
      
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-gold-400 transition-colors flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold text-white mb-2 break-words">{pkg.name}</h3>
                    {pkg.logo && (
                      <div className="mb-3">
                        <img
                          src={pkg.logo}
                          alt={pkg.name}
                          className="h-16 w-16 object-contain rounded-lg bg-white p-2"
                        />
                      </div>
                    )}
                  </div>
                  <Can I="manage" a="EventSponsorshipPackage">
                  <Badge
                    color={pkg.isActive ? "success" : "failure"}
                    className="cursor-pointer flex-shrink-0 ml-2"
                    onClick={() => handleToggleStatus(pkg)}
                  >
                    {pkg.isActive ? "Active" : "Inactive"}
                  </Badge>
                  </Can>
                </div>
                
                {pkg.description && (
                  <div className="mb-3 max-h-24 overflow-y-auto">
                    <p className="text-gray-300 text-sm break-words whitespace-pre-wrap">{pkg.description}</p>
                  </div>
                )}
                
                <div className="mb-4">
                  <VatBreakdown baseAmount={pkg.price} compact />
                </div>
                
                {pkg.benefits && pkg.benefits.length > 0 && (
                  <div className="mb-4 flex-1 min-h-0">
                    <h4 className="text-white font-medium text-sm mb-2">Benefits:</h4>
                    <div className="max-h-32 overflow-y-auto">
                      <ul className="list-disc list-inside text-gray-400 text-sm space-y-1">
                        {pkg.benefits.map((benefit, idx) => (
                          <li key={idx} className="break-words">{benefit}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-700">
                  <Can I="update" a="EventSponsorshipPackage">
                    <Button
                      size="sm"
                      color="dark"
                      onClick={() => handleEdit(pkg)}
                      className="flex-1"
                    >
                      <HiOutlinePencil className="mr-1 h-4 w-4" />
                      Edit
                    </Button>

                    <Button
                      size="sm"
                      color={pkg.isActive ? "failure" : "success"}
                      onClick={() => handleToggleStatus(pkg)}
                      className="flex-1"
                    >
                      {pkg.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </Can>

                  <Can I="delete" a="EventSponsorshipPackage">
                    <Button
                      size="sm"
                      color="failure"
                      onClick={() => handleDelete(pkg)}
                    >
                      <HiOutlineTrash className="h-4 w-4" />
                    </Button>
                  </Can>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <Button
                size="sm"
                color="dark"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
              >
                Previous
              </Button>
              <span className="text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                size="sm"
                color="dark"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages || loading}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <SponsorshipPackageModal
        showModal={showModal}
        setShowModal={setShowModal}
        token={token}
        packageData={selectedPackage}
        onSuccess={() => {
          setShowModal(false);
          setSelectedPackage(null);
          setTimeout(() => {
            fetchPackages();
          }, 500);
        }}
      />
    </div>
  );
};

export default SponsorshipPackagesTab;

