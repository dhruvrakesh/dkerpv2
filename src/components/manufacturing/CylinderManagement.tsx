import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';
import { MaterialConsumptionCard } from './MaterialConsumptionCard';
import { 
  Cylinder, 
  Plus, 
  Calendar, 
  Wrench, 
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin
} from 'lucide-react';
import { format, addDays, isBefore } from 'date-fns';

interface CylinderData {
  id: string;
  cylinder_code: string;
  cylinder_type: string;
  diameter: number | null;
  length: number | null;
  number_of_colors: number;
  status: string;
  location: string | null;
  last_used_date: string | null;
  maintenance_due_date: string | null;
  usage_count: number;
  specifications: any;
}

interface MaintenanceRecord {
  id: string;
  cylinder_id: string;
  maintenance_type: string;
  scheduled_date: string;
  completed_date: string | null;
  performed_by: string | null;
  maintenance_notes: string | null;
  cost: number;
  status: string;
}

export const CylinderManagement = () => {
  const { organization, user } = useDKEGLAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('inventory');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCylinder, setSelectedCylinder] = useState<string>('');

  const [cylinderForm, setCylinderForm] = useState({
    cylinder_code: '',
    cylinder_type: 'gravure',
    diameter: '',
    length: '',
    number_of_colors: '1',
    location: 'main_warehouse',
    specifications: {
      surface_roughness: '',
      hardness: '',
      coating_type: '',
      engraving_depth: '',
    },
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    maintenance_type: 'routine',
    scheduled_date: '',
    maintenance_notes: '',
  });

  const { data: cylinders, refetch: refetchCylinders } = useQuery({
    queryKey: ['cylinders', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from('dkegl_cylinders')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CylinderData[];
    },
    enabled: !!organization?.id,
  });

  const { data: maintenanceRecords } = useQuery({
    queryKey: ['cylinder-maintenance', organization?.id, selectedCylinder],
    queryFn: async () => {
      if (!organization?.id || !selectedCylinder) return [];
      
      const { data, error } = await supabase
        .from('dkegl_cylinder_maintenance')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('cylinder_id', selectedCylinder)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;
      return data as MaintenanceRecord[];
    },
    enabled: !!organization?.id && !!selectedCylinder,
  });

  const createCylinder = useMutation({
    mutationFn: async (formData: typeof cylinderForm) => {
      if (!organization?.id) throw new Error('Missing organization ID');

      const { data, error } = await supabase
        .from('dkegl_cylinders')
        .insert({
          organization_id: organization.id,
          cylinder_code: formData.cylinder_code,
          cylinder_type: formData.cylinder_type,
          diameter: parseFloat(formData.diameter) || null,
          length: parseFloat(formData.length) || null,
          number_of_colors: parseInt(formData.number_of_colors),
          location: formData.location,
          specifications: formData.specifications,
          status: 'available',
          usage_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Cylinder Added',
        description: 'New cylinder has been added to inventory.',
      });
      setCylinderForm({
        cylinder_code: '',
        cylinder_type: 'gravure',
        diameter: '',
        length: '',
        number_of_colors: '1',
        location: 'main_warehouse',
        specifications: {
          surface_roughness: '',
          hardness: '',
          coating_type: '',
          engraving_depth: '',
        },
      });
      setShowAddForm(false);
      refetchCylinders();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const scheduleMaintenance = useMutation({
    mutationFn: async (formData: typeof maintenanceForm) => {
      if (!organization?.id || !selectedCylinder) {
        throw new Error('Missing required information');
      }

      const { data, error } = await supabase
        .from('dkegl_cylinder_maintenance')
        .insert({
          organization_id: organization.id,
          cylinder_id: selectedCylinder,
          maintenance_type: formData.maintenance_type,
          scheduled_date: formData.scheduled_date,
          maintenance_notes: formData.maintenance_notes,
          status: 'scheduled',
          cost: 0,
        })
        .select()
        .single();

      if (error) throw error;

      // Update cylinder maintenance due date
      await supabase
        .from('dkegl_cylinders')
        .update({ maintenance_due_date: formData.scheduled_date })
        .eq('id', selectedCylinder);

      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Maintenance Scheduled',
        description: 'Maintenance has been scheduled successfully.',
      });
      setMaintenanceForm({
        maintenance_type: 'routine',
        scheduled_date: '',
        maintenance_notes: '',
      });
      queryClient.invalidateQueries({ queryKey: ['cylinder-maintenance'] });
      refetchCylinders();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_use':
        return <Clock className="h-4 w-4 text-primary" />;
      case 'maintenance':
        return <Wrench className="h-4 w-4 text-yellow-600" />;
      case 'damaged':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <Cylinder className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'available': 'default',
      'in_use': 'default',
      'maintenance': 'outline',
      'damaged': 'destructive',
      'retired': 'secondary',
    } as const;

    const colors = {
      'available': 'text-green-700 bg-green-100 border-green-300',
      'in_use': 'text-blue-700 bg-blue-100 border-blue-300',
      'maintenance': 'text-yellow-700 bg-yellow-100 border-yellow-300',
    } as const;

    return (
      <Badge 
        variant={variants[status as keyof typeof variants] || 'secondary'}
        className={colors[status as keyof typeof colors] || undefined}
      >
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const isMaintenanceDue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return isBefore(new Date(dueDate), addDays(new Date(), 7));
  };

  const cylindersNeedingMaintenance = cylinders?.filter(c => 
    isMaintenanceDue(c.maintenance_due_date)
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cylinder Management</h1>
          <p className="text-muted-foreground">
            Manage printing cylinders, track usage, and schedule maintenance
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Cylinder
        </Button>
      </div>

      {/* Maintenance Alerts */}
      {cylindersNeedingMaintenance.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Maintenance Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700 mb-3">
              {cylindersNeedingMaintenance.length} cylinder(s) require maintenance within the next 7 days.
            </p>
            <div className="space-y-2">
              {cylindersNeedingMaintenance.map((cylinder) => (
                <div key={cylinder.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <span className="font-medium">{cylinder.cylinder_code}</span>
                  <span className="text-sm text-muted-foreground">
                    Due: {cylinder.maintenance_due_date && format(new Date(cylinder.maintenance_due_date), 'MMM dd, yyyy')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Cylinder Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Cylinder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="cylinder_code">Cylinder Code</Label>
                <Input
                  id="cylinder_code"
                  value={cylinderForm.cylinder_code}
                  onChange={(e) => setCylinderForm(prev => ({ ...prev, cylinder_code: e.target.value }))}
                  placeholder="CYL-001"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="cylinder_type">Type</Label>
                <Select
                  value={cylinderForm.cylinder_type}
                  onValueChange={(value) => setCylinderForm(prev => ({ ...prev, cylinder_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gravure">Gravure</SelectItem>
                    <SelectItem value="flexo">Flexographic</SelectItem>
                    <SelectItem value="offset">Offset</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="diameter">Diameter (mm)</Label>
                <Input
                  id="diameter"
                  type="number"
                  value={cylinderForm.diameter}
                  onChange={(e) => setCylinderForm(prev => ({ ...prev, diameter: e.target.value }))}
                  placeholder="150"
                />
              </div>

              <div>
                <Label htmlFor="length">Length (mm)</Label>
                <Input
                  id="length"
                  type="number"
                  value={cylinderForm.length}
                  onChange={(e) => setCylinderForm(prev => ({ ...prev, length: e.target.value }))}
                  placeholder="1000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="number_of_colors">Number of Colors</Label>
                <Input
                  id="number_of_colors"
                  type="number"
                  value={cylinderForm.number_of_colors}
                  onChange={(e) => setCylinderForm(prev => ({ ...prev, number_of_colors: e.target.value }))}
                  min="1"
                  max="8"
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Select
                  value={cylinderForm.location}
                  onValueChange={(value) => setCylinderForm(prev => ({ ...prev, location: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main_warehouse">Main Warehouse</SelectItem>
                    <SelectItem value="printing_floor">Printing Floor</SelectItem>
                    <SelectItem value="maintenance_shop">Maintenance Shop</SelectItem>
                    <SelectItem value="storage_room">Storage Room</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createCylinder.mutate(cylinderForm)}
                disabled={createCylinder.isPending}
              >
                {createCylinder.isPending ? 'Adding...' : 'Add Cylinder'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cylinder Inventory */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cylinder className="h-5 w-5" />
            Cylinder Inventory
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cylinders && cylinders.length > 0 ? (
            <div className="space-y-4">
              {cylinders.map((cylinder) => (
                <div
                  key={cylinder.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => setSelectedCylinder(cylinder.id)}
                >
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(cylinder.status)}
                    <div>
                      <h4 className="font-medium">{cylinder.cylinder_code}</h4>
                      <p className="text-sm text-muted-foreground">
                        {cylinder.cylinder_type} • 
                        {cylinder.diameter && ` ⌀${cylinder.diameter}mm`}
                        {cylinder.length && ` × ${cylinder.length}mm`} • 
                        {cylinder.number_of_colors} colors
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {cylinder.location && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {cylinder.location.replace('_', ' ')}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Used {cylinder.usage_count} times
                        </span>
                        {isMaintenanceDue(cylinder.maintenance_due_date) && (
                          <Badge variant="outline" className="text-yellow-700 bg-yellow-100 border-yellow-300">
                            Maintenance Due
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {getStatusBadge(cylinder.status)}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCylinder(cylinder.id);
                      }}
                    >
                      <Wrench className="h-4 w-4 mr-1" />
                      Maintenance
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Cylinder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No Cylinders Found</h3>
              <p className="text-muted-foreground">
                Add cylinders to start managing your printing equipment.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Maintenance Scheduling */}
      {selectedCylinder && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="maintenance_type">Maintenance Type</Label>
                <Select
                  value={maintenanceForm.maintenance_type}
                  onValueChange={(value) => setMaintenanceForm(prev => ({ ...prev, maintenance_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine Maintenance</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="cleaning">Deep Cleaning</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="scheduled_date">Scheduled Date</Label>
                <Input
                  id="scheduled_date"
                  type="date"
                  value={maintenanceForm.scheduled_date}
                  onChange={(e) => setMaintenanceForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Button
                  onClick={() => scheduleMaintenance.mutate(maintenanceForm)}
                  disabled={scheduleMaintenance.isPending || !maintenanceForm.scheduled_date}
                  className="mt-6"
                >
                  {scheduleMaintenance.isPending ? 'Scheduling...' : 'Schedule'}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="maintenance_notes">Notes</Label>
              <Textarea
                id="maintenance_notes"
                value={maintenanceForm.maintenance_notes}
                onChange={(e) => setMaintenanceForm(prev => ({ ...prev, maintenance_notes: e.target.value }))}
                placeholder="Additional maintenance notes..."
                rows={3}
              />
            </div>

            {/* Maintenance History */}
            {maintenanceRecords && maintenanceRecords.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium mb-3">Maintenance History</h4>
                <div className="space-y-2">
                  {maintenanceRecords.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <span className="font-medium">{record.maintenance_type}</span>
                        <p className="text-sm text-muted-foreground">
                          Scheduled: {format(new Date(record.scheduled_date), 'MMM dd, yyyy')}
                          {record.completed_date && ` • Completed: ${format(new Date(record.completed_date), 'MMM dd, yyyy')}`}
                        </p>
                      </div>
                      <Badge variant={record.status === 'completed' ? 'default' : 'secondary'}>
                        {record.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};