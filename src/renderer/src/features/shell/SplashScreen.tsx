import Aurora from '../visuals/Aurora'
import BlurText from '../visuals/BlurText'

export default function SplashScreen(): React.JSX.Element {
  return (
    <main className="splash-screen" role="status" aria-label="Loading application">
      <div className="splash-aurora" aria-hidden="true">
        <Aurora
          colorStops={['#5b6ee1', '#8b5cf6', '#2f80ed']}
          lightMode
          mouseInteraction={false}
          speed={0.35}
          amplitude={0.5}
          glow={0.35}
        />
      </div>
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
