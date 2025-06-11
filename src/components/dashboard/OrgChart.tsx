import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface OrgNode {
  id: string;
  name: string;
  role: 'super_admin' | 'admin' | 'employee' | 'intern';
  children?: OrgNode[];
}

const OrgChart = () => {
  const [structure, setStructure] = useState<OrgNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<OrgNode | null>(null);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'employee' | 'intern'>('employee');

  useEffect(() => {
    fetch('http://localhost:5050/api/employees')
      .then(res => res.json())
      .then((employees) => {
        // Group employees by role
        const superAdmins = employees.filter((e: any) => e.role === 'super_admin' || e.role === 'superadmin');
        const admins = employees.filter((e: any) => e.role === 'admin');
        const employeesList = employees.filter((e: any) => e.role === 'employee');
        const interns = employees.filter((e: any) => e.role === 'intern');

        // Track assigned employees/interns
        const assignedEmpIds = new Set<string>();
        const assignedInternIds = new Set<string>();

        // Build admin nodes with their employees/interns
        const adminNodes = admins.map((admin: any) => {
          const adminEmployees = employeesList.filter((emp: any) => emp.department && admin.department && emp.department === admin.department);
          const adminInterns = interns.filter((intern: any) => intern.department && admin.department && intern.department === admin.department);
          adminEmployees.forEach((emp: any) => assignedEmpIds.add(emp._id));
          adminInterns.forEach((intern: any) => assignedInternIds.add(intern._id));
          return {
            id: admin._id,
            name: `${admin.firstname} ${admin.lastname}`,
            role: 'admin',
            children: [
              ...adminEmployees.map((emp: any) => ({
                id: emp._id,
                name: `${emp.firstname} ${emp.lastname}`,
                role: 'employee',
                children: []
              })),
              ...adminInterns.map((intern: any) => ({
                id: intern._id,
                name: `${intern.firstname} ${intern.lastname}`,
                role: 'intern',
                children: []
              }))
            ]
          };
        });

        // Find unassigned employees/interns
        const unassignedEmployees = employeesList.filter((emp: any) => !assignedEmpIds.has(emp._id));
        const unassignedInterns = interns.filter((intern: any) => !assignedInternIds.has(intern._id));
        let unassignedNode: OrgNode | null = null;
        if (unassignedEmployees.length > 0 || unassignedInterns.length > 0) {
          unassignedNode = {
            id: 'unassigned',
            name: 'Unassigned',
            role: 'admin', // visually group as a peer to admins
            children: [
              ...unassignedEmployees.map((emp: any) => ({
                id: emp._id,
                name: `${emp.firstname} ${emp.lastname}`,
                role: 'employee',
                children: []
              })),
              ...unassignedInterns.map((intern: any) => ({
                id: intern._id,
                name: `${intern.firstname} ${intern.lastname}`,
                role: 'intern',
                children: []
              }))
            ]
          };
        }

        // Attach admins (and unassigned) under each super admin
        const superAdminNodes = superAdmins.map((sa: any) => ({
          id: sa._id,
          name: `${sa.firstname} ${sa.lastname}`,
          role: 'super_admin',
          children: [
            ...adminNodes,
            ...(unassignedNode ? [unassignedNode] : [])
          ]
        }));
        setStructure(superAdminNodes);
      });
  }, []);

  const handleAdd = (parent: OrgNode) => {
    if (!newName) return;
    const addNode = (nodes: OrgNode[]): OrgNode[] =>
      nodes.map(node => {
        if (node.id === parent.id) {
          return {
            ...node,
            children: [
              ...(node.children || []),
              {
                id: `${parent.id}-${Date.now()}`,
                name: newName,
                role: newRole,
                children: []
              }
            ]
          };
        } else if (node.children) {
          return { ...node, children: addNode(node.children) };
        }
        return node;
      });
    setStructure(addNode(structure));
    setNewName('');
    setSelectedNode(null);
  };

  // Only show add button for admin nodes
  const renderNode = (node: OrgNode) => (
    <div key={node.id} className="flex flex-col items-center">
      <Card className="mb-2 p-2 min-w-[160px] text-center shadow-lg border-2 border-primary">
        <CardHeader>
          <CardTitle className="text-base font-bold text-primary capitalize">{node.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <span className={`text-xs font-semibold px-2 py-1 rounded ${node.role === 'super_admin' ? 'bg-blue-100 text-blue-800' : node.role === 'admin' ? 'bg-green-100 text-green-800' : node.role === 'employee' ? 'bg-yellow-100 text-yellow-800' : 'bg-purple-100 text-purple-800'}`}>{node.role.replace('_', ' ')}</span>
          {node.role === 'admin' && (
            <Button size="sm" className="mt-2" onClick={() => setSelectedNode(node)}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          )}
        </CardContent>
      </Card>
      {node.children && node.children.length > 0 && (
        <div className="flex space-x-8 border-t-2 border-dashed border-gray-300 pt-4">
          {node.children.map(child => renderNode(child))}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Organization Structure</h2>
      <div className="flex flex-col items-center">
        {structure.map(node => renderNode(node))}
      </div>
      {selectedNode && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white p-6 rounded shadow-lg flex flex-col gap-4 min-w-[300px]">
            <h3 className="font-semibold">Add under {selectedNode.name}</h3>
            <input
              className="border p-2 rounded"
              placeholder="Name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <select
              className="border p-2 rounded"
              value={newRole}
              onChange={e => setNewRole(e.target.value as 'employee' | 'intern')}
            >
              <option value="employee">Employee</option>
              <option value="intern">Intern</option>
            </select>
            <div className="flex gap-2">
              <Button onClick={() => handleAdd(selectedNode)}>Add</Button>
              <Button variant="outline" onClick={() => setSelectedNode(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgChart;
