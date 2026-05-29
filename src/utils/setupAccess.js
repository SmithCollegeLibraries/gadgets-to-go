export const isSetupConfigEnabled = (env = import.meta.env) => (
  env.VITE_ENABLE_SETUP_CONFIG === 'true'
);
