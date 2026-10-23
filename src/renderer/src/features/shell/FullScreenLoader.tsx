import BlurText from '../visuals/BlurText'

export default function FullScreenLoader({ message }: { message: string }): React.JSX.Element {
  return (
    <div className="screen-loading-overlay" role="status" aria-live="polite" aria-label={message}>
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
