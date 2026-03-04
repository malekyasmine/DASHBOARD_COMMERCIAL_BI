import { defineConfig } from 'vite';

export default defineConfig({
  // Remplacez 'dashboard' par le nom exact de votre repo GitHub
  // Ex: si votre repo s'appelle "mon-dashboard" → base: '/mon-dashboard/'
  // En local (npm run dev), Vite ignore cette valeur automatiquement.
  base: process.env.GITHUB_REPOSITORY
    ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
    : '/',
});
