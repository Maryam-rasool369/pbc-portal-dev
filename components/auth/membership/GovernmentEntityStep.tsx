import React, { useEffect, useState } from "react";
import { Button, Label, Select, TextInput, Textarea } from "flowbite-react";
import { toast } from "react-toastify";
import useAuthStore from "@/store/authStore";
import { fetchOrganizations, Organization } from "@/services/organization";
import { City, Country } from "country-state-city";

interface Props {
  nextStep: (values: {
    country: string;
    city: string;
    designation: string;
    govtStAddress: string;
    organizationId: number;
    passportNumber: string;
    passportExpiryDate: string;
    emiratesId?: string;
    emiratesIdExpiryDate?: string;
    tradeLicenseNumber?: string;
    tradeLicenseExpiry?: string;
  }) => void;
  prevStep: () => void;
  isResident: boolean;
  initialValues?: Partial<{
    country: string;
    city: string;
    designation: string;
    govtStAddress: string;
    organizationId: number;
    passportNumber: string;
    passportExpiryDate: string;
    emiratesId: string;
    emiratesIdExpiryDate: string;
    tradeLicenseNumber?: string;
    tradeLicenseExpiry?: string;
  }>;
}

const GovernmentEntityStep: React.FC<Props> = ({
  nextStep,
  prevStep,
  isResident,
  initialValues,
}) => {
  const token = useAuthStore((state) => state.token);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [countryIsoCode, setCountryIsoCode] = useState("");
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const countryOptions = Country.getAllCountries();
  const [formData, setFormData] = useState({
    country: "",
    city: "",
    designation: "",
    govtStAddress: "",
    organizationId: "",
    passportNumber: "",
    passportExpiryDate: "",
    emiratesId: "",
    emiratesIdExpiryDate: "",
    tradeLicenseNumber: "",
    tradeLicenseExpiry: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadOrganizations = async () => {
      if (!token) return;
      try {
        const result = await fetchOrganizations(token, 1, 100);
        setOrganizations(result.data);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load organizations.",
        );
      }
    };

    loadOrganizations();
  }, [token]);

  useEffect(() => {
    if (!initialValues) return;

    setFormData((prev) => ({
      ...prev,
      ...Object.fromEntries(
        Object.entries(initialValues).map(([key, value]) => [
          key,
          value == null ? "" : String(value),
        ]),
      ),
    }));

    if (initialValues.country) {
      const selectedCountry = countryOptions.find(
        (country) => country.name === initialValues.country,
      );
      if (selectedCountry) {
        setCountryIsoCode(selectedCountry.isoCode);
      }
    }
  }, [initialValues]);

  useEffect(() => {
    if (!countryIsoCode) {
      setCityOptions([]);
      return;
    }

    const cities = City.getCitiesOfCountry(countryIsoCode) || [];
    setCityOptions(
      Array.from(new Set(cities.map((city) => city.name))).sort(),
    );
  }, [countryIsoCode]);

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    const requiredFields = [
      "country",
      "city",
      "designation",
      "govtStAddress",
      "organizationId",
      "passportNumber",
      "passportExpiryDate",
      ...(isResident ? ["emiratesId", "emiratesIdExpiryDate"] : []),
    ];

    requiredFields.forEach((key) => {
      const value = formData[key as keyof typeof formData];
      if (!value.trim()) {
        nextErrors[key] = "This field is required.";
      }
    });

    // Trade license validation: if license number is provided, expiry is mandatory
    if (formData.tradeLicenseNumber.trim()) {
      if (!formData.tradeLicenseExpiry.trim()) {
        nextErrors.tradeLicenseExpiry = "Trade license expiry date is required when license number is provided.";
      }
    }

    if (isResident && formData.emiratesId && !/^\d{15}$/.test(formData.emiratesId)) {
      nextErrors.emiratesId = "Emirates ID must be 15 digits.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
      country: formData.country,
      city: formData.city,
      designation: formData.designation,
      govtStAddress: formData.govtStAddress,
      organizationId: Number(formData.organizationId),
      passportNumber: formData.passportNumber,
      passportExpiryDate: formData.passportExpiryDate,
      ...(isResident
        ? {
            emiratesId: formData.emiratesId,
            emiratesIdExpiryDate: formData.emiratesIdExpiryDate,
          }
        : {}),
      ...(formData.tradeLicenseNumber.trim()
        ? { tradeLicenseNumber: formData.tradeLicenseNumber }
        : {}),
      ...(formData.tradeLicenseExpiry.trim()
        ? { tradeLicenseExpiry: formData.tradeLicenseExpiry }
        : {}),
    };

    nextStep(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-bold text-gold-300">
        Government Entity Information
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="country">Country</Label>
          <Select
            id="country"
            value={formData.country}
            onChange={(event) => {
              const selectedCountryName = event.target.value;
              handleChange("country", selectedCountryName);
              const selectedCountry = countryOptions.find(
                (country) => country.name === selectedCountryName,
              );
              setCountryIsoCode(selectedCountry?.isoCode || "");
              handleChange("city", "");
            }}
            color={errors.country ? "failure" : undefined}
          >
            <option value="">Select country</option>
            {countryOptions.map((country) => (
              <option key={country.isoCode} value={country.name}>
                {country.name}
              </option>
            ))}
          </Select>
          {errors.country && <p className="text-red-600 text-sm">{errors.country}</p>}
        </div>

        <div>
          <Label htmlFor="city">City</Label>
          <Select
            id="city"
            value={formData.city}
            onChange={(event) => handleChange("city", event.target.value)}
            disabled={!formData.country}
            color={errors.city ? "failure" : undefined}
          >
            <option value="">Select city</option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </Select>
          {errors.city && <p className="text-red-600 text-sm">{errors.city}</p>}
        </div>

        <div>
          <Label htmlFor="designation">Designation</Label>
          <TextInput
            id="designation"
            value={formData.designation}
            onChange={(event) => handleChange("designation", event.target.value)}
            color={errors.designation ? "failure" : undefined}
          />
          {errors.designation && (
            <p className="text-red-600 text-sm">{errors.designation}</p>
          )}
        </div>

        <div>
          <Label htmlFor="organizationId">Organization</Label>
          <Select
            id="organizationId"
            value={formData.organizationId}
            onChange={(event) => handleChange("organizationId", event.target.value)}
            color={errors.organizationId ? "failure" : undefined}
          >
            <option value="">Select organization</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </Select>
          {errors.organizationId && (
            <p className="text-red-600 text-sm">{errors.organizationId}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="govtStAddress">Government Street Address</Label>
          <Textarea
            id="govtStAddress"
            rows={3}
            value={formData.govtStAddress}
            onChange={(event) => handleChange("govtStAddress", event.target.value)}
            color={errors.govtStAddress ? "failure" : undefined}
          />
          {errors.govtStAddress && (
            <p className="text-red-600 text-sm">{errors.govtStAddress}</p>
          )}
        </div>

        <div>
          <Label htmlFor="passportNumber">Passport Number</Label>
          <TextInput
            id="passportNumber"
            value={formData.passportNumber}
            onChange={(event) =>
              handleChange("passportNumber", event.target.value)
            }
            color={errors.passportNumber ? "failure" : undefined}
          />
          {errors.passportNumber && (
            <p className="text-red-600 text-sm">{errors.passportNumber}</p>
          )}
        </div>

        <div>
          <Label htmlFor="passportExpiryDate">Passport Expiry Date</Label>
          <TextInput
            id="passportExpiryDate"
            type="date"
            value={formData.passportExpiryDate}
            onChange={(event) =>
              handleChange("passportExpiryDate", event.target.value)
            }
            color={errors.passportExpiryDate ? "failure" : undefined}
          />
          {errors.passportExpiryDate && (
            <p className="text-red-600 text-sm">{errors.passportExpiryDate}</p>
          )}
        </div>

        {isResident && (
          <>
            <div>
              <Label htmlFor="emiratesId">Emirates ID</Label>
              <TextInput
                id="emiratesId"
                value={formData.emiratesId}
                onChange={(event) => handleChange("emiratesId", event.target.value)}
                color={errors.emiratesId ? "failure" : undefined}
              />
              {errors.emiratesId && (
                <p className="text-red-600 text-sm">{errors.emiratesId}</p>
              )}
            </div>

            <div>
              <Label htmlFor="emiratesIdExpiryDate">Emirates ID Expiry Date</Label>
              <TextInput
                id="emiratesIdExpiryDate"
                type="date"
                value={formData.emiratesIdExpiryDate}
                onChange={(event) =>
                  handleChange("emiratesIdExpiryDate", event.target.value)
                }
                color={errors.emiratesIdExpiryDate ? "failure" : undefined}
              />
              {errors.emiratesIdExpiryDate && (
                <p className="text-red-600 text-sm">{errors.emiratesIdExpiryDate}</p>
              )}
            </div>
          </>
        )}

        <div>
          <Label htmlFor="tradeLicenseNumber">Trade License Number (Optional)</Label>
          <TextInput
            id="tradeLicenseNumber"
            value={formData.tradeLicenseNumber}
            onChange={(event) =>
              handleChange("tradeLicenseNumber", event.target.value)
            }
            color={errors.tradeLicenseNumber ? "failure" : undefined}
          />
          {errors.tradeLicenseNumber && (
            <p className="text-red-600 text-sm">{errors.tradeLicenseNumber}</p>
          )}
        </div>

        <div>
          <Label htmlFor="tradeLicenseExpiry">Trade License Expiry Date (Optional)</Label>
          <TextInput
            id="tradeLicenseExpiry"
            type="date"
            value={formData.tradeLicenseExpiry}
            onChange={(event) =>
              handleChange("tradeLicenseExpiry", event.target.value)
            }
            color={errors.tradeLicenseExpiry ? "failure" : undefined}
          />
          {errors.tradeLicenseExpiry && (
            <p className="text-red-600 text-sm">{errors.tradeLicenseExpiry}</p>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <Button type="button" color="gray" onClick={prevStep}>
          Back
        </Button>
        <Button type="submit" color="warning" className="bg-gold-500">
          Submit
        </Button>
      </div>
    </form>
  );
};

export default GovernmentEntityStep;
