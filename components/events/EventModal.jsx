import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Modal,
  Button,
  Label,
  TextInput,
  Textarea,
  Spinner,
  Select,
} from "flowbite-react";
import { toast } from "react-toastify";
import { useLoadingStore } from "@/store/useLoadingStore";
import useAuthStore from "@/store/authStore";
import { DateTime } from "luxon";
import {
  formatDateWithTimezoneForAPI,
  getRelativeTimezoneOffset,
} from "@/utils/formatDateAndTime";
import { COMMON_TIMEZONES } from "@/constants/datetime";
import { ADMIN_ROLES, RoleIdStr } from "@/enums/Roles";
import { fetchAllMembershipCategories } from "@/services/membershipCategories";
import { fetchSubCategoriesByCategory } from "@/services/membershipSubCategory";

const CKEditorClient = dynamic(() => import("@/components/CKEditorClient"), {
  ssr: false,
  loading: () => <p className="text-gray-400">Loading Editor...</p>,
});

const BOARD_MEETING_ROLES = [
  RoleIdStr.ADMIN,
  RoleIdStr.CHAIRMAN,
  RoleIdStr.DIRECTOR,
  RoleIdStr.PBC_ADVISOR,
  RoleIdStr.GENERAL_SECRETARY,
  RoleIdStr.PBC_STAFF,
  RoleIdStr.VC_FINANCE,
];

const EventModal = ({ open, onClose, isEdit = false, existingData }) => {
  const [step, setStep] = useState(1);
  const userTimezone = DateTime.local().zoneName;

  const formatExistingDate = (dateString) => {
    if (!dateString) return "";
    try {
      return DateTime.fromISO(dateString).toFormat("yyyy-MM-dd'T'HH:mm");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  const [formData, setFormData] = useState({
    title: existingData?.title || "",
    details: existingData?.details || "",
    venue: existingData?.venue || "",
    startDate: existingData?.startDate
      ? formatExistingDate(existingData.startDate)
      : "",
    endDate: existingData?.endDate
      ? formatExistingDate(existingData.endDate)
      : "",
    timezone: userTimezone,
    userIds:
      existingData?.EventAssignee?.map((assignee) => assignee.userId) || [],
    eventType: existingData?.eventType || "REGULAR_EVENT",
    actionPoints: existingData?.actionPoints || [],
    guestFeeEnabled: existingData?.guestFeeEnabled || false,
    guestFee: existingData?.guestFee || "",
    maxGuestsPerMember: existingData?.maxGuestsPerMember || "",
  });

  const timezoneOptions = COMMON_TIMEZONES.map((tz) =>
    tz === "LOCAL_TIMEZONE_PLACEHOLDER" ? userTimezone : tz
  ).filter((tz, index, self) => self.indexOf(tz) === index);

  const [users, setUsers] = useState([]);
  const [pendingActionPoints, setPendingActionPoints] = useState([]);
  const [newActionPoint, setNewActionPoint] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingActionPoints, setIsLoadingActionPoints] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [membershipSubCategories, setMembershipSubCategories] = useState([]);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setLoading = useLoadingStore((state) => state.setLoading);
  const [membershipCategories, setMembershipCategories] = useState([]);
  const userListRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const editBaselineRef = useRef({
    title: "",
    details: "",
    venue: "",
    startDate: "",
    endDate: "",
    eventType: "REGULAR_EVENT",
    userIds: [],
    actionPoints: [],
  });

  const meetingTypes = [
    "BOARD_MEETING",
    "GENERAL_BODY_MEETING",
  ];
  const regularTypes = ["REGULAR_EVENT", "ANNUAL_GENERAL_MEETING"];
  const previousEventTypeRef = useRef(formData.eventType);

  const normalizeIdArray = (value) =>
    Array.isArray(value)
      ? [...new Set(value)].sort((a, b) => a - b)
      : [];

  const normalizeActionPoints = (value) =>
    Array.isArray(value)
      ? value.map((item) => ({
          description: item.description || "",
          assignedTo: item.assignedTo || null,
        }))
      : [];

  const canEditStartDate = true;
  const canEditEndDate = true;
  const isEndDateOnlyEditMode = false;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isEdit && existingData) {
      const baseline = {
        title: existingData.title || "",
        details: existingData.details || "",
        venue: existingData.venue || "",
        startDate: existingData.startDate
          ? formatExistingDate(existingData.startDate)
          : "",
        endDate: existingData.endDate
          ? formatExistingDate(existingData.endDate)
          : "",
        eventType: existingData.eventType || "REGULAR_EVENT",
        userIds:
          existingData.EventAssignee?.map((assignee) => assignee.userId) || [],
        actionPoints: existingData.actionPoints || [],
      };

      editBaselineRef.current = baseline;

      setFormData({
        title: baseline.title,
        details: baseline.details,
        venue: baseline.venue,
        startDate: baseline.startDate,
        endDate: baseline.endDate,
        timezone: userTimezone,
        userIds: baseline.userIds,
        eventType: baseline.eventType,
        actionPoints: baseline.actionPoints,
      });

      previousEventTypeRef.current = baseline.eventType;
    }
  }, [isEdit, existingData, userTimezone]);

  useEffect(() => {
    if (!isEdit) return;

    const previousEventType = previousEventTypeRef.current;
    if (previousEventType === formData.eventType) return;

    const wasRegular = regularTypes.includes(previousEventType);
    const isRegular = regularTypes.includes(formData.eventType);
    const isMeetingType = meetingTypes.includes(formData.eventType);

    if (wasRegular && isMeetingType) {
      setSelectedCategory("2");
      setSelectedSubCategory("");
      fetchUsers({ categoryId: "2", subCategoryId: "", resetUserIds: true });
    }

    if (!wasRegular && isRegular) {
      setSelectedCategory("");
      setSelectedSubCategory("");
      fetchUsers({ categoryId: "", subCategoryId: "", resetUserIds: false });
    }

    previousEventTypeRef.current = formData.eventType;
  }, [formData.eventType, isEdit]);

  const fetchMembershipCategories = async () => {
    try {
      const result = await fetchAllMembershipCategories(token);
      setMembershipCategories(result);
    } catch (error) {
      toast.error("Failed to fetch membership categories");
    }
  };

  const fetchUsers = async (options = {}) => {
    const {
      categoryId = selectedCategory,
      subCategoryId = selectedSubCategory,
      resetUserIds = !isEdit,
    } = options;
    setIsLoading(true);
    try {
      let url = `${process.env.NEXT_PUBLIC_API_URL}/api/user`;

      url += !!categoryId
        ? `/membership-category?status=active&membershipCategoryId=${encodeURIComponent(
            categoryId
          )}`
        : "/all/users?status=active&membership=verified&selfIncluded=false";

        if (meetingTypes.includes(formData.eventType)) {
        const roleParams = BOARD_MEETING_ROLES.join(",");
        url += (categoryId ? `&` : `?`) + `roleId=${roleParams}`;
      }

      // Add subcategory filter if selected
      if (subCategoryId) {
        url += (url.includes("?") ? "&" : "?") +
          `membershipSubCategoryId=${encodeURIComponent(subCategoryId)}`;
      }

      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          token: `${token}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        setUsers(data.data);

        if (resetUserIds) {
          setFormData((prev) => ({
            ...prev,
            userIds: [],
          }));
        }
      } else {
        toast.error(data?.error[0]?.msg || "Failed to fetch users");
        throw new Error(data?.error[0]?.msg || "Failed to fetch users");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingActionPoints = async () => {
    setIsLoadingActionPoints(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/event/action-point/pending`,
        {
          headers: {
            "Content-Type": "application/json",
            token: `${token}`,
          },
        }
      );

      const data = await res.json();
      if (res.ok) {
        setPendingActionPoints(data.data || []);
      } else {
        throw new Error(data?.error[0]?.msg || "Failed to fetch pending action points");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoadingActionPoints(false);
    }
  };

  useEffect(() => {
    if (step === 3 && meetingTypes.includes(formData.eventType) && !isEdit) {
      fetchPendingActionPoints();
    }
  }, [step, formData.eventType, isEdit]);

  useEffect(() => {
    if (step === 2) {
      fetchMembershipCategories();
      // Set category to 2 for all meeting types
      if (meetingTypes.includes(formData.eventType)) {
        if (!selectedCategory || selectedCategory !== "2") {
          setSelectedCategory("2");
        }
      } else {
        fetchUsers({ resetUserIds: !isEdit });
      }
    }
  }, [step, isEdit, formData.eventType]);

  useEffect(() => {
    if (step === 2) {
      fetchUsers({ resetUserIds: !isEdit });
    }
  }, [selectedCategory]);

  useEffect(() => {
    const fetchSubCategories = async () => {
      if (selectedCategory) {
        try {
          const subCategories = await fetchSubCategoriesByCategory(token, parseInt(selectedCategory));
          setMembershipSubCategories(subCategories);
        } catch (error) {
          console.error("Failed to fetch subcategories:", error);
          setMembershipSubCategories([]);
        }
      } else {
        setMembershipSubCategories([]);
        setSelectedSubCategory("");
      }
    };

    fetchSubCategories();
  }, [selectedCategory, token]);

  useEffect(() => {
    if (step === 2) {
      fetchUsers({ resetUserIds: !isEdit });
    }
  }, [selectedSubCategory]);

  const handleUserSelection = (userId) => {
    setFormData((prev) => ({
      ...prev,
      userIds: prev.userIds.includes(userId)
        ? prev.userIds.filter((id) => id !== userId)
        : [...prev.userIds, userId],
    }));
  };

  const handleSelectAll = () => {
    if (users.length === 0) return;

    if (formData.userIds.length === users.length) {
      setFormData((prev) => ({
        ...prev,
        userIds: [],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        userIds: users.map((user) => user.id),
      }));
    }
  };

  const handleAddActionPoint = () => {
    if (newActionPoint.trim()) {
      setFormData((prev) => ({
        ...prev,
        actionPoints: [...prev.actionPoints, { description: newActionPoint.trim() }],
      }));
      setNewActionPoint("");
    }
  };

  const handleAddPendingActionPoint = (actionPoint) => {
    const alreadyExists = formData.actionPoints.some(
      ap => ap.description === actionPoint.description
    );
    if (!alreadyExists) {
      setFormData((prev) => ({
        ...prev,
        actionPoints: [
          ...prev.actionPoints,
          {
            description: actionPoint.description,
            assignedTo: actionPoint.assignedTo || undefined
          }
        ],
      }));
    }
  };

  const handleRemoveActionPoint = (index) => {
    setFormData((prev) => ({
      ...prev,
      actionPoints: prev.actionPoints.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateActionPointAssignee = (index, userId) => {
    setFormData((prev) => ({
      ...prev,
      actionPoints: prev.actionPoints.map((ap, i) => 
        i === index ? { ...ap, assignedTo: userId ? parseInt(userId) : undefined } : ap
      ),
    }));
  };

  const validateStep1 = () => {
    if (
      !formData.title ||
      !formData.details ||
      !formData.startDate ||
      !formData.endDate ||
      !formData.venue
    ) {
      toast.error("Please fill all required fields");
      return false;
    }

    if (formData.title.length < 5) {
      toast.error("Title must be at least 5 characters");
      return false;
    }

    if (formData.details.length < 5) {
      toast.error("Details must be at least 5 characters");
      return false;
    }

    if (formData.venue.length < 5) {
      toast.error("Venue must be at least 5 characters");
      return false;
    }

    try {
      const startDate = DateTime.fromISO(formData.startDate);
      const endDate = DateTime.fromISO(formData.endDate);

      if (endDate <= startDate) {
        toast.error("End date must be after start date");
        return false;
      }
    } catch (error) {
      toast.error("Invalid date format");
      return false;
    }

    return true;
  };

  const getNextStep = () => {
    if (meetingTypes.includes(formData.eventType)) {
      if (step === 1) return 2; // User selection
      if (step === 2) return 3; // Action points
    }
    return 2; // Regular events go directly to user selection
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep1()) return;

    if (!isEdit && formData.userIds.length === 0) {
      toast.error("Please select at least one user");
      return;
    }

    setIsSubmitting(true);
    setLoading(true);

    const formattedData = {
      ...formData,
      startDate: formatDateWithTimezoneForAPI(
        formData.startDate,
        formData.timezone
      ),
      endDate: formatDateWithTimezoneForAPI(
        formData.endDate,
        formData.timezone
      ),
      ...(regularTypes.includes(formData.eventType) && {
        guestFeeEnabled: formData.guestFeeEnabled,
        ...(formData.guestFeeEnabled && {
          guestFee: parseFloat(formData.guestFee),
          maxGuestsPerMember: parseInt(formData.maxGuestsPerMember, 10),
        }),
      }),
    };

    delete formattedData.timezone;

    if (isEdit) {
      try {
        const baseline = editBaselineRef.current;
        const editPayload = {};
        const isMeetingType = meetingTypes.includes(formData.eventType);

        if (formData.title !== baseline.title) {
          editPayload.title = formData.title;
        }

        if (formData.details !== baseline.details) {
          editPayload.details = formData.details;
        }

        if (formData.venue !== baseline.venue) {
          editPayload.venue = formData.venue;
        }

        if (isEndDateOnlyEditMode) {
          if (formData.endDate !== baseline.endDate) {
            editPayload.endDate = formatDateWithTimezoneForAPI(
              formData.endDate,
              formData.timezone
            );
          }
        }

        if (canEditStartDate && formData.startDate !== baseline.startDate) {
          editPayload.startDate = formatDateWithTimezoneForAPI(
            formData.startDate,
            formData.timezone
          );
        }

        if (canEditEndDate && formData.endDate !== baseline.endDate) {
          editPayload.endDate = formatDateWithTimezoneForAPI(
            formData.endDate,
            formData.timezone
          );
        }

        if (formData.eventType !== baseline.eventType) {
          editPayload.eventType = formData.eventType;
        }

        const currentUserIds = normalizeIdArray(formData.userIds);
        const baselineUserIds = normalizeIdArray(baseline.userIds);
        const assigneesChanged =
          JSON.stringify(currentUserIds) !== JSON.stringify(baselineUserIds);

        if (assigneesChanged) {
          editPayload.userIds = currentUserIds;
        }

        if (isMeetingType) {
          const currentActionPoints = normalizeActionPoints(
            formData.actionPoints
          );
          const baselineActionPoints = normalizeActionPoints(
            baseline.actionPoints
          );
          const actionPointsChanged =
            JSON.stringify(currentActionPoints) !==
            JSON.stringify(baselineActionPoints);

          if (actionPointsChanged) {
            editPayload.actionPoints = formData.actionPoints;
          }
        }

        if (isEndDateOnlyEditMode) {
          delete editPayload.title;
          delete editPayload.details;
          delete editPayload.venue;
          delete editPayload.startDate;
        }

        if (Object.keys(editPayload).length === 0) {
          toast.info("No changes to update");
          setIsSubmitting(false);
          setLoading(false);
          return;
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/event/${existingData.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              token: `${token}`,
            },
            body: JSON.stringify(editPayload),
          }
        );

        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.error[0]?.msg || "Failed to update event");

        editBaselineRef.current = {
          ...editBaselineRef.current,
          title: formData.title,
          details: formData.details,
          venue: formData.venue,
          startDate: formData.startDate,
          endDate: formData.endDate,
          eventType: formData.eventType,
          userIds: normalizeIdArray(formData.userIds),
          actionPoints: normalizeActionPoints(formData.actionPoints),
        };

        toast.success(`Event ${isEdit ? "updated" : "created"} successfully!`);
        onClose();
      } catch (error) {
        toast.error(error.message);
      } finally {
        setIsSubmitting(false);
        setLoading(false);
      }
    } else {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/event/add`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              token: `${token}`,
            },
            body: JSON.stringify(formattedData),
          }
        );

        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.error[0]?.msg || "Failed to create event");

        toast.success(`Event ${isEdit ? "updated" : "created"} successfully!`);

        setFormData({
          title: "",
          details: "",
          venue: "",
          startDate: "",
          endDate: "",
          timezone: userTimezone,
          userIds: [],
          eventType: "REGULAR_EVENT",
          venue: "",
          actionPoints: [],
        });
        setStep(1);
        onClose();
      } catch (error) {
        toast.error(error.message);
      } finally {
        setIsSubmitting(false);
        setLoading(false);
      }
    }
  };

  const closeWithFormReset = () => {
    setFormData({
      title: "",
      details: "",
      venue: "",
      startDate: "",
      endDate: "",
      timezone: userTimezone,
      userIds: [],
      eventType: "REGULAR_EVENT",
      venue: "",
      actionPoints: [],
    });
    setStep(1);
    setSelectedCategory("");
    setSelectedSubCategory("");
    setMembershipSubCategories([]);
    onClose();
  };

  return (
    <Modal
      show={open}
      onClose={isSubmitting ? undefined : closeWithFormReset}
      size="2xl"
    >
      <Modal.Header className="border-b border-gold-500">
        <p className="text-xl font-serif text-gold-300">
          {isEdit ? "Edit Event" : "Create New Event"}
        </p>
      </Modal.Header>

      <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900 max-h-[calc(100vh-10rem)] overflow-y-auto">
        {step === 1 ? (
          <div className="space-y-6">
            {!isEndDateOnlyEditMode && (
              <div>
                <Label
                  htmlFor="title"
                  value={
                    <span>
                      Event Title <span className="text-red-500">*</span>
                    </span>
                  }
                  className="text-gold-500 mb-2 block"
                />
                <TextInput
                  id="title"
                  required
                  minLength={5}
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="border-gold-500 focus:ring-gold-500 focus:border-gold-500"
                  placeholder="Enter event title (minimum 5 characters)"
                  disabled={isSubmitting}
                />
              </div>
            )}

            {!isEndDateOnlyEditMode && (
              <div>
                <Label
                  htmlFor="eventType"
                  value={
                    <span>
                      Event Type{" "}
                      {!isEdit && <span className="text-red-500">*</span>}
                    </span>
                  }
                  className="text-gold-500 mb-2 block"
                />
                <Select
                  id="eventType"
                  required
                  value={formData.eventType}
                  onChange={(e) =>
                    setFormData({ ...formData, eventType: e.target.value })
                  }
                  className="w-full border-gold-500 focus:ring-gold-500 focus:border-gold-500"
                  disabled={isSubmitting}
                >
                  <option value="REGULAR_EVENT">Regular Event</option>
                  {user && ADMIN_ROLES.includes(user.Role?.name) && (
                    <>
                      <option value="BOARD_MEETING">Board Meeting</option>
                      <option value="GENERAL_BODY_MEETING">General Body Meeting</option>
                      <option value="ANNUAL_GENERAL_MEETING">Annual General Meeting</option>
                    </>
                  )}
                </Select>
              </div>
            )}
            {!isEndDateOnlyEditMode && (
              <div>
                <Label
                  htmlFor="venue"
                  value={
                    <span>
                      Venue <span className="text-red-500">*</span>
                    </span>
                  }
                  className="text-gold-500 mb-2 block"
                />
                <TextInput
                  id="venue"
                  required
                  minLength={5}
                  value={formData.venue}
                  onChange={(e) =>
                    setFormData({ ...formData, venue: e.target.value })
                  }
                  className="border-gold-500 focus:ring-gold-500 focus:border-gold-500"
                  placeholder="Enter event venue (minimum 5 characters)"
                  disabled={isSubmitting}
                />
              </div>
            )}

            {!isEndDateOnlyEditMode && (
              <div>
                <Label
                  htmlFor="details"
                  value={
                    <span>
                      Event Details <span className="text-red-500">*</span>
                    </span>
                  }
                  className="text-gold-500 mb-2 block"
                />
                {mounted && (
                  <div className="rounded-lg border border-gold-500 overflow-hidden">
                    <CKEditorClient
                      value={formData.details}
                      onChange={(data) =>
                        setFormData({ ...formData, details: data })
                      }
                    />
                  </div>
                )}
              </div>
            )}

            {!isEndDateOnlyEditMode && (
              <div>
                <Label
                  htmlFor="timezone"
                  value={
                    <span>
                      Timezone <span className="text-red-500">*</span>
                    </span>
                  }
                  className="text-gold-500 mb-2 block"
                />
                <Select
                  id="timezone"
                  value={formData.timezone}
                  onChange={(e) =>
                    setFormData({ ...formData, timezone: e.target.value })
                  }
                  className="border-gold-500 focus:ring-gold-500 focus:border-gold-500"
                  disabled={isSubmitting}
                >
                  {timezoneOptions.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz === userTimezone
                        ? `${tz.replace(/_/g, " ")} (Local time)`
                        : `${tz.replace(/_/g, " ")} (${getRelativeTimezoneOffset(tz, userTimezone)})`}
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-xs text-gray-400">
                  All dates will be interpreted in this timezone
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="startDate"
                  value={
                    <span>
                      Start Date & Time <span className="text-red-500">*</span>
                    </span>
                  }
                  className="text-gold-500 mb-2 block"
                />
                <TextInput
                  id="startDate"
                  type="datetime-local"
                  required
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  disabled={isSubmitting || !canEditStartDate}
                  className="border-gold-500 focus:ring-gold-500 focus:border-gold-500"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Event begins ({formData.timezone})
                </p>
              </div>
              <div>
                <Label
                  htmlFor="endDate"
                  value={
                    <span>
                      End Date & Time <span className="text-red-500">*</span>
                    </span>
                  }
                  className="text-gold-500 mb-2 block"
                />
                <TextInput
                  id="endDate"
                  type="datetime-local"
                  required
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  disabled={isSubmitting || !canEditEndDate}
                  className="border-gold-500 focus:ring-gold-500 focus:border-gold-500"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Event ends ({formData.timezone})
                </p>
              </div>
            </div>

            {regularTypes.includes(formData.eventType) && !isEdit && (
              <div className="border border-gold-500/30 rounded-lg p-4 space-y-4 bg-gray-800/50">
                <h3 className="text-gold-400 font-semibold text-sm">
                  Guest Fee Settings (Optional)
                </h3>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="guestFeeEnabled"
                    checked={formData.guestFeeEnabled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        guestFeeEnabled: e.target.checked,
                        ...(!e.target.checked && {
                          guestFee: "",
                          maxGuestsPerMember: "",
                        }),
                      })
                    }
                    className="w-4 h-4 accent-yellow-500"
                    disabled={isSubmitting}
                  />
                  <Label
                    htmlFor="guestFeeEnabled"
                    value="Enable paid guests for this event"
                    className="text-gold-400 cursor-pointer"
                  />
                </div>
                {formData.guestFeeEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="guestFee"
                        value="Guest Fee - excluding VAT *"
                        className="text-gold-500 mb-2 block"
                      />
                      <TextInput
                        id="guestFee"
                        type="number"
                        min="1"
                        step="0.01"
                        value={formData.guestFee}
                        onChange={(e) =>
                          setFormData({ ...formData, guestFee: e.target.value })
                        }
                        placeholder="e.g. 150.00"
                        required
                        disabled={isSubmitting}
                        className="border-gold-500 focus:ring-gold-500 focus:border-gold-500"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="maxGuestsPerMember"
                        value="Max Guests Per Member *"
                        className="text-gold-500 mb-2 block"
                      />
                      <TextInput
                        id="maxGuestsPerMember"
                        type="number"
                        min="1"
                        value={formData.maxGuestsPerMember}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            maxGuestsPerMember: e.target.value,
                          })
                        }
                        placeholder="e.g. 2"
                        required
                        disabled={isSubmitting}
                        className="border-gold-500 focus:ring-gold-500 focus:border-gold-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-4 mt-8">
              <Button
                color="dark"
                onClick={closeWithFormReset}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                className="bg-gold-500 hover:bg-gold-600 text-black"
                disabled={isSubmitting}
                onClick={() => {
                  if (validateStep1()) {
                    if (
                      formData.eventType === "REGULAR_EVENT" &&
                      formData.guestFeeEnabled &&
                      (!formData.guestFee || !formData.maxGuestsPerMember)
                    ) {
                      toast.error(
                        "Please enter guest fee and max guests per member"
                      );
                      return;
                    }
                    setStep(getNextStep());
                  }
                }}
              >
                {isSubmitting && isEdit ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Updating...
                  </>
                ) : (
                  "Next"
                )}
              </Button>
            </div>
          </div>
        ) : step === 2 ? (
          <div className="space-y-6">
            {!meetingTypes.includes(formData.eventType) && (
              <div>
                <Label
                  htmlFor="membershipCategory"
                  value="Filter by Membership Category"
                  className="text-gold-500 mb-2 block"
                />
                <Select
                  id="membershipCategory"
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedSubCategory("");
                  }}
                  className="w-full"
                >
                  <option value="">All Categories</option>
                  {membershipCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {((meetingTypes.includes(formData.eventType) && membershipSubCategories.length > 0) || (selectedCategory && membershipSubCategories.length > 0)) && (
              <div>
                <Label
                  htmlFor="membershipSubCategory"
                  value="Filter by Membership Sub-Category"
                  className="text-gold-500 mb-2 block"
                />
                <Select
                  id="membershipSubCategory"
                  value={selectedSubCategory}
                  onChange={(e) => setSelectedSubCategory(e.target.value)}
                  className="w-full"
                >
                  <option value="">All Sub-Categories {meetingTypes.includes(formData.eventType) && "of PBC Members"}</option>
                  {membershipSubCategories.map((subCategory) => (
                    <option key={subCategory.id} value={subCategory.id}>
                      {subCategory.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div ref={userListRef} className="max-h-96 overflow-y-auto">
              {users.length > 0 ? (
                <div
                  className={`flex items-center gap-2 p-2 bg-gray-700 rounded mb-2 sticky top-0 z-10 ${
                    isSubmitting
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                  onClick={!isSubmitting ? handleSelectAll : undefined}
                >
                  <input
                    type="checkbox"
                    checked={
                      users.length > 0 &&
                      formData.userIds.length === users.length
                    }
                    readOnly
                    disabled={isSubmitting}
                    className="form-checkbox h-4 w-4 text-gold-500"
                  />
                  <span className="text-gold-300 font-medium">
                    Select All Users
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-4">
                  <p className="text-center text-gray-200 font-medium text-lg">
                    No users found under this category
                  </p>
                </div>
              )}
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center gap-2 p-2 rounded ${
                    isSubmitting
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-gray-700 cursor-default"
                  }`}
                  onClick={
                    !isSubmitting
                      ? () => handleUserSelection(user.id)
                      : undefined
                  }
                >
                  <input
                    type="checkbox"
                    checked={formData.userIds.includes(user.id)}
                    readOnly
                    disabled={isSubmitting}
                    className="form-checkbox h-4 w-4 text-gold-500"
                  />
                  <span className="text-gray-300">{user.name}</span>
                </div>
              ))}
              {isLoading && (
                <div className="text-center py-4 text-gray-400">
                  Loading users...
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-4 mt-4">
              <Button
                color="dark"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                className="bg-gold-500 hover:bg-gold-600 text-black"
                disabled={formData.userIds.length === 0 || isSubmitting}
                onClick={() => {
                  if (meetingTypes.includes(formData.eventType)) {
                    setStep(3);
                  } else {
                    handleSubmit({ preventDefault: () => {} });
                  }
                }}
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    {isEdit ? "Updating..." : "Creating..."}
                  </>
                ) : meetingTypes.includes(formData.eventType) ? (
                  "Next"
                ) : isEdit ? (
                  "Update Event"
                ) : (
                  "Create Event"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <Label
                value="Action Points"
                className="text-gold-500 mb-2 block text-lg font-semibold"
              />
              <p className="text-gray-400 text-sm mb-4">
                Add action points for this meeting. You can add custom
                action points or select from pending ones.
              </p>
            </div>

            <div className="bg-gray-700 p-4 rounded-lg">
              <Label
                htmlFor="newActionPoint"
                value="Add Custom Action Point"
                className="text-gold-500 mb-2 block"
              />
              <div className="flex gap-2">
                <TextInput
                  id="newActionPoint"
                  value={newActionPoint}
                  onChange={(e) => setNewActionPoint(e.target.value)}
                  className="flex-1 border-gold-500 focus:ring-gold-500 focus:border-gold-500"
                  placeholder="Enter action point..."
                  disabled={isSubmitting}
                  onKeyPress={(e) =>
                    e.key === "Enter" && handleAddActionPoint()
                  }
                />
                <Button
                  onClick={handleAddActionPoint}
                  className="bg-gold-500 hover:bg-gold-600 text-black"
                  disabled={!newActionPoint.trim() || isSubmitting}
                >
                  Add
                </Button>
              </div>
            </div>

            {pendingActionPoints.length > 0 && (
              <div className="bg-gray-700 p-4 rounded-lg">
                <Label
                  value="Pending Action Points"
                  className="text-gold-500 mb-2 block"
                />
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {isLoadingActionPoints ? (
                    <div className="text-center py-4 text-gray-400">
                      Loading pending action points...
                    </div>
                  ) : (
                    pendingActionPoints.map((actionPoint, index) => {
                      const isSelected = formData.actionPoints.some(
                        ap => ap.description === actionPoint.description
                      );
                      return (
                        <div
                          key={actionPoint.id}
                          className={`p-3 rounded border cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-gold-500 text-black border-gold-500"
                              : "bg-gray-600 text-gray-200 border-gray-500 hover:bg-gray-500"
                          }`}
                          onClick={() => handleAddPendingActionPoint(actionPoint)}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium">
                              {actionPoint.description}
                            </span>
                            {actionPoint.user && (
                              <span className="text-xs opacity-80">
                                Previously Assigned to: {actionPoint.user.name} ({actionPoint.user.Role?.name})
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {formData.actionPoints.length > 0 && (
              <div className="bg-gray-700 p-4 rounded-lg">
                <Label
                  value="Selected Action Points"
                  className="text-gold-500 mb-2 block"
                />
                <div className="space-y-2">
                  {formData.actionPoints.map((actionPoint, index) => {
                    const selectedUser = users.find(u => u.id === actionPoint.assignedTo);
                    return (
                      <div
                        key={index}
                        className="p-3 bg-gray-600 rounded border space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-gray-200 text-sm flex-1">
                            {actionPoint.description}
                          </span>
                          <Button
                            size="xs"
                            color="red"
                            onClick={() => handleRemoveActionPoint(index)}
                            disabled={isSubmitting}
                          >
                            Remove
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={`assignee-${index}`}
                            value="Assign to:"
                            className="text-gray-400 text-xs whitespace-nowrap"
                          />
                          <Select
                            id={`assignee-${index}`}
                            value={actionPoint.assignedTo || ""}
                            onChange={(e) => handleUpdateActionPointAssignee(index, e.target.value)}
                            className="text-xs"
                            sizing="sm"
                            disabled={isSubmitting}
                          >
                            <option value="">None</option>
                            {users.filter(user => formData.userIds.includes(user.id)).map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.name}
                              </option>
                            ))}
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-4 mt-8">
              <Button
                color="dark"
                onClick={() => setStep(2)}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                className="bg-gold-500 hover:bg-gold-600 text-black"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    {isEdit ? "Updating..." : "Creating..."}
                  </>
                ) : isEdit ? (
                  "Update Event"
                ) : (
                  "Create Event"
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default EventModal;
