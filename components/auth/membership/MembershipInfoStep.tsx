import React, { useEffect, useState } from "react";
import { Button, Checkbox, Label, Select, Textarea } from "flowbite-react";

interface Props {
  nextStep: (values: {
    keyObjectives: string;
    areaOfInterest: string;
    expectations: string;
    selfDescription: string;
    clientIntroductionComfort: "YES" | "NO" | "";
    businessTrainingInterest: "YES" | "NO" | "";
    councilDiscoveryMethod: string;
  }) => void;
  prevStep: () => void;
  initialValues?: Partial<{
    keyObjectives: string;
    areaOfInterest: string;
    expectations: string;
    selfDescription: string;
    clientIntroductionComfort: "YES" | "NO" | "";
    businessTrainingInterest: "YES" | "NO" | "";
    councilDiscoveryMethod: string;
  }>;
}

const MembershipInfoStep: React.FC<Props> = ({
  nextStep,
  prevStep,
  initialValues,
}) => {
  const [formData, setFormData] = useState({
    keyObjectives: "",
    areaOfInterest: "",
    expectations: "",
    selfDescription: "",
    clientIntroductionComfort: "" as "YES" | "NO" | "",
    businessTrainingInterest: "" as "YES" | "NO" | "",
    councilDiscoveryMethod: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [confirmCompliance, setConfirmCompliance] = useState(false);
  const [confirmAuthorization, setConfirmAuthorization] = useState(false);

  useEffect(() => {
    if (!initialValues) return;
    setFormData((prev) => ({
      ...prev,
      ...Object.fromEntries(
        Object.entries(initialValues).filter(([, value]) => value != null),
      ),
    }));
  }, [initialValues]);

  const handleChange = (key: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.keyObjectives.trim())
      newErrors.keyObjectives = "This field is required.";
    if (!formData.areaOfInterest.trim())
      newErrors.areaOfInterest = "This field is required.";
    if (!formData.expectations.trim())
      newErrors.expectations = "This field is required.";
    if (!formData.selfDescription.trim())
      newErrors.selfDescription = "This field is required.";
    if (!formData.clientIntroductionComfort)
      newErrors.clientIntroductionComfort = "This field is required.";
    if (!formData.businessTrainingInterest)
      newErrors.businessTrainingInterest = "This field is required.";
    if (!formData.councilDiscoveryMethod.trim())
      newErrors.councilDiscoveryMethod = "This field is required.";
    if (!confirmCompliance)
      newErrors.confirmCompliance = "You must confirm this statement.";
    if (!confirmAuthorization)
      newErrors.confirmAuthorization = "You must confirm this statement.";

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
        Membership-Specific Information
      </h2>

      <div className="grid grid-cols-1 gap-5">
        {[
          {
            label: "Key Objectives for Joining the Council",
            key: "keyObjectives",
            placeholder: "Comma-separated, e.g. Networking, Trade Opportunities",
          },
          {
            label: "Specific Areas of Interest",
            key: "areaOfInterest",
            placeholder: "Comma-separated, e.g. Sales, Legal, Consultation",
          },
          {
            label: "What are your expectations from PBC",
            key: "expectations",
            placeholder: "Write your expectation here...",
          },
          {
            label: "What do you think about yourself",
            key: "selfDescription",
            placeholder: "Write a brief description about yourself...",
          },
          {
            label: "How did you learn about the Council?",
            key: "councilDiscoveryMethod",
            placeholder: "Write here...",
          },
        ].map(({ label, key, placeholder }) => (
          <div key={key}>
            <Label htmlFor={key}>{label}</Label>
            <Textarea
              id={key}
              placeholder={placeholder}
              rows={3}
              value={formData[key as keyof typeof formData] as string}
              onChange={(e) => handleChange(key, e.target.value)}
              color={errors[key] ? "failure" : undefined}
            />
            {errors[key] && (
              <span className="text-sm text-red-600">{errors[key]}</span>
            )}
          </div>
        ))}

        <div>
          <Label htmlFor="clientIntroductionComfort">
            Comfortable introducing clients to members in different trade?
          </Label>
          <Select
            id="clientIntroductionComfort"
            value={formData.clientIntroductionComfort}
            onChange={(e) =>
              handleChange(
                "clientIntroductionComfort",
                e.target.value as "YES" | "NO",
              )
            }
            color={errors.clientIntroductionComfort ? "failure" : undefined}
          >
            <option value="" disabled>
              Select option
            </option>
            <option value="YES">Yes</option>
            <option value="NO">No</option>
          </Select>
          {errors.clientIntroductionComfort && (
            <span className="text-sm text-red-600">
              {errors.clientIntroductionComfort}
            </span>
          )}
        </div>

        <div>
          <Label htmlFor="businessTrainingInterest">
            Interested in business trainings and brainstorming workshops?
          </Label>
          <Select
            id="businessTrainingInterest"
            value={formData.businessTrainingInterest}
            onChange={(e) =>
              handleChange(
                "businessTrainingInterest",
                e.target.value as "YES" | "NO",
              )
            }
            color={errors.businessTrainingInterest ? "failure" : undefined}
          >
            <option value="" disabled>
              Select option
            </option>
            <option value="YES">Yes</option>
            <option value="NO">No</option>
          </Select>
          {errors.businessTrainingInterest && (
            <span className="text-sm text-red-600">
              {errors.businessTrainingInterest}
            </span>
          )}
        </div>

        <div className="space-y-4 rounded-lg border border-gray-700 bg-gray-900/50 p-4">
          <label className="flex items-start gap-3 text-sm text-white">
            <Checkbox
              checked={confirmCompliance}
              onChange={(e) => {
                setConfirmCompliance(e.target.checked);
                setErrors((prev) => ({ ...prev, confirmCompliance: "" }));
              }}
            />
            <span>
              I confirm that my company complies with all UAE laws and
              regulations.
            </span>
          </label>
          {errors.confirmCompliance && (
            <span className="text-sm text-red-600">{errors.confirmCompliance}</span>
          )}

          <label className="flex items-start gap-3 text-sm text-white">
            <Checkbox
              checked={confirmAuthorization}
              onChange={(e) => {
                setConfirmAuthorization(e.target.checked);
                setErrors((prev) => ({ ...prev, confirmAuthorization: "" }));
              }}
            />
            <span>
              I authorize the Pakistan Business Council to use the provided
              details for council-related activities and communication.
            </span>
          </label>
          {errors.confirmAuthorization && (
            <span className="text-sm text-red-600">{errors.confirmAuthorization}</span>
          )}
        </div>
      </div>

      <div className="flex justify-between mt-6">
        <Button color="gray" type="button" onClick={prevStep}>
          Back
        </Button>
        <Button color="warning" type="submit" className="bg-gold-500">
          Next
        </Button>
      </div>
    </form>
  );
};

export default MembershipInfoStep;
