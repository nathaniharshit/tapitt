import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface EmployeePersonalDetailsProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

const EmployeePersonalDetails = ({ user }: EmployeePersonalDetailsProps) => {
  const [details, setDetails] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    firstname: '',
    lastname: '',
    phone: '',
    address: '',
    department: '',
    position: '',
  });
  const [message, setMessage] = useState('');

  const resetForm = (emp: any) => {
    setForm({
      firstname: emp?.firstname || '',
      lastname: emp?.lastname || '',
      phone: emp?.phone || '',
      address: emp?.address || '',
      department: emp?.department || '',
      position: emp?.position || '',
    });
  };

  useEffect(() => {
    // Fetch employee details from backend
    fetch(`http://localhost:5050/api/employees`)
      .then(res => res.json())
      .then(data => {
        const emp = data.find((e: any) => e.email === user.email);
        setDetails(emp);
        resetForm(emp);
      });
  }, [user.email]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!details) return;
    try {
      const response = await fetch(`http://localhost:5050/api/employees/${details._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...details, ...form }),
      });
      if (response.ok) {
        const updated = await response.json();
        setMessage('Details updated successfully!');
        setEditMode(false);
        setDetails(updated);
        resetForm(updated);
      } else {
        setMessage('Failed to update details.');
      }
    } catch {
      setMessage('Network error.');
    }
  };

  const handleEditClick = () => {
    setEditMode(true);
    setMessage(""); // Clear any previous message
  };

  if (!details) return <div className="p-8">Loading...</div>;

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Personal Details</CardTitle>
      </CardHeader>
      <CardContent>
        {message && <div className="mb-4 text-green-600">{message}</div>}
        <form className="space-y-4" onSubmit={e => {
          e.preventDefault();
          if (!editMode) return;
          // Only save if something has changed (trim values for comparison)
          if (
            form.firstname.trim() !== (details.firstname || '').trim() ||
            form.lastname.trim() !== (details.lastname || '').trim() ||
            form.phone.trim() !== (details.phone || '').trim() ||
            form.address.trim() !== (details.address || '').trim() ||
            form.department.trim() !== (details.department || '').trim() ||
            form.position.trim() !== (details.position || '').trim()
          ) {
            handleSave();
          } else {
            setMessage('No changes to save.');
            setEditMode(false);
          }
        }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstname">First Name</Label>
              <Input name="firstname" value={form.firstname} onChange={handleChange} readOnly={!editMode} autoFocus={editMode} autoComplete="off" style={editMode ? { background: '#fff', border: '1px solid #ccc' } : { background: '#f3f4f6', border: 'none' }} />
            </div>
            <div>
              <Label htmlFor="lastname">Last Name</Label>
              <Input name="lastname" value={form.lastname} onChange={handleChange} readOnly={!editMode} autoComplete="off" style={editMode ? { background: '#fff', border: '1px solid #ccc' } : { background: '#f3f4f6', border: 'none' }} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input name="phone" value={form.phone} onChange={handleChange} readOnly={!editMode} autoComplete="off" style={editMode ? { background: '#fff', border: '1px solid #ccc' } : { background: '#f3f4f6', border: 'none' }} />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input name="address" value={form.address} onChange={handleChange} readOnly={!editMode} autoComplete="off" style={editMode ? { background: '#fff', border: '1px solid #ccc' } : { background: '#f3f4f6', border: 'none' }} />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Input name="department" value={form.department} onChange={handleChange} readOnly={!editMode} autoComplete="off" style={editMode ? { background: '#fff', border: '1px solid #ccc' } : { background: '#f3f4f6', border: 'none' }} />
            </div>
            <div>
              <Label htmlFor="position">Position</Label>
              <Input name="position" value={form.position} onChange={handleChange} readOnly={!editMode} autoComplete="off" style={editMode ? { background: '#fff', border: '1px solid #ccc' } : { background: '#f3f4f6', border: 'none' }} />
            </div>
          </div>
          <div className="flex space-x-2 mt-4">
            {editMode ? (
              <>
                <Button type="submit">Save</Button>
                <Button type="button" variant="outline" onClick={() => { setEditMode(false); resetForm(details); setMessage(""); }}>Cancel</Button>
              </>
            ) : (
              <Button type="button" onClick={() => { console.log('Edit clicked'); setEditMode(true); setMessage(""); }}>Edit</Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EmployeePersonalDetails;
