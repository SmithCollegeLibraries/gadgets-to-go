import { create } from 'zustand';

const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

const defaultLayoutEntries = (defaults = {}, appName = 'Library Equipment') => [
  { name: 'libraryName', text: defaults.libraryName || '' },
  { name: 'headerText', text: defaults.headerText || appName },
  { name: 'footerText', text: defaults.footerText || '' },
  { name: 'headerTextSize', text: defaults.headerTextSize || '3' },
  { name: 'useLogo', text: defaults.useLogo || 'false' },
  { name: 'logoUrl', text: defaults.logoUrl || '' },
  { name: 'logoAlt', text: defaults.logoAlt || '' },
  { name: 'logoHeight', text: defaults.logoHeight || '80' },
];

const getInstitution = (institutions, slug) => (
  institutions.find((institution) => institution.slug === slug)
);


const useSchoolStore = create((set, get) => ({
  layoutData: [],
  colorData: [],
  inventoryData: [],
  appConfig: { appName: 'Library Equipment', institutions: [], authProviders: [] },
  configLoaded: false,
  cache: {},
  baseUrl,
  isLoading: false,
  isLayoutLoading: false,
  isInventoryLoading: false,

  loadConfig: async () => {
    const { configLoaded } = get();
    if (configLoaded) return get().appConfig;

    const response = await fetch(`${baseUrl}/config`);
    if (!response.ok) {
      throw new Error(`Config request failed with ${response.status}`);
    }

    const appConfig = await response.json();
    set({ appConfig, configLoaded: true });
    return appConfig;
  },

  getInstitutionBySlug: (slug) => getInstitution(get().appConfig.institutions, slug),

  getInstitutionByCode: (code) => (
    get().appConfig.institutions.find((institution) => institution.code === code)
  ),

  fetchLayoutData: async (school, updateActiveState = true) => {
    const { cache } = get();
    // Check if valid data exists in cache
    if (cache[school]?.layoutData && cache[school]?.colorData) {
      if (updateActiveState) {
        set({
          layoutData: cache[school].layoutData,
          colorData: cache[school].colorData,
          isLayoutLoading: false,
        });
      }
      return;
    }

    try {
      if (updateActiveState) {
        set({ isLoading: true, isLayoutLoading: true });
      }
      const appConfig = await get().loadConfig();
      const institution = getInstitution(appConfig.institutions, school);
      if (!institution) {
        throw new Error(`Unknown institution: ${school}`);
      }
      const code = institution.code;
      const layoutResponse = await fetch(`${baseUrl}/label?location=${code}`);
      const layoutJson = await layoutResponse.json();

      const defaultLayoutData = defaultLayoutEntries(institution.defaults, appConfig.appName);

      // Create a map to merge defaults with backend data
      const layoutMap = new Map(defaultLayoutData.map(item => [item.name, item]));
      
      if (Array.isArray(layoutJson)) {
        layoutJson.forEach(item => {
          layoutMap.set(item.name, item); 
        });
      }

      const mergedLayoutData = Array.from(layoutMap.values());

      const colorResponse = await fetch(`${baseUrl}/styling/get-data?location=${code}`);
      const colorJson = await colorResponse.json();

      set((state) => {
        const updates = {
          cache: {
            ...state.cache,
            [school]: {
              ...state.cache[school],
              layoutData: mergedLayoutData,
              colorData: colorJson
            }
          }
        };

        if (updateActiveState) {
          updates.layoutData = mergedLayoutData;
          updates.colorData = colorJson;
          updates.isLoading = false;
          updates.isLayoutLoading = false;
        }

        return updates;
      });
    } catch (error) {
      console.error('Error fetching layout data:', error);
      if (updateActiveState) {
        set({ isLoading: false, isLayoutLoading: false });
      }
    }
  },
  fetchInventoryData: async (school) => {
    const { cache } = get();
    if (cache[school]?.inventoryData) {
      set({
        inventoryData: cache[school].inventoryData,
        isInventoryLoading: false,
      });
      return;
    }

    try {
      set({ isLoading: true, isInventoryLoading: true });
      const appConfig = await get().loadConfig();
      const institution = getInstitution(appConfig.institutions, school.toLowerCase());
      if (!institution) {
        throw new Error(`Unknown institution: ${school}`);
      }
      const code = institution.code;
      const response = await fetch(`${baseUrl}/inventory/location-data?owner=${code}`);
      const json = await response.json();
      set((state) => ({
        inventoryData: json || [],
        isLoading: false,
        isInventoryLoading: false,
        cache: {
          ...state.cache,
          [school]: {
            ...state.cache[school],
            inventoryData: json
          }
        }
      }));
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      set({ isLoading: false, isInventoryLoading: false });
    }
  },
  setLocalStyles: (styles) => set({ localStyles: styles }),
  setLocalLayoutData: (layoutData) => set({ localLayoutData: layoutData }),
  setLocalInventoryData: (inventoryData) => set({ localInventoryData: inventoryData }),
}));

export default useSchoolStore;
