import { Card, CardHeader, Title2, Body1 } from '@fluentui/react-components'
export default function DashboardPage(): React.JSX.Element {
  return <section className="page"><Title2>Dashboard</Title2><Card className="page-card"><CardHeader header={<Body1>Office administration</Body1>}/></Card></section>
}
