import React, { useState } from "react";
import { Label, TextInput, Button, Textarea } from "flowbite-react";

interface Props {
  nextStep: (values: {
    references: string;
    endorsementByExistingMember: string;
  }) => void;
  prevStep?: () => void;
}

const ShareholderDetailsStep: React.FC<Props> = ({ nextStep, prevStep }) => {
  const [formData, setFormData] = useState({
    references: "",
    endorsementByExistingMember: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.references.trim()) {
      newErrors.references = "This field is required.";
    }

    if (!formData.endorsementByExistingMember.trim()) {
      newErrors.endorsementByExistingMember = "This field is required.";
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

      <div className="space-y-4">
        <div>
          <Label htmlFor="references" className="mb-1">
            References
          </Label>
          <TextInput
            id="references"
            value={formData.references}
            onChange={(e) => handleChange("references", e.target.value)}
            placeholder="Enter references"
            color={errors.references ? "failure" : undefined}
          />
          {errors.references && (
            <span className="text-sm text-red-600">{errors.references}</span>
          )}
        </div>

        <div>
          <Label htmlFor="endorsementByExistingMember" className="mb-1">
            Endorsement by an Existing Member
          </Label>
          <Textarea
            id="endorsementByExistingMember"
            value={formData.endorsementByExistingMember}
            onChange={(e) =>
              handleChange("endorsementByExistingMember", e.target.value)
            }
            placeholder="Write here ..."
            rows={4}
            color={errors.endorsementByExistingMember ? "failure" : undefined}
          />
          {errors.endorsementByExistingMember && (
            <span className="text-sm text-red-600">
              {errors.endorsementByExistingMember}
            </span>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <Button
          type="button"
          color="gray"
          onClick={prevStep}
          disabled={!prevStep}
        >
          Back
        </Button>
        <Button type="submit" color="warning" className="bg-gold-500">
          Next
        </Button>
      </div>
    </form>
  );
};

export default ShareholderDetailsStep;
