import OrangeBackground from '../visuals/OrangeBackground'
import BlurText from '../visuals/BlurText'
import LoadingProgress from './LoadingProgress'

export default function SplashScreen({
  complete = false
}: {
  complete?: boolean
}): React.JSX.Element {
  return (
    <main className="splash-screen" role="status" aria-label="Loading application">
      <OrangeBackground />
      <div className="splash-content">
        <span className="screen-loading-spinner" aria-hidden="true" />
        <BlurText
          text="வணக்கம் வேதாகம நண்பன்"
          trigger="load"
          animateBy="words"
          delay={180}
          className="splash-title"
        />
        <p className="splash-caption">Loading workspace…</p>
        <LoadingProgress complete={complete} durationMs={5000} />
      </div>
    </main>
  )
}
