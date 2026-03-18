
import { motion, AnimatePresence } from 'motion/react';

import { localizeServerText } from './localization';
import type { LanguageCode } from '@/lib/i18n';

export function NoticePopup(props: {
  popup: { title: string; content: string } | null;
  popupLabel: string;
  language: LanguageCode;
  onClose: () => void;
}) {
  const p = props;

  return (
    <AnimatePresence>
      {p.popup ? (
        <motion.aside
          initial={{ opacity: 0, x: 80 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 80 }}
          className="fixed right-4 top-4 z-[70] w-80 glass-card sleep-depth-near p-4 rounded-2xl shadow-2xl"
        >
          <p className="text-xs text-muted mb-1">{p.popupLabel}</p>
          <p className="font-black">{localizeServerText(p.language, p.popup.title)}</p>
          <p className="text-sm text-muted mt-1">{localizeServerText(p.language, p.popup.content)}</p>
          <button className="mt-3 text-xs font-bold accent-text" onClick={p.onClose}>
            OK
          </button>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
