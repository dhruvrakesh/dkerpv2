import * as React from "react"
import { Check, ChevronsUpDown, Search, Building, Users, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface VendorOption {
  id: string
  vendor_code: string
  vendor_name: string
  vendor_type?: string
  category_name?: string
  contact_person?: string
  email?: string
  phone?: string
  gstin?: string
  address?: string
  city?: string
  state?: string
  last_used?: Date
  usage_frequency?: number
}

interface EnterpriseVendorSelectorProps {
  vendors: VendorOption[]
  value?: string
  onValueChange?: (value: string, vendor?: VendorOption) => void
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
  showCategories?: boolean
  showRecentVendors?: boolean
  maxResults?: number
}

const SEARCH_DEBOUNCE_MS = 300
const MAX_DISPLAY_RESULTS = 50
const RECENT_VENDORS_LIMIT = 5

export const EnterpriseVendorSelector: React.FC<EnterpriseVendorSelectorProps> = ({
  vendors = [],
  value,
  onValueChange,
  placeholder = "Select vendor...",
  searchPlaceholder = "Search vendors...",
  disabled = false,
  className,
  showCategories = true,
  showRecentVendors = true,
  maxResults = MAX_DISPLAY_RESULTS,
}) => {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchValue)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchValue])

  // Calculate search results
  const searchResults = React.useMemo(() => {
    if (!debouncedSearch.trim()) {
      return vendors.slice(0, maxResults)
    }

    const query = debouncedSearch.toLowerCase()
    const scored = vendors
      .map(vendor => {
        let score = 0
        const name = vendor.vendor_name.toLowerCase()
        const code = vendor.vendor_code.toLowerCase()
        const category = vendor.category_name?.toLowerCase() || ""

        // Exact matches get highest score
        if (name === query || code === query) score += 100
        // Starts with search gets high score
        else if (name.startsWith(query) || code.startsWith(query)) score += 50
        // Contains search gets medium score
        else if (name.includes(query) || code.includes(query) || category.includes(query)) score += 25

        // Boost frequently used vendors
        if (vendor.usage_frequency) score += vendor.usage_frequency * 2
        
        // Boost recently used vendors
        if (vendor.last_used) {
          const daysSinceUsed = (Date.now() - vendor.last_used.getTime()) / (1000 * 60 * 60 * 24)
          if (daysSinceUsed < 30) score += 10
        }

        return { vendor, score }
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(item => item.vendor)

    return scored
  }, [vendors, debouncedSearch, maxResults])

  // Recent vendors
  const recentVendors = React.useMemo(() => {
    if (!showRecentVendors || debouncedSearch.trim()) return []
    
    return vendors
      .filter(vendor => vendor.last_used)
      .sort((a, b) => (b.last_used?.getTime() || 0) - (a.last_used?.getTime() || 0))
      .slice(0, RECENT_VENDORS_LIMIT)
  }, [vendors, showRecentVendors, debouncedSearch])

  // Group vendors by category
  const vendorsByCategory = React.useMemo(() => {
    if (!showCategories) return new Map()
    
    const grouped = new Map<string, VendorOption[]>()
    searchResults.forEach(vendor => {
      const category = vendor.category_name || "Uncategorized"
      if (!grouped.has(category)) {
        grouped.set(category, [])
      }
      grouped.get(category)!.push(vendor)
    })
    return grouped
  }, [searchResults, showCategories])

  const handleSelect = (vendor: VendorOption) => {
    onValueChange?.(vendor.id, vendor)
    setOpen(false)
  }

  const selectedVendor = vendors.find(v => v.id === value)

  const getVendorDisplayText = (vendor: VendorOption) => {
    return `${vendor.vendor_code} - ${vendor.vendor_name}`
  }

  const getVendorSubtext = (vendor: VendorOption) => {
    const parts = []
    if (vendor.vendor_type) parts.push(vendor.vendor_type)
    if (vendor.city) parts.push(vendor.city)
    return parts.join(" • ")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 truncate">
            <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            {selectedVendor ? (
              <span className="truncate">{getVendorDisplayText(selectedVendor)}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder={searchPlaceholder}
              value={searchValue}
              onValueChange={setSearchValue}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList>
            <ScrollArea className="h-[300px]">
              {/* Recent Vendors */}
              {recentVendors.length > 0 && (
                <>
                  <CommandGroup heading="Recently Used">
                    {recentVendors.map((vendor) => (
                      <CommandItem
                        key={vendor.id}
                        value={vendor.id}
                        onSelect={() => handleSelect(vendor)}
                        className="flex items-center justify-between p-2"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 flex-shrink-0">
                            <Clock className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-medium truncate">
                              {getVendorDisplayText(vendor)}
                            </span>
                            {getVendorSubtext(vendor) && (
                              <span className="text-xs text-muted-foreground truncate">
                                {getVendorSubtext(vendor)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Check
                          className={cn(
                            "ml-2 h-4 w-4 flex-shrink-0",
                            value === vendor.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              {/* Categorized Vendors */}
              {showCategories && vendorsByCategory.size > 0 ? (
                Array.from(vendorsByCategory.entries()).map(([category, categoryVendors]) => (
                  <CommandGroup key={category} heading={category}>
                    {categoryVendors.map((vendor) => (
                      <CommandItem
                        key={vendor.id}
                        value={vendor.id}
                        onSelect={() => handleSelect(vendor)}
                        className="flex items-center justify-between p-2"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary/50 flex-shrink-0">
                            <Building className="h-4 w-4 text-secondary-foreground" />
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-medium truncate">
                              {getVendorDisplayText(vendor)}
                            </span>
                            {getVendorSubtext(vendor) && (
                              <span className="text-xs text-muted-foreground truncate">
                                {getVendorSubtext(vendor)}
                              </span>
                            )}
                          </div>
                          {vendor.vendor_type && (
                            <Badge variant="secondary" className="text-xs">
                              {vendor.vendor_type}
                            </Badge>
                          )}
                        </div>
                        <Check
                          className={cn(
                            "ml-2 h-4 w-4 flex-shrink-0",
                            value === vendor.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))
              ) : (
                /* Flat list when categories are disabled */
                <CommandGroup>
                  {searchResults.map((vendor) => (
                    <CommandItem
                      key={vendor.id}
                      value={vendor.id}
                      onSelect={() => handleSelect(vendor)}
                      className="flex items-center justify-between p-2"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary/50 flex-shrink-0">
                          <Building className="h-4 w-4 text-secondary-foreground" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-medium truncate">
                            {getVendorDisplayText(vendor)}
                          </span>
                          {getVendorSubtext(vendor) && (
                            <span className="text-xs text-muted-foreground truncate">
                              {getVendorSubtext(vendor)}
                            </span>
                          )}
                        </div>
                        {vendor.vendor_type && (
                          <Badge variant="secondary" className="text-xs">
                            {vendor.vendor_type}
                          </Badge>
                        )}
                      </div>
                      <Check
                        className={cn(
                          "ml-2 h-4 w-4 flex-shrink-0",
                          value === vendor.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              <CommandEmpty>No vendors found.</CommandEmpty>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}