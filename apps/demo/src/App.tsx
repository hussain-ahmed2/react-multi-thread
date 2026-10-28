import { Route, Routes } from 'react-router-dom'
import { ApiReferencePage } from './docs/ApiReferencePage'
import { ConceptsPage } from './docs/ConceptsPage'
import { DocsIndexPage } from './docs/DocsIndexPage'
import { DocsLayout } from './docs/DocsLayout'
import { GettingStartedPage } from './docs/GettingStartedPage'
import { TroubleshootingPage } from './docs/TroubleshootingPage'
import { AstroPage } from './docs/frameworks/AstroPage'
import { GatsbyPage } from './docs/frameworks/GatsbyPage'
import { NextJsPage } from './docs/frameworks/NextJsPage'
import { ReactRouterPage } from './docs/frameworks/ReactRouterPage'
import { RedwoodSdkPage } from './docs/frameworks/RedwoodSdkPage'
import { TanStackStartPage } from './docs/frameworks/TanStackStartPage'
import { VitePage } from './docs/frameworks/VitePage'
import { WakuPage } from './docs/frameworks/WakuPage'
import { CloudflarePagesPage } from './docs/deployment/CloudflarePagesPage'
import { DeploymentOverviewPage } from './docs/deployment/DeploymentOverviewPage'
import { DeploymentRecipesPage } from './docs/deployment/DeploymentRecipesPage'
import { GithubPagesPage } from './docs/deployment/GithubPagesPage'
import { NetlifyPage } from './docs/deployment/NetlifyPage'
import { VercelPage } from './docs/deployment/VercelPage'
import { ExamplesPage } from './pages/ExamplesPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PlaygroundPage } from './pages/PlaygroundPage'
import { SiteLayout } from './site/SiteLayout'

export function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="playground" element={<PlaygroundPage />} />
        <Route path="examples" element={<ExamplesPage />} />

        <Route path="docs" element={<DocsLayout />}>
          <Route index element={<DocsIndexPage />} />
          <Route path="getting-started" element={<GettingStartedPage />} />
          <Route path="concepts" element={<ConceptsPage />} />
          <Route path="api" element={<ApiReferencePage />} />
          <Route path="frameworks/vite" element={<VitePage />} />
          <Route path="frameworks/nextjs" element={<NextJsPage />} />
          <Route path="frameworks/react-router" element={<ReactRouterPage />} />
          <Route path="frameworks/astro" element={<AstroPage />} />
          <Route path="frameworks/tanstack-start" element={<TanStackStartPage />} />
          <Route path="frameworks/waku" element={<WakuPage />} />
          <Route path="frameworks/redwood-sdk" element={<RedwoodSdkPage />} />
          <Route path="frameworks/gatsby" element={<GatsbyPage />} />
          <Route path="deployment" element={<DeploymentOverviewPage />} />
          <Route path="deployment/vercel" element={<VercelPage />} />
          <Route path="deployment/netlify" element={<NetlifyPage />} />
          <Route path="deployment/cloudflare-pages" element={<CloudflarePagesPage />} />
          <Route path="deployment/github-pages" element={<GithubPagesPage />} />
          <Route path="deployment/recipes" element={<DeploymentRecipesPage />} />
          <Route path="troubleshooting" element={<TroubleshootingPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
