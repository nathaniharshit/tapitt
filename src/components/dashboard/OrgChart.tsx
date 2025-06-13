import React, { useEffect, useState } from "react";

const MAX_EMPLOYEES_PER_ROW = 5;

function buildOrgTree(employees) {
  const superAdmins = employees.filter(e => e.role === "super_admin" || e.role === "superadmin");
  const admins = employees.filter(e => e.role === "admin");
  const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)));
  const deptMap: { [key: string]: Array<any> } = {};
  employees.forEach(e => {
    if (e.role === "employee" || e.role === "intern") {
      if (!deptMap[e.department || "No Department"]) deptMap[e.department || "No Department"] = [];
      deptMap[e.department || "No Department"].push(e);
    }
  });

  return {
    name: superAdmins.map(a => `${a.firstname} ${a.lastname}`).join(", ") || "Super Admin",
    title: superAdmins.length > 0 && superAdmins[0].position ? superAdmins[0].position : "Super Admin",
    children: admins.map(admin => ({
      name: `${admin.firstname} ${admin.lastname}`,
      title: admin.position || "Admin",
      children: departments.map(dept => ({
        name: dept,
        title: "Department",
        children: (deptMap[dept as string] || []).map(emp => ({
          name: `${emp.firstname} ${emp.lastname}`,
          title: emp.position || (emp.role.charAt(0).toUpperCase() + emp.role.slice(1))
        }))
      }))
    }))
  };
}

function OrgNode({ node, level = 0 }) {
  // For department nodes, chunk children if too many employees
  if (node.title === "Department" && node.children && node.children.length > MAX_EMPLOYEES_PER_ROW) {
    const chunks = [];
    for (let i = 0; i < node.children.length; i += MAX_EMPLOYEES_PER_ROW) {
      chunks.push(node.children.slice(i, i + MAX_EMPLOYEES_PER_ROW));
    }
    return (
      <div className="flex flex-col items-center relative">
        <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow px-4 py-2 mb-2 min-w-[120px] text-center">
          <div className="font-bold text-blue-700 dark:text-blue-300">{node.name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{node.title}</div>
        </div>
        <div className="flex flex-col gap-2">
          {chunks.map((chunk, idx) => (
            <div key={idx} className="flex flex-row gap-8 pt-4 z-10 justify-center">
              {chunk.map((child, cidx) => (
                <OrgNode key={cidx} node={child} level={level + 1} />
              ))}
              {idx === chunks.length - 1 && node.children.length > MAX_EMPLOYEES_PER_ROW * (idx + 1) && (
                <div className="flex items-center justify-center text-xs text-muted-foreground">
                  +{node.children.length - MAX_EMPLOYEES_PER_ROW * (idx + 1)} more
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center relative">
      <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow px-4 py-2 mb-2 min-w-[120px] text-center">
        <div className="font-bold text-blue-700 dark:text-blue-300">{node.name}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{node.title}</div>
      </div>
      {node.children && node.children.length > 0 && (
        <div className="flex flex-row justify-center items-start relative">
          {/* Vertical line from parent to children */}
          <div className="absolute left-1/2 top-0 w-0.5 h-4 bg-gray-400 dark:bg-gray-600 -translate-x-1/2 z-0" />
          {/* Horizontal line connecting children */}
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-400 dark:bg-gray-600 z-0" />
          {/* Children nodes */}
          <div className="flex flex-row gap-8 pt-4 z-10">
            {node.children.map((child, idx) => (
              <OrgNode key={idx} node={child} level={level + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const OrgChart = () => {
  const [employees, setEmployees] = useState([]);
  const [orgTree, setOrgTree] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5050/api/employees")
      .then(res => res.json())
      .then(data => {
        setEmployees(data);
        setOrgTree(buildOrgTree(data));
      });
  }, []);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-8 text-center">Organization Structure</h2>
      <div className="flex justify-center overflow-x-auto">
        {orgTree ? <OrgNode node={orgTree} /> : <div>Loading...</div>}
      </div>
      <div className="mt-4 text-center text-xs text-muted-foreground">
        <span>Tip: Scroll horizontally if the chart is wide. Large departments will show "+N more" if too many employees.</span>
      </div>
    </div>
  );
};

export default OrgChart;
