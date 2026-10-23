import { Card, CardHeader, CardTitle } from '@/components/ui/card'
export default function CoursePage(): React.JSX.Element {
  return (
    <section className="page">
      <h1 className="page-heading">Course</h1>
      <Card className="page-card">
        <CardHeader>
          <CardTitle>Course administration</CardTitle>
        </CardHeader>
      </Card>
    </section>
  )
}
