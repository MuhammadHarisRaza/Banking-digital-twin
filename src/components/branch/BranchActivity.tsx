import { useMemo } from "react";
import { getActivity } from "../../data/activity";
import type { Branch } from "../../types";
import ActivityList from "../common/ActivityList";

export default function BranchActivity({ branch }: { branch: Branch }) {
  const events = useMemo(() => getActivity(branch), [branch]);
  return <ActivityList events={events} />;
}
