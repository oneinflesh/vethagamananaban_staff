import { Card, CardHeader, Title2, Body1 } from '@fluentui/react-components'
export default function StorePage(): React.JSX.Element {
  return <section className="page"><Title2>Book Store</Title2><Card className="page-card"><CardHeader header={<Body1>Book Store administration</Body1>}/></Card></section>
}
