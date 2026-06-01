import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";

const HomePage = lazy(() => import("./pages/HomePage"));
const ProjectPage = lazy(() => import("./pages/ProjectPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const NewProjectPage = lazy(() => import("./pages/NewProjectPage"));
const UniversesPage = lazy(() => import("./pages/UniversesPage"));
const UniverseDetailPage = lazy(() => import("./pages/UniverseDetailPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <span className="loading loading-spinner loading-lg" />
      <span className="ml-3 text-muted-foreground">加载中...</span>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/project/new" element={<NewProjectPage />} />
            <Route path="/project/:id" element={<ProjectPage />} />
            <Route path="/projects/:id" element={<ProjectPage />} />
            <Route path="/universes" element={<UniversesPage />} />
            <Route path="/universes/:universeId" element={<UniverseDetailPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
