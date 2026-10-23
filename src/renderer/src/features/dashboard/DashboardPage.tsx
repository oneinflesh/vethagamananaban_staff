import { Card, CardHeader, CardTitle } from '@/components/ui/card'
export default function DashboardPage(): React.JSX.Element {
  return (
    <section className="page">
      <h1 className="page-heading">Dashboard</h1>
      <Card className="page-card">
        <CardHeader>
          <CardTitle>Office administration</CardTitle>
        </CardHeader>
      </Card>
    </section>
  )
}
