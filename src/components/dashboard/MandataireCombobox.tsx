import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MandataireWithStats {
  id: string;
  nom: string;
  tonnage: number;
  color: string;
}

interface MandataireComboboxProps {
  mandataires: MandataireWithStats[];
  value: string;
  onValueChange: (value: string) => void;
  topN: number;
}

export function MandataireCombobox({ 
  mandataires, 
  value, 
  onValueChange,
  topN
}: MandataireComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sort mandataires by tonnage and filter by search
  const sortedMandataires = useMemo(() => {
    const sorted = [...mandataires].sort((a, b) => b.tonnage - a.tonnage);
    
    if (!searchQuery) return sorted;
    
    const query = searchQuery.toLowerCase();
    return sorted.filter(m => m.nom.toLowerCase().includes(query));
  }, [mandataires, searchQuery]);

  // Get top N and "others"
  const topMandataires = sortedMandataires.slice(0, topN);
  const otherMandataires = sortedMandataires.slice(topN);
  
  const selectedMandataire = mandataires.find(m => m.id === value);
  
  const formatTonnage = (kg: number) => {
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}T`;
    return `${kg.toFixed(0)}kg`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[280px] justify-between bg-background/50"
        >
          <div className="flex items-center gap-2 truncate">
            {value === 'all' ? (
              <>
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>Tous les mandataires</span>
                <Badge variant="secondary" className="ml-1 text-xs">
                  {mandataires.length}
                </Badge>
              </>
            ) : selectedMandataire ? (
              <>
                <div 
                  className="w-3 h-3 rounded-full shrink-0" 
                  style={{ backgroundColor: selectedMandataire.color }}
                />
                <span className="truncate">{selectedMandataire.nom}</span>
                <Badge variant="secondary" className="ml-1 text-xs">
                  {formatTonnage(selectedMandataire.tonnage)}
                </Badge>
              </>
            ) : (
              <span>Sélectionner...</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder="Rechercher un mandataire..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <CommandList>
            <CommandEmpty>Aucun mandataire trouvé.</CommandEmpty>
            
            {/* All option */}
            <CommandGroup>
              <CommandItem
                value="all"
                onSelect={() => {
                  onValueChange('all');
                  setOpen(false);
                  setSearchQuery('');
                }}
                className="cursor-pointer"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === 'all' ? "opacity-100" : "opacity-0"
                  )}
                />
                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Tous les mandataires</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {mandataires.length}
                </Badge>
              </CommandItem>
            </CommandGroup>

            {/* Top mandataires */}
            {topMandataires.length > 0 && (
              <CommandGroup heading={`Top ${Math.min(topN, topMandataires.length)}`}>
                <ScrollArea className="max-h-[200px]">
                  {topMandataires.map((m) => (
                    <CommandItem
                      key={m.id}
                      value={m.id}
                      onSelect={() => {
                        onValueChange(m.id);
                        setOpen(false);
                        setSearchQuery('');
                      }}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === m.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div 
                        className="w-3 h-3 rounded-full mr-2 shrink-0" 
                        style={{ backgroundColor: m.color }}
                      />
                      <span className="truncate flex-1">{m.nom}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {formatTonnage(m.tonnage)}
                      </Badge>
                    </CommandItem>
                  ))}
                </ScrollArea>
              </CommandGroup>
            )}

            {/* Other mandataires */}
            {otherMandataires.length > 0 && !searchQuery && (
              <CommandGroup heading={`Autres (${otherMandataires.length})`}>
                <ScrollArea className="max-h-[150px]">
                  {otherMandataires.map((m) => (
                    <CommandItem
                      key={m.id}
                      value={m.id}
                      onSelect={() => {
                        onValueChange(m.id);
                        setOpen(false);
                        setSearchQuery('');
                      }}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === m.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div 
                        className="w-3 h-3 rounded-full mr-2 shrink-0" 
                        style={{ backgroundColor: m.color }}
                      />
                      <span className="truncate flex-1">{m.nom}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {formatTonnage(m.tonnage)}
                      </Badge>
                    </CommandItem>
                  ))}
                </ScrollArea>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
