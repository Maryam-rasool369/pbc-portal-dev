import _ from "lodash";

export const formatStatus = (status: string) => {
  return _.startCase(_.toLower(status.replace(/_/g, " ")));
}