import { Modal, Button, Label, TextInput, Textarea, FileInput } from "flowbite-react";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";

interface AnnualSponsorshipPackageModalProps {
  showModal: boolean;
  setShowModal: (value: boolean) => void;
  token: string;
  packageData?: SponsorshipPackage | null;
  onSuccess?: () => void;
}

interface SponsorshipPackage {
  id: number;
  name: string;
  description?: string;
  price: number;
  benefits: string[];
  isActive: boolean;
  logo?: string;
}

const AnnualSponsorshipPackageModal: React.FC<AnnualSponsorshipPackageModalProps> = ({
  showModal,
  setShowModal,
  token,
  packageData,
  onSuccess,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [benefits, setBenefits] = useState<string[]>([]);
  const [benefitInput, setBenefitInput] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isEdit = !!packageData;

  useEffect(() => {
    if (showModal) {
      if (packageData) {
        setName(packageData.name);
        setDescription(packageData.description || "");
        setPrice(packageData.price.toString());
        setBenefits(packageData.benefits || []);
        setLogoPreview(packageData.logo || null);
        setLogo(null);
      } else {
        setName("");
        setDescription("");
        setPrice("");
        setBenefits([]);
        setBenefitInput("");
        setLogo(null);
        setLogoPreview(null);
      }
    }
  }, [showModal, packageData]);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addBenefit = () => {
    if (benefitInput.trim()) {
      setBenefits([...benefits, benefitInput.trim()]);
      setBenefitInput("");
    }
  };

  const removeBenefit = (index: number) => {
    setBenefits(benefits.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Please enter a package name");
      return;
    }

    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        const updateData: any = {
          name,
          price: parseFloat(price),
          ...(description && { description }),
          ...(benefits.length > 0 && { benefits }),
        };

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/annual-sponsorship-packages/${packageData.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              token: token || "",
            },
            body: JSON.stringify(updateData),
          }
        );

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error?.[0]?.msg || "Failed to update package");
        }

        toast.success("Package updated successfully");
        handleClose();
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("price", price);
        
        if (description.trim()) {
          formData.append("description", description);
        }
        
        if (benefits.length > 0) {
          benefits.forEach((benefit) => {
            formData.append("benefits", benefit);
          });
        }
        
        if (logo) {
          formData.append("logo", logo);
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/annual-sponsorship-packages/`,
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
          throw new Error(data?.error?.[0]?.msg || "Failed to create package");
        }

        toast.success("Package created successfully");
        
        handleClose();
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to ${isEdit ? "update" : "create"} package`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setName("");
      setDescription("");
      setPrice("");
      setBenefits([]);
      setBenefitInput("");
      setLogo(null);
      setLogoPreview(null);
      setShowModal(false);
    }
  };

  return (
    <Modal show={showModal} onClose={handleClose} size="lg">
      <Modal.Header className="border-b border-gold-500 bg-gray-800 text-white">
        <h3 className="text-xl font-serif text-gold-300">
          {isEdit ? "Edit Sponsorship Package" : "Create Sponsorship Package"}
        </h3>
      </Modal.Header>

      <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label
              htmlFor="name"
              value="Package Name *"
              className="text-white mb-2 block"
            />
            <TextInput
              id="name"
              type="text"
              placeholder="Enter package name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
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
              placeholder="Describe the package..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={loading}
            />
          </div>

          <div>
            <Label
              htmlFor="price"
              value="Price *"
              className="text-white mb-2 block"
            />
            <TextInput
              id="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <Label
              htmlFor="benefits"
              value="Benefits"
              className="text-white mb-2 block"
            />
            <div className="flex gap-2 mb-2">
              <TextInput
                id="benefits"
                type="text"
                placeholder="Enter a benefit"
                value={benefitInput}
                onChange={(e) => setBenefitInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addBenefit();
                  }
                }}
                disabled={loading}
              />
              <Button
                type="button"
                color="dark"
                onClick={addBenefit}
                disabled={loading || !benefitInput.trim()}
              >
                Add
              </Button>
            </div>
            {benefits.length > 0 && (
              <div className="space-y-2">
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-700 p-2 rounded"
                  >
                    <span className="text-white text-sm">{benefit}</span>
                    <Button
                      type="button"
                      color="failure"
                      size="xs"
                      onClick={() => removeBenefit(index)}
                      disabled={loading}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

      
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
              disabled={loading}
            >
              {loading
                ? isEdit
                  ? "Updating..."
                  : "Creating..."
                : isEdit
                ? "Update Package"
                : "Create Package"}
            </Button>
          </div>
        </form>
      </Modal.Body>
    </Modal>
  );
};

export default AnnualSponsorshipPackageModal;
