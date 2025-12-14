import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface LegendItem {
  id: string;
  nom: string;
  color: string;
  tonnage: number;
}

interface MapLegendProps {
  items: LegendItem[];
  viewMode: 'mandataire' | 'client';
  selectedId: string;
  topN?: number;
}

export function MapLegend({ items, viewMode, selectedId, topN = 5 }: MapLegendProps) {
  const [expanded, setExpanded] = useState(false);
  
  // Sort by tonnage descending
  const sortedItems = useMemo(() => 
    [...items].sort((a, b) => b.tonnage - a.tonnage),
    [items]
  );
  
  // If a specific item is selected, only show that one
  if (selectedId !== 'all') {
    const selectedItem = items.find(i => i.id === selectedId);
    if (!selectedItem) return null;
    
    return (
      <div className="p-4 border-t border-border/50 bg-muted/20">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground">
            {viewMode === 'mandataire' ? 'Mandataire' : 'Client'}:
          </span>
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: selectedItem.color }}
            />
            <span className="text-sm font-medium">{selectedItem.nom}</span>
            <span className="text-xs text-muted-foreground ml-2">
              {(selectedItem.tonnage / 1000).toFixed(1)} T
            </span>
          </div>
          
          {/* Intensity scale */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Intensité:</span>
            <div 
              className="h-3 w-24 rounded-full overflow-hidden"
              style={{
                background: `linear-gradient(to right, 
                  ${selectedItem.color}1a, 
                  ${selectedItem.color}80, 
                  ${selectedItem.color})`
              }}
            />
            <span className="text-xs text-muted-foreground">Élevée</span>
          </div>
        </div>
      </div>
    );
  }
  
  // Show top N or all items
  const visibleItems = expanded ? sortedItems : sortedItems.slice(0, topN);
  const hiddenCount = sortedItems.length - topN;
  
  const formatTonnage = (kg: number) => {
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}T`;
    return `${kg.toFixed(0)}kg`;
  };

  return (
    <div className="p-4 border-t border-border/50 bg-muted/20">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Top {viewMode === 'mandataire' ? 'Mandataires' : 'Clients'}:
          </span>
          
          {/* Intensity scale */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Intensité:</span>
            <div className="flex items-center h-3 w-24 rounded-full overflow-hidden">
              <div className="h-full w-full" style={{
                background: `linear-gradient(to right, 
                  rgba(249, 115, 22, 0.1), 
                  rgba(249, 115, 22, 0.5), 
                  rgba(249, 115, 22, 1))`
              }} />
            </div>
            <span className="text-xs text-muted-foreground">Élevée</span>
          </div>
        </div>
        
        {/* Legend items */}
        <div className={cn(
          "transition-all duration-200",
          expanded ? "max-h-[200px]" : "max-h-none"
        )}>
          {expanded ? (
            <ScrollArea className="h-[180px] pr-4">
              <div className="flex flex-wrap gap-3">
                {visibleItems.map((item, index) => (
                  <div 
                    key={item.id} 
                    className="flex items-center gap-2 bg-background/50 px-2 py-1 rounded-md"
                  >
                    <div 
                      className="w-3 h-3 rounded-full shrink-0" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs whitespace-nowrap">
                      {index + 1}. {item.nom}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({formatTonnage(item.tonnage)})
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              {visibleItems.map((item, index) => (
                <div 
                  key={item.id} 
                  className="flex items-center gap-2"
                >
                  <div 
                    className="w-3 h-3 rounded-full shrink-0" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm whitespace-nowrap">{item.nom}</span>
                </div>
              ))}
              
              {hiddenCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(true)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  +{hiddenCount} autres
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
        
        {/* Collapse button when expanded */}
        {expanded && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(false)}
            className="self-start text-xs text-muted-foreground"
          >
            Réduire
            <ChevronUp className="ml-1 h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
