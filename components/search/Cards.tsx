import Link from "next/link";
import {
  RFQ,
  Wishlist,
  Product,
  JobPost,
  Lead,
  Profile,
  Election,
  EventType,
  Ticket,
} from "./types";
import CurrencyAmount from "@/components/ui/CurrencyAmount";

export const RFQCard = ({ item }: { item: RFQ }) => (
  <Link
    href={`/rfq/${item.id}`}
    className="block my-2 p-3 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg border-l-4 border-blue-500 transition-colors"
  >
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {item.title}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Budget: <CurrencyAmount amount={item.budget} /> • Qty: {item.quantity}
        </p>
        <span
          className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
            item.status === "AWARDED"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
          }`}
        >
          {item.status}
        </span>
      </div>
      <div className="text-xs text-gray-400 sm:text-right flex-shrink-0">
        <div>{item.categoryName}</div>
        <div>{new Date(item.deadline).toLocaleDateString()}</div>
      </div>
    </div>
  </Link>
);

export const WishlistCard = ({ item }: { item: Wishlist }) => (
  <Link
    href={`/wishlists/${item.id}`}
    className="block my-2 p-3 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg border-l-4 border-purple-500 transition-colors"
  >
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {item.title}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          By: {item.user?.name}
        </p>
        <span
          className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
            item.status === "APPROVED"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
          }`}
        >
          {item.status}
        </span>
      </div>
    </div>
  </Link>
);

export const ProductCard = ({ item }: { item: Product }) => (
  <Link
    href={`/Product/${item.id}`}
    className="block my-2 p-3 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg border-l-4 border-green-500 transition-colors"
  >
    <div className="flex items-center space-x-3">
      {item.primaryImage && (
        <img
          src={item.primaryImage}
          alt={item.name}
          className="w-10 h-10 rounded object-cover flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {item.name}
        </h4>
        <p className="text-sm font-semibold text-green-600 dark:text-green-400">
          View details for pricing
        </p>
      </div>
    </div>
  </Link>
);

export const JobPostCard = ({ item }: { item: JobPost }) => (
  <Link
    href={`/job-post/${item.id}`}
    className="block my-2 p-3 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg border-l-4 border-orange-500 transition-colors"
  >
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {item.title}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Deadline: {new Date(item.deadline).toLocaleDateString()}
        </p>
        <span
          className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
            item.status === "OPEN"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
          }`}
        >
          {item.status}
        </span>
      </div>
    </div>
  </Link>
);

export const LeadCard = ({ item }: { item: Lead }) => (
  <div className="block my-2 p-3 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg border-l-4 border-indigo-500 transition-colors">
    <div>
      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
        {item.Product?.name}
      </h4>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-1">
        <div>Buyer: {item.Buyer?.name}</div>
        <div>Seller: {item.Seller?.name}</div>
      </div>
      <span
        className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
          item.status === "ADD_TO_CART"
            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
        }`}
      >
        {item.status.replace("_", " ")}
      </span>
    </div>
  </div>
);

export const ProfileCard = ({ item }: { item: Profile }) => (
  <Link
    href={`/users/${item.userId || item.id}`}
    className="block my-2 p-3 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg border-l-4 border-pink-500 transition-colors"
  >
    <div className="flex items-center space-x-3">
      {item.profilePicture && (
        <img
          src={item.profilePicture}
          alt={item.user?.name}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {item.user?.name}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {item.user?.email} • {item.country}
        </p>
      </div>
    </div>
  </Link>
);

export const ElectionCard = ({ item }: { item: Election }) => (
  <Link
    href={`/election/${item.id}`}
    className="block my-2 p-3 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg border-l-4 border-red-500 transition-colors"
  >
    <div>
      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
        {item.title}
      </h4>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Type: {item.type?.replace("_", " ")}
      </p>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {new Date(item.startDate).toLocaleDateString()} -{" "}
        {new Date(item.endDate).toLocaleDateString()}
      </div>
    </div>
  </Link>
);

export const EventCard = ({ item }: { item: EventType }) => (
  <Link
    href={`/events/${item.id}`}
    className="block my-2 p-3 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg border-l-4 border-cyan-500 transition-colors"
  >
    <div>
      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
        {item.title}
      </h4>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
        {item.details}
      </p>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {new Date(item.startDate).toLocaleDateString()} -{" "}
        {new Date(item.endDate).toLocaleDateString()}
      </div>
      {item.eventMOMStatus && (
        <span
          className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
            item.eventMOMStatus === "APPROVED"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
          }`}
        >
          MOM: {item.eventMOMStatus}
        </span>
      )}
    </div>
  </Link>
);

export const TicketCard = ({ item }: { item: Ticket }) => (
  <Link
    href={`/support/${item.id}`}
    className="block my-2 p-3 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg border-l-4 border-amber-500 transition-colors"
  >
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {item.title}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
          {item.description}
        </p>
      </div>
      <div className="flex flex-row sm:flex-col items-start sm:items-end gap-1">
        <span
          className={`inline-block px-2 py-1 text-xs rounded-full flex-shrink-0 ${
            item.status === "OPEN"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
          }`}
        >
          {item.status}
        </span>
        <span
          className={`inline-block px-2 py-1 text-xs rounded-full flex-shrink-0 ${
            item.priority === "HIGH"
              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              : item.priority === "MEDIUM"
                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
          }`}
        >
          {item.priority}
        </span>
      </div>
    </div>
  </Link>
);
