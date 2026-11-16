import React, { useState, useEffect } from "react";
import { Button, Label, Modal, TextInput, Textarea } from "flowbite-react";
import { toast } from "react-toastify";
import { HiPlus, HiTrash } from "react-icons/hi";
import { AnnualSponsorshipPackage, updateAnnualSponsorshipPackage } from "@/services/annualSponsor";

interface EditPackageModalProps {
    showModal: boolean;
    setShowModal: (show: boolean) => void;
    token: string;
    packageData: AnnualSponsorshipPackage;
    onSuccess: () => void;
}

export default function EditPackageModal({
    showModal,
    setShowModal,
    token,
    packageData,
    onSuccess,
}: EditPackageModalProps) {
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: "",
        benefits: [] as string[],
    });
    const [loading, setLoading] = useState(false);
    const [newBenefit, setNewBenefit] = useState("");

    useEffect(() => {
        if (packageData) {
            setFormData({
                name: packageData.name,
                description: packageData.description || "",
                price: packageData.price.toString(),
                benefits: packageData.benefits || [],
            });
        }
    }, [packageData, showModal]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await updateAnnualSponsorshipPackage(token, packageData.id, {
                name: formData.name,
                description: formData.description,
                price: Number(formData.price),
                benifits: formData.benefits,
            });

            onSuccess();
            setShowModal(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to update package");
        } finally {
            setLoading(false);
        }
    };

    const addBenefit = () => {
        if (newBenefit.trim()) {
            setFormData({
                ...formData,
                benefits: [...formData.benefits, newBenefit.trim()],
            });
            setNewBenefit("");
        }
    };

    const removeBenefit = (index: number) => {
        const newBenefits = [...formData.benefits];
        newBenefits.splice(index, 1);
        setFormData({ ...formData, benefits: newBenefits });
    };

    const isFormValid = () => {
        return (
            formData.name.trim() !== "" &&
            Number(formData.price) > 10 &&
            formData.benefits.length > 0
        );
    };

    return (
        <Modal show={showModal} onClose={() => setShowModal(false)} size="2xl">
            <Modal.Header>Edit Annual Sponsorship Package</Modal.Header>
            <form onSubmit={handleSubmit}>
                <Modal.Body>
                    <div className="space-y-6">
                        <div>
                            <div className="mb-2 block">
                                <Label htmlFor="name" value="Package Name" />
                            </div>
                            <TextInput
                                id="name"
                                required
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                            />
                        </div>

                        <div>
                            <div className="mb-2 block">
                                <Label htmlFor="price" value="Price - Must be greater than 10" />
                            </div>
                            <TextInput
                                id="price"
                                type="number"
                                required
                                min={0}
                                value={formData.price}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val) && val >= 0) {
                                        setFormData({ ...formData, price: e.target.value });
                                    } else if (e.target.value === "") {
                                        setFormData({ ...formData, price: "" });
                                    }
                                }}
                            />
                        </div>

                        <div>
                            <div className="mb-2 block">
                                <Label htmlFor="description" value="Description" />
                            </div>
                            <Textarea
                                id="description"
                                rows={3}
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                            />
                        </div>

                        <div>
                            <div className="mb-2 block">
                                <Label htmlFor="benefits" value="Benefits" />
                            </div>
                            <div className="flex gap-2 mb-2">
                                <TextInput
                                    id="newBenefit"
                                    placeholder="Add a benefit"
                                    value={newBenefit}
                                    onChange={(e) => setNewBenefit(e.target.value)}
                                    className="flex-1"
                                    onKeyPress={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addBenefit();
                                        }
                                    }}
                                />
                                <Button type="button" onClick={addBenefit} color="gray">
                                    {/* @ts-ignore */}
                                    <HiPlus className="h-5 w-5" />
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {formData.benefits.map((benefit, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded"
                                    >
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                            {benefit}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeBenefit(index)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            {/* @ts-ignore */}
                                            <HiTrash className="h-5 w-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            {formData.benefits.length === 0 && (
                                <p className="text-red-500 text-sm mt-1">
                                    At least one benefit is required.
                                </p>
                            )}
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        type="button"
                        className="bg-gray-700 hover:bg-gray-600 text-white"
                        onClick={() => setShowModal(false)}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        className={`bg-gold-500 hover:bg-gold-600 text-black ${!isFormValid() ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                        disabled={loading || !isFormValid()}
                    >
                        {loading ? "Updating..." : "Update Package"}
                    </Button>
                </Modal.Footer>
            </form>
        </Modal>
    );
}
