import React, { useState } from 'react';
import { Plus, Search, Filter, FileText, Edit, Copy, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BOMCreateForm } from './BOMCreateForm';
import { useBOMManagement } from '@/hooks/useBOMManagement';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export function BOMManagementDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedBOM, setSelectedBOM] = useState<any>(null);

  // Fetch BOMs
  const { data: boms = [], isLoading } = useQuery({
    queryKey: ['boms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dkegl_bom_master')
        .select(`
          *,
          dkegl_item_master!inner(item_name, category_id, dkegl_categories(category_name))
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const filteredBOMs = boms.filter(bom => 
    bom.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (bom.dkegl_item_master as any)?.item_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateBOM = () => {
    setSelectedBOM(null);
    setShowCreateForm(true);
  };

  const handleEditBOM = (bom: any) => {
    setSelectedBOM(bom);
    setShowCreateForm(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">BOM Management</h1>
          <p className="text-muted-foreground">
            Manage Bill of Materials for finished goods and assemblies
          </p>
        </div>
        <Button onClick={handleCreateBOM} className="gap-2">
          <Plus className="h-4 w-4" />
          Create BOM
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total BOMs</p>
                <p className="text-2xl font-bold">{boms.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active BOMs</p>
                <p className="text-2xl font-bold">
                  {boms.filter(b => b.is_active).length}
                </p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Draft BOMs</p>
                <p className="text-2xl font-bold">
                  {boms.filter(b => b.approval_status === 'draft').length}
                </p>
              </div>
              <Edit className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Components</p>
                <p className="text-2xl font-bold">
                  {boms.length > 0 ? Math.round(
                    boms.reduce((sum, b) => sum + ((b as any).total_components || 0), 0) / boms.length
                  ) : 0}
                </p>
              </div>
              <Copy className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search BOMs by item code or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* BOM List */}
      <div className="grid gap-4">
        {filteredBOMs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No BOMs Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No BOMs match your search criteria.' : 'Create your first BOM to get started.'}
              </p>
              {!searchTerm && (
                <Button onClick={handleCreateBOM} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create First BOM
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredBOMs.map((bom) => (
            <Card key={bom.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{bom.item_code}</h3>
                      <Badge variant={bom.is_active ? 'default' : 'secondary'}>
                        {bom.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant={
                        bom.approval_status === 'approved' ? 'default' :
                        bom.approval_status === 'pending' ? 'secondary' : 'outline'
                      }>
                        {bom.approval_status}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mb-3">
                      {(bom.dkegl_item_master as any)?.item_name}
                    </p>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <span>Version: {(bom as any).bom_version || '1.0'}</span>
                      <span>Components: {(bom as any).total_components || 0}</span>
                      <span>Type: {(bom as any).bom_type || 'standard'}</span>
                      {bom.effective_from && (
                        <span>Effective: {new Date(bom.effective_from).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditBOM(bom)}
                      className="gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBOM({ ...bom, item_code: `${bom.item_code}_COPY` });
                        setShowCreateForm(true);
                      }}
                      className="gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Clone
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {selectedBOM ? 'Edit BOM' : 'Create New BOM'}
            </DialogTitle>
          </DialogHeader>
          <BOMCreateForm
            initialData={selectedBOM}
            onSuccess={() => {
              setShowCreateForm(false);
              setSelectedBOM(null);
            }}
            onCancel={() => {
              setShowCreateForm(false);
              setSelectedBOM(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}