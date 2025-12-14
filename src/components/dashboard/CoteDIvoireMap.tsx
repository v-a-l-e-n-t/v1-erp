import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Loader2 } from 'lucide-react';

interface DestinationData {
  destination: string;
  latitude: number;
  longitude: number;
  region: string | null;
  tonnage: number;
  livraisons: number;
  mandataires: { nom: string; tonnage: number; percentage: number }[];
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

// Mandataire colors
const MANDATAIRE_COLORS = [
  '#f97316', // orange
  '#3b82f6', // blue
  '#10b981', // green
  '#8b5cf6', // purple
  '#ef4444', // red
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f59e0b', // amber
];

const CoteDIvoireMap = ({ startDate, endDate }: CoteDIvoireMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [destinations, setDestinations] = useState<DestinationData[]>([]);
  const [mandataires, setMandataires] = useState<{ id: string; nom: string }[]>([]);
  const [selectedMandataire, setSelectedMandataire] = useState<string>('all');
  const [totalStats, setTotalStats] = useState({ tonnage: 0, livraisons: 0 });

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
          
          if (!geo) return; // Skip if no geo data
          
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
          const mandataireMap = new Map<string, number>();
          let destTonnage = 0;
          
          destVentes.forEach(vente => {
            const tonnage = calculateTonnage(vente);
            destTonnage += tonnage;
            
            const currentMandataire = mandataireMap.get(vente.mandataire_id) || 0;
            mandataireMap.set(vente.mandataire_id, currentMandataire + tonnage);
          });

          // Build mandataire breakdown
          const mandataireBreakdown: { nom: string; tonnage: number; percentage: number }[] = [];
          mandataireMap.forEach((tonnage, mandataireId) => {
            const mandataire = mandatairesData?.find(m => m.id === mandataireId);
            mandataireBreakdown.push({
              nom: mandataire?.nom || 'Inconnu',
              tonnage,
              percentage: destTonnage > 0 ? (tonnage / destTonnage) * 100 : 0
            });
          });

          mandataireBreakdown.sort((a, b) => b.tonnage - a.tonnage);

          processedDestinations.push({
            destination: geo.destination,
            latitude: Number(geo.latitude),
            longitude: Number(geo.longitude),
            region: geo.region,
            tonnage: destTonnage,
            livraisons: destVentes.length,
            mandataires: mandataireBreakdown
          });

          totalTonnage += destTonnage;
          totalLivraisons += destVentes.length;
        });

        // Sort by tonnage
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
    if (!mapContainer.current || map.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-5.5, 7.5], // Center on Côte d'Ivoire
      zoom: 5.5,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: false }),
      'top-right'
    );

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken]);

  // Update markers when data or filter changes
  useEffect(() => {
    if (!map.current) return;

    // Remove existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Filter destinations based on selected mandataire
    const filteredDestinations = destinations.map(dest => {
      if (selectedMandataire === 'all') {
        return dest;
      }
      
      const mandataireData = dest.mandataires.find(m => {
        const matchingMandataire = mandataires.find(mm => mm.nom === m.nom);
        return matchingMandataire?.id === selectedMandataire;
      });
      
      if (!mandataireData) return null;
      
      return {
        ...dest,
        tonnage: mandataireData.tonnage,
        mandataires: [mandataireData]
      };
    }).filter(Boolean) as DestinationData[];

    // Calculate max tonnage for scaling
    const maxTonnage = Math.max(...filteredDestinations.map(d => d.tonnage), 1);

    // Add markers
    filteredDestinations.forEach((dest, index) => {
      if (dest.tonnage === 0) return;

      // Calculate marker size based on tonnage (min 20, max 60)
      const size = Math.max(20, Math.min(60, (dest.tonnage / maxTonnage) * 60));
      
      // Get color based on mandataire or use default
      let color = '#f97316';
      if (selectedMandataire !== 'all') {
        const mandataireIndex = mandataires.findIndex(m => m.id === selectedMandataire);
        color = MANDATAIRE_COLORS[mandataireIndex % MANDATAIRE_COLORS.length];
      } else if (dest.mandataires.length > 0) {
        const topMandataire = dest.mandataires[0];
        const mandataireIndex = mandataires.findIndex(m => m.nom === topMandataire.nom);
        color = MANDATAIRE_COLORS[mandataireIndex % MANDATAIRE_COLORS.length];
      }

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'map-marker';
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.backgroundColor = color;
      el.style.borderRadius = '50%';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';
      el.style.opacity = '0.85';
      el.style.transition = 'transform 0.2s, opacity 0.2s';
      
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.2)';
        el.style.opacity = '1';
      });
      
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        el.style.opacity = '0.85';
      });

      // Create popup content
      const popupContent = `
        <div style="padding: 8px; min-width: 180px;">
          <h3 style="font-weight: bold; font-size: 14px; margin-bottom: 6px; color: #1f2937;">${dest.destination}</h3>
          <p style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">${dest.region || 'Région inconnue'}</p>
          <div style="border-top: 1px solid #e5e7eb; padding-top: 8px;">
            <p style="font-size: 13px; font-weight: 600; color: #f97316; margin-bottom: 4px;">
              ${(dest.tonnage / 1000).toFixed(1)} T
            </p>
            <p style="font-size: 11px; color: #6b7280; margin-bottom: 8px;">${dest.livraisons} livraisons</p>
            ${dest.mandataires.slice(0, 3).map((m, i) => `
              <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
                <span style="color: ${MANDATAIRE_COLORS[mandataires.findIndex(mm => mm.nom === m.nom) % MANDATAIRE_COLORS.length]};">
                  ${m.nom}
                </span>
                <span style="color: #374151; font-weight: 500;">${m.percentage.toFixed(0)}%</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
        .setHTML(popupContent);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([dest.longitude, dest.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Fit bounds if we have destinations
    if (filteredDestinations.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      filteredDestinations.forEach(dest => {
        if (dest.tonnage > 0) {
          bounds.extend([dest.longitude, dest.latitude]);
        }
      });
      
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { padding: 50, maxZoom: 8 });
      }
    }
  }, [destinations, selectedMandataire, mandataires]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Zones de Livraison
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (destinations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Zones de Livraison
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px] text-muted-foreground">
          Aucune donnée de livraison pour cette période
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Zones de Livraison - Côte d'Ivoire
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{(totalStats.tonnage / 1000).toFixed(1)} T</span> · {totalStats.livraisons} livraisons
            </div>
            <Select value={selectedMandataire} onValueChange={setSelectedMandataire}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tous les mandataires" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les mandataires</SelectItem>
                {mandataires.map((m, index) => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: MANDATAIRE_COLORS[index % MANDATAIRE_COLORS.length] }}
                      />
                      {m.nom}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={mapContainer} className="h-[400px] w-full rounded-b-lg" />
      </CardContent>
      
      {/* Legend */}
      <div className="p-4 border-t">
        <h4 className="text-sm font-medium mb-2">Top destinations</h4>
        <div className="flex flex-wrap gap-3">
          {destinations.slice(0, 5).map((dest, index) => (
            <div key={dest.destination} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ 
                  backgroundColor: selectedMandataire === 'all' 
                    ? MANDATAIRE_COLORS[mandataires.findIndex(m => m.nom === dest.mandataires[0]?.nom) % MANDATAIRE_COLORS.length]
                    : MANDATAIRE_COLORS[mandataires.findIndex(m => m.id === selectedMandataire) % MANDATAIRE_COLORS.length]
                }}
              />
              <span className="font-medium">{dest.destination}</span>
              <span className="text-muted-foreground">({(dest.tonnage / 1000).toFixed(1)}T)</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default CoteDIvoireMap;
