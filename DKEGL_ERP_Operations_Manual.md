# DKEGL ERP System Operations Manual

## Table of Contents

1. [System Overview](#system-overview)
2. [Phase 1: System Setup & User Management](#phase-1-system-setup--user-management)
3. [Phase 2: Master Data Setup](#phase-2-master-data-setup)
4. [Phase 3: BOM (Bill of Materials) Management](#phase-3-bom-bill-of-materials-management)
5. [Phase 4: Inventory Management](#phase-4-inventory-management)
6. [Phase 5: Manufacturing Order Flow](#phase-5-manufacturing-order-flow)
7. [Phase 6: Quality & Monitoring](#phase-6-quality--monitoring)
8. [Best Practices & Do's and Don'ts](#best-practices--dos-and-donts)
9. [Troubleshooting Guide](#troubleshooting-guide)

---

## System Overview

### DKEGL ERP Architecture
The DKEGL ERP system is designed for flexible packaging manufacturing with integrated workflow management:

- **Frontend**: React-based web application with real-time updates
- **Backend**: Supabase with PostgreSQL database
- **Authentication**: Role-based access control (Admin, Manager, Operator, Viewer)
- **Real-time**: Live updates across all modules

### Core Modules
1. **Inventory Management** - Stock tracking, GRN processing, issue management
2. **Item Master** - Product definitions, specifications, pricing
3. **Manufacturing Workflow** - Order processing through production stages
4. **Quality Control** - Stage-wise quality checks and approvals
5. **Cost Analysis** - Material consumption and cost tracking
6. **Vendor Management** - Supplier relationships and purchase orders

### Manufacturing Workflow Sequence
```
Gravure Printing → Lamination → Adhesive Coating → Slitting → Packaging
```

---

## Phase 1: System Setup & User Management

### 1.1 Initial Access Setup

**Admin Setup (First Time Only):**
1. Log in with admin credentials (`info@dkenterprises.co.in`)
2. Verify organization settings under Profile menu
3. Check that DKEGL organization is active

### 1.2 User Role Management

**Adding New Users:**
1. Users self-register through the login page
2. Admin assigns appropriate roles:
   - **Admin**: Full system access, user management
   - **Manager**: Production oversight, approvals
   - **Operator**: Day-to-day operations, data entry
   - **Viewer**: Read-only access to reports

**Role Assignment Process:**
1. Navigate to User Management (Admin only)
2. Select user from pending list
3. Assign role based on responsibilities
4. Activate user account

### 1.3 System Configuration Checklist
- [ ] Verify organization settings
- [ ] Check workflow stages are active
- [ ] Confirm pricing tolerance settings
- [ ] Validate storage locations
- [ ] Test real-time updates

---

## Phase 2: Master Data Setup

### 2.1 Category Management

**Creating Categories (Individual):**
1. Navigate to Item Master → Categories
2. Click "Add Category"
3. Enter category details:
   - Category Name (e.g., "Raw Materials", "Substrates")
   - Description
   - Category Code (auto-generated)

**Category Hierarchy:**
```
Raw Materials
├── Substrates
├── Inks
├── Adhesives
└── Chemicals

Finished Goods
├── Pouches
├── Labels
├── Laminates
└── Tapes
```

### 2.2 Item Master Setup

**Individual Item Creation:**
1. Navigate to Item Master → Add Item
2. Fill required fields:
   - Item Code (auto-generated or manual)
   - Item Name
   - Category
   - UOM (Unit of Measure)
   - Specifications (JSON format)
3. Set inventory parameters:
   - Reorder Level
   - Reorder Quantity
   - Lead Time
4. Add pricing information
5. Save and activate

**Bulk Item Upload:**
1. Navigate to Item Master → Bulk Upload
2. Download template
3. Fill template with item data
4. Upload file
5. Review validation results
6. Approve valid entries

**Item Code Generation Rules:**
- Format: `{CATEGORY}_{QUALIFIER}_{SIZE}_{GSM}`
- Example: `SUB_BOPP_12x18_20`
- Auto-generated for consistency

### 2.3 Vendor Management

**Adding Vendors:**
1. Navigate to Procurement → Vendor Management
2. Click "Add Vendor"
3. Enter vendor details:
   - Vendor Code
   - Vendor Name
   - Contact Information
   - Payment Terms
   - Credit Limit
4. Activate vendor

### 2.4 Pricing Master Setup

**Individual Pricing Setup:**
1. Navigate to Inventory → Pricing Master
2. Select item code
3. Enter pricing details:
   - Standard Cost
   - Valuation Method (Standard/Weighted Average/FIFO)
   - Price Tolerance (%)
   - Effective Dates
4. Submit for approval

**Bulk Pricing Upload:**
1. Use bulk upload feature
2. Follow validation process
3. Admin approval required

---

## Phase 3: BOM (Bill of Materials) Management

### 3.1 BOM Overview

The BOM (Bill of Materials) system is the **heart of the manufacturing ERP**, defining exactly which raw materials, chemicals, and quantities are required to produce each finished good. Without proper BOM setup, material planning, cost calculation, and automated stock reservations cannot function.

**Key BOM Components:**
- **BOM Master**: Links finished goods to their component requirements
- **BOM Components**: Detailed material requirements per production stage
- **BOM Explosion**: Automatic calculation of total material requirements
- **Material Reservations**: Automatic stock allocation for orders

### 3.2 BOM Creation and Setup

**Prerequisites:**
1. ✅ All raw materials and chemicals must be in Item Master
2. ✅ Finished goods must be defined with correct specifications
3. ✅ Workflow stages must be configured and active
4. ✅ Pricing master must be setup for accurate costing

**Creating a New BOM:**
1. Navigate to Manufacturing → BOM Management
2. Click "Create New BOM"
3. Select Finished Good item code
4. Enter BOM details:
   - BOM Version (e.g., "1.0", "1.1")
   - Yield Percentage (typically 95-98%)
   - Overall Scrap Percentage (2-5%)
   - Effective From/Until dates
5. Add component requirements per stage:
   - Component item code (RM/CHEM)
   - Quantity per unit of finished good
   - Stage where consumed (Printing, Lamination, etc.)
   - Consumption type (Direct/Indirect/Byproduct)
   - Critical material flag
   - Waste percentage for this component
   - Alternative materials (if any)

**BOM Component Example:**
```
Finished Good: PKG_POUCH_STANDUP_500ML
├── Gravure Printing Stage
│   ├── SUB_BOPP_350MM_20GSM: 0.85 SQM (Direct, Critical)
│   ├── INK_CYAN_PROCESS: 0.02 KG (Direct, Waste: 5%)
│   └── INK_MAGENTA_PROCESS: 0.015 KG (Direct, Waste: 5%)
├── Lamination Stage
│   ├── SUB_PE_350MM_40GSM: 0.85 SQM (Direct, Critical)
│   └── ADH_SOLVENT_BASED: 0.05 KG (Direct, Waste: 8%)
└── Slitting & Packaging Stage
    └── PKG_TAPE_SEALING: 0.1 MTR (Indirect, Waste: 2%)
```

### 3.3 BOM Explosion Process

**Automatic BOM Explosion** happens when:
1. **Order Creation**: When FG item and quantity are selected
2. **Production Planning**: Before material reservation
3. **Manual Trigger**: Via "Explode BOM" button

**BOM Explosion Results Show:**
- Total material requirements per component
- Stage-wise consumption breakdown
- Available stock vs required quantities
- **Shortage alerts** for insufficient stock
- Waste-adjusted net requirements
- Estimated total material cost

**Reading BOM Explosion Results:**
```
Material: SUB_BOPP_350MM_20GSM
├── Required: 850 SQM
├── Available: 1200 SQM  
├── Shortage: 0 SQM ✅
└── Status: OK

Material: INK_CYAN_PROCESS  
├── Required: 25 KG
├── Available: 15 KG
├── Shortage: 10 KG ⚠️
└── Status: SHORTAGE - Procurement needed
```

### 3.4 Material Reservation System

**Automatic Material Reservation:**
- Triggered when order status changes to "Approved"
- Reserves exact quantities calculated by BOM explosion
- Updates available stock quantities
- Creates reservation records for tracking

**Material Reservation Status:**
- **Reserved**: Materials allocated but not yet consumed
- **Allocated**: Materials physically prepared for production
- **Consumed**: Materials actually used in production
- **Released**: Unused reservations freed back to stock

**Manual Material Reservation:**
1. Navigate to Manufacturing → Material Reservations
2. Select order ID
3. Click "Reserve Materials" 
4. Review shortage warnings
5. Confirm reservation

### 3.5 BOM Integration with Order Processing

**Enhanced Order Punching with BOM:**
1. Select Finished Good item from dropdown
2. Enter order quantity
3. **System automatically explodes BOM**
4. Shows material requirements preview
5. Highlights any material shortages
6. Allows order creation with shortage warnings

**Material Requirements Preview Shows:**
- Component item codes and names
- Stage-wise consumption
- Total quantity required
- Available stock
- Shortage quantities (red alerts)
- Critical material indicators

### 3.6 BOM Versioning and Approval

**BOM Approval Workflow:**
1. **Draft**: New BOM created, can be edited
2. **Pending**: Submitted for approval
3. **Approved**: Active BOM, used for explosion
4. **Rejected**: Needs revision

**BOM Version Control:**
- Multiple versions per finished good
- Only one version active at a time
- Historical versions maintained
- Effective date controls

**BOM Approval Process:**
1. BOM creator submits for approval
2. Manager/Admin reviews components and quantities
3. Validates against actual production data
4. Approves or rejects with comments
5. Active BOM becomes effective immediately

### 3.7 BOM Best Practices

**DO's:**
✅ **Always create BOMs for ALL finished goods**
✅ Validate BOM quantities against actual production
✅ Include realistic waste percentages (3-8%)
✅ Mark critical materials that can stop production  
✅ Use stage-specific consumption mapping
✅ Keep BOMs updated with engineering changes
✅ Test BOM explosion before production
✅ Monitor actual vs planned consumption

**DON'Ts:**
❌ Don't produce without approved BOMs
❌ Don't ignore material shortage warnings
❌ Don't use generic waste percentages for all materials
❌ Don't skip BOM version control
❌ Don't create BOMs without proper material validation
❌ Don't bypass material reservation system

### 3.8 BOM Troubleshooting

**Common BOM Issues:**

**Issue: "No active BOM found for item"**
- Check if BOM exists and is approved
- Verify effective dates
- Ensure BOM version is active

**Issue: "Material shortage detected"**
- Review current stock levels
- Check pending GRNs
- Consider alternative materials
- Adjust order timing

**Issue: "BOM explosion not working"**
- Verify all component items exist in master
- Check stage assignments
- Validate BOM approval status

**Issue: "Incorrect material quantities"**
- Review BOM component quantities
- Check yield percentage settings
- Validate waste percentage calculations
- Compare with actual consumption data

### 3.9 BOM Reports and Analytics

**Key BOM Reports:**
1. **BOM Summary**: All active BOMs by finished good
2. **Material Requirements**: Projected needs by period
3. **BOM Cost Analysis**: Standard vs actual costs
4. **Shortage Analysis**: Materials needing procurement
5. **BOM Accuracy**: Planned vs actual consumption variance

**BOM KPIs to Monitor:**
- BOM Accuracy %: (Actual consumption / Planned consumption) × 100
- Material Shortage Frequency
- BOM Update Frequency
- Cost Variance %: (Actual cost - Standard cost) / Standard cost × 100

---

## Phase 4: Inventory Management

### 3.1 Initial Stock Setup

**Stock Opening Balance Entry:**
1. Navigate to Inventory → Stock Management
2. For each item:
   - Enter opening quantity
   - Set unit cost
   - Specify location
   - Add remarks if needed

### 3.2 GRN (Goods Received Note) Processing

**Individual GRN Entry:**
1. Navigate to Inventory → GRN Management
2. Click "Create GRN"
3. Fill GRN details:
   - GRN Number (unique)
   - Date
   - Vendor
   - Item Code
   - Quantity Received
   - Unit Rate
   - Quality Status
4. Save GRN

**Bulk GRN Processing:**
1. Navigate to GRN Management → Bulk Upload
2. Download template
3. Fill template with GRN data
4. Upload and validate
5. Review price variances
6. Approve processed entries

**GRN Validation Checks:**
- Item code exists and is active
- No duplicate GRN + Item combinations
- Price variance within tolerance
- Valid quality status
- Date validations

### 3.3 Issue Management

**Stock Issue Process:**
1. Navigate to Inventory → Issue Management
2. Create new issue:
   - Item Code
   - Quantity to Issue
   - Purpose/Department
   - Date
   - Remarks
3. System automatically updates stock

**Issue Tracking:**
- Real-time stock updates
- Consumption analysis
- Department-wise usage reports

### 3.4 Stock Monitoring

**Daily Stock Summary:**
- Access through Inventory Dashboard
- Shows current stock levels
- Highlights reorder suggestions
- Displays stock aging analysis

**Key Metrics to Monitor:**
- Days of Cover (target: 15-45 days)
- Reorder Level Alerts
- Stock Aging Categories
- Price Variance Alerts

---

## Phase 4: Manufacturing Order Flow

### 4.1 Order Punching (Order Creation)

**Creating Manufacturing Orders:**
1. Navigate to Manufacturing → Order Punching
2. Generate UIORN (auto-generated)
3. Fill order details:
   - Customer Information
   - Item Details (Code, Name, Quantity)
   - Technical Specifications
   - Delivery Date
   - Priority Level

**Order Information Requirements:**
- Order Number
- UIORN (Unique Identifier)
- Customer Details
- Item Specifications
- Substrate Details
- Printing Requirements

### 4.2 Workflow Management

**Manufacturing Stages:**
1. **Gravure Printing**
   - Cylinder preparation
   - Ink setup
   - Printing execution
   - Quality checks

2. **Lamination**
   - Substrate preparation
   - Adhesive application
   - Lamination process
   - Curing/cooling

3. **Adhesive Coating**
   - Surface preparation
   - Coating application
   - Drying process
   - Quality verification

4. **Slitting**
   - Size calculation
   - Slitting execution
   - Edge quality check
   - Roll packaging

5. **Packaging**
   - Final inspection
   - Packaging specification
   - Labeling
   - Dispatch preparation

### 4.3 UIORN Tracking

**Monitoring Order Progress:**
1. Navigate to Manufacturing → UIORN Tracking
2. Search by UIORN or filter by status
3. View current stage and progress
4. Check stage details and quality status

**Stage Progression:**
- Auto-progression when stage completes
- Manual hold/release options
- Quality gate checks
- Material consumption tracking

### 4.4 Material Consumption

**Recording Material Usage:**
- Automatic tracking per stage
- Planned vs Actual quantities
- Waste calculation
- Cost allocation

---

## Phase 5: Quality & Monitoring

### 5.1 Quality Control Points

**Stage-wise Quality Checks:**
- Each stage has defined quality parameters
- Quality status: Pending → In Review → Passed/Failed
- Rework process for failed stages
- Quality documentation

### 5.2 Cost Analysis

**Cost Tracking:**
- Material costs per stage
- Labor cost allocation
- Overhead calculations
- Total manufacturing cost
- Margin analysis

### 5.3 Production Analytics

**Key Performance Indicators:**
- Stage efficiency percentages
- Waste percentages by stage
- Order completion times
- Quality pass rates
- Resource utilization

**Dashboard Access:**
- Real-time production metrics
- Stage performance trends
- Cost analysis reports
- Quality trends

---

## Best Practices & Do's and Don'ts

### 6.1 Data Entry Best Practices

**DO's:**
✅ Always use bulk upload for large datasets
✅ Validate data before approval
✅ Follow naming conventions consistently
✅ Set appropriate price tolerances (5-15%)
✅ Regular stock reconciliation
✅ Document quality issues promptly
✅ Use proper UOM throughout system
✅ Maintain vendor information updated

**DON'Ts:**
❌ Don't skip validation steps
❌ Don't approve bulk uploads without review
❌ Don't use special characters in codes
❌ Don't delete records (deactivate instead)
❌ Don't ignore price variance alerts
❌ Don't proceed without quality approval
❌ Don't skip stage documentation
❌ Don't override system calculations manually

### 6.2 Inventory Management Guidelines

**Stock Level Management:**
- Maintain 15-45 days of cover stock
- Set reorder levels at 7-10 days consumption
- Monitor slow-moving stock monthly
- Regular physical verification

**GRN Processing:**
- Process GRNs within 24 hours of receipt
- Verify quantities and quality immediately
- Investigate price variances >10%
- Update vendor performance metrics

### 6.3 Manufacturing Workflow Guidelines

**Order Processing:**
- Verify customer specifications before order entry
- Check material availability before starting production
- Follow stage sequence strictly
- Document quality issues immediately
- Update progress status regularly

**Material Consumption:**
- Record actual consumption per stage
- Investigate waste >5% immediately
- Track material traceability
- Maintain consumption standards

### 6.4 Quality Control Guidelines

**Quality Gates:**
- No stage progression without quality approval
- Document all quality issues
- Implement corrective actions
- Track quality trends
- Regular quality audits

---

## Troubleshooting Guide

### 7.1 Common Issues and Solutions

**Login/Access Issues:**
- **Problem**: User cannot access system
- **Solution**: Check user role assignment, verify email confirmation

**Data Upload Issues:**
- **Problem**: Bulk upload validation errors
- **Solution**: Check template format, verify item codes exist, review data types

**Workflow Issues:**
- **Problem**: Order stuck in stage
- **Solution**: Check quality status, verify material availability, review stage assignments

**Pricing Issues:**
- **Problem**: Price variance alerts
- **Solution**: Review pricing master, check market rates, adjust tolerance if needed

**Stock Discrepancies:**
- **Problem**: System stock vs physical stock mismatch
- **Solution**: Verify all transactions, check for missing entries, perform stock adjustment

### 7.2 System Performance

**Slow Performance:**
- Clear browser cache
- Check internet connection
- Contact admin for server status

**Real-time Updates Not Working:**
- Refresh page
- Check browser compatibility
- Verify connection status

### 7.3 Data Integrity Checks

**Daily Checks:**
- [ ] Stock summary matches detailed stock
- [ ] All GRNs processed and approved
- [ ] No pending quality approvals beyond 4 hours
- [ ] Price variance alerts reviewed
- [ ] Material consumption updated

**Weekly Checks:**
- [ ] Stock aging analysis
- [ ] Vendor performance review
- [ ] Production efficiency metrics
- [ ] Quality trend analysis
- [ ] Cost variance analysis

**Monthly Checks:**
- [ ] Physical stock verification
- [ ] Pricing master review
- [ ] User access audit
- [ ] System performance review
- [ ] Data backup verification

---

## Emergency Procedures

### 8.1 System Down Scenarios

**Immediate Actions:**
1. Document current work status
2. Note pending transactions
3. Inform team members
4. Contact system administrator
5. Use manual backup procedures if available

### 8.2 Data Recovery

**In case of data loss:**
1. Stop all data entry immediately
2. Contact admin for backup restoration
3. Verify data integrity after restoration
4. Re-enter transactions if needed

### 8.3 Critical Error Handling

**Production Stoppage:**
1. Identify blocking issue
2. Check system status
3. Use manual tracking temporarily
4. Resume electronic tracking once resolved

---

## Contact Information

**System Administrator**: info@dkenterprises.co.in
**Technical Support**: [Your IT Support Contact]
**User Training**: [Training Coordinator Contact]

---

## Appendices

### Appendix A: Item Code Examples
```
SUB_BOPP_12X18_20    - BOPP Substrate 12x18 inch, 20 GSM
INK_CYAN_PROCESS     - Process Cyan Ink
ADH_HOTMELT_EVA      - EVA Hot Melt Adhesive
FG_POUCH_STANDUP     - Stand-up Pouch Finished Good
```

### Appendix B: Common UOM Codes
- KG - Kilogram
- LTR - Liter  
- MTR - Meter
- PCS - Pieces
- SQM - Square Meter
- ROLL - Roll

### Appendix C: Quality Status Codes
- PENDING - Awaiting quality check
- IN_REVIEW - Under quality review
- PASSED - Quality approved
- FAILED - Quality rejected
- REWORK_REQUIRED - Needs rework

### Appendix D: Stage Status Codes
- PENDING - Not started
- IN_PROGRESS - Currently active
- COMPLETED - Finished successfully
- ON_HOLD - Temporarily stopped
- FAILED - Stage failed quality

---

**Document Version**: 1.0
**Last Updated**: January 2025
**Next Review**: Monthly

---

*This manual is a living document and should be updated as the system evolves. All team members should familiarize themselves with relevant sections based on their roles and responsibilities.*