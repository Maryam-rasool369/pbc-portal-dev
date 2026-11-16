import Pagination from "@/components/common/Pagination";
import useAuthStore from "@/store/authStore";
import EventModal from "@/components/events/EventModal";
import EventApprovalModal from "@/components/events/EventApprovalModal";
import Can from "@/components/rbac/Can";
import SponsorshipPackagesTab from "@/components/events/SponsorshipPackagesTab";
import { Event } from "@/services/events";
import { useEffect, useState } from "react";
import { HiOutlineCalendar, HiOutlineChevronRight } from "react-icons/hi";
import { Tabs, TabItem, Button, Dropdown, Select } from "flowbite-react";
import { useRouter } from "next/router";
import { useLoadingStore } from "@/store/useLoadingStore";
import { toast } from "react-toastify";
import { useAbility } from "@/hooks/useAbility";
import { ADMIN_ROLES, Roles } from "@/enums/Roles";
import { EmptyStateMessage } from "@/components/ui/EmptyStateMessage";
import { formatDateAndTime } from "@/utils/formatDateAndTime";


interface EventsData {
  data: Event[];
  message: string;
  total: number;
}

enum EventStatus {
  PAST = 'PAST',
  ONGOING = 'ONGOING',
  UPCOMING = 'UPCOMING',
  CANCELLED = 'CANCELLED'
  
}

enum EventType {
  BOARD_MEETING = "BOARD_MEETING",
  GENERAL_BODY_MEETING = "GENERAL_BODY_MEETING",
  ANNUAL_GENERAL_MEETING = "ANNUAL_GENERAL_MEETING",
  REGULAR_EVENT = "REGULAR_EVENT",
  ALL = "ALL"
}

export default function Events() {
  const router = useRouter();
  const setLoading = useLoadingStore((state) => state.setLoading);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const ability = useAbility();

  const notMembers =
    user?.Role?.name !== Roles.INDIVIDUAL &&
    user?.Role?.name !== Roles.CORPORATE;
  const areMembers =
    user?.Role?.name === Roles.INDIVIDUAL ||
    user?.Role?.name === Roles.CORPORATE;

  const [events, setEvents] = useState<EventsData>({
    data: [],
    message: "",
    total: 0,
  });

  const [myEvents, setMyEvents] = useState<EventsData>({
    data: [],
    message: "",
    total: 0,
  });

  const [assignedyEvents, setAssignedEvents] = useState<EventsData>({
    data: [],
    message: "",
    total: 0,
  });

  const [boardMeetings, setBoardMeetings] = useState<EventsData>({
    data: [],
    message: "",
    total: 0,
  });

  const [pendingEvents, setPendingEvents] = useState<EventsData>({
    data: [],
    message: "",
    total: 0,
  });

  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openApprovalModal, setOpenApprovalModal] = useState(false);
  const [selectedEventForApproval, setSelectedEventForApproval] = useState<Event | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [myEventsCurrentPage, setMyEventsCurrentPage] = useState(1);

  const [assignedEventscurrentPage, setAssignedEventsCurrentPage] = useState(1);
  const [boardMeetingsCurrentPage, setBoardMeetingsCurrentPage] = useState(1);
  const [pendingEventsCurrentPage, setPendingEventsCurrentPage] = useState(1);

  const [eventStatus, setEventStatus] = useState<EventStatus | null>(null);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("");
  const [boardMeetingType, setBoardMeetingType] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [approvalFilter, setApprovalFilter] = useState<string>("PENDING");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [searchText, setSearchText] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableMonths, setAvailableMonths] = useState<number[]>([]);

  const limit = 10;

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const fetchAvailableYears = async () => {
    try {
      const params = new URLSearchParams();
      if (eventTypeFilter) params.set("type", eventTypeFilter);
      if (eventStatus) params.set("status", eventStatus);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/event/available-years${qs}`,
        { headers: { "Content-Type": "application/json", token: `${token}` } }
      );
      const data = await res.json();
      if (data?.data) setAvailableYears(data.data);
    } catch {
      setAvailableYears([]);
    }
  };

  const fetchAvailableMonths = async (year: number) => {
    try {
      const params = new URLSearchParams({ year: String(year) });
      if (eventTypeFilter) params.set("type", eventTypeFilter);
      if (eventStatus) params.set("status", eventStatus);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/event/available-months?${params.toString()}`,
        { headers: { "Content-Type": "application/json", token: `${token}` } }
      );
      const data = await res.json();
      if (data?.data) setAvailableMonths(data.data);
    } catch {
      setAvailableMonths([]);
    }
  };

  const getAllEvents = async (page: number = 1) => {
    setLoading(true);
    try {
      const typeParam = eventTypeFilter ? `&type=${eventTypeFilter}` : "";
      const yearParam = selectedYear ? `&year=${selectedYear}` : "";
      const monthParam = selectedMonth ? `&month=${selectedMonth}` : "";
      const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : "";
      const eventsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/event?page=${page}&limit=${limit}&status=${eventStatus || ""}&sort=${sortOrder}&approvalStatus=APPROVED${typeParam}${yearParam}${monthParam}${searchParam}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            token: `${token}`,
          },
        },
      );
      const response = await eventsResponse.json();
      if (response.message) {
        setEvents({
          data: response.data,
          message: response.message,
          total: response.pagination.totalPages,
        });
      } else {
        if (!response?.error[0]?.msg?.includes("session")) {
          toast.error(response.error[0].msg || "Failed to fetch events");
        }
      }
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.";
      toast.error(JSON.stringify(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const getMyEvents = async (page: number = 1) => {
    setLoading(true);
    try {
      const yearParam = selectedYear ? `&year=${selectedYear}` : "";
      const monthParam = selectedMonth ? `&month=${selectedMonth}` : "";
      const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : "";
      const eventsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/event/my-events?page=${page}&limit=${limit}&status=${eventStatus || ""}&sort=${sortOrder}&approvalStatus=APPROVED${yearParam}${monthParam}${searchParam}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            token: `${token}`,
          },
        },
      );
      const response = await eventsResponse.json();
      if (response.message) {
        setMyEvents({
          data: response.data,
          message: response.message,
          total: response.pagination.totalPages,
        });
      } else {
        toast.error(response?.error[0]?.msg || "Failed to fetch my events");
      }
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getAssignedEvents = async (page: number = 1) => {
    setLoading(true);
    try {
      const yearParam = selectedYear ? `&year=${selectedYear}` : "";
      const monthParam = selectedMonth ? `&month=${selectedMonth}` : "";
      const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : "";
      const eventsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/event/my-assigned?page=${page}&limit=${limit}&status=${eventStatus || ""}&sort=${sortOrder}&approvalStatus=APPROVED${yearParam}${monthParam}${searchParam}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            token: `${token}`,
          },
        },
      );
      const response = await eventsResponse.json();
      if (response.message) {
        setAssignedEvents({
          data: response.data,
          message: response.message,
          total: response.pagination.totalPages,
        });
      } else {
        if (!response?.error[0]?.msg?.includes("session")) {
          toast.error(response.error[0].msg || "Failed to fetch assigned events");
        }
      }
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getBoardMeetings = async (page: number = 1) => {
    setLoading(true);
    try {
      const yearParam = selectedYear ? `&year=${selectedYear}` : "";
      const monthParam = selectedMonth ? `&month=${selectedMonth}` : "";
      const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : "";
      const eventsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/event/board-meetings?page=${page}&limit=${limit}&status=${eventStatus || ""}&type=${boardMeetingType || ""}&sort=${sortOrder}&approvalStatus=APPROVED${yearParam}${monthParam}${searchParam}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            token: `${token}`,
          },
        }
      );
      const response = await eventsResponse.json();
      if (response.message) {
        setBoardMeetings({
          data: response.data,
          message: response.message,
          total: response.pagination?.totalPages,
        });
      } else {
        if (!response?.error[0]?.msg?.includes("session")) {
          toast.error(response.error[0].msg || "Failed to fetch board meetings");
        }
      }
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getPendingEvents = async (page: number = 1) => {
    setLoading(true);
    try {
      const typeParam = eventTypeFilter ? `&type=${eventTypeFilter}` : "";
      const yearParam = selectedYear ? `&year=${selectedYear}` : "";
      const monthParam = selectedMonth ? `&month=${selectedMonth}` : "";
      const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : "";
      const eventsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/event?page=${page}&limit=${limit}&approvalStatus=${approvalFilter}&sort=${sortOrder}${eventStatus ? `&status=${eventStatus}` : ""}${typeParam}${yearParam}${monthParam}${searchParam}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            token: `${token}`,
          },
        }
      );
      const response = await eventsResponse.json();
      if (response.message) {
        setPendingEvents({
          data: response.data,
          message: response.message,
          total: response.pagination?.totalPages,
        });
      } else {
        if (!response?.error[0]?.msg?.includes("session")) {
          toast.error(response.error[0].msg || "Failed to fetch pending events");
        }
      }
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalSuccess = () => {
    getPendingEvents(pendingEventsCurrentPage);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText);
      setCurrentPage(1);
      setMyEventsCurrentPage(1);
      setAssignedEventsCurrentPage(1);
      setBoardMeetingsCurrentPage(1);
      setPendingEventsCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    if (token) {
      setSelectedYear(null);
      setSelectedMonth(null);
      setAvailableMonths([]);
      fetchAvailableYears();
    }
  }, [token, eventTypeFilter, eventStatus]);

  useEffect(() => {
    if (selectedYear) {
      fetchAvailableMonths(selectedYear);
    } else {
      setAvailableMonths([]);
      setSelectedMonth(null);
    }
  }, [selectedYear]);

  useEffect(() => {
    //@ts-ignore
    ability?.can("read", "Event") && getAllEvents(currentPage);
  }, [currentPage, openCreateModal, eventStatus, sortOrder, eventTypeFilter, selectedYear, selectedMonth, debouncedSearch]);

  useEffect(() => {
    //@ts-ignore
    ability?.can("read", "Event") && getMyEvents(myEventsCurrentPage);
  }, [myEventsCurrentPage, openCreateModal, eventStatus, sortOrder, selectedYear, selectedMonth, debouncedSearch]);

  useEffect(() => {
    //@ts-ignore
    ability?.can("read", "Event") &&
      getAssignedEvents(assignedEventscurrentPage);
  }, [assignedEventscurrentPage, openCreateModal, eventStatus, sortOrder, selectedYear, selectedMonth, debouncedSearch]);

  useEffect(() => {
    if (areMembers) return;
    //@ts-ignore
    ability?.can("read", "Event") && getBoardMeetings(boardMeetingsCurrentPage);
  }, [boardMeetingsCurrentPage, openCreateModal, areMembers, eventStatus, boardMeetingType, sortOrder, selectedYear, selectedMonth, debouncedSearch]);

  useEffect(() => {
    //@ts-ignore
    ability?.can("approve", "Event") && getPendingEvents(pendingEventsCurrentPage);
  }, [pendingEventsCurrentPage, openCreateModal, approvalFilter, sortOrder, eventStatus, eventTypeFilter, selectedYear, selectedMonth, debouncedSearch]);

  return (
    <div className="min-h-screen text-white flex flex-col p-4">
      <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800 flex-1 flex-row">
          <div className="flex flex-col items-start justify-between lg:flex mb-6">
          <div className="flex flex-col gap-3 w-full">
            <div className="flex flex-row items-center justify-between gap-4 w-full">
              <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                Events
              </h3>
              <Can I="create" a="Event">
                <Button
                  className="px-2 bg-gold-500 hover:bg-gold-600 text-gray-800 rounded-md transition-colors flex items-center"
                  onClick={() => setOpenCreateModal(true)}
                >
                  Create new event
                </Button>
              </Can>
            </div>

            <div className="relative w-full">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search events by title, details or venue..."
                className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              {searchText && (
                <button
                  onClick={() => setSearchText("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filters row */}
            <div className="flex flex-wrap items-center gap-3 w-full">
              <select
                value={eventStatus || ""}
                onChange={(e) => setEventStatus(e.target.value ? e.target.value as EventStatus : null)}
                className="block pl-3 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-gold-500 dark:focus:ring-gold-500 focus:border-transparent transition-shadow cursor-pointer"
              >
                <option value="">All Events</option>
                {Object.values(EventStatus).map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>

              <select
                value={eventTypeFilter}
                onChange={(e) => {
                  setEventTypeFilter(e.target.value);
                  setCurrentPage(1);
                  setPendingEventsCurrentPage(1);
                }}
                className="block pl-3 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-gold-500 dark:focus:ring-gold-500 focus:border-transparent transition-shadow cursor-pointer"
              >
                <option value="">All Types</option>
                <option value={EventType.REGULAR_EVENT}>Regular Events</option>
                <option value={EventType.ANNUAL_GENERAL_MEETING}>Annual General Meetings</option>
              </select>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
                className="block pl-3 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-gold-500 dark:focus:ring-gold-500 focus:border-transparent transition-shadow cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>

              <select
                value={selectedYear ?? ""}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  setSelectedYear(val);
                  setSelectedMonth(null);
                  setCurrentPage(1);
                  setMyEventsCurrentPage(1);
                  setAssignedEventsCurrentPage(1);
                  setBoardMeetingsCurrentPage(1);
                  setPendingEventsCurrentPage(1);
                }}
                className="block pl-3 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-gold-500 dark:focus:ring-gold-500 focus:border-transparent transition-shadow cursor-pointer"
              >
                <option value="">All Years</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

       
              <select
                value={selectedMonth ?? ""}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  setSelectedMonth(val);
                  setCurrentPage(1);
                  setMyEventsCurrentPage(1);
                  setAssignedEventsCurrentPage(1);
                  setBoardMeetingsCurrentPage(1);
                  setPendingEventsCurrentPage(1);
                }}
                disabled={!selectedYear}
                className="block pl-3 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-gold-500 dark:focus:ring-gold-500 focus:border-transparent transition-shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">{selectedYear ? "All Months" : "Select year first"}</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>{MONTH_NAMES[m - 1]}</option>
                ))}
              </select>
            </div>
          </div>

          <Tabs aria-label="Event Tabs" className="w-full">
            {/* @ts-ignore */}
            {ability.can("read", "Event") && (
              <TabItem active title="Events">
                <div className="mt-6 space-y-6 w-full">
                  {events.data?.map((event) => (
                    <div
                      key={event.id}
                      className="bg-gray-800 border border-gold-500 rounded-xl p-5 cursor-pointer"
                      onClick={() => router.push(`/events/${event.id}`)}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <h2 className="text-xl text-gold-500 font-bold truncate">
                            {event.title}
                          </h2>
                          <div 
                            className="text-white text-sm mt-1 line-clamp-2 break-words prose prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: event.details || "" }}
                          />
                          <div className="flex items-center gap-2 mt-3 text-white flex-wrap">
                            {/* @ts-ignore */}
                            <HiOutlineCalendar className="text-gold-500 w-5 h-5" />
                            <span className="text-sm font-medium">
                              {formatDateAndTime(event.startDate || "", true)}
                            </span>{" "}
                            -{" "}
                            <span className="text-sm font-medium">
                              {formatDateAndTime(event.endDate || "", true)}
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <button className="w-8 h-8 bg-gold-500 text-black rounded-full flex items-center justify-center">
                            {/* @ts-ignore */}
                            <HiOutlineChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {events.data.length !== 0 ? (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={events.total}
                      isLoading={false}
                      onPageChange={setCurrentPage}
                    />
                  ) : (
                    <EmptyStateMessage
                      title="No Events Found"
                      message="There are currently no events available. Please check back later or create a new event."
                      icon={
                        // @ts-ignore
                        <HiOutlineCalendar className="w-12 h-12 text-gold-500" />
                      }
                      showCreateButton={false}
                      onCreateClick={() => setOpenCreateModal(true)}
                     />
                  )}
                </div>
              </TabItem>
            )}
            {/* @ts-ignore */}
            {ability.can("create", "Event") && (
              <TabItem title="My Events">
                <div className="mt-6 space-y-6 w-full">
                  {myEvents.data?.map((event) => (
                    <div
                      key={event.id}
                      className="bg-gray-800 border border-gold-500 rounded-xl p-5 cursor-pointer"
                      onClick={() => router.push(`/events/${event.id}`)}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <h2 className="text-xl text-gold-500 font-bold truncate">
                            {event.title}
                          </h2>
                          <div 
                            className="text-white text-sm mt-1 line-clamp-2 break-words prose prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: event.details || "" }}
                          />
                          <div className="flex items-center gap-2 mt-3 text-white flex-wrap">
                            {/* @ts-ignore */}
                            <HiOutlineCalendar className="text-gold-500 w-5 h-5" />
                            <span className="text-sm font-medium">
                              {formatDateAndTime(event.startDate || "", true)}
                            </span>{" "}
                            -{" "}
                            <span className="text-sm font-medium">
                              {formatDateAndTime(event.endDate || "", true)}
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <button className="w-8 h-8 bg-gold-500 text-black rounded-full flex items-center justify-center">
                            {/* @ts-ignore */}
                            <HiOutlineChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {myEvents.data.length !== 0 ? (
                    <Pagination
                      currentPage={myEventsCurrentPage}
                      totalPages={myEvents.total}
                      isLoading={false}
                      onPageChange={setMyEventsCurrentPage}
                    />
                  ) : (
                    <EmptyStateMessage
                      title="No Events Found"
                      message="You have not created any events yet. Create a new event for it to be shown here."
                      icon={
                        // @ts-ignore
                        <HiOutlineCalendar className="w-12 h-12 text-gold-500" />
                      }
                      showCreateButton={false}
                      onCreateClick={() => setOpenCreateModal(true)}
                    />
                  )}
                </div>
              </TabItem>
            )}

            {/* @ts-ignore */}
            {ability.can("read", "Event") && (
              <TabItem title="Assigned">
                <div className="mt-6 space-y-6">
                  {assignedyEvents.data?.map((event) => (
                    <div
                      key={event.id}
                      className="bg-gray-800 border border-gold-500 rounded-xl p-5 cursor-pointer"
                      onClick={() => router.push(`/events/${event.id}`)}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <h2 className="text-xl text-gold-500 font-bold truncate">
                            {event.title}
                          </h2>
                          <div 
                            className="text-white text-sm mt-1 line-clamp-2 break-words prose prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: event.details || "" }}
                          />
                          <div className="flex items-center gap-2 mt-3 text-white flex-wrap">
                            {/* @ts-ignore */}
                            <HiOutlineCalendar className="text-gold-500 w-5 h-5" />
                            <span className="text-sm font-medium">
                              {formatDateAndTime(event.startDate || "", true)}
                            </span>{" "}
                            -{" "}
                            <span className="text-sm font-medium">
                              {formatDateAndTime(event.endDate || "", true)}
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <button className="w-8 h-8 bg-gold-500 text-black rounded-full flex items-center justify-center">
                            {/* @ts-ignore */}
                            <HiOutlineChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {assignedyEvents.data.length !== 0 ? (
                    <Pagination
                      currentPage={assignedEventscurrentPage}
                      totalPages={assignedyEvents.total}
                      isLoading={false}
                      onPageChange={setAssignedEventsCurrentPage}
                    />
                  ) : (
                    <EmptyStateMessage
                      title="No Assigned Events Found"
                      message="You have not been assigned to any events yet. Please check back later."
                      icon={
                        // @ts-ignore
                        <HiOutlineCalendar className="w-12 h-12 text-gold-500" />
                      }
                      showCreateButton={false}
                    />
                  )}
                </div>
              </TabItem>
            )}

            {/* @ts-ignore */}
            {ability.can("manage", "Event")  && (
              <TabItem title="Board Meetings">
                <div className="mt-6 space-y-6">
                  <div className="flex justify-end mb-4">
                    <select
                      value={boardMeetingType}
                      onChange={(e) => setBoardMeetingType(e.target.value)}
                      className="block pl-3 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-gold-500 dark:focus:ring-gold-500 focus:border-transparent transition-shadow cursor-pointer"
                    >
                      <option value="">All Meeting Types</option>
                      <option value={EventType.BOARD_MEETING}>Board Meeting</option>
                      <option value={EventType.GENERAL_BODY_MEETING}>General Body Meeting</option>
                    </select>
                  </div>

                  {boardMeetings.data?.map((event) => (
                    <div
                      key={event.id}
                      className="bg-gray-800 border border-gold-500 rounded-xl p-5 cursor-pointer"
                      onClick={() => router.push(`/events/${event.id}`)}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <h2 className="text-xl text-gold-500 font-bold truncate">
                            {event.title}
                          </h2>
                          <div 
                            className="text-white text-sm mt-1 line-clamp-2 break-words prose prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: event.details || "" }}
                          />
                          <div className="flex items-center gap-2 mt-3 text-white flex-wrap">
                            {/* @ts-ignore */}
                            <HiOutlineCalendar className="text-gold-500 w-5 h-5" />
                            <span className="text-sm font-medium">
                              {formatDateAndTime(event.startDate || "", true)}
                            </span>{" "}
                            -{" "}
                            <span className="text-sm font-medium">
                              {formatDateAndTime(event.endDate || "", true)}
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <button className="w-8 h-8 bg-gold-500 text-black rounded-full flex items-center justify-center">
                            {/* @ts-ignore */}
                            <HiOutlineChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {boardMeetings.data?.length !== 0 ? (
                    <Pagination
                      currentPage={boardMeetingsCurrentPage}
                      totalPages={boardMeetings.total}
                      isLoading={false}
                      onPageChange={setBoardMeetingsCurrentPage}
                    />
                  ) : (
                    <EmptyStateMessage
                      title="No Board Meetings Found"
                      message="There are currently no board meetings scheduled. Please check back later."
                      icon={
                        // @ts-ignore
                        <HiOutlineCalendar className="w-12 h-12 text-gold-500" />
                      }
                      showCreateButton={false}
                    />
                  )}
                </div>
              </TabItem>
            )}

            {/* @ts-ignore */}
            {ability.can("approve", "Event") && (
              <TabItem title="Approval Management">
                <div className="mt-6 space-y-6">
                  <div className="flex justify-end mb-4">
                    <Select
                      value={approvalFilter}
                      onChange={(e) => setApprovalFilter(e.target.value)}
                      className="w-48"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="APPROVED">Approved</option>
                    </Select>
                  </div>

                  {pendingEvents.data?.map((event) => (
                    <div
                      key={event.id}
                      className="bg-gray-800 border border-gold-500 rounded-xl p-5 cursor-pointer hover:border-gold-400 transition-colors"
                      onClick={() => {
                        setSelectedEventForApproval(event);
                        setOpenApprovalModal(true);
                      }}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <h2 className="text-xl text-gold-500 font-bold truncate">
                            {event.title}
                          </h2>
                          <div 
                            className="text-white text-sm mt-1 line-clamp-2 break-words prose prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: event.details || "" }}
                          />
                          <div className="flex items-center gap-2 mt-3 text-white flex-wrap">
                            {/* @ts-ignore */}
                            <HiOutlineCalendar className="text-gold-500 w-5 h-5" />
                            <span className="text-sm font-medium">
                              {formatDateAndTime(event.startDate || "", true)}
                            </span>{" "}
                            -{" "}
                            <span className="text-sm font-medium">
                              {formatDateAndTime(event.endDate || "", true)}
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <button className="w-8 h-8 bg-gold-500 text-black rounded-full flex items-center justify-center">
                            {/* @ts-ignore */}
                            <HiOutlineChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {pendingEvents.data.length !== 0 ? (
                    <Pagination
                      currentPage={pendingEventsCurrentPage}
                      totalPages={pendingEvents.total}
                      isLoading={false}
                      onPageChange={setPendingEventsCurrentPage}
                    />
                  ) : (
                    <EmptyStateMessage
                      title={`No ${approvalFilter === "PENDING" ? "Pending" : "Rejected"} Events Found`}
                      message={`There are currently no ${approvalFilter.toLowerCase()} events.`}
                      icon={
                        // @ts-ignore
                        <HiOutlineCalendar className="w-12 h-12 text-gold-500" />
                      }
                      showCreateButton={false}
                    />
                  )}
                </div>
              </TabItem>
            )}

            {/* @ts-ignore */}
            {ability.can("read", "EventSponsorshipPackage") && ADMIN_ROLES.includes(user.Role?.name) && (
              <TabItem title="Sponsorship Packages">
                <div className="mt-6">
                  <SponsorshipPackagesTab token={token || ""} />
                </div>
              </TabItem>
            )}
          </Tabs>

          <EventModal
            open={openCreateModal}
            onClose={() => setOpenCreateModal(false)}
            existingData={undefined}
          />

          <EventApprovalModal
            showModal={openApprovalModal}
            setShowModal={setOpenApprovalModal}
            event={selectedEventForApproval}
            token={token || ""}
            onSuccess={handleApprovalSuccess}
          />
        </div>
      </div>
    </div>
  );
}
