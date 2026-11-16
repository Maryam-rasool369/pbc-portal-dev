import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import useAuthStore from "@/store/authStore";
import { Button, Badge, Spinner, Select, Tabs, TabItem } from "flowbite-react";
import {
  HiStar,
  HiCheckCircle,
  HiXCircle,
  HiClock,
  HiExternalLink,
  HiOutlineStar,
  HiPencil,
  HiShieldCheck,
} from "react-icons/hi";
import {
  fetchAnnualSponsors,
  createAnnualSponsorPayment,
  getActiveAnnualSponsorshipPackage,
  AnnualSponsor,
  AnnualSponsorshipPackage,
} from "@/services/annualSponsor";
import AnnualSponsorModal from "@/components/annualSponsor/AnnualSponsorModal";
import EditPackageModal from "@/components/annualSponsor/EditPackageModal";
import ApprovalModal from "@/components/annualSponsor/ApprovalModal";
import Can from "@/components/rbac/Can";

import VatBreakdown from "@/components/ui/VatBreakdown";
import AnnualSponsorshipPackagesTab from "@/components/annualSponsor/AnnualSponsorshipPackagesTab";
import { useAbility } from "@/hooks/useAbility";

export default function AnnualSponsorPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const ability = useAbility();
  const [loading, setLoading] = useState(true);
  const [sponsor, setSponsor] = useState<AnnualSponsor | null>(null);
  const [allSponsors, setAllSponsors] = useState<AnnualSponsor[]>([]);
  const [packageData, setPackageData] = useState<AnnualSponsorshipPackage | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditPackageModal, setShowEditPackageModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [pendingSponsors, setPendingSponsors] = useState<AnnualSponsor[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<"PENDING" | "REJECTED">("PENDING");
  const [loadingPending, setLoadingPending] = useState(false);
  const [selectedSponsorForApproval, setSelectedSponsorForApproval] = useState<AnnualSponsor | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  useEffect(() => {
    if (!token || token === "undefined" || !user) {
      router.push("/");
      return;
    }
    fetchData();
  }, [token, user]);

  useEffect(() => {
    const { sponsorPaymentSuccess } = router.query;
    if (sponsorPaymentSuccess === "true") {
      toast.success("Payment successful! Your annual sponsorship is now active.");
      router.replace("/annual-sponsor", undefined, { shallow: true });
    } else if (sponsorPaymentSuccess === "false") {
      toast.info("Payment was cancelled. You can try again when ready.");
      router.replace("/annual-sponsor", undefined, { shallow: true });
    }
  }, [router.query]);

  const fetchData = async () => {
    if (!token || token === "undefined") return;

    setLoading(true);
    try {
      // Fetch approved sponsors only for the public list
      const sponsorsData = await fetchAnnualSponsors(token, 1, 100, undefined, "APPROVED");
      setAllSponsors(sponsorsData.data || []);
      
      // Fetch user's own sponsor (any approval status)
      const userSponsorsData = await fetchAnnualSponsors(token, 1, 100);
      const userSponsor = userSponsorsData.data.find(
        (s) => {
          if (s.userId !== Number(user?.id)) return false;
          if (!s.expiresAt) return true;
          return new Date(s.expiresAt) > new Date();
        }
      );
      setSponsor(userSponsor || null);

      if (userSponsor?.package) {
        setPackageData(userSponsor.package as any);
      } else {
        const activePackage = await getActiveAnnualSponsorshipPackage(token);
        setPackageData(activePackage);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load annual sponsorship data"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingSponsors = async () => {
    if (!token || token === "undefined") return;

    setLoadingPending(true);
    try {
      const data = await fetchAnnualSponsors(token, 1, 100, undefined, approvalFilter);
      setPendingSponsors(data.data || []);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load pending sponsors"
      );
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    if (token && token !== "undefined") {
      fetchPendingSponsors();
    }
  }, [approvalFilter, token]);

  const handleCreateSponsor = () => {
    setShowModal(true);
  };

  const handlePayment = async () => {
    if (!sponsor || !token) return;

    // Check if sponsor is approved
    if (sponsor.approvalStatus !== "APPROVED") {
      toast.error("Payment is only available for approved sponsors");
      return;
    }

    setProcessingPayment(true);
    try {
      const response = await createAnnualSponsorPayment(token, sponsor.id);
      if (response.data.paymentReference) {
        // Redirect to Stripe checkout
        window.location.href = response.data.paymentReference;
      } else {
        toast.error("Failed to create payment session");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to initiate payment"
      );
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleSponsorClick = (sponsor: AnnualSponsor) => {
    setSelectedSponsorForApproval(sponsor);
    setShowApprovalModal(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge color="success" icon={HiCheckCircle as any}>
            Completed
          </Badge>
        );
      case "PENDING":
        return (
          <Badge color="warning" icon={HiClock as any}>
            Pending Payment
          </Badge>
        );
      case "FAILED":
        return (
          <Badge color="failure" icon={HiXCircle as any}>
            Failed
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getApprovalStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge color="success" icon={HiCheckCircle as any}>
            Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge color="failure" icon={HiXCircle as any}>
            Rejected
          </Badge>
        );
      case "PENDING":
        return (
          <Badge color="warning" icon={HiClock as any}>
            Pending Approval
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <Tabs aria-label="Annual Sponsor Tabs" className="w-full">
        <TabItem active title="Overview">
          <div className="mt-6 w-full">
            {/* Become a Sponsor CTA */}
            {!sponsor && (
              <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 rounded-xl shadow-xl p-10 mb-6 border border-gray-700 text-center relative overflow-hidden">
                {/* Decorative glow */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute -top-16 -left-16 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl" />
                  <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10">
                  {/* @ts-ignore */}
                  <HiStar className="mx-auto h-12 w-12 text-gold-400 mb-4" />
                  <h2 className="text-3xl font-bold text-white mb-3">
                    Become an Annual Sponsor
                  </h2>
                  <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
                    Support our community and grow your brand. Choose from our available sponsorship packages after clicking below.
                  </p>
                  <div className="flex justify-center">
                    <Button
                      onClick={handleCreateSponsor}
                      className="bg-gold-600 hover:bg-gold-500 text-white px-10 py-3 text-lg font-semibold shadow-lg shadow-gold-900/30 transition-all duration-200"
                      size="lg"
                    >
                      Get Started
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Admin – Edit Package (compact, tucked away) */}
            <Can I="manage" a="AnnualSponsorship">
              <div className="flex justify-end mb-6">
                <Button
                  onClick={() => setShowEditPackageModal(true)}
                  color="dark"
                  size="sm"
                  className="border border-gray-600 hover:border-gold-500 text-gray-300 hover:text-gold-400 transition-colors"
                >
                  {/* @ts-ignore */}
                  <HiPencil className="mr-2 h-4 w-4" />
                  Edit Package
                </Button>
              </div>
            </Can>


      {/* User's Sponsorship Section */}
      {sponsor && (
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-700">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                Your Annual Sponsorship
              </h2>
              <div className="flex gap-2">
                {getStatusBadge(sponsor.status)}
                {getApprovalStatusBadge(sponsor.approvalStatus)}
              </div>
            </div>
            {(sponsor.status === "PENDING" || sponsor.status === "FAILED") && sponsor.approvalStatus === "APPROVED" && (
              <Button
                onClick={handlePayment}
                className="bg-gold-600 hover:bg-gold-700 text-white"
                disabled={processingPayment}
              >
                {processingPayment ? "Processing..." : "Complete Payment"}
              </Button>
            )}
            {sponsor.approvalStatus === "PENDING" && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Your sponsorship is awaiting approval. Payment will be available once approved.
                </p>
              </div>
            )}
            {sponsor.approvalStatus === "REJECTED" && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-800 dark:text-red-200">
                  Your sponsorship request has been rejected.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gold-500 mb-4">
                Sponsor Information
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400">Brand Name</p>
                  <p className="text-white font-medium">{sponsor.brandName}</p>
                </div>
                {sponsor.brandDescription && (
                  <div>
                    <p className="text-sm text-gray-400">Description</p>
                    <p className="text-gray-300">{sponsor.brandDescription}</p>
                  </div>
                )}
                {sponsor.brandWebsite && (
                  <div>
                    <p className="text-sm text-gray-400">Website</p>
                    <a
                      href={sponsor.brandWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold-400 hover:text-gold-300 flex items-center"
                    >
                      {sponsor.brandWebsite}
                      {/* @ts-ignore */}
                      <HiExternalLink className="ml-1 h-4 w-4" />
                    </a>
                  </div>
                )}
                {sponsor.brandLogo && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Logo</p>
                    <img
                      src={sponsor.brandLogo}
                      alt={sponsor.brandName}
                      className="h-24 w-24 object-contain rounded-lg bg-white p-2"
                    />
                  </div>
                )}
                {sponsor.expiresAt && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="flex items-center space-x-2 mb-2">
                      {/* @ts-ignore */}
                      <HiClock className="h-5 w-5 text-gold-500" />
                      <p className="text-sm font-medium text-gold-500">
                        Sponsorship Expiry
                      </p>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-3 border border-gold-500/20">
                      <p className="text-white font-semibold text-lg">
                        {new Date(sponsor.expiresAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {(() => {
                          const daysLeft = Math.ceil(
                            (new Date(sponsor.expiresAt).getTime() - new Date().getTime()) /
                            (1000 * 60 * 60 * 24)
                          );
                          if (daysLeft > 0) {
                            return `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`;
                          }
                          return "Expired";
                        })()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gold-500 mb-4">
                Package Details
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400">Package Name</p>
                  <p className="text-white font-medium">{sponsor.package.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Price</p>
                  <div className="mt-2">
                    <VatBreakdown
                      baseAmount={sponsor.package.price}
                      vatPercentage={sponsor.vatPercentage ?? null}
                      vatAmount={sponsor.vatAmount ?? null}
                      totalAmount={sponsor.totalAmount ?? null}
                      compact
                    />
                    <p className="text-xs text-gray-400 mt-2">Per year</p>
                  </div>
                </div>
                {sponsor.package.description && (
                  <div>
                    <p className="text-sm text-gray-400">Description</p>
                    <p className="text-gray-300">{sponsor.package.description}</p>
                  </div>
                )}
                {sponsor.package.benefits && sponsor.package.benefits.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Benefits</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-300">
                      {sponsor.package.benefits.map((benefit, index) => (
                        <li key={index}>{benefit}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-sm text-gray-400">
              Created: {new Date(sponsor.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {/* Admin Section - Pending/Rejected Sponsors */}
      <Can I="approve" a="AnnualSponsorship">
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gold-500 flex items-center">
              {/* @ts-ignore */}
              <HiShieldCheck className="mr-2" />
              Sponsor Approval Management
            </h2>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-300">Filter by Status:</label>
              <Select
                value={approvalFilter}
                onChange={(e) => setApprovalFilter(e.target.value as "PENDING" | "REJECTED")}
                className="w-40"
              >
                <option value="PENDING">Pending</option>
                <option value="REJECTED">Rejected</option>
                <option value="APPROVED">Approved</option>
              </Select>
            </div>
          </div>
          
          {loadingPending ? (
            <div className="flex justify-center items-center py-12">
              <Spinner size="xl" />
            </div>
          ) : pendingSponsors.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">
                No {approvalFilter.toLowerCase()} sponsors found
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingSponsors.map((sponsorItem) => (
                <div
                  key={sponsorItem.id}
                  onClick={() => handleSponsorClick(sponsorItem)}
                  className="bg-gray-700 rounded-lg border border-gray-600 p-6 hover:border-gold-400 transition-colors cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">
                        {sponsorItem.brandName}
                      </h3>
                      <div className="flex flex-col gap-2">
                        {getApprovalStatusBadge(sponsorItem.approvalStatus)}
                        {getStatusBadge(sponsorItem.status)}
                      </div>
                    </div>
                    {sponsorItem.brandLogo && (
                      <img
                        src={sponsorItem.brandLogo}
                        alt={sponsorItem.brandName}
                        className="h-16 w-16 object-contain rounded-lg bg-white p-2 ml-3"
                      />
                    )}
                  </div>
                  {sponsorItem.brandDescription && (
                    <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                      {sponsorItem.brandDescription}
                    </p>
                  )}
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <p className="text-xs text-gray-400">
                      Submitted by: {sponsorItem.user.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(sponsorItem.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Can>

      {/* All Annual Sponsors Section - Visible to all users */}
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-gold-500 mb-6 flex items-center">
          {/* @ts-ignore */}
          <HiOutlineStar className="mr-2" />
          All Annual Sponsors
        </h2>
        {allSponsors.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">
              No annual sponsors found yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allSponsors
              .filter((sponsorItem) => {
                if (sponsorItem.status !== "COMPLETED") return false;
                if (!sponsorItem.expiresAt) return true;
                return new Date(sponsorItem.expiresAt) > new Date();
              })
              .map((sponsorItem) => {
                const isCurrentUser = user?.id && sponsorItem.userId === Number(user.id);
                return (
                  <div
                    key={sponsorItem.id}
                    className="bg-gray-700 rounded-lg border border-gray-600 p-6 hover:border-gold-400 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white mb-2">
                          {sponsorItem.brandName}
                        </h3>
                        {getStatusBadge(sponsorItem.status)}
                      </div>
                      {sponsorItem.brandLogo && (
                        <img
                          src={sponsorItem.brandLogo}
                          alt={sponsorItem.brandName}
                          className="h-16 w-16 object-contain rounded-lg bg-white p-2 ml-3"
                        />
                      )}
                    </div>
                    {sponsorItem.brandDescription && (
                      <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                        {sponsorItem.brandDescription}
                      </p>
                    )}
                    {sponsorItem.brandWebsite && (
                      <a
                        href={sponsorItem.brandWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gold-400 hover:text-gold-300 text-sm flex items-center"
                      >
                        {sponsorItem.brandWebsite}
                        {/* @ts-ignore */}
                        <HiExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    )}
                    {sponsorItem.expiresAt && (
                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <div className="flex items-center space-x-2 mb-1">
                          {/* @ts-ignore */}
                          <HiClock className="h-4 w-4 text-gold-500" />
                          <p className="text-xs font-medium text-gold-500">
                            Expires
                          </p>
                        </div>
                        <p className="text-white text-sm font-medium">
                          {new Date(sponsorItem.expiresAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {(() => {
                            const daysLeft = Math.ceil(
                              (new Date(sponsorItem.expiresAt).getTime() - new Date().getTime()) /
                              (1000 * 60 * 60 * 24)
                            );
                            if (daysLeft > 0) {
                              return `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`;
                            }
                            return "Expired";
                          })()}
                        </p>
                      </div>
                    )}
                    {isCurrentUser && (
                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <p className="text-xs text-gold-400">Your Sponsorship</p>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <AnnualSponsorModal
        showModal={showModal}
        setShowModal={setShowModal}
        token={token || ""}
        onSuccess={fetchData}
      />

      {packageData && (
        <EditPackageModal
          showModal={showEditPackageModal}
          setShowModal={setShowEditPackageModal}
          token={token || ""}
          packageData={packageData}
          onSuccess={fetchData}
        />
      )}

      <ApprovalModal
        showModal={showApprovalModal}
        setShowModal={setShowApprovalModal}
        sponsor={selectedSponsorForApproval}
        token={token || ""}
        onSuccess={() => {
          fetchData();
          fetchPendingSponsors();
        }}
      />
          </div>
        </TabItem>

        {/* @ts-ignore */}
        {ability?.can("manage", "SponsorshipPackage") && (
          <TabItem title="Sponsorship Packages">
            <div className="mt-6">
              <AnnualSponsorshipPackagesTab token={token || ""} />
            </div>
          </TabItem>
        )}
      </Tabs>
    </div>
  );
}

