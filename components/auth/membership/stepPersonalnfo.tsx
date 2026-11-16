import React, { useEffect, useState } from "react";
import { Label, TextInput, Button } from "flowbite-react";

interface Props {
  nextStep: (formData: {
    dob: string;
    passportNumber: string;
    passportExpiry: string;
    emiratesId?: string;
    emiratesIdExpiry?: string;
    mailingAddress: string;
  }) => void;
  prevStep: () => void;
  isResident: boolean;
  initialValues?: Partial<{
    dob: string;
    passportNumber: string;
    passportExpiry: string;
    emiratesId: string;
    emiratesIdExpiry: string;
    mailingAddress: string;
  }>;
}

// Format Emirates ID: Extract numbers only, then format as XXX-YYYY-XXXXXXX-X
const formatEmiratesId = (input: string): string => {
  const numbersOnly = input.replace(/\D/g, "").slice(0, 15);
  
  if (numbersOnly.length === 0) return "";
  if (numbersOnly.length <= 3) return numbersOnly;
  if (numbersOnly.length <= 7) return `${numbersOnly.slice(0, 3)}-${numbersOnly.slice(3)}`;
  if (numbersOnly.length <= 14) return `${numbersOnly.slice(0, 3)}-${numbersOnly.slice(3, 7)}-${numbersOnly.slice(7)}`;
  return `${numbersOnly.slice(0, 3)}-${numbersOnly.slice(3, 7)}-${numbersOnly.slice(7, 14)}-${numbersOnly.slice(14)}`;
};

// Extract only numbers from formatted Emirates ID
const getEmiratesIdNumbers = (formatted: string): string => {
  return formatted.replace(/\D/g, "");
};

const PersonalInfoStep: React.FC<Props> = ({
  nextStep,
  prevStep,
  isResident,
  initialValues,
}) => {
  const [formData, setFormData] = useState({
    dob: "",
    passportNumber: "",
    passportExpiry: "",
    emiratesId: "",
    emiratesIdExpiry: "",
    mailingAddress: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!initialValues) return;
    setFormData((prev) => ({
      ...prev,
      ...Object.fromEntries(
        Object.entries(initialValues).filter(([, value]) => value != null),
      ),
    }));
  }, [initialValues]);

  const handleChange = (key: string, value: string) => {
    // Special formatting for Emirates ID
    if (key === "emiratesId") {
      const formatted = formatEmiratesId(value);
      setFormData((prev) => ({ ...prev, [key]: formatted }));
      setErrors((prev) => ({ ...prev, [key]: "" }));
    } else {
      setFormData((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (isResident) {
      const emiratesIdNumbers = getEmiratesIdNumbers(formData.emiratesId);
      if (!emiratesIdNumbers.trim()) {
        nextErrors.emiratesId = "Emirates ID Number is required.";
      } else if (emiratesIdNumbers.length !== 15) {
        nextErrors.emiratesId = "Emirates ID must be 15 digits.";
      }

      if (!formData.emiratesIdExpiry.trim()) {
        nextErrors.emiratesIdExpiry = "Emirates ID Expiry Date is required.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    nextStep({
      dob: formData.dob,
      passportNumber: formData.passportNumber,
      passportExpiry: formData.passportExpiry,
      mailingAddress: formData.mailingAddress,
      ...(isResident
        ? {
            emiratesId: getEmiratesIdNumbers(formData.emiratesId),
            emiratesIdExpiry: formData.emiratesIdExpiry,
          }
        : {}),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-bold text-gold-300">Personal Information</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="dob">Date of Birth</Label>
          <TextInput
            id="dob"
            type="date"
            value={formData.dob}
            onChange={(e) => handleChange("dob", e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="passportNumber">Passport Number</Label>
          <TextInput
            id="passportNumber"
            value={formData.passportNumber}
            onChange={(e) => handleChange("passportNumber", e.target.value)}
            required
            minLength={6}
          />
        </div>

        <div>
          <Label htmlFor="passportExpiry">Passport Expiry Date</Label>
          <TextInput
            id="passportExpiry"
            type="date"
            value={formData.passportExpiry}
            onChange={(e) => handleChange("passportExpiry", e.target.value)}
            required
          />
        </div>

        {isResident && (
          <>
            <div>
              <Label htmlFor="emiratesId">Emirates ID Number</Label>
              <TextInput
                id="emiratesId"
                value={formData.emiratesId}
                onChange={(e) => handleChange("emiratesId", e.target.value)}
                placeholder="123-4567-890123-4"
                maxLength={19}
                required
                title="Enter a 15-digit Emirates ID (auto-formatted)"
                color={errors.emiratesId ? "failure" : undefined}
              />
              {errors.emiratesId && (
                <p className="text-red-600 text-sm">{errors.emiratesId}</p>
              )}
            </div>

            <div>
              <Label htmlFor="emiratesIdExpiry">Emirates ID Expiry Date</Label>
              <TextInput
                id="emiratesIdExpiry"
                type="date"
                value={formData.emiratesIdExpiry}
                onChange={(e) => handleChange("emiratesIdExpiry", e.target.value)}
                required
                color={errors.emiratesIdExpiry ? "failure" : undefined}
              />
              {errors.emiratesIdExpiry && (
                <p className="text-red-600 text-sm">{errors.emiratesIdExpiry}</p>
              )}
            </div>
          </>
        )}

        <div className="md:col-span-2">
          <Label htmlFor="mailingAddress">Mailing Address</Label>
          <TextInput
            id="mailingAddress"
            value={formData.mailingAddress}
            onChange={(e) => handleChange("mailingAddress", e.target.value)}
            required
            minLength={10}
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

export default PersonalInfoStep;
