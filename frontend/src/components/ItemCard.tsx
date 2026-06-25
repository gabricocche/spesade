interface ItemCardProps {
  name: string;
  category: string;
  quantity: number;
  unit: string;
}

export function ItemCard({ name, category, quantity, unit }: ItemCardProps) {
    return (
        <div>
            <h3>{name}</h3>
            <p>Categoria: {category}</p>
            <p>Quantità: {quantity} {unit}</p>
        </div>
    );
}