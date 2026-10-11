import { Icon } from '../components/ui';
import { PageHead } from '../components/ui';

export default function More({ items }: { items: { path: string; label: string; icon: string }[] }) {
  return (
    <div className="page">
      <PageHead title="עוד" />
      <div className="more-grid">
        {items.map((n) => (
          <a key={n.path} href={'#/' + n.path} className="more-tile">
            <Icon name={n.icon} size={28} />
            <span>{n.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
