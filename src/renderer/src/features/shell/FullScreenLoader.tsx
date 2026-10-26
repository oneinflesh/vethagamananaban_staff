import BlurText from '../visuals/BlurText'

export default function FullScreenLoader({
  message,
  leaving = false
}: {
  message: string
  leaving?: boolean
}): React.JSX.Element {
  return (
    <div
      className={`screen-loading-overlay${leaving ? ' screen-loading-overlay--leaving' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="screen-loading-content">
        <span className="screen-loading-spinner" aria-hidden="true" />
        <BlurText
          text={message}
          trigger="load"
          animateBy="words"
          delay={140}
          className="screen-loading-text"
        />
      </div>
    </div>
  )
}
