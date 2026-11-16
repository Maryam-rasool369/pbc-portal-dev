import React, { useState } from "react";
import { Label, TextInput, Button } from "flowbite-react";

interface Props {
  nextStep: (values: {
    shareholderStatus: string;
    otherShareholders: string;
    annualRevenue: string;
    ownershipPercentage: string;
  }) => void;
  prevStep: () => void;
}

const ShareholderDetailsStep1: React.FC<Props> = ({ nextStep, prevStep }) => {
  const [formData, setFormData] = useState({
    shareholderStatus: "",
    otherShareholders: "",
    annualRevenue: "",
    ownershipPercentage: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.shareholderStatus.trim()) {
      newErrors.shareholderStatus = "This field is required.";
    }

    if (!formData.otherShareholders.trim()) {
      newErrors.otherShareholders = "This field is required.";
    }

    const ownership = Number(formData.ownershipPercentage);
    if (!formData.ownershipPercentage.trim()) {
      newErrors.ownershipPercentage = "This field is required.";
    } else if (isNaN(ownership) || ownership < 0 || ownership > 100) {
      newErrors.ownershipPercentage = "Enter a percentage between 0 and 100.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      nextStep(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-bold text-gold-300">
        Shareholder and Company Details
      </h2>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="shareholderStatus">
            Shareholder Status in the Company
          </Label>
          <TextInput
            id="shareholderStatus"
            value={formData.shareholderStatus}
            onChange={(e) => handleChange("shareholderStatus", e.target.value)}
            color={errors.shareholderStatus ? "failure" : undefined}
          />
          {errors.shareholderStatus && (
            <span className="text-sm text-red-600">
              {errors.shareholderStatus}
            </span>
          )}
        </div>

        <div>
          <Label htmlFor="otherShareholders">Other Shareholders’ Names</Label>
          <TextInput
            id="otherShareholders"
            value={formData.otherShareholders}
            onChange={(e) => handleChange("otherShareholders", e.target.value)}
            color={errors.otherShareholders ? "failure" : undefined}
          />
          {errors.otherShareholders && (
            <span className="text-sm text-red-600">
              {errors.otherShareholders}
            </span>
          )}
        </div>

        <div>
          <Label htmlFor="annualRevenue">
            Annual Revenue / Turnover (Optional)
          </Label>
          <div className="flex items-center gap-2">
            <TextInput
              id="annualRevenue"
              value={formData.annualRevenue}
              onChange={(e) => handleChange("annualRevenue", e.target.value)}
              placeholder="Enter annual revenue"
              type="text"
              color={errors.annualRevenue ? "failure" : undefined}
            />
          </div>
          {errors.annualRevenue && (
            <span className="text-sm text-red-600">{errors.annualRevenue}</span>
          )}
        </div>

        <div>
          <Label htmlFor="ownershipPercentage">Ownership Percentage</Label>
          <div className="flex items-center gap-2">
            <TextInput
              id="ownershipPercentage"
              value={formData.ownershipPercentage}
              onChange={(e) =>
                handleChange(
                  "ownershipPercentage",
                  e.target.value.replace(/\D/g, ""),
                )
              }
              placeholder="e.g. 25"
              type="text"
              color={errors.ownershipPercentage ? "failure" : undefined}
            />
            <span className="text-lg font-semibold text-white">%</span>
          </div>
          {errors.ownershipPercentage && (
            <span className="text-sm text-red-600">
              {errors.ownershipPercentage}
            </span>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <Button type="button" color="gray" onClick={prevStep}>
          Back
        </Button>
        <Button type="submit" color="warning" className="bg-gold-500">
          Next
        </Button>
      </div>
    </form>
  );
};

export default ShareholderDetailsStep1;
