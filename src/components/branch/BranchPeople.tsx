import { useMemo } from "react";
import { getEmployees } from "../../data/employees";
import type { Branch } from "../../types";
import StatusBadge from "../common/StatusBadge";

export default function BranchPeople({ branch }: { branch: Branch }) {
  const employees = useMemo(() => getEmployees(branch), [branch]);

  return (
    <div className="-mx-2 -mt-2 overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Designation</th>
            <th scope="col">Department</th>
            <th scope="col">Employee ID</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((e) => (
            <tr key={e.id}>
              <td className="!text-ink">{e.name}</td>
              <td>{e.designation}</td>
              <td>{e.department}</td>
              <td>{e.id}</td>
              <td>
                <StatusBadge status={e.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
