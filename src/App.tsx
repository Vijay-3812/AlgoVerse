import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { RouteTransition } from '@/components/layout/RouteTransition';
import { VisualizerSkeleton } from '@/components/primitives/Skeleton';

/**
 * Routes.
 *
 * Every page is a `lazy()` chunk, and the category page is reachable by URL
 * alone (`/algorithms/:categoryId`), so deep links, the sidebar and the command
 * palette all resolve to the same tree. The landing page stays eagerly imported
 * because it is the first paint.
 */
const LandingPage = lazy(() => import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const CategoryPage = lazy(() => import('@/pages/CategoryPage').then((m) => ({ default: m.CategoryPage })));
const VisualizerPage = lazy(() =>
  import('@/pages/VisualizerPage').then((m) => ({ default: m.VisualizerPage })),
);
const ComparePage = lazy(() => import('@/pages/ComparePage').then((m) => ({ default: m.ComparePage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

function PageFallback() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <VisualizerSkeleton label="Loading AlgoVerse…" />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route
          element={
            <Suspense fallback={<PageFallback />}>
              <RouteTransition />
            </Suspense>
          }
        >
          <Route path="/" element={<LandingPage />} />
          <Route path="/algorithms/:categoryId" element={<CategoryPage />} />
          <Route path="/algorithms/:categoryId/:algorithmId" element={<VisualizerPage />} />
          <Route path="/compare/:leftId/:rightId" element={<ComparePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
