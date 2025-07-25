-- Create sample quality inspections with correct table structure and JSONB casting
INSERT INTO dkegl_quality_inspections (
  organization_id,
  order_id,
  stage_id,
  template_id,
  inspector_id,
  inspection_date,
  inspection_results,
  overall_result,
  defects_found,
  corrective_actions,
  remarks
)
SELECT 
  o.organization_id,
  o.id,
  s.id,
  qt.id,
  (SELECT auth.uid()),
  now(),
  CASE s.stage_order 
    WHEN 1 THEN '{"overall_grade": "A-", "color_match": "within_tolerance", "defects": "minor_streak", "measurements": {"color_density": 1.45, "registration_accuracy": 0.08}}'::jsonb
    ELSE '{"status": "pending", "measurements": {}}'::jsonb
  END,
  CASE s.stage_order 
    WHEN 1 THEN 'passed'
    ELSE 'pending'
  END,
  CASE s.stage_order 
    WHEN 1 THEN '["Minor streak in cyan channel at 450mm mark"]'::jsonb
    ELSE '[]'::jsonb
  END,
  CASE s.stage_order 
    WHEN 1 THEN '["Clean cylinder before next run", "Adjust ink viscosity"]'::jsonb
    ELSE '[]'::jsonb
  END,
  CASE s.stage_order 
    WHEN 1 THEN 'Overall quality is good. Minor streak defect requires cylinder cleaning before next run.'
    ELSE 'Inspection pending - waiting for stage completion'
  END
FROM dkegl_orders o
CROSS JOIN dkegl_workflow_stages s
CROSS JOIN dkegl_quality_templates qt
WHERE o.organization_id = s.organization_id 
  AND s.organization_id = qt.organization_id
  AND s.stage_type = qt.stage_type
LIMIT 8; -- Limit to avoid too many records