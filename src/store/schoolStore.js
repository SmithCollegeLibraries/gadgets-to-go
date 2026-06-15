import { create } from 'zustand';

const baseUrl = 'https://libtools2.smith.edu/gadgets-to-go/backend/web/api';


const schoolCodeMapping = {
  amherst: 'AMH',
  hampshire: 'HMC',
  mtholyoke: 'MHC',
  smith: 'SMC',
  umass: 'UMA'
};

const schoolDefaults = {
  amh: {
    libraryName: 'Amherst College',
    headerText: 'Amherst Gadgets-to-Go',
    footerText: ''
  },
  hmc: {
    libraryName: 'Hampshire College',
    headerText: 'Hampshire Gadgets-to-Go',
    footerText: ''
  },
  mhc: {
    libraryName: 'Mount Holyoke College',
    headerText: 'Mount Holyoke Gadgets-to-Go',
    footerText: ''
  },
  smc: {
    libraryName: 'Smith College',
    headerText: 'Gadgets-To-Go',
    footerText: ''
  },
  uma: {
    libraryName: 'University of Massachusetts',
    headerText: 'UMass Gadgets-to-Go',
    footerText: ''
  },
};


const useSchoolStore = create((set, get) => ({
  layoutData: [],
  colorData: [],
  inventoryData: [],
  cache: {},
  baseUrl,
  isLoading: false,
  isLayoutLoading: false,
  isInventoryLoading: false,

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
      const code = schoolCodeMapping[school];
      const layoutResponse = await fetch(`${baseUrl}/label?location=${code}`);
      const layoutJson = await layoutResponse.json();

      const schoolDefaultData = schoolDefaults[code.toLowerCase()];
      const defaultLayoutData = [
        { name: 'libraryName', text: schoolDefaultData.libraryName },
        { name: 'headerText', text: schoolDefaultData.headerText },
        { name: 'footerText', text: schoolDefaultData.footerText },
        { name: 'headerTextSize', text: '3' },
        { name: 'useLogo', text: 'false' },
        { name: 'logoUrl', text: '' },
        { name: 'logoAlt', text: '' },
        { name: 'logoHeight', text: '80' },
      ];

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
      const code = schoolCodeMapping[school.toLowerCase()];
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
