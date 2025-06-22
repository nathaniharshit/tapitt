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

function GraphNode({ node, expandedMap, setExpandedMap }) {
  const hasChildren = node.children && node.children.length > 0;
  const nodeKey = node._id || node.name;
  const isExpanded = expandedMap[nodeKey] || false;

  const toggleExpand = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!hasChildren) return;
    setExpandedMap(prev => ({
      ...prev,
      [nodeKey]: !isExpanded,
    }));
  };

  const cardStyle = {
    background: getRoleColor(node.role),
    color: '#fff',
    borderRadius: 12,
    width: 130, // reduced from 180
    height: 100, // reduced from 110
    padding: '10px 10px',
    boxShadow: '0 2px 12px #6366f133',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    position: 'relative' as const,
    margin: '0 4px', // reduced margin
    border: '2px solid #fff',
    fontWeight: 600,
    fontSize: 13,
    cursor: hasChildren ? 'pointer' : 'default',
    userSelect: 'none' as const,
    transition: 'box-shadow 0.2s, border 0.2s, background 0.2s',
    overflow: 'hidden'
  };
  const avatarStyle = {
    width: 36, // reduced from 44
    height: 36,
    borderRadius: '50%',
    background: '#fff',
    color: getRoleColor(node.role),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 15,
    marginBottom: 4,
    border: `1.5px solid ${getRoleColor(node.role)}`,
    boxShadow: '0 1px 4px #6366f122',
    flexShrink: 0
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <div style={cardStyle} onClick={toggleExpand}>
        <div style={avatarStyle}>{getInitials(node)}</div>
        <div style={{ fontSize: 14, fontWeight: 700, textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {getDisplayName(node)}
        </div>
        {node.position && (
          <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.95, textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {node.position}
          </div>
        )}
        {hasChildren && (
          <span
            style={{
              position: 'absolute',
              top: 8,
              right: 10,
              fontWeight: 900,
              fontSize: 16,
              color: '#fff',
              background: '#6366f1',
              borderRadius: '50%',
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              boxShadow: '0 1px 4px #6366f122',
            }}
            onClick={toggleExpand}
          >
            {isExpanded ? '−' : '+'}
          </span>
        )}
      </div>
      {/* Connector down */}
      {hasChildren && isExpanded && (
        <svg width="2" height="24" style={{ margin: '0 auto', display: 'block', zIndex: 1 }}>
          <line x1="1" y1="0" x2="1" y2="24" stroke="#c7d2fe" strokeWidth="2" />
        </svg>
      )}
      {/* Children */}
      {hasChildren && isExpanded && (
        <div style={{ position: 'relative', width: '100%' }}>
          {/* Horizontal connector */}
          {node.children.length > 1 && (
            <svg
              width={node.children.length * 140} // reduced from 190
              height="24"
              style={{ position: 'absolute', left: `calc(50% - ${(node.children.length * 140) / 2}px)`, top: 0, zIndex: 0 }}
            >
              <line
                x1={20}
                y1={12}
                x2={node.children.length * 140 - 20}
                y2={12}
                stroke="#c7d2fe"
                strokeWidth="2"
              />
              {node.children.map((_, idx) => (
                <line
                  key={idx}
                  x1={20 + idx * 140}
                  y1={12}
                  x2={20 + idx * 140}
                  y2={24}
                  stroke="#c7d2fe"
                  strokeWidth="2"
                />
              ))}
            </svg>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', marginTop: 24 }}>
            {node.children.map((child, idx) => (
              <GraphNode key={child._id || child.name} node={child} expandedMap={expandedMap} setExpandedMap={setExpandedMap} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OrgChart() {
  const [employees, setEmployees] = useState([]);
  const [expandedMap, setExpandedMap] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetch('http://localhost:5050/api/employees')
      .then(res => res.json())
      .then(data => setEmployees(data))
      .catch(() => setEmployees([]));
  }, []);

  const tree = buildOrgTree(employees);

  // By default, expand the CEO node only once
  useEffect(() => {
    if (tree && tree._id && !expandedMap[tree._id]) {
      setExpandedMap(prev => ({ ...prev, [tree._id]: true }));
    }
    // Only run when tree._id changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree && tree._id]);

  if (!employees.length || !tree) {
    return <div className="p-8">Loading organization structure...</div>;
  }

  return (
    <div className="p-8 flex flex-col items-center" style={{ overflowX: 'auto', minHeight: 400 }}>
      <h2 className="text-3xl font-bold mb-8">Team Structure</h2>
      <div style={{ minWidth: 600, paddingBottom: 24, background: '#f8fafc', borderRadius: 16, padding: 24, boxShadow: '0 2px 16px #6366f122' }}>
        <GraphNode node={tree} expandedMap={expandedMap} setExpandedMap={setExpandedMap} />
      </div>
    </div>
  );
}

export default OrgChart;
