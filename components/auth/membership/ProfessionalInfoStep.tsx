import React, { useEffect, useState } from "react";
import { Button, Checkbox, Label, TextInput } from "flowbite-react";

interface Props {
  nextStep: (values: {
    professionalTitle: string;
    yearsOfExperience: string;
    educationalBackground: string;
    languagesSpoken: string;
    primeClients: string[];
  }) => void;
  prevStep: () => void;
  initialValues?: Partial<{
    professionalTitle: string;
    yearsOfExperience: string | number;
    educationalBackground: string;
    languagesSpoken: string;
    primeClients: string[];
  }>;
}

const ProfessionalInfoStep: React.FC<Props> = ({
  nextStep,
  prevStep,
  initialValues,
}) => {
  const [formData, setFormData] = useState({
    professionalTitle: "",
    yearsOfExperience: "",
    educationalBackground: "",
    languagesSpoken: "",
    primeClients: [] as string[],
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!initialValues) return;

    const normalizedInitialValues = {
      ...initialValues,
      yearsOfExperience:
        initialValues.yearsOfExperience != null
          ? String(initialValues.yearsOfExperience)
          : "",
    };

    setFormData((prev) => ({
      ...prev,
      ...Object.fromEntries(
        Object.entries(normalizedInitialValues).filter(
          ([, value]) => value != null,
        ),
      ),
    }));
  }, [initialValues]);

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    const yearsOfExperience = String(formData.yearsOfExperience ?? "").trim();

    if (!formData.professionalTitle.trim())
      newErrors.professionalTitle = "This field is required.";

    if (!yearsOfExperience)
      newErrors.yearsOfExperience = "This field is required.";

    if (!formData.languagesSpoken.trim())
      newErrors.languagesSpoken = "This field is required.";

    if (!formData.primeClients.length)
      newErrors.primeClients = "Select at least one prime client type.";

    const years = Number(yearsOfExperience);
    if (!isNaN(years) && (years < 0 || !/^\d+$/.test(yearsOfExperience))) {
      newErrors.yearsOfExperience = "Enter a valid non-negative number.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clientOptions = [
    "Government Department",
    "Corporates",
    "Industries",
    "Traders",
    "Retailers",
    "Individuals",
  ];

  const togglePrimeClient = (client: string) => {
    setFormData((prev) => {
      const exists = prev.primeClients.includes(client);
      const primeClients = exists
        ? prev.primeClients.filter((item) => item !== client)
        : [...prev.primeClients, client];

      return {
        ...prev,
        primeClients,
      };
    });

    setErrors((prev) => ({ ...prev, primeClients: "" }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      nextStep(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-gold-300 text-xl font-bold">
        Professional Information
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: "Professional Title/Designation", key: "professionalTitle" },
          {
            label: "Years of Experience in Current Role",
            key: "yearsOfExperience",
            type: "number",
          },
          {
            label: "Educational Background (Optional)",
            key: "educationalBackground",
          },
          {
            label: "Languages Spoken",
            key: "languagesSpoken",
            placeholder: "e.g., English, Spanish",
          },
        ].map(({ label, key, placeholder, type }) => (
          <div key={key} className="col-span-1 md:col-span-1">
            <Label htmlFor={key}>{label}</Label>
            <TextInput
              id={key}
              type={type || "text"}
              placeholder={placeholder}
              value={formData[key as keyof typeof formData]}
              onChange={(e) => handleChange(key, e.target.value)}
              color={errors[key] ? "failure" : undefined}
            />
            {errors[key] && (
              <span className="text-sm text-red-600">{errors[key]}</span>
            )}
          </div>
        ))}

        <div className="col-span-1 md:col-span-2">
          <Label htmlFor="primeClients">Prime Clients</Label>
          <div className="mt-2 border border-gray-700 rounded-lg p-3 space-y-2 bg-gray-900/50">
            {clientOptions.map((client) => (
              <label key={client} className="flex items-center gap-2 text-white text-sm">
                <Checkbox
                  checked={formData.primeClients.includes(client)}
                  onChange={() => togglePrimeClient(client)}
                />
                {client}
              </label>
            ))}
          </div>
          {errors.primeClients && (
            <span className="text-sm text-red-600">{errors.primeClients}</span>
          )}
        </div>
      </div>

      <div className="flex justify-between mt-6">
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

export default ProfessionalInfoStep;
