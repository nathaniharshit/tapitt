import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, RotateCcw, Info } from 'lucide-react';

interface LeaveAllocations {
  sick: number;
  casual: number;
  paid: number;
}

const LeaveAllocationManagement: React.FC = () => {
  const [allocations, setAllocations] = useState<LeaveAllocations>({
    sick: 2,
    casual: 2,
    paid: 2
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // Fetch current leave allocations
  const fetchAllocations = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5050/api/leave-allocations');
      if (response.ok) {
        const data = await response.json();
        setAllocations(data);
      } else {
        throw new Error('Failed to fetch leave allocations');
      }
    } catch (error) {
      console.error('Error fetching leave allocations:', error);
      setMessage('Failed to fetch leave allocations');
      setMessageType('error');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAllocations();
  }, []);

  // Handle input changes
  const handleInputChange = (type: keyof LeaveAllocations, value: string) => {
    const numValue = parseInt(value) || 0;
    if (numValue >= 0) {
      setAllocations(prev => ({
        ...prev,
        [type]: numValue
      }));
    }
  };

  // Save leave allocations
  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    
    try {
      const response = await fetch('http://localhost:5050/api/leave-allocations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(allocations),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage('Leave allocations updated successfully! Changes will apply to new quarters.');
        setMessageType('success');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update leave allocations');
      }
    } catch (error) {
      console.error('Error saving leave allocations:', error);
      setMessage(error instanceof Error ? error.message : 'Failed to save leave allocations');
      setMessageType('error');
    }
    
    setSaving(false);
  };

  // Apply to current quarter (optional)
  const handleApplyToCurrent = async () => {
    setApplying(true);
    setMessage('');
    
    try {
      const response = await fetch('http://localhost:5050/api/leave-allocations/apply-to-future', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(`${data.message}. Note: This updates current quarter allocations for all employees. Employees will need to refresh their leave page to see the changes.`);
        setMessageType('success');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to apply leave allocations');
      }
    } catch (error) {
      console.error('Error applying leave allocations:', error);
      setMessage(error instanceof Error ? error.message : 'Failed to apply leave allocations');
      setMessageType('error');
    }
    
    setApplying(false);
  };

  // Reset to default values
  const handleReset = () => {
    setAllocations({ sick: 2, casual: 2, paid: 2 });
    setMessage('');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leave Allocation Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading leave settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Leave Allocation Management
        </CardTitle>
        <p className="text-sm text-gray-600">
          Configure quarterly leave allocations for all employees. Changes apply to new quarters automatically.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {message && (
          <Alert className={messageType === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            <AlertDescription className={messageType === 'error' ? 'text-red-800' : 'text-green-800'}>
              {message}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sick Leave */}
          <div className="space-y-2">
            <Label htmlFor="sick" className="text-sm font-medium">
              Sick Leave (per quarter)
            </Label>
            <Input
              id="sick"
              type="number"
              min="0"
              max="30"
              value={allocations.sick}
              onChange={(e) => handleInputChange('sick', e.target.value)}
              className="text-center"
            />
            <p className="text-xs text-gray-500">
              Current: {allocations.sick} days per quarter
            </p>
          </div>

          {/* Casual Leave */}
          <div className="space-y-2">
            <Label htmlFor="casual" className="text-sm font-medium">
              Casual Leave (per quarter)
            </Label>
            <Input
              id="casual"
              type="number"
              min="0"
              max="30"
              value={allocations.casual}
              onChange={(e) => handleInputChange('casual', e.target.value)}
              className="text-center"
            />
            <p className="text-xs text-gray-500">
              Current: {allocations.casual} days per quarter
            </p>
          </div>

          {/* Paid Leave */}
          <div className="space-y-2">
            <Label htmlFor="paid" className="text-sm font-medium">
              Paid Leave (per quarter)
            </Label>
            <Input
              id="paid"
              type="number"
              min="0"
              max="30"
              value={allocations.paid}
              onChange={(e) => handleInputChange('paid', e.target.value)}
              className="text-center"
            />
            <p className="text-xs text-gray-500">
              Current: {allocations.paid} days per quarter
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Annual Summary</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Sick:</span> {allocations.sick * 4} days/year
            </div>
            <div>
              <span className="font-medium">Casual:</span> {allocations.casual * 4} days/year
            </div>
            <div>
              <span className="font-medium">Paid:</span> {allocations.paid * 4} days/year
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            <strong>Total:</strong> {(allocations.sick + allocations.casual + allocations.paid) * 4} days per year
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Settings
          </Button>

          <Button
            onClick={handleApplyToCurrent}
            disabled={applying}
            variant="outline"
            className="flex items-center gap-2"
          >
            {applying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Apply to Current Quarter
          </Button>

          <Button
            onClick={handleReset}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Default
          </Button>
        </div>

        {/* Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Changes apply automatically to new quarters</li>
            <li>• Use "Apply to Current Quarter" to update existing allocations</li>
            <li>• Employees will need to refresh their leave page to see the updated balances</li>
            <li>• All unused leaves are carried forward to the next quarter</li>
          </ul>
        </div>
        
        {/* Leave Policy Information */}
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">Leave Application Policies:</h4>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• <span className="font-medium">Sick Leave:</span> Can be applied at any time</li>
            <li>• <span className="font-medium">Casual Leave:</span> Requires 5 working days' prior notice</li>
            <li>• <span className="font-medium">Paid Leave:</span> Requires 15 working days' prior notice</li>
            <li>• <span className="font-medium">Unpaid Leave:</span> No notice requirement (salary deduction)</li>
          </ul>
          <p className="text-xs text-green-800 mt-2 italic">
            These requirements are enforced by the system when employees apply for leave.
          </p>
        </div>
        
        {/* Admin Notice */}
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-900 mb-2">Important Notice:</h4>
          <p className="text-sm text-yellow-800">
            When you apply changes to the current quarter, please notify employees to refresh their leave page to see the updated allocations.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaveAllocationManagement;
