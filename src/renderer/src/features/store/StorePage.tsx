import { Card, CardHeader, CardTitle } from '@/components/ui/card'
export default function StorePage(): React.JSX.Element {
  return (
    <section className="page">
      <h1 className="page-heading">Book Store</h1>
      <Card className="page-card">
        <CardHeader>
          <CardTitle>Book Store administration</CardTitle>
        </CardHeader>
      </Card>
    </section>
  )
}
