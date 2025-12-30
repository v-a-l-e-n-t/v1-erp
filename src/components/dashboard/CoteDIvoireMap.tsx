import { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Map as MapIcon, Users, Building2, Package, MapPin, Truck, X } from 'lucide-react';
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
  b11_carbu: 12.5
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
  const [allVentesData, setAllVentesData] = useState<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [topN, setTopN] = useState(10);
  const [selectedDestination, setSelectedDestination] = useState<DestinationData | null>(null);

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

        // Batch fetching itératif pour éviter de créer trop de promesses
        const BATCH_SIZE = 1000;
        const allVentes: any[] = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('ventes_mandataires')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate)
            .range(offset, offset + BATCH_SIZE - 1)
            .order('date', { ascending: false });

          if (error) {
            console.error('Batch error:', error);
            break;
          }

          if (data && data.length > 0) {
            allVentes.push(...data);
            // Si on a récupéré moins que BATCH_SIZE, on a tout récupéré
            hasMore = data.length === BATCH_SIZE;
            offset += BATCH_SIZE;
          } else {
            hasMore = false;
          }
        }

        const ventes = allVentes;

        // Fetch geolocation data
        const { data: geoData } = await supabase
          .from('destinations_geolocation')
          .select('*');

        if (!geoData) {
          setDestinations([]);
          setLoading(false);
          return;
        }

        // Stocker toutes les ventes pour calculer les stats totales
        setAllVentesData(ventes || []);

        // Si pas de ventes, on affiche quand même (tableau vide)
        if (!ventes || ventes.length === 0) {
          setDestinations([]);
          setTotalStats({ tonnage: 0, livraisons: 0 });
          setLoading(false);
          return;
        }

        // Create a map of destination names to geo data (case insensitive)
        const geoMap = new Map<string, any>();
        geoData.forEach(geo => {
          geoMap.set(geo.destination.toUpperCase(), geo);
        });

        // Group ventes by destination (only those with geolocation)
        const destinationMap = new Map<string, {
          ventes: any[];
          geo: any;
        }>();

        // Track excluded ventes for debugging
        const excludedVentes: string[] = [];
        let totalVentesTonnage = 0;
        let totalVentesCount = 0;

        ventes.forEach(vente => {
          if (!vente.destination) {
            excludedVentes.push(`No destination`);
            return;
          }
          
          const destKey = vente.destination.toUpperCase();
          const geo = geoMap.get(destKey);
          
          if (!geo) {
            excludedVentes.push(`No geo: ${vente.destination}`);
            return;
          }
          
          if (!destinationMap.has(destKey)) {
            destinationMap.set(destKey, { ventes: [], geo });
          }
          destinationMap.get(destKey)!.ventes.push(vente);
          totalVentesTonnage += calculateTonnage(vente);
          totalVentesCount++;
        });

        // Log excluded ventes for debugging
        if (excludedVentes.length > 0) {
          console.log('CARTE: Ventes exclues (sans géolocalisation):', excludedVentes.length, excludedVentes.slice(0, 10));
        }

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
        
        // Calculer les stats totales à partir de TOUTES les ventes (pas seulement celles avec géolocalisation)
        // C'est la même logique que dans VentesParMandataireTable
        let totalAllTonnage = 0;
        let totalAllLivraisons = ventes.length;
        const allDestinationsSet = new Set<string>();
        
        ventes.forEach(vente => {
          if (vente.destination) {
            allDestinationsSet.add(vente.destination.toUpperCase());
          }
          totalAllTonnage += calculateTonnage(vente);
        });
        
        // Log for debugging
        console.log('CARTE Stats:', {
          totalVentes: ventes.length,
          totalVentesTonnage: totalAllTonnage,
          totalDestinations: allDestinationsSet.size,
          includedVentes: totalVentesCount,
          includedTonnage: totalTonnage,
          excludedCount: excludedVentes.length,
          destinationsCount: processedDestinations.length,
          excludedDestinations: excludedVentes.slice(0, 20)
        });
        
        setDestinations(processedDestinations);
        // Utiliser les stats de TOUTES les ventes, pas seulement celles avec géolocalisation
        setTotalStats({ tonnage: totalAllTonnage, livraisons: totalAllLivraisons });
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
          
          // Désactiver complètement les popups par défaut de Mapbox
          // Intercepter tous les clics pour empêcher les popups
          map.current.on('click', (e) => {
            // Supprimer tous les popups existants
            const popups = document.querySelectorAll('.mapboxgl-popup');
            popups.forEach(popup => popup.remove());
          });
          
          // Observer les changements du DOM pour supprimer automatiquement les popups
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              mutation.addedNodes.forEach((node) => {
                if (node instanceof HTMLElement && node.classList.contains('mapboxgl-popup')) {
                  node.remove();
                }
                // Vérifier aussi les enfants
                if (node instanceof HTMLElement) {
                  const popups = node.querySelectorAll('.mapboxgl-popup');
                  popups.forEach(popup => popup.remove());
                }
              });
            });
          });
          
          if (mapContainer.current) {
            observer.observe(mapContainer.current, { childList: true, subtree: true });
          }
          
          // Stocker l'observer pour le nettoyer plus tard
          (map.current as any)._popupObserver = observer;
          
          // Add Ivory Coast boundary layer with orange color
          if (map.current) {
            // Add source for country boundaries from Mapbox tileset
            map.current.addSource('ivory-coast-boundary', {
              type: 'vector',
              url: 'mapbox://mapbox.country-boundaries-v1'
            });

            // Add border line layer only (no fill)
            // Add border line layer
            map.current.addLayer({
              id: 'ivory-coast-border',
              type: 'line',
              source: 'ivory-coast-boundary',
              'source-layer': 'country_boundaries',
              filter: ['==', ['get', 'iso_3166_1'], 'CI'],
              paint: {
                'line-color': '#f97316',
                'line-width': 3,
                'line-opacity': 0.9
              }
            });
          }
          
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
      // Nettoyer l'observer de popup
      if (map.current && (map.current as any)._popupObserver) {
        (map.current as any)._popupObserver.disconnect();
      }
      // Supprimer tous les popups avant de détruire la carte
      const popups = document.querySelectorAll('.mapboxgl-popup');
      popups.forEach(popup => popup.remove());
      map.current?.remove();
      map.current = null;
      setMapLoaded(false);
    };
  }, [mapboxToken, destinations.length]);

  // Update map visualization when data or filters change
  useEffect(() => {
    if (!map.current || destinations.length === 0 || !mapLoaded) return;

    // Remove existing layers and sources
    const layersToRemove = ['region-fill', 'region-outline', 'destination-circles', 'destination-labels'];
    layersToRemove.forEach(layerId => {
      if (map.current?.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
    });
    
    const sourcesToRemove = ['destinations', 'regions'];
    sourcesToRemove.forEach(sourceId => {
      if (map.current?.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
    });

    // Aggregate data by region
    const regionStats = new Map<string, { tonnage: number; livraisons: number; destinations: string[] }>();
    
    destinations.forEach(dest => {
      let tonnage = dest.tonnage;
      
      // Apply filter
      if (viewMode === 'mandataire' && selectedMandataire !== 'all') {
        const mandataireData = dest.mandataires.find(m => m.id === selectedMandataire);
        tonnage = mandataireData?.tonnage || 0;
      } else if (viewMode === 'client' && selectedClient !== 'all') {
        const clientData = dest.clients.find(c => c.nom.toUpperCase() === selectedClient.toUpperCase());
        tonnage = clientData?.tonnage || 0;
      }
      
      if (tonnage > 0) {
        const regionName = dest.region || 'Autres';
        const existing = regionStats.get(regionName) || { tonnage: 0, livraisons: 0, destinations: [] };
        existing.tonnage += tonnage;
        existing.livraisons += dest.livraisons;
        existing.destinations.push(dest.destination);
        regionStats.set(regionName, existing);
      }
    });

    // Calculate max tonnage for scaling
    const maxTonnage = Math.max(...Array.from(regionStats.values()).map(r => r.tonnage), 1);

    // Create features for destination circles
    const features = destinations.map(dest => {
      let filteredTonnage = dest.tonnage;
      let color = '#f97316';

      if (viewMode === 'mandataire') {
        if (selectedMandataire !== 'all') {
          const mandataireData = dest.mandataires.find(m => m.id === selectedMandataire);
          filteredTonnage = mandataireData?.tonnage || 0;
          color = getMandataireColor(selectedMandataire);
        } else if (dest.mandataires.length > 0) {
          // Use the top mandataire's color
          const topMandataire = dest.mandataires.sort((a, b) => b.tonnage - a.tonnage)[0];
          color = getMandataireColor(topMandataire.id);
        }
      } else {
        if (selectedClient !== 'all') {
          const clientData = dest.clients.find(c => c.nom.toUpperCase() === selectedClient.toUpperCase());
          filteredTonnage = clientData?.tonnage || 0;
          color = CLIENT_COLORS[selectedClient] || '#f97316';
        } else if (dest.clients.length > 0) {
          const topClient = dest.clients.sort((a, b) => b.tonnage - a.tonnage)[0];
          color = CLIENT_COLORS[topClient.nom] || '#f97316';
        }
      }

      return {
        type: 'Feature' as const,
        properties: {
          tonnage: filteredTonnage,
          destination: dest.destination,
          region: dest.region || 'Autres',
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

    // Add source for destinations
    map.current.addSource('destinations', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features
      }
    });

    const maxFeatureTonnage = Math.max(...features.map(f => f.properties.tonnage), 1);

    // Add circle layer for destinations (proportional symbols)
    map.current.addLayer({
      id: 'destination-circles',
      type: 'circle',
      source: 'destinations',
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['get', 'tonnage'],
          0, 6,
          maxFeatureTonnage * 0.25, 12,
          maxFeatureTonnage * 0.5, 20,
          maxFeatureTonnage, 35
        ],
        'circle-color': ['get', 'color'],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
        'circle-opacity': 0.75
      }
    });

    // Add labels for top destinations
    const topFeatures = [...features]
      .sort((a, b) => b.properties.tonnage - a.properties.tonnage)
      .slice(0, 10);
    
    if (topFeatures.length > 0) {
      // Add labels source if needed
      if (!map.current.getSource('destination-labels-source')) {
        map.current.addSource('destination-labels-source', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: topFeatures
          }
        });
      }

      map.current.addLayer({
        id: 'destination-labels',
        type: 'symbol',
        source: 'destinations',
        layout: {
          'text-field': ['get', 'destination'],
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-size': 10,
          'text-offset': [0, 2],
          'text-anchor': 'top',
          'text-optional': true
        },
        paint: {
          'text-color': '#374151',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5
        },
        filter: ['>=', ['get', 'tonnage'], maxFeatureTonnage * 0.15]
      });
    }

    // Add click handler to show sidebar instead of popup
    const clickHandler = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
      // Empêcher le comportement par défaut et fermer tous les popups existants
      e.preventDefault();
      e.originalEvent?.stopPropagation();
      
      // Fermer tous les popups existants sur la carte
      const popups = document.querySelectorAll('.mapboxgl-popup');
      popups.forEach(popup => popup.remove());
      
      if (!e.features || e.features.length === 0) return;
      
      const feature = e.features[0];
      const props = feature.properties;

      // Trouver la destination complète dans destinations
      const destinationData = destinations.find(d => 
        d.destination.toUpperCase() === props?.destination?.toUpperCase()
      );
      
      if (!destinationData) return;

      // Stocker la destination sélectionnée pour afficher dans la sidebar
      setSelectedDestination(destinationData);
    };

    map.current.on('click', 'destination-circles', clickHandler);

    // Change cursor on hover
    map.current.on('mouseenter', 'destination-circles', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'destination-circles', () => {
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

    return () => {
      if (map.current) {
        map.current.off('click', 'destination-circles', clickHandler);
        // Fermer tous les popups lors du cleanup
        const popups = document.querySelectorAll('.mapboxgl-popup');
        popups.forEach(popup => popup.remove());
      }
    };
  }, [destinations, selectedMandataire, selectedClient, viewMode, mandatairesWithStats, mapLoaded]);

  // Calculate filtered stats from ALL ventes (not just those with geolocation)
  // Same logic as VentesParMandataireTable
  const filteredStats = useMemo(() => {
    // Filter all ventes based on selected filters
    let filteredVentes = allVentesData;
    
    if (viewMode === 'mandataire' && selectedMandataire !== 'all') {
      filteredVentes = filteredVentes.filter(v => v.mandataire_id === selectedMandataire);
    } else if (viewMode === 'client' && selectedClient !== 'all') {
      filteredVentes = filteredVentes.filter(v => v.client?.toUpperCase() === selectedClient.toUpperCase());
    }
    
    // Calculate stats from filtered ventes
    let totalTonnage = 0;
    let totalLivraisons = filteredVentes.length;
    const destinationsSet = new Set<string>();
    const regionsSet = new Set<string>();
    
    filteredVentes.forEach(vente => {
      if (vente.destination) {
        destinationsSet.add(vente.destination.toUpperCase());
      }
      totalTonnage += calculateTonnage(vente);
    });
    
    // Also get regions from destinations that have geolocation
    destinations.forEach(dest => {
      if (dest.region) {
        // Check if this destination appears in filtered ventes
        const hasFilteredVentes = filteredVentes.some(v => 
          v.destination?.toUpperCase() === dest.destination.toUpperCase()
        );
        if (hasFilteredVentes) {
          regionsSet.add(dest.region);
        }
      }
    });
    
    return {
      tonnage: totalTonnage,
      livraisons: totalLivraisons,
      destinationsCount: destinationsSet.size,
      regionsCount: regionsSet.size,
      topDestinations: destinations
        .map(dest => {
          let tonnage = dest.tonnage;
          if (viewMode === 'mandataire' && selectedMandataire !== 'all') {
            const mandataireData = dest.mandataires.find(m => m.id === selectedMandataire);
            tonnage = mandataireData?.tonnage || 0;
          } else if (viewMode === 'client' && selectedClient !== 'all') {
            const clientData = dest.clients.find(c => c.nom.toUpperCase() === selectedClient.toUpperCase());
            tonnage = clientData?.tonnage || 0;
          }
          return { destination: dest.destination, region: dest.region, tonnage };
        })
        .filter(d => d.tonnage > 0)
        .sort((a, b) => b.tonnage - a.tonnage)
        .slice(0, 5)
    };
  }, [allVentesData, destinations, viewMode, selectedMandataire, selectedClient]);

  // Get selected entity info
  const selectedEntityInfo = useMemo(() => {
    if (viewMode === 'mandataire' && selectedMandataire !== 'all') {
      const m = mandatairesWithStats.find(m => m.id === selectedMandataire);
      return m ? { name: m.nom, color: m.color, type: 'Mandataire' } : null;
    } else if (viewMode === 'client' && selectedClient !== 'all') {
      const c = clientsWithStats.find(c => c.id === selectedClient);
      return c ? { name: c.nom, color: c.color, type: 'Client' } : null;
    }
    return null;
  }, [viewMode, selectedMandataire, selectedClient, mandatairesWithStats, clientsWithStats]);

  // Legend items for the current view
  const legendItems = viewMode === 'mandataire' 
    ? mandatairesWithStats.filter(m => m.tonnage > 0)
    : clientsWithStats.filter(c => c.tonnage > 0);

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapIcon className="h-5 w-5 text-orange-500" />
            Carte des Régions de Livraison
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
            <MapIcon className="h-5 w-5 text-orange-500" />
            Carte des Régions de Livraison
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
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          {/* Filtres à gauche */}
          <div className="flex flex-col gap-3">
            {/* Onglets en haut */}
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

            {/* Sélecteurs en bas */}
            <div className="flex items-center gap-2">
              {viewMode === 'mandataire' ? (
                <MandataireCombobox
                  mandataires={mandatairesWithStats}
                  value={selectedMandataire}
                  onValueChange={setSelectedMandataire}
                  topN={topN}
                />
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

          {/* Stats à droite */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Cumul</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {filteredStats.tonnage.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Kg
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Package className="h-5 w-5 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Zones de Livraison</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {filteredStats.destinationsCount}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <MapPin className="h-5 w-5 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Livraisons</p>
                    <p className="text-2xl font-bold text-green-600">
                      {filteredStats.livraisons}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Truck className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="flex h-[500px] w-full">
          {/* Sidebar gauche pour les détails */}
          {selectedDestination && (
            <div className="w-[480px] border-r border-border bg-card/95 backdrop-blur-sm overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                      style={{ 
                        backgroundColor: destinations.find(d => d.destination === selectedDestination.destination) 
                          ? (viewMode === 'mandataire' && selectedMandataire !== 'all'
                              ? getMandataireColor(selectedMandataire)
                              : viewMode === 'client' && selectedClient !== 'all'
                              ? CLIENT_COLORS[selectedClient] || '#f97316'
                              : selectedDestination.mandataires.length > 0
                              ? getMandataireColor(selectedDestination.mandataires.sort((a, b) => b.tonnage - a.tonnage)[0].id)
                              : '#f97316')
                          : '#f97316'
                      }}
                    />
                    <div>
                      <h3 className="font-bold text-lg">{selectedDestination.destination}</h3>
                      <p className="text-sm text-muted-foreground">📍 {selectedDestination.region || 'Région non spécifiée'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDestination(null)}
                    className="p-1 hover:bg-muted rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Stats principales */}
                <div className="grid grid-cols-3 gap-3">
                  <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-orange-600">
                        {(selectedDestination.tonnage / 1000).toFixed(1)} T
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Tonnage</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {selectedDestination.livraisons}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Livraisons</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {selectedDestination.livraisons > 0 
                          ? (selectedDestination.tonnage / selectedDestination.livraisons / 1000).toFixed(2)
                          : '0'} T
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Moyenne/Liv.</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Stats supplémentaires */}
                <div className="grid grid-cols-3 gap-2">
                  <Card className="bg-muted/50">
                    <CardContent className="p-3 text-center">
                      <p className="text-lg font-semibold text-blue-600">{selectedDestination.mandataires.length}</p>
                      <p className="text-xs text-muted-foreground">Mandataires</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-3 text-center">
                      <p className="text-lg font-semibold text-purple-600">{selectedDestination.clients.length}</p>
                      <p className="text-xs text-muted-foreground">Clients</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-3 text-center">
                      <p className="text-lg font-semibold text-yellow-600">
                        {filteredStats.tonnage > 0 
                          ? ((selectedDestination.tonnage / filteredStats.tonnage) * 100).toFixed(1)
                          : '0'}%
                      </p>
                      <p className="text-xs text-muted-foreground">Du total</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Clients - affiché quand on filtre par mandataire */}
                {selectedDestination.clients.length > 0 && viewMode === 'mandataire' && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase">Clients</h4>
                    <div className="space-y-2">
                      {selectedDestination.clients
                        .sort((a, b) => b.tonnage - a.tonnage)
                        .slice(0, 5)
                        .map((c, idx) => (
                          <Card key={c.nom} className="bg-muted/30">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">{idx + 1}.</span>
                                  <span className="text-sm font-medium">{c.nom}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-semibold text-orange-600">
                                    {(c.tonnage / 1000).toFixed(1)} T
                                  </span>
                                  <span className="text-xs text-muted-foreground ml-2">
                                    ({c.percentage.toFixed(1)}%)
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </div>
                )}

                {/* Mandataires - affiché quand on filtre par client OU quand on est en mode mandataire avec "tous les mandataires" */}
                {selectedDestination.mandataires.length > 0 && (viewMode === 'client' || (viewMode === 'mandataire' && selectedMandataire === 'all')) && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase">Mandataires</h4>
                    <div className="space-y-2">
                      {selectedDestination.mandataires
                        .sort((a, b) => b.tonnage - a.tonnage)
                        .slice(0, 5)
                        .map((m, idx) => (
                          <Card key={m.id} className="bg-muted/30">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">{idx + 1}.</span>
                                  <span className="text-sm font-medium">{m.nom}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-semibold text-orange-600">
                                    {(m.tonnage / 1000).toFixed(1)} T
                                  </span>
                                  <span className="text-xs text-muted-foreground ml-2">
                                    ({m.percentage.toFixed(1)}%)
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Carte à droite */}
          <div className={`relative ${selectedDestination ? 'flex-1' : 'w-full'} h-full`}>
            <div
              ref={mapContainer}
              className="absolute inset-0 overflow-hidden"
            />
          
          
            <div className="absolute bottom-1 right-1 bg-orange-500 px-2 py-0.5 rounded text-xs text-white font-medium">
              GazPILOT - Tous droits réservés
            </div>
          </div>
        </div>
      </CardContent>
      
      {/* Legend */}
      <MapLegend
        items={legendItems}
        viewMode={viewMode}
        selectedId={viewMode === 'mandataire' ? selectedMandataire : selectedClient}
        topN={topN}
        onTopNChange={setTopN}
        topNOptions={TOP_N_OPTIONS}
      />
    </Card>
  );
};

export default CoteDIvoireMap;
