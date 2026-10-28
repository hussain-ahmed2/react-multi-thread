import { Link } from 'react-router-dom'
import { CodeBlock } from '../../components/CodeBlock'
import { Callout } from '../components/Callout'
import { DocPage, DocSection } from '../components/DocPage'
import {
  frameworkDeployments,
  platforms,
  supportClasses,
  supportLabels,
  supportShortLabels,
  type FrameworkDeployment,
  type Recipe,
} from './deployment-recipes'

function RecipeBlock({
  framework,
  recipe,
  index,
}: {
  readonly framework: FrameworkDeployment
  readonly recipe: Recipe
  readonly index: number
}) {
  const platform = platforms[index]

  if (platform === undefined) return null

  return (
    <div className={`recipe${recipe.support === 'unsupported' ? ' recipe--unsupported' : ''}`}>
      <div className="recipe__head">
        <h3 id={`${framework.id}-${platform.key}`}>{recipe.platform}</h3>
        <span className={supportClasses[recipe.support]}>{supportLabels[recipe.support]}</span>
      </div>
      <p>{recipe.summary}</p>
      {recipe.files.map((file) => (
        <CodeBlock key={`${framework.id}-${platform.key}-${file.title}`} code={file.code} title={file.title} />
      ))}
    </div>
  )
}

export function DeploymentRecipesPage() {
  return (
    <DocPage
      eyebrow="Deployment"
      title="Framework deployment recipes"
      lede="Every supported framework and platform pairing, with the exact adapter, build output, headers, and routing rule. Unsupported combinations are marked instead of hidden."
    >
      <Callout tone="warning" title="The rule that prevents most broken deploys">
        <p>
          Add a catch-all rewrite to <code>index.html</code> only when the app is intentionally
          client-rendered. Next.js, Waku, RedwoodSDK, TanStack Start in server mode, and React Router
          in framework mode must keep their server output. In a static export, Next.js{' '}
          <code>headers()</code> and rewrites are ignored, so isolation headers must move to the
          host.
        </p>
      </Callout>

      <p>
        Most requested combination: <a href="#nextjs-netlify">Next.js on Netlify</a>. The matrix
        below links every framework and platform pairing.
      </p>

      <DocSection id="matrix" title="Compatibility matrix">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Framework</th>
                {platforms.map((platform) => (
                  <th key={platform.key}>{platform.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {frameworkDeployments.map((framework) => (
                <tr key={framework.id}>
                  <td>
                    <a href={`#${framework.id}`}>{framework.name}</a>
                  </td>
                  {platforms.map((platform) => {
                    const level = framework.support[platform.key]

                    return (
                      <td key={platform.key}>
                        <a href={`#${framework.id}-${platform.key}`}>
                          <span className={supportClasses[level]}>{supportShortLabels[level]}</span>
                        </a>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          <strong>Native server</strong> means the platform runs the framework directly.{' '}
          <strong>Server adapter</strong> means the framework needs a platform plugin or preset.{' '}
          <strong>Static</strong> means a file upload, with no server runtime.{' '}
          <strong>Static SPA</strong> needs a fallback file for deep links. <strong>Not supported</strong>{' '}
          means the runtime contract does not fit without replacing the framework.
        </p>
      </DocSection>

      <DocSection id="parity" title="Development and production parity">
        <ol>
          <li>
            Define COOP and COEP in the framework dev server, then repeat them in host configuration.
            Vite uses <code>server.headers</code> and <code>preview.headers</code>; Astro uses{' '}
            <code>server.headers</code>; Next.js uses <code>headers()</code>.
          </li>
          <li>
            A static export drops framework-managed headers. Audit the production response, not only
            the local page, and confirm <code>crossOriginIsolated === true</code>.
          </li>
          <li>
            Set the base path in the bundler and the router. For GitHub project pages, use{' '}
            <code>/repository-name/</code>, not <code>/</code>.
          </li>
          <li>
            Test the production build locally with <code>pnpm preview</code> or{' '}
            <code>wrangler dev</code> before deploying. A dev-only pass does not prove isolation,
            base paths, or deep links.
          </li>
          <li>
            Verify a deep link and a hard refresh. SPA hosts need a rewrite or <code>404.html</code>;
            server frameworks need their own route handler.
          </li>
        </ol>
        <Callout tone="note" title="Shared memory is optional">
          <p>
            If the app does not call <code>useSharedAtom</code> or <code>createSharedAtom</code>,
            skip COOP and COEP. They block third-party resources that do not opt in with CORS or
            CORP, and they cannot be enabled on GitHub Pages.
          </p>
        </Callout>
      </DocSection>

      {frameworkDeployments.map((framework) => (
        <DocSection key={framework.id} id={framework.id} title={framework.name} lede={framework.summary}>
          {framework.recipes.map((recipe, index) => (
            <RecipeBlock
              key={`${framework.id}-${recipe.platform}`}
              framework={framework}
              recipe={recipe}
              index={index}
            />
          ))}
        </DocSection>
      ))}

      <DocSection id="host-guides" title="Host-specific references">
        <p>
          The platform guides cover response headers, caching, and verification in more depth.
        </p>
        <ul>
          <li>
            <Link to="/docs/deployment/vercel">Vercel: vercel.json and framework presets</Link>
          </li>
          <li>
            <Link to="/docs/deployment/netlify">Netlify: netlify.toml and the Next.js adapter</Link>
          </li>
          <li>
            <Link to="/docs/deployment/cloudflare-pages">Cloudflare: Pages, Workers, and Wrangler</Link>
          </li>
          <li>
            <Link to="/docs/deployment/github-pages">GitHub Pages: base paths and static limits</Link>
          </li>
        </ul>
      </DocSection>

      <div className="doc-next">
        <Link className="button button--primary" to="/docs/deployment/netlify">
          Netlify setup
        </Link>
        <Link className="button" to="/docs/troubleshooting">
          Troubleshooting
        </Link>
      </div>
    </DocPage>
  )
}
