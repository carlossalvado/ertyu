import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: ['lucide-react'],
          // Large components - use proper imports
          dashboard: [
            './src/pages/DashboardPage.tsx',
            './src/components/Dashboard/Stats.tsx',
            './src/components/Dashboard/Calendar.tsx',
            './src/components/Dashboard/Charts.tsx',
            './src/components/Dashboard/DayAppointments.tsx',
            './src/components/Dashboard/AppointmentSearch.tsx'
          ],
          appointments: [
            './src/components/Appointments/AppointmentForm.tsx',
            './src/components/Appointments/AppointmentsList.tsx',
            './src/components/Appointments/DatePicker.tsx',
            './src/components/Appointments/ProfessionalAppointmentForm.tsx',
            './src/components/Appointments/TimeSlotPicker.tsx'
          ],
          settings: [
            './src/pages/SettingsPage.tsx',
            './src/components/Settings/CustomersManager.tsx',
            './src/components/Settings/PackagesManager.tsx',
            './src/components/Settings/ProfessionalCustomersManager.tsx',
            './src/components/Settings/ProfessionalsManager.tsx',
            './src/components/Settings/ServicesManager.tsx'
          ],
        },
      },
    },
    chunkSizeWarningLimit: 600, // Increase limit slightly
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
});
