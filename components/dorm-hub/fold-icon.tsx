
import { ChevronDown, ChevronUp } from 'lucide-react';

export function FoldIcon({ folded }: { folded: boolean }) {
  return folded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />;
}
