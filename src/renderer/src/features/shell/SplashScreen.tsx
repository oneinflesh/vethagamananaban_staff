import OrangeBackground from '../visuals/OrangeBackground'
import BlurText from '../visuals/BlurText'

export default function SplashScreen(): React.JSX.Element {
  return (
    <main className="splash-screen" role="status" aria-label="Loading application">
      <OrangeBackground />
      <div className="splash-content">
        <span className="login-loading-spinner" aria-hidden="true" />
        <BlurText
          text="வணக்கம் வேதாகம நண்பன்"
          trigger="load"
          animateBy="words"
          delay={180}
          className="splash-title"
        />
        <p className="splash-caption">Loading workspace…</p>
      </div>
    </main>
  )
}
