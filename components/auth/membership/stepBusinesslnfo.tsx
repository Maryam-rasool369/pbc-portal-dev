import React, { useEffect, useState } from "react";
import {
  Button,
  Checkbox,
  Label,
  Select,
  Spinner,
  TextInput,
  Textarea,
} from "flowbite-react";
import { toast } from "react-toastify";
import useAuthStore from "@/store/authStore";
import { fetchBusinessGroups } from "@/services/businessGroups";
import { BusinessGroup } from "@/types/businessGroup";
import { City, Country } from "country-state-city";

interface Props {
  nextStep: (values: {
    companyName: string;
    businessAddress: string;
    country: string;
    city: string;
    tradeLicenseNumber: string;
    tradeLicenseExpiry: string;
    yearOfEstablishment: string;
    affiliation: string;
    legalStatus: string;
    natureOfBusiness: string;
    businessGroup: number[];
    keywords: string;
    hsCodes: string;
    website: string;
    noOfEmployees: string;
    vatRegistrationNumber: string;
    emiratesIssuingAuthority: string;
  }) => void;
  prevStep: () => void;
  initialValues?: Partial<{
    companyName: string;
    businessAddress: string;
    country: string;
    city: string;
    tradeLicenseNumber: string;
    tradeLicenseExpiry: string;
    yearOfEstablishment: string;
    affiliation: string;
    legalStatus: string;
    natureOfBusiness: string;
    businessGroup: number[];
    keywords: string;
    hsCodes: string;
    website: string;
    noOfEmployees: string;
    vatRegistrationNumber: string;
    emiratesIssuingAuthority: string;
  }>;
}

const BusinessInfoStep: React.FC<Props> = ({
  nextStep,
  prevStep,
  initialValues,
}) => {
  const token = useAuthStore((state) => state.token);
  const [countryIsoCode, setCountryIsoCode] = useState("");
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const countryOptions = Country.getAllCountries();
  const [formData, setFormData] = useState({
    companyName: "",
    businessAddress: "",
    country: "",
    city: "",
    tradeLicenseNumber: "",
    tradeLicenseExpiry: "",
    yearOfEstablishment: "",
    affiliation: "",
    legalStatus: "",
    natureOfBusiness: "",
    businessGroup: [] as number[],
    keywords: "",
    hsCodes: "",
    website: "",
    noOfEmployees: "",
    vatRegistrationNumber: "",
    emiratesIssuingAuthority: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [businessGroupOptions, setBusinessGroupOptions] = useState<BusinessGroup[]>(
    [],
  );
  const [businessGroupSearch, setBusinessGroupSearch] = useState("");
  const [hsCodeInput, setHsCodeInput] = useState("");
  const [loadingBusinessGroups, setLoadingBusinessGroups] = useState(false);

  const normalizedBusinessGroupSearch = businessGroupSearch
    .trim()
    .toLowerCase();
  const filteredBusinessGroupOptions = businessGroupOptions.filter((group) =>
    group.name.toLowerCase().includes(normalizedBusinessGroupSearch),
  );

  useEffect(() => {
    const loadBusinessGroups = async () => {
      if (!token) return;
      setLoadingBusinessGroups(true);
      try {
        const result = await fetchBusinessGroups(token, 1, 100);
        setBusinessGroupOptions(result.data);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load business groups.",
        );
      } finally {
        setLoadingBusinessGroups(false);
      }
    };

    loadBusinessGroups();
  }, [token]);

  useEffect(() => {
    if (!initialValues) return;

    setFormData((prev) => ({
      ...prev,
      ...Object.fromEntries(
        Object.entries(initialValues).filter(([, value]) => value != null),
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

  const toggleBusinessGroup = (groupId: number) => {
    setFormData((prev) => {
      const exists = prev.businessGroup.includes(groupId);
      const businessGroup = exists
        ? prev.businessGroup.filter((id) => id !== groupId)
        : [...prev.businessGroup, groupId];

      return { ...prev, businessGroup };
    });
    setErrors((prev) => ({ ...prev, businessGroup: "" }));
  };

  const getHsCodes = () =>
    formData.hsCodes
      .split(",")
      .map((code) => code.trim())
      .filter(Boolean);

  const addHsCode = () => {
    const hsCode = hsCodeInput.trim();
    const hsCodePattern = /^\d{4}\.\d{4}$/;
    if (!hsCodePattern.test(hsCode)) {
      toast.error("HS Code must be in format: 1234.1234");
      return;
    }

    const existingCodes = getHsCodes();
    if (existingCodes.includes(hsCode)) {
      toast.warning("This HS Code is already added");
      return;
    }

    const updatedCodes = [...existingCodes, hsCode];
    setFormData((prev) => ({ ...prev, hsCodes: updatedCodes.join(", ") }));
    setHsCodeInput("");
    setErrors((prev) => ({ ...prev, hsCodes: "" }));
  };

  const removeHsCode = (hsCode: string) => {
    const updatedCodes = getHsCodes().filter((code) => code !== hsCode);
    setFormData((prev) => ({ ...prev, hsCodes: updatedCodes.join(", ") }));
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    const currentYear = new Date().getFullYear();
    const expiryDate = new Date(formData.tradeLicenseExpiry);
    const today = new Date();

    if (!formData.companyName.trim())
      newErrors.companyName = "This field is required.";
    if (!formData.businessAddress.trim())
      newErrors.businessAddress = "This field is required.";
    if (!formData.country.trim()) newErrors.country = "This field is required.";
    if (!formData.city.trim()) newErrors.city = "This field is required.";
    if (formData.tradeLicenseNumber.trim() && !formData.tradeLicenseExpiry) {
      newErrors.tradeLicenseExpiry = "Expiry date is required when a trade license number is provided.";
    } else if (formData.tradeLicenseExpiry && expiryDate < today) {
      newErrors.tradeLicenseExpiry = "Expiry date cannot be in the past.";
    }

    const year = Number(formData.yearOfEstablishment);
    if (!formData.yearOfEstablishment.trim()) {
      newErrors.yearOfEstablishment = "This field is required.";
    } else if (isNaN(year) || year < 1800 || year > currentYear) {
      newErrors.yearOfEstablishment = "Enter a valid year.";
    }

    if (!formData.affiliation.trim())
      newErrors.affiliation = "This field is required.";
    if (!formData.legalStatus.trim())
      newErrors.legalStatus = "This field is required.";
    if (!formData.natureOfBusiness.trim())
      newErrors.natureOfBusiness = "This field is required.";
    if (!formData.businessGroup.length)
      newErrors.businessGroup = "Select at least one business group.";
    if (!formData.keywords.trim())
      newErrors.keywords = "This field is required.";
    const hsCodes = getHsCodes();
    if (!hsCodes.length) {
      newErrors.hsCodes = "This field is required.";
    } else if (hsCodes.some((code) => !/^\d{4}\.\d{4}$/.test(code))) {
      newErrors.hsCodes = "HS Code must be in format: 1234.1234";
    }
    if (!formData.website.trim()) {
      newErrors.website = "This field is required.";
    }
    if (!formData.noOfEmployees.trim()) {
      newErrors.noOfEmployees = "This field is required.";
    }
    if (!formData.vatRegistrationNumber.trim())
      newErrors.vatRegistrationNumber = "This field is required.";
    if (!formData.emiratesIssuingAuthority.trim())
      newErrors.emiratesIssuingAuthority = "This field is required.";

    if (formData.website.trim()) {
      try {
        new URL(formData.website);
      } catch {
        newErrors.website = "Enter a valid URL.";
      }
    }

    const employees = formData.noOfEmployees.trim();
    if (employees && (!/^\d+$/.test(employees) || Number(employees) < 1)) {
      newErrors.noOfEmployees = "Enter a valid number.";
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
      <h2 className="text-xl font-bold text-gold-300">Business Information</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="companyName">Company Name</Label>
          <TextInput
            id="companyName"
            value={formData.companyName}
            onChange={(e) => handleChange("companyName", e.target.value)}
            color={errors.companyName ? "failure" : undefined}
          />
          {errors.companyName && (
            <p className="text-red-600 text-sm">{errors.companyName}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="businessAddress">Business Address</Label>
          <Textarea
            id="businessAddress"
            value={formData.businessAddress}
            onChange={(e) => handleChange("businessAddress", e.target.value)}
            rows={4}
            color={errors.businessAddress ? "failure" : undefined}
          />
          {errors.businessAddress && (
            <p className="text-red-600 text-sm">{errors.businessAddress}</p>
          )}
        </div>

        <div>
          <Label htmlFor="country">Country of Residence</Label>
          <Select
            id="country"
            value={formData.country}
            onChange={(e) => {
              const selectedCountryName = e.target.value;
              handleChange("country", selectedCountryName);
              const selectedCountry = countryOptions.find(
                (country) => country.name === selectedCountryName,
              );
              setCountryIsoCode(selectedCountry?.isoCode || "");
              handleChange("city", "");
            }}
            color={errors.country ? "failure" : undefined}
          >
            <option value="">Choose country</option>
            {countryOptions.map((country) => (
              <option key={country.isoCode} value={country.name}>
                {country.name}
              </option>
            ))}
          </Select>
          {errors.country && (
            <p className="text-red-600 text-sm">{errors.country}</p>
          )}
        </div>

        <div>
          <Label htmlFor="city">City of Residence</Label>
          <Select
            id="city"
            value={formData.city}
            onChange={(e) => handleChange("city", e.target.value)}
            disabled={!formData.country}
            color={errors.city ? "failure" : undefined}
          >
            <option value="">Choose city</option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </Select>
          {errors.city && <p className="text-red-600 text-sm">{errors.city}</p>}
        </div>

        <div>
          <Label htmlFor="tradeLicenseNumber">Trade License Number (Optional)</Label>
          <TextInput
            id="tradeLicenseNumber"
            value={formData.tradeLicenseNumber}
            onChange={(e) => handleChange("tradeLicenseNumber", e.target.value)}
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
            onChange={(e) => handleChange("tradeLicenseExpiry", e.target.value)}
            color={errors.tradeLicenseExpiry ? "failure" : undefined}
          />
          {errors.tradeLicenseExpiry && (
            <p className="text-red-600 text-sm">{errors.tradeLicenseExpiry}</p>
          )}
        </div>

        <div>
          <Label htmlFor="yearOfEstablishment">Year of Establishment</Label>
          <TextInput
            id="yearOfEstablishment"
            type="number"
            placeholder="YYYY"
            value={formData.yearOfEstablishment}
            onChange={(e) =>
              handleChange("yearOfEstablishment", e.target.value)
            }
            color={errors.yearOfEstablishment ? "failure" : undefined}
          />
          {errors.yearOfEstablishment && (
            <p className="text-red-600 text-sm">{errors.yearOfEstablishment}</p>
          )}
        </div>

        <div>
          <Label htmlFor="affiliation">
            Affiliation with Other Orgs.
          </Label>
          <TextInput
            id="affiliation"
            value={formData.affiliation}
            onChange={(e) => handleChange("affiliation", e.target.value)}
            color={errors.affiliation ? "failure" : undefined}
          />
          {errors.affiliation && (
            <p className="text-red-600 text-sm">{errors.affiliation}</p>
          )}
        </div>

        <div>
          <Label htmlFor="legalStatus">Legal Status</Label>
          <TextInput
            id="legalStatus"
            placeholder="e.g. LLC, Sole Proprietor"
            value={formData.legalStatus}
            onChange={(e) => handleChange("legalStatus", e.target.value)}
            color={errors.legalStatus ? "failure" : undefined}
          />
          {errors.legalStatus && (
            <p className="text-red-600 text-sm">{errors.legalStatus}</p>
          )}
        </div>

        <div>
          <Label htmlFor="natureOfBusiness">Nature of Business</Label>
          <TextInput
            id="natureOfBusiness"
            placeholder="IT, Education, etc."
            value={formData.natureOfBusiness}
            onChange={(e) => handleChange("natureOfBusiness", e.target.value)}
            color={errors.natureOfBusiness ? "failure" : undefined}
          />
          {errors.natureOfBusiness && (
            <p className="text-red-600 text-sm">{errors.natureOfBusiness}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="businessGroup">Business Groups</Label>
          <TextInput
            id="businessGroupSearch"
            className="mt-2"
            placeholder="Search business groups"
            value={businessGroupSearch}
            onChange={(e) => setBusinessGroupSearch(e.target.value)}
          />
          <div className="mt-2 border border-gray-700 rounded-lg p-3 bg-gray-900/50 h-56 overflow-y-auto space-y-2">
            {loadingBusinessGroups && (
              <p className="text-sm text-gray-300 flex items-center gap-2">
                <Spinner size="sm" /> Loading business groups...
              </p>
            )}
            {!loadingBusinessGroups &&
              filteredBusinessGroupOptions.map((group) => (
                <label
                  key={group.id}
                  className="flex items-center gap-2 text-white text-sm"
                >
                  <Checkbox
                    checked={formData.businessGroup.includes(group.id)}
                    onChange={() => toggleBusinessGroup(group.id)}
                  />
                  {group.name}
                </label>
              ))}
            {!loadingBusinessGroups && !businessGroupOptions.length && (
              <p className="text-sm text-gray-400">
                No business groups found. Please contact support.
              </p>
            )}
            {!loadingBusinessGroups &&
              !!businessGroupOptions.length &&
              !filteredBusinessGroupOptions.length && (
                <p className="text-sm text-gray-400">
                  No business groups match your search.
                </p>
              )}
          </div>
          {errors.businessGroup && (
            <p className="text-red-600 text-sm">{errors.businessGroup}</p>
          )}
        </div>

        <div>
          <Label htmlFor="keywords">Keywords</Label>
          <TextInput
            id="keywords"
            placeholder="services, legal, consultation"
            value={formData.keywords}
            onChange={(e) => handleChange("keywords", e.target.value)}
          />
          {errors.keywords && (
            <p className="text-red-600 text-sm">{errors.keywords}</p>
          )}
        </div>

        <div>
          <Label htmlFor="hsCodes">HS Codes</Label>
          <div className="mt-2 flex gap-2">
            <TextInput
              id="hsCodes"
              placeholder="Enter HS Code (e.g., 1234.5678)"
              value={hsCodeInput}
              onChange={(e) => setHsCodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addHsCode();
                }
              }}
              color={errors.hsCodes ? "failure" : undefined}
            />
            <Button
              type="button"
              color="gray"
              onClick={addHsCode}
              disabled={!hsCodeInput.trim()}
            >
              Add
            </Button>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Format: 4 digits, dot, 4 digits (e.g., 1234.5678). Press Enter or click Add.
          </p>
          {!!getHsCodes().length && (
            <div className="mt-2 flex flex-wrap gap-2">
              {getHsCodes().map((code) => (
                <span
                  key={code}
                  className="inline-flex items-center gap-2 rounded-md bg-gray-800 px-2 py-1 text-xs text-white"
                >
                  {code}
                  <button
                    type="button"
                    onClick={() => removeHsCode(code)}
                    className="text-gray-300 hover:text-white"
                    aria-label={`Remove ${code}`}
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          )}
          {errors.hsCodes && (
            <p className="text-red-600 text-sm">{errors.hsCodes}</p>
          )}
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
          />
          {errors.website && (
            <p className="text-red-600 text-sm">{errors.website}</p>
          )}
        </div>

        <div>
          <Label htmlFor="noOfEmployees">Number of Employees</Label>
          <TextInput
            id="noOfEmployees"
            type="number"
            value={formData.noOfEmployees}
            onChange={(e) => handleChange("noOfEmployees", e.target.value)}
            color={errors.noOfEmployees ? "failure" : undefined}
          />
          {errors.noOfEmployees && (
            <p className="text-red-600 text-sm">{errors.noOfEmployees}</p>
          )}
        </div>

        <div>
          <Label htmlFor="vatRegistrationNumber">VAT Registration Number</Label>
          <TextInput
            id="vatRegistrationNumber"
            value={formData.vatRegistrationNumber}
            onChange={(e) =>
              handleChange("vatRegistrationNumber", e.target.value)
            }
            color={errors.vatRegistrationNumber ? "failure" : undefined}
          />
          {errors.vatRegistrationNumber && (
            <p className="text-red-600 text-sm">{errors.vatRegistrationNumber}</p>
          )}
        </div>

        <div>
          <Label htmlFor="emiratesIssuingAuthority">
            Emirates / Issuing Authority
          </Label>
          <TextInput
            id="emiratesIssuingAuthority"
            value={formData.emiratesIssuingAuthority}
            onChange={(e) =>
              handleChange("emiratesIssuingAuthority", e.target.value)
            }
            color={errors.emiratesIssuingAuthority ? "failure" : undefined}
          />
          {errors.emiratesIssuingAuthority && (
            <p className="text-red-600 text-sm">{errors.emiratesIssuingAuthority}</p>
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

export default BusinessInfoStep;
