import Can from "@/components/rbac/Can";
import { useEffect, useState } from "react";
import { Modal, Button } from "flowbite-react";
import { toast } from "react-toastify";

interface AttendanceUser {
  user: {
    name: string;
    email: string;
  };
  status: "ATTENDED" | "NOT_ATTENDED";
  userId: number;
}

interface AttendancePanelProps {
  eventId: string;
  token: string;
  eventEndDate: string;
  eventStartDate: string;
  isCancelled: boolean;
  eventAssignee: {
    id: number;
    userId: number;
    user: {
      name: string;
      email: string;
    };
  }[];
}

export default function AttendancePanel({
  eventId,
  token,
  eventEndDate,
  eventStartDate,
  isCancelled,
  eventAssignee
}: AttendancePanelProps) {
  const [attendanceData, setAttendanceData] = useState<AttendanceUser[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const now = new Date();
  const isAttendanceAllowed =
    !isCancelled && now >= new Date(eventStartDate);

  const fetchAttendanceData = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/event-attendance/${eventId}`,
        {
          headers: {
            "Content-Type": "application/json",
            token,
          },
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch attendance");
      setAttendanceData(data.data);
    } catch (error) {
      toast.error("Error loading attendance data");
    }
  };

  useEffect(() => {
    if (eventId && token) fetchAttendanceData();
  }, [eventId, token]);

  const handleMarkAttendance = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/event-attendance/${eventId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            token,
          },
          body: JSON.stringify({ userIds: selectedUserIds }),
        },
      );
      const data = await res.json();
      if (!data.error) {
        toast.success("Attendance marked successfully");
        setShowModal(false);
        setSelectedUserIds([]);
        fetchAttendanceData();
      } else {
        toast.error(data?.error[0]?.msg || "Failed to mark attendance");
      }
    } catch (error) {
      toast.error("Failed to mark attendance");
    } finally {
      setLoading(false);
    }
  };

  const present = attendanceData.filter((u) => u.status === "ATTENDED");
  const absent = attendanceData.filter((u) => u.status === "NOT_ATTENDED");
  const allSelected =
    selectedUserIds.length === absent.length && absent.length > 0;

  const toggleSelectAll = () => {
    setSelectedUserIds((prev) =>
      prev.length === absent.length ? [] : absent.map((u) => u.userId),
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 w-full">
      <h2 className="text-lg font-semibold text-gold-500 mb-3">
        Event Attendance
      </h2>
      <div className="flex justify-between text-sm text-white mb-4">
      {new Date(eventStartDate) > now ? 
      <span>
         Total Invited:{" "}
          <span className="text-green-400 font-bold">{eventAssignee?.length || 0}</span>
        </span>:
        <>
        <span>
          Present:{" "}
          <span className="text-green-400 font-bold">{present.length}</span>
        </span>
        <span>
          Absent:{" "}
          <span className="text-red-400 font-bold">{absent.length}</span>
        </span>
      </>
      }
      </div>
      <Can I="update" a="EventAttendance">
      {isAttendanceAllowed &&  (
        
        <Button
          onClick={() => setShowModal(true)}
          disabled={absent.length === 0}
          className="bg-gold-500 text-black hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {absent.length > 0 ? "Mark Attendance" : "All Users Present"}
        </Button>
      )}
      </Can>

      <div className="mt-4">
        {attendanceData.length > 0 ? (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {attendanceData.map((attendee) => {
              const attended = attendee.status === "ATTENDED";

              return (
                <div
                  key={attendee.userId}
                  className="flex items-center gap-3 p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <div className="w-9 h-9 bg-gold-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-gold-500 font-semibold text-sm">
                      {attendee.user.name?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate text-sm">
                      {attendee.user.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {attendee.user.email}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${attended
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-gray-600/50 text-gray-400 border border-gray-600"
                      }`}
                  >
                    {attended ? "✓ Attended" : "Absent"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-6">No attendees assigned</p>
        )}
      </div>

      <Modal
        show={showModal}
        onClose={() => !loading && setShowModal(false)}
        size="4xl"
        dismissible={!loading}
        className="max-h-[90vh] overflow-hidden"
      >
        <Modal.Header className="border-b border-gold-500 bg-gray-800">
          Mark Attendance
        </Modal.Header>
        <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900 overflow-y-auto max-h-[calc(90vh-10rem)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white">
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-2 flex-shrink-0">
                <h3 className="text-gold-500 text-md font-bold">
                  Absent Users
                </h3>
                {absent.length > 0 && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="form-checkbox accent-gold-500"
                    />
                    Select All
                  </label>
                )}
              </div>
              <ul className="overflow-y-auto space-y-2 border border-gray-700 rounded-lg p-2 flex-grow max-h-[250px]">
                {absent.map((user) => (
                  <li
                    key={user.userId}
                    className="flex items-center justify-between p-2 bg-gray-700 rounded"
                  >
                    <span>{user.user.name}</span>
                    <input
                      type="checkbox"
                      className="form-checkbox accent-gold-500"
                      checked={selectedUserIds.includes(user.userId)}
                      onChange={() => {
                        setSelectedUserIds((prev) =>
                          prev.includes(user.userId)
                            ? prev.filter((id) => id !== user.userId)
                            : [...prev, user.userId],
                        );
                      }}
                    />
                  </li>
                ))}
                {absent.length === 0 && (
                  <li className="p-2 text-gray-400 text-center">
                    No absent users
                  </li>
                )}
              </ul>
            </div>

            <div className="flex flex-col h-full">
              <h3 className="text-gold-500 text-md font-bold mb-2 flex-shrink-0">
                Present Users
              </h3>
              <ul className="overflow-y-auto space-y-2 border border-gray-700 rounded-lg p-2 flex-grow max-h-[250px]">
                {present.map((user) => (
                  <li
                    key={user.userId}
                    className="p-2 bg-green-700 text-white rounded cursor-not-allowed opacity-70"
                  >
                    {user.user.name}
                  </li>
                ))}
                {present.length === 0 && (
                  <li className="p-2 text-gray-400 text-center">
                    No present users
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button
              isProcessing={loading}
              className="bg-gold-500 text-black hover:bg-gold-600"
              onClick={handleMarkAttendance}
              disabled={selectedUserIds.length === 0}
            >
              Submit Attendance
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}
