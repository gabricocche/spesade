import { Link } from 'react-router-dom';
import type { ShoppingList } from '../lib/api';

interface ListCardProps {
  list: ShoppingList;
}

export function ListCard({ list }: ListCardProps) {
  return (
    <div>
      <span>{list.name}</span>
      <span> — {list.status}</span>
      <Link to={`/walk/${list.id}`}> Apri</Link>
    </div>
  );
}