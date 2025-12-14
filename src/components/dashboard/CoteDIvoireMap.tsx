import { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Loader2, Flame, Users, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MandataireCombobox } from './MandataireCombobox';
import { MapLegend } from './MapLegend';
import { generateColor, hslToHex, hexToRgb, CLIENT_COLORS } from '@/utils/colorGenerator';

interface DestinationData {
  destination: string;
  latitude: number;
  longitude: number;
  region: string | null;
  tonnage: number;
  livraisons: number;
  mandataires: { id: string; nom: string; tonnage: number; percentage: number }[];
  clients: { nom: string; tonnage: number; percentage: number }[];
}

interface CoteDIvoireMapProps {
  startDate: string;
  endDate: string;
}

// Bottle weights in Kg
const BOTTLE_WEIGHTS = {
  b6: 6,
  b12: 12.5,
  b28: 28,
  b38: 38,
  b11_carbu: 11
};

// Top N options
const TOP_N_OPTIONS = [
  { value: 5, label: 'Top 5' },
  { value: 10, label: 'Top 10' },
  { value: 20, label: 'Top 20' },
  { value: 50, label: 'Top 50' },
];

const CoteDIvoireMap = ({ startDate, endDate }: CoteDIvoireMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [destinations, setDestinations] = useState<DestinationData[]>([]);
  const [mandataires, setMandataires] = useState<{ id: string; nom: string }[]>([]);
  const [selectedMandataire, setSelectedMandataire] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'mandataire' | 'client'>('mandataire');
  const [totalStats, setTotalStats] = useState({ tonnage: 0, livraisons: 0 });
  const [mapLoaded, setMapLoaded] = useState(false);
  const [topN, setTopN] = useState(10);

  // Unique clients from data
  const clients = ['TOTAL ENERGIES', 'PETRO IVOIRE', 'VIVO ENERGIES'];

  // Calculate mandataire stats with colors (dynamically generated)
  const mandatairesWithStats = useMemo(() => {
    const statsMap = new Map<string, number>();
    
    // Aggregate tonnage per mandataire from all destinations
    destinations.forEach(dest => {
      dest.mandataires.forEach(m => {
        const current = statsMap.get(m.id) || 0;
        statsMap.set(m.id, current + m.tonnage);
      });
    });
    
    // Build array with stats and colors
    const result = mandataires.map((m, originalIndex) => {
      const tonnage = statsMap.get(m.id) || 0;
      return {
        ...m,
        tonnage,
        originalIndex
      };
    });
    
    // Sort by tonnage to assign colors (most active = most distinct colors)
    const sortedByTonnage = [...result].sort((a, b) => b.tonnage - a.tonnage);
    
    // Assign colors based on rank
    const colorMap = new Map<string, string>();
    sortedByTonnage.forEach((m, index) => {
      const hsl = generateColor(index);
      colorMap.set(m.id, hslToHex(hsl));
    });
    
    // Return with colors assigned
    return result.map(m => ({
      ...m,
      color: colorMap.get(m.id) || '#f97316'
    }));
  }, [mandataires, destinations]);

  // Clients with stats and colors
  const clientsWithStats = useMemo(() => {
    const statsMap = new Map<string, number>();
    
    destinations.forEach(dest => {
      dest.clients.forEach(c => {
        const key = c.nom.toUpperCase();
        const current = statsMap.get(key) || 0;
        statsMap.set(key, current + c.tonnage);
      });
    });
    
    return clients.map(client => ({
      id: client,
      nom: client,
      tonnage: statsMap.get(client.toUpperCase()) || 0,
      color: CLIENT_COLORS[client] || '#f97316'
    }));
  }, [clients, destinations]);

  // Get color for a mandataire
  const getMandataireColor = (id: string): string => {
    const m = mandatairesWithStats.find(m => m.id === id);
    return m?.color || '#f97316';
  };

  // Fetch Mapbox token from edge function
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) {
          console.error('Error fetching Mapbox token:', error);
          return;
        }
        if (data?.token) {
          setMapboxToken(data.token);
        }
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
      }
    };
    fetchToken();
  }, []);

  // Calculate tonnage from a vente record
  const calculateTonnage = (vente: any): number => {
    const recharges = 
      (vente.r_b6 || 0) * BOTTLE_WEIGHTS.b6 +
      (vente.r_b12 || 0) * BOTTLE_WEIGHTS.b12 +
      (vente.r_b28 || 0) * BOTTLE_WEIGHTS.b28 +
      (vente.r_b38 || 0) * BOTTLE_WEIGHTS.b38 +
      (vente.r_b11_carbu || 0) * BOTTLE_WEIGHTS.b11_carbu;
    
    const consignes = 
      (vente.c_b6 || 0) * BOTTLE_WEIGHTS.b6 +
      (vente.c_b12 || 0) * BOTTLE_WEIGHTS.b12 +
      (vente.c_b28 || 0) * BOTTLE_WEIGHTS.b28 +
      (vente.c_b38 || 0) * BOTTLE_WEIGHTS.b38 +
      (vente.c_b11_carbu || 0) * BOTTLE_WEIGHTS.b11_carbu;
    
    return recharges + consignes;
  };

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch mandataires
        const { data: mandatairesData } = await supabase
          .from('mandataires')
          .select('id, nom');
        
        setMandataires(mandatairesData || []);

        // Fetch ventes for the period
        const { data: ventes } = await supabase
          .from('ventes_mandataires')
          .select('*')
          .gte('date', startDate)
          .lte('date', endDate);

        // Fetch geolocation data
        const { data: geoData } = await supabase
          .from('destinations_geolocation')
          .select('*');

        if (!ventes || !geoData) {
          setDestinations([]);
          setLoading(false);
          return;
        }

        // Create a map of destination names to geo data (case insensitive)
        const geoMap = new Map<string, any>();
        geoData.forEach(geo => {
          geoMap.set(geo.destination.toUpperCase(), geo);
        });

        // Group ventes by destination
        const destinationMap = new Map<string, {
          ventes: any[];
          geo: any;
        }>();

        ventes.forEach(vente => {
          if (!vente.destination) return;
          
          const destKey = vente.destination.toUpperCase().trim();
          const geo = geoMap.get(destKey);
          
          if (!geo) return;
          
          if (!destinationMap.has(destKey)) {
            destinationMap.set(destKey, { ventes: [], geo });
          }
          destinationMap.get(destKey)!.ventes.push(vente);
        });

        // Process destinations
        const processedDestinations: DestinationData[] = [];
        let totalTonnage = 0;
        let totalLivraisons = 0;

        destinationMap.forEach((data, destKey) => {
          const { ventes: destVentes, geo } = data;
          
          // Calculate tonnage by mandataire
          const mandataireMap = new Map<string, { id: string; nom: string; tonnage: number }>();
          const clientMap = new Map<string, number>();
          let destTonnage = 0;
          
          destVentes.forEach(vente => {
            const tonnage = calculateTonnage(vente);
            destTonnage += tonnage;
            
            // Mandataire breakdown
            const mandataire = mandatairesData?.find(m => m.id === vente.mandataire_id);
            if (mandataire) {
              const current = mandataireMap.get(vente.mandataire_id) || { id: mandataire.id, nom: mandataire.nom, tonnage: 0 };
              current.tonnage += tonnage;
              mandataireMap.set(vente.mandataire_id, current);
            }

            // Client breakdown
            if (vente.client) {
              const clientKey = vente.client.toUpperCase();
              const currentClient = clientMap.get(clientKey) || 0;
              clientMap.set(clientKey, currentClient + tonnage);
            }
          });

          // Build mandataire breakdown
          const mandataireBreakdown: { id: string; nom: string; tonnage: number; percentage: number }[] = [];
          mandataireMap.forEach((data) => {
            mandataireBreakdown.push({
              ...data,
              percentage: destTonnage > 0 ? (data.tonnage / destTonnage) * 100 : 0
            });
          });
          mandataireBreakdown.sort((a, b) => b.tonnage - a.tonnage);

          // Build client breakdown
          const clientBreakdown: { nom: string; tonnage: number; percentage: number }[] = [];
          clientMap.forEach((tonnage, clientName) => {
            clientBreakdown.push({
              nom: clientName,
              tonnage,
              percentage: destTonnage > 0 ? (tonnage / destTonnage) * 100 : 0
            });
          });
          clientBreakdown.sort((a, b) => b.tonnage - a.tonnage);

          processedDestinations.push({
            destination: geo.destination,
            latitude: Number(geo.latitude),
            longitude: Number(geo.longitude),
            region: geo.region,
            tonnage: destTonnage,
            livraisons: destVentes.length,
            mandataires: mandataireBreakdown,
            clients: clientBreakdown
          });

          totalTonnage += destTonnage;
          totalLivraisons += destVentes.length;
        });

        processedDestinations.sort((a, b) => b.tonnage - a.tonnage);
        
        setDestinations(processedDestinations);
        setTotalStats({ tonnage: totalTonnage, livraisons: totalLivraisons });
      } catch (error) {
        console.error('Error fetching map data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  // Initialize map
  useEffect(() => {
    if (!mapboxToken) return;
    if (map.current) return;

    const initMap = () => {
      if (!mapContainer.current) {
        requestAnimationFrame(initMap);
        return;
      }

      mapboxgl.accessToken = mapboxToken;
      
      try {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/light-v11',
          center: [-5.5, 7.5],
          zoom: 5.5,
          attributionControl: false,
        });

        map.current.addControl(
          new mapboxgl.NavigationControl({ visualizePitch: false }),
          'top-right'
        );

        map.current.on('load', () => {
          map.current?.resize();
          setMapLoaded(true);
        });

        map.current.on('error', (e) => {
          console.error('Map error:', e);
        });
      } catch (err) {
        console.error('Map creation error:', err);
      }
    };

    const timeoutId = setTimeout(initMap, 100);

    return () => {
      clearTimeout(timeoutId);
      map.current?.remove();
      map.current = null;
      setMapLoaded(false);
    };
  }, [mapboxToken, destinations.length]);

  // Update heatmap when data or filters change
  useEffect(() => {
    if (!map.current || destinations.length === 0) return;

    // Remove existing layers and sources
    if (map.current.getLayer('heatmap-layer')) {
      map.current.removeLayer('heatmap-layer');
    }
    if (map.current.getLayer('circle-layer')) {
      map.current.removeLayer('circle-layer');
    }
    if (map.current.getSource('destinations')) {
      map.current.removeSource('destinations');
    }

    // Filter and prepare data based on selection
    const features = destinations.map(dest => {
      let filteredTonnage = dest.tonnage;
      let color = '#f97316';

      if (viewMode === 'mandataire') {
        if (selectedMandataire !== 'all') {
          const mandataireData = dest.mandataires.find(m => m.id === selectedMandataire);
          filteredTonnage = mandataireData?.tonnage || 0;
          color = getMandataireColor(selectedMandataire);
        } else if (dest.mandataires.length > 0) {
          color = getMandataireColor(dest.mandataires[0].id);
        }
      } else {
        if (selectedClient !== 'all') {
          const clientData = dest.clients.find(c => c.nom.toUpperCase() === selectedClient.toUpperCase());
          filteredTonnage = clientData?.tonnage || 0;
          color = CLIENT_COLORS[selectedClient] || '#f97316';
        } else if (dest.clients.length > 0) {
          color = CLIENT_COLORS[dest.clients[0].nom] || '#f97316';
        }
      }

      return {
        type: 'Feature' as const,
        properties: {
          tonnage: filteredTonnage,
          destination: dest.destination,
          region: dest.region,
          livraisons: dest.livraisons,
          color
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [dest.longitude, dest.latitude]
        }
      };
    }).filter(f => f.properties.tonnage > 0);

    if (features.length === 0) return;

    // Get current color based on filter
    let heatmapColor = '#f97316';
    if (viewMode === 'mandataire' && selectedMandataire !== 'all') {
      heatmapColor = getMandataireColor(selectedMandataire);
    } else if (viewMode === 'client' && selectedClient !== 'all') {
      heatmapColor = CLIENT_COLORS[selectedClient] || '#f97316';
    }

    const rgb = hexToRgb(heatmapColor);

    // Add source
    map.current.addSource('destinations', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features
      }
    });

    // Add heatmap layer
    map.current.addLayer({
      id: 'heatmap-layer',
      type: 'heatmap',
      source: 'destinations',
      paint: {
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'tonnage'],
          0, 0,
          Math.max(...features.map(f => f.properties.tonnage)), 1
        ],
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 1,
          9, 3
        ],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0, 0, 0, 0)',
          0.1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
          0.3, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
          0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`,
          0.7, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`,
          1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`
        ],
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 20,
          9, 50
        ],
        'heatmap-opacity': 0.8
      }
    });

    // Add circle layer for points at higher zoom
    map.current.addLayer({
      id: 'circle-layer',
      type: 'circle',
      source: 'destinations',
      minzoom: 7,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['get', 'tonnage'],
          0, 8,
          Math.max(...features.map(f => f.properties.tonnage)), 30
        ],
        'circle-color': ['get', 'color'],
        'circle-stroke-color': 'white',
        'circle-stroke-width': 2,
        'circle-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7, 0,
          8, 0.8
        ]
      }
    });

    // Add popup on click
    map.current.on('click', 'circle-layer', (e) => {
      if (!e.features || e.features.length === 0) return;
      
      const feature = e.features[0];
      const coords = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
      const props = feature.properties;

      new mapboxgl.Popup()
        .setLngLat(coords)
        .setHTML(`
          <div style="padding: 8px; min-width: 150px; background: #1f2937; color: white; border-radius: 8px;">
            <h3 style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">${props?.destination}</h3>
            <p style="font-size: 12px; color: #9ca3af; margin-bottom: 6px;">${props?.region || 'Région inconnue'}</p>
            <p style="font-size: 16px; font-weight: bold; color: ${props?.color};">
              ${((props?.tonnage || 0) / 1000).toFixed(1)} T
            </p>
            <p style="font-size: 11px; color: #9ca3af;">${props?.livraisons} livraisons</p>
          </div>
        `)
        .addTo(map.current!);
    });

    // Change cursor on hover
    map.current.on('mouseenter', 'circle-layer', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'circle-layer', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    });

    // Fit bounds
    const bounds = new mapboxgl.LngLatBounds();
    features.forEach(f => {
      bounds.extend(f.geometry.coordinates as [number, number]);
    });
    
    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, { padding: 60, maxZoom: 8 });
    }

  }, [destinations, selectedMandataire, selectedClient, viewMode, mandatairesWithStats, mapLoaded]);

  // Calculate filtered stats
  const filteredStats = destinations.reduce((acc, dest) => {
    let tonnage = dest.tonnage;
    if (viewMode === 'mandataire' && selectedMandataire !== 'all') {
      const mandataireData = dest.mandataires.find(m => m.id === selectedMandataire);
      tonnage = mandataireData?.tonnage || 0;
    } else if (viewMode === 'client' && selectedClient !== 'all') {
      const clientData = dest.clients.find(c => c.nom.toUpperCase() === selectedClient.toUpperCase());
      tonnage = clientData?.tonnage || 0;
    }
    return {
      tonnage: acc.tonnage + tonnage,
      count: tonnage > 0 ? acc.count + 1 : acc.count
    };
  }, { tonnage: 0, count: 0 });

  // Legend items for the current view
  const legendItems = viewMode === 'mandataire' 
    ? mandatairesWithStats.filter(m => m.tonnage > 0)
    : clientsWithStats.filter(c => c.tonnage > 0);

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Carte de Chaleur des Livraisons
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[500px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (destinations.length === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Carte de Chaleur des Livraisons
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[500px] text-muted-foreground">
          Aucune donnée de livraison pour cette période
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
      <CardHeader className="pb-3 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Flame className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Carte de Chaleur des Livraisons</CardTitle>
              <p className="text-sm text-muted-foreground">
                Visualisation interactive des zones de livraison
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="px-3 py-1">
              {(filteredStats.tonnage / 1000).toFixed(1)} T
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              {filteredStats.count} zones
            </Badge>
          </div>
        </div>

        {/* View Mode Tabs and Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'mandataire' | 'client')}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="mandataire" className="gap-2">
                <Users className="h-4 w-4" />
                Par Mandataire
              </TabsTrigger>
              <TabsTrigger value="client" className="gap-2">
                <Building2 className="h-4 w-4" />
                Par Client
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filter Select */}
          <div className="flex items-center gap-2">
            {viewMode === 'mandataire' ? (
              <>
                <MandataireCombobox
                  mandataires={mandatairesWithStats}
                  value={selectedMandataire}
                  onValueChange={setSelectedMandataire}
                  topN={topN}
                />
                <Select 
                  value={topN.toString()} 
                  onValueChange={(v) => setTopN(parseInt(v))}
                >
                  <SelectTrigger className="w-[100px] bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TOP_N_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ) : (
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="w-[220px] bg-background/50">
                  <SelectValue placeholder="Tous les clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les clients</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client} value={client}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: CLIENT_COLORS[client] || '#f97316' }}
                        />
                        {client}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="relative h-[500px] w-full">
          <div
            ref={mapContainer}
            className="absolute inset-0 overflow-hidden"
          />
          <div className="absolute bottom-1 right-1 bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded text-xs text-muted-foreground">
            GazPILOT - Tous droits réservés
          </div>
        </div>
      </CardContent>
      
      {/* Legend */}
      <MapLegend
        items={legendItems}
        viewMode={viewMode}
        selectedId={viewMode === 'mandataire' ? selectedMandataire : selectedClient}
        topN={topN}
      />
    </Card>
  );
};

export default CoteDIvoireMap;
