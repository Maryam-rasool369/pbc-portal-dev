export enum Roles {
  INDIVIDUAL = "Individual",
  CORPORATE = "Corporate",
  PBC_STAFF = "PBC Staff",
  ADMIN = "Admin",
  CHAIRMAN = "Chairman",
  GENERAL_SECRETARY = "Secretary General",
  VC_FINANCE = "VC Finance",
  DIRECTOR = "Director",
  PBC_ADVISOR = "PBC Advisor",
  ELECTION_COMMISSIONER = "Election Commissioner",
  ELECTION_COMMITTEE_MEMBER = "Election Committee Member",
  SUPERUSER = "Superuser",
}

export const ADMIN_ROLES: Roles[] = [
  Roles.ADMIN,
  Roles.CHAIRMAN,
  Roles.GENERAL_SECRETARY,
  Roles.VC_FINANCE,
  Roles.DIRECTOR,
  Roles.PBC_ADVISOR,
  Roles.SUPERUSER,
];

export enum RoleIdStr {
  INDIVIDUAL = "1",
  CORPORATE = "2",
  PBC_STAFF = "3",
  ADMIN = "4",
  CHAIRMAN = "5",
  GENERAL_SECRETARY = "6",
  VC_FINANCE = "7",
  DIRECTOR = "8",
  JOB_APPLICANT = "9",
  ELECTION_COMMISSIONER = "10",
  ELECTION_COMMITTEE_MEMBER = "11",
  SUPERUSER = "12",
  PBC_ADVISOR = "13",
}

export enum RoleId {
  INDIVIDUAL = 1,
  CORPORATE = 2,
  PBC_STAFF = 3,
  ADMIN = 4,
  CHAIRMAN = 5,
  GENERAL_SECRETARY = 6,
  VC_FINANCE = 7,
  DIRECTOR = 8,
  JOB_APPLICANT = 9,
  ELECTION_COMMISSIONER = 10,
  ELECTION_COMMITTEE_MEMBER = 11,
  SUPERUSER = 12,
  PBC_ADVISOR = 13,
}
