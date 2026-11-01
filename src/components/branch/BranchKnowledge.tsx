import { useMemo } from "react";
import { AGENTS } from "../../data/agents";
import { getKnowledge } from "../../data/knowledge";
import type { Branch } from "../../types";
import StatusBadge from "../common/StatusBadge";

export default function BranchKnowledge({ branch }: { branch: Branch }) {
  const knowledge = useMemo(() => getKnowledge(branch), [branch]);

  return (
    <div className="-mx-3 -mt-3 overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Knowledge base</th>
            <th scope="col">Category</th>
            <th scope="col">Associated agent</th>
            <th scope="col">Access</th>
          </tr>
        </thead>
        <tbody>
          {knowledge.map((kb) => (
            <tr key={kb.id}>
              <td className="!text-ink">{kb.name}</td>
              <td>{kb.category}</td>
              <td>{AGENTS[kb.agentId].name}</td>
              <td>
                <StatusBadge status={kb.access} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
