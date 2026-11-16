import React from "react";
import Link from "next/link";
import { User } from "lucide-react";

interface NotificationMenuItemProps {
  id: number;
  title: string | null;
  message: string;
  link: string | null;
  refId: string | null;
  createdAt: string;
  index: number;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function NotificationMenuItem({
  id,
  title,
  message,
  link,
  refId,
  createdAt,
  index,
  onMarkAsRead,
  onDelete,
}: NotificationMenuItemProps) {
  const formattedDate = new Date(createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const backgroundClass =
    index % 2 === 0
      ? "bg-gray-900 dark:bg-gray-900"
      : "bg-gray-700 dark:bg-gray-700";

  const buildNotificationHref = (rawLink: string, rawRefId: string | null) => {
    const normalizedLink = rawLink.trim();
    const linkKey = normalizedLink.replace(/^\/+/, "").toLowerCase();

    const linkMappings: Record<string, string> = {
      address: "address",
      profile: "users",
      user: "users",
      task: "tasks",
      ticket: "support",
      ticketcategory: "support/categories",
      ticketresponse: "support",
      birthday: "admin/customize-birthday",
      cart: "cart",
      category: "expense/categories",
      constitution: "constitution",
      constitutionapproval: "constitution",
      discount: "userMarketplace",
      jobapplication: "job-post",
      jobcategory: "job-post",
      jobpost: "job-post",
      jobskill: "job-post",
      lead: "leads",
      membership: "memberships",
      membershipapproval: "memberships",
      membershipregistration: "memberships",
      membershipcategory: "memberships/membershipCategories",
      membershipsubcategory: "memberships/membershipCategories",
      membershipplan: "memberships/membershipPlans",
      order: "orders",
      product: "marketplace",
      productwanted: "marketplace",
      quote: "marketplace/view-all-rfq",
      rfq: "marketplace/view-all-rfq",
      servicerfq: "service-rfq-list",
      servicequote: "service-rfq-list",
      servicewanted: "marketplace",
      transaction: "expenses",
      transactioncategory: "expenses",
      wishlist: "wishlist",
      policy: "voting/policy",
      vote: "voting",
      election: "voting",
      directorelection: "voting/director-elections",
      directorelectionrule: "voting/director-elections/rules",
      sponsorshippackage: "events",
      event: "events",
      eventapproval: "events",
      eventactionpoint: "events",
      eventattendance: "events",
      eventsponsorship: "events",
      annualsponsorship: "annual-sponsor",
      attendance: "attendance",
      chat: "chat",
      search: "search",
      activitylog: "logs",
      initiative: "initiatives",
      businessgroup: "memberships/business-groups",
      tenure: "tenure",
      roletransmission: "role-transmission",
      softdeleterequest: "soft-delete",
      organization: "memberships/organizations",
      news: "news",
      newsletter: "newsletter",
      homelayout: "userMarketplace", 
      committee: "committee",
      committeemeeting: "committee",
    };

    const mappedLink = linkMappings[linkKey];
    if (!mappedLink) {
      return null;
    }

    const trimmedRefId = rawRefId?.trim();

    // Check if rawRefId exists and handles exceptions for product, rfq, and quote
    if (trimmedRefId) {
      if (linkKey === "product") {
        return `/Product/${trimmedRefId}`;
      }
      if (linkKey === "productwanted") {
        return `/product-wanted/${trimmedRefId}`;
      }
      if (linkKey === "rfq" || linkKey === "quote") {
        return `/rfq/${trimmedRefId}`;
      }
      if (linkKey === "servicerfq" || linkKey === "servicequote") {
        return `/service-rfq/${trimmedRefId}`;
      }
      if (linkKey === "servicewanted") {
        return `/service-wanted/${trimmedRefId}`;
      }
      if (linkKey === "initiative") {
        return `/initiatives/${trimmedRefId}`;
      }
      if (linkKey === "wishlist") {
        return `/wishlists/${trimmedRefId}`;
      }
      
      // Default behavior for other mappings with a refId
      return `/${mappedLink}/${trimmedRefId}`;
    }

    // Default fallback when no rawRefId exists
    return `/${mappedLink}`;
  };

  const notificationHref = link?.trim()
    ? buildNotificationHref(link, refId)
    : null;

  const content = (
    <div
      className={`${backgroundClass} flex flex-col px-6 py-4 text-white hover:bg-gray-600 dark:hover:bg-gray-600 relative group`}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          {title && <div className="text-sm font-semibold mb-1">{title}</div>}
          <div className="text-base break-words">{message}</div>
          <div className="text-xs mt-1 text-gray-300">{formattedDate}</div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMarkAsRead(id);
            }}
            className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-gray-700 rounded transition"
            title="Mark as read"
            aria-label="Mark as read"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(id);
            }}
            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded transition"
            title="Delete"
            aria-label="Delete notification"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  // Only wrap in Link when the notification link key is known in linkMappings.
  if (notificationHref) {
    return (
      <Link href={notificationHref} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
