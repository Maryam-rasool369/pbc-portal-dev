import { Modal, Button, Label, TextInput, Textarea, FileInput, Select } from "flowbite-react";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { AnnualSponsorshipPackage, fetchAllActiveAnnualSponsorshipPackages } from "@/services/annualSponsor";
import VatBreakdown from "@/components/ui/VatBreakdown";

interface AnnualSponsorModalProps {
  showModal: boolean;
  setShowModal: (value: boolean) => void;
  token: string;
  /** @deprecated No longer needed – packages are fetched inside the modal */
  packageData?: AnnualSponsorshipPackage | null;
  onSuccess?: () => void;
}

const AnnualSponsorModal: React.FC<AnnualSponsorModalProps> = ({
  showModal,
  setShowModal,
  token,
  onSuccess,
}) => {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [packageId, setPackageId] = useState<string>("");
  const [packages, setPackages] = useState<AnnualSponsorshipPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);

  useEffect(() => {
    if (showModal) {
      resetForm();
      fetchPackages();
    }
  }, [showModal]);

  const resetForm = () => {
    setName("");
    setWebsite("");
    setDescription("");
    setLogo(null);
    setLogoPreview(null);
    setPackageId("");
  };

  const fetchPackages = async () => {
    setLoadingPackages(true);
    try {
      const data = await fetchAllActiveAnnualSponsorshipPackages(token);
      setPackages(data);
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
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setLogoPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a brand name");
      return;
    }

    if (!packageId) {
      toast.error("Please select a sponsorship package");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("packageId", packageId);
      if (description.trim()) formData.append("description", description.trim());
      if (website.trim()) formData.append("website", website.trim());
      if (logo) formData.append("logo", logo);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/annual-sponsors/add`,
        {
          method: "POST",
          headers: {
            token: token || "",
          },
          body: formData,
        }
      );

      const data = await res.json();
      if (!res.ok || (data && data.error)) {
        throw new Error(
          data?.error?.[0]?.msg ||
            data?.message ||
            `Request failed with status ${res.status}`
        );
      }

      toast.success("Annual sponsorship request submitted! Awaiting approval.");
      setShowModal(false);
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create annual sponsorship"
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedPackage = packages.find((pkg) => pkg.id.toString() === packageId);

  return (
    <Modal show={showModal} onClose={() => !loading && setShowModal(false)} size="2xl">
      <Modal.Header className="border-b border-gold-500 bg-gray-800 text-white">
        <h3 className="text-xl font-serif text-gold-300">Apply for Annual Sponsorship</h3>
      </Modal.Header>
      <form onSubmit={handleSubmit}>
        <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900 max-h-[calc(100vh-12rem)] overflow-y-auto space-y-5">
          {/* Package Selector */}
          <div>
            <Label
              htmlFor="annual-package"
              value="Sponsorship Package *"
              className="text-white mb-2 block"
            />
            {loadingPackages ? (
              <div className="text-gray-400 text-sm">Loading packages...</div>
            ) : packages.length > 0 ? (
              <>
                <Select
                  id="annual-package"
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

                {selectedPackage && (
                  <div className="mt-4 p-4 bg-gray-700 rounded-lg border border-gold-500">
                    <div className="space-y-3">
                      <div className="flex flex-col gap-2">
                        <h3 className="text-lg font-semibold text-white break-words">
                          {selectedPackage.name}
                        </h3>
                        <VatBreakdown baseAmount={selectedPackage.price} compact />
                        <p className="text-xs text-gray-400">Per year</p>
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
                              <li key={idx} className="break-words">
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400 mt-2">
                No active packages available
              </p>
            )}
          </div>

          {/* Brand Name */}
          <div>
            <Label htmlFor="annual-name" value="Brand Name *" className="text-white mb-2 block" />
            <TextInput
              id="annual-name"
              type="text"
              placeholder="Enter your brand name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="annual-description" value="Description" className="text-white mb-2 block" />
            <Textarea
              id="annual-description"
              placeholder="Enter a brief description about your brand"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              disabled={loading}
            />
          </div>

          {/* Website */}
          <div>
            <Label htmlFor="annual-website" value="Website" className="text-white mb-2 block" />
            <TextInput
              id="annual-website"
              type="url"
              placeholder="https://example.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Logo */}
          <div>
            <Label htmlFor="annual-logo" value="Brand Logo" className="text-white mb-2 block" />
            <FileInput
              id="annual-logo"
              accept="image/*"
              onChange={handleFileChange}
              disabled={loading}
              helperText="Upload your brand logo (JPG, PNG, etc.)"
            />
            {logoPreview && (
              <div className="mt-3">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="h-24 w-24 object-contain rounded-lg bg-white p-2 border border-gray-300"
                />
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-gray-800 border-t border-gray-700">
          <Button
            type="button"
            color="dark"
            onClick={() => setShowModal(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-gold-500 hover:bg-gold-600 text-black"
            disabled={loading || loadingPackages || packages.length === 0}
          >
            {loading ? "Submitting..." : "Submit Application"}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

export default AnnualSponsorModal;
