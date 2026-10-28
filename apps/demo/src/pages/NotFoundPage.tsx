import { Link } from 'react-router-dom'
import { ArrowIcon } from '../components/Icons'

export function NotFoundPage() {
  return (
    <section className="not-found">
      <div className="hero-wash" aria-hidden="true" />
      <div className="grid-wash" aria-hidden="true" />
      <div className="shell not-found__inner">
        <span className="eyebrow">404</span>
        <h1>This route never made it to a worker.</h1>
        <p>
          The page you asked for does not exist. The docs, playground, and examples are all still
          running.
        </p>
        <div className="not-found__actions">
          <Link className="button button--primary" to="/docs">
            Browse the docs
            <ArrowIcon width={16} height={16} />
          </Link>
          <Link className="button" to="/">
            Back home
          </Link>
        </div>
      </div>
    </section>
  )
}
