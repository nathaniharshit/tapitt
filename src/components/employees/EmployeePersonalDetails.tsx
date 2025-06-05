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
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState(true);
  const [form, setForm] = useState<{
    firstname: string;
    lastname: string;
    email: string;
    phone: string;
    dob: string;
    aadhar: string;
    city: string;
    state: string;
    zipcode: string;
    country: string;
    emergencyContact: string;
    upi: string;
    ifsc: string;
    experience: string;
    currentCompany: string;
    previousCompany: string;
    skills: string;
    linkedin: string;
    github: string;
    status: string;
    picture: File | string | null;
  }>({
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
        // Only reset form if not editing
        resetForm(emp);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.email]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'file') {
      setForm({ ...form, [name]: (e.target as HTMLInputElement).files?.[0] || null });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleCancel = () => {
    resetForm(details);
    setMessage("");
  };

  const handleSave = async () => {
    if (!details) return;
    setSaving(true);
    try {
      let body;
      let headers;
      if (form.picture && form.picture !== details.picture && form.picture instanceof File) {
        body = new FormData();
        Object.entries(form).forEach(([key, value]) => {
          if (key === 'picture' && value instanceof File) {
            body.append(key, value);
          } else if (key !== 'picture') {
            body.append(key, value as string);
          }
        });
        headers = undefined;
      } else {
        // Don't send the picture field if it's a File (only send string/URL)
        const formToSend = { ...form };
        if (formToSend.picture instanceof File) {
          delete formToSend.picture;
        }
        body = JSON.stringify({ ...details, ...formToSend });
        headers = { 'Content-Type': 'application/json' };
      }
      const response = await fetch(`http://localhost:5050/api/employees/${details._id}`, {
        method: 'PUT',
        headers,
        body,
      });
      if (response.ok) {
        // Fetch the latest employee data from backend to ensure summary is up to date
        const refreshed = await fetch(`http://localhost:5050/api/employees`)
          .then(res => res.json())
          .then(data => data.find((e: any) => e.email === user.email));
        setMessage('Details updated successfully!');
        setDetails(refreshed);
        resetForm(refreshed);
        setViewMode(true);
      } else {
        setMessage('Failed to update details.');
      }
    } catch {
      setMessage('Network error.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    setViewMode(false);
  };

  if (!details) return <div className="p-8">Loading...</div>;

  if (viewMode) {
    // Read-only summary view
    const summary = { ...form, ...details };
    // Fix: If summary.picture is a relative path, prepend the backend URL
    let pictureUrl = '';
    if (summary.picture) {
      if (typeof summary.picture === 'string') {
        if (summary.picture.startsWith('/uploads/')) {
          pictureUrl = `http://localhost:5050${summary.picture}`;
        } else if (summary.picture.startsWith('http')) {
          pictureUrl = summary.picture;
        } else {
          pictureUrl = summary.picture;
        }
      } else if (summary.picture instanceof File) {
        pictureUrl = URL.createObjectURL(summary.picture);
      }
    }
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle>Employee Details</CardTitle>
        </CardHeader>
        <CardContent>
          {message && <div className="mb-4 text-green-600">{message}</div>}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold mb-2">Personal Info</h2>
              <div className="grid grid-cols-2 gap-4 mb-2">
                <div><b>First Name:</b> {summary.firstname}</div>
                <div><b>Last Name:</b> {summary.lastname}</div>
                <div><b>Email:</b> {summary.email}</div>
                <div><b>Phone:</b> {summary.phone}</div>
                <div><b>Date of Birth:</b> {summary.dob}</div>
                <div><b>Aadhar Number:</b> {summary.aadhar}</div>
                <div><b>City:</b> {summary.city}</div>
                <div><b>State:</b> {summary.state}</div>
                <div><b>Zip Code:</b> {summary.zipcode}</div>
                <div><b>Country:</b> {summary.country}</div>
                <div><b>Emergency Contact:</b> {summary.emergencyContact}</div>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold mb-2">Bank Details</h2>
              <div className="grid grid-cols-2 gap-4 mb-2">
                <div><b>UPI/Bank Account:</b> {summary.upi}</div>
                <div><b>IFSC Code:</b> {summary.ifsc}</div>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold mb-2">Professional Details</h2>
              <div className="grid grid-cols-3 gap-4 mb-2">
                <div><b>Experience:</b> {summary.experience}</div>
                <div><b>Current Company:</b> {summary.currentCompany}</div>
                <div><b>Previous Company:</b> {summary.previousCompany}</div>
              </div>
              <div className="mb-2"><b>Skills:</b> {summary.skills}</div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div><b>LinkedIn:</b> {summary.linkedin}</div>
                <div><b>GitHub/Behance:</b> {summary.github}</div>
              </div>
            </div>
            <div>
              <b>Status:</b> {summary.status}
            </div>
            <div>
              <b>Professional Picture:</b> {pictureUrl ? (
                <img src={pictureUrl} alt="Profile" className="h-24 w-24 object-cover rounded-full border" />
              ) : (
                <span>No picture uploaded</span>
              )}
            </div>
            <div className="flex space-x-2 mt-4">
              <Button type="button" onClick={handleEdit}>Edit</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Employee Details</CardTitle>
      </CardHeader>
      <CardContent>
        {message && <div className="mb-4 text-green-600">{message}</div>}
        <form className="space-y-8" onSubmit={e => {
          e.preventDefault();
          handleSave();
        }}>
          <div>
            <h2 className="text-lg font-bold mb-2">Tell us a bit more about yourself</h2>
            <div className="grid grid-cols-2 gap-4 mb-2">
              <Input name="firstname" placeholder="First Name" value={form.firstname} onChange={handleChange} />
              <Input name="lastname" placeholder="Last Name" value={form.lastname} onChange={handleChange} />
              <Input name="email" placeholder="Email" value={form.email} onChange={handleChange} />
              <Input name="phone" placeholder="Phone Number" value={form.phone} onChange={handleChange} />
              <Input name="dob" placeholder="Date of Birth" type="date" value={form.dob} onChange={handleChange} />
              <Input name="aadhar" placeholder="Aadhar Number" value={form.aadhar} onChange={handleChange} />
              <Input name="city" placeholder="City" value={form.city} onChange={handleChange} />
              <Input name="state" placeholder="State" value={form.state} onChange={handleChange} />
              <Input name="zipcode" placeholder="Zip Code" value={form.zipcode} onChange={handleChange} />
              <Input name="country" placeholder="Country" value={form.country} onChange={handleChange} />
              <Input name="emergencyContact" placeholder="Emergency Contact Number" value={form.emergencyContact} onChange={handleChange} />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold mb-2">Bank Details</h2>
            <div className="grid grid-cols-2 gap-4 mb-2">
              <Input name="upi" placeholder="UPI ID/Bank Account Number" value={form.upi} onChange={handleChange} />
              <Input name="ifsc" placeholder="IFSC Code" value={form.ifsc} onChange={handleChange} />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold mb-2">Professional Details</h2>
            <div className="grid grid-cols-3 gap-4 mb-2">
              <Input name="experience" placeholder="Experience (years)" value={form.experience} onChange={handleChange} />
              <Input name="currentCompany" placeholder="Current Company" value={form.currentCompany} onChange={handleChange} />
              <Input name="previousCompany" placeholder="Previous Company" value={form.previousCompany} onChange={handleChange} />
            </div>
            <textarea name="skills" placeholder="Write your skills!" value={form.skills} onChange={handleChange} className="w-full rounded-md border px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm bg-white border-input" rows={2} />
            <div className="grid grid-cols-2 gap-4 mt-2">
              <Input name="linkedin" placeholder="LinkedIn" value={form.linkedin} onChange={handleChange} />
              <Input name="github" placeholder="GitHub/Behance" value={form.github} onChange={handleChange} />
            </div>
          </div>
          <div>
            <Label htmlFor="status" className="font-bold">Current Status</Label>
            <select name="status" value={form.status} onChange={handleChange} className="w-full mt-1 mb-2 border rounded-md px-3 py-2">
              <option value="">Select status</option>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="resigned">Resigned</option>
            </select>
          </div>
          <div>
            <Label htmlFor="picture" className="font-bold">Professional Picture</Label>
            <input name="picture" type="file" accept="image/*" onChange={handleChange} className="w-full border-dashed border-2 rounded-md p-4 text-center cursor-pointer" />
            <div className="text-xs text-gray-500 mt-1">Size limit: 10 MB</div>
          </div>
          <div className="flex space-x-2 mt-4">
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EmployeePersonalDetails;
