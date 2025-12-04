import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Connexion } from './pages/Connexion';
import { TableauDeBord } from './pages/TableauDeBord';
import { Planning } from './pages/Planning';
import { Heures } from './pages/Heures';
import { Frais } from './pages/Frais';
import { Cloture } from './pages/Cloture';
import { Documents } from './pages/Documents';
import { Audit } from './pages/Audit';
import { Administration } from './pages/Administration';
import { Parametres } from './pages/Parametres';
import { BilanHebdomadaire } from './pages/BilanHebdomadaire';
import { ValidationBilans } from './pages/ValidationBilans';
import { NonAutorise } from './pages/NonAutorise';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/connexion" element={<Connexion />} />
          <Route path="/non-autorise" element={<NonAutorise />} />

          <Route path="/tableau-de-bord" element={
            <ProtectedRoute allowedRoles={['preteuse', 'compta']}>
              <Layout><TableauDeBord /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/planning" element={
            <ProtectedRoute allowedRoles={['salarie', 'accueil', 'preteuse']}>
              <Layout><Planning /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/heures" element={
            <ProtectedRoute allowedRoles={['salarie', 'accueil', 'preteuse', 'compta']}>
              <Layout><Heures /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/frais" element={
            <ProtectedRoute allowedRoles={['salarie', 'accueil', 'preteuse', 'compta']}>
              <Layout><Frais /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/cloture" element={
            <ProtectedRoute allowedRoles={['salarie', 'accueil', 'preteuse']}>
              <Layout><Cloture /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/parametres" element={
            <ProtectedRoute allowedRoles={['salarie', 'accueil']}>
              <Layout><Parametres /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/bilan-hebdomadaire" element={
            <ProtectedRoute allowedRoles={['salarie']}>
              <Layout><BilanHebdomadaire /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/validation-bilans" element={
            <ProtectedRoute allowedRoles={['accueil', 'preteuse']}>
              <Layout><ValidationBilans /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/documents" element={
            <ProtectedRoute allowedRoles={['preteuse', 'compta']}>
              <Layout><Documents /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/audit" element={
            <ProtectedRoute allowedRoles={['preteuse']}>
              <Layout><Audit /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/administration" element={
            <ProtectedRoute allowedRoles={['preteuse']}>
              <Layout><Administration /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/" element={<Navigate to="/connexion" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
