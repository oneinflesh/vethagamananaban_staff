import Noise from './Noise'
import './OrangeBackground.css'

export default function OrangeBackground(): React.JSX.Element {
  return (
    <div className="orange-background" aria-hidden="true">
      <span className="orange-background__glow orange-background__glow--one" />
      <span className="orange-background__glow orange-background__glow--two" />
      <span className="orange-background__ring orange-background__ring--one" />
      <span className="orange-background__ring orange-background__ring--two" />
      <Noise opacity={0.07} fps={18} dust={0} scratches={0} scanlines={0} fixed={false} />
    </div>
  )
}
