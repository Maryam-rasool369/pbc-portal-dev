import React, { useState, useEffect } from "react";
import { getCountries, getCountryCallingCode } from "libphonenumber-js";

interface Props {
  nextStep: (formData: {
    name: string;
    email: string;
    countryCode: string;
    phone: string;
    password: string;
    confirmPassword: string;
  }) => void;
}

export default function StepOne({ nextStep }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [countryOptions, setCountryOptions] = useState<
    { code: string; label: string }[]
  >([]);

  useEffect(() => {
    const loadCountryCodes = () => {
      const countries = getCountries();
      const options = countries.map((country) => {
        const dialCode = getCountryCallingCode(country);
        return {
          code: `+${dialCode}`,
          label: `${country.toUpperCase()} +${dialCode}`,
        };
      });
      setCountryOptions(options);
      const defaultCode =
        options.find((opt) => opt.code === "+971")?.code || options[0].code;
      setCountryCode(defaultCode);
    };

    loadCountryCodes();
  }, []);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = "Invalid email";
    if (!phone.trim()) newErrors.phone = "Phone number is required";
    else if (!/^\d{7,15}$/.test(phone))
      newErrors.phone = "Invalid phone number";
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 6)
      newErrors.password = "Password must be at least 6 characters";
    if (!confirmPassword) newErrors.confirmPassword = "Confirm your password";
    else if (password !== confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    if (!acceptedTerms) newErrors.acceptedTerms = "You must accept terms & conditions";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    nextStep({ name, email, countryCode, phone, password, confirmPassword });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 my-4">
      <div>
        <label
          htmlFor="name"
          className="block mb-2 text-sm font-medium text-white"
        >
          Name*
        </label>
        <input
          type="text"
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          className={`bg-gray-50 border ${
            errors.name ? "border-red-500" : "border-gray-300"
          } text-gray-900 sm:text-sm rounded-lg block w-full p-2.5`}
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="email"
          className="block mb-2 text-sm font-medium text-white"
        >
          Email*
        </label>
        <input
          type="email"
          id="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
          className={`bg-gray-50 border ${
            errors.email ? "border-red-500" : "border-gray-300"
          } text-gray-900 sm:text-sm rounded-lg block w-full p-2.5`}
        />
        {errors.email && (
          <p className="text-red-500 text-sm mt-1">{errors.email}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="phone"
          className="block mb-2 text-sm font-medium text-white"
        >
          Phone*
        </label>
        <div className="flex space-x-2">
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg p-2.5"
          >
            {countryOptions.map(({ code, label }) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="tel"
            id="phone"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter remaining phone number"
            className={`flex-grow bg-gray-50 border ${
              errors.phone ? "border-red-500" : "border-gray-300"
            } text-gray-900 sm:text-sm rounded-lg p-2.5`}
          />
        </div>
        {errors.phone && (
          <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="block mb-2 text-sm font-medium text-white"
        >
          Password*
        </label>
        <input
          type="password"
          id="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password"
          className={`bg-gray-50 border ${
            errors.password ? "border-red-500" : "border-gray-300"
          } text-gray-900 sm:text-sm rounded-lg block w-full p-2.5`}
        />
        {errors.password && (
          <p className="text-red-500 text-sm mt-1">{errors.password}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="block mb-2 text-sm font-medium text-white"
        >
          Confirm Password*
        </label>
        <input
          type="password"
          id="confirmPassword"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your password"
          className={`bg-gray-50 border ${
            errors.confirmPassword ? "border-red-500" : "border-gray-300"
          } text-gray-900 sm:text-sm rounded-lg block w-full p-2.5`}
        />
        {errors.confirmPassword && (
          <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
        )}
      </div>

      <div>
        <label className="flex items-start gap-2 text-sm text-white">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => {
              setAcceptedTerms(e.target.checked);
              if (e.target.checked) {
                setErrors((prev) => ({ ...prev, acceptedTerms: "" }));
              }
            }}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-gold-500 focus:ring-gold-400"
          />
          <span>
            I accept {" "}
            <a
              href="/terms-and-conditions"
              className="text-gold-400 hover:text-gold-300 underline"
              target="_blank"
              rel="noreferrer"
            >
              terms & conditions
            </a>
          </span>
        </label>
        {errors.acceptedTerms && (
          <p className="text-red-500 text-sm mt-1">{errors.acceptedTerms}</p>
        )}
      </div>

      <button
        type="submit"
        className="w-full py-3 text-white bg-gold-500 rounded-lg hover:bg-gold-600 focus:ring-4 focus:ring-gold-300"
      >
        Register
      </button>
    </form>
  );
}
