import { Modal, Button, Label, TextInput, Textarea, FileInput, Select } from "flowbite-react";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import VatBreakdown from "@/components/ui/VatBreakdown";

interface SponsorModalProps {
  showSponsorModal: boolean;
  setShowSponsorModal: (value: boolean) => void;
  eventId: string;
  token: string;
  onSuccess?: () => void;
  editMode?: boolean;
  sponsorData?: {
    id: number;
    brandName?: string;
    brandDescription?: string;
    brandWebsite?: string;
    brandLogo?: string;
    packageId?: number;
    approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
  } | null;
}

interface SponsorshipPackage {
  id: number;
  name: string;
  description?: string;
  price: number;
  benefits: string[];
  isActive: boolean;
}

const SponsorModal: React.FC<SponsorModalProps> = ({
  showSponsorModal,
  setShowSponsorModal,
  eventId,
  token,
  onSuccess,
  editMode = false,
  sponsorData = null,
}) => {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [packageId, setPackageId] = useState<string>("");
  const [packages, setPackages] = useState<SponsorshipPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [createdSponsorId, setCreatedSponsorId] = useState<number | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    if (showSponsorModal) {
      fetchPackages();
      setShowSuccessMessage(false);
      if (editMode && sponsorData) {
        setName(sponsorData.brandName || "");
        setWebsite(sponsorData.brandWebsite || "");
        setDescription(sponsorData.brandDescription || "");
        setPackageId(sponsorData.packageId?.toString() || "");
        setCreatedSponsorId(sponsorData.id);
      } else {
        setName("");
        setWebsite("");
        setDescription("");
        setLogo(null);
        setPackageId("");
        setCreatedSponsorId(null);
      }
    }
  }, [showSponsorModal, editMode, sponsorData]);

  const fetchPackages = async () => {
    setLoadingPackages(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/sponsorship-packages/?status=active&page=1&limit=100`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            token: token || "",
          },
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.[0]?.msg || "Failed to fetch packages");
      }

      setPackages(data?.data || []);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load sponsorship packages"
      );
    } finally {
      setLoadingPackages(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setLogo(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Please enter a brand name");
      return;
    }

    // For new submissions or rejected resubmissions, require package selection
    if ((!editMode || sponsorData?.approvalStatus === "REJECTED") && !packageId) {
      toast.error("Please select a sponsorship package");
      return;
    }

    setLoading(true);
    try {
      if (editMode && sponsorData?.id && sponsorData?.approvalStatus === "PENDING") {
        // Update existing PENDING sponsor
        const formData = new FormData();
        formData.append("name", name);
        
        if (description.trim()) {
          formData.append("description", description);
        }
        
        if (website.trim()) {
          formData.append("website", website);
        }
        
        if (logo) {
          formData.append("logo", logo);
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/event-sponsors/${sponsorData.id}`,
          {
            method: "PUT",
            headers: {
              token: token || "",
            },
            body: formData,
          }
        );

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error?.[0]?.msg || "Failed to update sponsorship details");
        }

        toast.success("Sponsorship details updated successfully");
        if (onSuccess) {
          onSuccess();
        }
        setShowSponsorModal(false);
      } else {
        // Create new sponsor (either first time or resubmission after rejection)
        const formData = new FormData();
        formData.append("name", name);
        formData.append("eventId", eventId);
        formData.append("packageId", packageId);
        
        if (description.trim()) {
          formData.append("description", description);
        }
        
        if (website.trim()) {
          formData.append("website", website);
        }
        
        if (logo) {
          formData.append("logo", logo);
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/event-sponsors/add`,
          {
            method: "POST",
            headers: {
              token: token || "",
            },
            body: formData,
          }
        );

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error?.[0]?.msg || "Failed to create sponsorship request");
        }

        setCreatedSponsorId(data?.data?.id || null);
        setShowSuccessMessage(true);
        toast.success("Sponsorship request submitted successfully!");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : editMode && sponsorData?.approvalStatus === "PENDING"
          ? "Failed to update sponsorship request"
          : "Failed to submit sponsorship request"
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    const sponsorIdForPayment = createdSponsorId || sponsorData?.id;
    if (!sponsorIdForPayment) {
      toast.error("Sponsor ID not found. Please try again.");
      return;
    }

    setProcessingPayment(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/event-sponsors/payment/${sponsorIdForPayment}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            token: token || "",
          },
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.[0]?.msg || "Failed to create payment session");
      }

      const checkoutUrl = data?.data?.paymentReference || data?.data?.url || data?.url;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        toast.error("Payment session created but no redirect URL available. Please try again.");
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

  const handleClose = () => {
    if (!loading && !processingPayment) {
      setName("");
      setWebsite("");
      setDescription("");
      setLogo(null);
      setPackageId("");
      setCreatedSponsorId(null);
      setShowSponsorModal(false);
    }
  };

  const handleReset = () => {
    setName("");
    setWebsite("");
    setDescription("");
    setLogo(null);
    setPackageId("");
    setCreatedSponsorId(null);
    setShowSuccessMessage(false);
    
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"][id="logo"]');
    if (fileInput) {
      fileInput.value = "";
    }
  };

  // Determine which UI to show
  const shouldShowForm = () => {
    // Show form for new submissions
    if (!editMode && !showSuccessMessage) return true;
    
    // Show form when editing a PENDING sponsor
    if (editMode && sponsorData?.approvalStatus === "PENDING") return true;
    
    // Show form when resubmitting after REJECTION
    if (editMode && sponsorData?.approvalStatus === "REJECTED") return true;
    
    return false;
  };

  return (
    <Modal show={showSponsorModal} onClose={handleClose} size="lg">
      <Modal.Header className="border-b border-gold-500 bg-gray-800 text-white">
        <h3 className="text-xl font-serif text-gold-300">
          {editMode && sponsorData?.approvalStatus === "PENDING" 
            ? "Edit Sponsorship Details" 
            : editMode && sponsorData?.approvalStatus === "REJECTED"
            ? "Resubmit Sponsorship Request"
            : editMode && sponsorData?.approvalStatus === "APPROVED"
            ? "Sponsorship Payment"
            : "Become a Sponsor"}
        </h3>
      </Modal.Header>
      <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900 overflow-hidden">
        {showSuccessMessage ? (
          <div className="space-y-6 overflow-hidden">
            <div className="text-center py-4 overflow-hidden">
              <div className="mb-4">
                <svg
                  className="mx-auto h-16 w-16 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2 break-words">
                Sponsorship Request Submitted!
              </h3>
              <p className="text-gray-300 mb-6 break-words">
                Your sponsorship request has been created successfully and is pending approval. Payment will be available once your request is approved.
              </p>
            </div>

            <div className="flex justify-center gap-4 pt-4">
              <Button
                color="dark"
                onClick={() => {
                  handleReset();
                  setShowSponsorModal(false);
                  if (onSuccess) {
                    onSuccess();
                  }
                }}
                disabled={processingPayment}
              >
                Close
              </Button>
              {/* Note: Payment button removed - will show after approval in main page */}
            </div>
          </div>
        ) : editMode && sponsorData?.approvalStatus === "APPROVED" ? (
          <div className="space-y-6 overflow-hidden">
            <div className="text-center py-4 overflow-hidden">
              <div className="mb-4">
                <svg
                  className="mx-auto h-16 w-16 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2 break-words">
                Request Approved!
              </h3>
              <p className="text-gray-300 mb-6 break-words">
                Your sponsorship request has been approved. You can now proceed to payment.
              </p>
            </div>
            <div className="flex justify-center gap-4 pt-4">
              <Button
                color="dark"
                onClick={() => setShowSponsorModal(false)}
                disabled={processingPayment}
              >
                Close
              </Button>
              <Button
                onClick={handlePayment}
                className="bg-gold-500 text-black hover:bg-gold-600"
                disabled={processingPayment}
              >
                {processingPayment ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-black inline"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    {/* @ts-ignore */}
                    <svg
                      className="w-5 h-5 mr-2 inline"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                    Pay for Sponsorship
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : shouldShowForm() ? (
          <form onSubmit={handleSubmit} className="space-y-6 overflow-hidden">
            <div>
              <Label
                htmlFor="name"
                value="Brand Name *"
                className="text-white mb-2 block"
              />
              <TextInput
                id="name"
                type="text"
                placeholder="Enter your brand name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

          <div>
            <Label
              htmlFor="website"
              value="Website"
              className="text-white mb-2 block"
            />
            <TextInput
              id="website"
              type="url"
              placeholder="https://example.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <Label
              htmlFor="description"
              value="Description"
              className="text-white mb-2 block"
            />
            <Textarea
              id="description"
              placeholder="Tell us about your brand..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              disabled={loading}
            />
          </div>

          <div>
            <Label
              htmlFor="logo"
              value="Logo"
              className="text-white mb-2 block"
            />
            {editMode && sponsorData?.brandLogo && !logo && (
              <div className="mb-3">
                <p className="text-sm text-gray-400 mb-2">Current logo:</p>
                <img
                  src={sponsorData.brandLogo}
                  alt="Current logo"
                  className="h-20 w-20 object-contain rounded-lg bg-white p-2 border border-gray-600"
                />
              </div>
            )}
            <FileInput
              id="logo"
              accept="image/*"
              onChange={handleFileChange}
              disabled={loading}
            />
            {logo && (
              <p className="text-sm text-gray-400 mt-2">
                Selected: {logo.name} {editMode && sponsorData?.brandLogo && "(will replace current logo)"}
              </p>
            )}
          </div>

          {(!editMode || sponsorData?.approvalStatus === "REJECTED") && (
            <div>
              <Label
                htmlFor="package"
                value="Sponsorship Package *"
                className="text-white mb-2 block"
              />
              {loadingPackages ? (
                <div className="text-gray-400 text-sm ">Loading packages...</div>
              ) : packages.length > 0 ? (
                <>
                  <Select
                    id="package"
                    value={packageId}
                    onChange={(e) => setPackageId(e.target.value)}
                    required
                    disabled={loading || loadingPackages}
                  >
                    <option value="">Select a package</option>
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name}
                      </option>
                    ))}
                  </Select>
                  
                  {packageId && (
                    <div className="mt-4 p-4 bg-gray-700 rounded-lg border border-gold-500">
                      {(() => {
                        const selectedPackage = packages.find(
                          (pkg) => pkg.id.toString() === packageId
                        );
                        if (!selectedPackage) return null;
                        
                        return (
                          <div className="space-y-3">
                            <div className="flex flex-col gap-3">
                              <h3 className="text-lg font-semibold text-white break-words">
                                {selectedPackage.name}
                              </h3>
                              <VatBreakdown baseAmount={selectedPackage.price} compact />
                            </div>
                            {selectedPackage.description && (
                              <div className="max-h-32 overflow-y-auto">
                                <p className="text-gray-300 text-sm break-words whitespace-pre-wrap">
                                  {selectedPackage.description}
                                </p>
                              </div>
                            )}
                            {selectedPackage.benefits && selectedPackage.benefits.length > 0 && (
                              <div className="max-h-40 overflow-y-auto">
                                <h4 className="text-white font-medium text-sm mb-2">Benefits:</h4>
                                <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                                  {selectedPackage.benefits.map((benefit, idx) => (
                                    <li key={idx} className="break-words">{benefit}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400 mt-2">
                  No active packages available
                </p>
              )}
            </div>
          )}

            <div className="flex justify-end gap-4 pt-4">
              <Button
                color="dark"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gold-500 text-black hover:bg-gold-600"
                disabled={loading || loadingPackages}
              >
                {loading 
                  ? (editMode && sponsorData?.approvalStatus === "PENDING" ? "Updating..." : "Submitting...") 
                  : (editMode && sponsorData?.approvalStatus === "PENDING" ? "Update Details" : "Submit Request")}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal.Body>
    </Modal>
  );
};

export default SponsorModal;

