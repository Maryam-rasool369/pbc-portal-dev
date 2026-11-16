import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  HiBookOpen,
  HiChartPie,
  HiOutlineUserGroup,
  HiOfficeBuilding,
  HiUser,
  HiShoppingBag,
  HiOutlineSpeakerphone,
  HiCalendar,
  HiBadgeCheck,
  HiCash,
  HiClipboardCheck,
  HiUserRemove,
  HiClipboardList,
  HiLightBulb,
  HiUserGroup,
  HiCreditCard,
  HiOutlineNewspaper,
  HiStar,
  HiPresentationChartLine,
  HiChartBar,
  HiTrendingUp,
  HiDocumentReport,
  HiUsers,
  HiTrash,
  HiChat,
  HiChevronDoubleLeft,
  HiChevronDoubleRight,
} from "react-icons/hi";
import { PiListHeartFill } from "react-icons/pi";
import { Roles } from "@/enums/Roles";
import useAuthStore from "@/store/authStore";
import Can from "../rbac/Can";
import { FaAddressBook, FaVoteYea, FaHistory } from "react-icons/fa";
import { useAbility } from "@/hooks/useAbility";
import { useChats } from "@/hooks/useChats";
import { useSidebarCollapse } from "@/context/SidebarContext";

interface SidebarProps {
  activeMenu: string;
  isSidebarOpen: boolean;
}

const MemberRoles = [Roles.CORPORATE, Roles.INDIVIDUAL];

const ICON_CLASS =
  "w-6 h-6 flex-shrink-0 text-gray-500 transition duration-75 group-hover:text-gold-500 dark:text-gray-400 dark:group-hover:text-gold-400";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
  badge?: number;
}

function NavItem({ href, icon, label, active, collapsed, badge }: NavItemProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);

  const showTooltip = () => {
    if (!collapsed || !linkRef.current) return;
    const rect = linkRef.current.getBoundingClientRect();
    setTooltipPos({ top: rect.top + rect.height / 2, left: rect.right + 10 });
  };
  const hideTooltip = () => setTooltipPos(null);

  return (
    <li>
      <Link
        ref={linkRef}
        href={href}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        className={`${active ? "bg-gold-700 dark:bg-gold-700" : ""} ${collapsed ? "justify-center" : ""
          } relative flex items-center p-2 text-base text-gray-900 rounded-lg hover:bg-gray-100 hover:text-gold-500 group dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-gold-400`}
      >
        {icon}
        <span
          className={`text-left whitespace-nowrap overflow-hidden transition-all duration-200 ${collapsed ? "max-w-0 opacity-0 ml-0" : "max-w-[180px] opacity-100 ml-3 flex-1"
            }`}
        >
          {label}
        </span>
        {!!badge && badge > 0 && (
          collapsed ? (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-gold-500 ring-2 ring-white dark:ring-gray-800" />
          ) : (
            <span className="inline-flex items-center justify-center px-2 py-0.5 ml-3 text-xs font-bold rounded-full bg-gold-500 text-gray-900">
              {badge > 99 ? "99+" : badge}
            </span>
          )
        )}
      </Link>
      {collapsed && tooltipPos && typeof document !== "undefined" &&
        createPortal(
          <span
            className="pointer-events-none fixed z-50 -translate-y-1/2 whitespace-nowrap rounded-full bg-gold-500 px-2.5 py-1.5 text-xs font-medium text-gray-900 shadow-lg"
            style={{ top: tooltipPos.top, left: tooltipPos.left }}
          >
            {label}
          </span>,
          document.body,
        )}
    </li>
  );
}

export default function Sidebar(props: SidebarProps) {
  const { activeMenu, isSidebarOpen } = props;
  const { collapsed, toggleCollapsed } = useSidebarCollapse();

  const user = useAuthStore((state) => state.user);
  const ability = useAbility();
  const isDocumentReviewPending = Boolean(
    (user as any)?.isDocumentReviewPending,
  );

  const { data: chatsData } = useChats();
  const unreadChatsCount = (chatsData?.data ?? []).reduce(
    (sum, chat) => sum + (chat.unreadCount ?? 0),
    0,
  );

  return (
    <>
      <aside
        id="sidebar"
        className={`${isSidebarOpen ? "" : "hidden"} ${collapsed ? "w-20" : "w-64"
          } flex fixed top-0 left-0 z-20 flex-col flex-shrink-0 h-full pt-16 font-normal lg:flex transition-width duration-300 ease-in-out`}
        aria-label="Sidebar"
      >
        <div className="relative flex flex-col flex-1 min-h-0 pt-0 bg-white border-r border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex flex-col flex-1 pt-5 pb-4 overflow-y-auto overflow-x-hidden">
            <div className="flex-1 px-3 space-y-1 bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              <ul className="pb-2 space-y-2">

                {/*User Marketplace || Profile*/}
                <Can I="read" a="Profile">
                  <NavItem
                    href="/userMarketplace"
                    active={activeMenu === "userMarketplace"}
                    collapsed={collapsed}
                    label="User Profile"
                    icon={
                      // @ts-ignore
                      <HiUser className={ICON_CLASS} />
                    }
                  />
                </Can>
                {!isDocumentReviewPending && (
                  <>
                    {/* Constitution */}
                    {/* <Can I="read" a="Constitution">
                  <li>
                    <Link
                      href="/constitutions"
                      className={`${
                        activeMenu === "constitutions"
                          ? "bg-gold-700 dark:bg-gold-700"
                          : ""
                      } flex items-center p-2 text-base text-gray-900 rounded-lg hover:bg-gray-100 group dark:text-gray-200 dark:hover:bg-gray-700`}
                    >
                      <HiBookOpen className="w-6 h-6 text-gray-500 transition duration-75 group-hover:text-gold-500 dark:text-gray-400 dark:group-hover:text-gold-400" />
                      <span
                        className="flex-1 ml-3 text-left whitespace-nowrap"
                        sidebar-toggle-item="true"
                      >
                        Constitutions
                      </span>
                    </Link>
                  </li>
                </Can> */}

                    {/* Membership */}
                    <Can I="read" a="Membership">
                      <NavItem
                        href="/memberships"
                        active={activeMenu === "memberships"}
                        collapsed={collapsed}
                        label="Memberships"
                        icon={
                          // @ts-ignore
                          <HiChartPie className={ICON_CLASS} />
                        }
                      />
                    </Can>

                    {/* Membership Analytics */}
                    <Can I="read" a="Membership">
                      <NavItem
                        href="/membership-analytics"
                        active={activeMenu === "membership-analytics"}
                        collapsed={collapsed}
                        label="Membership Analytics"
                        icon={
                          // @ts-ignore
                          <HiPresentationChartLine className={ICON_CLASS} />
                        }
                      />
                    </Can>

                    {/* Business Group Analytics */}
                    <Can I="read" a="Membership">
                      <NavItem
                        href="/user-membership-analytics"
                        active={activeMenu === "user-membership-analytics"}
                        collapsed={collapsed}
                        label="Business Group Analytics"
                        icon={
                          // @ts-ignore
                          <HiChartBar className={ICON_CLASS} />
                        }
                      />
                    </Can>

                    {/* Director Analytics */}
                    <Can I="read" a="DirectorAnalytics">
                      <NavItem
                        href="/director-analytics"
                        active={activeMenu === "director-analytics"}
                        collapsed={collapsed}
                        label="Board Members"
                        icon={
                          // @ts-ignore
                          <HiTrendingUp className={ICON_CLASS} />
                        }
                      />
                    </Can>

                    {/* Reports & Analytics */}
                    <Can I="read" a="Logs">
                      <NavItem
                        href="/reports"
                        active={activeMenu === "reports"}
                        collapsed={collapsed}
                        label="Reports & Analytics"
                        icon={
                          // @ts-ignore
                          <HiDocumentReport className={ICON_CLASS} />
                        }
                      />
                    </Can>

                    {/* Membership Plan */}
                    <Can I="read" a="MembershipPlan">
                      <NavItem
                        href="/membership-plans"
                        active={activeMenu === "membership-plans"}
                        collapsed={collapsed}
                        label="Membership Plan"
                        icon={
                          // @ts-ignore
                          <HiCreditCard className={ICON_CLASS} />
                        }
                      />
                    </Can>

                    {/* Committee */}
                    <Can I="read" a="Committee">
                      <NavItem
                        href="/committee"
                        active={activeMenu === "committee"}
                        collapsed={collapsed}
                        label="Committees"
                        icon={
                          // @ts-ignore
                          <HiOfficeBuilding className={ICON_CLASS} />
                        }
                      />
                    </Can>

                    {/* Users */}
                    {user && !MemberRoles.includes(user.Role?.name as Roles) && user.Role?.name !== Roles.PBC_ADVISOR && (
                      <Can I="read" a="User">
                        <NavItem
                          href="/users"
                          active={activeMenu === "users"}
                          collapsed={collapsed}
                          label="Users"
                          icon={
                            // @ts-ignore
                            <HiUserGroup className={ICON_CLASS} />
                          }
                        />
                      </Can>
                    )}

                    {/* Super User */}
                    <Can I="manage" a="all">
                      <NavItem
                        href="/super-user"
                        active={activeMenu === "super-user"}
                        collapsed={collapsed}
                        label="Users Permissions"
                        icon={
                          // @ts-ignore
                          <HiOutlineUserGroup className={ICON_CLASS} />
                        }
                      />
                    </Can>
                    {/* User Rejections */}
                    {user && !MemberRoles.includes(user.Role?.name as Roles) && user.Role?.name !== Roles.PBC_ADVISOR && (
                      <Can I="read" a="User">
                        <NavItem
                          href="/user-rejections"
                          active={activeMenu === "user-rejections"}
                          collapsed={collapsed}
                          label="User Rejections"
                          icon={
                            // @ts-ignore
                            <HiUserRemove className={ICON_CLASS} />
                          }
                        />
                      </Can>
                    )}

                    {/* Role Transmission */}
                    <Can I="read" a="RoleTransmission">
                      <NavItem
                        href="/roleTransmission"
                        active={activeMenu === "role-transmission"}
                        collapsed={collapsed}
                        label="Role Transition"
                        icon={
                          // @ts-ignore
                          <HiUserGroup className={ICON_CLASS} />
                        }
                      />
                    </Can>

                    {/* Soft Deletions */}
                    <Can I="read" a="SoftDeleteRequest">
                      <NavItem
                        href="/soft-delete"
                        active={activeMenu === "soft-delete"}
                        collapsed={collapsed}
                        label="Soft Deletions"
                        icon={
                          // @ts-ignore
                          <HiTrash className={ICON_CLASS} />
                        }
                      />
                    </Can>

                    {/* Wishlist */}
                    <Can I="read" a="Wishlist">
                      <NavItem
                        href="/wishlists"
                        active={activeMenu === "wishlists"}
                        collapsed={collapsed}
                        label="Wishlists"
                        icon={
                          // @ts-ignore
                          <PiListHeartFill className={ICON_CLASS} />
                        }
                      />
                    </Can>

                    {/*Events*/}
                    <Can I="read" a="Event">
                      <NavItem
                        href="/events"
                        active={activeMenu === "events"}
                        collapsed={collapsed}
                        label="Events"
                        icon={
                          // @ts-ignore
                          <HiCalendar className={ICON_CLASS} />
                        }
                      />
                    </Can>

                    <Can I="read" a="AnnualSponsorship">
                      <NavItem
                        href="/annual-sponsor"
                        active={activeMenu === "annual-sponsor"}
                        collapsed={collapsed}
                        label="Annual Sponsor"
                        icon={
                          // @ts-ignore
                          <HiStar className={ICON_CLASS} />
                        }
                      />
                    </Can>

                    {/*Tenure*/}
                    <Can I="read" a="Tenure">
                      <NavItem
                        href="/tenure"
                        active={activeMenu === "tenure"}
                        collapsed={collapsed}
                        label="Tenure"
                        icon={
                          // @ts-ignore
                          <HiBadgeCheck className={ICON_CLASS} />
                        }
                      />
                    </Can>
                    {/* Marketplace */}
                    {(ability?.can("read", "RFQ") || ability?.can("read", "Product")) && (
                      <NavItem
                        href="/marketplace"
                        active={activeMenu === "marketplace"}
                        collapsed={collapsed}
                        label="Marketplace"
                        icon={
                          // @ts-ignore
                          <HiShoppingBag className={ICON_CLASS} />
                        }
                      />
                    )}

                    <Can I="read" a="BusinessConnection">
                      <NavItem
                        href="/business-connections"
                        active={activeMenu === "business-connections"}
                        collapsed={collapsed}
                        label="Business Connections"
                        icon={
                          // @ts-ignore
                          <HiClipboardList className={ICON_CLASS} />
                        }
                      />
                    </Can>

                    {/*Support*/}
                    <Can I="read" a="Ticket">
                      <NavItem
                        href="/support"
                        active={activeMenu === "support"}
                        collapsed={collapsed}
                        label="Support Tickets"
                        icon={
                          // @ts-ignore
                          <HiOutlineSpeakerphone className={ICON_CLASS} />
                        }
                      />
                    </Can>

                    {/* Initiatives */}
                    <Can I="read" a="Initiative">
                      <NavItem
                        href="/initiatives"
                        active={activeMenu === "initiatives"}
                        collapsed={collapsed}
                        label="Initiatives"
                        icon={
                          // @ts-ignore
                          <HiLightBulb className={ICON_CLASS} />
                        }
                      />
                    </Can>

                    {/*Chat*/}
                    <Can I="read" a="Chat">
                      <NavItem
                        href="/chat"
                        active={activeMenu === "chat"}
                        collapsed={collapsed}
                        label="Chat"
                        badge={unreadChatsCount}
                        icon={
                          // @ts-ignore
                          <HiChat className={ICON_CLASS} />
                        }
                      />
                    </Can>

                    {/* Transactions | Expense */}
                    <Can I="read" a="Transaction">
                      <NavItem
                        href="/expense"
                        active={activeMenu === "expense"}
                        collapsed={collapsed}
                        label="Expense"
                        icon={
                          // @ts-ignore
                          <HiCash className={ICON_CLASS} />
                        }
                      />
                    </Can>

                    {/* Election */}
                    <Can I="read" a="Election">
                      <NavItem
                        href="/election"
                        active={activeMenu === "election"}
                        collapsed={collapsed}
                        label="Elections"
                        icon={
                          // @ts-ignore
                          <FaVoteYea className={ICON_CLASS} />
                        }
                      />
                    </Can>
                    <Can I="read" a="Task">
                      <NavItem
                        href="/tasks"
                        active={activeMenu === "tasks"}
                        collapsed={collapsed}
                        label="Tasks"
                        icon={
                          // @ts-ignore
                          <HiClipboardCheck className={ICON_CLASS} />
                        }
                      />
                    </Can>

                    {/* Attendance */}
                    <Can I="read" a="Attendance">
                      <NavItem
                        href="/attendance"
                        active={activeMenu === "attendance"}
                        collapsed={collapsed}
                        label="Attendance"
                        icon={
                          // @ts-ignore
                          <HiBadgeCheck className={ICON_CLASS} />
                        }
                      />
                    </Can>

                    {/* Logs (Activity Log + Interaction Log) */}
                    {ability?.can("read", "Logs") && (
                      <NavItem
                        href="/logs"
                        active={activeMenu === "logs"}
                        collapsed={collapsed}
                        label="Logs"
                        icon={
                          // @ts-ignore
                          <FaHistory className="w-5 h-5 flex-shrink-0 text-gray-500 transition duration-75 group-hover:text-gold-500 dark:text-gray-400 dark:group-hover:text-gold-400" />
                        }
                      />
                    )}

                    {/* Dashboard - Online Users */}
                    <Can I="read" a="OnlineUsers">
                      <NavItem
                        href="/dashboard"
                        active={activeMenu === "dashboard"}
                        collapsed={collapsed}
                        label="Dashboard"
                        icon={
                          // @ts-ignore
                          <HiUsers className={ICON_CLASS} />
                        }
                      />
                    </Can>

                    {/* News */}
                    <Can I="read" a="News">
                      <NavItem
                        href="/news"
                        active={activeMenu === "news"}
                        collapsed={collapsed}
                        label="News & Announcements"
                        icon={
                          // @ts-ignore
                          <HiOutlineNewspaper className={ICON_CLASS} />
                        }
                      />
                    </Can>

                    {/* Newsletter */}
                    <Can I="read" a="Newsletter">
                      <NavItem
                        href="/newsletter"
                        active={activeMenu === "newsletter"}
                        collapsed={collapsed}
                        label="Newsletter"
                        icon={
                          // @ts-ignore
                          <HiOutlineNewspaper className={ICON_CLASS} />
                        }
                      />
                    </Can>

                    {/* Customize Birthday */}
                    {(user?.Role?.name === Roles.ADMIN || user?.Role?.name === Roles.CHAIRMAN) && (
                      <NavItem
                        href="/admin/customize-birthday"
                        active={activeMenu === "customize-birthday"}
                        collapsed={collapsed}
                        label="Customize Birthday"
                        icon={
                          // @ts-ignore
                          <HiCalendar className={ICON_CLASS} />
                        }
                      />
                    )}

                    {/* Leads */}
                    <Can I="read" a="Lead">
                      <NavItem
                        href="/leads"
                        active={activeMenu === "leads"}
                        collapsed={collapsed}
                        label="Leads"
                        icon={
                          // @ts-ignore
                          <FaAddressBook className={ICON_CLASS} />
                        }
                      />
                    </Can>

                    {/* Job Post */}
                    <Can I="read" a="JobPost">
                      <NavItem
                        href="/job-post"
                        active={activeMenu === "job-post"}
                        collapsed={collapsed}
                        label="Post Job"
                        icon={
                          // @ts-ignore
                          <HiOfficeBuilding className={ICON_CLASS} />
                        }
                      />
                    </Can>
                  </>
                )}

              </ul>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden lg:flex absolute -right-3 top-24 z-30 items-center justify-center w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-500 shadow-sm hover:text-gray-900 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            {collapsed ? (
              // @ts-ignore
              <HiChevronDoubleRight className="w-3.5 h-3.5" />
            ) : (
              // @ts-ignore
              <HiChevronDoubleLeft className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </aside>

      <div
        className={`${isSidebarOpen ? "" : "hidden"
          } fixed inset-0 z-10 bg-gray-900/50 dark:bg-gray-900/90 lg:hidden`}
        id="sidebarBackdrop"
      ></div>
    </>
  );
}
