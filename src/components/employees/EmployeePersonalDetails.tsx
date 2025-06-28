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
    address?: string;
    aadhar?: string;
  };
}

const EmployeePersonalDetails = ({ user }: EmployeePersonalDetailsProps) => {
  const [details, setDetails] = useState<any>(undefined); // undefined = loading, null = not found, object = found
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState(true);
  const [form, setForm] = useState<{
    firstname: string;
    lastname: string;
    email: string;
    phone: string;
    dob: string;
    aadhar: string;
    address: string;
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
    aadhar: user.aadhar || '',
    address: user.address || '',
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
  const [originalData, setOriginalData] = useState(form);

  const resetForm = (emp: any) => {
    setForm({
      firstname: emp?.firstname || '',
      lastname: emp?.lastname || '',
      email: emp?.email || '',
      phone: emp?.phone || '',
      dob: emp?.dob || '',
      aadhar: emp?.aadhar || '',
      address: emp?.address || '',
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
    console.log('Fetching employee details for user:', user);
    setLoading(true);
    fetch(`http://localhost:5050/api/employees`)
      .then(res => {
        console.log('API response status:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('All employees from API:', data);
        console.log('Looking for email:', user.email);
        const emp = data.find((e: any) => e.email === user.email);
        console.log('Found employee:', emp);
        
        if (emp) {
          setDetails(emp);
          // Only reset form if not editing
          resetForm(emp);
        } else {
          // No matching employee found
          setDetails(null);
          setMessage(`No employee record found for email: ${user.email}`);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching employees:', error);
        setDetails(null);
        setMessage('Error loading employee data. Please try again.');
        setLoading(false);
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
    setForm(originalData); // Reset to original values
    setViewMode(true);       // Exit edit mode
    setMessage("");
  };

  const handleSave = async () => {
    if (!details) return;
    setSaving(true);
    try {
      // Only send fields that are not empty strings or undefined
      const allowedFields = [
        'firstname', 'lastname', 'email', 'phone', 'dob', 'aadhar', 'address', 'city', 'state', 'zipcode', 'country',
        'emergencyContact', 'upi', 'ifsc', 'experience', 'currentCompany', 'previousCompany', 'skills',
        'linkedin', 'github', 'status', 'picture'
      ];
      let body;
      let headers;
      const filteredForm: any = {};
      allowedFields.forEach(field => {
        if (
          form[field] !== undefined &&
          form[field] !== '' &&
          !(form[field] instanceof File && !form[field])
        ) {
          filteredForm[field] = form[field];
        }
      });

      // If picture is a new File, use FormData
      const isPictureFile = filteredForm.picture && filteredForm.picture !== details.picture && filteredForm.picture instanceof File;
      if (isPictureFile) {
        body = new FormData();
        Object.entries(filteredForm).forEach(([key, value]) => {
          if (key === 'picture' && value instanceof File) {
            body.append(key, value);
          } else if (key !== 'picture') {
            body.append(key, value as string);
          }
        });
        headers = undefined;
      } else {
        if (filteredForm.picture instanceof File) delete filteredForm.picture;
        body = JSON.stringify(filteredForm);
        headers = { 'Content-Type': 'application/json' };
      }

      const response = await fetch(`http://localhost:5050/api/employees/${details._id}`, {
        method: 'PUT',
        headers,
        body,
      });
      if (response.ok) {
        const refreshed = await fetch(`http://localhost:5050/api/employees`)
          .then(res => res.json())
          .then(data => data.find((e: any) => e.email === user.email));
        setMessage('Details updated successfully!');
        setDetails(refreshed);
        resetForm(refreshed);
        setViewMode(true);
      } else {
        const err = await response.json();
        setMessage(err.error || 'Failed to update details.');
      }
    } catch {
      setMessage('Network error.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    setOriginalData(form);
    setViewMode(false);
  };

  if (loading) {
    return <div className="p-8">Loading employee details...</div>;
  }

  if (details === null) {
    return (
      <Card className="max-w-2xl mx-auto mt-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-2xl">
        <CardHeader className="flex flex-col items-center justify-center bg-red-600 dark:bg-red-900 rounded-t-2xl pb-6">
          <CardTitle className="text-white text-2xl">Employee Not Found</CardTitle>
        </CardHeader>
        <CardContent className="pt-8 pb-6 px-6">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">{message}</p>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This could happen if:
            </p>
            <ul className="text-left text-gray-600 dark:text-gray-400 mb-6">
              <li>• Your account hasn't been added to the employee database yet</li>
              <li>• There's a mismatch between your login email and employee record</li>
              <li>• The employee record was removed or archived</li>
            </ul>
            <Button 
              onClick={() => {
                setLoading(true);
                setMessage('');
                // Retry the fetch
                fetch(`http://localhost:5050/api/employees`)
                  .then(res => res.json())
                  .then(data => {
                    const emp = data.find((e: any) => e.email === user.email);
                    if (emp) {
                      setDetails(emp);
                      resetForm(emp);
                    } else {
                      setDetails(null);
                      setMessage(`No employee record found for email: ${user.email}`);
                    }
                    setLoading(false);
                  })
                  .catch(error => {
                    console.error('Error fetching employees:', error);
                    setDetails(null);
                    setMessage('Error loading employee data. Please try again.');
                    setLoading(false);
                  });
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Retry Loading
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

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
      <Card className="max-w-2xl mx-auto mt-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-2xl">
        <CardHeader className="flex flex-col items-center justify-center bg-blue-600 dark:bg-blue-900 rounded-t-2xl pb-6">
          <CardTitle className="text-white text-2xl">Employee Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-8 pb-6 px-6">
          {message && (
            <div className={`text-sm font-medium mb-4 ${
              message.startsWith('Error') || message === 'Network error.'
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-600 dark:text-green-400'
            }`}>
              {message}
            </div>
          )}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold mb-2 text-blue-700 dark:text-blue-300">Personal Info</h2>
              <div className="grid grid-cols-2 gap-4 mb-2">
                <div><b>First Name:</b> {summary.firstname}</div>
                <div><b>Last Name:</b> {summary.lastname}</div>
                <div><b>Email:</b> {summary.email}</div>
                <div><b>Phone:</b> {summary.phone}</div>
                <div><b>Date of Birth:</b> {summary.dob}</div>
                <div><b>Aadhar Number:</b> {summary.aadhar}</div>
                <div><b>Address:</b> {summary.address}</div>
                <div><b>City:</b> {summary.city}</div>
                <div><b>State:</b> {summary.state}</div>
                <div><b>Zip Code:</b> {summary.zipcode}</div>
                <div><b>Country:</b> {summary.country}</div>
                <div><b>Emergency Contact:</b> {summary.emergencyContact}</div>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold mb-2 text-blue-700 dark:text-blue-300">Bank Details</h2>
              <div className="grid grid-cols-2 gap-4 mb-2">
                <div><b>UPI/Bank Account:</b> {summary.upi}</div>
                <div><b>IFSC Code:</b> {summary.ifsc}</div>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold mb-2 text-blue-700 dark:text-blue-300">Professional Details</h2>
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
    <div className="max-w-2xl mx-auto">
      <div
        className="overflow-y-auto"
        style={{ maxHeight: '100vh', minHeight: '300px', paddingRight: '2px' }}
      >
        <Card className="mt-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-2xl">
          <CardHeader className="flex flex-col items-center justify-center bg-blue-600 dark:bg-blue-900 rounded-t-2xl pb-6">
            <CardTitle className="text-white text-2xl">Employee Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-8 pb-6 px-6">
            {message && (
              <div className={`text-sm font-medium mb-4 ${
                message.startsWith('Error') || message === 'Network error.'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {message}
              </div>
            )}
            <form className="space-y-8" onSubmit={e => {
              e.preventDefault();
              handleSave();
            }}>
              <div>
                <h2 className="text-lg font-bold mb-2 text-blue-700 dark:text-blue-300">Personal Details</h2>
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div>
                    <Label htmlFor="firstname" className="dark:text-gray-200">First Name</Label>
                    <Input name="firstname" placeholder="First Name" value={form.firstname} onChange={handleChange} className="bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400" />
                  </div>
                  <div>
                    <Label htmlFor="lastname" className="dark:text-gray-200">Last Name</Label>
                    <Input name="lastname" placeholder="Last Name" value={form.lastname} onChange={handleChange} className="bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400" />
                  </div>
                  <div>
                    <Label htmlFor="email" className="dark:text-gray-200">Email</Label>
                    <Input name="email" placeholder="Email" value={form.email} onChange={handleChange} className="bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400" />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="dark:text-gray-200">Phone</Label>
                    <Input name="phone" placeholder="Phone Number" value={form.phone} onChange={handleChange} className="bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400" />
                  </div>
                  <div>
                    <Label htmlFor="dob" className="dark:text-gray-200">Date of Birth</Label>
                    <Input name="dob" placeholder="Date of Birth" type="date" value={form.dob} onChange={handleChange} className="bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400" />
                  </div>
                  <div>
                    <Label htmlFor="aadhar" className="dark:text-gray-200">Aadhar Number</Label>
                    <Input
                      name="aadhar"
                      placeholder="Aadhar Number"
                      value={form.aadhar}
                      onChange={handleChange}
                      required
                      minLength={12}
                      maxLength={12}
                      pattern="\d{12}"
                      className="bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address" className="dark:text-gray-200">Address</Label>
                    <Input name="address" placeholder="Address" value={form.address} onChange={handleChange} className="bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400" />
                  </div>
                  <div>
                    <Label htmlFor="city" className="dark:text-gray-200">City</Label>
                    <Input name="city" placeholder="City" value={form.city} onChange={handleChange} className="bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400" />
                  </div>
                  <div>
                    <Label htmlFor="state" className="dark:text-gray-200">State</Label>
                    <Input name="state" placeholder="State" value={form.state} onChange={handleChange} className="bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400" />
                  </div>
                  <div>
                    <Label htmlFor="zipcode" className="dark:text-gray-200">Zip Code</Label>
                    <Input name="zipcode" placeholder="Zip Code" value={form.zipcode} onChange={handleChange} className="bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400" />
                  </div>
                  <div>
                    <Label htmlFor="country" className="dark:text-gray-200">Country</Label>
                    <Input name="country" placeholder="Country" value={form.country} onChange={handleChange} className="bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400" />
                  </div>
                  <div>
                    <Label htmlFor="emergencyContact" className="dark:text-gray-200">Emergency Contact Number</Label>
                    <Input name="emergencyContact" placeholder="Emergency Contact Number" value={form.emergencyContact} onChange={handleChange} className="bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400" />
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold mb-2 text-blue-700 dark:text-blue-300">Bank Details</h2>
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div>
                    <Label htmlFor="upi" className="dark:text-gray-200">UPI ID/Bank Account Number</Label>
                    <Input name="upi" placeholder="UPI ID/Bank Account Number" value={form.upi} onChange={handleChange} className="bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400" />
                  </div>
                  <div>
                    <Label htmlFor="ifsc" className="dark:text-gray-200">IFSC Code</Label>
                    <Input name="ifsc" placeholder="IFSC Code" value={form.ifsc} onChange={handleChange} className="bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400" />
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold mb-2 text-blue-700 dark:text-blue-300">Professional Details</h2>
                <div className="grid grid-cols-3 gap-4 mb-2">
                  <div>
                    <Label htmlFor="experience" className="dark:text-gray-200">Experience (years)</Label>
                    <Input name="experience" placeholder="Experience (years)" value={form.experience} onChange={handleChange} className="bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400" />
                  </div>
                  <div>
                    <Label htmlFor="currentCompany" className="dark:text-gray-200">Current Company</Label>
                    <Input name="currentCompany" placeholder="Current Company" value={form.currentCompany} onChange={handleChange} className="bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400" />
                  </div>
                  <div>
                    <Label htmlFor="previousCompany" className="dark:text-gray-200">Previous Company</Label>
                    <Input name="previousCompany" placeholder="Previous Company" value={form.previousCompany} onChange={handleChange} className="bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400" />
                  </div>
                </div>
                <textarea name="skills" placeholder="Write your skills!" value={form.skills} onChange={handleChange} className="w-full rounded-md border px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm bg-white dark:bg-gray-800 text-foreground dark:text-gray-100 border-input dark:border-gray-700" rows={2} />
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="linkedin" className="dark:text-gray-200">LinkedIn</Label>
                    <Input name="linkedin" placeholder="LinkedIn" value={form.linkedin} onChange={handleChange} className="bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400" />
                  </div>
                  <div>
                    <Label htmlFor="github" className="dark:text-gray-200">GitHub/Behance</Label>
                    <Input name="github" placeholder="GitHub/Behance" value={form.github} onChange={handleChange} className="bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400" />
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="status" className="font-bold dark:text-gray-200">Current Status</Label>
                <select name="status" value={form.status} onChange={handleChange} className="w-full mt-1 mb-2 border rounded-md px-3 py-2 bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400">
                  <option value="">Select status</option>
                  <option value="active">Active</option>
                  <option value="on_leave">On Leave</option>
                  <option value="resigned">Resigned</option>
                </select>
              </div>
              <div>
                <Label htmlFor="picture" className="font-bold dark:text-gray-200">Professional Picture</Label>
                <input name="picture" type="file" accept="image/*" onChange={handleChange} className="w-full border-dashed border-2 rounded-md p-4 text-center cursor-pointer bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400" />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Size limit: 10 MB</div>
              </div>
              <div className="flex space-x-2 mt-4">
                <Button type="submit" disabled={saving} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2 rounded-lg font-semibold shadow-lg transition">{saving ? 'Saving...' : 'Save'}</Button>
                <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeePersonalDetails;
