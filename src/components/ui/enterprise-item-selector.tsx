import * as React from "react"
import { Check, ChevronsUpDown, Search, Package, Tag, Clock } from "lucide-react"
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
import { Separator } from "@/components/ui/separator"

export interface ItemOption {
  id: string
  item_code: string
  item_name: string
  uom?: string
  category_name?: string
  status?: string
  last_used?: Date
  usage_frequency?: number
}

interface EnterpriseItemSelectorProps {
  items: ItemOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
  showCategories?: boolean
  showRecentItems?: boolean
  maxResults?: number
}

const SEARCH_DEBOUNCE_MS = 300
const MAX_DISPLAY_RESULTS = 50
const RECENT_ITEMS_LIMIT = 5

export function EnterpriseItemSelector({
  items,
  value,
  onValueChange,
  placeholder = "Select item...",
  searchPlaceholder = "Search items by code, name, or category...",
  disabled = false,
  className,
  showCategories = true,
  showRecentItems = true,
  maxResults = MAX_DISPLAY_RESULTS,
}: EnterpriseItemSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchValue)
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [searchValue])

  // Get the selected item
  const selectedItem = React.useMemo(() => 
    items.find(item => item.item_code === value),
    [items, value]
  )

  // Smart search algorithm with scoring
  const searchResults = React.useMemo(() => {
    if (!debouncedSearch.trim()) {
      return items.slice(0, maxResults)
    }

    const query = debouncedSearch.toLowerCase().trim()
    const scored = items.map(item => {
      let score = 0
      const itemCode = item.item_code.toLowerCase()
      const itemName = item.item_name.toLowerCase()
      const category = item.category_name?.toLowerCase() || ""

      // Exact matches get highest score
      if (itemCode === query) score += 100
      if (itemName === query) score += 95
      
      // Start matches get high score
      if (itemCode.startsWith(query)) score += 80
      if (itemName.startsWith(query)) score += 75
      
      // Contains matches get medium score
      if (itemCode.includes(query)) score += 50
      if (itemName.includes(query)) score += 45
      if (category.includes(query)) score += 30
      
      // Boost frequently used items
      if (item.usage_frequency && item.usage_frequency > 10) score += 10
      
      // Boost recently used items
      if (item.last_used) {
        const daysSinceUsed = (Date.now() - item.last_used.getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceUsed < 7) score += 15
        else if (daysSinceUsed < 30) score += 5
      }

      return { ...item, searchScore: score }
    })
    .filter(item => item.searchScore > 0)
    .sort((a, b) => b.searchScore - a.searchScore)
    .slice(0, maxResults)

    return scored
  }, [items, debouncedSearch, maxResults])

  // Get recent items for quick access
  const recentItems = React.useMemo(() => {
    if (!showRecentItems) return []
    
    return items
      .filter(item => item.last_used)
      .sort((a, b) => (b.last_used?.getTime() || 0) - (a.last_used?.getTime() || 0))
      .slice(0, RECENT_ITEMS_LIMIT)
  }, [items, showRecentItems])

  // Group items by category
  const groupedResults = React.useMemo(() => {
    if (!showCategories) {
      return { 'All Items': searchResults }
    }

    const groups: Record<string, typeof searchResults> = {}
    
    searchResults.forEach(item => {
      const category = item.category_name || 'Uncategorized'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(item)
    })

    return groups
  }, [searchResults, showCategories])

  const handleSelect = (itemCode: string) => {
    onValueChange?.(itemCode)
    setOpen(false)
    setSearchValue("")
  }

  const getItemDisplayText = (item: ItemOption) => {
    return `${item.item_code} - ${item.item_name}`
  }

  const getItemSubtext = (item: ItemOption) => {
    const parts = []
    if (item.category_name) parts.push(item.category_name)
    if (item.uom) parts.push(`UOM: ${item.uom}`)
    return parts.join(" • ")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 truncate">
            <Package className="h-4 w-4 shrink-0 opacity-50" />
            <span className="truncate">
              {selectedItem ? getItemDisplayText(selectedItem) : placeholder}
            </span>
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
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <CommandList asChild>
            <ScrollArea className="h-[300px]">
              <div className="p-1">
                {/* Recent Items Section */}
                {!debouncedSearch && recentItems.length > 0 && (
                  <>
                    <CommandGroup heading="Recently Used">
                      {recentItems.map((item) => (
                        <CommandItem
                          key={`recent-${item.id}`}
                          value={item.item_code}
                          onSelect={() => handleSelect(item.item_code)}
                          className="flex items-center gap-3 px-3 py-2.5"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-sm truncate">
                                {getItemDisplayText(item)}
                              </div>
                              {getItemSubtext(item) && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {getItemSubtext(item)}
                                </div>
                              )}
                            </div>
                          </div>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4 shrink-0",
                              value === item.item_code ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandSeparator />
                  </>
                )}

                {/* Search Results */}
                {Object.keys(groupedResults).length === 0 ? (
                  <CommandEmpty className="py-6 text-center text-sm">
                    {debouncedSearch ? "No items found." : "No items available."}
                  </CommandEmpty>
                ) : (
                  Object.entries(groupedResults).map(([category, categoryItems]) => (
                    <div key={category}>
                      {showCategories && Object.keys(groupedResults).length > 1 && (
                        <CommandGroup heading={category}>
                          <div className="px-2 py-1">
                            <div className="flex items-center gap-2">
                              <Tag className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                {category} ({categoryItems.length})
                              </span>
                            </div>
                          </div>
                        </CommandGroup>
                      )}
                      
                      {categoryItems.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={item.item_code}
                          onSelect={() => handleSelect(item.item_code)}
                          className="flex items-center gap-3 px-3 py-2.5"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-sm truncate">
                                {getItemDisplayText(item)}
                              </div>
                              {getItemSubtext(item) && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {getItemSubtext(item)}
                                </div>
                              )}
                            </div>
                            {item.status && item.status !== 'active' && (
                              <Badge variant="secondary" className="text-xs">
                                {item.status}
                              </Badge>
                            )}
                          </div>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4 shrink-0",
                              value === item.item_code ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                      
                      {Object.keys(groupedResults).length > 1 && (
                        <div className="px-2 py-1">
                          <Separator />
                        </div>
                      )}
                    </div>
                  ))
                )}

                {/* Results Count Info */}
                {debouncedSearch && searchResults.length > 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground border-t">
                    Showing {searchResults.length} of {items.length} items
                    {searchResults.length >= maxResults && ` (limited to ${maxResults})`}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}