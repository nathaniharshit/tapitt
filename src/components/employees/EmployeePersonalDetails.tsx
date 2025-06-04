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
    email: '',
    phone: '',
    dob: '',
    aadhar: '',
    city: '',
    state: '',
    zipcode: '',
    country: '',
    emergencyContact: '',
    upi: '',
    ifsc: '',
    experience: '',
    currentCompany: '',
    previousCompany: '',
    skills: '',
    linkedin: '',
    github: '',
    status: '',
    picture: null,
  });
  const [message, setMessage] = useState('');

  const resetForm = (emp: any) => {
    setForm({
      firstname: emp?.firstname || '',
      lastname: emp?.lastname || '',
      email: emp?.email || '',
      phone: emp?.phone || '',
      dob: emp?.dob || '',
      aadhar: emp?.aadhar || '',
      city: emp?.city || '',
      state: emp?.state || '',
      zipcode: emp?.zipcode || '',
      country: emp?.country || '',
      emergencyContact: emp?.emergencyContact || '',
      upi: emp?.upi || '',
      ifsc: emp?.ifsc || '',
      experience: emp?.experience || '',
      currentCompany: emp?.currentCompany || '',
      previousCompany: emp?.previousCompany || '',
      skills: emp?.skills || '',
      linkedin: emp?.linkedin || '',
      github: emp?.github || '',
      status: emp?.status || '',
      picture: emp?.picture || null,
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'file') {
      setForm({ ...form, [name]: (e.target as HTMLInputElement).files?.[0] || null });
    } else {
      setForm({ ...form, [name]: value });
    }
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
        <CardTitle>Employee Details</CardTitle>
      </CardHeader>
      <CardContent>
        {message && <div className="mb-4 text-green-600">{message}</div>}
        <form className="space-y-8" onSubmit={e => {
          e.preventDefault();
          if (!editMode) return;
          handleSave();
        }}>
          <div>
            <h2 className="text-lg font-bold mb-2">Tell us a bit more about yourself</h2>
            <div className="grid grid-cols-2 gap-4 mb-2">
              <Input name="firstname" placeholder="First Name" value={form.firstname} onChange={handleChange} readOnly={!editMode} />
              <Input name="lastname" placeholder="Last Name" value={form.lastname} onChange={handleChange} readOnly={!editMode} />
              <Input name="email" placeholder="Email" value={form.email} onChange={handleChange} readOnly={!editMode} />
              <Input name="phone" placeholder="Phone Number" value={form.phone} onChange={handleChange} readOnly={!editMode} />
              <Input name="dob" placeholder="Date of Birth" type="date" value={form.dob} onChange={handleChange} readOnly={!editMode} />
              <Input name="aadhar" placeholder="Aadhar Number" value={form.aadhar} onChange={handleChange} readOnly={!editMode} />
              <Input name="city" placeholder="City" value={form.city} onChange={handleChange} readOnly={!editMode} />
              <Input name="state" placeholder="State" value={form.state} onChange={handleChange} readOnly={!editMode} />
              <Input name="zipcode" placeholder="Zip Code" value={form.zipcode} onChange={handleChange} readOnly={!editMode} />
              <Input name="country" placeholder="Country" value={form.country} onChange={handleChange} readOnly={!editMode} />
              <Input name="emergencyContact" placeholder="Emergency Contact Number" value={form.emergencyContact} onChange={handleChange} readOnly={!editMode} />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold mb-2">Bank Details</h2>
            <div className="grid grid-cols-2 gap-4 mb-2">
              <Input name="upi" placeholder="UPI ID/Bank Account Number" value={form.upi} onChange={handleChange} readOnly={!editMode} />
              <Input name="ifsc" placeholder="IFSC Code" value={form.ifsc} onChange={handleChange} readOnly={!editMode} />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold mb-2">Professional Details</h2>
            <div className="grid grid-cols-3 gap-4 mb-2">
              <Input name="experience" placeholder="Experience (years)" value={form.experience} onChange={handleChange} readOnly={!editMode} />
              <Input name="currentCompany" placeholder="Current Company" value={form.currentCompany} onChange={handleChange} readOnly={!editMode} />
              <Input name="previousCompany" placeholder="Previous Company" value={form.previousCompany} onChange={handleChange} readOnly={!editMode} />
            </div>
            <textarea name="skills" placeholder="Write your skills!" value={form.skills} onChange={handleChange} readOnly={!editMode} className="w-full rounded-md border px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm bg-white border-input" rows={2} />
            <div className="grid grid-cols-2 gap-4 mt-2">
              <Input name="linkedin" placeholder="LinkedIn" value={form.linkedin} onChange={handleChange} readOnly={!editMode} />
              <Input name="github" placeholder="GitHub/Behance" value={form.github} onChange={handleChange} readOnly={!editMode} />
            </div>
          </div>
          <div>
            <Label htmlFor="status" className="font-bold">Current Status</Label>
            <select name="status" value={form.status} onChange={handleChange} disabled={!editMode} className="w-full mt-1 mb-2 border rounded-md px-3 py-2">
              <option value="">Select status</option>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="resigned">Resigned</option>
            </select>
          </div>
          <div>
            <Label htmlFor="picture" className="font-bold">Professional Picture</Label>
            <input name="picture" type="file" accept="image/*" onChange={handleChange} disabled={!editMode} className="w-full border-dashed border-2 rounded-md p-4 text-center cursor-pointer" />
            <div className="text-xs text-gray-500 mt-1">Size limit: 10 MB</div>
          </div>
          <div className="flex space-x-2 mt-4">
            {editMode ? (
              <>
                <Button type="submit">Save</Button>
                <Button type="button" variant="outline" onClick={() => { setEditMode(false); resetForm(details); setMessage(""); }}>Cancel</Button>
              </>
            ) : (
              <Button type="button" onClick={handleEditClick}>Edit</Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EmployeePersonalDetails;
