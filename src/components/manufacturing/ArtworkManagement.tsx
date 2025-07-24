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
import { 
  Upload, 
  FileImage, 
  Eye, 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock,
  History,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';

interface Artwork {
  id: string;
  order_id: string;
  artwork_name: string;
  artwork_type: string;
  file_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  version_number: number;
  status: string;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

interface Order {
  id: string;
  uiorn: string;
  item_name: string;
  order_number: string;
}

export const ArtworkManagement = () => {
  const { organization, user } = useDKEGLAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [uploadForm, setUploadForm] = useState({
    artwork_name: '',
    artwork_type: 'label',
    file: null as File | null,
  });
  const [isUploading, setIsUploading] = useState(false);

  const { data: orders } = useQuery({
    queryKey: ['orders-for-artwork', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from('dkegl_orders')
        .select('id, uiorn, item_name, order_number')
        .eq('organization_id', organization.id)
        .in('status', ['draft', 'in_production', 'confirmed'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!organization?.id,
  });

  const { data: artwork, refetch } = useQuery({
    queryKey: ['artwork', organization?.id, selectedOrder],
    queryFn: async () => {
      if (!organization?.id || !selectedOrder) return [];
      
      const { data, error } = await supabase
        .from('dkegl_artwork')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('order_id', selectedOrder)
        .order('version_number', { ascending: false });

      if (error) throw error;
      return data as Artwork[];
    },
    enabled: !!organization?.id && !!selectedOrder,
  });

  const uploadArtwork = useMutation({
    mutationFn: async (formData: { artwork_name: string; artwork_type: string; file: File }) => {
      if (!organization?.id || !user?.id || !selectedOrder) {
        throw new Error('Missing required information');
      }

      // Check if artwork with same name exists to determine version number
      const { data: existing } = await supabase
        .from('dkegl_artwork')
        .select('version_number')
        .eq('organization_id', organization.id)
        .eq('order_id', selectedOrder)
        .eq('artwork_name', formData.artwork_name)
        .order('version_number', { ascending: false })
        .limit(1);

      const versionNumber = existing && existing.length > 0 ? existing[0].version_number + 1 : 1;

      // Upload file to storage (placeholder - you'd implement actual file upload)
      const fileName = `${organization.id}/${selectedOrder}/${formData.artwork_name}_v${versionNumber}_${Date.now()}`;
      
      // Create artwork record
      const { data, error } = await supabase
        .from('dkegl_artwork')
        .insert({
          organization_id: organization.id,
          order_id: selectedOrder,
          artwork_name: formData.artwork_name,
          artwork_type: formData.artwork_type,
          file_path: fileName, // This would be the actual storage path
          file_size: formData.file.size,
          mime_type: formData.file.type,
          version_number: versionNumber,
          status: 'draft',
          created_by: user.id,
          metadata: {
            original_filename: formData.file.name,
            upload_date: new Date().toISOString(),
          },
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Artwork Uploaded',
        description: 'Artwork has been uploaded successfully and is ready for review.',
      });
      setUploadForm({ artwork_name: '', artwork_type: 'label', file: null });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateArtworkStatus = useMutation({
    mutationFn: async ({ artworkId, status }: { artworkId: string; status: string }) => {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'approved' && user?.id) {
        updateData.approved_by = user.id;
        updateData.approved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('dkegl_artwork')
        .update(updateData)
        .eq('id', artworkId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Status Updated',
        description: `Artwork status updated to ${data.status}`,
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'review':
        return <Eye className="h-4 w-4 text-primary" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'draft': 'secondary',
      'review': 'default',
      'approved': 'default',
      'rejected': 'destructive',
      'archived': 'outline',
    } as const;

    const colors = {
      'approved': 'text-green-700 bg-green-100 border-green-300',
      'review': 'text-blue-700 bg-blue-100 border-blue-300',
    } as const;

    return (
      <Badge 
        variant={variants[status as keyof typeof variants] || 'secondary'}
        className={colors[status as keyof typeof colors] || undefined}
      >
        {status.toUpperCase()}
      </Badge>
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadForm(prev => ({ ...prev, file }));
    }
  };

  const handleUpload = () => {
    if (!uploadForm.file || !uploadForm.artwork_name) {
      toast({
        title: 'Missing Information',
        description: 'Please provide artwork name and select a file.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    uploadArtwork.mutate({
      artwork_name: uploadForm.artwork_name,
      artwork_type: uploadForm.artwork_type,
      file: uploadForm.file,
    });
    setIsUploading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Artwork Management</h1>
          <p className="text-muted-foreground">
            Upload, review, and manage artwork files for manufacturing orders
          </p>
        </div>
      </div>

      {/* Order Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Order</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedOrder} onValueChange={setSelectedOrder}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an order to manage artwork" />
            </SelectTrigger>
            <SelectContent>
              {orders?.map((order) => (
                <SelectItem key={order.id} value={order.id}>
                  {order.uiorn} - {order.item_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedOrder && (
        <>
          {/* Upload New Artwork */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload New Artwork
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="artwork_name">Artwork Name</Label>
                  <Input
                    id="artwork_name"
                    value={uploadForm.artwork_name}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, artwork_name: e.target.value }))}
                    placeholder="Main Label Design"
                  />
                </div>
                <div>
                  <Label htmlFor="artwork_type">Artwork Type</Label>
                  <Select
                    value={uploadForm.artwork_type}
                    onValueChange={(value) => setUploadForm(prev => ({ ...prev, artwork_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="label">Label</SelectItem>
                      <SelectItem value="packaging">Packaging</SelectItem>
                      <SelectItem value="flexible">Flexible Packaging</SelectItem>
                      <SelectItem value="rigid">Rigid Packaging</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="file">Select File</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={handleFileUpload}
                    accept="image/*,.pdf,.ai,.eps"
                  />
                </div>
              </div>
              
              {uploadForm.file && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileImage className="h-4 w-4" />
                    <span className="text-sm font-medium">{uploadForm.file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({Math.round(uploadForm.file.size / 1024)} KB)
                    </span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={isUploading || uploadArtwork.isPending}
                className="w-full"
              >
                {isUploading || uploadArtwork.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Upload Artwork
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Artwork List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Artwork History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {artwork && artwork.length > 0 ? (
                <div className="space-y-4">
                  {artwork.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(item.status)}
                        <div>
                          <h4 className="font-medium">{item.artwork_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Version {item.version_number} • {item.artwork_type}
                            {item.file_size && ` • ${Math.round(item.file_size / 1024)} KB`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Created: {format(new Date(item.created_at), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        {getStatusBadge(item.status)}
                        
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                          
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                          
                          {item.status === 'review' && (
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                onClick={() => updateArtworkStatus.mutate({ 
                                  artworkId: item.id, 
                                  status: 'approved' 
                                })}
                                disabled={updateArtworkStatus.isPending}
                                className="text-green-700 bg-green-100 hover:bg-green-200"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updateArtworkStatus.mutate({ 
                                  artworkId: item.id, 
                                  status: 'rejected' 
                                })}
                                disabled={updateArtworkStatus.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                          
                          {item.status === 'draft' && (
                            <Button
                              size="sm"
                              onClick={() => updateArtworkStatus.mutate({ 
                                artworkId: item.id, 
                                status: 'review' 
                              })}
                              disabled={updateArtworkStatus.isPending}
                            >
                              Submit for Review
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileImage className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">No Artwork Found</h3>
                  <p className="text-muted-foreground">
                    Upload artwork files to get started with this order.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};