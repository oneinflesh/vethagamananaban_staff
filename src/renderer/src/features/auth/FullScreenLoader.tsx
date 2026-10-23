import BlurText from './BlurText'

export default function FullScreenLoader(): React.JSX.Element {
  return (
    <div className="login-loading-overlay" role="status" aria-live="polite" aria-label="Signing in">
      <div className="login-loading-content">
        <span className="login-loading-spinner" aria-hidden="true" />
        <BlurText
          text="Signing you in"
          trigger="load"
          animateBy="words"
          delay={140}
          className="login-loading-text"
        />
      </div>
    </div>
  )
}
