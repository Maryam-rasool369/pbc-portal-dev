import Link from "next/link";
import {
  HiCalendar,
  HiCash,
  HiDocumentText,
  HiExternalLink,
  HiMail,
  HiOfficeBuilding,
  HiUser,
} from "react-icons/hi";
import {
  BusinessConnection,
  BusinessConnectionAttachment,
  BusinessConnectionUser,
} from "@/types/businessConnection";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";

const IconCalendar = HiCalendar as any;
const IconCash = HiCash as any;
const IconDocumentText = HiDocumentText as any;
const IconExternalLink = HiExternalLink as any;
const IconMail = HiMail as any;
const IconOfficeBuilding = HiOfficeBuilding as any;
const IconUser = HiUser as any;

export const natureLabel: Record<string, string> = {
  BOUGHT: "Bought",
  SOLD: "Sold",
  PARTNERSHIP: "Partnership",
};

export const natureBadgeClass: Record<string, string> = {
  BOUGHT: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  SOLD: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  PARTNERSHIP: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
};

export const getCounterparty = (connection: BusinessConnection) => {
  if (connection.connectedUser) {
    return {
      type: "Registered Member",
      name: connection.connectedUser.name,
      email: connection.connectedUser.email,
      companyName: connection.connectedUser.membership?.companyName || "Not specified",
    };
  }

  const nonMember = connection.businessConnectionNonMembers?.[0];
  return {
    type: "Non-Member / Inactive Member",
    name: nonMember?.name || "Not specified",
    email: "",
    companyName: nonMember?.companyName || "Not specified",
  };
};

export const formatFileSize = (bytes: number) => {
  if (!bytes) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

export function BusinessConnectionSummary({
  connection,
  compact = false,
}: {
  connection: BusinessConnection;
  compact?: boolean;
}) {
  const counterparty = getCounterparty(connection);

  return (
    <div className={compact ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
      <InfoRow icon={<IconUser />} label={counterparty.type} value={counterparty.name} />
      <InfoRow icon={<IconOfficeBuilding />} label="Company" value={counterparty.companyName} />
      {counterparty.email && <InfoRow icon={<IconMail />} label="Email" value={counterparty.email} />}
      <InfoRow icon={<IconCalendar />} label="Date" value={formatDate(connection.date)} />
      <InfoRow icon={<IconCash />} label="Amount" value={formatCurrency(connection.amount)} />
    </div>
  );
}

export function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="mt-0.5 text-gold-600 dark:text-gold-400 [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </span>
      <span>
        <span className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {label}
        </span>
        <span className="font-medium text-gray-900 dark:text-white">{value}</span>
      </span>
    </div>
  );
}

export function AttachmentList({
  attachments,
  onDelete,
  deletingId,
}: {
  attachments: BusinessConnectionAttachment[];
  onDelete?: (attachment: BusinessConnectionAttachment) => void;
  deletingId?: number | null;
}) {
  if (!attachments.length) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        No attachments uploaded.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="flex items-start gap-3">
            <IconDocumentText className="mt-1 h-6 w-6 flex-shrink-0 text-gold-600 dark:text-gold-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-gray-900 dark:text-white">
                {attachment.fileName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(attachment.fileSize)}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Link
              href={attachment.url}
              target="_blank"
              className="inline-flex items-center gap-1 rounded-md bg-gold-600 px-3 py-2 text-sm font-medium text-white hover:bg-gold-700"
            >
              <IconExternalLink className="h-4 w-4" />
              Open
            </Link>
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(attachment)}
                disabled={deletingId === attachment.id}
                className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
              >
                {deletingId === attachment.id ? "Deleting..." : "Delete"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export const memberOptionLabel = (user: BusinessConnectionUser | any) => {
  const company = user?.membership?.companyName || user?.company || "No company";
  return `${user.name} - ${company} (${user.email})`;
};
