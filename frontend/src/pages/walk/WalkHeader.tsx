import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { ListStatus } from '../../lib/api';

interface WalkHeaderProps {
  listName: string;
  status: ListStatus;
  fromRoute: string;
}

export default function WalkHeader({ listName, status, fromRoute }: WalkHeaderProps) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={() => navigate(fromRoute)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Indietro
      </button>
      <div className="text-right">
        <h2 className="text-lg font-bold">{listName}</h2>
        <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
          status === 'draft' ? 'bg-amber-500/10 text-amber-400' :
          status === 'pending' ? 'bg-blue-500/10 text-blue-400' :
          status === 'ordered' ? 'bg-purple-500/10 text-purple-400' :
          status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
          'bg-red-500/10 text-red-400'
        }`}>
          {status === 'draft' ? 'Bozza' : status === 'pending' ? 'In corso' :
           status === 'ordered' ? 'Ordinata' : status === 'completed' ? 'Completata' : 'Annullata'}
        </span>
      </div>
    </div>
  );
}
