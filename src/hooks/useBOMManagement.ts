import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';

interface BOMComponent {
  id?: string;
  component_item_code: string;
  component_item_name?: string;
  quantity_per_unit: number;
  uom: string;
  stage_id?: string;
  stage_name?: string;
  consumption_type: 'direct' | 'indirect' | 'byproduct';
  is_critical: boolean;
  waste_percentage: number;
  substitute_items?: string[];
  stage_sequence: number;
  component_notes?: string;
}

interface BOMExplosionResult {
  component_item_code: string;
  component_item_name: string;
  total_quantity_required: number;
  stage_id: string;
  stage_name: string;
  consumption_type: string;
  is_critical: boolean;
  waste_percentage: number;
  net_requirement: number;
  available_stock: number;
  shortage_quantity: number;
}

interface MaterialReservation {
  id: string;
  item_code: string;
  reserved_quantity: number;
  allocated_quantity: number;
  consumed_quantity: number;
  reservation_status: 'reserved' | 'allocated' | 'consumed' | 'released';
  reservation_notes?: string;
}

export const useBOMManagement = () => {
  const { toast } = useToast();
  const { organization } = useDKEGLAuth();
  const queryClient = useQueryClient();
  const [selectedItemCode, setSelectedItemCode] = useState<string>('');

  // Get active BOM for an item
  const { data: activeBOM, isLoading: isLoadingBOM } = useQuery({
    queryKey: ['active-bom', organization?.id, selectedItemCode],
    queryFn: async () => {
      if (!organization?.id || !selectedItemCode) return null;
      
      const { data, error } = await supabase
        .from('dkegl_bom_master')
        .select(`
          *,
          dkegl_bom_components (
            *,
            dkegl_workflow_stages (stage_name),
            dkegl_item_master!inner (item_name)
          )
        `)
        .eq('organization_id', organization.id)
        .eq('item_code', selectedItemCode)
        .eq('is_active', true)
        .eq('approval_status', 'approved')
        .lte('effective_from', new Date().toISOString().split('T')[0])
        .or('effective_until.is.null,effective_until.gte.' + new Date().toISOString().split('T')[0])
        .order('bom_version', { ascending: false })
        .limit(1);

      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!organization?.id && !!selectedItemCode,
  });

  // Explode BOM for material requirements
  const explodeBOMMutation = useMutation({
    mutationFn: async ({ itemCode, quantity }: { itemCode: string; quantity: number }) => {
      if (!organization?.id) throw new Error('No organization found');
      
      const { data, error } = await supabase.rpc('dkegl_explode_bom', {
        _org_id: organization.id,
        _item_code: itemCode,
        _quantity: quantity
      });

      if (error) throw error;
      return data as BOMExplosionResult[];
    },
    onSuccess: () => {
      toast({
        title: 'BOM Explosion Completed',
        description: 'Material requirements calculated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'BOM Explosion Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reserve materials for an order
  const reserveMaterialsMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.rpc('dkegl_reserve_order_materials', {
        _order_id: orderId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      const warnings = data?.warnings || [];
      toast({
        title: 'Materials Reserved',
        description: warnings.length > 0 
          ? `Materials reserved with ${warnings.length} shortage warnings`
          : 'All materials reserved successfully',
        variant: warnings.length > 0 ? 'default' : 'default',
      });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['material-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['stock-summary'] });
    },
    onError: (error) => {
      toast({
        title: 'Material Reservation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Get material reservations for an order
  const { data: materialReservations, isLoading: isLoadingReservations } = useQuery({
    queryKey: ['material-reservations', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from('dkegl_material_reservations')
        .select(`
          *,
          dkegl_item_master (item_name)
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!organization?.id,
  });

  // Create or update BOM
  const createBOMMutation = useMutation({
    mutationFn: async ({ 
      itemCode, 
      bomVersion, 
      components, 
      bomData 
    }: { 
      itemCode: string; 
      bomVersion: string; 
      components: BOMComponent[];
      bomData: any;
    }) => {
      if (!organization?.id) throw new Error('No organization found');

      // Create BOM master record
      const { data: bomMaster, error: bomError } = await supabase
        .from('dkegl_bom_master')
        .insert({
          organization_id: organization.id,
          item_code: itemCode,
          bom_version: bomVersion,
          yield_percentage: bomData.yield_percentage || 100,
          scrap_percentage: bomData.scrap_percentage || 0,
          bom_notes: bomData.bom_notes,
          approval_status: 'draft'
        })
        .select()
        .single();

      if (bomError) throw bomError;

      // Create BOM components
      const bomComponents = components.map(comp => ({
        organization_id: organization.id,
        bom_master_id: bomMaster.id,
        stage_id: comp.stage_id,
        component_item_code: comp.component_item_code,
        quantity_per_unit: comp.quantity_per_unit,
        uom: comp.uom || 'PCS',
        consumption_type: comp.consumption_type || 'direct',
        is_critical: comp.is_critical || false,
        waste_percentage: comp.waste_percentage || 0,
        substitute_items: comp.substitute_items ? JSON.stringify(comp.substitute_items) : '[]',
        stage_sequence: comp.stage_sequence || 1,
        component_notes: comp.component_notes
      }));

      const { error: componentsError } = await supabase
        .from('dkegl_bom_components')
        .insert(bomComponents);

      if (componentsError) throw componentsError;

      return bomMaster;
    },
    onSuccess: () => {
      toast({
        title: 'BOM Created',
        description: 'Bill of Materials created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['active-bom'] });
    },
    onError: (error) => {
      toast({
        title: 'BOM Creation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    // State
    selectedItemCode,
    setSelectedItemCode,
    
    // Data
    activeBOM,
    materialReservations,
    
    // Loading states
    isLoadingBOM,
    isLoadingReservations,
    
    // Mutations
    explodeBOM: explodeBOMMutation.mutate,
    reserveMaterials: reserveMaterialsMutation.mutate,
    createBOM: createBOMMutation.mutate,
    
    // Loading states for mutations
    isExplodingBOM: explodeBOMMutation.isPending,
    isReservingMaterials: reserveMaterialsMutation.isPending,
    isCreatingBOM: createBOMMutation.isPending,
    
    // Results
    bomExplosionResults: explodeBOMMutation.data,
  };
};