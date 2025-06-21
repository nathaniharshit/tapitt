import { useState, useEffect } from 'react';

// Build a hierarchy: superadmin(s) -> admin(s) -> others
function buildOrgTree(employees) {
  const empMap = {};
  employees.forEach(emp => {
    empMap[emp._id] = { ...emp, children: [] };
  });

  // Assign children to their reporting manager
  employees.forEach(emp => {
    if (emp.reportingManager && empMap[emp.reportingManager]) {
      empMap[emp.reportingManager].children.push(empMap[emp._id]);
    }
  });

  // Find all superadmins (no reportingManager, role === 'superadmin')
  const superAdmins = employees.filter(emp => emp.role === 'superadmin' && !emp.reportingManager);

  // If multiple superadmins, group under a virtual node
  let root;
  if (superAdmins.length > 1) {
    root = {
      name: 'Super Admins',
      type: 'virtual-root',
      children: superAdmins.map(sa => empMap[sa._id]),
    };
  } else if (superAdmins.length === 1) {
    root = empMap[superAdmins[0]._id];
  } else {
    // fallback: anyone without reportingManager
    const roots = employees.filter(emp => !emp.reportingManager).map(emp => empMap[emp._id]);
    root = {
      name: 'Organization',
      type: 'virtual-root',
      children: roots,
    };
  }

  return root;
}

function getDisplayName(node) {
  return node.type === 'virtual-root'
    ? node.name
    : `${node.firstname || ''} ${node.lastname || ''}`.trim() || node.name;
}

function getRoleColor(role) {
  switch (role) {
    case 'superadmin': return '#2563eb';
    case 'admin': return '#059669';
    case 'manager': return '#f59e42';
    case 'employee': return '#eab308';
    case 'intern': return '#a21caf';
    default: return '#64748b';
  }
}

function groupChildrenByDepartment(children) {
  const grouped: { [dept: string]: any[] } = {};
  children.forEach(child => {
    const dept = child.department || 'No Department';
    if (!grouped[dept]) grouped[dept] = [];
    grouped[dept].push(child);
  });
  return grouped;
}

function GraphNode({ node, expandedMap, setExpandedMap }) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedMap[node._id || node.name] || node.type === 'virtual-root';

  const toggleExpand = () => {
    if (!hasChildren) return;
    setExpandedMap((prev) => ({
      ...prev,
      [node._id || node.name]: !isExpanded,
    }));
  };

  const cardStyle = {
    display: 'inline-block',
    padding: '16px 28px',
    background: '#fff',
    borderRadius: 12,
    fontWeight: node.type === 'virtual-root' ? 700 : 500,
    fontSize: node.type === 'virtual-root' ? 22 : 16,
    marginBottom: 8,
    minWidth: 200,
    textAlign: 'center',
    border: `3px solid ${getRoleColor(node.role)}`,
    boxShadow: '0 4px 24px #6366f11a',
    color: getRoleColor(node.role),
    position: 'relative' as 'relative',
    transition: 'box-shadow 0.2s, border 0.2s',
    cursor: hasChildren ? 'pointer' : 'default',
    userSelect: 'none',
  };

  const badgeStyle = {
    display: 'inline-block',
    marginLeft: 8,
    padding: '2px 10px',
    borderRadius: 8,
    fontSize: 13,
    background: getRoleColor(node.role) + '22',
    color: getRoleColor(node.role),
    fontWeight: 600,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', minWidth: 200 }}>
      <div style={{ ...cardStyle, textAlign: 'center' as 'center', userSelect: 'none' as const }} onClick={toggleExpand}>
        {getDisplayName(node)}
        {node.position && (
          <span style={{ marginLeft: 8, color: '#64748b', fontSize: 14 }}>
            {node.position}
          </span>
        )}
        {node.role && node.type !== 'virtual-root' && (
          <span style={badgeStyle}>
            {node.role.charAt(0).toUpperCase() + node.role.slice(1)}
          </span>
        )}
        {hasChildren && (
          <span style={{
            marginLeft: 12,
            fontWeight: 900,
            fontSize: 18,
            color: '#6366f1',
            cursor: 'pointer',
            userSelect: 'none',
            verticalAlign: 'middle',
          }}>
            {isExpanded ? '−' : '+'}
          </span>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div style={{ width: '100%', position: 'relative' }}>
          <svg width="2" height="30" style={{ display: 'block', margin: '0 auto' }}>
            <line x1="1" y1="0" x2="1" y2="30" stroke="#6366f1" strokeWidth="2" />
          </svg>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', marginTop: 0 }}>
            {Object.keys(groupChildrenByDepartment(node.children)).length > 1 && (
              <svg
                width={Math.max(Object.keys(groupChildrenByDepartment(node.children)).length * 220, 220)}
                height="24"
                style={{ position: 'absolute', left: 0, top: 0, zIndex: 0 }}
              >
                <line
                  x1={100}
                  y1={12}
                  x2={Math.max(Object.keys(groupChildrenByDepartment(node.children)).length * 220 - 100, 100)}
                  y2={12}
                  stroke="#6366f1"
                  strokeWidth="2"
                />
                {Object.keys(groupChildrenByDepartment(node.children)).map((_, idx) => (
                  <line
                    key={idx}
                    x1={100 + idx * 220}
                    y1={12}
                    x2={100 + idx * 220}
                    y2={30}
                    stroke="#6366f1"
                    strokeWidth="2"
                  />
                ))}
              </svg>
            )}
            {Object.entries(groupChildrenByDepartment(node.children)).map(([dept, deptChildren], idx) => (
              <div key={dept} style={{ margin: '0 20px', position: 'relative', zIndex: 1 }}>
                <div style={{
                  fontWeight: 600,
                  color: '#6366f1',
                  marginBottom: 4,
                  fontSize: 15,
                  background: '#e0e7ff',
                  borderRadius: 6,
                  padding: '2px 10px',
                  display: 'inline-block'
                }}>
                  {dept}
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
                  {deptChildren.map((child, cidx) => (
                    <div key={child._id || child.name} style={{ margin: '0 10px' }}>
                      <GraphNode node={child} expandedMap={expandedMap} setExpandedMap={setExpandedMap} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const OrgChart = () => {
  const [employees, setEmployees] = useState([]);
  const [expandedMap, setExpandedMap] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetch('http://localhost:5050/api/employees')
      .then(res => res.json())
      .then(data => setEmployees(data))
      .catch(() => setEmployees([]));
  }, []);

  if (!employees.length) {
    return <div className="p-8">Loading organization structure...</div>;
  }

  const tree = buildOrgTree(employees);

  return (
    <div className="p-8" style={{ overflowX: 'auto', minHeight: 400 }}>
      <h2 className="text-2xl font-bold mb-6">Organization Structure</h2>
      <div style={{ minWidth: 800, paddingBottom: 24, background: '#f8fafc', borderRadius: 16, padding: 24 }}>
        <GraphNode node={tree} expandedMap={expandedMap} setExpandedMap={setExpandedMap} />
      </div>
    </div>
  );
};

export default OrgChart;
