import React, { useState } from 'react';
import { Plus, Search, Filter, FileText, Edit, Copy, Check, X, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BOMCreateForm } from './BOMCreateForm';
import { StageManagementInterface } from './StageManagementInterface';
import { useBOMManagement } from '@/hooks/useBOMManagement';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';

export function BOMManagementDashboard() {
  const { organization } = useDKEGLAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedBOM, setSelectedBOM] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortColumn, setSortColumn] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Fetch BOMs with pagination
  const { data: bomsData, isLoading } = useQuery({
    queryKey: ['boms', organization?.id, currentPage, pageSize, sortColumn, sortDirection, searchTerm],
    queryFn: async () => {
      if (!organization?.id) return { boms: [], totalCount: 0 };

      // Get BOMs with pagination
      let query = supabase
        .from('dkegl_bom_master')
        .select('*', { count: 'exact' })
        .eq('organization_id', organization.id);

      // Add search filter
      if (searchTerm) {
        query = query.or(`item_code.ilike.%${searchTerm}%,bom_notes.ilike.%${searchTerm}%`);
      }

      // Add sorting
      query = query.order(sortColumn, { ascending: sortDirection === 'asc' });

      // Add pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data: boms, error, count } = await query;
      if (error) throw error;

      // Fetch item master data separately to avoid join issues
      const itemCodes = boms?.map(bom => bom.item_code) || [];
      let itemsMap: Record<string, any> = {};

      if (itemCodes.length > 0) {
        const { data: items } = await supabase
          .from('dkegl_item_master')
          .select(`
            item_code,
            item_name,
            category_id,
            dkegl_categories(category_name)
          `)
          .eq('organization_id', organization.id)
          .in('item_code', itemCodes);

        if (items) {
          itemsMap = items.reduce((acc, item) => {
            acc[item.item_code] = item;
            return acc;
          }, {});
        }
      }

      // Combine BOM data with item data
      const enrichedBOMs = boms?.map(bom => ({
        ...bom,
        item_master: itemsMap[bom.item_code] || null
      })) || [];

      return { boms: enrichedBOMs, totalCount: count || 0 };
    },
    enabled: !!organization?.id
  });

  const boms = bomsData?.boms || [];
  const totalCount = bomsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Handle sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Handle page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Handle search with debounce effect
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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
            Manage Bills of Materials and workflow stages
          </p>
        </div>
        <Button onClick={handleCreateBOM} className="gap-2">
          <Plus className="h-4 w-4" />
          Create BOM
        </Button>
      </div>

      <Tabs defaultValue="boms" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="boms">Bills of Materials</TabsTrigger>
          <TabsTrigger value="stages">Stage Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="boms" className="space-y-6">
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

          {/* Search, Filters and Pagination Controls */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search BOMs by item code or notes..."
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
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {totalCount} total BOMs
              </span>
              <Select value={pageSize.toString()} onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* BOM List */}
          <div className="grid gap-4">
            {boms.length === 0 ? (
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
              boms.map((bom) => (
                <Card key={bom.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold cursor-pointer" onClick={() => handleSort('item_code')}>
                            {bom.item_code}
                          </h3>
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
                          {bom.item_master?.item_name || 'Item name not found'}
                        </p>
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <span>Version: {bom.bom_version || '1.0'}</span>
                          <span>Yield: {bom.yield_percentage || 100}%</span>
                          <span>Scrap: {bom.scrap_percentage || 0}%</span>
                          {bom.effective_from && (
                            <span>Effective: {new Date(bom.effective_from).toLocaleDateString()}</span>
                          )}
                          <span className="cursor-pointer" onClick={() => handleSort('created_at')}>
                            Created: {new Date(bom.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {bom.bom_notes && (
                          <p className="text-sm text-muted-foreground mt-2 italic">
                            {bom.bom_notes}
                          </p>
                        )}
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} BOMs
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    if (pageNum > totalPages) return null;
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="stages">
          <StageManagementInterface />
        </TabsContent>
      </Tabs>

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
              // Refresh the BOM list
              queryClient.invalidateQueries({ queryKey: ['boms'] });
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