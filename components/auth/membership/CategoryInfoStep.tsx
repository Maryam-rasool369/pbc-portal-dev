import React, { useEffect, useMemo, useState } from "react";
import { Button, Label, Select, Spinner } from "flowbite-react";
import { toast } from "react-toastify";
import useAuthStore from "@/store/authStore";
import {
  fetchAllMembershipCategories,
  MembershipCategory,
} from "@/services/membershipCategories";
import { fetchSubCategoriesByCategory } from "@/services/membershipSubCategory";

interface Props {
  nextStep: (values: {
    membershipCategoryId: number;
    membershipSubCategoryId: number;
    isGovernmentEntity: boolean;
  }) => void;
  initialValues?: Partial<{
    membershipCategoryId: number;
    membershipSubCategoryId: number;
  }>;
  prevStep?: () => void;
}

interface SubCategoryOption {
  id: number;
  name: string;
}

const CategoryInfoStep: React.FC<Props> = ({
  nextStep,
  initialValues,
  prevStep,
}) => {
  const token = useAuthStore((state) => state.token);
  const [categories, setCategories] = useState<MembershipCategory[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryOption[]>([]);
  const [membershipCategoryId, setMembershipCategoryId] = useState<number | null>(
    null,
  );
  const [membershipSubCategoryId, setMembershipSubCategoryId] = useState<
    number | null
  >(null);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubCategories, setLoadingSubCategories] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadCategories = async () => {
      if (!token) return;
      setLoadingCategories(true);
      try {
        const data = await fetchAllMembershipCategories(token);
        setCategories(data);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load membership categories.",
        );
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, [token]);

  useEffect(() => {
    const loadSubCategories = async () => {
      if (!token || !membershipCategoryId) {
        setSubCategories([]);
        setMembershipSubCategoryId(null);
        return;
      }

      setLoadingSubCategories(true);
      try {
        const data = await fetchSubCategoriesByCategory(token, membershipCategoryId);
        setSubCategories(data.map((item) => ({ id: item.id, name: item.name })));
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load membership sub-categories.",
        );
        setSubCategories([]);
      } finally {
        setLoadingSubCategories(false);
      }
    };

    loadSubCategories();
  }, [membershipCategoryId, token]);

  useEffect(() => {
    if (!initialValues) return;

    if (typeof initialValues.membershipCategoryId === "number") {
      setMembershipCategoryId(initialValues.membershipCategoryId);
    }

    if (typeof initialValues.membershipSubCategoryId === "number") {
      setMembershipSubCategoryId(initialValues.membershipSubCategoryId);
    }
  }, [initialValues]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === membershipCategoryId),
    [categories, membershipCategoryId],
  );

  const isGovernmentEntity = useMemo(() => {
    if (!selectedCategory) return false;
    return (
      selectedCategory.id === 1 ||
      selectedCategory.name.toLowerCase().includes("government")
    );
  }, [selectedCategory]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};

    if (!membershipCategoryId) {
      nextErrors.membershipCategoryId = "Membership category is required.";
    }

    if (!membershipSubCategoryId) {
      nextErrors.membershipSubCategoryId = "Membership sub-category is required.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    nextStep({
      membershipCategoryId: membershipCategoryId as number,
      membershipSubCategoryId: membershipSubCategoryId as number,
      isGovernmentEntity,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-bold text-gold-300">Membership Category</h2>

      <div>
        <Label htmlFor="membershipCategoryId">Category</Label>
        <Select
          id="membershipCategoryId"
          value={membershipCategoryId ?? ""}
          onChange={(event) => {
            const value = Number(event.target.value) || null;
            setMembershipCategoryId(value);
            setMembershipSubCategoryId(null);
            setErrors((prev) => ({ ...prev, membershipCategoryId: "" }));
          }}
          disabled={loadingCategories || !token}
          color={errors.membershipCategoryId ? "failure" : undefined}
        >
          <option value="">Select category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        {loadingCategories && (
          <p className="text-sm text-gray-300 mt-2 flex items-center gap-2">
            <Spinner size="sm" /> Loading categories...
          </p>
        )}
        {errors.membershipCategoryId && (
          <p className="text-red-600 text-sm">{errors.membershipCategoryId}</p>
        )}
      </div>

      <div>
        <Label htmlFor="membershipSubCategoryId">Sub-Category</Label>
        <Select
          id="membershipSubCategoryId"
          value={membershipSubCategoryId ?? ""}
          onChange={(event) => {
            const value = Number(event.target.value) || null;
            setMembershipSubCategoryId(value);
            setErrors((prev) => ({ ...prev, membershipSubCategoryId: "" }));
          }}
          disabled={!membershipCategoryId || loadingSubCategories || !token}
          color={errors.membershipSubCategoryId ? "failure" : undefined}
        >
          <option value="">Select sub-category</option>
          {subCategories.map((subCategory) => (
            <option key={subCategory.id} value={subCategory.id}>
              {subCategory.name}
            </option>
          ))}
        </Select>
        {loadingSubCategories && (
          <p className="text-sm text-gray-300 mt-2 flex items-center gap-2">
            <Spinner size="sm" /> Loading sub-categories...
          </p>
        )}
        {errors.membershipSubCategoryId && (
          <p className="text-red-600 text-sm">{errors.membershipSubCategoryId}</p>
        )}
      </div>

      <div className="flex justify-between">
        <Button type="button" color="gray" disabled>
          Back
        </Button>
        <Button type="submit" color="warning" className="bg-gold-500">
          Continue
        </Button>
      </div>
    </form>
  );
};

export default CategoryInfoStep;
