import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { HiDocumentAdd, HiTrash, HiUpload } from "react-icons/hi";
import {
  BusinessConnection,
  BusinessConnectionAttachment,
  BusinessConnectionFormValues,
  BusinessNature,
} from "@/types/businessConnection";
import { UserProfile } from "@/types/user";
import {
  AttachmentList,
  formatFileSize,
  memberOptionLabel,
} from "@/components/business-connections/BusinessConnectionHelpers";

const IconDocumentAdd = HiDocumentAdd as any;
const IconTrash = HiTrash as any;
const IconUpload = HiUpload as any;

const natureOptions: BusinessNature[] = ["BOUGHT", "SOLD", "PARTNERSHIP"];

const toInputDateTime = (date?: string) => {
  const source = date ? new Date(date) : new Date();
  source.setMinutes(source.getMinutes() - source.getTimezoneOffset());
  return source.toISOString().slice(0, 16);
};

const emptyValues: BusinessConnectionFormValues = {
  date: toInputDateTime(),
  natureOfBusiness: "BOUGHT",
  description: "",
  amount: "",
  connectionMode: "member",
  connectedUserId: "",
  connectedNonMemberName: "",
  companyName: "",
  attachments: [null, null, null],
};

interface BusinessConnectionFormProps {
  initialConnection?: BusinessConnection | null;
  members: UserProfile[];
  loadingMembers?: boolean;
  submitting?: boolean;
  submitLabel: string;
  existingAttachments?: BusinessConnectionAttachment[];
  deletingAttachmentId?: number | null;
  onDeleteAttachment?: (attachment: BusinessConnectionAttachment) => void;
  onSubmit: (values: BusinessConnectionFormValues) => Promise<void> | void;
  onCancel: () => void;
}

export default function BusinessConnectionForm({
  initialConnection,
  members,
  loadingMembers = false,
  submitting = false,
  submitLabel,
  existingAttachments = [],
  deletingAttachmentId,
  onDeleteAttachment,
  onSubmit,
  onCancel,
}: BusinessConnectionFormProps) {
  const [values, setValues] = useState<BusinessConnectionFormValues>(emptyValues);
  const [memberSearch, setMemberSearch] = useState("");

  useEffect(() => {
    if (!initialConnection) {
      setValues({ ...emptyValues, attachments: [null, null, null] });
      return;
    }

    const nonMember = initialConnection.businessConnectionNonMembers?.[0];
    setValues({
      date: toInputDateTime(initialConnection.date),
      natureOfBusiness: initialConnection.natureOfBusiness,
      description: initialConnection.description || "",
      amount: initialConnection.amount === null ? "" : String(initialConnection.amount),
      connectionMode: initialConnection.connectedUserId ? "member" : "non-member",
      connectedUserId: initialConnection.connectedUserId ? String(initialConnection.connectedUserId) : "",
      connectedNonMemberName: nonMember?.name || "",
      companyName: nonMember?.companyName || "",
      attachments: [null, null, null],
    });
  }, [initialConnection]);

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) =>
      [member.name, member.email, member.membership?.companyName, member.company]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [memberSearch, members]);

  const updateValue = <K extends keyof BusinessConnectionFormValues>(
    key: K,
    value: BusinessConnectionFormValues[K],
  ) => setValues((prev) => ({ ...prev, [key]: value }));

  const handleFileChange = (index: number, file: File | null) => {
    setValues((prev) => {
      const attachments = [...prev.attachments];
      attachments[index] = file;
      return { ...prev, attachments };
    });
  };

  const validate = () => {
    if (!values.date) return "Date is required";
    if (!values.description.trim()) return "Description is required";
    if (values.amount.trim() && Number.isNaN(Number(values.amount))) {
      return "Amount must be a valid number";
    }
    if (values.connectionMode === "member" && !values.connectedUserId) {
      return "Please select a registered member";
    }
    if (values.connectionMode === "non-member" && !values.connectedNonMemberName.trim()) {
      return "Non-member name is required";
    }
    return "";
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    await onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Date
            </label>
            <input
              type="datetime-local"
              value={values.date}
              onChange={(event) => updateValue("date", event.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nature of Business
            </label>
            <select
              value={values.natureOfBusiness}
              onChange={(event) => updateValue("natureOfBusiness", event.target.value as BusinessNature)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              {natureOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "PARTNERSHIP" ? "Partnership" : option === "BOUGHT" ? "Bought" : "Sold"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Amount
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={values.amount}
              onChange={(event) => updateValue("amount", event.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            value={values.description}
            onChange={(event) => updateValue("description", event.target.value)}
            rows={5}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            placeholder="Summarize the business exchanged, sold, bought, or partnership scope."
          />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-900">
          <button
            type="button"
            onClick={() => updateValue("connectionMode", "member")}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              values.connectionMode === "member"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            }`}
          >
            Registered Member
          </button>
          <button
            type="button"
            onClick={() => updateValue("connectionMode", "non-member")}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              values.connectionMode === "non-member"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            }`}
          >
            Non-Member / Inactive Member
          </button>
        </div>

        {values.connectionMode === "member" ? (
          <div className="space-y-3">
            <input
              type="search"
              value={memberSearch}
              onChange={(event) => setMemberSearch(event.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Search by name, email, or company"
            />
            <select
              value={values.connectedUserId}
              onChange={(event) => updateValue("connectedUserId", event.target.value)}
              disabled={loadingMembers}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">{loadingMembers ? "Loading members..." : "Select member"}</option>
              {filteredMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {memberOptionLabel(member)}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name
              </label>
              <input
                type="text"
                value={values.connectedNonMemberName}
                onChange={(event) => updateValue("connectedNonMemberName", event.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Company Name
              </label>
              <input
                type="text"
                value={values.companyName}
                onChange={(event) => updateValue("companyName", event.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Optional"
              />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center gap-2">
          <IconDocumentAdd className="h-5 w-5 text-gold-600 dark:text-gold-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Attachments</h2>
        </div>

        {existingAttachments.length > 0 && (
          <div className="mb-5">
            <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Existing files
            </h3>
            <AttachmentList
              attachments={existingAttachments}
              onDelete={onDeleteAttachment}
              deletingId={deletingAttachmentId}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[0, 1, 2].map((index) => {
            const file = values.attachments[index];
            const previewUrl = file && file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
            return (
              <div
                key={index}
                className="rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-700"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Slot {index + 1}
                  </span>
                  {file && (
                    <button
                      type="button"
                      onClick={() => handleFileChange(index, null)}
                      className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      <IconTrash className="h-4 w-4" />
                      Remove
                    </button>
                  )}
                </div>
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={file?.name || "Attachment preview"}
                    className="mb-3 h-28 w-full rounded-md object-cover"
                    onLoad={() => URL.revokeObjectURL(previewUrl)}
                  />
                ) : (
                  <div className="mb-3 flex h-28 items-center justify-center rounded-md bg-gray-100 text-gray-400 dark:bg-gray-900">
                    <IconUpload className="h-8 w-8" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                  onChange={(event) => handleFileChange(index, event.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gold-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-gold-700 dark:text-gray-300"
                />
                {file && (
                  <p className="mt-2 truncate text-xs text-gray-500 dark:text-gray-400">
                    {file.name} ({formatFileSize(file.size)})
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-gold-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-gold-700 disabled:opacity-60"
        >
          {submitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
