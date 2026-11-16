import React, { useState } from "react";
import { Label, TextInput, Button } from "flowbite-react";

interface Props {
  nextStep: () => void;
  prevStep: () => void;
}

const CompanyInfoStep: React.FC<Props> = ({ nextStep, prevStep }) => {
  const [formData, setFormData] = useState({
    companyName: "",
    industry: "",
    website: "",
  });

  const [errors, setErrors] = useState({
    companyName: "",
    industry: "",
    website: "",
  });

  const validate = () => {
    const newErrors = {
      companyName: "",
      industry: "",
      website: "",
    };

    if (!formData.companyName.trim()) {
      newErrors.companyName = "Company name is required.";
    }

    if (!formData.industry.trim()) {
      newErrors.industry = "Industry is required.";
    }

    if (
      formData.website.trim() &&
      !/^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/.test(formData.website)
    ) {
      newErrors.website = "Enter a valid website URL.";
    }

    setErrors(newErrors);

    return Object.values(newErrors).every((e) => e === "");
  };

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      nextStep();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-bold text-gold-300">Company Information</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="companyName">Company Name</Label>
          <TextInput
            id="companyName"
            value={formData.companyName}
            onChange={(e) => handleChange("companyName", e.target.value)}
            color={errors.companyName ? "failure" : undefined}
            helperText={errors.companyName && <span>{errors.companyName}</span>}
            required
          />
        </div>

        <div>
          <Label htmlFor="industry">Industry</Label>
          <TextInput
            id="industry"
            value={formData.industry}
            onChange={(e) => handleChange("industry", e.target.value)}
            color={errors.industry ? "failure" : undefined}
            helperText={errors.industry && <span>{errors.industry}</span>}
            required
          />
        </div>

        <div>
          <Label htmlFor="website">Website</Label>
          <TextInput
            id="website"
            type="url"
            placeholder="https://example.com"
            value={formData.website}
            onChange={(e) => handleChange("website", e.target.value)}
            color={errors.website ? "failure" : undefined}
            helperText={errors.website && <span>{errors.website}</span>}
          />
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

export default CompanyInfoStep;
