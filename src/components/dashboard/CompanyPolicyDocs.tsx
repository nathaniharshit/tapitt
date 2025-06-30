import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { FileText, Upload, Trash2, Eye, Download, Calendar, User } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5050';

interface PolicyDoc {
  _id: string;
  title: string;
  description?: string;
  fileUrl: string;
  uploadedBy?: { firstname: string; lastname: string; email: string };
  uploadedAt: string;
}

interface CompanyPolicyDocsProps {
  userRole: 'superadmin' | 'admin' | 'employee' | 'manager';
}

const CompanyPolicyDocs: React.FC<CompanyPolicyDocsProps> = ({ userRole }) => {
  const [docs, setDocs] = useState<PolicyDoc[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    try {
      const res = await axios.get<PolicyDoc[]>(`${API_BASE_URL}/api/policies`);
      // Ensure the response data is an array
      const data = Array.isArray(res.data) ? res.data : [];
      setDocs(data);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setDocs([]); // Set empty array on error
      toast({ title: 'Error', description: 'Failed to fetch documents', variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !file) {
      toast({ title: 'Title and PDF file are required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('file', file);
      // Optionally add uploadedBy (current user id)
      await axios.post('http://localhost:5050/api/policies', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setTitle('');
      setDescription('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast({ title: 'Document uploaded' });
      fetchDocs();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to upload document', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await axios.delete(`http://localhost:5050/api/policies/${id}`);
      toast({ title: 'Document deleted' });
      fetchDocs();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete document', variant: 'destructive' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Company Policies & Documents</h1>
      </div>

      {/* Upload Form - Only for Admins */}
      {['admin', 'superadmin'].includes(userRole) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload New Document
            </CardTitle>
            <CardDescription>
              Upload company policies, handbooks, and other important documents for employees to access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium">
                    Document Title *
                  </label>
                  <Input
                    id="title"
                    type="text"
                    placeholder="e.g., Employee Handbook 2025"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="file" className="text-sm font-medium">
                    PDF File *
                  </label>
                  <Input
                    id="file"
                    type="file"
                    accept="application/pdf"
                    ref={fileInputRef}
                    onChange={e => setFile(e.target.files?.[0] || null)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description (Optional)
                </label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the document content..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full md:w-auto">
                {loading ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Available Documents</CardTitle>
          <CardDescription>
            {userRole === 'employee' || userRole === 'manager' 
              ? 'Access and download company policies and documents.'
              : 'Manage company documents and policies.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!Array.isArray(docs) || docs.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents available</h3>
              <p className="text-gray-500">
                {['admin', 'superadmin'].includes(userRole)
                  ? 'Upload the first document to get started.'
                  : 'Documents will appear here when administrators upload them.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {docs.map(doc => (
                <Card key={doc._id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{doc.title}</h3>
                          <Badge variant="secondary">PDF</Badge>
                        </div>
                        {doc.description && (
                          <p className="text-sm text-muted-foreground">{doc.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                          </div>
                          {doc.uploadedBy && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              By: {doc.uploadedBy.firstname} {doc.uploadedBy.lastname}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const pdfUrl = `${API_BASE_URL}${doc.fileUrl}`;
                            try {
                              window.open(pdfUrl, '_blank', 'noopener,noreferrer');
                            } catch (error) {
                              console.error('Error opening PDF:', error);
                              toast({
                                title: "Error",
                                description: "Failed to open PDF. Please try downloading instead.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a 
                            href={`${API_BASE_URL}${doc.fileUrl}`} 
                            download={doc.title}
                            className="flex items-center gap-1"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </a>
                        </Button>
                        {['admin', 'superadmin'].includes(userRole) && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(doc._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyPolicyDocs;
