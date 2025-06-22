import { useState, useEffect } from 'react';

function buildOrgTree(employees) {
  const empMap = {};
  employees.forEach(emp => {
    empMap[emp._id] = { ...emp, children: [] };
  });
  employees.forEach(emp => {
    if (emp.reportingManager && empMap[emp.reportingManager]) {
      empMap[emp.reportingManager].children.push(empMap[emp._id]);
    }
  });
  // Find CEO (superadmin, no reportingManager)
  const ceo = employees.find(emp => emp.role === 'superadmin' && !emp.reportingManager);
  if (!ceo) return null;

  // Find Siddhi Patel (by name or position contains 'coo')
  const siddhi = employees.find(emp =>
    (emp.firstname && emp.firstname.toLowerCase() === 'siddhi' && emp.lastname && emp.lastname.toLowerCase() === 'patel') ||
    (emp.position && emp.position.toLowerCase().includes('coo'))
  );
  if (siddhi && !empMap[ceo._id].children.some(child => child._id === siddhi._id)) {
    empMap[ceo._id].children.unshift(empMap[siddhi._id]);
  }

  // Find all admins (role === 'admin', reports to CEO)
  const admins = employees.filter(emp => emp.role === 'admin' && emp.reportingManager === ceo._id);
  // Remove any admins from CEO's children to avoid duplicates
  empMap[ceo._id].children = empMap[ceo._id].children.filter(child => !admins.some(admin => admin._id === child._id));
  // Add all admins as children of CEO (left and right)
  empMap[ceo._id].children = [...admins.map(admin => empMap[admin._id]), ...empMap[ceo._id].children];

  // For each admin, only keep employees/interns as children
  admins.forEach(admin => {
    empMap[admin._id].children = empMap[admin._id].children.filter(child => child.role === 'employee' || child.role === 'intern');
  });

  return empMap[ceo._id];
}

function getDisplayName(node) {
  return node.type === 'virtual-root'
    ? node.name
    : `${node.firstname || ''} ${node.lastname || ''}`.trim() || node.name;
}

function getRoleColor(role) {
  switch (role) {
    case 'superadmin': return '#2563eb'; // CEO
    case 'admin': return '#059669';      // Director
    case 'manager': return '#f59e42';
    case 'employee': return '#eab308';
    case 'intern': return '#a21caf';
    default: return '#64748b';
  }
}

function getInitials(node) {
  if (node.type === 'virtual-root') return node.name[0] || '?';
  const first = node.firstname ? node.firstname[0] : '';
  const last = node.lastname ? node.lastname[0] : '';
  return (first + last).toUpperCase() || '?';
}

function GraphNode({ node }) {
  const hasChildren = node.children && node.children.length > 0;
  // Card style using EmployeeList color scheme
  const cardStyle = {
    background: getRoleColor(node.role),
    color: '#fff',
    borderRadius: 12,
    minWidth: 120,
    minHeight: 56,
    padding: '12px 16px',
    boxShadow: '0 2px 12px #6366f133',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    position: 'relative' as const,
    margin: '0 8px',
    border: '2px solid #fff',
    fontWeight: 600,
    fontSize: 14,
  };
  const avatarStyle = {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: '#fff',
    color: getRoleColor(node.role),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 16,
    marginBottom: 6,
    border: `1.5px solid ${getRoleColor(node.role)}`,
    boxShadow: '0 1px 4px #6366f122',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <div style={cardStyle}>
        <div style={avatarStyle}>{getInitials(node)}</div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{getDisplayName(node)}</div>
        {node.position && (
          <div style={{ fontSize: 12, fontWeight: 400, opacity: 0.95 }}>{node.position}</div>
        )}
      </div>
      {/* Connector down */}
      {hasChildren && (
        <svg width="2" height="24" style={{ margin: '0 auto', display: 'block', zIndex: 1 }}>
          <line x1="1" y1="0" x2="1" y2="24" stroke="#c7d2fe" strokeWidth="2" />
        </svg>
      )}
      {/* Children */}
      {hasChildren && (
        <div style={{ position: 'relative', width: '100%' }}>
          {/* Horizontal connector */}
          {node.children.length > 1 && (
            <svg
              width={node.children.length * 130}
              height="24"
              style={{ position: 'absolute', left: `calc(50% - ${(node.children.length * 130) / 2}px)`, top: 0, zIndex: 0 }}
            >
              <line
                x1={30}
                y1={12}
                x2={node.children.length * 130 - 30}
                y2={12}
                stroke="#c7d2fe"
                strokeWidth="2"
              />
              {node.children.map((_, idx) => (
                <line
                  key={idx}
                  x1={30 + idx * 130}
                  y1={12}
                  x2={30 + idx * 130}
                  y2={24}
                  stroke="#c7d2fe"
                  strokeWidth="2"
                />
              ))}
            </svg>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', marginTop: 24 }}>
            {node.children.map((child, idx) => (
              <GraphNode key={child._id || child.name} node={child} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OrgChart() {
  const [employees, setEmployees] = useState([]);
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
    <div className="p-8 flex flex-col items-center" style={{ overflowX: 'auto', minHeight: 400 }}>
      <h2 className="text-3xl font-bold mb-8">Team Structure</h2>
      <div style={{ minWidth: 600, paddingBottom: 24, background: '#f8fafc', borderRadius: 16, padding: 24, boxShadow: '0 2px 16px #6366f122' }}>
        <GraphNode node={tree} />
      </div>
    </div>
  );
}

export default OrgChart;
